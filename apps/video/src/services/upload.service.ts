import { CreateBucketCommand, GetObjectCommand, NoSuchBucket, PutObjectCommand, S3Client } from '@aws-sdk/client-s3';
import { buffer } from 'stream/consumers';
import { env } from '../utils/env';
import { logger } from '../utils/logger';

export class UploadService {
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

  async uploadFile({ key, file }: { file: Express.Multer.File; key: string }): Promise<void> {
    try {
      this.logger.info('Uploading file to S3', {
        key,
        fileName: file.originalname,
        size: file.size,
        mimetype: file.mimetype,
        env,
      });

      await this.s3Client.send(
        new PutObjectCommand({
          Bucket: env.MINIO_BUCKET,
          Key: key,
          Body: file.buffer,
          ContentType: file.mimetype,
        }),
      );

      this.logger.info('File uploaded successfully', { key });
    } catch (error) {
      if (error instanceof NoSuchBucket) {
        await this.createBucketIfNotExists();
        await this.uploadFile({ key, file });
        return;
      }

      throw error;
    }
  }

  async downloadFile(key: string): Promise<Buffer> {
    const command = new GetObjectCommand({
      Bucket: env.MINIO_BUCKET,
      Key: key,
    });

    const response = await this.s3Client.send(command);

    if (!response.Body) {
      throw new Error(`File not found: ${key}`);
    }

    return await buffer(response.Body as NodeJS.ReadableStream);
  }

  private async createBucketIfNotExists(): Promise<void> {
    await this.s3Client.send(
      new CreateBucketCommand({
        Bucket: env.MINIO_BUCKET,
      }),
    );

    this.logger.info(`Bucket ${env.MINIO_BUCKET} created successfully.`);
  }
}
