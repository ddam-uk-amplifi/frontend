import type { FieldGroup, TrackerMediaType } from "../types";
import {
  commonSummaryFields,
  trackerSummaryFields,
  commonMonthlyTrackerFields,
  commonBuySpecificsFields,
  prefixFields,
} from "../base";

// ============================================
// ARLA SUMMARY SCHEMA
// ============================================

const arlaSummaryGroups: FieldGroup[] = [
  {
    id: "arla-fy-fc-summary",
    title: "FY FC Summary",
    fields: commonSummaryFields.map((f) => ({ ...f, id: `arla-fy-${f.id}` })),
  },
  {
    id: "arla-ytd-summary",
    title: "YTD Summary",
    fields: commonSummaryFields.map((f) => ({ ...f, id: `arla-ytd-${f.id}` })),
  },
];

// ============================================
// ARLA TRACKER SCHEMA
// ============================================

/**
 * Create a media type tracker group with monthly, buy specifics, and percentile subgroups
 */
function createMediaTypeGroup(
  mediaType: string,
  mediaTypeId: string,
): FieldGroup {
  return {
    id: `arla-tracker-${mediaTypeId}`,
    title: mediaType,
    fields: [],
    subgroups: [
      {
        id: `arla-tracker-${mediaTypeId}-monthly`,
        title: "Monthly",
        fields: prefixFields(commonMonthlyTrackerFields, mediaTypeId),
      },
      {
        id: `arla-tracker-${mediaTypeId}-buy-specifics`,
        title: "Buy Specifics",
        fields: prefixFields(commonBuySpecificsFields, mediaTypeId),
      },
      {
        id: `arla-tracker-${mediaTypeId}-percentile`,
        title: "Percentile",
        fields: [],
      },
    ],
  };
}

const arlaTrackerGroups: FieldGroup[] = [
  {
    id: "arla-tracker-summary",
    title: "Summary",
    fields: trackerSummaryFields.map((f) => ({ ...f, id: `summary-${f.id}` })),
  },
  createMediaTypeGroup("TV", "tv"),
  createMediaTypeGroup("Radio", "radio"),
  createMediaTypeGroup("Print", "print"),
  createMediaTypeGroup("OOH", "ooh"),
  createMediaTypeGroup("Online", "online"),
  createMediaTypeGroup("Cinema", "cinema"),
];

// ============================================
// ARLA TRACKER MEDIA TYPE MAPPING
// ============================================

/**
 * Map group IDs to media types for dynamic field loading
 */
export const TRACKER_MEDIA_TYPES: Record<string, TrackerMediaType> = {
  "arla-tracker-tv": "tv",
  "arla-tracker-radio": "radio",
  "arla-tracker-print": "print",
  "arla-tracker-ooh": "ooh",
  "arla-tracker-online": "online",
  "arla-tracker-cinema": "cinema",
};

// ============================================
// EXPORT SCHEMA
// ============================================

export const schema = {
  summary: arlaSummaryGroups,
  trackers: arlaTrackerGroups,
};
