export const SUPPORTED_MARKETS = ['BTC-USDC', 'ETH-USDC', 'SOL-USDC'] as const;

export type Market = (typeof SUPPORTED_MARKETS)[number];