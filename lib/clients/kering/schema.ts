import type { FieldGroup, Field } from "../types";

// ============================================
// KERING FIELD DEFINITIONS
// ============================================

const keringInflationFields: Field[] = [
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

const keringBrandSummaryFields: Field[] = [
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
  "Kering Corporate",
  "Kering Eyewear",
  "Maui Jim",
  "Pomellato",
  "Qeelin",
  "Saint Laurent",
];

// ============================================
// KERING SUMMARY SCHEMA
// ============================================

const keringSummaryGroups: FieldGroup[] = [
  // Inflation fields removed per client request
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

// ============================================
// KERING TRACKER SCHEMA
// ============================================

// Common fields for tracker subgroups
const keringTrackerCommonFields = keringBrandSummaryFields;

/**
 * Create a tracker subgroup with common fields
 */
function createTrackerSubgroup(
  id: string,
  title: string,
  prefix: string,
): FieldGroup {
  return {
    id,
    title,
    fields: keringTrackerCommonFields.map((f) => ({
      ...f,
      id: `${prefix}-${f.id}`,
    })),
  };
}

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
      createTrackerSubgroup(
        "kering-tracker-print-newspaper",
        "Newspaper",
        "kering-print-newspaper",
      ),
      createTrackerSubgroup(
        "kering-tracker-print-magazines",
        "Magazines",
        "kering-print-magazines",
      ),
      createTrackerSubgroup(
        "kering-tracker-print-anniversary",
        "Anniversary",
        "kering-print-anniversary",
      ),
    ],
  },
  {
    id: "kering-tracker-outdoor",
    title: "Outdoor",
    fields: [],
    subgroups: [
      createTrackerSubgroup(
        "kering-tracker-outdoor-standard",
        "Outdoor-standard",
        "kering-outdoor-standard",
      ),
      createTrackerSubgroup(
        "kering-tracker-outdoor-digital",
        "Outdoor-digital",
        "kering-outdoor-digital",
      ),
    ],
  },
  {
    id: "kering-tracker-digital",
    title: "Digital",
    fields: [],
    subgroups: [
      createTrackerSubgroup(
        "kering-tracker-digital-display",
        "Display",
        "kering-digital-display",
      ),
      createTrackerSubgroup(
        "kering-tracker-digital-video",
        "Video",
        "kering-digital-video",
      ),
      createTrackerSubgroup(
        "kering-tracker-digital-search",
        "Search",
        "kering-digital-search",
      ),
    ],
  },
  {
    id: "kering-tracker-social",
    title: "Social Total",
    fields: [],
    subgroups: [
      createTrackerSubgroup(
        "kering-tracker-social-branding",
        "Social Branding",
        "kering-social-branding",
      ),
      createTrackerSubgroup(
        "kering-tracker-social-non-branding",
        "Social NON Branding",
        "kering-social-non-branding",
      ),
    ],
  },
  {
    id: "kering-tracker-programmatic",
    title: "Programmatic Total",
    fields: [],
    subgroups: [
      createTrackerSubgroup(
        "kering-tracker-programmatic-display",
        "Display",
        "kering-programmatic-display",
      ),
      createTrackerSubgroup(
        "kering-tracker-programmatic-video",
        "Video",
        "kering-programmatic-video",
      ),
      createTrackerSubgroup(
        "kering-tracker-programmatic-search",
        "Search",
        "kering-programmatic-search",
      ),
    ],
  },
];

// ============================================
// EXPORT SCHEMA
// ============================================

export const schema = {
  summary: keringSummaryGroups,
  trackers: keringTrackerGroups,
};

// Export field definitions for potential reuse
export { keringBrandSummaryFields, keringInflationFields, keringBrands };
