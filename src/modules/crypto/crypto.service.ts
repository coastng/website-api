import { QueryResultRow } from 'pg';
import { getDbPool } from '../../common/db/pg';
import { getAppVariables } from '../../common/helpers/app-static-variables';

type SourceType = 'redis' | 'db';

const ACTIVE_STATUS = 'Active';
const RATES_KEY = 'CRYPTO_rates';

export class HttpError extends Error {
  statusCode: number;

  constructor(message: string, statusCode: number) {
    super(message);
    this.name = 'HttpError';
    this.statusCode = statusCode;
  }
}

type UnknownRecord = Record<string, unknown>;
type NumericLike = number | string | null;

interface RateLike extends UnknownRecord {
  crypto?: string;
  network?: string;
  status?: string;
  bitSystemUSDNGNRate?: NumericLike;
  bulkSystemUSDNGNRate?: NumericLike;
  chainSymbol?: string;
}

interface NetworkInfo {
  assetName: string;
  crypto?: string;
  network?: string;
  chainSymbol?: string;
}

interface SanitizedRate extends UnknownRecord {
  crypto?: string;
  bitSystemUSDNGNRate: number;
  bulkSystemUSDNGNRate: number;
  networks?: NetworkInfo[];
}

interface RatesResponse {
  message: string;
  count: number;
  data: SanitizedRate[];
}

interface SingleRateResponse {
  message: string;
  data: SanitizedRate;
}

interface ThresholdAssetRow extends QueryResultRow {
  id: string;
  crypto: string;
  network: string;
  status: string;
  bitSystemUSDNGNRate: NumericLike;
  bulkSystemUSDNGNRate: NumericLike;
  sourceUSDTNGNBitRate: NumericLike;
  systemRateType: string | null;
  bitFlatMarkup: NumericLike;
  bulkFlatMarkup: NumericLike;
  bitPercentageMarkup: NumericLike;
  bulkPercentageMarkup: NumericLike;
  bitManualtRate: NumericLike;
  bulkManualRate: NumericLike;
  bitUnitManualProfit: NumericLike;
  bulkUnitManualProfit: NumericLike;
  walletId: string | null;
  apiKey: string | null;
  apiSecret: string | null;
  apiRefreshToken: string | null;
  apiKeyExpiresAt: string | null;
  createdOn: string | null;
  updatedOn: string | null;
  chainSymbol: string | null;
}

function toNumber(value: NumericLike | undefined): number {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : 0;
}

function safeParseJsonArray(value: string): RateLike[] {
  try {
    const parsed = JSON.parse(value) as unknown;
    return Array.isArray(parsed) ? (parsed as RateLike[]) : [];
  } catch (error) {
    console.error('Failed to parse cached crypto rates payload', error);
    return [];
  }
}

function sanitizeAssetShape(asset: RateLike): SanitizedRate {
  return {
    ...asset,
    sourceUSDTNGNBitRate: undefined,
    systemRateType: undefined,
    bitFlatMarkup: undefined,
    bulkFlatMarkup: undefined,
    bitPercentageMarkup: undefined,
    bulkPercentageMarkup: undefined,
    bitManualtRate: undefined,
    bulkManualRate: undefined,
    bitUnitManualProfit: undefined,
    bulkUnitManualProfit: undefined,
    status: undefined,
    bitSystemUSDNGNRate: toNumber(asset.bitSystemUSDNGNRate),
    bulkSystemUSDNGNRate: toNumber(asset.bulkSystemUSDNGNRate),
  };
}

function mapDbRowToAsset(row: ThresholdAssetRow): RateLike {
  return {
    crypto: row.crypto,
    network: row.network,
    status: row.status,
    bitSystemUSDNGNRate: row.bitSystemUSDNGNRate,
    bulkSystemUSDNGNRate: row.bulkSystemUSDNGNRate,
    sourceUSDTNGNBitRate: row.sourceUSDTNGNBitRate,
    systemRateType: row.systemRateType,
    bitFlatMarkup: row.bitFlatMarkup,
    bulkFlatMarkup: row.bulkFlatMarkup,
    bitPercentageMarkup: row.bitPercentageMarkup,
    bulkPercentageMarkup: row.bulkPercentageMarkup,
    bitManualtRate: row.bitManualtRate,
    bulkManualRate: row.bulkManualRate,
    bitUnitManualProfit: row.bitUnitManualProfit,
    bulkUnitManualProfit: row.bulkUnitManualProfit,
    walletId: row.walletId,
    apiKey: row.apiKey,
    apiSecret: row.apiSecret,
    apiRefreshToken: row.apiRefreshToken,
    apiKeyExpiresAt: row.apiKeyExpiresAt,
    createdOn: row.createdOn,
    updatedOn: row.updatedOn,
    id: row.id,
    chainSymbol: row.chainSymbol || undefined,
  };
}

async function fetchThresholdAssetsFromDb(): Promise<RateLike[]> {
  const pool = getDbPool();
  const result = await pool.query<ThresholdAssetRow>(`
    SELECT
      ta.id,
      ta.crypto,
      ta.network,
      ta.status,
      ta."bitSystemUSDNGNRate" AS "bitSystemUSDNGNRate",
      ta."bulkSystemUSDNGNRate" AS "bulkSystemUSDNGNRate",
      ta."sourceUSDTNGNBitRate" AS "sourceUSDTNGNBitRate",
      ta."systemRateType" AS "systemRateType",
      ta."bitFlatMarkup" AS "bitFlatMarkup",
      ta."bulkFlatMarkup" AS "bulkFlatMarkup",
      ta."bitPercentageMarkup" AS "bitPercentageMarkup",
      ta."bulkPercentageMarkup" AS "bulkPercentageMarkup",
      ta."bitManualtRate" AS "bitManualtRate",
      ta."bulkManualRate" AS "bulkManualRate",
      ta."bitUnitManualProfit" AS "bitUnitManualProfit",
      ta."bulkUnitManualProfit" AS "bulkUnitManualProfit",
      ta."walletId" AS "walletId",
      ta."apiKey" AS "apiKey",
      ta."apiSecret" AS "apiSecret",
      ta."apiRefreshToken" AS "apiRefreshToken",
      ta."apiKeyExpiresAt" AS "apiKeyExpiresAt",
      ta."createdOn" AS "createdOn",
      ta."updatedOn" AS "updatedOn",
      c.symbol AS "chainSymbol"
    FROM threshold_asset ta
    LEFT JOIN chain c ON c.id = ta."chainId"
  `);

  return result.rows.map(mapDbRowToAsset);
}

function withNetworks(asset: RateLike, allAssets: RateLike[]): RateLike {
  const networks: NetworkInfo[] = allAssets
    .filter((newAsset) => newAsset.crypto === asset.crypto)
    .map((newAsset) => ({
      assetName: `${newAsset.crypto || ''}-${newAsset.network || ''}`,
      crypto: newAsset.crypto,
      network: newAsset.network,
      chainSymbol: newAsset.chainSymbol,
    }));

  return {
    ...asset,
    networks,
  };
}

function sanitizeDbAsset(
  asset: RateLike,
  allAssets: RateLike[],
): SanitizedRate {
  return {
    ...withNetworks(asset, allAssets),
    walletId: undefined,
    apiKey: undefined,
    apiSecret: undefined,
    apiRefreshToken: undefined,
    apiKeyExpiresAt: undefined,
    createdOn: undefined,
    updatedOn: undefined,
    id: undefined,
    assetName: undefined,
    chain: undefined,
    sourceUSDTNGNBitRate: undefined,
    systemRateType: undefined,
    bitFlatMarkup: undefined,
    bulkFlatMarkup: undefined,
    bitPercentageMarkup: undefined,
    bulkPercentageMarkup: undefined,
    bitManualtRate: undefined,
    bulkManualRate: undefined,
    bitUnitManualProfit: undefined,
    bulkUnitManualProfit: undefined,
    status: undefined,
    bitSystemUSDNGNRate: toNumber(asset.bitSystemUSDNGNRate),
    bulkSystemUSDNGNRate: toNumber(asset.bulkSystemUSDNGNRate),
  };
}

function activeWithPositiveRates(asset: RateLike): boolean {
  return (
    toNumber(asset.bitSystemUSDNGNRate) > 0 &&
    toNumber(asset.bulkSystemUSDNGNRate) > 0 &&
    asset.status === ACTIVE_STATUS
  );
}

function uniqueByCrypto(assets: RateLike[]): RateLike[] {
  return assets.reduce<RateLike[]>((acc, current) => {
    if (!acc.some((item) => item.crypto === current.crypto)) {
      acc.push(current);
    }
    return acc;
  }, []);
}

export async function getCryptoAssetsAndRates(
  isTradableToken = true,
): Promise<RatesResponse> {
  const cachedData = await getAppVariables(RATES_KEY);
  const parsedCached = safeParseJsonArray(cachedData);

  if (parsedCached.length) {
    const data = parsedCached
      .filter((asset) => asset.status === ACTIVE_STATUS)
      .map(sanitizeAssetShape);

    return {
      message: 'Rates and Assets!',
      count: data.length,
      data,
    };
  }

  const parentWalletAssets = await fetchThresholdAssetsFromDb();
  const base = isTradableToken
    ? uniqueByCrypto(parentWalletAssets)
    : parentWalletAssets;

  const data = base
    .filter(activeWithPositiveRates)
    .map((asset) => sanitizeDbAsset(asset, parentWalletAssets));

  return {
    message: 'Rates and Assets!',
    count: data.length,
    data,
  };
}

export async function getCryptoAssetsAndRatesForACrypto(
  crypto?: string,
): Promise<SingleRateResponse> {
  const normalizedCrypto = String(crypto || '')
    .trim()
    .toUpperCase();

  if (!normalizedCrypto) {
    throw new HttpError('crypto query is required', 400);
  }

  const cachedData = await getAppVariables(RATES_KEY);
  const parsedCached = safeParseJsonArray(cachedData);

  if (parsedCached.length) {
    const cachedAsset = parsedCached
      .filter((asset) => asset.status === ACTIVE_STATUS)
      .map(sanitizeAssetShape)
      .find(
        (asset) =>
          String(asset.crypto || '').toUpperCase() === normalizedCrypto,
      );

    if (cachedAsset) {
      return {
        message: 'Rates and Assets!',
        data: cachedAsset,
      };
    }
  }

  const parentWalletAssets = await fetchThresholdAssetsFromDb();
  const dbAsset = uniqueByCrypto(parentWalletAssets)
    .filter(activeWithPositiveRates)
    .map((asset) => sanitizeDbAsset(asset, parentWalletAssets))
    .find(
      (asset) => String(asset.crypto || '').toUpperCase() === normalizedCrypto,
    );

  if (!dbAsset) {
    throw new HttpError('Crypto Not Found!', 404);
  }

  return {
    message: 'Rates and Assets!',
    data: dbAsset,
  };
}
