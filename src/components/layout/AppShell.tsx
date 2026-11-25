import { NavLink, Outlet } from "react-router-dom";
import { Home, Users, Receipt, Scale, History, BarChart3, Settings, Plus, Moon, Sun, Wallet } from "lucide-react";
import { cn } from "@/lib/cn";
import { useTheme } from "@/lib/theme";
import { Toaster } from "@/components/ui/toast";

const nav = [
  { to: "/", label: "Dashboard", icon: Home },
  { to: "/groups", label: "Groups", icon: Users },
  { to: "/balances", label: "Balances", icon: Scale },
  { to: "/settlements", label: "Settlements", icon: Wallet },
  { to: "/history", label: "History", icon: History },
  { to: "/reports", label: "Reports", icon: BarChart3 },
  { to: "/settings", label: "Settings", icon: Settings },
];
const mobileNav = [nav[0], nav[1], nav[4]];

export default function AppShell() {
  const { dark, toggle } = useTheme();
  return (
    <div className="flex min-h-full">
      <Toaster />
      <aside className="sticky top-0 hidden h-screen w-64 shrink-0 flex-col gap-1 p-4 md:flex">
        <div className="mb-4 flex items-center gap-2 px-3 py-2 text-lg font-bold">
          <span className="grid h-9 w-9 place-items-center rounded-chip bg-primary text-primary-fg">
            <Receipt size={18} />
          </span>
          SplitEase
        </div>
        {nav.map(({ to, label, icon: Icon }) => (
          <NavLink key={to} to={to} end={to === "/"}
            className={({ isActive }) => cn(
              "flex items-center gap-3 rounded-chip px-3 py-2.5 text-sm font-medium text-muted transition-colors hover:text-ink",
              isActive && "bg-pill text-pill-fg hover:text-pill-fg")}>
            <Icon size={18} /> {label}
          </NavLink>
        ))}
        <div className="mt-auto flex items-center justify-between gap-2">
          <NavLink to="/expenses/new" className="flex flex-1 items-center justify-center gap-2 rounded-chip bg-primary py-3 text-sm font-semibold text-primary-fg">
            <Plus size={18} /> Add expense
          </NavLink>
          <button onClick={toggle} aria-label="Toggle theme" className="grid h-11 w-11 place-items-center rounded-chip bg-card">
            {dark ? <Sun size={18} /> : <Moon size={18} />}
          </button>
        </div>
      </aside>

      <main className="mx-auto w-full max-w-5xl flex-1 px-4 pb-28 pt-4 md:px-8 md:pb-10 md:pt-8">
        <Outlet />
      </main>

      {/* Mobile floating pill bar + round add button */}
      <nav className="fixed inset-x-0 bottom-0 z-20 flex items-center justify-center gap-3 px-4 md:hidden"
        style={{ paddingBottom: "calc(env(safe-area-inset-bottom, 0px) + 16px)" }}>
        <div className="flex gap-1 rounded-full bg-card p-1.5 shadow-lg">
          {mobileNav.map(({ to, label, icon: Icon }) => (
            <NavLink key={to} to={to} end={to === "/"} aria-label={label}
              className={({ isActive }) => cn("flex items-center gap-2 rounded-full px-4 py-2.5 text-sm font-medium text-muted",
                isActive && "bg-pill text-pill-fg")}>
              {({ isActive }) => (<><Icon size={18} />{isActive && label}</>)}
            </NavLink>
          ))}
          <NavLink to="/settings" aria-label="Settings" className="grid h-10 w-10 place-items-center rounded-full text-muted"><Settings size={18} /></NavLink>
        </div>
        <NavLink to="/expenses/new" aria-label="Add expense" className="grid h-14 w-14 place-items-center rounded-full bg-primary text-primary-fg shadow-lg">
          <Plus size={26} />
        </NavLink>
      </nav>
    </div>
  );
}
