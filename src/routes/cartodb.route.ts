import * as express from 'express';
import { PhaIndividual, PhaRetailer } from '../@types/database';
import { Request, Response, NextFunction } from 'express';
import { getIndividual, getProfile, getRetailer, insertIntoPHAIndividual, insertIntoPHARetailer } from '../services/cartodb.service';
import { QueryParams } from '../@types';

const router = express.Router();

router.get('/', async (_: never, res: Response) => {
  res.json({ success: true, message: 'Storage Working' });
});

router.get('/pha-individual', async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 10, status = '', search = '', dateRange = '' } = req.query;
  try {
    const queryParams: QueryParams = {
      page: +page,
      limit: +limit,
      status: status as string,
      search: search as string,
      dateRange: dateRange as string
    };
    const response = await getIndividual(queryParams);
    res.send({ success: true, data: response });
  } catch (error) {
    next(error)
  }
});

router.get('/pha-retailer', async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 10, status = '', search = '', dateRange = '' } = req.query;
  try {
    const queryParams: QueryParams = {
      page: +page,
      limit: +limit,
      status: status as string,
      search: search as string,
      dateRange: dateRange as string
    };
    const response = await getRetailer(queryParams);
    res.send({ data: response, success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/profile/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.id;
  try {
    const response = await getProfile(id);
    res.send({ data: response, success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/pha-individual', async (req: Request, res: Response, next: NextFunction) => {
  const { body } = req;
  const individual = body as PhaIndividual;
  try {
    const data = await insertIntoPHAIndividual(individual);
    res.send({ data: data, sucess: true });
  } catch (error) {
    next(error);
  }
});

router.post('/pha-retailer', async (req: Request, res: Response, next: NextFunction) => {
  const { body } = req;
  const retailer = body as PhaRetailer;
  try {
    const data = await insertIntoPHARetailer(retailer);
    res.send({ data: data, sucess: true });
  } catch (error) {
    next(error);
  }
});

export default router;