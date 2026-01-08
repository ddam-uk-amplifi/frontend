import type { ClientConfig } from "../types";

export const carlsbergConfig: ClientConfig = {
  id: 3,
  name: "Carlsberg",
  slug: "carlsberg",
  markets: ["DK", "SE", "NO", "FI", "PL", "UK", "FR", "CH"],
  features: {
    hasTrackers: true,
    hasBrandSummary: false,
    hasInflation: true,
    hasDynamicTrackerFields: false,
  },
};
