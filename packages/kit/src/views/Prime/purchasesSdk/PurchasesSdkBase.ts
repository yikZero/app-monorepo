import { OneKeyLocalError } from '@onekeyhq/shared/src/errors';
import { createPromiseTarget } from '@onekeyhq/shared/src/utils/promiseUtils';
import type { IPrimePurchaseAnalyticsContext } from '@onekeyhq/shared/types/prime/primeAnalytics';

import type {
  CustomerInfo,
  Package,
  PurchaseResult,
} from '@revenuecat/purchases-js';

export type IPurchasePackageParams = {
  packageId: string;
  email: string; // auto filled payment email
  locale?: string;
  userId: string;
  analyticsContext?: IPrimePurchaseAnalyticsContext;
};

export abstract class PurchasesSdkBase {
  configureDonePromise = createPromiseTarget<boolean>();

  abstract getApiKey(): Promise<string>;

  abstract getAppUserId(): Promise<string>;

  abstract configureWithLogin(params: {
    apiKey: string;
    userId: string;
    analyticsContext?: IPrimePurchaseAnalyticsContext;
  }): Promise<void>;

  abstract setDefaultLogLevel(): Promise<void>;

  abstract getCustomerInfoBase(
    analyticsContext?: IPrimePurchaseAnalyticsContext,
  ): Promise<CustomerInfo>;

  abstract getPaywallPackagesBase(
    analyticsContext?: IPrimePurchaseAnalyticsContext,
  ): Promise<Package[]>;

  abstract purchasePackageBase(
    params: IPurchasePackageParams,
  ): Promise<PurchaseResult>;

  async login(params: {
    userId: string;
    analyticsContext?: IPrimePurchaseAnalyticsContext;
  }): Promise<void> {
    const apiKey = await this.getApiKey();
    if (!apiKey) {
      throw new OneKeyLocalError('No REVENUECAT api key found');
    }
    if (!params.userId) {
      throw new OneKeyLocalError('No userId found');
    }
    await this.setDefaultLogLevel();
    await this.configureWithLogin({
      apiKey,
      userId: params.userId,
      analyticsContext: params.analyticsContext,
    });
    this.configureDonePromise.resolveTarget(true);
  }

  async ensureUserIdMatched(userId: string) {
    if (!userId) {
      throw new OneKeyLocalError('No userId found');
    }
    const appUserId = await this.getAppUserId();
    if (appUserId !== userId) {
      throw new OneKeyLocalError('AppUserId not match');
    }
  }

  async getCustomerInfo(params: {
    userId: string;
    analyticsContext?: IPrimePurchaseAnalyticsContext;
  }): Promise<CustomerInfo> {
    await this.login({
      userId: params.userId,
      analyticsContext: params.analyticsContext,
    });
    await this.ensureUserIdMatched(params.userId);
    const customerInfo = await this.getCustomerInfoBase(
      params.analyticsContext,
    );
    return customerInfo;
  }

  async getPaywallPackages(analyticsContext?: IPrimePurchaseAnalyticsContext) {
    await this.configureDonePromise.ready;
    return this.getPaywallPackagesBase(analyticsContext);
  }

  async purchasePackage(params: IPurchasePackageParams) {
    await this.configureDonePromise.ready;
    await this.ensureUserIdMatched(params.userId);
    return this.purchasePackageBase(params);
  }
}
