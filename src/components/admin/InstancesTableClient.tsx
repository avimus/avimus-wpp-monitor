"use client"

import { useEffect, useState } from "react"
import { Pencil, X } from "lucide-react"
import { toast } from "sonner"
import { StatusBadge } from "@/components/instances/StatusBadge"
import type { Instance, InstanceStatus, Profile } from "@/types"

type ContractorOption = Pick<Profile, "id" | "name">

interface InstancesTableClientProps {
  initialInstances: Instance[]
  contractors: ContractorOption[]
}

interface EditForm {
  name: string
  contractor_id: string
  worldmensage_instance_id: string
  worldmensage_token: string
}

export function InstancesTableClient({
  initialInstances,
  contractors,
}: InstancesTableClientProps) {
  const [instances, setInstances] = useState<Instance[]>(initialInstances)
  const [editing, setEditing] = useState<Instance | null>(null)
  const [form, setForm] = useState<EditForm>({
    name: "",
    contractor_id: "",
    worldmensage_instance_id: "",
    worldmensage_token: "",
  })
  const [saving, setSaving] = useState(false)

  // Sync when server re-renders after a new instance is created
  useEffect(() => {
    setInstances(initialInstances)
  }, [initialInstances])

  const contractorMap = Object.fromEntries(contractors.map((c) => [c.id, c.name]))

  function openEdit(instance: Instance) {
    setEditing(instance)
    setForm({
      name: instance.name,
      contractor_id: instance.contractor_id,
      worldmensage_instance_id: instance.worldmensage_instance_id,
      worldmensage_token: instance.worldmensage_token ?? "",
    })
  }

  function closeEdit() {
    setEditing(null)
    setForm({ name: "", contractor_id: "", worldmensage_instance_id: "", worldmensage_token: "" })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)

    const res = await fetch(`/api/admin/instances/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(form),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast.error(data.error ?? "Erro ao salvar alterações.")
      return
    }

    setInstances((prev) =>
      prev.map((i) => (i.id === editing.id ? { ...i, ...form } : i))
    )
    toast.success("Instância atualizada.")
    closeEdit()
  }

  return (
    <>
      <h2 className="text-base font-semibold text-gray-900 mb-4">
        Instâncias Cadastradas ({instances.length})
      </h2>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Instância</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Contratante</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Status</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">ID Worldmensage</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Última Sync</th>
              <th className="px-4 py-3 w-10" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {instances.map((inst) => (
              <tr key={inst.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{inst.name}</td>
                <td className="px-4 py-3 text-gray-500">
                  {contractorMap[inst.contractor_id] ?? "—"}
                </td>
                <td className="px-4 py-3">
                  <StatusBadge status={inst.current_status as InstanceStatus} />
                </td>
                <td className="px-4 py-3 text-gray-400 font-mono text-xs truncate max-w-[160px]">
                  {inst.worldmensage_instance_id}
                </td>
                <td className="px-4 py-3 text-gray-400 text-xs">
                  {inst.last_sync_at
                    ? new Date(inst.last_sync_at).toLocaleString("pt-BR")
                    : "—"}
                </td>
                <td className="px-4 py-3 text-right">
                  <button
                    onClick={() => openEdit(inst)}
                    className="text-gray-400 hover:text-gray-700 transition-colors"
                    title="Editar instância"
                  >
                    <Pencil className="w-4 h-4" />
                  </button>
                </td>
              </tr>
            ))}
            {instances.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Nenhuma instância cadastrada ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* Edit modal */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Editar Instância</h2>
              <button
                onClick={closeEdit}
                className="text-gray-400 hover:text-gray-700 transition-colors"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome / Apelido <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.name}
                  onChange={(e) => setForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Contratante <span className="text-red-500">*</span>
                </label>
                <select
                  value={form.contractor_id}
                  onChange={(e) => setForm((f) => ({ ...f, contractor_id: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900 bg-white"
                >
                  <option value="">Selecione um contratante</option>
                  {contractors.map((c) => (
                    <option key={c.id} value={c.id}>
                      {c.name}
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  ID da Instância Worldmensage <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.worldmensage_instance_id}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, worldmensage_instance_id: e.target.value }))
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Token Worldmensage <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={form.worldmensage_token}
                  onChange={(e) =>
                    setForm((f) => ({ ...f, worldmensage_token: e.target.value }))
                  }
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={closeEdit}
                  className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors"
                >
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={saving}
                  className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
                >
                  {saving ? "Salvando..." : "Salvar"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
