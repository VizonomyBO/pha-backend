// environment and validation
import 'dotenv/config';
import { validateEnvFile } from './validator';
validateEnvFile();

// All imports
import * as express from 'express';
import { Request, Response } from 'express';
import storageRouter from './routes/storage.route';
import cartoRouter from './routes/cartodb.route';
import authRouter from './routes/auth.route';
import * as swaggerUi from 'swagger-ui-express';
import * as swaggerDocument from './swagger.json';
import * as cors from 'cors';

const app = express();
app.use(express.json());
app.use(express.urlencoded());
app.use(cors());

app.get('/', async (req: Request, res: Response) => {
  res.json({ success: true, message: 'Express working' });
});

app.options('*', cors());

const port = 9000;
app.listen(port, () => {
  console.log(`Server started on port ${port}`);
});

app.use('/storage', storageRouter);
app.use('/cartodb', cartoRouter);
app.use('/auth', authRouter);
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));
