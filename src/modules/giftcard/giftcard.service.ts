import { QueryResultRow } from 'pg';
import { getDbPool } from '../../common/db/pg';
import { initRedis } from '../../common/helpers/app-static-variables';

const RATES_CACHE_KEY = 'GIFTCARD_rates_v2';
const RATES_CACHE_TTL_SECONDS = 60 * 60;

interface RateRow extends QueryResultRow {
  id: string;
  rate: string | null;
  profit: string | null;
  giftcardType?: string | null;
  createdOn?: string | null;
  updatedOn?: string | null;
  deletedAt?: string | null;
  giftcard: Record<string, unknown> | null;
  country: Record<string, unknown> | null;
  range: Record<string, unknown> | null;
}

function buildCacheKey(): string {
  const mode = process.env.APP_MODE || 'development';
  return `coast_web_rate-${mode}-${RATES_CACHE_KEY}`;
}

function parseCachedRates(value: string): Record<string, unknown>[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as Record<string, unknown>[]) : [];
  } catch (error) {
    console.error('Failed to parse giftcard rates cache payload', error);
    return [];
  }
}

function normalizeRows(rows: RateRow[]): Record<string, unknown>[] {
  return rows.map((row) => ({
    id: row.id,
    giftcardType: row.giftcardType,
    rate: row.rate,
    profit: row.profit,
    createdOn: row.createdOn,
    updatedOn: row.updatedOn,
    deletedAt: row.deletedAt,
    giftcard: row.giftcard,
    country: row.country,
    range: row.range,
  }));
}

export async function getRates(): Promise<Record<string, unknown>[]> {
  const cacheKey = buildCacheKey();

  try {
    const cached = await initRedis().get(cacheKey);
    if (cached !== null) {
      return parseCachedRates(cached);
    }
  } catch (error) {
    console.error('Failed to read giftcard rates from cache', error);
  }

  const pool = getDbPool();
  const result = await pool.query<RateRow>(
    `
      SELECT
        r.id,
        r.rate::text AS rate,
        r.profit::text AS profit,
        r."giftcardType" AS "giftcardType",
        r."createdOn" AS "createdOn",
        r."updatedOn" AS "updatedOn",
        r."deletedAt" AS "deletedAt",
        json_build_object(
          'id', g.id,
          'name', g.name,
          'image', g.image,
          'processingTime', g."processingTime",
          'startCode', g."startCode",
          'createdOn', g."createdOn",
          'updatedOn', g."updatedOn",
          'accepting', g.accepting,
          'requiresReceipt', g."requiresReceipt",
          'deletedAt', g."deletedAt"
        ) AS giftcard,
        json_build_object(
          'id', c.id,
          'country', c.country,
          'image', c.image,
          'createdOn', c."createdOn",
          'updatedOn', c."updatedOn",
          'deletedAt', c."deletedAt"
        ) AS country,
        json_build_object(
          'id', rg.id,
          'from', rg."from",
          'to', rg."to",
          'range', rg.range,
          'createdOn', rg."createdOn",
          'updatedOn', rg."updatedOn",
          'deletedAt', rg."deletedAt"
        ) AS range
      FROM rates r
      LEFT JOIN giftcards g ON g.id = r."giftcardId"
      LEFT JOIN countries c ON c.id = r."countryId"
      LEFT JOIN ranges rg ON rg.id = r."rangeId"
      ORDER BY r."updatedOn" DESC, r."createdOn" DESC
    `,
  );

  const normalized = normalizeRows(result.rows);

  try {
    await initRedis().set(
      cacheKey,
      JSON.stringify(normalized),
      'EX',
      RATES_CACHE_TTL_SECONDS,
    );
  } catch (error) {
    console.error('Failed to write giftcard rates to cache', error);
  }

  return normalized;
}
