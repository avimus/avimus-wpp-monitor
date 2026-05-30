import { redirect } from "next/navigation"
import { createClient } from "@/lib/supabase/server"
import { Sidebar } from "@/components/layout/Sidebar"
import type { UserRole } from "@/types"

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode
}) {
  const supabase = createClient()

  const {
    data: { user },
  } = await supabase.auth.getUser()

  if (!user) redirect("/login")

  const { data: profile } = await supabase
    .from("profiles")
    .select("name, role")
    .eq("id", user.id)
    .single()

  const userName = profile?.name ?? user.email ?? "Usuário"
  const userRole = (profile?.role ?? "contractor") as UserRole

  return (
    <div className="flex min-h-screen bg-gray-50">
      <Sidebar userName={userName} userRole={userRole} />
      <div className="flex-1 flex flex-col min-w-0">
        {/* Offset the fixed mobile top bar */}
        <main className="flex-1 p-4 lg:p-6 pt-[calc(3.5rem+1rem)] lg:pt-6">
          {children}
        </main>
      </div>
    </div>
  )
}
