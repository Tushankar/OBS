/** Compact numbered step indicator used by the booking flow (Show → Seats → Pay). */
export default function Stepper({ step }) {
  // step: 1 = seats/tickets, 2 = pay
  const items = [
    ['Show', 1],
    ['Details', 2],
    ['Pay', 3],
  ];
  const current = step === 'checkout' ? 3 : 2;
  return (
    <div className="flex items-center gap-3.5 text-[13px] font-semibold">
      {items.map(([label, n], i) => {
        const done = n < current;
        const active = n === current;
        return (
          <div key={label} className="flex items-center gap-3.5">
            <div className={`flex items-center gap-1.5 ${done ? 'text-ink-mute' : active ? 'text-ink' : 'text-ink-faint'}`}>
              <span
                className={`flex h-[22px] w-[22px] items-center justify-center rounded-full text-[11.5px] ${
                  done ? 'border-[1.5px] border-brand text-brand' : active ? 'bg-brand text-white' : 'border-[1.5px] border-line'
                }`}
              >
                {done ? '✓' : n}
              </span>
              <span>{label}</span>
            </div>
            {i < items.length - 1 && <span className="h-px w-[22px] bg-line" />}
          </div>
        );
      })}
    </div>
  );
}
