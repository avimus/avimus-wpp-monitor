import { notFound } from "next/navigation"
import Link from "next/link"
import { ArrowLeft } from "lucide-react"
import { formatDistanceStrict, format } from "date-fns"
import { ptBR } from "date-fns/locale"
import { createClient } from "@/lib/supabase/server"
import { StatusBadge } from "@/components/instances/StatusBadge"
import type { InstanceStatus, StatusLog } from "@/types"

export default async function InstanceHistoryPage({
  params,
}: {
  params: { id: string }
}) {
  const supabase = createClient()

  const { data: instance } = await supabase
    .from("instances")
    .select("id, name, current_status")
    .eq("id", params.id)
    .single()

  if (!instance) notFound()

  const { data: logs } = await supabase
    .from("status_logs")
    .select("*")
    .eq("instance_id", params.id)
    .order("recorded_at", { ascending: false })
    .limit(100)

  function formatDuration(log: StatusLog) {
    const start = new Date(log.recorded_at)
    const end = log.ended_at ? new Date(log.ended_at) : new Date()
    return formatDistanceStrict(end, start, { locale: ptBR })
  }

  return (
    <div>
      <div className="mb-6">
        <Link
          href="/"
          className="flex items-center gap-1.5 text-sm text-gray-500 hover:text-gray-900 transition-colors mb-3"
        >
          <ArrowLeft className="w-4 h-4" />
          Voltar ao painel
        </Link>
        <div className="flex items-center gap-3">
          <h1 className="text-xl font-bold text-gray-900">{instance.name}</h1>
          <StatusBadge status={instance.current_status as InstanceStatus} />
        </div>
        <p className="text-sm text-gray-500 mt-1">
          Histórico de mudanças de status (últimas 100 entradas)
        </p>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-hidden">
        <table className="w-full text-sm">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Status
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Início
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Fim
              </th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">
                Duração
              </th>
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {(logs as StatusLog[] ?? []).map((log) => (
              <tr key={log.id} className="hover:bg-gray-50">
                <td className="px-4 py-3">
                  <StatusBadge status={log.status as InstanceStatus} />
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {format(new Date(log.recorded_at), "dd/MM/yyyy HH:mm:ss", {
                    locale: ptBR,
                  })}
                </td>
                <td className="px-4 py-3 text-gray-600 text-xs">
                  {log.ended_at
                    ? format(new Date(log.ended_at), "dd/MM/yyyy HH:mm:ss", {
                        locale: ptBR,
                      })
                    : <span className="text-blue-500">atual</span>}
                </td>
                <td className="px-4 py-3 text-gray-500 text-xs">
                  {formatDuration(log)}
                </td>
              </tr>
            ))}
            {(logs ?? []).length === 0 && (
              <tr>
                <td
                  colSpan={4}
                  className="px-4 py-8 text-center text-gray-400"
                >
                  Nenhum registro de histórico ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>
    </div>
  )
}
