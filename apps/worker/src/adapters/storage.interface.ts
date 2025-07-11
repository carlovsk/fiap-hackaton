import { Buffer } from 'buffer';

export interface StorageAdapter {
  uploadFile(params: { key: string; file: Express.Multer.File }): Promise<void>;
  uploadFileFromPath(params: { key: string; path: string; contentType: string }): Promise<void>;
  downloadFile(key: string): Promise<Buffer>;
  downloadFileToPath(params: { key: string; targetPath: string }): Promise<void>;
  getBucketName(): string;
}
