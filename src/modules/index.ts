import { Application } from 'express';
import cryptoRouter from './crypto/crypto.routes';
import giftcardRouter from './giftcard/giftcard.routes';

export function registerModules(app: Application): void {
  app.use('/crypto', cryptoRouter);
  app.use('/giftcard', giftcardRouter);
}
