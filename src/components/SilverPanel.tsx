import { SilverDashboard } from './SilverDashboard'

type Props = {
  active: boolean
}

export function SilverPanel({ active }: Props) {
  return (
    <div className="app-no-drag flex h-full min-h-0 min-w-0 flex-1 flex-col gap-3 overflow-hidden px-3 pb-4 pt-1">
      <div className="flex min-h-0 flex-1 flex-col gap-3 overflow-y-auto">
        <SilverDashboard active={active} />
        <p className="shrink-0 text-[10px] leading-relaxed text-slate-500">
          Nguồn spot: gold-api.com (XAG) hoặc Yahoo COMEX SI=F; cache khi lỗi mạng. Niêm yết VN dùng cùng API vang.today — có thể bổ sung mã bạc trong utils vnSilverFromPrices nếu API thêm dòng.
        </p>
      </div>
    </div>
  )
}
