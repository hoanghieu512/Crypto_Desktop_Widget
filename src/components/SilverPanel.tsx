import { useSilverPrice } from '../hooks/useSilverPrice'
import { SilverDashboard } from './SilverDashboard'
import { StaleBanner } from './StaleBanner'

type Props = {
  active: boolean
}

export function SilverPanel({ active }: Props) {
  const silver = useSilverPrice(active)

  return (
    <div className="app-no-drag flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden px-3 pb-4 pt-1">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
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
        <p className="shrink-0 text-[10px] leading-relaxed text-slate-500">
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
