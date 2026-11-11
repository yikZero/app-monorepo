import type { EPrimeFeatures } from '@onekeyhq/shared/src/routes/prime';
import type { IPrimePurchaseAnalyticsContext } from '@onekeyhq/shared/types/prime/primeAnalytics';
import type {
  IRevenueCatCustomerInfo,
  IRevenueCatPurchaseResult,
  IRevenueCatStorefront,
} from '@onekeyhq/shared/types/prime/revenueCat';

import type {
  CustomerInfo as CustomerInfoWeb,
  PurchaseResult,
} from '@revenuecat/purchases-js';
import type {
  CustomerInfo as CustomerInfoNative,
  MakePurchaseResult,
} from 'react-native-purchases';

export type ISubscriptionPeriod = 'P1Y' | 'P1M';

export type IPackageFreeTrial = {
  periodIso: string; // e.g. "P3D"
  periodNumber: number; // e.g. 3
  periodUnit: 'day' | 'week' | 'month' | 'year';
  source: 'native' | 'web';
};

export type IPackage = {
  subscriptionPeriod: ISubscriptionPeriod;
  currencyCode: string;
  pricePerMonth: number;
  pricePerMonthString: string;
  pricePerYear: number;
  pricePerYearString: string;
  priceTotalPerYearString: string;
  freeTrial?: IPackageFreeTrial;
};

export type IRevenueCatCustomerInfoWeb = CustomerInfoWeb;
export type IRevenueCatCustomerInfoNative = CustomerInfoNative;

export type IUsePrimePayment = {
  isReady: boolean;
  initializationError?: Error;
  getStorefront?: () => Promise<IRevenueCatStorefront | null>;
  getCustomerInfo: (
    context?: IPrimePurchaseAnalyticsContext,
  ) => Promise<
    | IRevenueCatCustomerInfoWeb
    | IRevenueCatCustomerInfoNative
    | IRevenueCatCustomerInfo
  >;
  getPackagesNative:
    | ((context?: IPrimePurchaseAnalyticsContext) => Promise<IPackage[]>)
    | undefined;
  getPackagesWeb:
    | ((context?: IPrimePurchaseAnalyticsContext) => Promise<IPackage[]>)
    | undefined;
  restorePurchases:
    | ((context?: IPrimePurchaseAnalyticsContext) => Promise<void>)
    | undefined;
  webEmbedQueryParams?: {
    apiKey: string;
    isSandboxKey: boolean;
    primeUserId: string;
    primeUserEmail: string;
    subscriptionPeriod: ISubscriptionPeriod;
    locale: string;
    currency?: string;
    mode: 'dev' | 'prod';
    featureName?: string;
  };
  purchasePackageNative:
    | (({
        subscriptionPeriod,
        featureName,
        analyticsContext,
      }: {
        subscriptionPeriod: ISubscriptionPeriod;
        featureName?: EPrimeFeatures;
        analyticsContext?: IPrimePurchaseAnalyticsContext;
      }) => Promise<MakePurchaseResult | IRevenueCatPurchaseResult>)
    | undefined;
  purchasePackageWeb:
    | (({
        subscriptionPeriod,
        email,
        locale,
        currency,
        featureName,
        analyticsContext,
      }: {
        subscriptionPeriod: ISubscriptionPeriod;
        email: string;
        locale?: string;
        currency?: string;
        featureName?: EPrimeFeatures;
        analyticsContext?: IPrimePurchaseAnalyticsContext;
      }) => Promise<PurchaseResult>)
    | undefined;
};
