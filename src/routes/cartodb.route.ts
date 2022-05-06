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
  updatePHARetailer,
  getPHAIndividual,
  getPHARetailerCSV,
  getPHAIndividualCSV,
  deleteJob,
  deleteOsmPoint,
  jobClusterTables,
  getJob,
  deleteFromTable
} from '../services/cartodb.service';
import { FiltersInterface, MulterFile, QueryParams, RequestWithFiles } from '../@types';
import { filtersMiddleware } from '../middlewares/filtersMiddleware';
import ImageUploadService from '../services/ImageUpload.service';
import { uploadFilesToGoogle } from '../utils';
import logger from '../utils/LoggerUtil';
import { IMAGELINKS, INDIVIDUAL, OWNER_PHOTO, RETAILER } from '../constants';

const router = express.Router();
const upload = ImageUploadService.getUploadFields();

router.get('/', async (_: never, res: Response) => {
  res.json({ success: true, message: 'Storage Working' });
});

router.get('/job', async (_: never, res: Response) => {
  const jobs = await jobClusterTables();
  res.json({ success: true, data: jobs });
});

router.get('/job/:id', async (req: Request, res: Response) => {
  const { id } = req.params;
  const job = await getJob(id);
  res.json({ success: true, data: job });
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
  const { page = 1, limit = 10, status = '', search = '', dateRange = '', isRetailer = 'false' } = req.query;
  try {
    const queryParams: QueryParams = {
      page: +page,
      limit: +limit,
      status: status as string,
      search: search as string,
      dateRange: dateRange as string,
      isRetailer: isRetailer === 'true'
    };
    const response = await getDashboard(queryParams);
    res.send({ data: response, success: true });
  } catch (error) {
    next(error);
  }
});

router.get('/dashboard-count', async (req: Request, res: Response, next: NextFunction) => {
  const { page = 1, limit = 10, status = '', search = '', dateRange = '', isRetailer = 'false' } = req.query;
  try {
    const queryParams: QueryParams = {
      page: +page,
      limit: +limit,
      status: status as string,
      search: search as string,
      dateRange: dateRange as string,
      isRetailer: isRetailer === 'true'
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

const uploadMany = ImageUploadService.getUploadMultiple();
router.post('/pha-individual', async (req: RequestWithFiles, res: Response, next: NextFunction) => {
  uploadMany(req, res, async (err: string | Multer.MulterError | Error) => {
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
    const imageLinksPromises = uploadFilesToGoogle(req.files);
    const imagelinks = await Promise.all(imageLinksPromises);
    const body = JSON.parse(req.body.json);
    body.imagelinks = imagelinks.join(',');
    logger.info("BODY ", JSON.stringify(body))
    req.body = body;
    console.log(body.imagelinks, body.owner_photo);
    next();
  });
}
, async (req: Request, res: Response, next: NextFunction) => {
  const { body } = req;
  const individual = body as PhaIndividual;
  try {
    const data = await insertIntoPHAIndividual(individual);
    res.send({ data: data, success: true });
  } catch (error) {
    next(error);
  }
});

router.post('/pha-individual/download', async (req: Request, res: Response, next: NextFunction) => {
  const body = req.body;
  try {
    const response =  await getPHAIndividualCSV(body.individualIds);
    res.header('Content-Type', 'text/csv');
    res.attachment('PHA-individual.csv');
    res.send(response);
  } catch (error) {
    next(error);
  }
});

router.put('/pha-individual/:id', async (req: RequestWithFiles, res: Response, next: NextFunction) => {
  uploadMany(req, res, async (err: string | Multer.MulterError | Error) => {
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
    const individualId: string = req.params.id;
    const imageLinksPromises = uploadFilesToGoogle(req.files);
    const imagelinks = await Promise.all(imageLinksPromises);
    const body = JSON.parse(req.body.json);
    const currentImageLinks = (body.imagelinks || '').split(',');
    body.imagelinks = currentImageLinks.concat(imagelinks).join(',');
    deleteJob(individualId, INDIVIDUAL, currentImageLinks, IMAGELINKS);
    body.update_date = new Date().toISOString();
    logger.info("BODY ", JSON.stringify(body))
    req.body = body;
    next();
  });
}
, async (req:Request, res: Response, next: NextFunction) => {
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

router.get('/pha-individual/:id', async (req:Request, res: Response, next: NextFunction) => {
  const individualId: string = req.params.id;
  try {
    const response = await getPHAIndividual(individualId);
    res.json({data: response, sucess: true});
  } catch (error) {
    next(error);
  }
});


router.post('/pha-retailer', async (req: RequestWithFiles, res: Response, next: NextFunction) => {
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
    const imageLinksPromises = uploadFilesToGoogle(req.files[ImageUploadService.images]);
    const ownerPhotosPromises = uploadFilesToGoogle(req.files[ImageUploadService.ownerimages]);
    const [imagelinks, ownerimages] = [await Promise.all(imageLinksPromises), await Promise.all(ownerPhotosPromises)];
    const body = JSON.parse(req.body.json);
    body.imagelinks = imagelinks.join(',');
    body.owner_photo = ownerimages.join(',');
    logger.info("BODY ", JSON.stringify(body))
    req.body = body;
    console.log(body.imagelinks, body.owner_photo);
    next();
  });
} ,async (req: RequestWithFiles, res: Response, next: NextFunction) => {
  const { body } = req;
  const retailer = body as PhaRetailer;
  try {
    const data = await insertIntoPHARetailer(retailer);
    res.send({ data: data, success: true });
  } catch (error) {
    console.log('here');
    next(error);
  }
});

router.post('/pha-retailer/download', async (req: Request, res: Response, next: NextFunction) => {
  const body = req.body;
  try {
    const response =  await getPHARetailerCSV(body.retailerIds);
    res.header('Content-Type', 'text/csv');
    res.attachment('PHA-retailer.csv');
    res.send(response);
  } catch (error) {
    next(error);
  }
});

router.put('/pha-retailer/:id', async (req: RequestWithFiles, res: Response, next: NextFunction) => {
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
    const retailerId = req.params.id;
    const imageLinksPromises = uploadFilesToGoogle(req.files[ImageUploadService.images]);
    const ownerPhotosPromises = uploadFilesToGoogle(req.files[ImageUploadService.ownerimages]);
    const [imagelinks, ownerimages] = [await Promise.all(imageLinksPromises), await Promise.all(ownerPhotosPromises)];
    const body = JSON.parse(req.body.json);
    const currentImageLinks = (body.imagelinks || '').split(',');
    const currentOwnerImages = (body.owner_photo || '').split(',');
    body.imagelinks = currentImageLinks.concat(imagelinks).join(',');
    body.owner_photo = currentOwnerImages.concat(ownerimages).join(',');
    deleteJob(retailerId, RETAILER, currentImageLinks, IMAGELINKS);
    deleteJob(retailerId, RETAILER, currentOwnerImages, OWNER_PHOTO);
    body.update_date = new Date().toISOString();
    logger.info("BODY ", JSON.stringify(body))
    req.body = body;
    console.log(body.imagelinks, body.owner_photo);
    next();
  });
}, async (req: RequestWithFiles, res: Response, next: NextFunction) => {
  const body = req.body;
  const retailerId = req.params.id;
  const retailer = body as PhaRetailer;
  try {
    const data = await updatePHARetailer(retailer, retailerId);
    res.json({ data: data, sucess: true });
  } catch (error) {
    next(error);
  }
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

router.delete('/osm-point/:id', async (req: Request, res: Response, next: NextFunction) => {
  const id = req.params.id;
  try {
    const response = await deleteOsmPoint(id);
    res.send({ success: true, data: response });
  } catch (error) {
    console.log(error);
    next(error);
  }
});

router.delete('/pha', async (req: Request, res: Response, next: NextFunction) => {
  const { body } = req;
  const { ids } = body;
  const { table = '' } = req.query;
  try {
    const response = await deleteFromTable(table as string, ids);
    res.send({ success: true, data: response });
  } catch (error) {
    next(error);
  }
});

export default router;