import * as express from 'express';
import * as Multer from 'multer';
import { PhaIndividual, PhaRetailer } from '../@types/database';
import { Request, Response, NextFunction } from 'express';
import {
  getBadges,
  getDashboard,
  getDashboardCount,
  getFilteredLayers,
  getIndividual,
  getOAuthToken,
  getProfile,
  getRetailer,
  insertIntoPHAIndividual,
  insertIntoPHARetailer,
  mapQuery,
  updateIndividual,
} from '../services/cartodb.service';
import { FiltersInterface, QueryParams, RequestWithFiles } from '../@types';
import { filtersMiddleware } from '../middlewares/filtersMiddleware';
import { phaIndividualMiddleware } from '../middlewares/phaIndividualMiddleware';
import { phaRetailerMiddleware } from '../middlewares/phaRetailerMiddleware';
import ImageUploadService from '../services/ImageUpload.service';
import { generateRandomNameWithExtension } from '../utils';

const router = express.Router();

router.get('/', async (_: never, res: Response) => {
  res.json({ success: true, message: 'Storage Working' });
});

router.post('/layers', [filtersMiddleware], async (req: Request, res: Response, next: NextFunction) => {
  const { body } = req;
  const filter = body as FiltersInterface;
  try {
    const response = await getFilteredLayers(filter);
    res.send({ success: true, data: response });
  } catch (error) {
    next(error);
  }
});

router.get('/badges/:id', async (req: Request, res: Response) => {
  const id = req.params.id;
  try {
    const response = await getBadges(id);
    res.send({ success: true, data: response });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
});

router.get('/token', async (_: unknown, res: Response) => {
  try {
    const response = await getOAuthToken();
    res.send({ success: true, data: { token: response } });
  } catch (err) {
    res.status(500).json({ success: false, message: err.message });
  }
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
    next(error);
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

router.get('/dashboard', async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 10, status = '', search = '', dateRange = '' } = req.query;
  try {
    const queryParams: QueryParams = {
      page: +page,
      limit: +limit,
      status: status as string,
      search: search as string,
      dateRange: dateRange as string
    };
    const response = await getDashboard(queryParams);
    res.send({ data: response, success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard-count', async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 10, status = '', search = '', dateRange = '' } = req.query;
  try {
    const queryParams: QueryParams = {
      page: +page,
      limit: +limit,
      status: status as string,
      search: search as string,
      dateRange: dateRange as string
    };
    const response = await getDashboardCount(queryParams);
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

router.post('/pha-individual', [phaIndividualMiddleware], async (req: Request, res: Response, next: NextFunction) => {
  const { body } = req;
  const individual = body as PhaIndividual;
  try {
    const data = await insertIntoPHAIndividual(individual);
    res.send({ data: data, success: true });
  } catch (error) {
    next(error);
  }
});

router.put('/pha-individual/:id',async (req:Request, res: Response, next: NextFunction) => {
  const { body } = req;
  const individual = body as PhaIndividual;
  const individualId: string = req.params.id;
  try {
    const response = await updateIndividual(individual, individualId);
    res.json({data: response, success: true});
  } catch (error) {
    next(error);
  }
});

const upload = ImageUploadService.getUploadMultiple();

router.post('/pha-retailer', [phaRetailerMiddleware], async (req: RequestWithFiles, res: Response, next: NextFunction) => {
  upload(req, res, async (err: string | Multer.MulterError | Error) => {
    if (err) {
      if (err instanceof Multer.MulterError) {
        console.error(err);
        res.status(400).send({ error: err.message, success: false });
        return;
      } else if (err.toString().includes('Invalid file type')) {
        console.error(err);
        res.status(400).send({ error: 'Invalid file type', success: false });
        return;
      } else if (err) {
        res.status(500).send({ error: err, success: false });
        return;
      }
    }

    if (!req.files) {
      res.status(400).json({ success: false, message: 'No files uploaded' });
      return;
    }

    const promises = req.files.map((file) => {
      return new Promise((resolve, reject) => {
        const name = generateRandomNameWithExtension(file.mimetype.split('/')[1]);
        const blob = ImageUploadService.getBucket().file(name);

        const blobStream = blob.createWriteStream({
          metadata: {
            contentType: file.mimetype
          },
          resumable: false,
          public: true
        });

        blobStream.on('error', err => {
          console.error(err);
          reject(err);
        });

        blobStream.on('finish', async () => {
          const publicUrl = ImageUploadService.getPublicURL(blob.name);
          resolve(publicUrl);
        });
        blobStream.end(file.buffer);
      });
    });
    const imagelinks = await Promise.all(promises);

    const body = JSON.parse(req.body.json);
    body.imagelinks = imagelinks.join(',');
    const retailer = body as PhaRetailer;
    try {
      const data = await insertIntoPHARetailer(retailer);
      res.send({ data: data, success: true });
    } catch (error) {
      next(error);
    }
  });
});

router.post('/map-table', [filtersMiddleware], async (req: Request, res: Response, next: NextFunction) => {
  const { body } = req;
  const mapTable = body as FiltersInterface;
  const { page = 1, limit = 10 } = req.query;
  const params = {
    page: +page,
    limit: +limit,
  } as QueryParams;
  try {
    const data = await mapQuery(mapTable, params);
    res.send({ data: data, success: true });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

export default router;
