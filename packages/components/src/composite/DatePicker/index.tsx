import { DatePickerProvider } from '@rehookify/datepicker';
import { useCallback, useEffect, useMemo, useRef, useState } from 'react';

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

  const selectedDates = useMemo(() => (value ? [value] : []), [value]);

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
      if (disabled && open) return;
      setIsOpen(open);
      onOpenChange?.(open);
    },
    [disabled, onOpenChange],
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
          onClear={() => onChange?.(null)}
        />
      }
      renderContent={
        <YStack padding="$3" minWidth={280}>
          <DatePickerProvider config={config}>
            <Calendar mode="date" />
          </DatePickerProvider>
        </YStack>
      }
      floatingPanelProps={{
        w: 300,
        minWidth: 300,
        ...floatingPanelProps,
      }}
      sheetProps={sheetProps}
    />
  );
}

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

  const selectedDates = useMemo(
    () =>
      [value?.start, value?.end].filter((d): d is Date => d instanceof Date),
    [value],
  );

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

  const calcOffsetDate = useCallback((v?: IDateRange | null) => {
    if (!v?.end) return undefined;
    const endMonth = v.end.getMonth();
    const startMonth = v.start?.getMonth();
    const endYear = v.end.getFullYear();
    const startYear = v.start?.getFullYear();
    // Same month — left panel shows that month
    if (startMonth === endMonth && startYear === endYear) {
      return new Date(endYear, endMonth, 1);
    }
    // Different months — left panel shows end month - 1, right panel shows end month
    const d = new Date(v.end);
    d.setMonth(d.getMonth() - 1);
    return d;
  }, []);

  const [offsetDate, setOffsetDate] = useState<Date | undefined>(() =>
    calcOffsetDate(value),
  );
  const shouldClearOffset = useRef(false);

  useEffect(() => {
    if (shouldClearOffset.current) {
      shouldClearOffset.current = false;
      setOffsetDate(undefined);
    }
  }, [offsetDate]);

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
      ...(offsetDate && { offsetDate }),
    }),
    [selectedDates, handleDatesChange, minDate, maxDate, offsetDate],
  );

  const handleOpenChange = useCallback(
    (open: boolean) => {
      if (disabled && open) return;
      if (open) {
        setOffsetDate(calcOffsetDate(value));
        shouldClearOffset.current = true;
      }
      setIsOpen(open);
      onOpenChange?.(open);
    },
    [disabled, onOpenChange, value, calcOffsetDate],
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
          onClear={() => onChange?.({ start: null, end: null })}
        />
      }
      renderContent={
        <YStack padding="$3">
          <DatePickerProvider config={config}>
            <Calendar mode="range" />
          </DatePickerProvider>
        </YStack>
      }
      floatingPanelProps={{
        w: 560,
        maxWidth: 560,
        ...floatingPanelProps,
      }}
      sheetProps={sheetProps}
    />
  );
}

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

  const selectedDates = useMemo(() => (value ? [value] : []), [value]);

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
      if (disabled && open) return;
      setIsOpen(open);
      onOpenChange?.(open);
    },
    [disabled, onOpenChange],
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
          onClear={() => onChange?.(null)}
        />
      }
      renderContent={
        <YStack padding="$3" minWidth={280}>
          <DatePickerProvider config={config}>
            <Calendar
              mode="year"
              onYearSelect={(year) => {
                const date = new Date(year, 0, 1);
                onChange?.(date);
                setIsOpen(false);
              }}
            />
          </DatePickerProvider>
        </YStack>
      }
      floatingPanelProps={{
        w: 300,
        minWidth: 300,
        ...floatingPanelProps,
      }}
      sheetProps={sheetProps}
    />
  );
}

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

  const selectedDates = useMemo(() => (value ? [value] : []), [value]);

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
      if (disabled && open) return;
      setIsOpen(open);
      onOpenChange?.(open);
    },
    [disabled, onOpenChange],
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
          onClear={() => onChange?.(null)}
        />
      }
      renderContent={
        <YStack padding="$3" minWidth={280}>
          <DatePickerProvider config={config}>
            <Calendar
              mode="month"
              onMonthSelect={(monthIndex) => {
                const currentYear = value
                  ? value.getFullYear()
                  : new Date().getFullYear();
                const date = new Date(currentYear, monthIndex, 1);
                onChange?.(date);
                setIsOpen(false);
              }}
            />
          </DatePickerProvider>
        </YStack>
      }
      floatingPanelProps={{
        w: 300,
        minWidth: 300,
        ...floatingPanelProps,
      }}
      sheetProps={sheetProps}
    />
  );
}

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
    (dates: Date[]) => onChange?.(dates),
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
      if (disabled && open) return;
      setIsOpen(open);
      onOpenChange?.(open);
    },
    [disabled, onOpenChange],
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
          onClear={() => onChange?.([])}
        />
      }
      renderContent={
        <YStack padding="$3" minWidth={280}>
          <DatePickerProvider config={config}>
            <Calendar mode="multiple" />
          </DatePickerProvider>
        </YStack>
      }
      floatingPanelProps={{
        w: 300,
        minWidth: 300,
        ...floatingPanelProps,
      }}
      sheetProps={sheetProps}
    />
  );
}

export const DatePicker = withStaticProperties(BasicDatePicker, {
  Range: RangePicker,
  Year: YearPicker,
  Month: MonthPicker,
  MultiSelect: MultiSelectPicker,
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
