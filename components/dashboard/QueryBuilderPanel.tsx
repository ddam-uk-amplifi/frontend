"use client";

import { useState, useMemo, useEffect, useCallback } from "react";
import {
  ChevronRight,
  ChevronDown,
  X,
  Trash2,
  Database,
  Loader2,
} from "lucide-react";
import { FieldTypeIndicator } from "./FieldTypeIndicator";
import { getFieldType } from "./utils/dataProcessing";
import {
  fetchTrackerFields,
  TrackerFieldsResponse,
  TrackerMediaType,
} from "@/lib/api/dashboard";

interface QueryBuilderPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFields: Record<string, string[]>;
  onFieldToggle: (groupId: string, fieldId: string) => void;
  onClearAll?: () => void;
  dataSource?: "summary" | "trackers" | "";
  selectedClient?: string;
  clientId?: number;
  selectedMarkets?: string;
  onDynamicFieldSelect?: (
    mediaType: TrackerMediaType,
    generalIds: number[],
    fieldName: string,
    fieldValue: string,
  ) => void;
}

interface FieldGroup {
  id: string;
  title: string;
  fields: { id: string; label: string }[];
  subgroups?: FieldGroup[];
}

// ============================================
// ARLA DATA SCHEMA
// ============================================
const arlaCommonFields = [
  { id: "total-net-net-spend", label: "Total net net spend" },
  {
    id: "total-addressable-net-net-spend",
    label: "Total addressable net net spend",
  },
  { id: "total-net-net-measured", label: "Total net net measured" },
  { id: "measured-spend-pct", label: "Measured Spend %" },
  { id: "savings-value", label: "Savings Value" },
  { id: "savings-pct", label: "Savings %" },
  { id: "inflation-pct", label: "Inflation %" },
  { id: "inflation-mitigation", label: "Inflation Mitigation" },
  {
    id: "inflation-after-mitigation-pct",
    label: "Inflation after Mitigation %",
  },
];

const arlaSummaryGroups: FieldGroup[] = [
  {
    id: "arla-fy-fc-summary",
    title: "FY FC Summary",
    fields: arlaCommonFields.map((f) => ({ ...f, id: `arla-fy-${f.id}` })),
  },
  {
    id: "arla-ytd-summary",
    title: "YTD Summary",
    fields: arlaCommonFields.map((f) => ({ ...f, id: `arla-ytd-${f.id}` })),
  },
];

// Tracker-specific fields for each media type - organized by category
// Monthly fields (ytd_* fields from the monthly data)
const trackerTVMonthlyFields = [
  { id: "ytd-net-net-spend", label: "YTD Net Net Spend" },
  { id: "ytd-measured-spend", label: "YTD Measured Spend" },
  { id: "ytd-cg-equivalent", label: "YTD CG Equivalent" },
  { id: "ytd-savings-pct", label: "YTD Savings %" },
  { id: "ytd-units", label: "YTD Units" },
  { id: "ytd-savings", label: "YTD Savings" },
];

// Buy Specifics fields (fy_* fields from the general/buy specifics data)
const trackerTVBuySpecificsFields = [
  { id: "fy-net-net-spend", label: "FY Net Net Spend" },
  { id: "fy-measured-spend", label: "FY Measured Spend" },
  { id: "fy-cg-equivalent", label: "FY CG Equivalent" },
  { id: "fy-savings-pct", label: "FY Savings %" },
  { id: "fy-units", label: "FY Units" },
  { id: "fy-savings", label: "FY Savings" },
];

const trackerRadioMonthlyFields = [
  { id: "ytd-net-net-spend", label: "YTD Net Net Spend" },
  { id: "ytd-measured-spend", label: "YTD Measured Spend" },
  { id: "ytd-cg-equivalent", label: "YTD CG Equivalent" },
  { id: "ytd-savings-pct", label: "YTD Savings %" },
  { id: "ytd-units", label: "YTD Units" },
  { id: "ytd-savings", label: "YTD Savings" },
];

const trackerRadioBuySpecificsFields = [
  { id: "fy-net-net-spend", label: "FY Net Net Spend" },
  { id: "fy-measured-spend", label: "FY Measured Spend" },
  { id: "fy-cg-equivalent", label: "FY CG Equivalent" },
  { id: "fy-savings-pct", label: "FY Savings %" },
  { id: "fy-units", label: "FY Units" },
  { id: "fy-savings", label: "FY Savings" },
];

const trackerPrintMonthlyFields = [
  { id: "ytd-net-net-spend", label: "YTD Net Net Spend" },
  { id: "ytd-measured-spend", label: "YTD Measured Spend" },
  { id: "ytd-cg-equivalent", label: "YTD CG Equivalent" },
  { id: "ytd-savings-pct", label: "YTD Savings %" },
  { id: "ytd-units", label: "YTD Units" },
  { id: "ytd-savings", label: "YTD Savings" },
];

const trackerPrintBuySpecificsFields = [
  { id: "fy-net-net-spend", label: "FY Net Net Spend" },
  { id: "fy-measured-spend", label: "FY Measured Spend" },
  { id: "fy-cg-equivalent", label: "FY CG Equivalent" },
  { id: "fy-savings-pct", label: "FY Savings %" },
  { id: "fy-units", label: "FY Units" },
  { id: "fy-savings", label: "FY Savings" },
];

const trackerOOHMonthlyFields = [
  { id: "ytd-net-net-spend", label: "YTD Net Net Spend" },
  { id: "ytd-measured-spend", label: "YTD Measured Spend" },
  { id: "ytd-cg-equivalent", label: "YTD CG Equivalent" },
  { id: "ytd-savings-pct", label: "YTD Savings %" },
  { id: "ytd-units", label: "YTD Units" },
  { id: "ytd-savings", label: "YTD Savings" },
];

const trackerOOHBuySpecificsFields = [
  { id: "fy-net-net-spend", label: "FY Net Net Spend" },
  { id: "fy-measured-spend", label: "FY Measured Spend" },
  { id: "fy-cg-equivalent", label: "FY CG Equivalent" },
  { id: "fy-savings-pct", label: "FY Savings %" },
  { id: "fy-units", label: "FY Units" },
  { id: "fy-savings", label: "FY Savings" },
];

const trackerOnlineMonthlyFields = [
  { id: "ytd-net-net-spend", label: "YTD Net Net Spend" },
  { id: "ytd-measured-spend", label: "YTD Measured Spend" },
  { id: "ytd-cg-equivalent", label: "YTD CG Equivalent" },
  { id: "ytd-savings-pct", label: "YTD Savings %" },
  { id: "ytd-units", label: "YTD Units" },
  { id: "ytd-savings", label: "YTD Savings" },
];

const trackerOnlineBuySpecificsFields = [
  { id: "fy-net-net-spend", label: "FY Net Net Spend" },
  { id: "fy-measured-spend", label: "FY Measured Spend" },
  { id: "fy-cg-equivalent", label: "FY CG Equivalent" },
  { id: "fy-savings-pct", label: "FY Savings %" },
  { id: "fy-units", label: "FY Units" },
  { id: "fy-savings", label: "FY Savings" },
];

const trackerCinemaMonthlyFields = [
  { id: "ytd-net-net-spend", label: "YTD Net Net Spend" },
  { id: "ytd-measured-spend", label: "YTD Measured Spend" },
  { id: "ytd-cg-equivalent", label: "YTD CG Equivalent" },
  { id: "ytd-savings-pct", label: "YTD Savings %" },
  { id: "ytd-units", label: "YTD Units" },
  { id: "ytd-savings", label: "YTD Savings" },
];

const trackerCinemaBuySpecificsFields = [
  { id: "fy-net-net-spend", label: "FY Net Net Spend" },
  { id: "fy-measured-spend", label: "FY Measured Spend" },
  { id: "fy-cg-equivalent", label: "FY CG Equivalent" },
  { id: "fy-savings-pct", label: "FY Savings %" },
  { id: "fy-units", label: "FY Units" },
  { id: "fy-savings", label: "FY Savings" },
];

// Summary fields (from Summary_YTD sheets - aggregated by media type)
const trackerSummaryFields = [
  { id: "total-net-net-spend", label: "Total Net Net Spend" },
  { id: "total-non-addressable-spend", label: "Total Non-Addressable Spend" },
  { id: "total-addressable-spend", label: "Total Addressable Spend" },
  { id: "measured-spend", label: "Measured Spend" },
  { id: "measured-spend-pct", label: "Measured Spend %" },
  {
    id: "benchmark-equivalent-net-net-spend",
    label: "Benchmark Equivalent Spend",
  },
  { id: "value-loss", label: "Value Loss" },
  { id: "value-loss-pct", label: "Value Loss %" },
];

const arlaTrackerGroups: FieldGroup[] = [
  {
    id: "arla-tracker-summary",
    title: "Summary",
    fields: trackerSummaryFields.map((f) => ({ ...f, id: `summary-${f.id}` })),
  },
  {
    id: "arla-tracker-tv",
    title: "TV",
    fields: [],
    subgroups: [
      {
        id: "arla-tracker-tv-monthly",
        title: "Monthly",
        fields: trackerTVMonthlyFields.map((f) => ({ ...f, id: `tv-${f.id}` })),
      },
      {
        id: "arla-tracker-tv-buy-specifics",
        title: "Buy Specifics",
        fields: trackerTVBuySpecificsFields.map((f) => ({
          ...f,
          id: `tv-${f.id}`,
        })),
      },
      {
        id: "arla-tracker-tv-percentile",
        title: "Percentile",
        fields: [],
      },
    ],
  },
  {
    id: "arla-tracker-radio",
    title: "Radio",
    fields: [],
    subgroups: [
      {
        id: "arla-tracker-radio-monthly",
        title: "Monthly",
        fields: trackerRadioMonthlyFields.map((f) => ({
          ...f,
          id: `radio-${f.id}`,
        })),
      },
      {
        id: "arla-tracker-radio-buy-specifics",
        title: "Buy Specifics",
        fields: trackerRadioBuySpecificsFields.map((f) => ({
          ...f,
          id: `radio-${f.id}`,
        })),
      },
      {
        id: "arla-tracker-radio-percentile",
        title: "Percentile",
        fields: [],
      },
    ],
  },
  {
    id: "arla-tracker-print",
    title: "Print",
    fields: [],
    subgroups: [
      {
        id: "arla-tracker-print-monthly",
        title: "Monthly",
        fields: trackerPrintMonthlyFields.map((f) => ({
          ...f,
          id: `print-${f.id}`,
        })),
      },
      {
        id: "arla-tracker-print-buy-specifics",
        title: "Buy Specifics",
        fields: trackerPrintBuySpecificsFields.map((f) => ({
          ...f,
          id: `print-${f.id}`,
        })),
      },
      {
        id: "arla-tracker-print-percentile",
        title: "Percentile",
        fields: [],
      },
    ],
  },
  {
    id: "arla-tracker-ooh",
    title: "OOH",
    fields: [],
    subgroups: [
      {
        id: "arla-tracker-ooh-monthly",
        title: "Monthly",
        fields: trackerOOHMonthlyFields.map((f) => ({
          ...f,
          id: `ooh-${f.id}`,
        })),
      },
      {
        id: "arla-tracker-ooh-buy-specifics",
        title: "Buy Specifics",
        fields: trackerOOHBuySpecificsFields.map((f) => ({
          ...f,
          id: `ooh-${f.id}`,
        })),
      },
      {
        id: "arla-tracker-ooh-percentile",
        title: "Percentile",
        fields: [],
      },
    ],
  },
  {
    id: "arla-tracker-online",
    title: "Online",
    fields: [],
    subgroups: [
      {
        id: "arla-tracker-online-monthly",
        title: "Monthly",
        fields: trackerOnlineMonthlyFields.map((f) => ({
          ...f,
          id: `online-${f.id}`,
        })),
      },
      {
        id: "arla-tracker-online-buy-specifics",
        title: "Buy Specifics",
        fields: trackerOnlineBuySpecificsFields.map((f) => ({
          ...f,
          id: `online-${f.id}`,
        })),
      },
      {
        id: "arla-tracker-online-percentile",
        title: "Percentile",
        fields: [],
      },
    ],
  },
  {
    id: "arla-tracker-cinema",
    title: "Cinema",
    fields: [],
    subgroups: [
      {
        id: "arla-tracker-cinema-monthly",
        title: "Monthly",
        fields: trackerCinemaMonthlyFields.map((f) => ({
          ...f,
          id: `cinema-${f.id}`,
        })),
      },
      {
        id: "arla-tracker-cinema-buy-specifics",
        title: "Buy Specifics",
        fields: trackerCinemaBuySpecificsFields.map((f) => ({
          ...f,
          id: `cinema-${f.id}`,
        })),
      },
      {
        id: "arla-tracker-cinema-percentile",
        title: "Percentile",
        fields: [],
      },
    ],
  },
];

// ============================================
// KERING DATA SCHEMA
// ============================================
const keringInflationFields = [
  { id: "h1-measured-spend", label: "H1 Measured Spend" },
  { id: "market-weighted-inflation", label: "Market Weighted Inflation" },
  {
    id: "inflation-mitigated-dentsu-c",
    label: "Inflation Mitigated by DENTSU C",
  },
  {
    id: "inflation-mitigated-dentsu-pct",
    label: "Inflation mitigated by DENTSU %",
  },
  {
    id: "inflation-not-mitigated-dentsu-c",
    label: "Inflation not mitigated by DENTSU C",
  },
  {
    id: "inflation-not-mitigated-dentsu-pct",
    label: "Inflation not mitigated by DENTSU %",
  },
];

const keringBrandSummaryFields = [
  { id: "total-spend", label: "Total Spend" },
  { id: "addressable", label: "Addressable" },
  { id: "measured-spend", label: "Measured Spend" },
  { id: "measured-spend-pct", label: "Measured Spend %" },
  { id: "measured-savings", label: "Measured Savings" },
  { id: "measured-savings-pct", label: "Measured Savings %" },
];

const keringBrands = [
  "Alexander McQueen",
  "Balenciaga",
  "Bottega Veneta",
  "Boucheron",
  "Brioni",
  "Dodo",
  "Gucci",
  "Kering Eyewear",
  "Pomellato",
  "Saint Laurent",
  "Kering Corporate",
];

const keringSummaryGroups: FieldGroup[] = [
  {
    id: "kering-inflation",
    title: "Inflation",
    fields: keringInflationFields.map((f) => ({
      ...f,
      id: `kering-inflation-${f.id}`,
    })),
  },
  {
    id: "kering-all-brand-summary",
    title: "All Brand Summary",
    fields: keringBrandSummaryFields.map((f) => ({
      ...f,
      id: `kering-all-brand-${f.id}`,
    })),
  },
  {
    id: "kering-brands",
    title: "Brands",
    fields: keringBrands.map((brand) => ({
      id: `kering-brand-${brand.toLowerCase().replace(/\s+/g, "-")}`,
      label: brand,
    })),
  },
];

const keringTrackerCommonFields = keringBrandSummaryFields;

const keringTrackerGroups: FieldGroup[] = [
  {
    id: "kering-tracker-summary",
    title: "Summary",
    fields: keringTrackerCommonFields.map((f) => ({
      ...f,
      id: `kering-tracker-summary-${f.id}`,
    })),
  },
  {
    id: "kering-tracker-print",
    title: "Print",
    fields: [],
    subgroups: [
      {
        id: "kering-tracker-print-newspaper",
        title: "Newspaper",
        fields: keringTrackerCommonFields.map((f) => ({
          ...f,
          id: `kering-print-newspaper-${f.id}`,
        })),
      },
      {
        id: "kering-tracker-print-magazines",
        title: "Magazines",
        fields: keringTrackerCommonFields.map((f) => ({
          ...f,
          id: `kering-print-magazines-${f.id}`,
        })),
      },
      {
        id: "kering-tracker-print-anniversary",
        title: "Anniversary",
        fields: keringTrackerCommonFields.map((f) => ({
          ...f,
          id: `kering-print-anniversary-${f.id}`,
        })),
      },
    ],
  },
  {
    id: "kering-tracker-outdoor",
    title: "Outdoor",
    fields: [],
    subgroups: [
      {
        id: "kering-tracker-outdoor-standard",
        title: "Outdoor-standard",
        fields: keringTrackerCommonFields.map((f) => ({
          ...f,
          id: `kering-outdoor-standard-${f.id}`,
        })),
      },
      {
        id: "kering-tracker-outdoor-digital",
        title: "Outdoor-digital",
        fields: keringTrackerCommonFields.map((f) => ({
          ...f,
          id: `kering-outdoor-digital-${f.id}`,
        })),
      },
    ],
  },
  {
    id: "kering-tracker-digital",
    title: "Digital",
    fields: [],
    subgroups: [
      {
        id: "kering-tracker-digital-display",
        title: "Display",
        fields: keringTrackerCommonFields.map((f) => ({
          ...f,
          id: `kering-digital-display-${f.id}`,
        })),
      },
      {
        id: "kering-tracker-digital-video",
        title: "Video",
        fields: keringTrackerCommonFields.map((f) => ({
          ...f,
          id: `kering-digital-video-${f.id}`,
        })),
      },
      {
        id: "kering-tracker-digital-search",
        title: "Search",
        fields: keringTrackerCommonFields.map((f) => ({
          ...f,
          id: `kering-digital-search-${f.id}`,
        })),
      },
    ],
  },
  {
    id: "kering-tracker-social",
    title: "Social Total",
    fields: [],
    subgroups: [
      {
        id: "kering-tracker-social-branding",
        title: "Social Branding",
        fields: keringTrackerCommonFields.map((f) => ({
          ...f,
          id: `kering-social-branding-${f.id}`,
        })),
      },
      {
        id: "kering-tracker-social-non-branding",
        title: "Social NON Branding",
        fields: keringTrackerCommonFields.map((f) => ({
          ...f,
          id: `kering-social-non-branding-${f.id}`,
        })),
      },
    ],
  },
  {
    id: "kering-tracker-programmatic",
    title: "Programmatic Total",
    fields: [],
    subgroups: [
      {
        id: "kering-tracker-programmatic-display",
        title: "Display",
        fields: keringTrackerCommonFields.map((f) => ({
          ...f,
          id: `kering-programmatic-display-${f.id}`,
        })),
      },
      {
        id: "kering-tracker-programmatic-video",
        title: "Video",
        fields: keringTrackerCommonFields.map((f) => ({
          ...f,
          id: `kering-programmatic-video-${f.id}`,
        })),
      },
      {
        id: "kering-tracker-programmatic-search",
        title: "Search",
        fields: keringTrackerCommonFields.map((f) => ({
          ...f,
          id: `kering-programmatic-search-${f.id}`,
        })),
      },
    ],
  },
];

// ============================================
// CARLSBERG DATA SCHEMA
// ============================================
const carlsbergMediaTypes = [
  "Total",
  "Cinema",
  "Online",
  "Events",
  "Outdoor",
  "Print",
  "Radio",
  "TV",
];

const carlsbergCostResultFields = [
  { id: "total-net-hold-spend", label: "Total Net Hold Spend" },
  { id: "measured-net-hold-spend", label: "Measured Net Hold Spend" },
  { id: "non-measured-hold-spend", label: "Non Measured Hold Spend" },
  { id: "measured-hold-spend-pct", label: "Measured Hold Spend %" },
  { id: "net-hold-costs-pct", label: "Net Hold COSTS %" },
  { id: "cpa-rate", label: "CPA/Rate" },
  { id: "actual-units", label: "Actual units" },
  { id: "savings", label: "Savings" },
  { id: "savings-pct", label: "Savings %" },
];

const carlsbergMEUFields = [
  {
    id: "total-spend-tracker-fy24-MEU",
    label: "Total spend Tracker FY24 & MEU",
  },
  { id: "fy-hold-vs-actual-spend-pct", label: "FY Hold vs Actual Spend %" },
  { id: "fy-projected-spend-MEU", label: "FY Projected Spend & MEU" },
  {
    id: "fy-hold-vs-projected-spend-pct",
    label: "FY Hold vs Projected Spend %",
  },
  {
    id: "fy-projected-savings-vs-hold",
    label: "FY Projected Savings (vs Hold)",
  },
  {
    id: "fy-MEU-impact-vs-actual-hold",
    label: "FY MEU Impact vs Actual Hold Spend",
  },
  {
    id: "fy-MEU-impact-vs-projected",
    label: "FY MEU Impact vs Projected Spend",
  },
  {
    id: "fy-projected-savings-MEU-only",
    label: "FY Projected Savings (MEU only vs Hold)",
  },
  {
    id: "fy-projected-MEU-achievement",
    label: "FY Projected MEU Achievement (Actual vs Projected)",
  },
];

const carlsbergSummaryGroups: FieldGroup[] = [
  {
    id: "carlsberg-total-spends",
    title: "Total Spends",
    fields: carlsbergMediaTypes.map((media) => ({
      id: `carlsberg-spend-${media.toLowerCase()}`,
      label: media,
    })),
  },
  {
    id: "carlsberg-all-market-inflation",
    title: "All Market Inflation",
    fields: carlsbergMediaTypes
      .filter((m) => m !== "Total")
      .map((media) => ({
        id: `carlsberg-inflation-${media.toLowerCase()}`,
        label: media,
      })),
  },
  {
    id: "carlsberg-all-market-cost-result",
    title: "All Market Cost Result",
    fields: carlsbergCostResultFields.map((f) => ({
      ...f,
      id: `carlsberg-cost-${f.id}`,
    })),
  },
  {
    id: "carlsberg-meu",
    title: "MEU",
    fields: carlsbergMEUFields.map((f) => ({
      ...f,
      id: `carlsberg-MEU-${f.id}`,
    })),
  },
  {
    id: "carlsberg-overview",
    title: "Overview",
    fields: [
      { id: "carlsberg-overview-summary", label: "Overview Summary" },
      { id: "carlsberg-overview-highlights", label: "Key Highlights" },
      { id: "carlsberg-overview-performance", label: "Performance Metrics" },
    ],
  },
];

const carlsbergTrackerGroups: FieldGroup[] = [
  {
    id: "carlsberg-tracker-summary",
    title: "Summary",
    fields: carlsbergCostResultFields.map((f) => ({
      ...f,
      id: `carlsberg-tracker-summary-${f.id}`,
    })),
  },
  {
    id: "carlsberg-tracker-tv",
    title: "TV",
    fields: carlsbergCostResultFields.map((f) => ({
      ...f,
      id: `carlsberg-tracker-tv-${f.id}`,
    })),
  },
  {
    id: "carlsberg-tracker-newspaper",
    title: "Newspaper",
    fields: carlsbergCostResultFields.map((f) => ({
      ...f,
      id: `carlsberg-tracker-newspaper-${f.id}`,
    })),
  },
  {
    id: "carlsberg-tracker-magazines",
    title: "Magazines",
    fields: carlsbergCostResultFields.map((f) => ({
      ...f,
      id: `carlsberg-tracker-magazines-${f.id}`,
    })),
  },
  {
    id: "carlsberg-tracker-radio",
    title: "Radio",
    fields: carlsbergCostResultFields.map((f) => ({
      ...f,
      id: `carlsberg-tracker-radio-${f.id}`,
    })),
  },
  {
    id: "carlsberg-tracker-outdoor",
    title: "Outdoor",
    fields: carlsbergCostResultFields.map((f) => ({
      ...f,
      id: `carlsberg-tracker-outdoor-${f.id}`,
    })),
  },
  {
    id: "carlsberg-tracker-online",
    title: "Online",
    fields: carlsbergCostResultFields.map((f) => ({
      ...f,
      id: `carlsberg-tracker-online-${f.id}`,
    })),
  },
  {
    id: "carlsberg-tracker-cinema",
    title: "Cinema",
    fields: carlsbergCostResultFields.map((f) => ({
      ...f,
      id: `carlsberg-tracker-cinema-${f.id}`,
    })),
  },
];

// ============================================
// CLIENT DATA MAPPING
// ============================================
const clientDataSchemas: Record<
  string,
  { summary: FieldGroup[]; trackers: FieldGroup[] }
> = {
  Arla: { summary: arlaSummaryGroups, trackers: arlaTrackerGroups },
  Kering: { summary: keringSummaryGroups, trackers: keringTrackerGroups },
  Carlsberg: {
    summary: carlsbergSummaryGroups,
    trackers: carlsbergTrackerGroups,
  },
};

// Map group IDs to media types
const ARLA_TRACKER_MEDIA_TYPES: Record<string, TrackerMediaType> = {
  "arla-tracker-tv": "tv",
  "arla-tracker-radio": "radio",
  "arla-tracker-print": "print",
  "arla-tracker-ooh": "ooh",
  "arla-tracker-online": "online",
  "arla-tracker-cinema": "cinema",
};

export function QueryBuilderPanel({
  isOpen,
  onClose,
  selectedFields,
  onFieldToggle,
  onClearAll,
  dataSource = "",
  selectedClient = "",
  clientId,
  selectedMarkets,
  onDynamicFieldSelect,
}: QueryBuilderPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  // State for dynamically loaded tracker fields
  const [dynamicFields, setDynamicFields] = useState<
    Record<string, TrackerFieldsResponse>
  >({});
  const [loadingFields, setLoadingFields] = useState<Record<string, boolean>>(
    {},
  );
  const [fieldErrors, setFieldErrors] = useState<Record<string, string>>({});

  // Track selected dynamic field values (fieldName -> fieldValue -> generalIds)
  const [selectedDynamicFields, setSelectedDynamicFields] = useState<
    Record<
      string,
      { fieldName: string; fieldValue: string; generalIds: number[] }[]
    >
  >({});

  // Check if we should use dynamic fields for Arla trackers
  const usesDynamicFields =
    selectedClient === "Arla" && dataSource === "trackers";

  // Fetch dynamic fields when a media type group is expanded
  const fetchDynamicFields = useCallback(
    async (groupId: string) => {
      const mediaType = ARLA_TRACKER_MEDIA_TYPES[groupId];
      if (!mediaType || !clientId || !usesDynamicFields) return;

      // Already loaded or loading
      if (dynamicFields[mediaType] || loadingFields[mediaType]) return;

      setLoadingFields((prev) => ({ ...prev, [mediaType]: true }));
      setFieldErrors((prev) => ({ ...prev, [mediaType]: "" }));

      try {
        const response = await fetchTrackerFields(
          selectedClient,
          mediaType,
          clientId,
          selectedMarkets,
        );
        setDynamicFields((prev) => ({ ...prev, [mediaType]: response }));
      } catch (error) {
        console.error(`Failed to fetch fields for ${mediaType}:`, error);
        setFieldErrors((prev) => ({
          ...prev,
          [mediaType]:
            error instanceof Error ? error.message : "Failed to load fields",
        }));
      } finally {
        setLoadingFields((prev) => ({ ...prev, [mediaType]: false }));
      }
    },
    [
      clientId,
      selectedClient,
      selectedMarkets,
      dynamicFields,
      loadingFields,
      usesDynamicFields,
    ],
  );

  // Clear dynamic fields when client/source/markets change
  useEffect(() => {
    setDynamicFields({});
    setLoadingFields({});
    setFieldErrors({});
    setSelectedDynamicFields({});
  }, [selectedClient, dataSource, selectedMarkets]);

  const toggleGroup = (groupId: string) => {
    const isExpanding = !expandedGroups.includes(groupId);

    setExpandedGroups((prev) =>
      prev.includes(groupId)
        ? prev.filter((id) => id !== groupId)
        : [...prev, groupId],
    );

    // Fetch dynamic fields when expanding an Arla tracker media type group
    if (isExpanding && usesDynamicFields && ARLA_TRACKER_MEDIA_TYPES[groupId]) {
      fetchDynamicFields(groupId);
    }
  };

  // Handle dynamic field value selection
  const handleDynamicFieldSelect = (
    mediaType: TrackerMediaType,
    fieldName: string,
    fieldValue: string,
    generalIds: number[],
  ) => {
    // Calculate the new selection state first
    const mediaSelections = selectedDynamicFields[mediaType] || [];
    const existingIndex = mediaSelections.findIndex(
      (s) => s.fieldName === fieldName && s.fieldValue === fieldValue,
    );

    let newMediaSelections: typeof mediaSelections;
    if (existingIndex >= 0) {
      // Deselect - remove this selection
      newMediaSelections = [...mediaSelections];
      newMediaSelections.splice(existingIndex, 1);
    } else {
      // Select - add this selection
      newMediaSelections = [
        ...mediaSelections,
        { fieldName, fieldValue, generalIds },
      ];
    }

    // Update state
    setSelectedDynamicFields((prev) => ({
      ...prev,
      [mediaType]: newMediaSelections,
    }));

    // Calculate ALL accumulated general_ids from the new selections
    const allGeneralIds = new Set<number>();
    newMediaSelections.forEach((selection) => {
      selection.generalIds.forEach((id) => allGeneralIds.add(id));
    });

    // Notify parent component with ALL accumulated general_ids
    if (onDynamicFieldSelect) {
      onDynamicFieldSelect(
        mediaType,
        Array.from(allGeneralIds),
        fieldName,
        fieldValue,
      );
    }
  };

  // Check if a dynamic field value is selected
  const isDynamicFieldSelected = (
    mediaType: TrackerMediaType,
    fieldName: string,
    fieldValue: string,
  ): boolean => {
    const mediaSelections = selectedDynamicFields[mediaType] || [];
    return mediaSelections.some(
      (s) => s.fieldName === fieldName && s.fieldValue === fieldValue,
    );
  };

  // Get count of selected dynamic fields for a media type
  const getDynamicFieldSelectionCount = (
    mediaType: TrackerMediaType,
  ): number => {
    return (selectedDynamicFields[mediaType] || []).length;
  };

  // Determine which field groups to show based on client and data source
  const queryGroups = useMemo(() => {
    if (!selectedClient || !dataSource) return [];

    const schema = clientDataSchemas[selectedClient];
    if (!schema) return [];

    if (dataSource === "summary") {
      return schema.summary;
    } else if (dataSource === "trackers") {
      return schema.trackers;
    }
    return [];
  }, [dataSource, selectedClient]);

  // Auto-expand first group when client/data source changes
  useMemo(() => {
    if (queryGroups.length > 0 && expandedGroups.length === 0) {
      setExpandedGroups([queryGroups[0].id]);
    }
  }, [queryGroups]);

  const getTotalSelected = () => {
    return Object.values(selectedFields).reduce(
      (sum, arr) => sum + arr.length,
      0,
    );
  };

  // Determine locked scale type based on currently selected fields
  // If percentage fields are selected, lock to percentage. If absolute values are selected, lock to absolute.
  const lockedScaleType = useMemo(() => {
    const allSelectedFieldIds = Object.values(selectedFields).flat();
    if (allSelectedFieldIds.length === 0) return null; // No lock when nothing selected

    let hasPercentage = false;
    let hasAbsolute = false;

    for (const fieldId of allSelectedFieldIds) {
      const fieldType = getFieldType(fieldId);
      if (fieldType === "percentage") {
        hasPercentage = true;
      } else if (fieldType === "metric" || fieldType === "index") {
        hasAbsolute = true;
      }
    }

    // Lock to first type selected
    if (hasPercentage && !hasAbsolute) return "percentage";
    if (hasAbsolute && !hasPercentage) return "absolute";

    // If mixed (shouldn't happen with this UI), no additional locking
    return null;
  }, [selectedFields]);

  // Helper to check if a field is disabled due to scale type locking
  const isFieldDisabled = (fieldId: string): boolean => {
    if (!lockedScaleType) return false;

    const fieldType = getFieldType(fieldId);

    if (lockedScaleType === "percentage") {
      // Only allow percentage fields when locked to percentage
      return fieldType === "metric" || fieldType === "index";
    } else if (lockedScaleType === "absolute") {
      // Only allow metric/index fields when locked to absolute
      return fieldType === "percentage";
    }

    return false;
  };

  // Render dynamic fields for Arla tracker media types
  const renderDynamicFields = (mediaType: TrackerMediaType) => {
    const fieldsData = dynamicFields[mediaType];
    const isLoading = loadingFields[mediaType];
    const error = fieldErrors[mediaType];

    if (isLoading) {
      return (
        <div className="flex items-center justify-center py-4">
          <Loader2 className="w-5 h-5 text-violet-500 animate-spin" />
          <span className="ml-2 text-sm text-slate-500">Loading fields...</span>
        </div>
      );
    }

    if (error) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-rose-500">{error}</p>
        </div>
      );
    }

    if (!fieldsData || Object.keys(fieldsData.fields).length === 0) {
      return (
        <div className="text-center py-4">
          <p className="text-sm text-slate-400">No fields available</p>
        </div>
      );
    }

    // Render each field name as a subgroup, with field values as selectable items
    return (
      <>
        {Object.entries(fieldsData.fields).map(([fieldName, fieldValues]) => {
          const subgroupId = `${mediaType}-dynamic-${fieldName}`;
          const isSubgroupExpanded = expandedGroups.includes(subgroupId);

          // Count selected values for this field
          const selectedValuesCount = fieldValues.filter((fv) =>
            isDynamicFieldSelected(mediaType, fieldName, fv.value),
          ).length;

          return (
            <div
              key={subgroupId}
              className="ml-3 mt-2 bg-slate-50/80 rounded-xl overflow-hidden border border-slate-100"
            >
              <button
                onClick={() => toggleGroup(subgroupId)}
                className="w-full flex items-center justify-between p-3 py-2.5 hover:bg-slate-100/80 transition-all"
              >
                <div className="flex items-center gap-2.5">
                  <div
                    className={`w-5 h-5 rounded-md flex items-center justify-center ${isSubgroupExpanded ? "bg-violet-100" : "bg-slate-200/60"}`}
                  >
                    {isSubgroupExpanded ? (
                      <ChevronDown className="w-3.5 h-3.5 text-violet-600" />
                    ) : (
                      <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
                    )}
                  </div>
                  <span className="font-medium text-slate-700 text-sm">
                    {fieldName}
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-xs text-slate-400">
                    {fieldValues.length} options
                  </span>
                  {selectedValuesCount > 0 && (
                    <span className="px-2 py-0.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-medium rounded-full shadow-sm">
                      {selectedValuesCount}
                    </span>
                  )}
                </div>
              </button>

              {isSubgroupExpanded && (
                <div className="px-3 pb-3 space-y-1.5">
                  {fieldValues.map((fieldValue) => {
                    const isSelected = isDynamicFieldSelected(
                      mediaType,
                      fieldName,
                      fieldValue.value,
                    );

                    return (
                      <button
                        key={`${fieldName}-${fieldValue.value}`}
                        onClick={() =>
                          handleDynamicFieldSelect(
                            mediaType,
                            fieldName,
                            fieldValue.value,
                            fieldValue.general_ids,
                          )
                        }
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                          isSelected
                            ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-200"
                            : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/60 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-sm truncate">
                          {fieldValue.value}
                        </span>
                        <span
                          className={`text-xs ${isSelected ? "text-violet-200" : "text-slate-400"}`}
                        >
                          {fieldValue.general_ids.length} record
                          {fieldValue.general_ids.length !== 1 ? "s" : ""}
                        </span>
                      </button>
                    );
                  })}
                </div>
              )}
            </div>
          );
        })}
      </>
    );
  };

  const renderFieldGroup = (group: FieldGroup, depth: number = 0) => {
    const isExpanded = expandedGroups.includes(group.id);
    const groupSelections = selectedFields[group.id] || [];
    const selectedCount = groupSelections.length;
    const hasSubgroups = group.subgroups && group.subgroups.length > 0;
    const hasFields = group.fields && group.fields.length > 0;

    // Check if this is an Arla tracker media type group that uses dynamic fields
    const mediaType = ARLA_TRACKER_MEDIA_TYPES[group.id];
    const shouldUseDynamicFields =
      usesDynamicFields && mediaType && depth === 0;

    // Calculate total selections including subgroups and dynamic fields
    let totalSubgroupSelections = selectedCount;
    if (hasSubgroups && !shouldUseDynamicFields) {
      group.subgroups?.forEach((sub) => {
        totalSubgroupSelections += (selectedFields[sub.id] || []).length;
      });
    }
    if (shouldUseDynamicFields && mediaType) {
      totalSubgroupSelections += getDynamicFieldSelectionCount(mediaType);
    }

    return (
      <div
        key={group.id}
        className={`bg-slate-50/80 rounded-xl overflow-hidden border border-slate-100 ${depth > 0 ? "ml-3 mt-2" : ""}`}
      >
        <button
          onClick={() => toggleGroup(group.id)}
          className={`w-full flex items-center justify-between p-3 hover:bg-slate-100/80 transition-all ${depth > 0 ? "py-2.5" : ""}`}
        >
          <div className="flex items-center gap-2.5">
            <div
              className={`w-5 h-5 rounded-md flex items-center justify-center ${isExpanded ? "bg-violet-100" : "bg-slate-200/60"}`}
            >
              {isExpanded ? (
                <ChevronDown className="w-3.5 h-3.5 text-violet-600" />
              ) : (
                <ChevronRight className="w-3.5 h-3.5 text-slate-500" />
              )}
            </div>
            <span
              className={`font-medium text-slate-700 ${depth > 0 ? "text-sm" : "text-sm"}`}
            >
              {group.title}
            </span>
          </div>
          {totalSubgroupSelections > 0 && (
            <span className="px-2 py-0.5 bg-gradient-to-r from-violet-500 to-purple-600 text-white text-xs font-medium rounded-full shadow-sm">
              {totalSubgroupSelections}
            </span>
          )}
        </button>

        {isExpanded && (
          <div className="px-3 pb-3 space-y-1.5">
            {/* For Arla tracker media types, render dynamic fields from API */}
            {shouldUseDynamicFields && mediaType ? (
              renderDynamicFields(mediaType)
            ) : (
              <>
                {/* Render static fields if present */}
                {hasFields &&
                  group.fields.map((field) => {
                    const isSelected =
                      selectedFields[group.id]?.includes(field.id) || false;
                    const fieldType = getFieldType(field.id);
                    const isDisabled = isFieldDisabled(field.id);

                    return (
                      <button
                        key={field.id}
                        onClick={() =>
                          !isDisabled && onFieldToggle(group.id, field.id)
                        }
                        disabled={isDisabled}
                        title={
                          isDisabled
                            ? `Cannot mix ${lockedScaleType === "percentage" ? "absolute values" : "percentages"} with ${lockedScaleType === "percentage" ? "percentages" : "absolute values"}. Clear selection first.`
                            : undefined
                        }
                        className={`w-full flex items-center justify-between px-3 py-2.5 rounded-lg transition-all ${
                          isSelected
                            ? "bg-gradient-to-r from-violet-500 to-purple-600 text-white shadow-md shadow-violet-200"
                            : isDisabled
                              ? "bg-slate-100 text-slate-400 border border-slate-200/60 cursor-not-allowed opacity-50"
                              : "bg-white hover:bg-slate-50 text-slate-700 border border-slate-200/60 hover:border-slate-300"
                        }`}
                      >
                        <span className="text-sm">{field.label}</span>
                        <FieldTypeIndicator type={fieldType} />
                      </button>
                    );
                  })}

                {/* Render subgroups if present */}
                {hasSubgroups &&
                  group.subgroups?.map((subgroup) =>
                    renderFieldGroup(subgroup, depth + 1),
                  )}
              </>
            )}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="w-[340px] bg-gradient-to-b from-white to-slate-50/50 border-r border-slate-200/60 h-full overflow-y-auto">
      <div className="sticky top-0 bg-white/80 backdrop-blur-md border-b border-slate-200/60 p-4 z-10">
        <div className="flex items-center justify-between mb-3">
          <div className="flex items-center gap-2">
            <div className="w-8 h-8 rounded-lg bg-gradient-to-br from-violet-500 to-purple-600 flex items-center justify-center shadow-sm">
              <span className="text-white text-sm font-bold">Q</span>
            </div>
            <h2 className="text-base font-semibold text-slate-800">
              Query Builder
            </h2>
          </div>
          <button
            onClick={onClose}
            className="w-8 h-8 flex items-center justify-center hover:bg-slate-100 rounded-lg transition-colors"
          >
            <X className="w-4 h-4 text-slate-400" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-2">
            <div className="w-2 h-2 rounded-full bg-emerald-400" />
            <p className="text-sm text-slate-500">
              {getTotalSelected()} field{getTotalSelected() !== 1 ? "s" : ""}{" "}
              selected
            </p>
          </div>
          {onClearAll && getTotalSelected() > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-1.5 px-2.5 py-1 text-xs font-medium text-rose-600 hover:bg-rose-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-3.5 h-3.5" />
              Clear
            </button>
          )}
        </div>
      </div>

      <div className="p-3 space-y-2">
        {queryGroups.length === 0 ? (
          <div className="text-center py-12">
            <div className="w-12 h-12 rounded-full bg-slate-100 flex items-center justify-center mx-auto mb-3">
              <Database className="w-6 h-6 text-slate-400" />
            </div>
            <p className="text-sm text-slate-500">
              Select a client and data source
            </p>
            <p className="text-xs text-slate-400 mt-1">
              to see available fields
            </p>
          </div>
        ) : (
          queryGroups.map((group) => renderFieldGroup(group, 0))
        )}
      </div>
    </div>
  );
}
