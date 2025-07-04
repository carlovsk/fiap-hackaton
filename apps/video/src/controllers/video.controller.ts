import { Request, RequestHandler, Response } from 'express';
import { VideoProcessedPayload } from '../schemas/queue.schema';
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

  /**
   * This one is called by the worker when the video processing is done. Is not an endpoint.
   */
  handleProcessedVideo = async (payload: VideoProcessedPayload): Promise<void> => {
    this.logger.info('Processing video completed', payload);

    // Here you can implement any logic needed after the video is processed
    // For example, updating the video status in the database or notifying the user
    await this.storageService.updateStatus(payload.videoId, {
      status: payload.status,
      downloadKey: payload.downloadKey,
    });

    this.logger.info('Video status updated to processed', {
      videoId: payload.videoId,
    });
  };

  download: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.sub;
    const videoId = req.params.id;

    if (!userId) {
      res.status(401).json({ message: 'Unauthorized' });
      return;
    }

    const { content } = await this.storageService.download({
      userId,
      videoId,
    });
    try {
      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${videoId}.zip"`);
      res.status(200).send(content);
    } catch (err) {
      console.error('Download failed:', err);
      res.status(500).json({ message: 'Error downloading file' });
    }
  };
}
