import * as express from 'express';
import * as Multer from 'multer';
import { Storage } from '@google-cloud/storage';
import { Response, NextFunction } from 'express';
import { RequestWithFile } from '../@types';
import { generateRandomNameWithExtension, isImageMymeType } from '../utils';

const router = express.Router();

const storage = new Storage();

const multer = Multer({
  storage: Multer.memoryStorage(),
  limits: {
    fileSize: +process.env.MAX_FILE_SIZE_IN_BYTES,
  },
});
const bucket = storage.bucket(process.env.GCLOUD_STORAGE_BUCKET);

const getPublicURL = (bucketname: string, filename: string): string => {
  return `https://storage.googleapis.com/${bucketname}/${filename}`;
}

router.get('/', async (_: never, res: Response) => {
  res.json({ success: true, message: 'Storage Working' });
});

router.post('/', multer.single('file'), async (req: RequestWithFile, res: Response, next: NextFunction) => {
  if (!req.file) {
    res.status(400).json({ success: false, message: 'No file uploaded' });
    return;
  }

  if (req.file.size > +process.env.MAX_FILE_SIZE_IN_BYTES) {
    res.status(400).json({ success: false, message: 'File is too large' });
    return;
  }

  if (!isImageMymeType(req.file.mimetype)) {
    res.status(400).json({ success: false, message: 'File is not an image' });
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

export default router;
