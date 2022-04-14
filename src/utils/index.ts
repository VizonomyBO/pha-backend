import { ValidateFunction } from "ajv";
import { MulterFile } from '../@types';
import ImageUploadService from '../services/ImageUpload.service';

export const generateRandomName = (): string => {
  const randomName = Math.random()
    .toString(36)
    .substring(2, 15);
  return `${randomName}-${Date.now()}`;
}

export const generateRandomNameWithExtension = (extension: string): string => {
  return `${generateRandomName()}.${extension}`;
}

export const isImageMymeType = (mimeType: string): boolean => {
  return mimeType.startsWith('image/');
}

export const validationErrorToString = (validator: ValidateFunction) => {
  let errorMessage: string = "";
  validator.errors?.forEach((error) => {
    errorMessage += "[" + error.instancePath + "]" + " " + error.message;
  });
  return errorMessage;
}

export const uploadFilesToGoogle = (files: MulterFile[]) => {
  if (!files) {
    return [];
  }
  return files.map((file) => {
    return new Promise((resolve, reject) => {
      const name = generateRandomNameWithExtension(file.mimetype.split('/')[1]);
      const blob = ImageUploadService.getBucket().file(name);

      const blobStream = blob.createWriteStream({
        metadata: {
          contentType: file.mimetype
        },
        resumable: false,
        public: true
      });

      blobStream.on('error', err => {
        console.error(err);
        reject(err);
      });

      blobStream.on('finish', async () => {
        const publicUrl = ImageUploadService.getPublicURL(blob.name);
        resolve(publicUrl);
      });
      blobStream.end(file.buffer);
    });
  })
};
