import { memo } from 'react';

import { SizableText, Stack } from '../../primitives';

import type { IDayCellProps } from './type';

const CELL_SIZE = '$10'; // 40px

export const DayCell = memo(({ day, onPress }: IDayCellProps) => {
  const handlePress = () => {
    if (!day.disabled) {
      onPress(day.date);
    }
  };

  const isInRange =
    day.range === 'in-range' || day.range === 'will-be-in-range';
  const isRangeStart = day.range === 'range-start';
  const isRangeEnd = day.range === 'range-end';
  // Outer container background — fills entire cell width for continuous range
  const getOuterBg = () => {
    if (isInRange) return '$bgStrong';
    if (isRangeStart) return '$bgStrong';
    if (isRangeEnd) return '$bgStrong';
    return 'transparent';
  };

  const getOuterBorderRadius = () => {
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
  };

  // Inner circle background — only for selected dates
  const getInnerBg = () => {
    if (day.disabled) return 'transparent';
    if (day.selected) return '$bgPrimary';
    return 'transparent';
  };

  const getTextColor = () => {
    if (day.disabled) return '$textDisabled';
    if (day.selected) return '$textInverse';
    if (!day.inCurrentMonth) return '$textSubdued';
    return '$text';
  };

  return (
    <Stack
      flexBasis="14.28%"
      alignItems="center"
      justifyContent="center"
      height={CELL_SIZE}
      bg={getOuterBg()}
      {...getOuterBorderRadius()}
    >
      <Stack
        width={CELL_SIZE}
        height={CELL_SIZE}
        alignItems="center"
        justifyContent="center"
        borderRadius="$2"
        bg={getInnerBg()}
        opacity={day.disabled ? 0.4 : 1}
        hoverStyle={
          day.disabled
            ? {}
            : {
                bg: day.selected ? getInnerBg() : '$bgHover',
              }
        }
        onPress={handlePress}
      >
        <SizableText
          size="$bodyMd"
          color={getTextColor()}
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
