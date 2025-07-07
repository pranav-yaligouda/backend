import multer from 'multer';
import path from 'path';
import fs from 'fs';

// Ensure uploads directory exists at backend/uploads (main root, not src/uploads)
const uploadsDir = path.resolve(__dirname, '../../uploads');
if (!fs.existsSync(uploadsDir)) {
  fs.mkdirSync(uploadsDir, { recursive: true });
}

const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, uploadsDir);
  },
  filename: function (req, file, cb) {
    const ext = path.extname(file.originalname);
    const uniqueSuffix = Date.now() + '-' + Math.round(Math.random() * 1E9);
    cb(null, uniqueSuffix + '-dish-image' + ext);
  }
});

const upload = multer({ storage });

export default upload;
