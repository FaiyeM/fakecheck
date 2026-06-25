export * from "./colors";

export const spacing = {
  xs: 4,
  sm: 8,
  md: 16,
  lg: 24,
  xl: 32,
};

export const radius = {
  sm: 0,
  md: 0,
  lg: 0,
  pill: 0,
};

export const typography = {
  title: { fontSize: 22, fontWeight: "700" as const, fontFamily: "monospace", letterSpacing: 1 },
  heading: { fontSize: 16, fontWeight: "700" as const, fontFamily: "monospace", letterSpacing: 0.5 },
  body: { fontSize: 14, fontWeight: "400" as const, fontFamily: "monospace" },
  caption: { fontSize: 12, fontWeight: "400" as const, fontFamily: "monospace" },
};
