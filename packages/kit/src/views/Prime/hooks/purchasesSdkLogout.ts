// Web / desktop / extension fallback: @revenuecat/purchases-js is configured
// per-call via Purchases.configure(apiKey, userId), so it has no cross-user
// SDK state to clear on logout.
export async function logoutPurchasesSdk() {
  // no-op
}
