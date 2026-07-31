import packageJson from "../../package.json";

const currentYear = new Date().getFullYear();

export const APP_CONFIG = {
  name: "Sentinel",
  version: packageJson.version,
  copyright: `© ${currentYear}, FTG — Future Technology Growth.`,
  meta: {
    title: "Sentinel | HSE Early Warning Detection System",
    description:
      "Sentinel is an HSE early warning detection system built by FTG. Monitor pipeline telemetry, audit findings, and incident data in real time to surface risks before they escalate.",
  },
};
