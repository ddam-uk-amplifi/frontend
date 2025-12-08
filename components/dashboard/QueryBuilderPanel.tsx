'use client';

import { useState, useMemo } from 'react';
import { ChevronRight, ChevronDown, X, Trash2 } from 'lucide-react';
import { FieldTypeIndicator } from './FieldTypeIndicator';
import { getFieldType } from './utils/dataProcessing';

interface QueryBuilderPanelProps {
  isOpen: boolean;
  onClose: () => void;
  selectedFields: Record<string, string[]>;
  onFieldToggle: (groupId: string, fieldId: string) => void;
  onClearAll?: () => void;
  dataSource?: 'summary' | 'trackers' | '';
  selectedClient?: string;
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
  { id: 'total-net-net-spend', label: 'Total net net spend' },
  { id: 'total-addressable-net-net-spend', label: 'Total addressable net net spend' },
  { id: 'total-net-net-measured', label: 'Total net net measured' },
  { id: 'measured-spend-pct', label: 'Measured Spend %' },
  { id: 'savings-value', label: 'Savings Value' },
  { id: 'savings-pct', label: 'Savings %' },
  { id: 'inflation-pct', label: 'Inflation %' },
  { id: 'inflation-mitigation', label: 'Inflation Mitigation' },
  { id: 'inflation-after-mitigation-pct', label: 'Inflation after Mitigation %' },
];

const arlaSummaryGroups: FieldGroup[] = [
  {
    id: 'arla-fy-fc-summary',
    title: 'FY FC Summary',
    fields: arlaCommonFields.map(f => ({ ...f, id: `arla-fy-${f.id}` })),
  },
  {
    id: 'arla-ytd-summary',
    title: 'YTD Summary',
    fields: arlaCommonFields.map(f => ({ ...f, id: `arla-ytd-${f.id}` })),
  },
];

const arlaTrackerGroups: FieldGroup[] = [
  { id: 'arla-tracker-summary', title: 'Summary', fields: arlaCommonFields.map(f => ({ ...f, id: `arla-tracker-summary-${f.id}` })) },
  { id: 'arla-tracker-tv', title: 'TV', fields: arlaCommonFields.map(f => ({ ...f, id: `arla-tracker-tv-${f.id}` })) },
  { id: 'arla-tracker-print', title: 'Print', fields: arlaCommonFields.map(f => ({ ...f, id: `arla-tracker-print-${f.id}` })) },
  { id: 'arla-tracker-ooh', title: 'OOH', fields: arlaCommonFields.map(f => ({ ...f, id: `arla-tracker-ooh-${f.id}` })) },
  { id: 'arla-tracker-online', title: 'Online', fields: arlaCommonFields.map(f => ({ ...f, id: `arla-tracker-online-${f.id}` })) },
  { id: 'arla-tracker-radio', title: 'Radio', fields: arlaCommonFields.map(f => ({ ...f, id: `arla-tracker-radio-${f.id}` })) },
  { id: 'arla-tracker-cinema', title: 'Cinema', fields: arlaCommonFields.map(f => ({ ...f, id: `arla-tracker-cinema-${f.id}` })) },
];

// ============================================
// KERING DATA SCHEMA
// ============================================
const keringInflationFields = [
  { id: 'h1-measured-spend', label: 'H1 Measured Spend' },
  { id: 'market-weighted-inflation', label: 'Market Weighted Inflation' },
  { id: 'inflation-mitigated-dentsu-c', label: 'Inflation Mitigated by DENTSU C' },
  { id: 'inflation-mitigated-dentsu-pct', label: 'Inflation mitigated by DENTSU %' },
  { id: 'inflation-not-mitigated-dentsu-c', label: 'Inflation not mitigated by DENTSU C' },
  { id: 'inflation-not-mitigated-dentsu-pct', label: 'Inflation not mitigated by DENTSU %' },
];

const keringBrandSummaryFields = [
  { id: 'total-spend', label: 'Total Spend' },
  { id: 'addressable', label: 'Addressable' },
  { id: 'measured-spend', label: 'Measured Spend' },
  { id: 'measured-spend-pct', label: 'Measured Spend %' },
  { id: 'measured-savings', label: 'Measured Savings' },
  { id: 'measured-savings-pct', label: 'Measured Savings %' },
];

const keringBrands = [
  'Alexander McQueen', 'Balenciaga', 'Bottega Veneta', 'Boucheron', 'Brioni',
  'Dodo', 'Gucci', 'Kering Eyewear', 'Pomellato', 'Saint Laurent', 'Kering Corporate'
];

const keringSummaryGroups: FieldGroup[] = [
  {
    id: 'kering-inflation',
    title: 'Inflation',
    fields: keringInflationFields.map(f => ({ ...f, id: `kering-inflation-${f.id}` })),
  },
  {
    id: 'kering-all-brand-summary',
    title: 'All Brand Summary',
    fields: keringBrandSummaryFields.map(f => ({ ...f, id: `kering-all-brand-${f.id}` })),
  },
  {
    id: 'kering-brands',
    title: 'Brands',
    fields: keringBrands.map(brand => ({
      id: `kering-brand-${brand.toLowerCase().replace(/\s+/g, '-')}`,
      label: brand,
    })),
  },
];

const keringTrackerCommonFields = keringBrandSummaryFields;

const keringTrackerGroups: FieldGroup[] = [
  { id: 'kering-tracker-summary', title: 'Summary', fields: keringTrackerCommonFields.map(f => ({ ...f, id: `kering-tracker-summary-${f.id}` })) },
  {
    id: 'kering-tracker-print',
    title: 'Print',
    fields: [],
    subgroups: [
      { id: 'kering-tracker-print-newspaper', title: 'Newspaper', fields: keringTrackerCommonFields.map(f => ({ ...f, id: `kering-print-newspaper-${f.id}` })) },
      { id: 'kering-tracker-print-magazines', title: 'Magazines', fields: keringTrackerCommonFields.map(f => ({ ...f, id: `kering-print-magazines-${f.id}` })) },
      { id: 'kering-tracker-print-anniversary', title: 'Anniversary', fields: keringTrackerCommonFields.map(f => ({ ...f, id: `kering-print-anniversary-${f.id}` })) },
    ],
  },
  {
    id: 'kering-tracker-outdoor',
    title: 'Outdoor',
    fields: [],
    subgroups: [
      { id: 'kering-tracker-outdoor-standard', title: 'Outdoor-standard', fields: keringTrackerCommonFields.map(f => ({ ...f, id: `kering-outdoor-standard-${f.id}` })) },
      { id: 'kering-tracker-outdoor-digital', title: 'Outdoor-digital', fields: keringTrackerCommonFields.map(f => ({ ...f, id: `kering-outdoor-digital-${f.id}` })) },
    ],
  },
  {
    id: 'kering-tracker-digital',
    title: 'Digital',
    fields: [],
    subgroups: [
      { id: 'kering-tracker-digital-display', title: 'Display', fields: keringTrackerCommonFields.map(f => ({ ...f, id: `kering-digital-display-${f.id}` })) },
      { id: 'kering-tracker-digital-video', title: 'Video', fields: keringTrackerCommonFields.map(f => ({ ...f, id: `kering-digital-video-${f.id}` })) },
      { id: 'kering-tracker-digital-search', title: 'Search', fields: keringTrackerCommonFields.map(f => ({ ...f, id: `kering-digital-search-${f.id}` })) },
    ],
  },
  {
    id: 'kering-tracker-social',
    title: 'Social Total',
    fields: [],
    subgroups: [
      { id: 'kering-tracker-social-branding', title: 'Social Branding', fields: keringTrackerCommonFields.map(f => ({ ...f, id: `kering-social-branding-${f.id}` })) },
      { id: 'kering-tracker-social-non-branding', title: 'Social NON Branding', fields: keringTrackerCommonFields.map(f => ({ ...f, id: `kering-social-non-branding-${f.id}` })) },
    ],
  },
  {
    id: 'kering-tracker-programmatic',
    title: 'Programmatic Total',
    fields: [],
    subgroups: [
      { id: 'kering-tracker-programmatic-display', title: 'Display', fields: keringTrackerCommonFields.map(f => ({ ...f, id: `kering-programmatic-display-${f.id}` })) },
      { id: 'kering-tracker-programmatic-video', title: 'Video', fields: keringTrackerCommonFields.map(f => ({ ...f, id: `kering-programmatic-video-${f.id}` })) },
      { id: 'kering-tracker-programmatic-search', title: 'Search', fields: keringTrackerCommonFields.map(f => ({ ...f, id: `kering-programmatic-search-${f.id}` })) },
    ],
  },
];

// ============================================
// CARLSBERG DATA SCHEMA
// ============================================
const carlsbergMediaTypes = ['Total', 'Cinema', 'Online', 'Events', 'Outdoor', 'Print', 'Radio', 'TV'];

const carlsbergCostResultFields = [
  { id: 'total-net-hold-spend', label: 'Total Net Hold Spend' },
  { id: 'measured-net-hold-spend', label: 'Measured Net Hold Spend' },
  { id: 'non-measured-hold-spend', label: 'Non Measured Hold Spend' },
  { id: 'measured-hold-spend-pct', label: 'Measured Hold Spend %' },
  { id: 'net-hold-costs-pct', label: 'Net Hold COSTS %' },
  { id: 'cpa-rate', label: 'CPA/Rate' },
  { id: 'actual-units', label: 'Actual units' },
  { id: 'savings', label: 'Savings' },
  { id: 'savings-pct', label: 'Savings %' },
];

const carlsbergMBUFields = [
  { id: 'total-spend-tracker-fy24-mbu', label: 'Total spend Tracker FY24 & MBU' },
  { id: 'fy-hold-vs-actual-spend-pct', label: 'FY Hold vs Actual Spend %' },
  { id: 'fy-projected-spend-mbu', label: 'FY Projected Spend & MBU' },
  { id: 'fy-hold-vs-projected-spend-pct', label: 'FY Hold vs Projected Spend %' },
  { id: 'fy-projected-savings-vs-hold', label: 'FY Projected Savings (vs Hold)' },
  { id: 'fy-mbu-impact-vs-actual-hold', label: 'FY MBU Impact vs Actual Hold Spend' },
  { id: 'fy-mbu-impact-vs-projected', label: 'FY MBU Impact vs Projected Spend' },
  { id: 'fy-projected-savings-mbu-only', label: 'FY Projected Savings (MBU only vs Hold)' },
  { id: 'fy-projected-mbu-achievement', label: 'FY Projected MBU Achievement (Actual vs Projected)' },
];

const carlsbergSummaryGroups: FieldGroup[] = [
  {
    id: 'carlsberg-total-spends',
    title: 'Total Spends',
    fields: carlsbergMediaTypes.map(media => ({
      id: `carlsberg-spend-${media.toLowerCase()}`,
      label: media,
    })),
  },
  {
    id: 'carlsberg-all-market-inflation',
    title: 'All Market Inflation',
    fields: carlsbergMediaTypes.filter(m => m !== 'Total').map(media => ({
      id: `carlsberg-inflation-${media.toLowerCase()}`,
      label: media,
    })),
  },
  {
    id: 'carlsberg-all-market-cost-result',
    title: 'All Market Cost Result',
    fields: carlsbergCostResultFields.map(f => ({ ...f, id: `carlsberg-cost-${f.id}` })),
  },
  {
    id: 'carlsberg-mbu',
    title: 'MBU',
    fields: carlsbergMBUFields.map(f => ({ ...f, id: `carlsberg-mbu-${f.id}` })),
  },
  {
    id: 'carlsberg-overview',
    title: 'Overview',
    fields: [
      { id: 'carlsberg-overview-summary', label: 'Overview Summary' },
      { id: 'carlsberg-overview-highlights', label: 'Key Highlights' },
      { id: 'carlsberg-overview-performance', label: 'Performance Metrics' },
    ],
  },
];

const carlsbergTrackerGroups: FieldGroup[] = [
  { id: 'carlsberg-tracker-summary', title: 'Summary', fields: carlsbergCostResultFields.map(f => ({ ...f, id: `carlsberg-tracker-summary-${f.id}` })) },
  { id: 'carlsberg-tracker-tv', title: 'TV', fields: carlsbergCostResultFields.map(f => ({ ...f, id: `carlsberg-tracker-tv-${f.id}` })) },
  { id: 'carlsberg-tracker-newspaper', title: 'Newspaper', fields: carlsbergCostResultFields.map(f => ({ ...f, id: `carlsberg-tracker-newspaper-${f.id}` })) },
  { id: 'carlsberg-tracker-magazines', title: 'Magazines', fields: carlsbergCostResultFields.map(f => ({ ...f, id: `carlsberg-tracker-magazines-${f.id}` })) },
  { id: 'carlsberg-tracker-radio', title: 'Radio', fields: carlsbergCostResultFields.map(f => ({ ...f, id: `carlsberg-tracker-radio-${f.id}` })) },
  { id: 'carlsberg-tracker-outdoor', title: 'Outdoor', fields: carlsbergCostResultFields.map(f => ({ ...f, id: `carlsberg-tracker-outdoor-${f.id}` })) },
  { id: 'carlsberg-tracker-online', title: 'Online', fields: carlsbergCostResultFields.map(f => ({ ...f, id: `carlsberg-tracker-online-${f.id}` })) },
  { id: 'carlsberg-tracker-cinema', title: 'Cinema', fields: carlsbergCostResultFields.map(f => ({ ...f, id: `carlsberg-tracker-cinema-${f.id}` })) },
];

// ============================================
// CLIENT DATA MAPPING
// ============================================
const clientDataSchemas: Record<string, { summary: FieldGroup[]; trackers: FieldGroup[] }> = {
  Arla: { summary: arlaSummaryGroups, trackers: arlaTrackerGroups },
  Kering: { summary: keringSummaryGroups, trackers: keringTrackerGroups },
  Carlsberg: { summary: carlsbergSummaryGroups, trackers: carlsbergTrackerGroups },
};

export function QueryBuilderPanel({
  isOpen,
  onClose,
  selectedFields,
  onFieldToggle,
  onClearAll,
  dataSource = '',
  selectedClient = '',
}: QueryBuilderPanelProps) {
  const [expandedGroups, setExpandedGroups] = useState<string[]>([]);

  const toggleGroup = (groupId: string) => {
    setExpandedGroups((prev) =>
      prev.includes(groupId) ? prev.filter((id) => id !== groupId) : [...prev, groupId]
    );
  };

  // Determine which field groups to show based on client and data source
  const queryGroups = useMemo(() => {
    if (!selectedClient || !dataSource) return [];
    
    const schema = clientDataSchemas[selectedClient];
    if (!schema) return [];
    
    if (dataSource === 'summary') {
      return schema.summary;
    } else if (dataSource === 'trackers') {
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
    return Object.values(selectedFields).reduce((sum, arr) => sum + arr.length, 0);
  };

  const renderFieldGroup = (group: FieldGroup, depth: number = 0) => {
    const isExpanded = expandedGroups.includes(group.id);
    const groupSelections = selectedFields[group.id] || [];
    const selectedCount = groupSelections.length;
    const hasSubgroups = group.subgroups && group.subgroups.length > 0;
    const hasFields = group.fields && group.fields.length > 0;

    // Calculate total selections including subgroups
    let totalSubgroupSelections = selectedCount;
    if (hasSubgroups) {
      group.subgroups?.forEach(sub => {
        totalSubgroupSelections += (selectedFields[sub.id] || []).length;
      });
    }

    return (
      <div key={group.id} className={`bg-[#F4F4F4] rounded-2xl overflow-hidden ${depth > 0 ? 'ml-4 mt-2' : ''}`}>
        <button
          onClick={() => toggleGroup(group.id)}
          className={`w-full flex items-center justify-between p-4 hover:bg-gray-200 transition-colors ${depth > 0 ? 'py-3' : ''}`}
        >
          <div className="flex items-center gap-3">
            {isExpanded ? (
              <ChevronDown className="w-4 h-4 text-gray-600" />
            ) : (
              <ChevronRight className="w-4 h-4 text-gray-600" />
            )}
            <span className={`font-medium text-gray-900 ${depth > 0 ? 'text-sm' : ''}`}>{group.title}</span>
          </div>
          {totalSubgroupSelections > 0 && (
            <span className="px-2 py-1 bg-[#004D9F] text-white text-xs rounded-full">
              {totalSubgroupSelections}
            </span>
          )}
        </button>

        {isExpanded && (
          <div className="px-4 pb-4 space-y-2">
            {/* Render fields if present */}
            {hasFields && group.fields.map((field) => {
              const isSelected = selectedFields[group.id]?.includes(field.id) || false;
              const fieldType = getFieldType(field.id);
              
              return (
                <button
                  key={field.id}
                  onClick={() => onFieldToggle(group.id, field.id)}
                  className={`w-full flex items-center justify-between p-3 rounded-xl transition-all ${
                    isSelected
                      ? 'bg-[#004D9F] text-white shadow-md'
                      : 'bg-white hover:bg-gray-50 text-gray-900 border border-gray-200'
                  }`}
                >
                  <span className="text-sm">{field.label}</span>
                  <FieldTypeIndicator type={fieldType} />
                </button>
              );
            })}
            
            {/* Render subgroups if present */}
            {hasSubgroups && group.subgroups?.map(subgroup => renderFieldGroup(subgroup, depth + 1))}
          </div>
        )}
      </div>
    );
  };

  if (!isOpen) return null;

  return (
    <div className="w-[400px] bg-white border-r border-gray-200 h-full overflow-y-auto shadow-lg">
      <div className="sticky top-0 bg-white border-b border-gray-200 p-6 z-10">
        <div className="flex items-center justify-between mb-2">
          <h2 className="text-lg font-semibold text-gray-900">Query Builder</h2>
          <button
            onClick={onClose}
            className="p-2 hover:bg-gray-100 rounded-lg transition-colors"
          >
            <X className="w-5 h-5 text-gray-500" />
          </button>
        </div>
        <div className="flex items-center justify-between">
          <p className="text-sm text-gray-500">
            {getTotalSelected()} field{getTotalSelected() !== 1 ? 's' : ''} selected
          </p>
          {onClearAll && getTotalSelected() > 0 && (
            <button
              onClick={onClearAll}
              className="flex items-center gap-2 px-3 py-1.5 text-sm text-red-600 hover:bg-red-50 rounded-lg transition-colors"
            >
              <Trash2 className="w-4 h-4" />
              Clear All
            </button>
          )}
        </div>
      </div>

      <div className="p-4 space-y-2">
        {queryGroups.length === 0 ? (
          <div className="text-center py-8 text-gray-500">
            <p className="text-sm">Select a client and data source to see available fields</p>
          </div>
        ) : (
          queryGroups.map((group) => renderFieldGroup(group, 0))
        )}
      </div>
    </div>
  );
}
