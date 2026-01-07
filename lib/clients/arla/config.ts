import type { ClientConfig } from "../types";

export const arlaConfig: ClientConfig = {
  id: 1,
  name: "Arla",
  slug: "arla",
  markets: ["UK", "DK", "SE", "DE", "FI", "NL"],
  features: {
    hasTrackers: true,
    hasBrandSummary: false,
    hasInflation: true,
    hasDynamicTrackerFields: true,
  },
};
