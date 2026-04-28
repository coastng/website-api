import dotenv from 'dotenv';
import Redis from 'ioredis';

dotenv.config();

let redisClient: Redis | undefined;

export function initRedis(): Redis {
  if (!redisClient) {
    redisClient = new Redis({
      host: process.env.REDIS_HOST,
      port: Number(process.env.REDIS_PORT || 6379),
      ...(['staging', 'qa', 'production'].includes(process.env.APP_MODE || '')
        ? { password: process.env.REDIS_PASS }
        : {}),
      connectTimeout: 10000,
      lazyConnect: true,
      maxRetriesPerRequest: 1,
    });
  }

  return redisClient;
}

export async function getAppVariables(variable: string): Promise<string> {
  try {
    const mode = process.env.APP_MODE || 'development';
    const key = `${mode}-${variable}`;
    const value = await initRedis().get(key);

    if (value !== null && value !== undefined) {
      return value;
    }

    return ['CRYPTO_markets', 'CRYPTO_rates'].includes(variable)
      ? JSON.stringify([])
      : '1';
  } catch (error) {
    console.error(
      `Error in getting AppVariables for variable: ${variable}`,
      error,
    );
    return variable.startsWith('CRYPTO_rates') ? JSON.stringify([]) : '1';
  }
}
