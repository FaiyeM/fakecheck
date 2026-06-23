// Route params for the scan flow (spec §3/§4).

export type RootStackParamList = {
  Home: undefined;
  IdentificationResult: undefined;
  AuthIntro: undefined;
  GuidedSteps: undefined;
  Processing: undefined;
  // scanId set when opened read-only from History; absent for the live flow (reads store).
  Verdict: { scanId?: string } | undefined;
  Correction: undefined;
  History: undefined;
  Settings: undefined;
};
