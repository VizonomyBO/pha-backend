// environment and validation
import 'dotenv/config';
import { validateEnvFile } from './validator';
validateEnvFile();

// All imports
import * as express from 'express';
import { Request, Response } from 'express';
import storageRouter from './routes/storage.route';
import cartoRouter from './routes/cartodb.route';

const app = express();
app.use(express.json());
app.use(express.urlencoded());

app.get('/', async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Express working' });
});

const port = 9000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

app.use('/storage', storageRouter);
app.use('/cartodb', cartoRouter);