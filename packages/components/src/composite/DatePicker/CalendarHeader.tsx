import { memo } from 'react';

import { SizableText, XStack } from '../../primitives';
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
        <IconButton
          icon="ChevronLeftSmallOutline"
          variant="tertiary"
          size="small"
          onPress={onPrevMonth}
        />
        <XStack gap="$1">
          {showMonthYear ? (
            <>
              <SizableText
                size="$bodyLgMedium"
                color="$text"
                onPress={onMonthClick}
                cursor="pointer"
                hoverStyle={{ color: '$textHover' }}
              >
                {month}
              </SizableText>
              <SizableText
                size="$bodyLgMedium"
                color="$text"
                onPress={onYearClick}
                cursor="pointer"
                hoverStyle={{ color: '$textHover' }}
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
        <IconButton
          icon="ChevronRightSmallOutline"
          variant="tertiary"
          size="small"
          onPress={onNextMonth}
        />
      </XStack>
    );
  },
);

CalendarHeader.displayName = 'CalendarHeader';
