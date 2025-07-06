import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import archiver from 'archiver';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { pipeline } from 'stream/promises';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

export class FileService {
  s3Client: S3Client;
  logger = logger('services:storage');

  constructor() {
    this.s3Client = new S3Client({
      endpoint: env.MINIO_ENDPOINT,
      region: env.AWS_REGION,
      credentials: {
        accessKeyId: env.MINIO_ACCESS_KEY,
        secretAccessKey: env.MINIO_SECRET_KEY,
      },
      forcePathStyle: true,
    });
  }

  async uploadFile({
    key,
    contentType,
    path,
  }: {
    contentType: 'application/zip';
    key: string;
    path: string;
  }): Promise<void> {
    this.logger.info('Uploading file', { key, path, contentType });

    const stream = fs.createReadStream(path);
    const command = new PutObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
      Body: stream,
      ContentType: contentType,
    });

    await this.s3Client.send(command);

    this.logger.info('File upload completed', { key });
  }

  async downloadFile({ key, targetPath }: { key: string; targetPath: string }): Promise<void> {
    this.logger.info('Downloading file', { key, targetPath });

    const command = new GetObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      this.logger.error('File not found in storage', { key });
      throw new Error(`File not found: ${key}`);
    }

    await this.ensureDirectoryExists(path.dirname(targetPath));

    const writeStream = fs.createWriteStream(targetPath);
    await pipeline(response.Body as NodeJS.ReadableStream, writeStream);

    this.logger.info('File download completed', { key, targetPath });
  }

  async zipDirectory(sourceDir: string, zipPath: string): Promise<void> {
    this.logger.info('Compressing directory', { sourceDir, zipPath });

    return new Promise((resolve, reject) => {
      const output = fs.createWriteStream(zipPath);
      const archive = archiver('zip', { zlib: { level: 9 } });

      output.on('close', () => {
        this.logger.info('Directory compression completed', {
          zipPath,
          size: archive.pointer(),
        });
        resolve();
      });
      archive.on('error', reject);

      archive.pipe(output);
      archive.directory(sourceDir, false);
      archive.finalize();
    });
  }

  async extractFrames(inputPath: string, outputDir: string): Promise<void> {
    this.logger.info('Extracting frames from video', { inputPath, outputDir });

    if (!fs.existsSync(outputDir)) {
      fs.mkdirSync(outputDir, { recursive: true });
    }

    const args = [
      '-i',
      inputPath,
      '-vf',
      'fps=1', // 1 frame per second
      path.join(outputDir, 'frame-%04d.jpg'),
    ];

    return new Promise((resolve, reject) => {
      const ffmpeg = spawn('ffmpeg', args);

      ffmpeg.stderr.on('data', (data) => {
        this.logger.debug(`[ffmpeg] ${data}`);
      });

      ffmpeg.on('close', (code) => {
        if (code === 0) {
          this.logger.info('Frame extraction completed', { outputDir });
          resolve();
        } else {
          this.logger.error('Frame extraction failed', { code, inputPath });
          reject(new Error(`ffmpeg exited with code ${code}`));
        }
      });
    });
  }

  private async ensureDirectoryExists(dir: string): Promise<void> {
    if (!fs.existsSync(dir)) {
      fs.mkdirSync(dir, { recursive: true });
      this.logger.info('Created directory', { dir });
    } else {
      this.logger.info('Directory already exists', { dir });
    }
  }
}
