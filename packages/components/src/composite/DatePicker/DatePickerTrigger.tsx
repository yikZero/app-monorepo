import { memo } from 'react';

import { formatDate } from '@onekeyhq/shared/src/utils/dateUtils';

import { Icon } from '../../primitives/Icon';
import { SizableText, XStack } from '../../primitives';
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
    const displayValue = formatTriggerValue(value, mode, placeholder);

    return (
      <Trigger onPress={onPress} disabled={disabled}>
        <XStack
          alignItems="center"
          justifyContent="space-between"
          paddingHorizontal="$3"
          paddingVertical="$2.5"
          borderRadius="$2"
          borderWidth={1}
          borderColor="$borderColor"
          bg="$bg"
          minWidth={200}
          hoverStyle={
            disabled
              ? {}
              : {
                  borderColor: '$borderColorHover',
                }
          }
          opacity={disabled ? 0.4 : 1}
          cursor={disabled ? 'not-allowed' : 'pointer'}
        >
          <SizableText
            size="$bodyMd"
            color={value ? '$text' : '$textPlaceholder'}
          >
            {displayValue}
          </SizableText>
          <Icon name="Calendar3Outline" size="$5" color="$iconSubdued" />
        </XStack>
      </Trigger>
    );
  },
);

DatePickerTrigger.displayName = 'DatePickerTrigger';
