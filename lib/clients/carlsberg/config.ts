import type { ClientConfig } from "../types";

export const carlsbergConfig: ClientConfig = {
  id: 3,
  name: "Carlsberg",
  slug: "carlsberg",
  markets: [
    "AZ", // Azerbaijan
    "BE", // Belgium
    "BG", // Bulgaria
    "KH", // Cambodia
    "CA", // Canada
    "CN", // China
    "HR", // Croatia
    "DK", // Denmark
    "EE", // Estonia
    "FI", // Finland
    "FR", // France
    "DE", // Germany
    "GR", // Greece
    "HK", // Hong Kong
    "HU", // Hungary
    "IN", // India
    "IT", // Italy
    "KZ", // Kazakhstan
    "LV", // Latvia
    "LT", // Lithuania
    "MY", // Malaysia
    "NO", // Norway
    "PL", // Poland
    "SA", // Saudi Arabia
    "RS", // Serbia
    "SG", // Singapore
    "KR", // South Korea
    "SE", // Sweden
    "CH", // Switzerland
    "UK", // UK
    "UA", // Ukraine
    "VN", // Vietnam
  ],
  marketNames: {
    AZ: "Azerbaijan",
    BE: "Belgium",
    BG: "Bulgaria",
    KH: "Cambodia",
    CA: "Canada",
    CN: "China",
    HR: "Croatia",
    DK: "Denmark",
    EE: "Estonia",
    FI: "Finland",
    FR: "France",
    DE: "Germany",
    GR: "Greece",
    HK: "Hong Kong",
    HU: "Hungary",
    IN: "India",
    IT: "Italy",
    KZ: "Kazakhstan",
    LV: "Latvia",
    LT: "Lithuania",
    MY: "Malaysia",
    NO: "Norway",
    PL: "Poland",
    SA: "Saudi Arabia",
    RS: "Serbia",
    SG: "Singapore",
    KR: "South Korea",
    SE: "Sweden",
    CH: "Switzerland",
    UK: "United Kingdom",
    UA: "Ukraine",
    VN: "Vietnam",
  },
  features: {
    hasTrackers: true,
    hasBrandSummary: false,
    hasInflation: true,
    hasDynamicTrackerFields: false,
  },
  chartPreferences: {
    preferredChartTypes: ["bar-chart", "table"],
    thresholds: {
      highCardinalityThreshold: 15,
      maxPieCategories: 7,
      maxBarCategories: 20,
    },
  },
};
