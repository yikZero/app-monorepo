import type { EShortcutEvents } from '@onekeyhq/shared/src/shortcuts/shortcuts.enum';

import type { IStackProps, IYStackProps } from '../../primitives/Stack';
import type { Placement } from '@floating-ui/dom';

export interface ITooltipRef {
  closeTooltip: () => Promise<void>;
  openTooltip: () => Promise<void>;
}

export interface ITooltipProps {
  renderTrigger: React.ReactNode;
  renderContent: React.ReactNode;
  placement?: Placement;
  offset?: number;
  /** Controlled open state; requests then go to `onOpenChange`. */
  open?: boolean;
  onOpenChange?: (open: boolean) => void;
  shortcutKey?: EShortcutEvents | string[];
  hovering?: boolean;
  closeOnScroll?: boolean;
  /**
   * Tooltips in the same group wait before the first one opens, then open
   * immediately while the user moves between members. Web/desktop only.
   */
  delayGroup?: string;
  contentProps?: IYStackProps;
  disabled?: boolean;
  onPress?: IStackProps['onPress'];
  triggerAsChild?: boolean | 'except-style';
  ref?: React.RefObject<ITooltipRef>;
}
