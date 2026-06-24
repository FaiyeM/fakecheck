import { useEffect } from "react";
import * as Network from "expo-network";
import { submitCorrection } from "./endpoints";
import { getUnsyncedCorrections, markCorrectionSynced } from "../db";
import type { CorrectionRequest } from "./types";

// Offline correction-queue flush (spec §12.5, Phase 11).
// Corrections are enqueued locally in `correction_outbox` (see markDisputedAndQueue)
// so a dispute always succeeds offline; this module drains the queue once the
// device is back online.

let flushing = false;

/**
 * Send every unsynced queued correction to the backend, marking each delivered.
 * Stops on the first network failure so a flaky connection retries next time.
 * Returns the number of corrections successfully delivered.
 */
export async function flushCorrectionOutbox(): Promise<number> {
  if (flushing) return 0;
  flushing = true;
  let sent = 0;
  try {
    const pending = await getUnsyncedCorrections();
    for (const row of pending) {
      let body: CorrectionRequest;
      try {
        body = JSON.parse(row.payload) as CorrectionRequest;
      } catch {
        // Corrupt payload can never succeed — drop it so it doesn't wedge the queue.
        await markCorrectionSynced(row.id);
        continue;
      }
      try {
        await submitCorrection(body);
        await markCorrectionSynced(row.id);
        sent += 1;
      } catch {
        // Network/server error: leave queued and stop; retry on the next reconnect.
        break;
      }
    }
  } finally {
    flushing = false;
  }
  return sent;
}

/**
 * Drain the correction queue on app start and whenever the device regains
 * connectivity. Mount once near the app root.
 */
export function useCorrectionSync(): void {
  useEffect(() => {
    let cancelled = false;

    const tryFlush = async () => {
      const state = await Network.getNetworkStateAsync();
      if (!cancelled && state.isConnected) {
        await flushCorrectionOutbox();
      }
    };

    void tryFlush();

    const sub = Network.addNetworkStateListener((state) => {
      if (state.isConnected) void flushCorrectionOutbox();
    });

    return () => {
      cancelled = true;
      sub.remove();
    };
  }, []);
}
