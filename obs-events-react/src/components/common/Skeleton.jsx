/** Skeleton building blocks used by loading states. */
export function SkeletonCard() {
  return (
    <div>
      <div className="skeleton aspect-[2/3] rounded-[10px]" />
      <div className="skeleton mt-2.5 h-3.5 w-3/4 rounded" />
      <div className="skeleton mt-1.5 h-3 w-1/2 rounded" />
    </div>
  );
}

export function SkeletonRail({ count = 5 }) {
  return (
    <div className="no-scrollbar flex gap-4 overflow-x-auto pb-2 md:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <div key={i} className="w-[calc((100%-1.5rem)/2.2)] shrink-0 sm:w-[calc((100%-2rem)/3)] xl:w-[calc((100%-4.5rem)/4)] 2xl:w-[calc((100%-6rem)/5)]">
          <SkeletonCard />
        </div>
      ))}
    </div>
  );
}

export function SkeletonGrid({ count = 8 }) {
  return (
    <div className="grid grid-cols-2 gap-3 sm:grid-cols-3 sm:gap-4 xl:grid-cols-4 xl:gap-6">
      {Array.from({ length: count }).map((_, i) => (
        <SkeletonCard key={i} />
      ))}
    </div>
  );
}
