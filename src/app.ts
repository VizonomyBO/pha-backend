// environment and validation
import 'dotenv/config';
import { validateEnvFile } from './validator';
validateEnvFile();

// All imports
import * as express from 'express';
import { Request, Response, NextFunction } from 'express';
import * as swaggerUi from 'swagger-ui-express';
import * as swaggerDocument from './swagger.json';
import * as cors from 'cors';
import router from './routes';
import ResponseError from '@/@types/';
import logger from './utils/LoggerUtil';
import { ERROR_CODE_DEFAULT } from './constants';

const app = express();
app.use(express.json());
app.use(express.urlencoded());
app.use(cors());
app.options('*', cors());
app.use('/', router);
app.use('/swagger', swaggerUi.serve, swaggerUi.setup(swaggerDocument));

app.use(
  (
    error: ResponseError,
    request: Request,
    response: Response,
    next: NextFunction
  ) => {
    const errorCode = error.code || ERROR_CODE_DEFAULT;
    const errorMessage = error.message;
    const endpointError = [`ERROR ${errorCode}: ${errorMessage}`, `${error}`];
    logger.error(endpointError.join(' '));
    response
      .status(errorCode)
      .json({
        success: false,
        error: errorMessage,
      })
      .send();
    next();
  }
);

const port = 9000;
app.listen(port, () => {
  logger.info(`Server started on port ${port}`);
});
