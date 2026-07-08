import { useEffect, useState } from 'react';
import { PageHead, Card, Btn, Loading, EmptyState, Pill } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api, { apiError } from '../../lib/api';

export default function Categories() {
  const { pushToast } = useApp();
  const [cats, setCats] = useState(null);
  const [name, setName] = useState('');
  const [icon, setIcon] = useState('');
  const [busy, setBusy] = useState(false);

  useEffect(() => { window.scrollTo(0, 0); }, []);
  const load = () => api.adminCategories().then(setCats).catch((e) => { setCats([]); pushToast(apiError(e), false); });
  useEffect(() => { load(); /* eslint-disable-next-line */ }, []);

  const add = async () => {
    if (name.trim().length < 2) { pushToast('Enter a category name', false); return; }
    setBusy(true);
    try { await api.createCategory({ name: name.trim(), icon: icon.trim() || undefined }); setName(''); setIcon(''); pushToast('Category added'); load(); }
    catch (e) { pushToast(apiError(e, 'Could not add category'), false); }
    finally { setBusy(false); }
  };

  const edit = async (c) => {
    const newName = window.prompt('Category name:', c.name);
    if (newName === null) return;
    const newIcon = window.prompt('Icon (emoji, optional):', c.icon || '');
    if (newIcon === null) return;
    try { await api.updateCategory(c.id, { name: newName.trim(), icon: newIcon.trim() }); pushToast('Category updated'); load(); }
    catch (e) { pushToast(apiError(e), false); }
  };

  const toggle = async (c) => {
    try { await api.updateCategory(c.id, { isActive: !c.isActive }); load(); }
    catch (e) { pushToast(apiError(e), false); }
  };

  const remove = async (c) => {
    if (!window.confirm(`Delete "${c.name}"? This can't be undone.`)) return;
    try { await api.deleteCategory(c.id); pushToast(`Deleted ${c.name}`); load(); }
    catch (e) { pushToast(apiError(e, 'Could not delete category'), false); }
  };

  if (!cats) return <Loading />;

  return (
    <div>
      <PageHead title="Categories" subtitle="Organize events into browsable buckets." />

      <Card className="mb-5">
        <div className="flex flex-wrap items-end gap-3">
          <label className="block">
            <span className="mb-1.5 block text-[12px] font-semibold text-ink-soft">Icon</span>
            <input value={icon} onChange={(e) => setIcon(e.target.value)} placeholder="🏷️" maxLength={4}
              className="h-10 w-16 rounded-md border border-line bg-white px-3 text-center text-sm outline-none focus:border-brand" />
          </label>
          <label className="block flex-1 min-w-[180px]">
            <span className="mb-1.5 block text-[12px] font-semibold text-ink-soft">Name</span>
            <input value={name} onChange={(e) => setName(e.target.value)} placeholder="e.g. Workshops" onKeyDown={(e) => e.key === 'Enter' && add()}
              className="h-10 w-full rounded-md border border-line bg-white px-3.5 text-sm outline-none focus:border-brand" />
          </label>
          <Btn onClick={add} disabled={busy}>Add category</Btn>
        </div>
      </Card>

      {cats.length === 0 ? (
        <EmptyState title="No categories yet." subtitle="Add one to get started." icon="🏷️" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cats.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <div className="flex items-start justify-between">
                <div className="text-[34px] leading-none">{c.icon || '🏷️'}</div>
                {!c.isActive && <Pill tone="gray">Hidden</Pill>}
              </div>
              <div className="mt-3 font-bold text-ink">{c.name}</div>
              <div className="mt-0.5 text-[13px] text-ink-mute">/{c.slug}</div>
              <div className="mt-4 flex flex-wrap gap-2">
                <Btn variant="ghost" size="sm" onClick={() => edit(c)}>Edit</Btn>
                <Btn variant="ghost" size="sm" onClick={() => toggle(c)}>{c.isActive ? 'Hide' : 'Show'}</Btn>
                <Btn variant="ghost" size="sm" onClick={() => remove(c)}>Delete</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
