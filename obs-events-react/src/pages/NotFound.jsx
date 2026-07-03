import { useNavigate } from 'react-router-dom';

export default function NotFound() {
  const navigate = useNavigate();
  return (
    <div className="mx-auto max-w-container px-4 pb-24 pt-20 text-center sm:px-6">
      <div className="text-[64px] font-extrabold text-brand">404</div>
      <div className="mt-2 text-xl font-semibold text-ink">This page took a break</div>
      <div className="mt-2 text-sm text-ink-mute">The event or page you’re looking for isn’t here.</div>
      <button onClick={() => navigate('/')} className="mt-6 rounded-md bg-brand px-6 py-2.5 text-sm font-medium text-white transition hover:bg-brand-dark">Back to home</button>
    </div>
  );
}
