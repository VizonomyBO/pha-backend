import { Request, Response, NextFunction } from 'express';
import * as express from 'express';
import logger from '../utils/LoggerUtil';
import storageRouter from '../routes/storage.route';
import cartoRouter from '../routes/cartodb.route';
import authRouter from '../routes/auth.route';
import * as packageJson from '../../package.json';

const router = express.Router();

router.use((request: Request, response: Response, next: NextFunction) => {
  const endpointInfo = [
    `[${new Date(Date.now()).toISOString()}]`,
    `${request.method}`,
    `${request.url}`,
  ];
  logger.info(endpointInfo.join(' '));
  next();
});

router.get('/_ah/warmup', (req: Request, res: Response) => {
  res.json({ success: true });
});

router.get('/_ah/start', (req: Request, res: Response) => {
  res.json({ success: true });
});

router.get('/', (request: Request, response: Response) => {
  const info = {
    name: 'API',
    version: packageJson.version
  };
  return response.json(info);
});

router.use('/storage', storageRouter);
router.use('/cartodb', cartoRouter);
router.use('/auth', authRouter);

export default router;
