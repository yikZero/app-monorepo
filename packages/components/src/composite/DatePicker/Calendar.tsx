import { useDatePickerContext } from '@rehookify/datepicker';
import { memo, useCallback, useMemo, useState } from 'react';

import { useMedia } from '../../hooks';
import { SizableText, Stack, YStack } from '../../primitives';

import { CalendarHeader } from './CalendarHeader';
import { DayCell } from './DayCell';

import type { DatePickerMode } from './type';

type ViewMode = 'day' | 'month' | 'year';

const callOnClick = <T extends { onClick?: (...args: any[]) => void }>(
  d: T,
) => {
  d.onClick?.();
};

interface ICalendarProps {
  mode?: DatePickerMode;
  onYearSelect?: (year: number) => void;
  onMonthSelect?: (monthIndex: number) => void;
  minDate?: Date;
  maxDate?: Date;
}

function DayGrid({
  calendarIndex,
  hideOutOfMonth,
  fullWidth,
}: {
  calendarIndex: number;
  hideOutOfMonth?: boolean;
  fullWidth?: boolean;
}) {
  const { data, propGetters } = useDatePickerContext();
  const { calendars, weekDays } = data;
  const { dayButton } = propGetters;
  const cal = calendars[calendarIndex];

  if (!cal) return null;

  return (
    <YStack>
      <Stack flexDirection="row" flexWrap="wrap" marginBottom="$1">
        {weekDays.map((day) => (
          <Stack
            key={day}
            flexBasis="14.28%"
            flexGrow={0}
            flexShrink={0}
            height="$8"
            alignItems="center"
            justifyContent="center"
          >
            <SizableText size="$bodySm" color="$textSubdued" userSelect="none">
              {day}
            </SizableText>
          </Stack>
        ))}
      </Stack>
      <Stack flexWrap="wrap" flexDirection="row" rowGap="$1">
        {cal.days.map((day) => {
          const dateStr = day.$date.toString();
          return (
            <DayCell
              key={dateStr}
              hideOutOfMonth={hideOutOfMonth}
              fullWidth={fullWidth}
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

  return (
    <Stack flexWrap="wrap" flexDirection="row" gap="$2" padding="$2">
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

  return (
    <Stack flexWrap="wrap" flexDirection="row" gap="$2" padding="$2">
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

    const isPrevDisabled = minDate
      ? calYear < minDate.getFullYear() ||
        (calYear === minDate.getFullYear() && calMonth <= minDate.getMonth())
      : false;

    const isNextDisabled = maxDate
      ? calYear > maxDate.getFullYear() ||
        (calYear === maxDate.getFullYear() && calMonth >= maxDate.getMonth())
      : false;

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
  isDualPanel,
}: {
  calendarIndex: number;
  showNav: 'both' | 'prev' | 'next' | 'none';
  mode: DatePickerMode;
  onYearSelect?: (year: number) => void;
  onMonthSelect?: (monthIndex: number) => void;
  minDate?: Date;
  maxDate?: Date;
  isDualPanel?: boolean;
}) {
  const { data, propGetters } = useDatePickerContext();
  const { calendars } = data;
  const { addOffset, subtractOffset } = propGetters;
  const cal = calendars[calendarIndex];

  const isRangeDualPanel = mode === 'range' && isDualPanel;

  const [viewMode, setViewMode] = useState<ViewMode>('day');

  const { isPrevDisabled, isNextDisabled } = useNavDisabled(
    calendarIndex,
    minDate,
    maxDate,
  );

  const handlePrevMonth = useCallback(() => {
    const offset = viewMode === 'day' ? { months: 1 } : { years: 1 };
    callOnClick(subtractOffset(offset));
  }, [viewMode, subtractOffset]);

  const handleNextMonth = useCallback(() => {
    const offset = viewMode === 'day' ? { months: 1 } : { years: 1 };
    callOnClick(addOffset(offset));
  }, [viewMode, addOffset]);

  if (!cal) return null;

  return (
    <YStack {...(isDualPanel ? { flex: 1, flexBasis: 0 } : {})}>
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

      {viewMode === 'day' && (
        <DayGrid
          calendarIndex={calendarIndex}
          hideOutOfMonth={false}
          fullWidth={mode === 'range'}
        />
      )}
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

    const isDualPanelRange =
      mode === 'range' && calendars.length > 1 && media.gtMd;
    const panelProps = { mode, onYearSelect, onMonthSelect, minDate, maxDate };

    if (isDualPanelRange) {
      return (
        <Stack flexDirection="row" gap="$6">
          <CalendarPanel
            calendarIndex={0}
            showNav="prev"
            isDualPanel
            {...panelProps}
          />
          <Stack width={1} bg="$neutral3" alignSelf="stretch" />
          <CalendarPanel
            calendarIndex={1}
            showNav="next"
            isDualPanel
            {...panelProps}
          />
        </Stack>
      );
    }

    return <CalendarPanel calendarIndex={0} showNav="both" {...panelProps} />;
  },
);

Calendar.displayName = 'Calendar';
