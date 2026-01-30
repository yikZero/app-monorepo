import type {
  PopoverContentProps as PopoverContentTypeProps,
  SheetProps,
} from '@onekeyhq/components/src/shared/tamagui';

export type DatePickerMode = 'date' | 'range' | 'month' | 'year' | 'multiple';

export interface IDateRange {
  start: Date | null;
  end: Date | null;
}

export interface IDatePickerBaseProps {
  disabled?: boolean;
  placeholder?: string;
  minDate?: Date;
  maxDate?: Date;
  testID?: string;
  floatingPanelProps?: PopoverContentTypeProps;
  sheetProps?: SheetProps;
}

export interface IDatePickerProps extends IDatePickerBaseProps {
  mode?: 'date';
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  onOpenChange?: (isOpen: boolean) => void;
}

export interface IRangePickerProps extends IDatePickerBaseProps {
  mode?: 'range';
  value?: IDateRange;
  onChange?: (range: IDateRange) => void;
  onOpenChange?: (isOpen: boolean) => void;
}

export interface IYearPickerProps extends IDatePickerBaseProps {
  mode?: 'year';
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  onOpenChange?: (isOpen: boolean) => void;
}

export interface IMonthPickerProps extends IDatePickerBaseProps {
  mode?: 'month';
  value?: Date | null;
  onChange?: (date: Date | null) => void;
  onOpenChange?: (isOpen: boolean) => void;
}

export interface IMultiSelectPickerProps extends IDatePickerBaseProps {
  mode?: 'multiple';
  value?: Date[];
  onChange?: (dates: Date[]) => void;
  onOpenChange?: (isOpen: boolean) => void;
}

export interface IDatePickerTriggerProps {
  value?: Date | Date[] | IDateRange | null;
  mode: DatePickerMode;
  placeholder?: string;
  disabled?: boolean;
  onPress?: () => void;
}

export interface IDayCellProps {
  day: {
    day: string;
    date: string;
    active: boolean;
    inCurrentMonth: boolean;
    selected: boolean;
    disabled: boolean;
    range?:
      | 'range-start'
      | 'range-end'
      | 'range-start range-end'
      | 'in-range'
      | 'will-be-in-range'
      | 'will-be-range-start'
      | 'will-be-range-end';
  };
  onPress: (date: string) => void;
}

export interface ICalendarHeaderProps {
  month: string;
  year: string;
  onPrevMonth?: () => void;
  onNextMonth?: () => void;
  onMonthClick?: () => void;
  onYearClick?: () => void;
  mode?: DatePickerMode;
}
