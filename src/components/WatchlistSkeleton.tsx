import { Skeleton, SkeletonPrice, SkeletonText } from './Skeleton'

function WatchlistSkeletonRow() {
  return (
    <li className="list-none border-b border-bx-border-subtle">
      <div className="flex min-h-[56px] items-start gap-1.5 px-3 py-1.5 max-[299px]:px-2 max-[299px]:py-1">
        <Skeleton width={28} height={44} rounded="sm" className="shrink-0 self-center" />
        <div className="flex min-w-0 flex-1 flex-col justify-center gap-2 py-1">
          <div className="flex min-w-0 items-center justify-between gap-2">
            <SkeletonText width={80} />
            <div className="flex shrink-0 items-center gap-2">
              <div className="hidden min-[420px]:flex h-[20px] w-[56px] items-center justify-center">
                <Skeleton width={56} height={20} rounded="sm" />
              </div>
              <SkeletonPrice width={100} className="shrink-0" />
            </div>
          </div>
          <div className="flex min-w-0 items-center justify-between gap-2">
            <div className="flex flex-wrap gap-1">
              <Skeleton width={40} height={22} rounded="full" />
              <Skeleton width={40} height={22} rounded="full" />
            </div>
            <Skeleton width={60} height={18} rounded="sm" className="shrink-0" />
          </div>
        </div>
        <div className="w-8 shrink-0 self-center flex justify-center">
          <Skeleton width={24} height={24} rounded="md" />
        </div>
        <div className="flex w-[92px] shrink-0 justify-end self-center">
          <Skeleton width={40} height={28} rounded="md" />
        </div>
      </div>
    </li>
  )
}

export function WatchlistSkeleton({ count = 5 }: { count?: number }) {
  const n = Math.min(12, Math.max(1, count))
  return (
    <ul className="flex min-h-0 flex-1 flex-col" aria-busy="true" aria-label="Đang tải danh sách">
      {Array.from({ length: n }, (_, i) => (
        <WatchlistSkeletonRow key={i} />
      ))}
    </ul>
  )
}
