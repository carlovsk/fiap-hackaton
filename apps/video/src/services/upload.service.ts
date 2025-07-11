import { createStorageAdapter } from '../adapters/storage.factory';
import { StorageAdapter } from '../adapters/storage.interface';

export class UploadService {
  private storageAdapter: StorageAdapter;

  constructor() {
    this.storageAdapter = createStorageAdapter();
  }

  async uploadFile({ key, file }: { file: Express.Multer.File; key: string }): Promise<void> {
    await this.storageAdapter.uploadFile({ key, file });
  }

  async downloadFile(key: string): Promise<Buffer> {
    return await this.storageAdapter.downloadFile(key);
  }
}
