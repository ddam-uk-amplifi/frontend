"use client";

import { ChevronDown, ChevronUp, Filter } from "lucide-react";
import type React from "react";
import { useEffect, useRef, useState } from "react";
import { cn } from "@/lib/utils";

export type SortOrder = "asc" | "desc" | "original" | null;

interface FilterableTableHeadProps<T = Record<string, unknown>> {
  column: keyof T;
  className?: string;
  sortColumn?: keyof T | null;
  sortOrder?: SortOrder;
  onSort?: (column: keyof T) => void;
  filterValue?: string;
  onFilter?: (column: keyof T, value: string) => void;
  allData?: T[];
  children: React.ReactNode;
  // Predefined filter options for specific columns
  predefinedOptions?: string[];
  // Whether to show dynamic options from data
  showDynamicOptions?: boolean;
  // Function to extract values from data for dynamic options
  getValueFromData?: (item: T) => string | null | undefined;
}

export function FilterableTableHead<T>({
  column,
  className,
  sortColumn,
  sortOrder,
  onSort,
  filterValue = "すべて",
  onFilter,
  allData = [],
  children,
  predefinedOptions,
  showDynamicOptions = true,
  getValueFromData,
}: FilterableTableHeadProps<T>) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const dropdownRef = useRef<HTMLDivElement>(null);

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event: MouseEvent) => {
      if (
        dropdownRef.current &&
        !dropdownRef.current.contains(event.target as Node)
      ) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  // Generate filter options
  const getFilterOptions = (): string[] => {
    const options = new Set<string>();
    options.add("すべて"); // Always include "All" option

    // Add predefined options if provided
    if (predefinedOptions) {
      for (const option of predefinedOptions) {
        options.add(option);
      }
    }

    // Add dynamic options from data if enabled
    if (showDynamicOptions && allData && getValueFromData) {
      allData.forEach((item) => {
        const value = getValueFromData(item);
        if (value && value.trim() !== "") {
          options.add(value);
        }
      });
    }

    return Array.from(options);
  };

  const handleSortClick = () => {
    if (onSort) {
      onSort(column);
    }
  };

  const handleFilterClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsDropdownOpen(!isDropdownOpen);
  };

  const handleFilterSelect = (value: string) => {
    if (onFilter) {
      onFilter(column, value);
    }
    setIsDropdownOpen(false);
  };

  const getSortIcon = () => {
    if (sortColumn !== column) {
      return <ChevronDown className="h-3 w-3 opacity-50" />;
    }
    return sortOrder === "asc" ? (
      <ChevronUp className="h-3 w-3" />
    ) : (
      <ChevronDown className="h-3 w-3" />
    );
  };

  const filterOptions = getFilterOptions();
  const hasActiveFilter = filterValue !== "すべて";

  return (
    <th className={cn("relative", className)}>
      <div className="flex items-center justify-between gap-1 p-2">
        <button
          type="button"
          className="flex items-center gap-1 cursor-pointer hover:text-foreground/80 flex-1 bg-transparent border-none p-0 m-0 font-medium text-xs text-muted-foreground"
          onClick={handleSortClick}
        >
          <span className="select-text font-medium">{children}</span>
          {getSortIcon()}
        </button>

        <div className="relative" ref={dropdownRef}>
          <button
            type="button"
            onClick={handleFilterClick}
            className={cn(
              "p-1 hover:bg-muted rounded transition-colors",
              hasActiveFilter && "text-blue-600 bg-blue-50",
            )}
            title="フィルター"
          >
            <Filter className="h-3 w-3" />
          </button>

          {isDropdownOpen && (
            <div className="absolute right-0 top-full mt-1 bg-white border border-gray-200 rounded-md shadow-lg z-50 min-w-32 max-h-48 overflow-y-auto">
              {filterOptions.map((option) => (
                <button
                  type="button"
                  key={option}
                  onClick={() => handleFilterSelect(option)}
                  className={cn(
                    "w-full text-left px-3 py-2 text-xs hover:bg-gray-50 transition-colors",
                    option === filterValue &&
                      "bg-blue-50 text-blue-600 font-medium",
                  )}
                >
                  {option}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </th>
  );
}
