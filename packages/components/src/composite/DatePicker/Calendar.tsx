import { useDatePickerContext } from '@rehookify/datepicker';
import { memo, useCallback, useMemo, useState } from 'react';

import { useMedia } from '../../hooks';
import { AnimatePresence, SizableText, Stack, YStack } from '../../primitives';

import { CalendarHeader } from './CalendarHeader';
import { DayCell } from './DayCell';
import { useDateAnimation } from './useDateAnimation';

import type { DatePickerMode } from './type';

type ViewMode = 'day' | 'month' | 'year';

function callOnClick<T extends { onClick?: (...args: any[]) => void }>(d: T) {
  d.onClick?.();
}

interface ICalendarProps {
  mode?: DatePickerMode;
  onYearSelect?: (year: number) => void;
  onMonthSelect?: (monthIndex: number) => void;
  minDate?: Date;
  maxDate?: Date;
}

function DayGrid({ calendarIndex }: { calendarIndex: number }) {
  const { data, propGetters } = useDatePickerContext();
  const { calendars, weekDays } = data;
  const { dayButton } = propGetters;
  const cal = calendars[calendarIndex];

  const { prevNextAnimation, prevNextAnimationKey } = useDateAnimation({
    listenTo: 'month',
  });

  if (!cal) return null;

  return (
    <AnimatePresence key={prevNextAnimationKey}>
      <YStack animation="quick" {...prevNextAnimation()}>
        <Stack flexDirection="row" flexWrap="wrap" marginBottom="$1">
          {weekDays.map((day) => (
            <Stack
              key={day}
              flexBasis="14.28%"
              height="$8"
              alignItems="center"
              justifyContent="center"
            >
              <SizableText
                size="$bodySm"
                color="$textSubdued"
                userSelect="none"
              >
                {day}
              </SizableText>
            </Stack>
          ))}
        </Stack>
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
    </AnimatePresence>
  );
}

function MonthGrid({
  onSelect,
  onMonthSelect,
}: {
  onSelect?: () => void;
  onMonthSelect?: (monthIndex: number) => void;
}) {
  const { data, propGetters } = useDatePickerContext();
  const { months } = data;
  const { monthButton } = propGetters;

  const { prevNextAnimation, prevNextAnimationKey } = useDateAnimation({
    listenTo: 'year',
  });

  return (
    <AnimatePresence key={prevNextAnimationKey}>
      <Stack
        flexWrap="wrap"
        flexDirection="row"
        gap="$2"
        padding="$2"
        animation="quick"
        {...prevNextAnimation()}
      >
        {months.map((m) => (
          <Stack
            key={m.$date.toString()}
            flexBasis="31%"
            flexGrow={1}
            height="$11"
            alignItems="center"
            justifyContent="center"
            borderRadius="$2"
            bg={m.active ? '$bgPrimary' : 'transparent'}
            hoverStyle={{
              bg: m.active ? '$bgPrimary' : '$bgHover',
            }}
            onPress={() => {
              callOnClick(monthButton(m));
              onMonthSelect?.(m.$date.getMonth());
              onSelect?.();
            }}
          >
            <SizableText
              size="$bodyMd"
              color={m.active ? '$textInverse' : '$text'}
              userSelect="none"
            >
              {m.month}
            </SizableText>
          </Stack>
        ))}
      </Stack>
    </AnimatePresence>
  );
}

function YearGrid({
  onSelect,
  onYearSelect,
}: {
  onSelect?: () => void;
  onYearSelect?: (year: number) => void;
}) {
  const { data, propGetters } = useDatePickerContext();
  const { years, calendars } = data;
  const { yearButton } = propGetters;
  const selectedYear = calendars[0].year;

  const { prevNextAnimation, prevNextAnimationKey } = useDateAnimation({
    listenTo: 'years',
  });

  return (
    <AnimatePresence key={prevNextAnimationKey}>
      <Stack
        flexWrap="wrap"
        flexDirection="row"
        gap="$2"
        padding="$2"
        animation="quick"
        {...prevNextAnimation()}
      >
        {years.map((y) => {
          const isActive = y.year === Number(selectedYear);
          return (
            <Stack
              key={y.$date.toString()}
              flexBasis="31%"
              flexGrow={1}
              height="$11"
              alignItems="center"
              justifyContent="center"
              borderRadius="$2"
              bg={isActive ? '$bgPrimary' : 'transparent'}
              hoverStyle={{
                bg: isActive ? '$bgPrimary' : '$bgHover',
              }}
              onPress={() => {
                callOnClick(yearButton(y));
                onYearSelect?.(y.year);
                onSelect?.();
              }}
            >
              <SizableText
                size="$bodyMd"
                color={isActive ? '$textInverse' : '$text'}
                userSelect="none"
              >
                {y.year}
              </SizableText>
            </Stack>
          );
        })}
      </Stack>
    </AnimatePresence>
  );
}

function YearRangeHeader() {
  const { data, propGetters } = useDatePickerContext();
  const { years } = data;
  const { previousYearsButton, nextYearsButton } = propGetters;

  const yearRange = useMemo(
    () => `${years[0].year} - ${years[years.length - 1].year}`,
    [years],
  );

  return (
    <CalendarHeader
      month=""
      year={yearRange}
      onPrevMonth={() => callOnClick(previousYearsButton())}
      onNextMonth={() => callOnClick(nextYearsButton())}
      mode="year"
    />
  );
}

function useNavDisabled(calendarIndex: number, minDate?: Date, maxDate?: Date) {
  const { data } = useDatePickerContext();
  const { calendars } = data;
  const cal = calendars[calendarIndex];

  return useMemo(() => {
    if (!cal) return { isPrevDisabled: false, isNextDisabled: false };

    const currentMonthDay = cal.days.find((d) => d.inCurrentMonth);
    const calYear = currentMonthDay
      ? currentMonthDay.$date.getFullYear()
      : Number(cal.year);
    const calMonth = currentMonthDay ? currentMonthDay.$date.getMonth() : 0;

    let isPrevDisabled = false;
    let isNextDisabled = false;

    if (minDate) {
      const minYear = minDate.getFullYear();
      const minMonth = minDate.getMonth();
      if (calYear < minYear || (calYear === minYear && calMonth <= minMonth)) {
        isPrevDisabled = true;
      }
    }

    if (maxDate) {
      const maxYear = maxDate.getFullYear();
      const maxMonth = maxDate.getMonth();
      if (calYear > maxYear || (calYear === maxYear && calMonth >= maxMonth)) {
        isNextDisabled = true;
      }
    }

    return { isPrevDisabled, isNextDisabled };
  }, [cal, minDate, maxDate]);
}

function CalendarPanel({
  calendarIndex,
  showNav,
  mode,
  onYearSelect,
  onMonthSelect,
  minDate,
  maxDate,
}: {
  calendarIndex: number;
  showNav: 'both' | 'prev' | 'next' | 'none';
  mode: DatePickerMode;
  onYearSelect?: (year: number) => void;
  onMonthSelect?: (monthIndex: number) => void;
  minDate?: Date;
  maxDate?: Date;
}) {
  const { data, propGetters } = useDatePickerContext();
  const { calendars } = data;
  const { addOffset, subtractOffset } = propGetters;
  const cal = calendars[calendarIndex];

  // In range dual-panel mode, disable drill-down to keep UX simple
  const isRangeDualPanel = mode === 'range';

  const [viewMode, setViewMode] = useState<ViewMode>('day');

  const { isPrevDisabled, isNextDisabled } = useNavDisabled(
    calendarIndex,
    minDate,
    maxDate,
  );

  const handlePrevMonth = useCallback(() => {
    if (viewMode === 'day') {
      callOnClick(subtractOffset({ months: 1 }));
    } else if (viewMode === 'month') {
      callOnClick(subtractOffset({ years: 1 }));
    }
  }, [viewMode, subtractOffset]);

  const handleNextMonth = useCallback(() => {
    if (viewMode === 'day') {
      callOnClick(addOffset({ months: 1 }));
    } else if (viewMode === 'month') {
      callOnClick(addOffset({ years: 1 }));
    }
  }, [viewMode, addOffset]);

  if (!cal) return null;

  return (
    <YStack flex={1}>
      {viewMode === 'year' ? (
        <YearRangeHeader />
      ) : (
        <CalendarHeader
          month={viewMode === 'day' ? cal.month : ''}
          year={cal.year}
          onPrevMonth={
            showNav === 'both' || showNav === 'prev'
              ? handlePrevMonth
              : undefined
          }
          onNextMonth={
            showNav === 'both' || showNav === 'next'
              ? handleNextMonth
              : undefined
          }
          isPrevDisabled={
            (showNav === 'both' || showNav === 'prev') && isPrevDisabled
          }
          isNextDisabled={
            (showNav === 'both' || showNav === 'next') && isNextDisabled
          }
          onMonthClick={
            viewMode === 'day' && !isRangeDualPanel
              ? () => setViewMode('month')
              : undefined
          }
          onYearClick={
            !isRangeDualPanel ? () => setViewMode('year') : undefined
          }
          mode={mode}
        />
      )}

      {viewMode === 'day' && <DayGrid calendarIndex={calendarIndex} />}
      {viewMode === 'month' && (
        <MonthGrid
          onSelect={() => setViewMode('day')}
          onMonthSelect={onMonthSelect}
        />
      )}
      {viewMode === 'year' && (
        <YearGrid
          onSelect={() => setViewMode('month')}
          onYearSelect={onYearSelect}
        />
      )}
    </YStack>
  );
}

export const Calendar = memo(
  ({
    mode = 'date',
    onYearSelect,
    onMonthSelect,
    minDate,
    maxDate,
  }: ICalendarProps) => {
    const { data, propGetters } = useDatePickerContext();
    const { calendars } = data;
    const { addOffset, subtractOffset } = propGetters;
    const media = useMedia();

    const { month, year } = calendars[0];

    if (mode === 'month') {
      return (
        <YStack>
          <CalendarHeader
            month={month}
            year={year}
            onPrevMonth={() => callOnClick(subtractOffset({ years: 1 }))}
            onNextMonth={() => callOnClick(addOffset({ years: 1 }))}
            mode={mode}
          />
          <MonthGrid onMonthSelect={onMonthSelect} />
        </YStack>
      );
    }

    if (mode === 'year') {
      return (
        <YStack>
          <YearRangeHeader />
          <YearGrid onYearSelect={onYearSelect} />
        </YStack>
      );
    }

    if (mode === 'range' && calendars.length > 1 && media.gtMd) {
      return (
        <Stack flexDirection="row" gap="$6">
          <CalendarPanel
            calendarIndex={0}
            showNav="prev"
            mode={mode}
            onYearSelect={onYearSelect}
            onMonthSelect={onMonthSelect}
            minDate={minDate}
            maxDate={maxDate}
          />
          <CalendarPanel
            calendarIndex={1}
            showNav="next"
            mode={mode}
            onYearSelect={onYearSelect}
            onMonthSelect={onMonthSelect}
            minDate={minDate}
            maxDate={maxDate}
          />
        </Stack>
      );
    }

    return (
      <CalendarPanel
        calendarIndex={0}
        showNav="both"
        mode={mode}
        onYearSelect={onYearSelect}
        onMonthSelect={onMonthSelect}
        minDate={minDate}
        maxDate={maxDate}
      />
    );
  },
);

Calendar.displayName = 'Calendar';
