import type { ClientConfig } from "../types";

export const config: ClientConfig = {
  id: 3,
  name: "Kering",
  slug: "kering",
  markets: ["FR", "IT", "US", "UK", "JP", "CN", "KR", "HK"],
  features: {
    hasTrackers: true,
    hasBrandSummary: true,
    hasInflation: true,
    hasDynamicTrackerFields: false,
  },
};
