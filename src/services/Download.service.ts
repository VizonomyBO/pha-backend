import { PhaRetailer } from '@/@types/database';
import { mkdirSync, createWriteStream, writeFileSync, createReadStream, rmSync } from 'fs';
import * as http from 'https';
import { Parser } from 'json2csv';
import * as archiver from 'archiver';
import { Response } from 'express';

const FILENAME_CSV_RETAILER = 'PHA-retailer';
const EXTENSION_CSV = 'csv';
const EXTENSION_ZIP = 'zip';

class DownloadService {

  async generateZip(rows: PhaRetailer[], res: Response) {
    const folderPath = `./${new Date().getTime()}`;
    const outputPath = `${folderPath}.${EXTENSION_ZIP}`;

    mkdirSync(folderPath);
    this.generateCsv(rows, folderPath);
    this.generateImagesFolders(rows, folderPath);

    const output = createWriteStream(outputPath);
    const archive = archiver(EXTENSION_ZIP);
    const promise = new Promise((resolve, reject) => {
      output.on('close', function () {
        console.log(archive.pointer() + ' total bytes');
        console.log('archiver has been finalized and the output file descriptor has closed.');
        resolve(true);
      });
      
      archive.on('error', function(err){
        reject(err);
      });
      
      archive.pipe(output);
      archive.directory(folderPath, false);
      archive.finalize();
    });
    await promise;
    res.header('Content-Type', 'application/zip');
    const returnStream = createReadStream(outputPath);
    returnStream.pipe(res);
    returnStream.on('close', () => {
      console.log('finished');
      rmSync(folderPath, { recursive: true, force: true });
      rmSync(outputPath);
    });
  }

  generateImagesFolders(rows: PhaRetailer[], folderPath: string) {
    rows.forEach((row) => {
      const imageFolderPath = folderPath.concat(`/${row.retailer_id}`);
      mkdirSync(imageFolderPath);
      row.imagelinks.split(',')
        .filter(r => !!r)
        .forEach(async (image) => {
          await this.downloadImage(image, imageFolderPath);
        });
    });
  }

  generateCsv(rows: PhaRetailer[], folderPath: string) {
    const json2csv = new Parser({ fields: Object.keys(rows[0]) });
    const csv = json2csv.parse(rows);
    const now = new Date();
    const filename = `${FILENAME_CSV_RETAILER}-${now.toISOString()}.${EXTENSION_CSV}`;
    writeFileSync(`${folderPath}/${filename}`, csv);
  }

  async downloadImage(url, imageFolderPath) {
    const imageName = url.split('/')[url.split('/').length - 1];
    const file = createWriteStream(`${imageFolderPath}/${imageName}`);
    return new Promise((resolve) => {
      http.get(url, (response) => {
        response.pipe(file);
        file.on('finish', () => {
          file.close();
          resolve(true);
        });
      });
    });
  }

}

export default new DownloadService();
