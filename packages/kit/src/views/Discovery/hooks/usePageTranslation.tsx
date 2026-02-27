import { useCallback, useMemo, useState } from 'react';

import { useIntl } from 'react-intl';

import {
  Button,
  IconButton,
  SegmentControl,
  Select,
  SizableText,
  Toast,
  XStack,
  YStack,
} from '@onekeyhq/components';
import { useTranslateSettingsPersistAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import { ETranslations, LOCALES_OPTION } from '@onekeyhq/shared/src/locale';
import platformEnv from '@onekeyhq/shared/src/platformEnv';

import { ETranslateDisplayMode, ETranslateEngine } from '../types';

function TranslateSettings() {
  const intl = useIntl();
  const [settings, setSettings] = useTranslateSettingsPersistAtom();

  const isCustomLanguage = settings.targetLanguage !== 'auto';

  const customLanguageOptions = useMemo(
    () =>
      LOCALES_OPTION.filter(
        (o) => o.value !== 'system' && o.value !== 'en-US',
      ).map((o) => ({ label: o.label, value: o.value })),
    [],
  );

  const engineOptions = useMemo(
    () => [
      {
        label: intl.formatMessage({
          id: ETranslations.browser_translate_engine_ai,
        }),
        value: ETranslateEngine.ai,
      },
      {
        label: intl.formatMessage({
          id: ETranslations.browser_translate_engine_traditional,
        }),
        value: ETranslateEngine.standard,
      },
    ],
    [intl],
  );

  const targetLanguageOptions = useMemo(
    () => [
      {
        label: intl.formatMessage({
          id: ETranslations.browser_translate_lang_auto,
        }),
        value: 'auto' as string,
      },
      {
        label: intl.formatMessage({
          id: ETranslations.browser_translate_lang_custom,
        }),
        value: 'custom' as string,
      },
    ],
    [intl],
  );

  const displayModeOptions = useMemo(
    () => [
      {
        label: intl.formatMessage({
          id: ETranslations.browser_translate_mode_bilingual,
        }),
        value: ETranslateDisplayMode.bilingual,
      },
      {
        label: intl.formatMessage({
          id: ETranslations.browser_translate_mode_replace,
        }),
        value: ETranslateDisplayMode.replace,
      },
    ],
    [intl],
  );

  return (
    <YStack gap="$5">
      <YStack gap="$2">
        <SizableText size="$headingSm" color="$textSubdued">
          {intl.formatMessage({
            id: ETranslations.browser_translate_engine,
          })}
        </SizableText>
        <SegmentControl
          fullWidth
          value={settings.engine}
          options={engineOptions}
          onChange={(value) =>
            setSettings((prev) => ({
              ...prev,
              engine: value as ETranslateEngine,
            }))
          }
        />
      </YStack>
      <YStack gap="$2">
        <SizableText size="$headingSm" color="$textSubdued">
          {intl.formatMessage({
            id: ETranslations.browser_translate_target_language,
          })}
        </SizableText>
        <SegmentControl
          fullWidth
          value={isCustomLanguage ? 'custom' : 'auto'}
          options={targetLanguageOptions}
          onChange={(value) => {
            if (value === 'auto') {
              setSettings((prev) => ({
                ...prev,
                targetLanguage: 'auto',
              }));
            } else {
              setSettings((prev) => ({
                ...prev,
                targetLanguage: intl.locale,
              }));
            }
          }}
        />
        {isCustomLanguage ? (
          <Select
            title={intl.formatMessage({
              id: ETranslations.browser_translate_target_language,
            })}
            items={customLanguageOptions}
            value={settings.targetLanguage}
            onChange={(value) => {
              setSettings((prev) => ({
                ...prev,
                targetLanguage: value as string,
              }));
            }}
          />
        ) : null}
      </YStack>
      <YStack gap="$2">
        <SizableText size="$headingSm" color="$textSubdued">
          {intl.formatMessage({
            id: ETranslations.browser_translate_display_mode,
          })}
        </SizableText>
        <SegmentControl
          fullWidth
          value={settings.displayMode}
          options={displayModeOptions}
          onChange={(value) =>
            setSettings((prev) => ({
              ...prev,
              displayMode: value as ETranslateDisplayMode,
            }))
          }
        />
      </YStack>
    </YStack>
  );
}

function useTargetLanguageLabel() {
  const intl = useIntl();
  const [settings] = useTranslateSettingsPersistAtom();

  return useMemo(() => {
    if (settings.targetLanguage === 'auto') {
      const currentLocale = LOCALES_OPTION.find(
        (o) => o.value === intl.locale,
      );
      return currentLocale?.label ?? intl.locale;
    }
    const locale = LOCALES_OPTION.find(
      (o) => o.value === settings.targetLanguage,
    );
    return locale?.label ?? settings.targetLanguage;
  }, [intl, settings.targetLanguage]);
}

export function TranslatePopoverContent({
  isTranslated,
  onTranslate,
  closePopover,
}: {
  isTranslated: boolean;
  onTranslate: () => void;
  closePopover: () => void;
}) {
  const intl = useIntl();
  const [showSettings, setShowSettings] = useState(false);
  const targetLanguageLabel = useTargetLanguageLabel();

  const handleAction = useCallback(() => {
    onTranslate();
    closePopover();
  }, [onTranslate, closePopover]);

  if (showSettings) {
    return (
      <YStack gap="$5" px="$5" pb="$5" pt={platformEnv.isDesktop ? '$5' : undefined}>
        <Button
          variant="tertiary"
          size="small"
          icon="ChevronLeftOutline"
          alignSelf="flex-start"
          onPress={() => setShowSettings(false)}
        >
          {intl.formatMessage({
            id: ETranslations.wallet_bulk_send_btn_back,
          })}
        </Button>
        <TranslateSettings />
      </YStack>
    );
  }

  return (
    <YStack gap="$5" p="$5">
      <XStack alignItems="center" justifyContent="space-between">
        <SizableText size="$bodyLgMedium">
          {intl.formatMessage({
            id: ETranslations.browser_translate_to,
          })}
          {': '}
          {targetLanguageLabel}
        </SizableText>
        <IconButton
          icon="SettingsOutline"
          variant="tertiary"
          size="small"
          onPress={() => setShowSettings(true)}
        />
      </XStack>
      <Button variant="primary" size="medium" onPress={handleAction}>
        {intl.formatMessage({
          id: isTranslated
            ? ETranslations.browser_restore_original
            : ETranslations.browser_translate_start,
        })}
      </Button>
    </YStack>
  );
}

export function usePageTranslation(_tabId: string) {
  const handleTranslate = useCallback(() => {
    Toast.message({ title: 'Not yet implemented' });
  }, []);

  return {
    isTranslated: false,
    handleTranslate,
  };
}
