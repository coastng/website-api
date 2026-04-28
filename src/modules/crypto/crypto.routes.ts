import { Request, Response, Router } from 'express';
import {
  getCryptoAssetsAndRates,
  getCryptoAssetsAndRatesForACrypto,
  HttpError,
} from './crypto.service';

type RatesAndAssetsQuery = {
  isTradableToken?: string;
};

type SingleCryptoQuery = {
  crypto?: string;
};

const cryptoRouter = Router();

cryptoRouter.get(
  '/rates-and-assets',
  async (
    req: Request<unknown, unknown, unknown, RatesAndAssetsQuery>,
    res: Response,
  ) => {
    try {
      const isTradableToken = req.query.isTradableToken !== 'false';
      const payload = await getCryptoAssetsAndRates(isTradableToken);
      res.status(200).json(payload);
    } catch (error) {
      console.error('Failed to fetch rates and assets', error);
      res.status(500).json({
        message: 'Internal server error',
        error: 'An unexpected error occurred',
      });
    }
  },
);

cryptoRouter.get(
  '/rates-and-assets/crypto',
  async (
    req: Request<unknown, unknown, unknown, SingleCryptoQuery>,
    res: Response,
  ) => {
    try {
      const payload = await getCryptoAssetsAndRatesForACrypto(req.query.crypto);
      return res.status(200).json(payload);
    } catch (error) {
      const statusCode = error instanceof HttpError ? error.statusCode : 500;
      if (statusCode === 500) {
        console.error('Failed to fetch crypto rates for asset', error);
      }

      let errorMessage = 'Unexpected error';
      if (statusCode === 500) {
        errorMessage = 'An unexpected error occurred';
      } else if (error instanceof Error) {
        errorMessage = error.message;
      }

      return res.status(statusCode).json({
        message: 'Rates and Assets!',
        error: errorMessage,
      });
    }
  },
);

export default cryptoRouter;
