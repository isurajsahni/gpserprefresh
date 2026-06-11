import { useState } from 'react';
import { ImagePlus, X, Loader2 } from 'lucide-react';
import api from '../../api/client';
import { fileToCompressedDataUrl } from '../../lib/upload';

// Drop-in image attach control. Compresses the chosen image, uploads it via
// /uploads, and reports the resulting URL through onChange. `value` is the
// current image URL (empty when none).
export default function ImageUpload({ value, onChange, folder = 'gpsfdk', label = 'Attach image' }) {
  const [busy, setBusy] = useState(false);
  const [err, setErr] = useState('');

  const handle = async (e) => {
    const file = e.target.files?.[0];
    e.target.value = ''; // allow re-selecting the same file
    if (!file) return;
    if (!file.type.startsWith('image/')) {
      setErr('Please choose an image file');
      return;
    }
    setErr('');
    setBusy(true);
    try {
      const dataUrl = await fileToCompressedDataUrl(file);
      const { data } = await api.post('/uploads', { image: dataUrl, folder });
      onChange(data.url);
    } catch (e2) {
      setErr(e2.message || 'Upload failed');
    } finally {
      setBusy(false);
    }
  };

  return (
    <div>
      {value ? (
        <div className="relative inline-block">
          <a href={value} target="_blank" rel="noreferrer">
            <img src={value} alt="attachment" className="h-28 w-28 rounded-lg border border-gray-200 object-cover" />
          </a>
          <button
            type="button"
            onClick={() => onChange('')}
            className="absolute -right-2 -top-2 rounded-full bg-red-500 p-1 text-white shadow hover:bg-red-600"
            title="Remove image"
          >
            <X size={12} />
          </button>
        </div>
      ) : (
        <label className="flex h-28 w-28 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-gray-300 text-center text-gray-400 transition hover:border-brand-400 hover:text-brand-600">
          {busy ? <Loader2 size={20} className="animate-spin" /> : <ImagePlus size={20} />}
          <span className="px-1 text-[11px] leading-tight">{busy ? 'Uploading…' : label}</span>
          <input type="file" accept="image/*" className="hidden" onChange={handle} disabled={busy} />
        </label>
      )}
      {err && <p className="mt-1 text-xs text-red-600">{err}</p>}
    </div>
  );
}
