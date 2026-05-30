"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
import type { Profile } from "@/types"

interface InstanceAssignFormProps {
  contractors: Pick<Profile, "id" | "name">[]
}

export function InstanceAssignForm({ contractors }: InstanceAssignFormProps) {
  const router = useRouter()
  const [contractorId, setContractorId] = useState("")
  const [instanceName, setInstanceName] = useState("")
  const [evolutionInstanceName, setEvolutionInstanceName] = useState("")
  const [loading, setLoading] = useState(false)

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)

    const res = await fetch("/api/admin/instances", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        contractor_id: contractorId,
        name: instanceName,
        evolution_instance_name: evolutionInstanceName,
      }),
    })

    const data = await res.json()
    setLoading(false)

    if (!res.ok) {
      toast.error(data.error ?? "Erro ao criar instância.")
      return
    }

    toast.success("Instância criada com sucesso.")
    setInstanceName("")
    setEvolutionInstanceName("")
    setContractorId("")
    router.refresh()
  }

  return (
    <form onSubmit={handleSubmit} className="space-y-4 max-w-md">
      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Contratante <span className="text-red-500">*</span>
        </label>
        <select
          value={contractorId}
          onChange={(e) => setContractorId(e.target.value)}
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
          Nome / Apelido da Instância <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={instanceName}
          onChange={(e) => setInstanceName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Ex: Instância Principal"
        />
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Nome da Instância (Evolution API) <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={evolutionInstanceName}
          onChange={(e) => setEvolutionInstanceName(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Ex: avimus-principal"
        />
        <p className="text-xs text-gray-400 mt-1">
          Identificador único da instância na Evolution API. Será criada automaticamente.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Criando..." : "Criar Instância"}
      </button>
    </form>
  )
}
