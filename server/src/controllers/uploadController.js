import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadImage, cloudinaryConfigured } from '../utils/uploader.js';

// POST /api/uploads  { image: <data URL>, folder? }  ->  { url }
// Uploads to Cloudinary when configured; otherwise returns the data URL so the
// feature still works (stored inline) without external setup.
export const uploadImageHandler = asyncHandler(async (req, res) => {
  const { image, folder } = req.body;
  if (!image || typeof image !== 'string' || !image.startsWith('data:image/')) {
    throw new ApiError(400, 'A valid image is required');
  }
  if (cloudinaryConfigured()) {
    const url = await uploadImage(image, folder || 'gpsfdk');
    return res.json({ url, stored: 'cloudinary' });
  }
  res.json({ url: image, stored: 'inline' });
});
