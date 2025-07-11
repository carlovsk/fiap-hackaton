import archiver from 'archiver';
import { spawn } from 'child_process';
import fs from 'fs';
import path from 'path';
import { createStorageAdapter } from '../adapters/storage.factory';
import { StorageAdapter } from '../adapters/storage.interface';
import { logger } from '../utils/logger';

export class FileService {
  private storageAdapter: StorageAdapter;
  private logger = logger('services:file');

  constructor() {
    this.storageAdapter = createStorageAdapter();
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
    await this.storageAdapter.uploadFileFromPath({ key, path, contentType });
  }

  async downloadFile({ key, targetPath }: { key: string; targetPath: string }): Promise<void> {
    await this.storageAdapter.downloadFileToPath({ key, targetPath });
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
}
