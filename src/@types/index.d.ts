import { Request } from 'express';
export interface MulterFile {
  key: string // Available using `S3`.
  path: string // Available using `DiskStorage`.
  mimetype: string
  originalname: string
  size: number,
  buffer: Buffer
};

export type RequestWithFile = Request & { file: MulterFile };