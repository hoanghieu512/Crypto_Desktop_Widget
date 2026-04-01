import type { CSSProperties } from 'react'

export type SkeletonRounded = 'sm' | 'md' | 'lg' | 'full'

const roundedClass: Record<SkeletonRounded, string> = {
  sm: 'rounded-sm',
  md: 'rounded-md',
  lg: 'rounded-lg',
  full: 'rounded-full',
}

function toCssSize(v: string | number | undefined): string | undefined {
  if (v === undefined) return undefined
  return typeof v === 'number' ? `${v}px` : v
}

export type SkeletonProps = {
  width?: string | number
  height?: string | number
  rounded?: SkeletonRounded
  className?: string
  style?: CSSProperties
  shimmer?: boolean
}

/**
 * Base placeholder with optional shimmer (see `.skeleton-shimmer` in index.css).
 */
export function Skeleton({
  width,
  height,
  rounded = 'md',
  className = '',
  style,
  shimmer = true,
}: SkeletonProps) {
  const s: CSSProperties = {
    width: toCssSize(width),
    height: toCssSize(height),
    ...style,
  }
  return (
    <span
      className={`inline-block bg-bx-elevated ${roundedClass[rounded]} ${shimmer ? 'skeleton-shimmer' : ''} ${className}`.trim()}
      style={s}
      aria-hidden
    />
  )
}

export function SkeletonText(props: SkeletonProps) {
  return <Skeleton height={18} rounded="sm" {...props} />
}

export function SkeletonPrice(props: SkeletonProps) {
  return <Skeleton width={props.width ?? 96} height={props.height ?? 24} rounded={props.rounded ?? 'md'} className={props.className} style={props.style} shimmer={props.shimmer} />
}

/** Generic block for card internals */
export function SkeletonCardBlock({ className = '' }: { className?: string }) {
  return (
    <div className={`rounded-lg border border-bx-border-subtle bg-bx-surface/50 p-4 ring-1 ring-black/15 ${className}`.trim()}>
      <SkeletonText width="58%" className="mb-3" />
      <div className="space-y-2">
        <div className="flex justify-between gap-2">
          <Skeleton width={48} height={14} rounded="sm" />
          <SkeletonPrice width={88} />
        </div>
        <div className="flex justify-between gap-2">
          <Skeleton width={40} height={14} rounded="sm" />
          <SkeletonPrice width={88} />
        </div>
      </div>
    </div>
  )
}
