import { memo } from 'react';

import { formatDate } from '@onekeyhq/shared/src/utils/dateUtils';

import { useMedia } from '../../hooks/useStyle';
import { Icon } from '../../primitives/Icon';
import { Stack } from '../../primitives';
import { Input } from '../../forms/Input';
import { Trigger } from '../../actions/Trigger';

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
    const startStr = range.start
      ? formatDate(range.start, { hideYear: false, hideTimeForever: true })
      : '';
    const endStr = range.end
      ? formatDate(range.end, { hideYear: false, hideTimeForever: true })
      : '';
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
      formatTemplate: 'yyyy/LL',
      hideTimeForever: true,
    });
  }

  // default date mode
  const date = value as Date;
  return formatDate(date, { hideYear: false, hideTimeForever: true });
};

export const DatePickerTrigger = memo(
  ({
    value,
    mode,
    placeholder,
    disabled,
    onPress,
  }: IDatePickerTriggerProps) => {
    const media = useMedia();
    const displayValue = formatTriggerValue(value, mode, placeholder);
    const hasValue =
      !!value && (Array.isArray(value) ? value.length > 0 : true);

    return (
      <Trigger onPress={onPress} disabled={disabled}>
        <Stack position="relative" flex={1}>
          <Input
            value={hasValue ? displayValue : ''}
            disabled={disabled}
            placeholder={placeholder || displayValue}
            readonly
            flex={1}
          />
          <Icon
            name="CalendarOutline"
            color="$iconSubdued"
            position="absolute"
            right="$3"
            top={media.gtMd ? '$2' : '$3'}
          />
        </Stack>
      </Trigger>
    );
  },
);

DatePickerTrigger.displayName = 'DatePickerTrigger';
