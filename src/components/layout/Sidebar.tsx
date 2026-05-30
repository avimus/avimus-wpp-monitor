"use client"

import { useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  LayoutDashboard,
  Users,
  Smartphone,
  BarChart3,
  LogOut,
  Menu,
  X,
  Wifi,
} from "lucide-react"
import { createClient } from "@/lib/supabase/client"
import type { UserRole } from "@/types"

const contractorNav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
]

const adminNav = [
  { label: "Dashboard", href: "/", icon: LayoutDashboard },
  { label: "Visão Geral", href: "/admin", icon: BarChart3 },
  { label: "Contratantes", href: "/admin/contractors", icon: Users },
  { label: "Instâncias", href: "/admin/instances", icon: Smartphone },
]

interface SidebarProps {
  userName: string
  userRole: UserRole
}

export function Sidebar({ userName, userRole }: SidebarProps) {
  const pathname = usePathname()
  const router = useRouter()
  const [mobileOpen, setMobileOpen] = useState(false)

  const navItems = userRole === "admin" ? adminNav : contractorNav

  function isActive(href: string) {
    if (href === "/") return pathname === "/"
    return pathname.startsWith(href)
  }

  async function handleSignOut() {
    const supabase = createClient()
    await supabase.auth.signOut()
    router.push("/login")
    router.refresh()
  }

  function NavLinks() {
    return (
      <nav className="flex-1 p-3 space-y-1 overflow-y-auto">
        {navItems.map(({ label, href, icon: Icon }) => (
          <Link
            key={href}
            href={href}
            onClick={() => setMobileOpen(false)}
            className={`flex items-center gap-3 px-3 py-2 rounded-md text-sm transition-colors ${
              isActive(href)
                ? "bg-gray-700 text-white font-medium"
                : "text-gray-400 hover:bg-gray-800 hover:text-white"
            }`}
          >
            <Icon className="w-4 h-4 shrink-0" />
            {label}
          </Link>
        ))}
      </nav>
    )
  }

  function UserFooter() {
    return (
      <div className="p-3 border-t border-gray-700 shrink-0">
        <div className="px-3 py-2 mb-1">
          <p className="text-xs text-gray-500">
            {userRole === "admin" ? "Admin" : "Contratante"}
          </p>
          <p className="text-sm text-gray-300 font-medium truncate">{userName}</p>
        </div>
        <button
          onClick={handleSignOut}
          className="flex items-center gap-3 w-full px-3 py-2 rounded-md text-sm text-gray-400 hover:bg-gray-800 hover:text-white transition-colors"
        >
          <LogOut className="w-4 h-4 shrink-0" />
          Sair
        </button>
      </div>
    )
  }

  return (
    <>
      {/* ── Desktop sidebar ─────────────────────────────── */}
      <aside className="hidden lg:flex flex-col w-64 bg-gray-900 shrink-0 h-screen sticky top-0">
        <div className="p-4 border-b border-gray-700 shrink-0">
          <div className="flex items-center gap-2">
            <Wifi className="w-5 h-5 text-green-400" />
            <span className="font-semibold text-white text-sm">WPP Monitor</span>
          </div>
        </div>
        <NavLinks />
        <UserFooter />
      </aside>

      {/* ── Mobile top bar ───────────────────────────────── */}
      <div className="lg:hidden fixed top-0 left-0 right-0 z-40 h-14 bg-gray-900 flex items-center px-4 gap-3 border-b border-gray-700">
        <button
          onClick={() => setMobileOpen(true)}
          className="text-gray-400 hover:text-white transition-colors"
          aria-label="Abrir menu"
        >
          <Menu className="w-5 h-5" />
        </button>
        <div className="flex items-center gap-2">
          <Wifi className="w-4 h-4 text-green-400" />
          <span className="font-semibold text-white text-sm">WPP Monitor</span>
        </div>
      </div>

      {/* ── Mobile drawer overlay ────────────────────────── */}
      {mobileOpen && (
        <>
          <div
            className="lg:hidden fixed inset-0 z-40 bg-black/60"
            onClick={() => setMobileOpen(false)}
          />
          <aside className="lg:hidden fixed top-0 left-0 z-50 w-64 h-full bg-gray-900 flex flex-col">
            <div className="flex items-center justify-between p-4 border-b border-gray-700 shrink-0">
              <div className="flex items-center gap-2">
                <Wifi className="w-5 h-5 text-green-400" />
                <span className="font-semibold text-white text-sm">WPP Monitor</span>
              </div>
              <button
                onClick={() => setMobileOpen(false)}
                className="text-gray-400 hover:text-white transition-colors"
                aria-label="Fechar menu"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
            <NavLinks />
            <UserFooter />
          </aside>
        </>
      )}
    </>
  )
}
