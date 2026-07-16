import { useEffect, useState } from 'react';
import { Modal, Btn, Field } from '../portal/Kit';

// Professional replacement for the old window.prompt reject flows: a modal with
// a textarea reason. `required` enforces a minimum length before submitting.
export default function ReasonDialog({ open, onClose, onSubmit, title, subtitle, label = 'Reason', placeholder = '', required = true, confirmLabel = 'Submit', danger = true, busy = false }) {
  const [reason, setReason] = useState('');
  useEffect(() => { if (open) setReason(''); }, [open]);

  const invalid = required && reason.trim().length < 3;

  return (
    <Modal
      open={open}
      onClose={busy ? undefined : onClose}
      title={title}
      subtitle={subtitle}
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn variant={danger ? 'danger' : 'primary'} onClick={() => onSubmit(reason.trim())} disabled={busy || invalid}>
            {busy ? 'Working…' : confirmLabel}
          </Btn>
        </>
      }
    >
      <Field label={label} hint={required ? 'Minimum 3 characters — this is shared with the recipient.' : 'Optional — shared with the recipient if provided.'}>
        <textarea
          value={reason}
          onChange={(e) => setReason(e.target.value)}
          placeholder={placeholder}
          rows={4}
          autoFocus
          className="w-full resize-y rounded-md border border-[#DCE3EC] bg-white px-3 py-2 text-[13.5px] leading-relaxed text-[#111827] outline-none transition placeholder:text-[#9CA3AF] focus:border-[#C99E25] focus:ring-4 focus:ring-[#C99E25]/10"
        />
      </Field>
    </Modal>
  );
}
