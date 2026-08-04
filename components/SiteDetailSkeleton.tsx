"use client";

/** Shown while the lazily-loaded detail view chunk is still arriving. */
export default function SiteDetailSkeleton() {
  return (
    <div
      role="status"
      aria-label="Loading site details"
      className="w-full overflow-hidden rounded-2xl border border-hairline bg-paper shadow-lift"
    >
      <div className="shimmer h-[196px] w-full" />
      <div className="px-7 pt-6 pb-7">
        <div className="shimmer h-6 w-24 rounded-full" />
        <div className="shimmer mt-4 h-8 w-3/5 rounded-md" />

        <div className="mt-6 grid gap-6 sm:grid-cols-2">
          <div>
            <div className="shimmer h-2.5 w-16 rounded" />
            <div className="shimmer mt-3 h-4 w-4/5 rounded" />
            <div className="shimmer mt-2 h-4 w-3/5 rounded" />
          </div>
          <div>
            <div className="shimmer h-2.5 w-20 rounded" />
            <div className="shimmer mt-3 h-4 w-4/5 rounded" />
            <div className="shimmer mt-2 h-4 w-2/3 rounded" />
          </div>
        </div>

        <div className="mt-7">
          <div className="shimmer h-2.5 w-24 rounded" />
          <div className="mt-3 space-y-2">
            <div className="shimmer h-9 w-full rounded-lg" />
            <div className="shimmer h-9 w-full rounded-lg" />
            <div className="shimmer h-9 w-full rounded-lg" />
          </div>
        </div>

        <div className="mt-7 flex gap-2.5">
          <div className="shimmer h-12 flex-1 rounded-xl" />
          <div className="shimmer h-12 w-32 rounded-xl" />
        </div>
      </div>
    </div>
  );
}
