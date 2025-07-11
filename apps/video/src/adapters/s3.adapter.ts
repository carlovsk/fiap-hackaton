import { GetObjectCommand, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'fs';
import { buffer } from 'stream/consumers';
import { pipeline } from 'stream/promises';
import { env } from '../utils/env';
import { logger } from '../utils/logger';
import { StorageAdapter } from './storage.interface';

export class S3Adapter implements StorageAdapter {
  private s3Client: S3Client;
  private logger = logger('adapters:s3');

  constructor() {
    if (!env.S3_BUCKET) {
      throw new Error('S3 configuration is incomplete. Required: S3_BUCKET');
    }

    this.s3Client = new S3Client({
      region: env.AWS_REGION,
      // No credentials needed - using IAM roles in ECS
    });
  }

  getBucketName(): string {
    return env.S3_BUCKET!;
  }

  async uploadFile({ key, file }: { key: string; file: Express.Multer.File }): Promise<void> {
    this.logger.info('Uploading file to S3', {
      key,
      fileName: file.originalname,
      size: file.size,
    });

    await this.s3Client.send(
      new PutObjectCommand({
        Bucket: this.getBucketName(),
        Key: key,
        Body: file.buffer,
        ContentType: file.mimetype,
      }),
    );

    this.logger.info('File upload completed', { key });
  }

  async uploadFileFromPath({
    key,
    path,
    contentType,
  }: {
    key: string;
    path: string;
    contentType: string;
  }): Promise<void> {
    this.logger.info('Uploading file from path to S3', { key, path, contentType });

    const stream = fs.createReadStream(path);
    const command = new PutObjectCommand({
      Bucket: this.getBucketName(),
      Key: key,
      Body: stream,
      ContentType: contentType,
    });

    await this.s3Client.send(command);

    this.logger.info('File upload from path completed', { key });
  }

  async downloadFile(key: string): Promise<Buffer> {
    this.logger.info('Downloading file from S3', { key });

    const command = new GetObjectCommand({
      Bucket: this.getBucketName(),
      Key: key,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      this.logger.error('File not found in storage', { key });
      throw new Error(`File not found: ${key}`);
    }

    const fileBuffer = await buffer(response.Body as NodeJS.ReadableStream);
    this.logger.info('File download completed', { key, size: fileBuffer.length });

    return fileBuffer;
  }

  async downloadFileToPath({ key, targetPath }: { key: string; targetPath: string }): Promise<void> {
    this.logger.info('Downloading file from S3 to path', { key, targetPath });

    const command = new GetObjectCommand({
      Bucket: this.getBucketName(),
      Key: key,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      this.logger.error('File not found in storage', { key });
      throw new Error(`File not found: ${key}`);
    }

    const writeStream = fs.createWriteStream(targetPath);
    await pipeline(response.Body as NodeJS.ReadableStream, writeStream);

    this.logger.info('File download to path completed', { key, targetPath });
  }
}
