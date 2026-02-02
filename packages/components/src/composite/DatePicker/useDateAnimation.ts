import { useDatePickerContext } from '@rehookify/datepicker';
import { useCallback, useEffect, useMemo, useState } from 'react';

const SLIDE_OFFSET = 15;
const INITIAL_ANIMATION = { enterStyle: { opacity: 0 } };

function slideAnimation(direction: number) {
  const x = direction < 0 ? -SLIDE_OFFSET : SLIDE_OFFSET;
  return {
    enterStyle: { opacity: 0, x },
    exitStyle: { opacity: 0, x },
  };
}

function getCalendarMonthYear(
  calendars: {
    days: { inCurrentMonth: boolean; $date: Date }[];
    year: string;
  }[],
) {
  const cal = calendars[0];
  const currentMonthDay = cal?.days.find((d) => d.inCurrentMonth);
  if (currentMonthDay) {
    return {
      monthIndex: currentMonthDay.$date.getMonth(),
      year: currentMonthDay.$date.getFullYear(),
    };
  }
  return { monthIndex: 0, year: Number(cal?.year ?? 0) };
}

export function useDateAnimation({
  listenTo,
}: {
  listenTo: 'year' | 'month' | 'years';
}) {
  const {
    data: { years, calendars },
  } = useDatePickerContext();

  const { monthIndex: calMonthIndex, year: calYear } = useMemo(
    () => getCalendarMonthYear(calendars),
    [calendars],
  );

  const [prevMonthIndex, setPrevMonthIndex] = useState<number | null>(null);
  const [prevYear, setPrevYear] = useState<number | null>(null);
  const [currentYearsSum, setCurrentYearsSum] = useState<number | null>(null);

  const sumYears = useCallback(
    () => years.reduce((acc, date) => acc + date.year, 0),
    [years],
  );

  useEffect(() => {
    if (listenTo === 'years' && currentYearsSum !== sumYears()) {
      setCurrentYearsSum(sumYears());
    }
  }, [years, currentYearsSum, listenTo, sumYears]);

  useEffect(() => {
    if (listenTo === 'month' && prevMonthIndex !== calMonthIndex) {
      setPrevMonthIndex(calMonthIndex);
    }
  }, [calMonthIndex, prevMonthIndex, listenTo]);

  useEffect(() => {
    if (listenTo === 'year' && prevYear !== calYear) {
      setPrevYear(calYear);
    }
  }, [calYear, prevYear, listenTo]);

  const prevNextAnimation = () => {
    if (listenTo === 'years') {
      if (currentYearsSum === null) return INITIAL_ANIMATION;
      return slideAnimation(sumYears() - currentYearsSum);
    }

    if (listenTo === 'month') {
      if (prevMonthIndex === null) return INITIAL_ANIMATION;

      // Handle December(11)->January(0) and January(0)->December(11) wrapping
      if (prevMonthIndex === 11 && calMonthIndex === 0) {
        return slideAnimation(1);
      }
      if (prevMonthIndex === 0 && calMonthIndex === 11) {
        return slideAnimation(-1);
      }

      return slideAnimation(calMonthIndex - prevMonthIndex);
    }

    if (listenTo === 'year') {
      if (prevYear === null) return INITIAL_ANIMATION;
      return slideAnimation(calYear - prevYear);
    }

    return INITIAL_ANIMATION;
  };

  return {
    prevNextAnimation,
    prevNextAnimationKey:
      listenTo === 'years' ? sumYears() : calendars[0][listenTo],
  };
}
