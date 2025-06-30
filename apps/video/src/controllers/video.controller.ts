import { Request, RequestHandler, Response } from 'express';
import { StorageService } from '../services/storage.service';
import { logger } from '../utils/logger';

export class VideosController {
  logger = logger('controllers:videos');
  storageService: StorageService;

  constructor() {
    this.storageService = new StorageService();
  }

  list: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Register endpoint hit', {
      user: req.user,
    });

    const userId = req.user?.sub;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const videos = await this.storageService.list(userId);

    res.status(200).json({ videos });
  };

  upload: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    this.logger.info('Upload endpoint hit', {
      user: req.user,
      file: req.file,
    });

    const userId = req.user?.sub;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    if (!req.file) {
      res.status(400).json({ message: 'No file provided' });
      return;
    }

    const video = await this.storageService.upload({
      userId,
      file: req.file,
    });

    this.logger.info('Video uploaded successfully', {
      videoId: video.id,
      userId,
      filename: video.filename,
    });

    res.status(201).json({
      message: 'Video uploaded successfully',
      video: {
        id: video.id,
        filename: video.filename,
        status: video.status,
      },
    });
  };
}
