import { CreateBucketCommand, GetObjectCommand, NoSuchBucket, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import fs from 'fs';
import path from 'path';
import { buffer } from 'stream/consumers';
import { pipeline } from 'stream/promises';
import { env } from '../../../utils/env';
import { logger } from '../../../utils/logger';
import { StorageAdapter } from '../interface';

export class MinIOAdapter implements StorageAdapter {
  private s3Client: S3Client;
  private logger = logger('adapters:minio');

  constructor() {
    if (!env.MINIO_ENDPOINT || !env.MINIO_ACCESS_KEY || !env.MINIO_SECRET_KEY || !env.MINIO_BUCKET) {
      throw new Error(
        'MinIO configuration is incomplete. Required: MINIO_ENDPOINT, MINIO_ACCESS_KEY, MINIO_SECRET_KEY, MINIO_BUCKET',
      );
    }

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

  getBucketName(): string {
    return env.MINIO_BUCKET!;
  }

  async uploadFile({ key, file }: { key: string; file: Express.Multer.File }): Promise<void> {
    try {
      this.logger.info('Uploading file to MinIO', {
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
    } catch (error) {
      if (error instanceof NoSuchBucket) {
        this.logger.info('Bucket not found, creating', { bucket: this.getBucketName() });
        await this.createBucketIfNotExists();
        await this.uploadFile({ key, file });
        return;
      }

      this.logger.error('File upload failed', {
        key,
        error: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }
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
    this.logger.info('Uploading file from path to MinIO', { key, path, contentType });

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
    this.logger.info('Downloading file from MinIO', { key });

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
    this.logger.info('Downloading file from MinIO to path', { key, targetPath });

    // Ensure the target directory exists
    const targetDir = path.dirname(targetPath);

    if (!fs.existsSync(targetDir)) {
      fs.mkdirSync(targetDir, { recursive: true });
      this.logger.debug('Created target directory', { targetDir });
    }

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

  private async createBucketIfNotExists(): Promise<void> {
    await this.s3Client.send(
      new CreateBucketCommand({
        Bucket: this.getBucketName(),
      }),
    );

    this.logger.info(`MinIO bucket ${this.getBucketName()} created successfully.`);
  }
}
