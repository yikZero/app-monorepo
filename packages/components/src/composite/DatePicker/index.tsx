import { DatePickerProvider } from '@rehookify/datepicker';
import { useCallback, useMemo, useState } from 'react';

import { withStaticProperties } from '@onekeyhq/components/src/shared/tamagui';

import { Popover } from '../../actions/Popover';
import { YStack } from '../../primitives';

import { Calendar } from './Calendar';
import { DatePickerTrigger } from './DatePickerTrigger';

import type {
  IDatePickerProps,
  IDateRange,
  IMonthPickerProps,
  IMultiSelectPickerProps,
  IRangePickerProps,
  IYearPickerProps,
} from './type';

// Basic DatePicker for single date selection
function BasicDatePicker({
  value,
  onChange,
  onOpenChange,
  disabled,
  placeholder = 'Select date',
  minDate,
  maxDate,
  floatingPanelProps,
  sheetProps,
}: IDatePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedDates = useMemo(() => {
    return value ? [value] : [];
  }, [value]);

  const handleDatesChange = useCallback(
    (dates: Date[]) => {
      onChange?.(dates[0] || null);
      setIsOpen(false);
    },
    [onChange],
  );

  const config = useMemo(
    () => ({
      selectedDates,
      onDatesChange: handleDatesChange,
      dates: {
        mode: 'single' as const,
        minDate,
        maxDate,
      },
    }),
    [selectedDates, handleDatesChange, minDate, maxDate],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      onOpenChange?.(open);
    },
    [onOpenChange],
  );

  return (
    <Popover
      title="Select Date"
      open={isOpen}
      onOpenChange={handleOpenChange}
      renderTrigger={
        <DatePickerTrigger
          value={value}
          mode="date"
          placeholder={placeholder}
          disabled={disabled}
          onPress={() => !disabled && setIsOpen(true)}
        />
      }
      renderContent={
        <YStack padding="$4" minWidth={320}>
          <DatePickerProvider config={config}>
            <Calendar mode="date" />
          </DatePickerProvider>
        </YStack>
      }
      floatingPanelProps={{
        ...floatingPanelProps,
      }}
      sheetProps={{
        ...sheetProps,
      }}
    />
  );
}

// RangePicker for date range selection
function RangePicker({
  value,
  onChange,
  onOpenChange,
  disabled,
  placeholder = 'Select date range',
  minDate,
  maxDate,
  floatingPanelProps,
  sheetProps,
}: IRangePickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedDates = useMemo(() => {
    if (!value) return [];
    const dates: Date[] = [];
    if (value.start) dates.push(value.start);
    if (value.end) dates.push(value.end);
    return dates;
  }, [value]);

  const handleDatesChange = useCallback(
    (dates: Date[]) => {
      const range: IDateRange = {
        start: dates[0] || null,
        end: dates[1] || null,
      };
      onChange?.(range);
      // Auto-close after selecting end date
      if (dates.length === 2) {
        setIsOpen(false);
      }
    },
    [onChange],
  );

  const config = useMemo(
    () => ({
      selectedDates,
      onDatesChange: handleDatesChange,
      dates: {
        mode: 'range' as const,
        minDate,
        maxDate,
      },
      calendar: {
        offsets: [1],
      },
    }),
    [selectedDates, handleDatesChange, minDate, maxDate],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      onOpenChange?.(open);
    },
    [onOpenChange],
  );

  return (
    <Popover
      title="Select Date Range"
      open={isOpen}
      onOpenChange={handleOpenChange}
      renderTrigger={
        <DatePickerTrigger
          value={value}
          mode="range"
          placeholder={placeholder}
          disabled={disabled}
          onPress={() => !disabled && setIsOpen(true)}
        />
      }
      renderContent={
        <YStack padding="$4" minWidth={640}>
          <DatePickerProvider config={config}>
            <Calendar mode="range" />
          </DatePickerProvider>
        </YStack>
      }
      floatingPanelProps={{
        ...floatingPanelProps,
      }}
      sheetProps={{
        ...sheetProps,
      }}
    />
  );
}

// YearPicker for year selection
function YearPicker({
  value,
  onChange,
  onOpenChange,
  disabled,
  placeholder = 'Select year',
  minDate,
  maxDate,
  floatingPanelProps,
  sheetProps,
}: IYearPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedDates = useMemo(() => {
    return value ? [value] : [];
  }, [value]);

  const handleDatesChange = useCallback(
    (dates: Date[]) => {
      onChange?.(dates[0] || null);
      setIsOpen(false);
    },
    [onChange],
  );

  const config = useMemo(
    () => ({
      selectedDates,
      onDatesChange: handleDatesChange,
      dates: {
        mode: 'single' as const,
        minDate,
        maxDate,
        selectSameDate: true,
      },
      calendar: {
        mode: 'static' as const,
      },
    }),
    [selectedDates, handleDatesChange, minDate, maxDate],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      onOpenChange?.(open);
    },
    [onOpenChange],
  );

  return (
    <Popover
      title="Select Year"
      open={isOpen}
      onOpenChange={handleOpenChange}
      renderTrigger={
        <DatePickerTrigger
          value={value}
          mode="year"
          placeholder={placeholder}
          disabled={disabled}
          onPress={() => !disabled && setIsOpen(true)}
        />
      }
      renderContent={
        <YStack padding="$4" minWidth={320}>
          <DatePickerProvider config={config}>
            <Calendar mode="year" />
          </DatePickerProvider>
        </YStack>
      }
      floatingPanelProps={{
        ...floatingPanelProps,
      }}
      sheetProps={{
        ...sheetProps,
      }}
    />
  );
}

// MonthPicker for month selection
function MonthPicker({
  value,
  onChange,
  onOpenChange,
  disabled,
  placeholder = 'Select month',
  minDate,
  maxDate,
  floatingPanelProps,
  sheetProps,
}: IMonthPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const selectedDates = useMemo(() => {
    return value ? [value] : [];
  }, [value]);

  const handleDatesChange = useCallback(
    (dates: Date[]) => {
      onChange?.(dates[0] || null);
      setIsOpen(false);
    },
    [onChange],
  );

  const config = useMemo(
    () => ({
      selectedDates,
      onDatesChange: handleDatesChange,
      dates: {
        mode: 'single' as const,
        minDate,
        maxDate,
        selectSameDate: true,
      },
      calendar: {
        mode: 'static' as const,
      },
    }),
    [selectedDates, handleDatesChange, minDate, maxDate],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      onOpenChange?.(open);
    },
    [onOpenChange],
  );

  return (
    <Popover
      title="Select Month"
      open={isOpen}
      onOpenChange={handleOpenChange}
      renderTrigger={
        <DatePickerTrigger
          value={value}
          mode="month"
          placeholder={placeholder}
          disabled={disabled}
          onPress={() => !disabled && setIsOpen(true)}
        />
      }
      renderContent={
        <YStack padding="$4" minWidth={320}>
          <DatePickerProvider config={config}>
            <Calendar mode="month" />
          </DatePickerProvider>
        </YStack>
      }
      floatingPanelProps={{
        ...floatingPanelProps,
      }}
      sheetProps={{
        ...sheetProps,
      }}
    />
  );
}

// MultiSelectPicker for multiple date selection
function MultiSelectPicker({
  value = [],
  onChange,
  onOpenChange,
  disabled,
  placeholder = 'Select dates',
  minDate,
  maxDate,
  floatingPanelProps,
  sheetProps,
}: IMultiSelectPickerProps) {
  const [isOpen, setIsOpen] = useState(false);

  const handleDatesChange = useCallback(
    (dates: Date[]) => {
      onChange?.(dates);
    },
    [onChange],
  );

  const config = useMemo(
    () => ({
      selectedDates: value,
      onDatesChange: handleDatesChange,
      dates: {
        mode: 'multiple' as const,
        minDate,
        maxDate,
      },
    }),
    [value, handleDatesChange, minDate, maxDate],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      setIsOpen(open);
      onOpenChange?.(open);
    },
    [onOpenChange],
  );

  return (
    <Popover
      title="Select Dates"
      open={isOpen}
      onOpenChange={handleOpenChange}
      renderTrigger={
        <DatePickerTrigger
          value={value}
          mode="multiple"
          placeholder={placeholder}
          disabled={disabled}
          onPress={() => !disabled && setIsOpen(true)}
        />
      }
      renderContent={
        <YStack padding="$4" minWidth={320}>
          <DatePickerProvider config={config}>
            <Calendar mode="multiple" />
          </DatePickerProvider>
        </YStack>
      }
      floatingPanelProps={{
        ...floatingPanelProps,
      }}
      sheetProps={{
        ...sheetProps,
      }}
    />
  );
}

export const DatePicker = withStaticProperties(BasicDatePicker, {
  Range: RangePicker,
  Year: YearPicker,
  Month: MonthPicker,
  MultiSelect: MultiSelectPicker,
  // Export internal components for advanced usage
  Calendar,
  Trigger: DatePickerTrigger,
});

export type {
  IDatePickerProps,
  IRangePickerProps,
  IYearPickerProps,
  IMonthPickerProps,
  IMultiSelectPickerProps,
  IDateRange,
};
