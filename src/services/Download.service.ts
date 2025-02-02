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
    await this.generateImagesFolders(rows, folderPath);

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
      // console.log('finished');
      rmSync(folderPath, { recursive: true, force: true });
      rmSync(outputPath);
    });
  }

  async generateImagesFolders(rows: PhaRetailer[], folderPath: string) {
    const indexMap = {};
    const promises = rows.reduce((arr, row) => {
      let index = indexMap[row.name] ?? 0;
      indexMap[row.name] = index + 1;
      const imageFolderPath = folderPath.concat(`/${row.name}_${index + 1}`);
      mkdirSync(imageFolderPath);
      const promises = row.imagelinks.split(',')
        .filter(r => (!!r && r.startsWith('http')))
        .map((image) => {
          return this.downloadImage(image, imageFolderPath);
        });
      return [...arr, ...promises]
    }, []);
    await Promise.all(promises);
  }

  generateCsv(rows: PhaRetailer[], folderPath: string) {
    const json2csv = new Parser({ fields: Object.keys(rows[0]) });
    const csv = json2csv.parse(rows);
    const now = new Date();
    const filename = `${FILENAME_CSV_RETAILER}-${now.toISOString().split('T')[0]}.${EXTENSION_CSV}`;
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
