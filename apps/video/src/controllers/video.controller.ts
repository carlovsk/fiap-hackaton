import { Request, RequestHandler, Response } from 'express';
import { VideoService } from '../services/video.service';
import { logger } from '../utils/logger';

export class VideosController {
  private logger = logger('controllers:videos');
  private videoService: VideoService;

  constructor(videoService?: VideoService) {
    this.videoService = videoService || new VideoService();
  }

  list: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.sub;
    this.logger.info('List videos request', { userId });

    try {
      if (!userId) {
        this.logger.warn('Unauthorized access attempt');
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const videos = await this.videoService.listVideos(userId);

      this.logger.info('List videos completed', { userId, count: videos.length });
      res.status(200).json({ videos });
    } catch (error) {
      this.logger.error('List videos failed', {
        userId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  upload: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.sub;
    const filename = req.file?.originalname;
    this.logger.info('Upload video request', { userId, filename });

    try {
      if (!userId) {
        this.logger.warn('Unauthorized upload attempt');
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      if (!req.file) {
        this.logger.warn('Upload attempt without file', { userId });
        res.status(400).json({ message: 'No file provided' });
        return;
      }

      const video = await this.videoService.uploadVideo(userId, req.file);

      this.logger.info('Upload video completed', {
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
    } catch (error) {
      this.logger.error('Upload video failed', {
        userId,
        filename,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  download: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    const userId = req.user?.sub;
    const videoId = req.params.id;
    this.logger.info('Download video request', { userId, videoId });

    try {
      if (!userId) {
        this.logger.warn('Unauthorized download attempt', { videoId });
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const downloadData = await this.videoService.getVideoDownload(videoId, userId);

      if (!downloadData) {
        this.logger.warn('Video not found or not ready', { userId, videoId });
        res.status(404).json({ message: 'Video not found or not ready for download' });
        return;
      }

      this.logger.info('Download video completed', {
        userId,
        videoId,
        filename: downloadData.filename,
      });

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadData.filename}.zip"`);
      res.status(200).send(downloadData.content);
    } catch (error) {
      this.logger.error('Download video failed', {
        userId,
        videoId,
        error: error instanceof Error ? error.message : String(error),
      });
      res.status(500).json({ message: 'Error downloading file' });
    }
  };
}
