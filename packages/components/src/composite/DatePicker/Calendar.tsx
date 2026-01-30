import { useDatePickerContext } from '@rehookify/datepicker';
import { memo } from 'react';

import { SizableText, Stack, YStack } from '../../primitives';

import { CalendarHeader } from './CalendarHeader';
import { DayCell } from './DayCell';

import type { DatePickerMode } from './type';

function callOnClick<T extends { onClick?: (...args: any[]) => void }>(d: T) {
  d.onClick?.();
}

interface ICalendarProps {
  mode?: DatePickerMode;
}

export const Calendar = memo(({ mode = 'date' }: ICalendarProps) => {
  const { data, propGetters } = useDatePickerContext();
  const { calendars, weekDays, months, years } = data;
  const { addOffset, subtractOffset, dayButton, monthButton, yearButton } =
    propGetters;

  const { month, year } = calendars[0];

  const handlePrevMonth = () => {
    callOnClick(subtractOffset({ months: 1 }));
  };

  const handleNextMonth = () => {
    callOnClick(addOffset({ months: 1 }));
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
          {months.map((m) => (
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
              onPress={() => callOnClick(monthButton(m))}
            >
              <SizableText
                size="$bodyMd"
                color={m.active ? '$textInverse' : '$text'}
              >
                {m.month}
              </SizableText>
            </Stack>
          ))}
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
          onPrevMonth={() => callOnClick(subtractOffset({ years: 12 }))}
          onNextMonth={() => callOnClick(addOffset({ years: 12 }))}
          mode={mode}
        />
        <Stack flexWrap="wrap" flexDirection="row" gap="$2" padding="$2">
          {years.map((y) => (
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
              onPress={() => callOnClick(yearButton(y))}
            >
              <SizableText
                size="$bodyMd"
                color={y.active ? '$textInverse' : '$text'}
              >
                {y.year}
              </SizableText>
            </Stack>
          ))}
        </Stack>
      </YStack>
    );
  }

  const renderCalendarPanel = (calendarIndex: number, showNav: 'both' | 'prev' | 'next' | 'none') => {
    const cal = calendars[calendarIndex];
    if (!cal) return null;

    return (
      <YStack flex={1}>
        <CalendarHeader
          month={cal.month}
          year={cal.year}
          onPrevMonth={showNav === 'both' || showNav === 'prev' ? handlePrevMonth : undefined}
          onNextMonth={showNav === 'both' || showNav === 'next' ? handleNextMonth : undefined}
          mode={mode}
        />
        {/* Week days header */}
        <Stack flexDirection="row" flexWrap="wrap" marginBottom="$2">
          {weekDays.map((day) => (
            <Stack key={day} flexBasis="14.28%" alignItems="center">
              <SizableText size="$bodySm" color="$textSubdued">
                {day}
              </SizableText>
            </Stack>
          ))}
        </Stack>
        {/* Days grid */}
        <Stack flexWrap="wrap" flexDirection="row" overflow="hidden">
          {cal.days.map((day) => {
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
                  disabled: dayButton(day).disabled || false,
                  range: day.range || undefined,
                }}
                onPress={() => callOnClick(dayButton(day))}
              />
            );
          })}
        </Stack>
      </YStack>
    );
  };

  // Render dual calendar for range mode
  if (mode === 'range' && calendars.length > 1) {
    return (
      <Stack flexDirection="row" gap="$4">
        {renderCalendarPanel(0, 'prev')}
        {renderCalendarPanel(1, 'next')}
      </Stack>
    );
  }

  // Render single calendar for date/multiple picker
  return renderCalendarPanel(0, 'both') as JSX.Element;
});

Calendar.displayName = 'Calendar';
