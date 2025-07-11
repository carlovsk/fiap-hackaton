import { env } from '../../utils/env';
import { logger } from '../../utils/logger';
import { MinIOAdapter } from './implementations/minio.adapter';
import { S3Adapter } from './implementations/s3.adapter';
import { StorageAdapter } from './interface';

const log = logger('adapters:storage-factory');

export function createStorageAdapter(): StorageAdapter {
  const adapter = env.STORAGE_ADAPTER;

  log.info('Creating storage adapter', { adapter });

  switch (adapter) {
    case 's3':
      return new S3Adapter();
    case 'minio':
      return new MinIOAdapter();
    default:
      throw new Error(`Unknown storage adapter: ${adapter}`);
  }
}
