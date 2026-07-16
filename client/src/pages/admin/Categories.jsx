import { useEffect, useState } from 'react';
import { PageHead, Card, Btn, Loading, EmptyState, Pill, Modal, ConfirmDialog, Field, inputCls } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';
import { AdminIcon } from '../../components/admin/AdminIcons';

function CategoryEditor({ initial, onClose, onSaved }) {
  const { pushToast } = useApp();
  const [form, setForm] = useState({ name: initial?.name || '', icon: initial?.icon || '' });
  const [busy, setBusy] = useState(false);
  const editing = !!initial?.id;

  const save = async () => {
    if (form.name.trim().length < 2) { pushToast('Enter a category name', false); return; }
    setBusy(true);
    try {
      if (editing) await api.updateCategory(initial.id, { name: form.name.trim(), icon: form.icon.trim() });
      else await api.createCategory({ name: form.name.trim(), icon: form.icon.trim() || undefined });
      pushToast(editing ? 'Category updated' : 'Category added');
      onSaved();
    } catch (e) {
      pushToast(apiError(e, 'Could not save category'), false);
    } finally {
      setBusy(false);
    }
  };

  return (
    <Modal
      open
      onClose={onClose}
      title={editing ? 'Edit category' : 'New category'}
      subtitle="Categories power browse filters and the event wizard."
      width="max-w-md"
      footer={
        <>
          <Btn variant="ghost" onClick={onClose} disabled={busy}>Cancel</Btn>
          <Btn onClick={save} disabled={busy}>{busy ? 'Saving…' : editing ? 'Save changes' : 'Add category'}</Btn>
        </>
      }
    >
      <div className="grid grid-cols-[84px_1fr] gap-3">
        <Field label="Icon" hint="Emoji">
          <input value={form.icon} onChange={(e) => setForm((f) => ({ ...f, icon: e.target.value }))} placeholder="🏷️" maxLength={4} className={`${inputCls} text-center`} />
        </Field>
        <Field label="Name">
          <input value={form.name} onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))} placeholder="e.g. Workshops" autoFocus className={inputCls} onKeyDown={(e) => e.key === 'Enter' && save()} />
        </Field>
      </div>
    </Modal>
  );
}

export default function Categories() {
  const { pushToast } = useApp();
  const [cats, setCats] = useState(null);
  const [editor, setEditor] = useState(null); // null | {} | category
  const [confirm, setConfirm] = useState(null); // category pending delete
  const [busy, setBusy] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const load = () => api.adminCategories().then(setCats).catch((e) => { setCats([]); pushToast(apiError(e), false); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const toggle = async (c) => {
    try { await api.updateCategory(c.id, { isActive: !c.isActive }); load(); }
    catch (e) { pushToast(apiError(e), false); }
  };

  const remove = async () => {
    if (!confirm) return;
    setBusy(true);
    try {
      await api.deleteCategory(confirm.id);
      pushToast(`Deleted ${confirm.name}`);
      setConfirm(null);
      load();
    } catch (e) {
      pushToast(apiError(e, 'Could not delete category'), false);
    } finally {
      setBusy(false);
    }
  };

  if (!cats) return <Loading />;

  return (
    <div>
      <PageHead
        title="Categories"
        subtitle="Organize events into browsable buckets."
        actions={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New category</Btn>}
      />

      {cats.length === 0 ? (
        <EmptyState icon={<AdminIcon.Categories size={30} />} title="No categories yet" subtitle="Add one to get started." action={<Btn onClick={() => setEditor({})}><AdminIcon.Plus size={15} /> New category</Btn>} />
      ) : (
        <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 lg:grid-cols-4">
          {cats.map((c) => (
            <Card key={c.id} className="flex flex-col p-4">
              <div className="flex items-start justify-between">
                <div className="text-[30px] leading-none">{c.icon || '🏷️'}</div>
                {!c.isActive && <Pill tone="gray">Hidden</Pill>}
              </div>
              <div className="mt-3 text-[14px] font-semibold text-[#111827]">{c.name}</div>
              <div className="mt-0.5 text-[12px] text-[#6B7280]">/{c.slug}</div>
              <div className="mt-4 flex gap-1.5">
                <Btn variant="ghost" size="sm" onClick={() => setEditor(c)}><AdminIcon.Edit size={13} /> Edit</Btn>
                <Btn variant="ghost" size="sm" onClick={() => toggle(c)}>{c.isActive ? <AdminIcon.EyeOff size={13} /> : <AdminIcon.Eye size={13} />} {c.isActive ? 'Hide' : 'Show'}</Btn>
                <Btn variant="ghost" size="sm" onClick={() => setConfirm(c)} className="!text-[#B91C1C]"><AdminIcon.Trash size={13} /></Btn>
              </div>
            </Card>
          ))}
        </div>
      )}

      {editor && <CategoryEditor initial={editor} onClose={() => setEditor(null)} onSaved={() => { setEditor(null); load(); }} />}
      <ConfirmDialog
        open={!!confirm}
        onClose={() => setConfirm(null)}
        onConfirm={remove}
        busy={busy}
        danger
        title="Delete category"
        body={`Delete “${confirm?.name}”? Events using it must be reassigned first — the API will block the delete if it’s in use.`}
        confirmLabel="Delete category"
      />
    </div>
  );
}
