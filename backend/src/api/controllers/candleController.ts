import type { FastifyReply, FastifyRequest } from 'fastify';
import { tsPool } from '../../db/timescale.js';
import type { CandleQueryInput } from '../validators/candle.schema.js';

export const parseInterval = (intervalStr?: string): string => {
  if (!intervalStr) return '1 minute';

  const lower = intervalStr.toLowerCase().trim();
  const map: Record<string, string> = {
    '1m': '1 minute',
    '5m': '5 minutes',
    '15m': '15 minutes',
    '30m': '30 minutes',
    '1h': '1 hour',
    '4h': '4 hours',
    '1d': '1 day',
  };

  return map[lower] || lower;
};

export const getCandles = async (
  req: FastifyRequest<{ Querystring: CandleQueryInput }>,
  reply: FastifyReply
) => {
  try {
    const { market, interval, startTime, endTime, limit } = req.query;

    const pgInterval = parseInterval(interval);

    const end = endTime ? new Date(endTime) : new Date();
    const start = startTime
      ? new Date(startTime)
      : new Date(end.getTime() - 60 * 60 * 1000); // 1 hour default window

    const queryText = `
      SELECT
        time_bucket_gapfill($1::INTERVAL, timestamp, $3::TIMESTAMPTZ, $4::TIMESTAMPTZ) AS bucket,
        $2::TEXT AS market,
        first(price, timestamp) AS open,
        max(price) AS high,
        min(price) AS low,
        last(price, timestamp) AS close,
        COALESCE(sum(quantity), 0) AS volume
      FROM trades
      WHERE market = $2 AND timestamp >= $3::TIMESTAMPTZ AND timestamp <= $4::TIMESTAMPTZ
      GROUP BY bucket
      ORDER BY bucket ASC
      LIMIT $5;
    `;

    const { rows } = await tsPool.query(queryText, [
      pgInterval,
      market,
      start.toISOString(),
      end.toISOString(),
      limit,
    ]);

    const candles = rows
      .filter((row) => row.bucket !== null && row.close !== null)
      .map((row) => ({
        timestamp: new Date(row.bucket).getTime(),
        bucket: row.bucket,
        market: row.market,
        open: parseFloat(row.open),
        high: parseFloat(row.high),
        low: parseFloat(row.low),
        close: parseFloat(row.close),
        volume: parseFloat(row.volume),
      }));

    return reply.status(200).send({
      success: true,
      data: {
        market,
        interval: pgInterval,
        candles,
      },
    });
  } catch (error) {
    console.error('Error fetching candles:', error);
    return reply.status(500).send({
      success: false,
      message: 'Failed to fetch candle data',
    });
  }
};
