# Adding New Clients Guide

This document describes how to add new clients to the dashboard system. The system is designed for scalability - adding a new client requires only configuration files, not changes to core components.

---

## Architecture Overview

```
lib/clients/
├── index.ts                 # Client registry, helper functions & transform registration
├── types.ts                 # TypeScript interfaces for all configs
├── transforms.ts            # Generic transform function & registry (no client-specific code)
├── api.ts                   # Generic API layer & client API registry
├── hooks/
│   └── useTableViewData.ts  # Generic data fetching hook
└── {client-name}/
    ├── index.ts             # Client module entry point (exports everything)
    ├── config.ts            # ClientConfig (id, name, slug, features)
    ├── schema.ts            # Field schema for QueryBuilder
    ├── tableView.ts         # TableViewConfig (columns, periods, brands)
    ├── api.ts               # ClientApiConfig (endpoint definitions)
    ├── transforms.ts        # Client-specific transform configs (NEW!)
    └── types.ts             # Client-specific types (optional)
```

### Key Principle: Client-Specific Code Lives in Client Folders

All client-specific configurations (transforms, API endpoints, columns, periods) live in the client's folder.
The core files (`transforms.ts`, `api.ts`, `index.ts`) only contain:
- Generic utility functions
- Type definitions
- Registration mechanisms

---

## Quick Start: Adding a New Client

### Step 1: Create Client Directory

```bash
mkdir -p lib/clients/{client-name}
```

### Step 2: Create config.ts

This defines the basic client metadata.

```typescript
// lib/clients/{client-name}/config.ts

import type { ClientConfig } from "../types";

export const {clientName}Config: ClientConfig = {
  id: {clientId},              // Unique client ID from backend database
  name: "{Client Name}",       // Display name (e.g., "Kering")
  slug: "{client-name}",       // URL-safe lowercase (e.g., "kering")
  markets: ["US", "UK", "FR"], // Available market codes
  features: {
    hasTrackers: true,         // Does client have tracker data?
    hasBrandSummary: true,     // Does client have brand breakdown?
    hasInflation: false,       // Does client have inflation metrics?
    hasDynamicTrackerFields: false, // Does client use dynamic field selection?
  },
  // Optional: Chart display preferences
  chartPreferences: {
    preferredChartTypes: ["bar-chart", "table"],
    thresholds: {
      highCardinalityThreshold: 15,
      maxPieCategories: 7,
      maxBarCategories: 20,
    },
  },
};
```

### Step 3: Create schema.ts

This defines the field groups for the QueryBuilder panel.

```typescript
// lib/clients/{client-name}/schema.ts

import type { ClientSchema, FieldGroup } from "../types";

// Define brands if client has brand breakdown
export const {clientName}Brands: string[] = [
  "Brand A",
  "Brand B",
  "Brand C",
];

// Summary field groups (for Summary data source)
const summaryFieldGroups: FieldGroup[] = [
  {
    id: "{client-name}-summary",
    title: "Summary Metrics",
    fields: [
      { id: "{client-name}-total-spend", label: "Total Spend" },
      { id: "{client-name}-measured-spend", label: "Measured Spend" },
      // ... add fields
    ],
  },
];

// Tracker field groups (for Trackers data source)
const trackerFieldGroups: FieldGroup[] = [
  {
    id: "{client-name}-tracker",
    title: "Tracker Metrics",
    fields: [
      { id: "{client-name}-net-net-spend", label: "Net Net Spend" },
      // ... add fields
    ],
  },
];

export const schema: ClientSchema = {
  summary: summaryFieldGroups,
  trackers: trackerFieldGroups,
};
```

### Step 4: Create tableView.ts

This defines how data is displayed in the DataTableView component.

```typescript
// lib/clients/{client-name}/tableView.ts

import type { TableViewConfig, TableColumnConfig, PeriodOption } from "../types";
import { {clientName}Brands } from "./schema";

// ============================================
// PERIODS (for tracker filtering)
// ============================================

export const {clientName}TrackerPeriods: PeriodOption[] = [
  // Summary periods
  { code: "DECEMBER", name: "December (YTD)" },
  { code: "FY", name: "Full Year" },
  { code: "1H", name: "First Half" },
  { code: "1Q", name: "Q1" },
  { code: "2Q", name: "Q2" },
  { code: "3Q", name: "Q3" },
  { code: "4Q", name: "Q4" },
  // Monthly periods
  { code: "JANUARY", name: "January" },
  { code: "FEBRUARY", name: "February" },
  // ... add all months
];

// ============================================
// COLUMN DEFINITIONS
// ============================================

// Summary view columns (All Brand Summary)
export const {clientName}SummaryColumns: TableColumnConfig[] = [
  { id: "market", label: "Market", type: "text", align: "left", visible: true, order: 0, frozen: true },
  { id: "total_spend", label: "Total Spend", type: "currency", align: "right", visible: true, order: 1 },
  { id: "addressable_spend", label: "Addressable Spend", type: "currency", align: "right", visible: true, order: 2 },
  { id: "measured_spend", label: "Measured Spend", type: "currency", align: "right", visible: true, order: 3 },
  { id: "measured_spend_pct", label: "Measured %", type: "percentage", align: "right", visible: true, order: 4 },
  { id: "measured_savings", label: "Measured Savings", type: "currency", align: "right", visible: true, order: 5 },
  { id: "measured_savings_pct", label: "Savings %", type: "percentage", align: "right", visible: true, order: 6 },
];

// Summary view columns for specific brand (if different from all-brand)
export const {clientName}SummaryBrandColumns: TableColumnConfig[] = [
  { id: "mediaType", label: "Market", type: "text", align: "left", visible: true, order: 0, frozen: true },
  // ... same fields, but first column uses "mediaType" (from transform groupByField)
];

// Tracker view columns
export const {clientName}TrackerColumns: TableColumnConfig[] = [
  { id: "mediaType", label: "Media Type", type: "text", align: "left", visible: true, order: 0, frozen: true },
  { id: "total_net_net_media_spend", label: "Net Net Spend", type: "currency", align: "right", visible: true, order: 1 },
  // ... add all tracker columns
];

// ============================================
// TABLE VIEW CONFIG
// ============================================

export const {clientName}TableView: TableViewConfig = {
  dataSources: ["summary", "trackers"],  // or just ["summary"] if no trackers

  summary: {
    columns: {clientName}SummaryColumns,
    brandColumns: {clientName}SummaryBrandColumns,  // Optional: different columns for brand view
    sheetTypes: [
      { code: "ytd", name: "All Brand Summary" },
    ],
    // Transform config names (must match keys in transforms.ts registry)
    transformName: "{client-name}:allBrandSummary",
    brandTransformName: "{client-name}:consolidatedBrand",
    // Default view
    defaultView: "ytd",
    defaultViewLabel: "All Brand Summary",
  },

  trackers: {
    detailedColumns: {clientName}TrackerColumns,
    brandColumns: {clientName}TrackerColumns,  // Can be different if needed
    periods: {clientName}TrackerPeriods,
    defaultPeriod: "DECEMBER",
    periodField: "period",  // Field name in API response containing period
    // Transform config names
    transformName: "{client-name}:trackerSummary",
    brandTransformName: "{client-name}:trackerBrand",
    // Default view
    defaultView: "detailed",
    defaultViewLabel: "Detailed Summary",
    // Period filter dropdown (separate from view selector)
    hasPeriodFilter: true,
    periodFilter: {
      periods: {clientName}TrackerPeriods,
      defaultPeriod: "DECEMBER",
      groupSeparatorIndex: 7,  // Index to split periods into groups (optional)
      firstGroupLabel: "Summary Periods",
      secondGroupLabel: "Monthly",
    },
  },

  brands: {
    list: {clientName}Brands,
    inSummary: true,   // Show brand selector in summary view
    inTrackers: true,  // Show brand selector in tracker view
  },
};
```

### Step 5: Create api.ts

This defines the API endpoints for the client.

```typescript
// lib/clients/{client-name}/api.ts

import type { ClientApiConfig } from "../api";

export const {clientName}ApiConfig: ClientApiConfig = {
  enabled: true,
  basePath: "/api/v1/client/{client-name}",

  summary: {
    // Default endpoint (all-brand summary)
    default: {
      path: "/consolidated/all-brand-summary",
      method: "GET",
      queryParams: [
        { name: "client_id", source: "clientId", required: true },
        { name: "consolidation_job_id", source: "consolidationJobId" },
        { name: "market", source: "market" },
      ],
      responseDataKey: "data",  // Extract data from response.data
    },
    // Brand-specific endpoint
    brand: {
      path: "/consolidated/brand-summary",
      method: "GET",
      queryParams: [
        { name: "brand", source: "brand", required: true },
        { name: "market", source: "market" },
        { name: "client_id", source: "clientId" },
        { name: "consolidation_job_id", source: "consolidationJobId" },
      ],
      responseDataKey: "data",
    },
  },

  trackers: {
    // Default endpoint (detailed summary)
    default: {
      path: "/tracker/summary",
      method: "GET",
      queryParams: [
        { name: "client_id", source: "clientId", required: true },
        { name: "period", source: "period", transform: "uppercase" },
        { name: "media_type", source: "mediaType" },
        { name: "type", source: "type", transform: "uppercase" },
        { name: "markets", source: "market" },
      ],
      responseDataKey: "data",
    },
    // Brand-specific endpoint
    brand: {
      path: "/tracker/brand-summary",
      method: "GET",
      queryParams: [
        { name: "client_id", source: "clientId", required: true },
        { name: "brand_name", source: "brand", required: true },
        { name: "period", source: "period", transform: "uppercase" },
        { name: "media_type", source: "mediaType" },
        { name: "type", source: "type", transform: "uppercase" },
        { name: "markets", source: "market" },
      ],
      responseDataKey: "data",
    },
  },
};
```

### Step 6: Create transforms.ts

This defines the client-specific data transform configurations.

```typescript
// lib/clients/{client-name}/transforms.ts

import type { TransformConfig } from "../transforms";

/**
 * {Client Name} All Brand Summary transform
 * Data source: /consolidated/all-brand-summary
 */
export const {clientName}AllBrandSummaryTransform: TransformConfig = {
  groupByField: "market",           // Field to group by (becomes row label)
  sumFields: [                      // Numeric fields to include
    "total_spend",
    "addressable_spend",
    "measured_spend",
    "measured_savings",
    "added_value",
  ],
  percentageFieldsToConvert: [      // Decimal fields to multiply by 100
    "measured_spend_pct",
    "measured_savings_pct",
    "added_value_pct",
  ],
  aggregate: false,                 // false = pass through, true = aggregate by groupByField
  includeTotals: true,              // Add "Total" row at bottom
  calculatedPercentages: {          // Recalculate percentages for totals row
    measured_spend_pct: {
      numerator: "measured_spend",
      denominator: "addressable_spend",
    },
    measured_savings_pct: {
      numerator: "measured_savings",
      denominator: "measured_spend",
    },
    added_value_pct: {
      numerator: "added_value",
      denominator: "measured_spend",
    },
  },
};

/**
 * {Client Name} Tracker Summary transform
 * Data source: /tracker/summary
 */
export const {clientName}TrackerSummaryTransform: TransformConfig = {
  groupByField: "media_type",       // Group by media type
  filterField: "type",              // Filter field
  filterValue: "ALL",               // Filter value (e.g., only show "ALL" type)
  periodField: "period",            // Field containing period for filtering
  skipValues: ["Grand Total"],      // Values to exclude (we use useGrandTotalFromApi instead)
  sumFields: [
    "total_net_net_media_spend",
    "total_non_affectable_spend",
    "total_affectable_spend",
    "measured_spend",
    "total_savings",
    "measured_savings",
  ],
  aggregate: true,
  includeTotals: true,
  // Use GRAND TOTAL from API instead of calculating (more accurate)
  useGrandTotalFromApi: true,
  grandTotalValue: "Grand Total",
  // Handle duplicate media types (e.g., DIGITAL appears twice in some APIs)
  renameSecondOccurrence: { "Digital": "Digital Total" },
  calculatedPercentages: {
    measured_spend_pct: {
      numerator: "measured_spend",
      denominator: "total_affectable_spend",
    },
    total_savings_pct: {
      numerator: "total_savings",
      denominator: "measured_spend",
    },
  },
};

// Add more transforms as needed...

/**
 * Client transform registry - export all transforms
 * These will be registered globally in lib/clients/index.ts
 */
export const {clientName}Transforms: Record<string, TransformConfig> = {
  "{client-name}:allBrandSummary": {clientName}AllBrandSummaryTransform,
  "{client-name}:trackerSummary": {clientName}TrackerSummaryTransform,
  // Add more transforms here
};
```

### Step 7: Create index.ts

This exports everything from the client module.

```typescript
// lib/clients/{client-name}/index.ts

// Client module exports
export { {clientName}Config as config } from "./config";
export { schema, {clientName}Brands } from "./schema";
export {
  {clientName}TableView as tableView,
  {clientName}TrackerPeriods,
  {clientName}SummaryColumns,
  {clientName}SummaryBrandColumns,
  {clientName}TrackerColumns,
} from "./tableView";
export { {clientName}ApiConfig } from "./api";
export {
  {clientName}Transforms,
  {clientName}AllBrandSummaryTransform,
  {clientName}TrackerSummaryTransform,
  // ... export individual transforms
} from "./transforms";
```

### Step 8: Register Transforms

Transforms are registered automatically in `lib/clients/index.ts`. Add this after the client imports:

```typescript
// In lib/clients/index.ts

// Import client modules
import * as {clientName} from "./{client-name}";

// ... after clientRegistry definition ...

// ============================================
// REGISTER CLIENT TRANSFORMS
// ============================================

// Register {Client Name} transforms
if ({clientName}.{clientName}Transforms) {
  registerTransforms({clientName}.{clientName}Transforms);
}
```

### Step 9: Register API Config

Add to `lib/clients/api.ts`:

```typescript
// At the top of lib/clients/api.ts, add import:
import { {clientName}ApiConfig } from "./{client-name}/api";

// In the clientApiRegistry, add:
export const clientApiRegistry: Record<string, ClientApiConfig> = {
  // ... existing clients
  "{client-name}": {clientName}ApiConfig,
};
```

### Step 10: Register Client Module

Add to `lib/clients/index.ts`:

```typescript
// Add import at top:
import * as {clientName} from "./{client-name}";

// Add to clientRegistry:
const clientRegistry: Record<string, ClientModule> = {
  // ... existing clients
  "{client-name}": {clientName},
};
```

---

## Configuration Reference

### ClientConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | number | Yes | Unique client ID from backend database |
| `name` | string | Yes | Display name (e.g., "Kering") |
| `slug` | string | Yes | URL-safe lowercase identifier (e.g., "kering") |
| `markets` | string[] | Yes | Available market codes |
| `features.hasTrackers` | boolean | Yes | Whether client has tracker data |
| `features.hasBrandSummary` | boolean | Yes | Whether client has brand breakdown |
| `features.hasInflation` | boolean | Yes | Whether client has inflation metrics |
| `features.hasDynamicTrackerFields` | boolean | Yes | Whether client uses dynamic field selection |
| `chartPreferences` | object | No | Chart display preferences |

### ClientApiConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `enabled` | boolean | Yes | Whether this client uses the generic API system |
| `basePath` | string | No | Base path prefix (e.g., `/api/v1/client/kering`) |
| `summary.default` | EndpointConfig | No | All-brand summary endpoint |
| `summary.brand` | EndpointConfig | No | Brand-specific summary endpoint |
| `trackers.default` | EndpointConfig | No | Detailed tracker endpoint |
| `trackers.brand` | EndpointConfig | No | Brand-specific tracker endpoint |

### EndpointConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `path` | string | Yes | Endpoint path (can include `{placeholders}`) |
| `method` | "GET" \| "POST" | No | HTTP method (default: "GET") |
| `pathParams` | string[] | No | Values that replace `{placeholders}` in path |
| `queryParams` | EndpointParam[] | No | Query parameter configurations |
| `responseDataKey` | string | No | Key to extract data from response (e.g., "data") |

### EndpointParam

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `name` | string | Yes | Parameter name in query string |
| `source` | string | Yes | Source field from params object |
| `required` | boolean | No | Whether parameter is required |
| `transform` | "uppercase" \| "lowercase" \| "string" | No | Transform to apply |

### TableColumnConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `id` | string | Yes | Field name in transformed data (or API response) |
| `label` | string | Yes | Display label in table header |
| `type` | "text" \| "currency" \| "percentage" \| "number" | Yes | Formatting type |
| `align` | "left" \| "center" \| "right" | No | Text alignment (default: "left") |
| `visible` | boolean | No | Default visibility (default: true) |
| `order` | number | No | Display order |
| `frozen` | boolean | No | Whether column is sticky on scroll |

### TransformConfig

| Property | Type | Required | Description |
|----------|------|----------|-------------|
| `groupByField` | string | Yes | Field to group by (becomes `mediaType` in TableRow) |
| `sumFields` | string[] | Yes | Numeric fields to include in output |
| `filterField` | string | No | Field to filter by |
| `filterValue` | string | No | Value to filter for |
| `periodField` | string | No | Field containing period for filtering |
| `skipValues` | string[] | No | Values to exclude (e.g., "GRAND TOTAL") |
| `percentageFieldsToConvert` | string[] | No | Decimal fields to multiply by 100 |
| `percentageFieldsRaw` | string[] | No | Percentage fields to pass through as-is |
| `aggregate` | boolean | No | Whether to aggregate by groupByField |
| `includeTotals` | boolean | No | Add "Total" row at bottom |
| `calculatedPercentages` | object | No | Percentage calculations for totals |
| `useGrandTotalFromApi` | boolean | No | Use GRAND TOTAL from API instead of calculating |
| `grandTotalValue` | string | No | Field value that represents grand total (e.g., "Grand Total") |
| `skipDuplicates` | string[] | No | Skip duplicate occurrences (keep first only) |
| `renameSecondOccurrence` | object | No | Rename second occurrence: `{ "Digital": "Digital Total" }` |
| `renameValues` | object | No | Rename values: `{ "OLD": "NEW" }` |

---

## How It Works

### Data Flow

```
User selects client & data source
              ↓
    DataTableView component
              ↓
    useTableViewData hook
              ↓
    hasGenericApi(clientSlug)?
              ↓
    ┌─────────┴─────────┐
    │ YES               │ NO (legacy)
    ↓                   ↓
getClientApiConfig()    fetchConsolidatedSummary()
    ↓                   fetchTrackerSummaryData()
fetchClientData()             ↓
    ↓               Legacy transform
getTransformConfig()          ↓
    ↓                   rows
transformDataWithConfig()
    ↓
  rows → DataTableView renders
```

### Generic API Layer

The `fetchClientData()` function in `lib/clients/api.ts`:

1. Looks up endpoint config from `ClientApiConfig`
2. Builds URL with path params and query string
3. Makes HTTP request via `apiClient`
4. Extracts data using `responseDataKey` if specified
5. Returns `{ data, success, error }`

### Transform System

The `transformDataWithConfig()` function in `lib/clients/transforms.ts`:

1. Filters data by period (if `periodField` specified)
2. Filters data by type (if `filterField`/`filterValue` specified)
3. Removes skip values (if `skipValues` specified)
4. Either aggregates by `groupByField` or passes through
5. Converts percentage fields (if `percentageFieldsToConvert` specified)
6. Calculates percentages for totals (if `calculatedPercentages` specified)
7. Adds totals row (if `includeTotals: true`)
8. Returns `TableRow[]` for rendering

---

## Checklist for Adding a Client

### Required Files

- [ ] `lib/clients/{client-name}/config.ts` - ClientConfig
- [ ] `lib/clients/{client-name}/schema.ts` - Field schema for QueryBuilder
- [ ] `lib/clients/{client-name}/tableView.ts` - TableViewConfig
- [ ] `lib/clients/{client-name}/api.ts` - ClientApiConfig
- [ ] `lib/clients/{client-name}/transforms.ts` - TransformConfigs (client-specific)
- [ ] `lib/clients/{client-name}/index.ts` - Module exports

### Registry Updates

- [ ] Import API config in `lib/clients/api.ts`
- [ ] Add to `lib/clients/api.ts` → `clientApiRegistry`
- [ ] Import client module in `lib/clients/index.ts`
- [ ] Add to `lib/clients/index.ts` → `clientRegistry`
- [ ] Register transforms in `lib/clients/index.ts` → `registerTransforms()`

### Verification

- [ ] Run `npm run build` - no TypeScript errors
- [ ] Test Summary view - all-brand data loads
- [ ] Test Summary view - brand-specific data loads (if applicable)
- [ ] Test Tracker view - detailed data loads (if applicable)
- [ ] Test Tracker view - brand-specific data loads (if applicable)
- [ ] Test period filter works (if applicable)
- [ ] Test market filter works
- [ ] Verify column formatting (currency, percentage)
- [ ] Verify totals row calculates correctly

---

## Reference Implementation: Kering

Kering is the reference implementation with full features:

- **Brands**: 12 brands (Gucci, Balenciaga, Saint Laurent, etc.)
- **Summary Views**: All-brand summary + per-brand summary
- **Tracker Views**: Detailed tracker + per-brand tracker
- **Period Filter**: 7 summary periods + 11 monthly periods

### File Structure

```
lib/clients/kering/
├── index.ts      # Exports all modules
├── config.ts     # ClientConfig (id: 2, name: "Kering")
├── schema.ts     # Field groups + keringBrands array
├── tableView.ts  # Columns, periods, TableViewConfig
├── api.ts        # keringApiConfig with 4 endpoints
├── transforms.ts # Kering-specific transform configs
└── types.ts      # Kering-specific TypeScript types
```

### Key Files to Reference

| File | What to Copy |
|------|--------------|
| `kering/config.ts` | ClientConfig structure |
| `kering/tableView.ts` | Column definitions, period arrays, TableViewConfig |
| `kering/api.ts` | Endpoint configurations |
| `kering/transforms.ts` | Transform configs with useGrandTotalFromApi, renameSecondOccurrence |

---

## Troubleshooting

### "No data" in table

1. Check browser Network tab - is API returning data?
2. Check `responseDataKey` matches API response structure
3. Check transform `groupByField` matches a field in API response
4. Check `filterField`/`filterValue` aren't filtering out all data

### Columns not showing

1. Check column `id` matches field in transformed data
2. For first column, use `mediaType` (output of `groupByField`)
3. Check `visible: true` is set

### Percentages showing as decimals

1. Add field to `percentageFieldsToConvert` in transform config
2. Or check if API already returns percentages (use `percentageFieldsRaw`)

### Totals row incorrect

1. Check `calculatedPercentages` formulas
2. Ensure `sumFields` includes all numeric fields
3. Verify `includeTotals: true` is set

### API errors

1. Check `basePath` is correct
2. Check `queryParams` sources match available params
3. Check `required` params are being passed
4. Check `transform` is applied correctly (uppercase/lowercase)

---

## Notes

- Transform `groupByField` value becomes `mediaType` in TableRow (used as first column)
- Column `id: "mediaType"` displays the grouped field value
- Column `id: "market"` only works if API returns `market` field directly (no transform)
- `frozen: true` makes column sticky on horizontal scroll
- `normalizeToTitleCase()` converts "DIGITAL" → "Digital" for display
