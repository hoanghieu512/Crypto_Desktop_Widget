import { Skeleton, SkeletonCardBlock, SkeletonText } from './Skeleton'

export function PortfolioSkeleton({ embedded = false }: { embedded?: boolean }) {
  return (
    <div
      className={`app-no-drag flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden ${
        embedded ? '' : 'px-3 pb-4 pt-1 max-[299px]:px-2 min-[361px]:px-4 min-[361px]:pb-4'
      }`.trim()}
      aria-busy="true"
      aria-label="Đang tải portfolio"
    >
      <div className="shrink-0 app-panel rounded-2xl border border-white/[0.07] bg-bx-surface shadow-panel">
        <div className="flex items-start justify-between gap-2 border-b border-white/10 pb-2">
          <div className="min-w-0 space-y-2">
            {!embedded ? <SkeletonText width={120} height={20} /> : <SkeletonText width={200} height={14} />}
            {!embedded ? <SkeletonText width={220} height={14} /> : null}
          </div>
          <div className="flex gap-2">
            <Skeleton width={72} height={36} rounded="lg" />
            <Skeleton width={56} height={36} rounded="lg" />
          </div>
        </div>
        <div className="mt-3 grid grid-cols-3 gap-2">
          {[1, 2, 3].map((i) => (
            <div key={i} className="rounded-xl border border-white/[0.06] bg-bx-base/40 app-pad-md">
              <SkeletonText width="72%" height={12} className="mb-2 opacity-80" />
              <Skeleton width="85%" height={26} rounded="md" />
              {i === 2 ? <SkeletonText width="90%" height={12} className="mt-2 opacity-70" /> : null}
            </div>
          ))}
        </div>
      </div>

      <div className="min-h-0 flex-1 space-y-2 overflow-hidden">
        <SkeletonText width={64} height={12} className="opacity-70" />
        {[1, 2, 3].map((i) => (
          <div key={i} className="rounded-xl border border-white/[0.07] bg-bx-surface/80 p-3">
            <div className="flex items-start gap-2">
              <Skeleton width={120} height={20} rounded="md" />
              <div className="ml-auto flex gap-2">
                <Skeleton width={48} height={24} rounded="full" />
                <Skeleton width={56} height={24} rounded="md" />
              </div>
            </div>
            <div className="mt-3 grid grid-cols-2 gap-2 min-[400px]:grid-cols-4">
              {[1, 2, 3, 4].map((j) => (
                <div key={j}>
                  <SkeletonText width={56} height={11} className="mb-1 opacity-60" />
                  <Skeleton width="100%" height={20} rounded="sm" className="max-w-[100px]" />
                </div>
              ))}
            </div>
          </div>
        ))}
        <SkeletonCardBlock className="opacity-50" />
      </div>
    </div>
  )
}
