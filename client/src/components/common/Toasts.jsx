import { useApp } from '../../context/AppContext';

/** Toast stack, fixed top-right. Driven by AppContext.pushToast(). */
export default function Toasts() {
  const { toasts } = useApp();
  return (
    <div className="pointer-events-none fixed right-4 top-[76px] z-[300] flex flex-col gap-2.5">
      {toasts.map((t) => (
        <div
          key={t.id}
          className="pointer-events-auto flex min-w-[240px] max-w-[360px] animate-fadeUp items-start gap-2.5 rounded-[14px] border border-[#E8ECF2] bg-white/95 px-4 py-3 text-[13px] font-medium text-[#111827] shadow-[0_4px_10px_rgba(16,24,40,.06),0_16px_48px_rgba(16,24,40,.14)] backdrop-blur"
        >
          <span
            className="mt-[1px] grid h-5 w-5 shrink-0 place-items-center rounded-full"
            style={{ background: t.ok ? '#ECFDF5' : '#FEF2F2', color: t.ok ? '#047857' : '#B91C1C' }}
          >
            {t.ok ? (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round" strokeLinejoin="round"><path d="m4.5 12.5 5 5 10-11" /></svg>
            ) : (
              <svg width="11" height="11" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="3" strokeLinecap="round"><path d="M12 6v7" /><path d="M12 17.5h.01" /></svg>
            )}
          </span>
          <span className="leading-snug">{t.msg}</span>
        </div>
      ))}
    </div>
  );
}
