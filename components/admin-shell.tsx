"use client"

import { createContext, useContext, useMemo, useState } from "react"
import Link from "next/link"
import { usePathname, useRouter } from "next/navigation"
import {
  Activity,
  LayoutDashboard,
  LogOut,
  MapPin,
  Menu,
  Settings,
  UtensilsCrossed,
} from "lucide-react"
import { Button } from "@/components/ui/button"
import { Avatar, AvatarFallback, AvatarImage } from "@/components/ui/avatar"
import { cn } from "@/lib/utils"
import { supabaseBrowser } from "@/lib/supabaseBrowser"

type AdminUser = {
  id: string
  email: string | null
  fullName?: string
  avatarUrl?: string
}

export type AdminMembership = {
  id: string
  role: string
  restaurant: {
    id: string
    name: string
    slug: string
    logoUrl: string | null
  }
}

type AdminShellProps = {
  user: AdminUser
  memberships: AdminMembership[]
  children: React.ReactNode
}

type AdminWorkspaceContextValue = {
  memberships: AdminMembership[]
  selectedRestaurant: AdminMembership["restaurant"] | null
  selectedRole: string | null
  setSelectedRestaurantId: (id: string) => void
}

const AdminWorkspaceContext = createContext<AdminWorkspaceContextValue | null>(
  null
)

export function useAdminWorkspace() {
  const context = useContext(AdminWorkspaceContext)
  if (!context) {
    throw new Error("useAdminWorkspace must be used within AdminShell")
  }
  return context
}

const NAV_LINKS = [
  { label: "Dashboard", href: "/admin", icon: LayoutDashboard },
  { label: "Menu", href: "/admin/menu", icon: UtensilsCrossed },
  { label: "Branches", href: "/admin/branches", icon: MapPin },
  { label: "Analytics", href: "/admin/analytics", icon: Activity },
  { label: "Settings", href: "/admin/settings", icon: Settings },
]

export function AdminShell({ user, memberships, children }: AdminShellProps) {
  const router = useRouter()
  const pathname = usePathname()
  const [selectedRestaurantId, setSelectedRestaurantId] = useState(
    memberships[0]?.restaurant.id ?? ""
  )

  const selectedMembership =
    memberships.find(
      (membership) => membership.restaurant.id === selectedRestaurantId
    ) ?? memberships[0]

  const contextValue = useMemo<AdminWorkspaceContextValue>(
    () => ({
      memberships,
      selectedRestaurant: selectedMembership?.restaurant ?? null,
      selectedRole: selectedMembership?.role ?? null,
      setSelectedRestaurantId,
    }),
    [memberships, selectedMembership]
  )

  const handleLogout = async () => {
    await supabaseBrowser.auth.signOut()
    router.replace("/admin/login")
  }

  if (!memberships.length) {
    return (
      <div className="min-h-screen flex flex-col items-center justify-center gap-6 bg-slate-50 text-center px-6">
        <div className="space-y-2 max-w-lg">
          <p className="text-sm text-muted-foreground uppercase tracking-wide">
            Welcome to LoyalBite
          </p>
          <h1 className="text-3xl font-semibold text-slate-900">
            You don&apos;t have access to a restaurant yet
          </h1>
          <p className="text-base text-muted-foreground">
            Ask an owner to invite you or create a new restaurant from the onboarding flow.
          </p>
        </div>
        <Button onClick={handleLogout} className="gap-2">
          <LogOut className="size-4" />
          Log out
        </Button>
      </div>
    )
  }

  return (
    <AdminWorkspaceContext.Provider value={contextValue}>
      <div className="min-h-screen bg-background text-foreground transition-colors">
        <div className="flex min-h-screen">
          <aside className="hidden md:flex w-64 flex-col border-r bg-card">
            <div className="px-6 py-6 border-b">
              <Link href="/" className="flex items-center gap-2 font-semibold">
                <UtensilsCrossed className="size-5 text-primary" />
                LoyalBite
              </Link>
            </div>
            <nav className="flex-1 px-3 py-6 space-y-1">
              {NAV_LINKS.map((link) => {
                const Icon = link.icon
                const active = pathname === link.href
                return (
                  <Link
                    key={link.href}
                    href={link.href}
                    className={cn(
                      "flex items-center gap-3 rounded-lg px-3 py-2 text-sm font-medium transition-colors",
                      active
                        ? "bg-primary text-primary-foreground shadow-sm"
                        : "text-muted-foreground hover:bg-muted hover:text-foreground"
                    )}
                  >
                    <Icon className="size-4" />
                    {link.label}
                  </Link>
                )
              })}
            </nav>
          </aside>

          <div className="flex flex-1 flex-col">
            <header className="sticky top-0 z-20 border-b bg-card/80 backdrop-blur">
              <div className="flex items-center gap-4 px-4 py-4 md:px-8">
                <div className="flex flex-1 items-center gap-3">
                  <div className="md:hidden">
                    <Menu className="size-5 text-muted-foreground" />
                  </div>
                  <div className="flex flex-col">
                    <p className="text-xs uppercase text-muted-foreground">
                      Restaurant
                    </p>
                    <select
                      className="text-sm font-medium bg-transparent focus:outline-none"
                      value={selectedMembership?.restaurant.id}
                      onChange={(event) =>
                        setSelectedRestaurantId(event.target.value)
                      }
                    >
                      {memberships.map((membership) => (
                        <option
                          key={membership.id}
                          value={membership.restaurant.id}
                        >
                          {membership.restaurant.name}
                        </option>
                      ))}
                    </select>
                  </div>
                  {selectedMembership?.role && (
                    <span className="inline-flex rounded-full border px-2 py-0.5 text-xs font-medium uppercase tracking-wide text-muted-foreground">
                      {selectedMembership.role}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-3">
                  <div className="hidden text-right md:block">
                    <p className="text-sm font-medium">
                      {user.fullName ?? user.email}
                    </p>
                    <p className="text-xs text-muted-foreground">
                      {user.email}
                    </p>
                  </div>
                  <Avatar className="size-10 border border-border">
                    {user.avatarUrl ? (
                      <AvatarImage src={user.avatarUrl} alt={user.fullName} />
                    ) : null}
                    <AvatarFallback>
                      {(user.fullName ?? user.email ?? "U")
                        .slice(0, 2)
                        .toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <Button
                    variant="ghost"
                    size="icon"
                    onClick={handleLogout}
                    aria-label="Log out"
                  >
                    <LogOut className="size-4" />
                  </Button>
                </div>
              </div>
            </header>
            <main className="flex-1 px-4 py-6 md:px-8 md:py-10 bg-background/60">
              <div className="mx-auto max-w-6xl space-y-6">{children}</div>
            </main>
          </div>
        </div>
      </div>
    </AdminWorkspaceContext.Provider>
  )
}
