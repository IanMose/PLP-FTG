import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Sentinel",
  version: packageJson.version,
  copyright: `© ${currentYear}, Sentinel.`,
  meta: {
    title: "Sentinel — HSE Risk & Data Quality Platform",
    description:
      "Sentinel is a real-time HSE risk monitoring and data quality platform for pipeline operations. Track incidents, audits, telemetry, and corridor risk across your pipeline network.",
  },
};
