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
  const [worldmensageInstanceId, setWorldmensageInstanceId] = useState("")
  const [worldmensageToken, setWorldmensageToken] = useState("")
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
        worldmensage_instance_id: worldmensageInstanceId,
        worldmensage_token: worldmensageToken,
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
    setWorldmensageInstanceId("")
    setWorldmensageToken("")
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
          Nome da Instância Worldmensage <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={worldmensageInstanceId}
          onChange={(e) => setWorldmensageInstanceId(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Ex: 189YJ260530030517OWN1329"
        />
        <p className="text-xs text-gray-400 mt-1">
          Coluna <strong>Nome</strong> no painel Worldmensage — não confundir com a coluna "Instância".
        </p>
      </div>

      <div>
        <label className="block text-sm font-medium text-gray-700 mb-1">
          Token da Instância Worldmensage <span className="text-red-500">*</span>
        </label>
        <input
          type="text"
          value={worldmensageToken}
          onChange={(e) => setWorldmensageToken(e.target.value)}
          required
          className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm font-mono focus:outline-none focus:ring-2 focus:ring-gray-900"
          placeholder="Ex: 4W8A3-4RN-0584R"
        />
        <p className="text-xs text-gray-400 mt-1">
          Token da conta Worldmensage que gerencia esta instância.
        </p>
      </div>

      <button
        type="submit"
        disabled={loading}
        className="px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 disabled:opacity-50 transition-colors"
      >
        {loading ? "Salvando..." : "Criar Instância"}
      </button>
    </form>
  )
}
