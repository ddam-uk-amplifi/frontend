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
import { getClientDataSchemas, type FieldGroup } from "@/lib/clients";
import { TRACKER_MEDIA_TYPES as ARLA_TRACKER_MEDIA_TYPES } from "@/lib/clients/arla";

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

// Get client data schemas from centralized client registry
const clientDataSchemas = getClientDataSchemas();

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
