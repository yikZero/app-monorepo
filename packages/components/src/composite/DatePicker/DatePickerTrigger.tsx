import { memo, useCallback } from 'react';

import { formatDate } from '@onekeyhq/shared/src/utils/dateUtils';

import { Input } from '../../forms/Input';
import { Stack } from '../../primitives';

import type { IDatePickerTriggerProps, IDateRange } from './type';

const formatTriggerValue = (
  value: Date | Date[] | IDateRange | null | undefined,
  mode: string,
  placeholder?: string,
): string => {
  if (!value) return placeholder || 'Select date';

  if (mode === 'range') {
    const range = value as IDateRange;
    if (!range.start && !range.end) return placeholder || 'Select date range';
    const fmt = { formatTemplate: 'yyyy-MM-dd', hideTimeForever: true };
    const startStr = range.start ? formatDate(range.start, fmt) : '';
    const endStr = range.end ? formatDate(range.end, fmt) : '';
    if (startStr && endStr) {
      return `${startStr} → ${endStr}`;
    }
    return startStr || endStr || placeholder || 'Select date range';
  }

  if (mode === 'multiple') {
    const dates = value as Date[];
    if (!dates.length) return placeholder || 'Select dates';
    return `${dates.length} dates selected`;
  }

  if (mode === 'year') {
    const date = value as Date;
    return date.getFullYear().toString();
  }

  if (mode === 'month') {
    const date = value as Date;
    return formatDate(date, {
      formatTemplate: 'yyyy-MM',
      hideTimeForever: true,
    });
  }

  const date = value as Date;
  return formatDate(date, {
    formatTemplate: 'yyyy-MM-dd',
    hideTimeForever: true,
  });
};

export const DatePickerTrigger = memo(
  ({
    value,
    mode,
    placeholder,
    disabled,
    onClear,
  }: IDatePickerTriggerProps) => {
    const displayValue = formatTriggerValue(value, mode, placeholder);
    const hasValue =
      value &&
      (Array.isArray(value)
        ? value.length > 0
        : mode === 'range'
        ? !!(value as IDateRange).start || (value as IDateRange).end
        : true);

    const handleClearPress = useCallback(
      (e: any) => {
        e?.stopPropagation();
        onClear?.();
      },
      [onClear],
    );

    return (
      <Stack position="relative" flex={1}>
        <Input
          value={hasValue ? displayValue : ''}
          disabled={disabled}
          placeholder={placeholder || displayValue}
          readonly
          size="medium"
          addOns={[
            hasValue && onClear
              ? {
                  iconName: 'XCircleOutline' as const,
                  onPress: handleClearPress,
                }
              : {
                  iconName: 'CalendarOutline' as const,
                },
          ]}
        />
      </Stack>
    );
  },
);

DatePickerTrigger.displayName = 'DatePickerTrigger';
