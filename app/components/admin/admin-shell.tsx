import { ReactNode } from "react"

type AdminShellProps = {
  children: ReactNode
}

export function AdminShell({ children }: AdminShellProps) {
  return (
    <div className="admin-shell">
      {children}
    </div>
  )
}
