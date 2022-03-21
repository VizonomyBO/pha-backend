import * as express from 'express';
import * as Multer from 'multer';
import { Storage } from '@google-cloud/storage';
import { Request, Response, NextFunction } from 'express';
import { MulterFile } from '../@types';
import { generateRandomNameWithExtension } from '../utils';

const router = express.Router();

const storage = new Storage();

const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});
const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);

router.get('/', async (_: never, res: Response) => {
  res.json({ success: true, message: 'Storage Working' });
});

router.post('/', multer.single('file'), async (req: Request & { file: MulterFile }, res: Response, next: NextFunction) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
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

  blobStream.on('finish', () => {
    const publicUrl = `https://storage.googleapis.com/${bucket.name}/${blob.name}`;
    blob.makePublic().then(() => {
      console.info(`Successfully uploaded to ${publicUrl}`);
      res.status(200).send({url: publicUrl, success: true});
    });
  });

  blobStream.end(req.file.buffer);

});

export default router;
