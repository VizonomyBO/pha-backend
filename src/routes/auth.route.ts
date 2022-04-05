import { Credentials } from '@/@types';
import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import { login } from '../services/auth.service';

const router = express.Router();

router.post('/login', async (req: Request, res: Response, next: NextFunction) => {
  const { body } = req;
  const credentials = body as Credentials;
  try {
    const data = await login(credentials);
    res.json({
      data: data,
      sucess: true,
    });
  } catch (error) {
    next(error);
  }
});

export default router;
