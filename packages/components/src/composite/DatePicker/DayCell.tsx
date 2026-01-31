import { memo } from 'react';

import { SizableText, Stack } from '../../primitives';

import type { IDayCellProps } from './type';

const CELL_SIZE = '$8'; // 32px

export const DayCell = memo(({ day, onPress }: IDayCellProps) => {
  const handlePress = () => {
    if (!day.disabled) {
      onPress(day.date);
    }
  };

  const isSameDayRange =
    day.inCurrentMonth && day.range === 'range-start range-end';
  const isInRange =
    day.inCurrentMonth &&
    !isSameDayRange &&
    (day.range === 'in-range' || day.range === 'will-be-in-range');
  const isRangeStart =
    day.inCurrentMonth && !isSameDayRange && day.range === 'range-start';
  const isRangeEnd =
    day.inCurrentMonth && !isSameDayRange && day.range === 'range-end';
  const hasRangeHighlight = isInRange || isRangeStart || isRangeEnd;

  const outerBorderRadius = (() => {
    if (isRangeStart) {
      return {
        borderTopLeftRadius: '$2' as const,
        borderBottomLeftRadius: '$2' as const,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      };
    }
    if (isRangeEnd) {
      return {
        borderTopRightRadius: '$2' as const,
        borderBottomRightRadius: '$2' as const,
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
      };
    }
    return {};
  })();

  const isSelected = (day.selected && day.inCurrentMonth) || isSameDayRange;

  const innerBg = !day.disabled && isSelected ? '$bgPrimary' : 'transparent';

  const textColor =
    day.disabled || !day.inCurrentMonth
      ? '$textDisabled'
      : isSelected
        ? '$textInverse'
        : '$text';

  const outerBg =
    hasRangeHighlight || day.disabled ? '$bgStrong' : 'transparent';

  return (
    <Stack
      flexBasis="14.28%"
      alignItems="center"
      justifyContent="center"
      height={CELL_SIZE}
      bg={outerBg}
      {...(day.disabled ? {} : outerBorderRadius)}
    >
      <Stack
        width={CELL_SIZE}
        height={CELL_SIZE}
        alignItems="center"
        justifyContent="center"
        borderRadius="$2"
        {...(isRangeStart && {
          borderTopRightRadius: 0,
          borderBottomRightRadius: 0,
        })}
        {...(isRangeEnd && {
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        })}
        bg={innerBg}
        hoverStyle={
          day.disabled
            ? {}
            : {
                bg: isSelected ? innerBg : '$bgHover',
              }
        }
        onPress={handlePress}
      >
        <SizableText
          size="$bodyMd"
          color={textColor}
          fontWeight={day.active ? '600' : '400'}
          userSelect="none"
        >
          {day.day}
        </SizableText>
        {/* Today dot indicator */}
        {day.active && !isSelected ? (
          <Stack
            position="absolute"
            bottom="$0.5"
            width="$1"
            height="$1"
            borderRadius="$full"
            bg="$bgPrimary"
          />
        ) : null}
      </Stack>
    </Stack>
  );
});

DayCell.displayName = 'DayCell';
