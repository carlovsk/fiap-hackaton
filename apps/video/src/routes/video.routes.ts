import { Router } from 'express';
import { VideosController } from '../controllers/video.controller';
import { authenticate, upload } from '../middlewares';

const router = Router();
const videosController = new VideosController();

// Video routes
router.get('/videos/status', authenticate, videosController.list);
router.post('/videos/upload', authenticate, upload.single('file'), videosController.upload);
router.get('/videos/:id/download', authenticate, videosController.download);

export { router as videoRoutes };
