import { useDatePickerContext } from '@rehookify/datepicker';
import { memo } from 'react';

import { SizableText, Stack, XStack, YStack } from '../../primitives';

import { CalendarHeader } from './CalendarHeader';
import { DayCell } from './DayCell';

import type { DatePickerMode } from './type';

interface ICalendarProps {
  mode?: DatePickerMode;
}

export const Calendar = memo(({ mode = 'date' }: ICalendarProps) => {
  const { data, propGetters } = useDatePickerContext();
  const { calendars, weekDays, months, years } = data;
  const { addOffset, subtractOffset, dayButton, monthButton, yearButton } =
    propGetters;

  const { month, year, days } = calendars[0];

  const handlePrevMonth = () => {
    subtractOffset({ months: 1 });
  };

  const handleNextMonth = () => {
    addOffset({ months: 1 });
  };

  // Render month grid for month picker
  if (mode === 'month') {
    return (
      <YStack>
        <CalendarHeader
          month={month}
          year={year}
          onPrevMonth={handlePrevMonth}
          onNextMonth={handleNextMonth}
          mode={mode}
        />
        <Stack flexWrap="wrap" flexDirection="row" gap="$2" padding="$2">
          {months.map((m) => {
            const props = monthButton(m);
            return (
              <Stack
                key={m.$date.toString()}
                flexBasis="31%"
                flexGrow={1}
                height={48}
                alignItems="center"
                justifyContent="center"
                borderRadius="$2"
                bg={m.active ? '$bgPrimary' : 'transparent'}
                hoverStyle={{
                  bg: m.active ? '$bgPrimary' : '$bgHover',
                }}
                onPress={() => (props.onClick as () => void)?.()}
                cursor="pointer"
              >
                <SizableText
                  size="$bodyMd"
                  color={m.active ? '$textOnPrimary' : '$text'}
                >
                  {m.month}
                </SizableText>
              </Stack>
            );
          })}
        </Stack>
      </YStack>
    );
  }

  // Render year grid for year picker
  if (mode === 'year') {
    return (
      <YStack>
        <CalendarHeader
          month={month}
          year={year}
          onPrevMonth={() => subtractOffset({ years: 12 })}
          onNextMonth={() => addOffset({ years: 12 })}
          mode={mode}
        />
        <Stack flexWrap="wrap" flexDirection="row" gap="$2" padding="$2">
          {years.map((y) => {
            const props = yearButton(y);
            return (
              <Stack
                key={y.$date.toString()}
                flexBasis="31%"
                flexGrow={1}
                height={48}
                alignItems="center"
                justifyContent="center"
                borderRadius="$2"
                bg={y.active ? '$bgPrimary' : 'transparent'}
                hoverStyle={{
                  bg: y.active ? '$bgPrimary' : '$bgHover',
                }}
                onPress={() => (props.onClick as () => void)?.()}
                cursor="pointer"
              >
                <SizableText
                  size="$bodyMd"
                  color={y.active ? '$textOnPrimary' : '$text'}
                >
                  {y.year}
                </SizableText>
              </Stack>
            );
          })}
        </Stack>
      </YStack>
    );
  }

  // Render date grid for date/range/multiple picker
  return (
    <YStack>
      <CalendarHeader
        month={month}
        year={year}
        onPrevMonth={handlePrevMonth}
        onNextMonth={handleNextMonth}
        mode={mode}
      />
      {/* Week days header */}
      <XStack justifyContent="space-around" marginBottom="$2">
        {weekDays.map((day) => (
          <Stack key={day} width={40} alignItems="center">
            <SizableText size="$bodySm" color="$textSubdued">
              {day}
            </SizableText>
          </Stack>
        ))}
      </XStack>
      {/* Days grid */}
      <Stack flexWrap="wrap" flexDirection="row">
        {days.map((day) => {
          const { disabled } = dayButton(day);
          const dateStr = day.$date.toString();

          return (
            <DayCell
              key={dateStr}
              day={{
                day: day.day,
                date: dateStr,
                active: day.now,
                inCurrentMonth: day.inCurrentMonth,
                selected: day.selected,
                disabled: disabled || false,
                range: day.range || undefined,
              }}
              onPress={() => {
                (dayButton(day).onClick as () => void)?.();
              }}
            />
          );
        })}
      </Stack>
    </YStack>
  );
});

Calendar.displayName = 'Calendar';
