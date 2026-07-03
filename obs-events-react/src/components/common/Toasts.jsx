import { useApp } from '../../context/AppContext';

/** Toast stack, fixed top-right. Driven by AppContext.pushToast(). */
export default function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed right-4 top-[76px] z-[300] flex flex-col gap-2.5">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto min-w-[220px] animate-fadeUp rounded-[10px] bg-white px-4 py-3 text-[13px] text-ink shadow-pop"
          style={{ borderLeft: `4px solid ${t.ok ? '#1EA83C' : '#C99E25'}` }}
        >
          {t.msg}
        </div>
      ))}
    </div>
  );
}
