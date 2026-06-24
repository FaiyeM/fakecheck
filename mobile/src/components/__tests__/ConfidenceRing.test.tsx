import React from "react";
import { describe, it, expect } from "@jest/globals";
import { render } from "@testing-library/react-native";
import { ConfidenceRing } from "../ConfidenceRing";

// Spec §12: meaning must never rely on color alone — the score number and a
// text bucket label are always rendered, and an accessibility label is present.
describe("ConfidenceRing", () => {
  it("renders the rounded score as text", () => {
    const { getByText } = render(<ConfidenceRing score={84.6} />);
    expect(getByText("85")).toBeTruthy();
  });

  it("shows the High/Medium/Low text bucket alongside color", () => {
    expect(render(<ConfidenceRing score={90} />).getByText("High confidence")).toBeTruthy();
    expect(render(<ConfidenceRing score={60} />).getByText("Medium confidence")).toBeTruthy();
    expect(render(<ConfidenceRing score={20} />).getByText("Low confidence")).toBeTruthy();
  });

  it("exposes an accessibility label combining percent and bucket", () => {
    const { getByLabelText } = render(<ConfidenceRing score={90} />);
    expect(getByLabelText("90 percent, High confidence")).toBeTruthy();
  });

  it("honors a custom label override", () => {
    const { getByText } = render(<ConfidenceRing score={90} label="Identified" />);
    expect(getByText("Identified")).toBeTruthy();
  });
});
