export const SUPPORTED_MARKETS = ['BTC-USDC', 'ETH-USDC', 'SOL-USDC'] as const;

export type Market = (typeof SUPPORTED_MARKETS)[number];

/** All tradable assets derived from supported markets */
export const ALL_ASSETS = ['BTC', 'ETH', 'SOL', 'USDC'] as const;
export type Asset = (typeof ALL_ASSETS)[number];

/** Default balance credited to new users (demo / paper-trading) */
export const DEFAULT_BALANCES: Record<Asset, number> = {
    BTC:  1,
    ETH:  10,
    SOL:  100,
    USDC: 10_000,
};

/** Returns the base and quote assets for a given market symbol, e.g. "BTC-USDC" → ["BTC", "USDC"] */
export function getMarketAssets(market: Market): [Asset, Asset] {
    const [base, quote] = market.split('-') as [Asset, Asset];
    return [base, quote];
}