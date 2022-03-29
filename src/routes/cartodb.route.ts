import * as express from 'express';
import { PhaIndividual, PhaRetailer } from '../@types/database';
import { Request, Response } from 'express';
import { getProfile, getRetailer, insertIntoPHAIndividual, insertIntoPHARetailer } from '../services/cartodb.service';
import { QueryParams } from '../@types';

const router = express.Router();

router.get('/', async (_: never, res: Response) => {
  res.json({ success: true, message: 'Storage Working' });
});

router.get('/pha-retailer', async (req: Request, res: Response) => {
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
    console.error(error);
    res.status(500).json({ success: false, message: error.message });
  }
});

router.get('/profile/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    const response = await getProfile(id);
    res.send({ data: response, success: true });
  } catch (error) {
    console.error(error);
    res.status(500).json(error);
  }
});

router.post('/pha-individual', async (req: Request, res: Response) => {
  const { body } = req;
  const individual = body as PhaIndividual;
  try {
    const data = await insertIntoPHAIndividual(individual);
    res.send({ data: data, sucess: true });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error, success: false });
  }
});

router.post('/pha-retailer', async (req: Request, res: Response) => {
  const { body } = req;
  const retailer = body as PhaRetailer;
  try {
    const data = await insertIntoPHARetailer(retailer);
    res.send({ data: data, sucess: true });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error, success: false });
  }
});

export default router;