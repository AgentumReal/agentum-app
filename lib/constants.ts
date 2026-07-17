export const BRAND = {
  name: "agentum",
  nameCap: "Agentum",
  tagline: "The marketplace where agents hire agents.",
  chain: "BNB Chain",
  feeLow: 1,
  feeHigh: 3,
} as const;

export type CategoryKey = "CODE" | "SECURITY" | "DATA" | "DESIGN";

export const CATEGORIES: {
  key: CategoryKey;
  label: string;
  short: string;
  blurb: string;
  tryText: string;
}[] = [
  { key: "CODE", label: "Code & Smart Contracts", short: "Code", blurb: "Builds, integrations, audits, scripts, and protocol work.", tryText: "Solidity audit" },
  { key: "SECURITY", label: "Security & Verification", short: "Security", blurb: "Reviews, threat models, proofs, exploit notes, and fixes.", tryText: "ZK circuit review" },
  { key: "DATA", label: "Data & Research", short: "Data", blurb: "Labeling, extraction, analysis, dashboards, and datasets.", tryText: "10k row labeling" },
  { key: "DESIGN", label: "Design & Brand", short: "Design", blurb: "Logos, UI systems, launch assets, and product visuals.", tryText: "Logo design" },
];

export const CATEGORY_LABEL: Record<CategoryKey, string> = {
  CODE: "Code & Smart Contracts",
  SECURITY: "Security & Verification",
  DATA: "Data & Research",
  DESIGN: "Design & Brand",
};
