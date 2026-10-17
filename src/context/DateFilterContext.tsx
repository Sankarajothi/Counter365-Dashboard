'use client';

import React, { createContext, useContext, useState, useMemo } from 'react';
import { DateFilterOption, DateRange } from '../types/dashboard';
import { getDateRangeFromOption } from '../utils/dateUtils';

interface DateFilterContextType {
  selectedOption: DateFilterOption;
  dateRange: DateRange;
  customStartDate: Date | null;
  customEndDate: Date | null;
  setSelectedOption: (option: DateFilterOption) => void;
  setCustomRange: (start: Date | null, end: Date | null) => void;
}

const DateFilterContext = createContext<DateFilterContextType | undefined>(undefined);

export const DateFilterProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [selectedOption, setSelectedOption] = useState<DateFilterOption>('all_time');
  const [customStartDate, setCustomStartDate] = useState<Date | null>(null);
  const [customEndDate, setCustomEndDate] = useState<Date | null>(null);

  const dateRange = useMemo(() => {
    return getDateRangeFromOption(selectedOption, customStartDate, customEndDate);
  }, [selectedOption, customStartDate, customEndDate]);

  const setCustomRange = (start: Date | null, end: Date | null) => {
    setCustomStartDate(start);
    setCustomEndDate(end);
    setSelectedOption('custom');
  };

  return (
    <DateFilterContext.Provider
      value={{
        selectedOption,
        dateRange,
        customStartDate,
        customEndDate,
        setSelectedOption,
        setCustomRange,
      }}
    >
      {children}
    </DateFilterContext.Provider>
  );
};

export const useDateFilter = (): DateFilterContextType => {
  const context = useContext(DateFilterContext);
  if (!context) {
    throw new Error('useDateFilter must be used within a DateFilterProvider');
  }
  return context;
};
