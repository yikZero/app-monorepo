import { useDatePickerContext } from '@rehookify/datepicker';
import { useCallback, useEffect, useState } from 'react';

const SLIDE_OFFSET = 15;
const INITIAL_ANIMATION = { enterStyle: { opacity: 0 } };

function slideAnimation(direction: number) {
  const x = direction < 0 ? -SLIDE_OFFSET : SLIDE_OFFSET;
  return {
    enterStyle: { opacity: 0, x },
    exitStyle: { opacity: 0, x },
  };
}

export function useDateAnimation({
  listenTo,
}: {
  listenTo: 'year' | 'month' | 'years';
}) {
  const {
    data: { years, calendars },
  } = useDatePickerContext();
  const [currentMonth, setCurrentMonth] = useState<string | null>(null);
  const [currentYear, setCurrentYear] = useState<string | null>(null);
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
    if (listenTo === 'month' && currentMonth !== calendars[0].month) {
      setCurrentMonth(calendars[0].month);
    }
  }, [calendars, currentMonth, listenTo]);

  useEffect(() => {
    if (listenTo === 'year' && currentYear !== calendars[0].year) {
      setCurrentYear(calendars[0].year);
    }
  }, [calendars, currentYear, listenTo]);

  const prevNextAnimation = () => {
    if (listenTo === 'years') {
      if (currentYearsSum === null) return INITIAL_ANIMATION;
      return slideAnimation(sumYears() - currentYearsSum);
    }

    if (listenTo === 'month') {
      if (currentMonth === null) return INITIAL_ANIMATION;

      // Handle December->January and January->December wrapping
      if (currentMonth === 'December' && calendars[0].month === 'January') {
        return slideAnimation(1);
      }
      if (currentMonth === 'January' && calendars[0].month === 'December') {
        return slideAnimation(-1);
      }

      const newDate = new Date(
        `${calendars[0].month} 1, ${calendars[0].year}`,
      );
      const currentDate = new Date(`${currentMonth} 1, ${calendars[0].year}`);
      return slideAnimation(newDate < currentDate ? -1 : 1);
    }

    if (listenTo === 'year') {
      if (currentYear === null) return INITIAL_ANIMATION;
      const newDate = new Date(
        `${calendars[0].month} 1, ${calendars[0].year}`,
      );
      const currentDate = new Date(`${calendars[0].month} 1, ${currentYear}`);
      return slideAnimation(newDate < currentDate ? -1 : 1);
    }

    return INITIAL_ANIMATION;
  };

  return {
    prevNextAnimation,
    prevNextAnimationKey:
      listenTo === 'years' ? sumYears() : calendars[0][listenTo],
  };
}
