import * as express from 'express';
import * as Multer from 'multer';
import { Storage } from '@google-cloud/storage';
import { Response, NextFunction } from 'express';
import { RequestWithFile } from '../@types';
import { generateRandomNameWithExtension, isImageMymeType } from '../utils';
import config from '../config';

const router = express.Router();

const storage = new Storage();

const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: + config.constants.maxFileSize,
  },
  fileFilter: (_: never, file: Express.Multer.File, cb: (error: Error | null, acceptFile: boolean) => void) => {
    if (!isImageMymeType(file.mimetype)) {
      return cb(new Error('Invalid file type'), false);
    }
    cb(null, true);
  }
});
const bucket = storage.bucket(config.gcloud.bucket);

const getPublicURL = (bucketname: string, filename: string): string => {
  return `https://storage.googleapis.com/${bucketname}/${filename}`;
}

router.get('/', async (_: never, res: Response) => {
  res.json({ success: true, message: 'Storage Working' });
});

const upload = multer.single('file');


router.post('/', async (req: RequestWithFile, res: Response, next: NextFunction) => {
  upload(req, res, async (err: string | Multer.MulterError | Error) => {
    console.log(err, typeof err);
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
    
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
  
    const name = generateRandomNameWithExtension(req.file.mimetype.split('/')[1]);
    const blob = bucket.file(name);
    
    const blobStream = blob.createWriteStream({
      metadata: {
        contentType: req.file.mimetype
      },
      resumable: false,
      public: true
    });
    
    blobStream.on('error', err => {
      console.error(err);
      next(err);
    });
  
    blobStream.on('finish', async () => {
      const publicUrl = getPublicURL(bucket.name, blob.name);
      try {
        await blob.makePublic();
        console.info(`Successfully uploaded to ${publicUrl}`);
        res.status(200).send({url: publicUrl, success: true});
      } catch (error) {
        console.error(error);
        res.status(500).send({error: error, success: false});
      }
    });
  
    blobStream.end(req.file.buffer);
  });
});

export default router;
