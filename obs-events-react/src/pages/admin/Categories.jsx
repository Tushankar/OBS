import { useEffect, useState } from 'react';
import { PageHead, Card, Btn, Loading, EmptyState } from '../../components/portal/Kit';
import { useApp } from '../../context/AppContext';
import api from '../../lib/api';

export default function Categories() {
  const { pushToast } = useApp();
  const [cats, setCats] = useState(null);

  useEffect(() => { window.scrollTo(0, 0); }, []);

  useEffect(() => {
    let alive = true;
    api.adminCategories().then((d) => { if (alive) setCats(d || []); });
    return () => { alive = false; };
  }, []);

  if (!cats) return <Loading />;

  return (
    <div>
      <PageHead
        title="Categories"
        subtitle="Organize events into browsable buckets."
        action={<Btn onClick={() => pushToast('Category added')}>Add category</Btn>}
      />

      {cats.length === 0 ? (
        <EmptyState title="No categories yet." hint="Add one to get started." icon="🏷️" />
      ) : (
        <div className="grid grid-cols-2 gap-4 sm:grid-cols-3 lg:grid-cols-4">
          {cats.map((c) => (
            <Card key={c.id} className="flex flex-col">
              <div className="text-[34px] leading-none">{c.icon || '🏷️'}</div>
              <div className="mt-3 font-bold text-ink">{c.name}</div>
              <div className="mt-0.5 text-[13px] text-ink-mute">/{c.slug}</div>
              <div className="mt-4 flex gap-2">
                <Btn variant="ghost" size="sm" onClick={() => pushToast(`Editing ${c.name}`)}>Edit</Btn>
                <Btn variant="ghost" size="sm" onClick={() => pushToast(`Deleted ${c.name}`)}>Delete</Btn>
              </div>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
