import multer from 'multer';

// In-memory storage for files before processing (e.g., uploading to S3 or parsing directly)
const storage = multer.memoryStorage();

export const uploadMiddleware = multer({
  storage,
  limits: {
    fileSize: 50 * 1024 * 1024, // 50MB limit
  },
});
