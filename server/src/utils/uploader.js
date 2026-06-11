import crypto from 'crypto';

const cfg = () => ({
  cloud: process.env.CLOUDINARY_CLOUD_NAME,
  key: process.env.CLOUDINARY_API_KEY,
  secret: process.env.CLOUDINARY_API_SECRET,
});

export function cloudinaryConfigured() {
  const { cloud, key, secret } = cfg();
  return !!(cloud && key && secret);
}

/**
 * Upload an image (a base64 data URL or a remote URL) to Cloudinary using a
 * signed request — no SDK or multipart parsing needed. Returns the secure URL.
 */
export async function uploadImage(file, folder = 'gpsfdk') {
  const { cloud, key, secret } = cfg();
  const timestamp = Math.floor(Date.now() / 1000);

  // Signature = sha1 of the alphabetically-sorted params (excluding file,
  // api_key, signature) followed by the API secret.
  const toSign = `folder=${folder}&timestamp=${timestamp}`;
  const signature = crypto.createHash('sha1').update(toSign + secret).digest('hex');

  const form = new FormData();
  form.append('file', file);
  form.append('api_key', key);
  form.append('timestamp', String(timestamp));
  form.append('folder', folder);
  form.append('signature', signature);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloud}/image/upload`, {
    method: 'POST',
    body: form,
  });
  const json = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(json?.error?.message || `Cloudinary upload failed (${res.status})`);
  return json.secure_url;
}
