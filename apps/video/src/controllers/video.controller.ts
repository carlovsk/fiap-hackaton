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
    try {
      this.logger.info('List videos endpoint hit', {
        user: req.user,
      });

      const userId = req.user?.sub;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const videos = await this.videoService.listVideos(userId);

      res.status(200).json({ videos });
    } catch (error) {
      this.logger.error('Failed to list videos', { error, user: req.user });
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  upload: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
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

      const video = await this.videoService.uploadVideo(userId, req.file);

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
    } catch (error) {
      this.logger.error('Failed to upload video', { error, user: req.user });
      res.status(500).json({ message: 'Internal server error' });
    }
  };

  download: RequestHandler = async (req: Request, res: Response): Promise<void> => {
    try {
      const userId = req.user?.sub;
      const videoId = req.params.id;

      if (!userId) {
        res.status(401).json({ message: 'Unauthorized' });
        return;
      }

      const downloadData = await this.videoService.getVideoDownload(videoId, userId);

      if (!downloadData) {
        res.status(404).json({ message: 'Video not found or not ready for download' });
        return;
      }

      res.setHeader('Content-Type', 'application/zip');
      res.setHeader('Content-Disposition', `attachment; filename="${downloadData.filename}.zip"`);
      res.status(200).send(downloadData.content);
    } catch (error) {
      this.logger.error('Download failed', { error, videoId: req.params.id, user: req.user });
      res.status(500).json({ message: 'Error downloading file' });
    }
  };
}
