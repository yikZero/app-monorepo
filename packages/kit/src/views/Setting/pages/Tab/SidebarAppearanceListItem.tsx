import { useCallback } from 'react';

import { Radio, SizableText, YStack } from '@onekeyhq/components';
import { useSidebarNavigationAppearance } from '@onekeyhq/kit/src/hooks/useSidebarNavigationAppearance';

export function SidebarAppearanceListItem() {
  const { enabled, title, value, options, onChange } =
    useSidebarNavigationAppearance();
  const handleChange = useCallback(
    async (next: string) => {
      if (next === 'icons-and-text' || next === 'icons-only') {
        await onChange(next);
      }
    },
    [onChange],
  );
  if (!enabled) return null;
  return (
    <YStack px="$5" py="$3" gap="$3" testID="settings-sidebar-appearance">
      <SizableText size="$bodyLgMedium">{title}</SizableText>
      <Radio
        value={value}
        options={options}
        onChange={handleChange}
        testID="settings-sidebar-appearance-radio"
      />
    </YStack>
  );
}
