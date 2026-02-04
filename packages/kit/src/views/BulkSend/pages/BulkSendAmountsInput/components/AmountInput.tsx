import { useCallback, useEffect, useMemo } from 'react';

import BigNumber from 'bignumber.js';

import {
  Input,
  NumberSizeableText,
  SegmentControl,
  SizableText,
  Stack,
  XStack,
  YStack,
} from '@onekeyhq/components';
import { getSharedInputStyles } from '@onekeyhq/components/src/forms/Input/sharedStyles';
import { AmountInput as BaseAmountInput } from '@onekeyhq/kit/src/components/AmountInput';
import { ListItem } from '@onekeyhq/kit/src/components/ListItem';
import { Token } from '@onekeyhq/kit/src/components/Token';
import { useAccountData } from '@onekeyhq/kit/src/hooks/useAccountData';
import { useSettingsPersistAtom } from '@onekeyhq/kit-bg/src/states/jotai/atoms';
import { validateTokenAmount } from '@onekeyhq/shared/src/utils/tokenUtils';
import {
  EAmountInputMode,
  type IAmountInputError,
} from '@onekeyhq/shared/types/bulkSend';

import {
  generateRandomAmountsFromRange,
  validateRangeInput,
} from '../../../utils';

import { useBulkSendAmountsInputContext } from './Context';

export function SpecifiedAmountInput() {
  const {
    networkId,
    tokenInfo,
    tokenDetails,
    tokenDetailsState,
    transfersInfo,
    amountInputValues,
    setAmountInputValues,
    amountInputErrors,
    setAmountInputErrors,
    previewState,
    setPreviewState,
  } = useBulkSendAmountsInputContext();

  const isInPreviewMode = previewState.specifiedPreviewed;

  const { network } = useAccountData({ networkId });

  const [settings] = useSettingsPersistAtom();

  const isLoading =
    !tokenDetailsState.initialized && tokenDetailsState.isRefreshing;
  const balance = tokenDetails?.balanceParsed ?? '0';
  const tokenSymbol = tokenInfo.symbol;

  const handleChange = useCallback(
    (value: string) => {
      setAmountInputValues({
        ...amountInputValues,
        specifiedAmount: value,
      });

      // Reset preview state when input changes
      setPreviewState((prev) => ({ ...prev, specifiedPreviewed: false }));

      const { error } = validateTokenAmount({
        token: tokenInfo,
        amount: new BigNumber(value || '0')
          .times(transfersInfo.length)
          .toFixed(),
        maxAmount: balance ?? '0',
        allowZero: false,
        customErrorMessages: {
          maxAmount: 'Insufficient balance',
          zeroAmount: 'Amount must be greater than 0',
        },
      });
      setAmountInputErrors({
        ...amountInputErrors,
        specifiedAmount: error,
      });
    },
    [
      amountInputValues,
      setAmountInputValues,
      tokenInfo,
      balance,
      transfersInfo.length,
      amountInputErrors,
      setAmountInputErrors,
      setPreviewState,
    ],
  );

  // Calculate fiat value
  const fiatValue = useMemo(() => {
    const amount = new BigNumber(amountInputValues.specifiedAmount || '0');
    if (amount.isNaN() || !tokenDetails?.price) return '0';
    return amount.times(tokenDetails.price).toFixed();
  }, [amountInputValues.specifiedAmount, tokenDetails?.price]);

  return (
    <YStack gap="$1.5" w="100%">
      <BaseAmountInput
        value={amountInputValues.specifiedAmount}
        onChange={handleChange}
        hasError={!!amountInputErrors.specifiedAmount}
        inputProps={{
          placeholder: '0',
          loading: isLoading,
          autoFocus: !isInPreviewMode,
        }}
        valueProps={{
          value: fiatValue,
          loading: isLoading,
          currency: settings.currencyInfo.symbol,
        }}
        tokenSelectorTriggerProps={{
          selectedTokenImageUri: tokenDetails?.info.logoURI,
          selectedNetworkImageUri: network?.logoURI,
          selectedTokenSymbol: tokenSymbol,
          loading: isLoading,
        }}
      />
      {amountInputErrors.specifiedAmount ? (
        <SizableText size="$bodyMd" color="$textCritical" px="$1">
          {amountInputErrors.specifiedAmount}
        </SizableText>
      ) : null}
    </YStack>
  );
}

export function RangeAmountInput() {
  const {
    tokenDetails,
    tokenInfo,
    transfersInfo,
    amountInputValues,
    setAmountInputValues,
    amountInputErrors,
    setAmountInputErrors,
    setPreviewState,
  } = useBulkSendAmountsInputContext();

  const [settings] = useSettingsPersistAtom();

  const balance = tokenDetails?.balanceParsed ?? '0';

  const validateRange = useCallback(
    (min: string, max: string): IAmountInputError => {
      const error = validateRangeInput({ rangeMin: min, rangeMax: max, balance });
      return error ? { rangeError: error } : {};
    },
    [balance],
  );

  const generatePreviewAmounts = useCallback(
    (min: string, max: string): string[] => {
      if (!min || !max || transfersInfo.length === 0) return [];
      return generateRandomAmountsFromRange({
        transfersInfo,
        rangeMin: min,
        rangeMax: max,
        decimals: tokenInfo.decimals,
        balance: [balance], // Pass balance to constrain total
      });
    },
    [transfersInfo, tokenInfo.decimals, balance],
  );

  // Generate initial preview amounts when component mounts with valid values
  useEffect(() => {
    const { rangeMin, rangeMax } = amountInputValues;
    if (!rangeMin || !rangeMax || transfersInfo.length === 0) return;

    // Use validateRange to check validity
    const errors = validateRange(rangeMin, rangeMax);
    if (!errors.rangeError) {
      const previewAmounts = generatePreviewAmounts(rangeMin, rangeMax);
      setPreviewState((prev) => ({
        ...prev,
        rangePreviewAmounts: previewAmounts,
      }));
    }
    // Only run on mount and when transfersInfo changes
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [transfersInfo.length]);

  const handleRangeChange = useCallback(
    (field: 'rangeMin' | 'rangeMax', value: string) => {
      const newValues = { ...amountInputValues, [field]: value };
      setAmountInputValues(newValues);

      const errors = validateRange(newValues.rangeMin, newValues.rangeMax);
      setAmountInputErrors({
        ...amountInputErrors,
        rangeError: errors.rangeError,
      });

      // Generate preview amounts if valid
      const hasValidRange =
        !errors.rangeError && newValues.rangeMin && newValues.rangeMax;
      const previewAmounts = hasValidRange
        ? generatePreviewAmounts(newValues.rangeMin, newValues.rangeMax)
        : [];

      setPreviewState((prev) => ({
        ...prev,
        rangePreviewed: false,
        rangePreviewAmounts: previewAmounts,
      }));
    },
    [
      amountInputValues,
      setAmountInputValues,
      validateRange,
      amountInputErrors,
      setAmountInputErrors,
      setPreviewState,
      generatePreviewAmounts,
    ],
  );

  const handleMinChange = useCallback(
    (value: string) => handleRangeChange('rangeMin', value),
    [handleRangeChange],
  );

  const handleMaxChange = useCallback(
    (value: string) => handleRangeChange('rangeMax', value),
    [handleRangeChange],
  );

  // Calculate fiat values
  const minFiatValue = useMemo(() => {
    const amount = new BigNumber(amountInputValues.rangeMin || '0');
    if (amount.isNaN() || !tokenDetails?.price) return '0';
    return amount.times(tokenDetails.price).toFixed();
  }, [amountInputValues.rangeMin, tokenDetails?.price]);

  const maxFiatValue = useMemo(() => {
    const amount = new BigNumber(amountInputValues.rangeMax || '0');
    if (amount.isNaN() || !tokenDetails?.price) return '0';
    return amount.times(tokenDetails.price).toFixed();
  }, [amountInputValues.rangeMax, tokenDetails?.price]);

  const hasError = !!amountInputErrors.rangeError;
  const sharedStyles = getSharedInputStyles({
    error: hasError,
  });

  return (
    <YStack gap="$1.5" w="100%">
      <XStack gap="$2" alignItems="center" w="100%">
        <Stack
          flex={1}
          borderRadius="$3"
          borderWidth={sharedStyles.borderWidth}
          borderColor={sharedStyles.borderColor}
          overflow="hidden"
        >
          <XStack alignItems="center" px="$3.5" pt="$2.5" pb="$1">
            <Input
              flex={1}
              value={amountInputValues.rangeMin}
              onChangeText={handleMinChange}
              placeholder="0"
              keyboardType="decimal-pad"
              containerProps={{
                width: '100%',
                borderWidth: 0,
              }}
              fontSize={28}
              fontWeight="600"
              px="$0"
            />
          </XStack>
          <XStack
            alignItems="center"
            justifyContent="space-between"
            px="$3.5"
            pb="$2"
          >
            <NumberSizeableText
              size="$bodyMd"
              color="$textSubdued"
              formatter="value"
              formatterOptions={{ currency: settings.currencyInfo.symbol }}
            >
              {minFiatValue}
            </NumberSizeableText>
            <SizableText size="$bodyMdMedium" color="$text">
              {tokenDetails?.info.symbol}
            </SizableText>
          </XStack>
        </Stack>

        <Stack w="$2" h="$0.5" bg="$borderStrong" />

        <Stack
          flex={1}
          borderRadius="$3"
          borderWidth={sharedStyles.borderWidth}
          borderColor={sharedStyles.borderColor}
          overflow="hidden"
        >
          <XStack alignItems="center" px="$3.5" pt="$2.5" pb="$1">
            <Input
              flex={1}
              value={amountInputValues.rangeMax}
              onChangeText={handleMaxChange}
              placeholder="Max"
              keyboardType="decimal-pad"
              containerProps={{
                width: '100%',
                borderWidth: 0,
              }}
              fontSize={28}
              fontWeight="600"
              px="$0"
            />
          </XStack>
          <XStack
            alignItems="center"
            justifyContent="space-between"
            px="$3.5"
            pb="$2"
          >
            <NumberSizeableText
              size="$bodyMd"
              color="$textSubdued"
              formatter="value"
              formatterOptions={{ currency: settings.currencyInfo.symbol }}
            >
              {maxFiatValue}
            </NumberSizeableText>
            <SizableText size="$bodyMdMedium" color="$text">
              {tokenDetails?.info.symbol}
            </SizableText>
          </XStack>
        </Stack>
      </XStack>
      {amountInputErrors.rangeError ? (
        <SizableText size="$bodyMd" color="$textCritical" px="$1">
          {amountInputErrors.rangeError}
        </SizableText>
      ) : null}
    </YStack>
  );
}

function CustomAmountDisplay({ inDialog }: { inDialog?: boolean }) {
  const {
    networkId,
    tokenDetails,
    tokenInfo,
    totalTokenAmount,
    totalFiatAmount,
  } = useBulkSendAmountsInputContext();

  const { network } = useAccountData({ networkId });

  const [settings] = useSettingsPersistAtom();

  const tokenSymbol = tokenInfo.symbol;

  if (inDialog) {
    return (
      <YStack alignItems="center" justifyContent="center" p="$5">
        <SizableText
          size="$bodyLg"
          color="$textSubdued"
          textAlign="center"
          maxWidth={256}
        >
          Each transfer will use the amount you entered.
        </SizableText>
      </YStack>
    );
  }

  return (
    <ListItem
      renderAvatar={() => (
        <Token
          tokenImageUri={tokenDetails?.info.logoURI}
          size="lg"
          showNetworkIcon
          networkImageUri={network?.logoURI}
          networkId={network?.id}
        />
      )}
      mx="$0"
      px="$0"
    >
      <XStack alignItems="center" gap="$2" flex={1}>
        <YStack flex={1}>
          <NumberSizeableText
            size="$bodyLgMedium"
            formatter="balance"
            formatterOptions={{ tokenSymbol }}
          >
            {totalTokenAmount}
          </NumberSizeableText>
          <NumberSizeableText
            size="$bodyMd"
            color="$textSubdued"
            formatter="value"
            formatterOptions={{ currency: settings.currencyInfo.symbol }}
          >
            {totalFiatAmount}
          </NumberSizeableText>
        </YStack>
        <SizableText size="$bodyMd" color="$textSubdued">
          Sending Amount
        </SizableText>
      </XStack>
    </ListItem>
  );
}

export function AmountInputSection({ inDialog }: { inDialog?: boolean }) {
  const {
    amountInputMode,
    setAmountInputMode,
    setAmountInputErrors,
    transfersInfo,
    tokenInfo,
    tokenDetails,
    amountInputValues,
  } = useBulkSendAmountsInputContext();

  const segmentOptions = useMemo(
    () => [
      { label: 'Specified', value: EAmountInputMode.Specified },
      { label: 'Range', value: EAmountInputMode.Range },
      { label: 'Custom', value: EAmountInputMode.Custom },
    ],
    [],
  );

  const validateSpecifiedAmount = useCallback((): IAmountInputError => {
    const balance = tokenDetails?.balanceParsed ?? '0';
    const { error } = validateTokenAmount({
      token: tokenInfo,
      amount: new BigNumber(amountInputValues.specifiedAmount || '0')
        .times(transfersInfo.length)
        .toFixed(),
      maxAmount: balance,
      allowZero: false,
      customErrorMessages: {
        maxAmount: 'Insufficient balance',
        zeroAmount: 'Amount must be greater than 0',
      },
    });
    return { specifiedAmount: error };
  }, [
    tokenInfo,
    tokenDetails?.balanceParsed,
    amountInputValues.specifiedAmount,
    transfersInfo.length,
  ]);

  const validateRangeAmount = useCallback((): IAmountInputError => {
    const balance = tokenDetails?.balanceParsed ?? '0';
    const error = validateRangeInput({
      rangeMin: amountInputValues.rangeMin,
      rangeMax: amountInputValues.rangeMax,
      balance,
    });
    return error ? { rangeError: error } : {};
  }, [
    tokenDetails?.balanceParsed,
    amountInputValues.rangeMin,
    amountInputValues.rangeMax,
  ]);

  const handleModeChange = useCallback(
    (value: string | number) => {
      const newMode = value as EAmountInputMode;
      setAmountInputMode(newMode);

      // Only re-validate in Dialog mode (Desktop)
      // MobileLayout has independent data for each mode, so no need to re-validate
      if (!inDialog) {
        setAmountInputErrors({});
        return;
      }

      // Re-validate based on the new mode (Dialog only)
      if (newMode === EAmountInputMode.Specified) {
        setAmountInputErrors(validateSpecifiedAmount());
      } else if (newMode === EAmountInputMode.Range) {
        setAmountInputErrors(validateRangeAmount());
      } else {
        setAmountInputErrors({});
      }
    },
    [
      inDialog,
      setAmountInputMode,
      setAmountInputErrors,
      validateSpecifiedAmount,
      validateRangeAmount,
    ],
  );

  const renderContent = () => {
    if (amountInputMode === EAmountInputMode.Specified) {
      return <SpecifiedAmountInput />;
    }
    if (amountInputMode === EAmountInputMode.Range) {
      return <RangeAmountInput />;
    }
    if (amountInputMode === EAmountInputMode.Custom) {
      return <CustomAmountDisplay inDialog={inDialog} />;
    }
    return null;
  };

  return (
    <YStack gap="$4" w="100%">
      <SegmentControl
        fullWidth
        value={amountInputMode}
        options={segmentOptions}
        onChange={handleModeChange}
      />
      {renderContent()}
    </YStack>
  );
}
