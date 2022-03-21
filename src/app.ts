// environment and validation
import 'dotenv/config';
import { validateEnvFile } from './validator';
validateEnvFile();

// All imports
import * as express from 'express';
import { Request, Response } from 'express';
import storageRouter from './routes/storage.route';

const app = express();

app.get('/', async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Express working' });
});

const port = 9000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

app.use('/storage', storageRouter);