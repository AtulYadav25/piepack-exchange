import bitcoinLogo from '../assets/bitcoin.png';
import ethLogo from '../assets/eth.png';
import solLogo from '../assets/solana.png'

//From backend/src/engine/config.ts
export const SUPPORTED_MARKETS = ['BTC-USDC', 'ETH-USDC', 'SOL-USDC'] as const;

export type Market = (typeof SUPPORTED_MARKETS)[number];

export const SUPPORTED_PAIRS = {
    BTC: 'BTC-USDC',
    ETH: 'ETH-USDC',
    SOL: 'SOL-USDC',
} as const;

export const ALL_ASSETS = ['BTC', 'ETH', 'SOL', 'USDC'] as const;
export type Asset = (typeof ALL_ASSETS)[number];

export function getMarketAssets(market: Market): [Asset, Asset] {
    const [base, quote] = market.split('-') as [Asset, Asset];
    return [base, quote];
}

export const cryptoMarkets = [
    {
        symbol: SUPPORTED_PAIRS.BTC,
        baseAsset: "BTC",
        quoteAsset: "USDC",
        basePrecision: 4,
        quotePrecision: 2,
        logo: bitcoinLogo
    },
    {
        symbol: SUPPORTED_PAIRS.ETH,
        baseAsset: "ETH",
        quoteAsset: "USDC",
        basePrecision: 4,
        quotePrecision: 2,
        logo: ethLogo
    },
    {
        symbol: SUPPORTED_PAIRS.SOL,
        baseAsset: "SOL",
        quoteAsset: "USDC",
        basePrecision: 4,
        quotePrecision: 2,
        logo: solLogo
    }
]