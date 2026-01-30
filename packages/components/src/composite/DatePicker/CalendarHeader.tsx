import { memo } from 'react';

import { SizableText, Stack, XStack } from '../../primitives';
import { IconButton } from '../../actions/IconButton';

import type { ICalendarHeaderProps } from './type';

export const CalendarHeader = memo(
  ({
    month,
    year,
    onPrevMonth,
    onNextMonth,
    onMonthClick,
    onYearClick,
    mode,
  }: ICalendarHeaderProps) => {
    const showMonthYear =
      mode === 'date' || mode === 'range' || mode === 'multiple';

    return (
      <XStack
        justifyContent="space-between"
        alignItems="center"
        paddingHorizontal="$2"
        marginBottom="$3"
      >
        {onPrevMonth ? (
          <IconButton
            icon="ChevronLeftSmallOutline"
            variant="tertiary"
            size="small"
            onPress={onPrevMonth}
          />
        ) : (
          <Stack width="$8" />
        )}
        <XStack gap="$1">
          {showMonthYear ? (
            <>
              <SizableText
                size="$bodyLgMedium"
                color="$text"
                onPress={onMonthClick}
                hoverStyle={{ color: '$textSubdued' }}
              >
                {month}
              </SizableText>
              <SizableText
                size="$bodyLgMedium"
                color="$text"
                onPress={onYearClick}
                hoverStyle={{ color: '$textSubdued' }}
              >
                {year}
              </SizableText>
            </>
          ) : (
            <SizableText size="$bodyLgMedium" color="$text">
              {mode === 'year' ? `${year}s` : year}
            </SizableText>
          )}
        </XStack>
        {onNextMonth ? (
          <IconButton
            icon="ChevronRightSmallOutline"
            variant="tertiary"
            size="small"
            onPress={onNextMonth}
          />
        ) : (
          <Stack width="$8" />
        )}
      </XStack>
    );
  },
);

CalendarHeader.displayName = 'CalendarHeader';
