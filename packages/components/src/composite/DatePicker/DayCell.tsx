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

  const isInRange =
    day.inCurrentMonth &&
    (day.range === 'in-range' || day.range === 'will-be-in-range');
  const isRangeStart = day.inCurrentMonth && day.range === 'range-start';
  const isRangeEnd = day.inCurrentMonth && day.range === 'range-end';
  const hasRangeHighlight = isInRange || isRangeStart || isRangeEnd;

  const outerBorderRadius = isRangeStart
    ? {
        borderTopLeftRadius: '$2' as const,
        borderBottomLeftRadius: '$2' as const,
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      }
    : isRangeEnd
      ? {
          borderTopRightRadius: '$2' as const,
          borderBottomRightRadius: '$2' as const,
          borderTopLeftRadius: 0,
          borderBottomLeftRadius: 0,
        }
      : {};

  const isSelected = day.selected && day.inCurrentMonth;

  const innerBg = day.disabled
    ? '$bgDisabled'
    : isSelected
      ? '$bgPrimary'
      : 'transparent';

  const textColor = day.disabled || !day.inCurrentMonth
    ? '$textDisabled'
    : isSelected
      ? '$textInverse'
      : '$text';

  return (
    <Stack
      flexBasis="14.28%"
      alignItems="center"
      justifyContent="center"
      height={CELL_SIZE}
      bg={hasRangeHighlight ? '$bgStrong' : 'transparent'}
      {...outerBorderRadius}
    >
      <Stack
        width={CELL_SIZE}
        height={CELL_SIZE}
        alignItems="center"
        justifyContent="center"
        borderRadius="$2"
        {...(isRangeStart
          ? {
              borderTopRightRadius: 0,
              borderBottomRightRadius: 0,
            }
          : {})}
        {...(isRangeEnd
          ? {
              borderTopLeftRadius: 0,
              borderBottomLeftRadius: 0,
            }
          : {})}
        bg={innerBg}
        opacity={day.disabled ? 0.4 : 1}
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
      </Stack>
    </Stack>
  );
});

DayCell.displayName = 'DayCell';
