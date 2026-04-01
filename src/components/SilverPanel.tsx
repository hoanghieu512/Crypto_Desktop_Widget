import { useEffect } from 'react'
import { useSilverPrice } from '../hooks/useSilverPrice'
import { SilverDashboard } from './SilverDashboard'
import { StaleBanner } from './StaleBanner'

type Props = {
  active: boolean
}

export function SilverPanel({ active }: Props) {
  const silver = useSilverPrice(active)

  useEffect(() => {
    if (!active) return
    const on = (e: Event) => {
      const ce = e as CustomEvent<{ tab?: string }>
      if (ce.detail?.tab && ce.detail.tab !== 'silver') return
      void silver.refresh()
    }
    window.addEventListener('app:refresh', on as EventListener)
    return () => window.removeEventListener('app:refresh', on as EventListener)
  }, [active, silver])

  return (
    <div className="app-no-drag flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden px-3 pb-4 pt-1 max-[299px]:gap-2 max-[299px]:px-2 min-[361px]:gap-4 min-[361px]:px-4">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto max-[299px]:gap-2">
        <StaleBanner
          {...silver.staleBanner}
          onManualRefresh={
            silver.isStale
              ? () => {
                  void silver.refresh()
                }
              : undefined
          }
        />
        <SilverDashboard silver={silver} />
        <p className="shrink-0 text-[9px] leading-relaxed text-slate-600 min-[361px]:text-[10px]">
          Spot XAG: gold-api.com hoặc Yahoo COMEX SI=F. Niêm yết VN: parse HTML{' '}
          <a
            className="text-violet-400 underline-offset-2 hover:underline"
            href="https://giabac.phuquygroup.vn/"
            target="_blank"
            rel="noreferrer"
          >
            Phú Quý
          </a>{' '}
          (Electron tải trực tiếp; trình duyệt có thể dùng CORS proxy). Quy TG→lượng: USD/oz × FX × (37.5÷31.1035).
        </p>
      </div>
    </div>
  )
}
