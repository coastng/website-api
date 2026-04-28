import { Request, Response, Router } from 'express';
import { getRates } from './giftcard.service';

const giftcardRouter = Router();



giftcardRouter.get('/', async (_req: Request, res: Response) => {
  try {
    const data = await getRates();
    return res.status(200).json({
      message: 'rates fetched successfully',
      data,
    });
  } catch (error) {
    console.error('Failed to fetch giftcard rates', error);
    return res.status(500).json({
      message: 'Internal server error',
      error: 'An unexpected error occurred',
    });
  }
});

export default giftcardRouter;
