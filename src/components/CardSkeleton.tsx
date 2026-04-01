import { Skeleton, SkeletonCardBlock, SkeletonText } from './Skeleton'

/**
 * Two-column valuation cards + spread strip — matches ValuationWidget layout roughly.
 */
export function MetalValuationSkeleton() {
  return (
    <div className="flex flex-col gap-4" aria-busy="true" aria-label="Đang tải giá">
      <div className="flex min-w-0 items-start justify-between gap-3">
        <div className="min-w-0 flex-1 space-y-2">
          <Skeleton width={96} height={26} rounded="lg" />
          <SkeletonText width="62%" height={16} />
          <SkeletonText width="48%" height={13} className="opacity-70" />
        </div>
        <div className="flex shrink-0 flex-col gap-2">
          <Skeleton width={120} height={32} rounded="lg" />
          <Skeleton width={72} height={32} rounded="lg" className="self-end" />
        </div>
      </div>

      <div className="grid grid-cols-1 gap-4 min-[380px]:grid-cols-2">
        <SkeletonCardBlock />
        <SkeletonCardBlock />
      </div>

      <div className="rounded-lg border border-white/5 bg-gray-800/30 p-4 ring-1 ring-black/15">
        <div className="mb-3 flex justify-between gap-2">
          <SkeletonText width={64} height={12} />
          <Skeleton width={80} height={28} rounded="md" />
        </div>
        <SkeletonText width="55%" height={28} rounded="md" className="mb-3" />
        <Skeleton width="100%" height={8} rounded="full" className="opacity-80" />
        <div className="mt-2 flex justify-between">
          <Skeleton width={40} height={10} rounded="sm" />
          <Skeleton width={40} height={10} rounded="sm" />
        </div>
      </div>
    </div>
  )
}
