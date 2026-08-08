import { z } from 'zod';
import { SUPPORTED_MARKETS } from '../../engine/config.js';

export const CandleQuerySchema = z.object({
  market: z.enum(SUPPORTED_MARKETS).default('BTC-USDC'),
  interval: z.string().optional().default('1m'),
  startTime: z.string().optional(),
  endTime: z.string().optional(),
  limit: z.coerce.number().min(1).max(1000).optional().default(100),
});

export type CandleQueryInput = z.infer<typeof CandleQuerySchema>;
