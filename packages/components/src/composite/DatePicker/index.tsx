import { DatePickerProvider } from '@rehookify/datepicker';
import { useCallback, useMemo, useState } from 'react';
import { useIntl } from 'react-intl';

import { ETranslations } from '@onekeyhq/shared/src/locale';
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

const WEEK_START_MONDAY = 1 as const;

const createPickerConfig = (
  selectedDates: Date[],
  handleDatesChange: (dates: Date[]) => void,
  minDate?: Date,
  maxDate?: Date,
  mode: 'single' | 'range' | 'multiple' = 'single',
  calendarMode?: 'static' | undefined,
) => ({
  selectedDates,
  onDatesChange: handleDatesChange,
  dates: {
    mode,
    minDate,
    maxDate,
    ...(mode !== 'range' && { selectSameDate: true }),
  },
  calendar: {
    startDay: WEEK_START_MONDAY,
    ...(calendarMode && { mode: calendarMode }),
    ...(mode === 'range' && { offsets: [1] }),
  },
});

function BasicDatePicker({
  value,
  onChange,
  onOpenChange,
  disabled,
  placeholder: placeholderProp,
  title: titleProp,
  renderTrigger,
  minDate,
  maxDate,
  floatingPanelProps,
  sheetProps,
}: IDatePickerProps) {
  const intl = useIntl();
  const placeholder =
    placeholderProp ??
    intl.formatMessage({ id: ETranslations.global_select_date });
  const title =
    titleProp ?? intl.formatMessage({ id: ETranslations.global_select_date });
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
    () =>
      createPickerConfig(selectedDates, handleDatesChange, minDate, maxDate),
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
      title={title}
      showHeader={false}
      open={isOpen}
      onOpenChange={handleOpenChange}
      renderTrigger={
        renderTrigger ? (
          renderTrigger({
            value,
            mode: 'date',
            placeholder,
            disabled,
            onClear: () => onChange?.(null),
          })
        ) : (
          <DatePickerTrigger
            value={value}
            mode="date"
            placeholder={placeholder}
            disabled={disabled}
            onClear={() => onChange?.(null)}
          />
        )
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
  placeholder: placeholderProp,
  title: titleProp,
  renderTrigger,
  minDate,
  maxDate,
  floatingPanelProps,
  sheetProps,
}: IRangePickerProps) {
  const intl = useIntl();
  const placeholder =
    placeholderProp ??
    intl.formatMessage({ id: ETranslations.global_select_date_range });
  const title =
    titleProp ??
    intl.formatMessage({ id: ETranslations.global_select_date_range });
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

  const config = useMemo(
    () =>
      createPickerConfig(
        selectedDates,
        handleDatesChange,
        minDate,
        maxDate,
        'range',
      ),
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
      title={title}
      showHeader={false}
      open={isOpen}
      onOpenChange={handleOpenChange}
      renderTrigger={
        renderTrigger ? (
          renderTrigger({
            value,
            mode: 'range',
            placeholder,
            disabled,
            onClear: () => onChange?.({ start: null, end: null }),
          })
        ) : (
          <DatePickerTrigger
            value={value}
            mode="range"
            placeholder={placeholder}
            disabled={disabled}
            onClear={() => onChange?.({ start: null, end: null })}
          />
        )
      }
      renderContent={
        <YStack padding="$3" minWidth={280} $gtMd={{ padding: '$4' }}>
          <DatePickerProvider config={config}>
            <Calendar mode="range" minDate={minDate} maxDate={maxDate} />
          </DatePickerProvider>
        </YStack>
      }
      floatingPanelProps={{
        w: 624,
        maxWidth: 624,
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
  placeholder: placeholderProp,
  title: titleProp,
  renderTrigger,
  minDate,
  maxDate,
  floatingPanelProps,
  sheetProps,
}: IYearPickerProps) {
  const intl = useIntl();
  const placeholder =
    placeholderProp ??
    intl.formatMessage({ id: ETranslations.global_select_year });
  const title =
    titleProp ?? intl.formatMessage({ id: ETranslations.global_select_year });
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
    () =>
      createPickerConfig(
        selectedDates,
        handleDatesChange,
        minDate,
        maxDate,
        'single',
        'static',
      ),
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
      title={title}
      showHeader={false}
      open={isOpen}
      onOpenChange={handleOpenChange}
      renderTrigger={
        renderTrigger ? (
          renderTrigger({
            value,
            mode: 'year',
            placeholder,
            disabled,
            onClear: () => onChange?.(null),
          })
        ) : (
          <DatePickerTrigger
            value={value}
            mode="year"
            placeholder={placeholder}
            disabled={disabled}
            onClear={() => onChange?.(null)}
          />
        )
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
  placeholder: placeholderProp,
  title: titleProp,
  renderTrigger,
  minDate,
  maxDate,
  floatingPanelProps,
  sheetProps,
}: IMonthPickerProps) {
  const intl = useIntl();
  const placeholder =
    placeholderProp ??
    intl.formatMessage({ id: ETranslations.global_select_month });
  const title =
    titleProp ?? intl.formatMessage({ id: ETranslations.global_select_month });
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
    () =>
      createPickerConfig(
        selectedDates,
        handleDatesChange,
        minDate,
        maxDate,
        'single',
        'static',
      ),
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
      title={title}
      showHeader={false}
      open={isOpen}
      onOpenChange={handleOpenChange}
      renderTrigger={
        renderTrigger ? (
          renderTrigger({
            value,
            mode: 'month',
            placeholder,
            disabled,
            onClear: () => onChange?.(null),
          })
        ) : (
          <DatePickerTrigger
            value={value}
            mode="month"
            placeholder={placeholder}
            disabled={disabled}
            onClear={() => onChange?.(null)}
          />
        )
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
  placeholder: placeholderProp,
  title: titleProp,
  renderTrigger,
  minDate,
  maxDate,
  floatingPanelProps,
  sheetProps,
}: IMultiSelectPickerProps) {
  const intl = useIntl();
  const placeholder =
    placeholderProp ??
    intl.formatMessage({ id: ETranslations.global_select_dates });
  const title =
    titleProp ?? intl.formatMessage({ id: ETranslations.global_select_dates });
  const [isOpen, setIsOpen] = useState(false);

  const handleDatesChange = useCallback(
    (dates: Date[]) => onChange?.(dates),
    [onChange],
  );

  const config = useMemo(
    () =>
      createPickerConfig(
        value,
        handleDatesChange,
        minDate,
        maxDate,
        'multiple',
      ),
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
      title={title}
      showHeader={false}
      open={isOpen}
      onOpenChange={handleOpenChange}
      renderTrigger={
        renderTrigger ? (
          renderTrigger({
            value,
            mode: 'multiple',
            placeholder,
            disabled,
            onClear: () => onChange?.([]),
          })
        ) : (
          <DatePickerTrigger
            value={value}
            mode="multiple"
            placeholder={placeholder}
            disabled={disabled}
            onClear={() => onChange?.([])}
          />
        )
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

export * from './type';
