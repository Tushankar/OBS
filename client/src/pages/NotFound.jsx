import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-container px-4 pb-28 pt-24 text-center sm:px-6">
      <div className="relative mx-auto w-fit">
        <div className="text-[88px] font-extrabold leading-none tracking-[-0.04em] text-transparent [background:linear-gradient(135deg,#E5C060,#C99E25)] [-webkit-background-clip:text] [background-clip:text]">404</div>
        <div className="pointer-events-none absolute -inset-8 -z-10 rounded-full bg-brand/10 blur-3xl" />
      </div>
      <h1 className="mt-4 text-2xl font-bold tracking-[-0.01em] text-ink">This page took a break</h1>
      <p className="mx-auto mt-2 max-w-sm text-sm leading-relaxed text-ink-mute">
        The event or page you’re looking for isn’t here. It may have moved, ended, or never existed.
      </p>
      <div className="mt-7 flex flex-wrap items-center justify-center gap-3">
        <button
          onClick={() => navigate('/')}
          className="rounded-full bg-gold-gradient px-6 py-2.5 text-sm font-semibold text-white transition-all duration-150 active:scale-[.98]"
        >
          Back to home
        </button>
        <button
          onClick={() => navigate('/events')}
          className="rounded-full border border-line bg-white px-6 py-2.5 text-sm font-semibold text-ink-soft shadow-[0_1px_2px_rgba(16,24,40,.05)] transition-all duration-150 hover:border-[#C6D0DE] hover:text-ink active:scale-[.98]"
        >
          Browse events
        </button>
      </div>
    </div>
  );
}
