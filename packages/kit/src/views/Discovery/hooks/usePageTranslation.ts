import { useCallback } from 'react';

import { Toast } from '@onekeyhq/components';

export function usePageTranslation(_tabId: string) {
  const handleTranslate = useCallback(() => {
    Toast.message({ title: 'Not yet implemented' });
  }, []);

  return {
    isTranslated: false,
    handleTranslate,
  };
}
