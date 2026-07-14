import { asyncHandler } from '../utils/asyncHandler.js';
import { ApiError } from '../utils/ApiError.js';
import { uploadImage, cloudinaryConfigured } from '../utils/uploader.js';

// POST /api/uploads  { image|file: <data URL>, folder? }  ->  { url }
// Accepts an image or an audio clip (voice messages). Uploads to Cloudinary when
// configured; otherwise returns the data URL so the feature still works (stored
// inline) without external setup.
export const uploadImageHandler = asyncHandler(async (req, res) => {
  const data = req.body.image || req.body.file;
  const { folder } = req.body;
  if (!data || typeof data !== 'string' || !/^data:(image|audio)\//.test(data)) {
    throw new ApiError(400, 'A valid image or audio file is required');
  }
  const isAudio = data.startsWith('data:audio/');
  if (cloudinaryConfigured()) {
    const url = await uploadImage(data, folder || 'gpsfdk', isAudio ? 'video' : 'image');
    return res.json({ url, stored: 'cloudinary' });
  }
  res.json({ url: data, stored: 'inline' });
});
