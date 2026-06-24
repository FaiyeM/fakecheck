/* eslint-disable import/first -- jest.mock() must be hoisted above the imports it mocks */
import { describe, it, expect, jest, beforeEach } from "@jest/globals";

// Mock the two collaborators of flushCorrectionOutbox (spec §13: offline queue
// drain — corrupt payloads dropped, network errors stop the drain for retry).
// Factories must be self-contained (jest hoists them above imports).
jest.mock("../endpoints", () => ({ submitCorrection: jest.fn() }));
jest.mock("../../db", () => ({
  getUnsyncedCorrections: jest.fn(),
  markCorrectionSynced: jest.fn(),
}));

import { flushCorrectionOutbox } from "../correctionSync";
import { submitCorrection } from "../endpoints";
import { getUnsyncedCorrections, markCorrectionSynced } from "../../db";

const mSubmit = jest.mocked(submitCorrection);
const mGet = jest.mocked(getUnsyncedCorrections);
const mMark = jest.mocked(markCorrectionSynced);

const row = (id: number, payload: string) => ({ id, scan_id: `scan-${id}`, payload });
const valid = (scanId: string) =>
  JSON.stringify({ scanId, userVerdict: "fake", reason: "x".repeat(20) });

beforeEach(() => {
  mSubmit.mockReset();
  mGet.mockReset();
  mMark.mockReset();
  mSubmit.mockResolvedValue({ ok: true });
  mMark.mockResolvedValue(undefined);
});

describe("flushCorrectionOutbox", () => {
  it("delivers every queued correction and marks each synced", async () => {
    mGet.mockResolvedValue([row(1, valid("a")), row(2, valid("b"))]);

    const sent = await flushCorrectionOutbox();

    expect(sent).toBe(2);
    expect(mSubmit).toHaveBeenCalledTimes(2);
    expect(mMark).toHaveBeenCalledTimes(2);
  });

  it("stops on the first network error and leaves the rest queued for retry", async () => {
    mGet.mockResolvedValue([row(1, valid("a")), row(2, valid("b")), row(3, valid("c"))]);
    mSubmit
      .mockResolvedValueOnce({ ok: true })
      .mockRejectedValueOnce(new Error("network"))
      .mockResolvedValue({ ok: true });

    const sent = await flushCorrectionOutbox();

    expect(sent).toBe(1); // only the first succeeded
    expect(mSubmit).toHaveBeenCalledTimes(2); // stopped after the failure
    expect(mMark).toHaveBeenCalledTimes(1); // row 1 only
  });

  it("drops a corrupt payload so it cannot wedge the queue", async () => {
    mGet.mockResolvedValue([row(1, "{not json"), row(2, valid("b"))]);

    const sent = await flushCorrectionOutbox();

    expect(sent).toBe(1); // the valid one
    expect(mSubmit).toHaveBeenCalledTimes(1); // corrupt one never sent
    expect(mMark).toHaveBeenCalledTimes(2); // corrupt dropped + valid synced
  });

  it("is re-entrancy guarded (concurrent calls don't double-send)", async () => {
    let resolveRows: (v: ReturnType<typeof row>[]) => void = () => {};
    mGet.mockReturnValue(
      new Promise((res) => {
        resolveRows = res;
      })
    );

    const first = flushCorrectionOutbox();
    const second = await flushCorrectionOutbox(); // returns 0 while first is in-flight
    expect(second).toBe(0);

    resolveRows([row(1, valid("a"))]);
    expect(await first).toBe(1);
    expect(mSubmit).toHaveBeenCalledTimes(1);
  });
});
