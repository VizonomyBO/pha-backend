import * as express from 'express';
import * as Multer from 'multer';
import { Response, NextFunction } from 'express';
import { RequestWithFile } from '../@types';
import { generateRandomNameWithExtension } from '../utils';
import ImageUploadService from '../services/ImageUpload.service';

const router = express.Router();

router.get('/', async (_: never, res: Response) => {
  res.json({ success: true, message: 'Storage Working' });
});

const upload = ImageUploadService.getUploadSingle();

router.post('/', async (req: RequestWithFile, res: Response, next: NextFunction) => {
  upload(req, res, async (err: string | Multer.MulterError | Error) => {
    if (err) {
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
    }
    
    if (!req.file) {
      res.status(400).json({ success: false, message: 'No file uploaded' });
      return;
    }
  
    const name = generateRandomNameWithExtension(req.file.mimetype.split('/')[1]);
    const blob = ImageUploadService.getBucket().file(name);

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
      const publicUrl = ImageUploadService.getPublicURL(blob.name);
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
