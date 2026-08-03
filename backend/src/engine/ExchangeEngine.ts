import type { Market } from "./config.js";
import { MarketEngine } from "./markets/MarketEngine.js";
import type { PlaceOrderRequest, Trade } from "./types.js";

export class ExchangeEngine {
    private markets = new Map<Market, MarketEngine>();

    constructor(markets: Market[]) {
        for (const m of markets) {
            this.markets.set(m, new MarketEngine(m));
        }
    }

    placeOrder(req: PlaceOrderRequest): void {
        const market = this.markets.get(req.market);
        if (!market) throw new Error("Invalid market");

        market.placeUserOrder(req);
    }

}