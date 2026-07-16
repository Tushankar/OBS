import { useRef, useState } from 'react';
import api, { apiError } from '../../lib/api';
import { useApp } from '../../context/AppContext';

// Multi-image uploader for events. `value` is an array of image URLs — the
// FIRST one is the primary (used as the event banner everywhere); the rest
// show as the public page's photo gallery. Upload replaces URL-pasting: files
// go to POST /uploads/images and we store the returned URLs.
export default function ImagesUploader({ value = [], onChange, max = 8, disabled = false }) {
  const { pushToast } = useApp();
  const inputRef = useRef(null);
  const [busy, setBusy] = useState(false);

  const pick = () => inputRef.current?.click();

  async function handleFiles(fileList) {
    const files = Array.from(fileList || []).slice(0, max - value.length);
    if (!files.length) return;
    const bad = files.find((f) => !/^image\/(jpeg|png|webp|gif)$/.test(f.type));
    if (bad) { pushToast(`"${bad.name}" isn't a supported image (JPG, PNG, WEBP, GIF)`, false); return; }
    const big = files.find((f) => f.size > 5 * 1024 * 1024);
    if (big) { pushToast(`"${big.name}" is over 5MB`, false); return; }
    setBusy(true);
    try {
      const urls = await api.uploadImages(files);
      onChange([...value, ...urls].slice(0, max));
      pushToast(urls.length === 1 ? 'Image uploaded' : `${urls.length} images uploaded`);
    } catch (e) {
      pushToast(apiError(e, 'Upload failed — try again'), false);
    } finally {
      setBusy(false);
      if (inputRef.current) inputRef.current.value = '';
    }
  }

  const makePrimary = (i) => onChange([value[i], ...value.filter((_, idx) => idx !== i)]);
  const remove = (i) => onChange(value.filter((_, idx) => idx !== i));

  return (
    <div>
      <input
        ref={inputRef}
        type="file"
        accept="image/jpeg,image/png,image/webp,image/gif"
        multiple
        className="hidden"
        onChange={(e) => handleFiles(e.target.files)}
      />

      {value.length > 0 && (
        <div className="mb-3 grid grid-cols-2 gap-3 sm:grid-cols-3">
          {value.map((url, i) => (
            <div key={url} className="group relative overflow-hidden rounded-lg border border-line">
              <img src={url} alt={i === 0 ? 'Primary image' : `Gallery image ${i}`} className="h-28 w-full object-cover" />
              {i === 0 ? (
                <span className="absolute left-1.5 top-1.5 rounded-full bg-brand px-2 py-0.5 text-[10px] font-bold uppercase tracking-wide text-white">Primary</span>
              ) : (
                <button
                  type="button"
                  onClick={() => makePrimary(i)}
                  disabled={disabled}
                  className="absolute left-1.5 top-1.5 rounded-full bg-black/55 px-2 py-0.5 text-[10px] font-semibold text-white opacity-0 transition group-hover:opacity-100"
                >
                  Make primary
                </button>
              )}
              <button
                type="button"
                onClick={() => remove(i)}
                disabled={disabled}
                aria-label="Remove image"
                className="absolute right-1.5 top-1.5 grid h-6 w-6 place-items-center rounded-full bg-black/55 text-xs text-white opacity-0 transition hover:bg-black/75 group-hover:opacity-100"
              >
                ✕
              </button>
            </div>
          ))}
        </div>
      )}

      {value.length < max && (
        <button
          type="button"
          onClick={pick}
          disabled={busy || disabled}
          className="flex h-24 w-full flex-col items-center justify-center gap-1 rounded-lg border-2 border-dashed border-line text-[13px] text-ink-mute transition hover:border-brand hover:text-brand disabled:opacity-60"
        >
          {busy ? (
            <span className="flex items-center gap-2"><span className="h-4 w-4 animate-spin rounded-full border-2 border-line border-t-brand" /> Uploading…</span>
          ) : (
            <>
              <span className="text-xl leading-none">＋</span>
              <span>{value.length === 0 ? 'Upload images (first becomes the banner)' : `Add more images (${value.length}/${max})`}</span>
            </>
          )}
        </button>
      )}
      <p className="mt-1.5 text-[11.5px] text-ink-faint">JPG, PNG, WEBP or GIF · up to 5MB each · max {max}. The primary image is the event banner; extra images appear as a photo gallery on the event page.</p>
    </div>
  );
}
