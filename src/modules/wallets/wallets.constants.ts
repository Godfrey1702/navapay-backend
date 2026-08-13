// Shared between wallets.controller.ts (pre-check before payment init),
// wallets.service.ts (verify-and-credit path), and the Paystack webhook
// (async credit path) so all three enforce the same limits.
export const MIN_TOPUP = 5000;
export const MAX_WALLET_BALANCE = 8_000_000;
