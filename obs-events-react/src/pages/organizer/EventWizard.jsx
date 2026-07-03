import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { Card, Btn, PageHead, Pill, formatPrice } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';

const STEPS = ['Basics', 'Banner', 'Venue', 'Tickets', 'Promos', 'Review'];
const CATS = ['Summit', 'Conference', 'Networking', 'Workshop', 'Webinar'];
const inputCls = 'h-10 w-full rounded-md border border-line bg-white px-3 text-sm text-ink outline-none transition focus:border-brand';

const Field = ({ label, children }) => (
  <div>
    <label className="mb-1 block text-[13px] font-semibold text-ink-soft">{label}</label>
    {children}
  </div>
);
const RowKV = ({ k, v }) => (
  <div className="flex justify-between gap-4 border-b border-line py-2 text-sm last:border-0">
    <span className="text-ink-mute">{k}</span>
    <span className="text-right font-medium text-ink">{v || <span className="text-ink-faint">—</span>}</span>
  </div>
);

export default function EventWizard() {
  const navigate = useNavigate();
  const { pushToast } = useApp();
  useEffect(() => { window.scrollTo(0, 0); }, []);

  const [step, setStep] = useState(1);
  const [form, setForm] = useState({
    title: '', category: CATS[0], chapter: '', description: '',
    isOnline: false, venueName: '', address: '', city: '', meetingLink: '',
    startAt: '', endAt: '',
    tickets: [{ name: 'General', price: '', quantity: '' }],
    promos: [],
  });
  const set = (k, v) => setForm((f) => ({ ...f, [k]: v }));

  const updRow = (key, i, k, v) => setForm((f) => ({ ...f, [key]: f[key].map((r, j) => (j === i ? { ...r, [k]: v } : r)) }));
  const addRow = (key, blank) => setForm((f) => ({ ...f, [key]: [...f[key], blank] }));
  const rmRow = (key, i) => setForm((f) => ({ ...f, [key]: f[key].filter((_, j) => j !== i) }));

  const submit = () => { pushToast('Event submitted for approval'); navigate('/organizer/events'); };

  return (
    <div className="mx-auto max-w-container px-4 pb-10 pt-6 sm:px-6">
      <PageHead title="Create event" subtitle="Complete all steps, then submit for approval." />

      <div className="mb-6 flex items-center gap-1 overflow-x-auto pb-1">
        {STEPS.map((label, i) => {
          const n = i + 1, on = n === step, done = n < step;
          return (
            <div key={label} className="flex shrink-0 items-center gap-1">
              <button onClick={() => setStep(n)} className="flex items-center gap-2">
                <span className={`flex h-7 w-7 items-center justify-center rounded-full text-[12px] font-bold ${on ? 'bg-brand text-white' : done ? 'bg-brand-soft text-brand' : 'bg-surface text-ink-mute'}`}>{done ? '✓' : n}</span>
                <span className={`text-[13px] font-semibold ${on ? 'text-ink' : 'text-ink-mute'}`}>{label}</span>
              </button>
              {n < 6 && <span className="mx-1 h-px w-5 bg-line" />}
            </div>
          );
        })}
      </div>

      <Card>
        {step === 1 && (
          <div className="grid gap-4">
            <Field label="Event title"><input className={inputCls} value={form.title} onChange={(e) => set('title', e.target.value)} placeholder="e.g. Founders Summit 2026" /></Field>
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Category">
                <select className={inputCls} value={form.category} onChange={(e) => set('category', e.target.value)}>
                  {CATS.map((c) => <option key={c}>{c}</option>)}
                </select>
              </Field>
              <Field label="Chapter"><input className={inputCls} value={form.chapter} onChange={(e) => set('chapter', e.target.value)} placeholder="e.g. Mumbai Founders" /></Field>
            </div>
            <Field label="Description"><textarea className={`${inputCls} h-28 py-2`} value={form.description} onChange={(e) => set('description', e.target.value)} placeholder="Tell attendees what to expect…" /></Field>
          </div>
        )}

        {step === 2 && (
          <div>
            <div className="flex flex-col items-center justify-center rounded-xl border-2 border-dashed border-line bg-surface py-16 text-center">
              <div className="text-[40px]">🖼️</div>
              <div className="mt-3 text-sm font-semibold text-ink">Drop your banner here or click to upload</div>
              <div className="mt-1 text-[13px] text-ink-mute">PNG or JPG, 1200×628 recommended</div>
              <div className="mt-4"><Btn variant="ghost" onClick={() => pushToast('Upload is disabled in this prototype')}>Choose file</Btn></div>
            </div>
            <p className="mt-3 text-[13px] text-ink-faint">This is a placeholder — banner uploads are not wired in the prototype.</p>
          </div>
        )}

        {step === 3 && (
          <div className="grid gap-4">
            <div className="flex gap-2">
              <Btn size="sm" variant={form.isOnline ? 'ghost' : 'primary'} onClick={() => set('isOnline', false)}>Venue</Btn>
              <Btn size="sm" variant={form.isOnline ? 'primary' : 'ghost'} onClick={() => set('isOnline', true)}>Online</Btn>
            </div>
            {form.isOnline ? (
              <Field label="Meeting link"><input className={inputCls} value={form.meetingLink} onChange={(e) => set('meetingLink', e.target.value)} placeholder="https://…" /></Field>
            ) : (
              <div className="grid gap-4">
                <Field label="Venue name"><input className={inputCls} value={form.venueName} onChange={(e) => set('venueName', e.target.value)} placeholder="e.g. Jio World Convention Centre" /></Field>
                <div className="grid gap-4 sm:grid-cols-2">
                  <Field label="Address"><input className={inputCls} value={form.address} onChange={(e) => set('address', e.target.value)} /></Field>
                  <Field label="City"><input className={inputCls} value={form.city} onChange={(e) => set('city', e.target.value)} /></Field>
                </div>
              </div>
            )}
            <div className="grid gap-4 sm:grid-cols-2">
              <Field label="Starts at"><input type="datetime-local" className={inputCls} value={form.startAt} onChange={(e) => set('startAt', e.target.value)} /></Field>
              <Field label="Ends at"><input type="datetime-local" className={inputCls} value={form.endAt} onChange={(e) => set('endAt', e.target.value)} /></Field>
            </div>
          </div>
        )}

        {step === 4 && (
          <div className="grid gap-3">
            {form.tickets.map((t, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-md border border-line p-3 sm:grid-cols-[2fr_1fr_1fr_auto] sm:items-end">
                <Field label="Name"><input className={inputCls} value={t.name} onChange={(e) => updRow('tickets', i, 'name', e.target.value)} placeholder="Ticket name" /></Field>
                <Field label="Price (₹)"><input type="number" min="0" className={inputCls} value={t.price} onChange={(e) => updRow('tickets', i, 'price', e.target.value)} placeholder="0" /></Field>
                <Field label="Quantity"><input type="number" min="0" className={inputCls} value={t.quantity} onChange={(e) => updRow('tickets', i, 'quantity', e.target.value)} placeholder="0" /></Field>
                <Btn size="sm" variant="danger" onClick={() => rmRow('tickets', i)} disabled={form.tickets.length === 1}>Remove</Btn>
              </div>
            ))}
            <div><Btn size="sm" variant="ghost" onClick={() => addRow('tickets', { name: '', price: '', quantity: '' })}>+ Add ticket type</Btn></div>
          </div>
        )}

        {step === 5 && (
          <div className="grid gap-3">
            {form.promos.length === 0 && <p className="text-[13px] text-ink-mute">No promo codes yet. Add one to offer a discount.</p>}
            {form.promos.map((p, i) => (
              <div key={i} className="grid grid-cols-1 gap-2 rounded-md border border-line p-3 sm:grid-cols-[2fr_1fr_auto] sm:items-end">
                <Field label="Code"><input className={inputCls} value={p.code} onChange={(e) => updRow('promos', i, 'code', e.target.value.toUpperCase())} placeholder="EARLYBIRD" /></Field>
                <Field label="Discount (%)"><input type="number" min="0" max="100" className={inputCls} value={p.percent} onChange={(e) => updRow('promos', i, 'percent', e.target.value)} placeholder="10" /></Field>
                <Btn size="sm" variant="danger" onClick={() => rmRow('promos', i)}>Remove</Btn>
              </div>
            ))}
            <div><Btn size="sm" variant="ghost" onClick={() => addRow('promos', { code: '', percent: '' })}>+ Add promo code</Btn></div>
          </div>
        )}

        {step === 6 && (
          <div className="grid gap-5">
            <div>
              <h3 className="mb-1 text-sm font-bold text-ink">Basics</h3>
              <RowKV k="Title" v={form.title} />
              <RowKV k="Category" v={<Pill tone="brand">{form.category}</Pill>} />
              <RowKV k="Chapter" v={form.chapter} />
              <RowKV k="Description" v={form.description} />
            </div>
            <div>
              <h3 className="mb-1 text-sm font-bold text-ink">Venue & schedule</h3>
              <RowKV k="Format" v={form.isOnline ? 'Online' : 'In-person'} />
              {form.isOnline ? <RowKV k="Meeting link" v={form.meetingLink} /> : (<>
                <RowKV k="Venue" v={form.venueName} />
                <RowKV k="Address" v={form.address} />
                <RowKV k="City" v={form.city} />
              </>)}
              <RowKV k="Starts" v={form.startAt} />
              <RowKV k="Ends" v={form.endAt} />
            </div>
            <div>
              <h3 className="mb-1 text-sm font-bold text-ink">Ticket types</h3>
              {form.tickets.map((t, i) => (
                <RowKV key={i} k={t.name || `Ticket ${i + 1}`} v={`${formatPrice((Number(t.price) || 0) * 100)} · ${t.quantity || 0} qty`} />
              ))}
            </div>
            <div>
              <h3 className="mb-1 text-sm font-bold text-ink">Promo codes</h3>
              {form.promos.length === 0 ? <p className="py-2 text-sm text-ink-faint">None</p> : form.promos.map((p, i) => (
                <RowKV key={i} k={p.code || `Promo ${i + 1}`} v={`${p.percent || 0}% off`} />
              ))}
            </div>
          </div>
        )}
      </Card>

      <div className="mt-5 flex items-center justify-between">
        <Btn variant="ghost" onClick={() => setStep((s) => Math.max(1, s - 1))} disabled={step === 1}>Back</Btn>
        {step < 6
          ? <Btn onClick={() => setStep((s) => Math.min(6, s + 1))}>Next</Btn>
          : <Btn onClick={submit}>Submit for approval</Btn>}
      </div>
    </div>
  );
}
