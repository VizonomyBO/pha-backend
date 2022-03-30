import { Credentials } from '@/@types';
import * as express from 'express';
import { Request, Response } from 'express';
import { login } from '../services/auth.service';

const router = express.Router();

router.post('/login', async (req: Request, res: Response) => {
  const { body } = req;
  const credentials = body as Credentials;
  try {
    const data = await login(credentials);
    res.send({ data: data, sucess: true });
  } catch (error) {
    console.error(error);
    res.status(500).send({ error: error, success: false });
  }
});

export default router;