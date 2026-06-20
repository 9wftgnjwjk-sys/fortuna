import { NavLink } from 'react-router-dom'
import {
  LayoutDashboard, Wallet, TrendingDown, LineChart, Settings, LogOut, BarChart3
} from 'lucide-react'
import { cn } from '@/lib/utils'
import { useAuthStore } from '@/store/auth'

const navItems = [
  { to: '/app/dashboard', icon: LayoutDashboard, label: '儀表板' },
  { to: '/app/assets', icon: Wallet, label: '資產' },
  { to: '/app/liabilities', icon: TrendingDown, label: '負債' },
  { to: '/app/history', icon: LineChart, label: '歷史趨勢' },
  { to: '/app/settings', icon: Settings, label: '設定' },
]

export function Sidebar() {
  const signOut = useAuthStore((s) => s.signOut)

  return (
    <aside className="flex h-screen w-60 flex-col border-r border-[hsl(240_3.7%_15.9%)] bg-[hsl(240_10%_4%)]">
      <div className="flex items-center gap-2 px-6 py-5">
        <BarChart3 className="h-6 w-6 text-[hsl(142.1_76.2%_36.3%)]" />
        <span className="text-lg font-bold tracking-tight text-white">Fortuna</span>
      </div>

      <nav className="flex-1 space-y-1 px-3 py-2">
        {navItems.map(({ to, icon: Icon, label }) => (
          <NavLink
            key={to}
            to={to}
            className={({ isActive }) =>
              cn(
                'flex items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium transition-colors',
                isActive
                  ? 'bg-[hsl(142.1_76.2%_36.3%/15%)] text-[hsl(142.1_76.2%_56%)]'
                  : 'text-[hsl(240_5%_64.9%)] hover:bg-[hsl(240_3.7%_12%)] hover:text-white'
              )
            }
          >
            <Icon className="h-4 w-4" />
            {label}
          </NavLink>
        ))}
      </nav>

      <div className="border-t border-[hsl(240_3.7%_15.9%)] p-3">
        <button
          onClick={signOut}
          className="flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm font-medium text-[hsl(240_5%_64.9%)] transition-colors hover:bg-[hsl(0_62.8%_20%)] hover:text-white"
        >
          <LogOut className="h-4 w-4" />
          登出
        </button>
      </div>
    </aside>
  )
}
