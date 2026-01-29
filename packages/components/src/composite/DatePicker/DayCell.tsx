import { memo } from 'react';

import { SizableText, Stack } from '../../primitives';
import { Trigger } from '../../actions/Trigger';

import type { IDayCellProps } from './type';

export const DayCell = memo(({ day, onPress }: IDayCellProps) => {
  const handlePress = () => {
    if (!day.disabled) {
      onPress(day.date);
    }
  };

  const getBgColor = () => {
    if (day.disabled) return 'transparent';
    if (day.selected) return '$bgPrimary';
    if (day.range === 'in-range' || day.range === 'will-be-in-range') {
      return '$bgStrong';
    }
    return 'transparent';
  };

  const getTextColor = () => {
    if (day.disabled) return '$textDisabled';
    if (day.selected) return '$textOnPrimary';
    if (!day.inCurrentMonth) return '$textSubdued';
    return '$text';
  };

  const getRangeBorder = () => {
    if (day.range === 'range-start') {
      return {
        borderTopRightRadius: 0,
        borderBottomRightRadius: 0,
      };
    }
    if (day.range === 'range-end') {
      return {
        borderTopLeftRadius: 0,
        borderBottomLeftRadius: 0,
      };
    }
    if (day.range === 'in-range' || day.range === 'will-be-in-range') {
      return {
        borderRadius: 0,
      };
    }
    return {};
  };

  return (
    <Trigger onPress={handlePress} disabled={day.disabled}>
      <Stack
        width={40}
        height={40}
        alignItems="center"
        justifyContent="center"
        borderRadius="$2"
        bg={getBgColor()}
        opacity={day.disabled ? 0.4 : 1}
        hoverStyle={
          day.disabled
            ? {}
            : {
                bg: day.selected ? getBgColor() : '$bgHover',
              }
        }
        {...getRangeBorder()}
      >
        <SizableText
          size="$bodyMd"
          color={getTextColor()}
          fontWeight={day.active ? '600' : '400'}
        >
          {day.day}
        </SizableText>
      </Stack>
    </Trigger>
  );
});

DayCell.displayName = 'DayCell';
