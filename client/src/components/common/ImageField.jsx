import { useRef, useState } from 'react';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';
import { inputCls as kitInput } from '../portal/Kit';
import { AdminIcon } from '../admin/AdminIcons';

// Single-image field: paste a URL OR upload a file (→ POST /uploads/images,
// which returns an absolute URL). Stores one URL string via onChange(value).
// Reused by every admin/organizer form that takes an image URL so they all get
// upload + a live thumbnail with a remove button.
export default function ImageField({
  value,
  onChange,
  placeholder = 'Paste an image URL or upload →',
  inputClassName,
  aspect = 'aspect-[16/7]',
  fit = 'cover', // 'cover' for photos/covers, 'contain' for logos
  showPreview = true, // set false when the parent already shows its own thumbnail
  disabled = false,
}) {
  const { pushToast } = useApp();
  const ref = useRef(null);
  const [busy, setBusy] = useState(false);
  const inputCls = inputClassName || kitInput;

  const upload = async (fileList) => {
    const file = (fileList || [])[0];
    if (!file) return;
    if (!/^image\/(jpeg|png|webp|gif)$/.test(file.type)) { pushToast('Use a JPG, PNG, WEBP or GIF', false); return; }
    if (file.size > 5 * 1024 * 1024) { pushToast('Image must be under 5MB', false); return; }
    setBusy(true);
    try {
      const urls = await api.uploadImages([file]);
      if (urls?.[0]) { onChange(urls[0]); pushToast('Image uploaded'); }
    } catch (e) {
      pushToast(apiError(e, 'Upload failed'), false);
    } finally {
      setBusy(false);
      if (ref.current) ref.current.value = '';
    }
  };

  return (
    <div className="flex flex-col gap-2">
      <div className="flex gap-2">
        <input
          value={value || ''}
          onChange={(e) => onChange(e.target.value)}
          placeholder={placeholder}
          disabled={disabled || busy}
          className={`${inputCls} min-w-0 flex-1`}
        />
        <input ref={ref} type="file" accept="image/jpeg,image/png,image/webp,image/gif" className="hidden" onChange={(e) => upload(e.target.files)} />
        <button
          type="button"
          onClick={() => ref.current?.click()}
          disabled={disabled || busy}
          className="inline-flex shrink-0 items-center gap-1.5 rounded-[10px] border border-[#DCE3EC] bg-white px-3 text-[13px] font-medium text-[#374151] transition hover:border-[#C99E25] hover:text-[#111827] disabled:opacity-60"
        >
          {busy ? 'Uploading…' : <><AdminIcon.Upload size={14} /> Upload</>}
        </button>
      </div>
      {value && showPreview ? (
        <div className="relative overflow-hidden rounded-lg border border-[#EEF2F6] bg-[#FAFBFC]">
          <img src={value} alt="" className={`w-full ${aspect} ${fit === 'contain' ? 'bg-white object-contain p-3' : 'object-cover'}`} />
          <button
            type="button"
            onClick={() => onChange('')}
            disabled={disabled}
            className="absolute right-2 top-2 grid h-7 w-7 place-items-center rounded-full bg-black/50 text-white transition hover:bg-black/70"
            aria-label="Remove image"
          >
            <AdminIcon.Close size={13} />
          </button>
        </div>
      ) : null}
    </div>
  );
}
