import { toast } from 'sonner';

import type { IToastMessageOptions } from './type';

export function showMessage({
  renderContent,
  dedupeKey,
  ...options
}: IToastMessageOptions) {
  const toastId = toast(renderContent(), {
    ...options,
    ...(dedupeKey ? { id: dedupeKey } : {}),
  });
  return {
    close: () => {
      toast.dismiss(toastId);
    },
  };
}
