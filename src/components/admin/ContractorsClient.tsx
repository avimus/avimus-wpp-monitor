"use client"

import { useState } from "react"
import { Plus, Pencil, Trash2, X, KeyRound, CheckCircle } from "lucide-react"
import { toast } from "sonner"
import Link from "next/link"
import type { Profile } from "@/types"

type ContractorRow = Pick<Profile, "id" | "name" | "email" | "phone" | "has_auth" | "created_at">

interface ContractorsClientProps {
  initialContractors: ContractorRow[]
}

interface EditForm {
  name: string
  email: string
  phone: string
}

interface AccessForm {
  email: string
  password: string
}

export function ContractorsClient({ initialContractors }: ContractorsClientProps) {
  const [contractors, setContractors] = useState<ContractorRow[]>(initialContractors)

  // Edit modal
  const [editing, setEditing] = useState<ContractorRow | null>(null)
  const [editForm, setEditForm] = useState<EditForm>({ name: "", email: "", phone: "" })
  const [saving, setSaving] = useState(false)

  // Create access modal
  const [creatingAccess, setCreatingAccess] = useState<ContractorRow | null>(null)
  const [accessForm, setAccessForm] = useState<AccessForm>({ email: "", password: "" })
  const [creatingAccessLoading, setCreatingAccessLoading] = useState(false)

  const [deletingId, setDeletingId] = useState<string | null>(null)

  // ── Edit ────────────────────────────────────────────────────────────
  function openEdit(contractor: ContractorRow) {
    setEditing(contractor)
    setEditForm({ name: contractor.name, email: contractor.email ?? "", phone: contractor.phone ?? "" })
  }

  function closeEdit() {
    setEditing(null)
    setEditForm({ name: "", email: "", phone: "" })
  }

  async function handleSave(e: React.FormEvent) {
    e.preventDefault()
    if (!editing) return
    setSaving(true)

    const res = await fetch(`/api/admin/contractors/${editing.id}`, {
      method: "PUT",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(editForm),
    })

    const data = await res.json()
    setSaving(false)

    if (!res.ok) {
      toast.error(data.error ?? "Erro ao salvar alterações.")
      return
    }

    setContractors((prev) => prev.map((c) => (c.id === editing.id ? { ...c, ...editForm } : c)))
    toast.success("Contratante atualizado.")
    closeEdit()
  }

  // ── Create access ────────────────────────────────────────────────────
  function openCreateAccess(contractor: ContractorRow) {
    setCreatingAccess(contractor)
    setAccessForm({ email: contractor.email ?? "", password: "" })
  }

  function closeCreateAccess() {
    setCreatingAccess(null)
    setAccessForm({ email: "", password: "" })
  }

  async function handleCreateAccess(e: React.FormEvent) {
    e.preventDefault()
    if (!creatingAccess) return
    setCreatingAccessLoading(true)

    const res = await fetch(`/api/admin/contractors/${creatingAccess.id}/create-access`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify(accessForm),
    })

    const data = await res.json()
    setCreatingAccessLoading(false)

    if (!res.ok) {
      toast.error(data.error ?? "Erro ao criar acesso.")
      return
    }

    // Update local list: new ID + has_auth = true
    setContractors((prev) =>
      prev.map((c) =>
        c.id === creatingAccess.id
          ? { ...c, id: data.contractor_id, has_auth: true }
          : c
      )
    )
    toast.success("Acesso criado com sucesso.")
    closeCreateAccess()
  }

  // ── Delete ────────────────────────────────────────────────────────────
  async function handleDelete(id: string) {
    if (!confirm("Excluir este contratante? Esta ação remove todos os dados associados.")) return
    setDeletingId(id)

    const res = await fetch(`/api/admin/contractors/${id}`, { method: "DELETE" })
    const data = await res.json()
    setDeletingId(null)

    if (!res.ok) {
      toast.error(data.error ?? "Erro ao excluir contratante.")
      return
    }

    setContractors((prev) => prev.filter((c) => c.id !== id))
    toast.success("Contratante excluído.")
  }

  return (
    <>
      <div className="mb-6 flex items-center justify-between">
        <div>
          <h1 className="text-xl font-bold text-gray-900">Contratantes</h1>
          <p className="text-sm text-gray-500 mt-1">
            {contractors.length} contratante(s) cadastrado(s)
          </p>
        </div>
        <Link
          href="/admin/contractors/new"
          className="flex items-center gap-1.5 px-4 py-2 bg-gray-900 text-white text-sm font-medium rounded-md hover:bg-gray-700 transition-colors"
        >
          <Plus className="w-4 h-4" />
          Novo Contratante
        </Link>
      </div>

      <div className="bg-white rounded-lg border border-gray-200 overflow-x-auto">
        <table className="w-full text-sm min-w-[700px]">
          <thead className="bg-gray-50 border-b border-gray-200">
            <tr>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Nome</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Email</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Telefone</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Acesso</th>
              <th className="text-left px-4 py-3 font-medium text-gray-700">Cadastrado em</th>
              <th className="px-4 py-3 w-24" />
            </tr>
          </thead>
          <tbody className="divide-y divide-gray-100">
            {contractors.map((contractor) => (
              <tr key={contractor.id} className="hover:bg-gray-50">
                <td className="px-4 py-3 font-medium text-gray-900">{contractor.name}</td>
                <td className="px-4 py-3 text-gray-600">{contractor.email ?? "—"}</td>
                <td className="px-4 py-3 text-gray-600">{contractor.phone ?? "—"}</td>
                <td className="px-4 py-3">
                  {contractor.has_auth ? (
                    <span className="inline-flex items-center gap-1 text-xs text-green-700 bg-green-50 border border-green-200 px-2 py-0.5 rounded-full">
                      <CheckCircle className="w-3 h-3" />
                      Ativo
                    </span>
                  ) : (
                    <span className="text-xs text-gray-400">Sem acesso</span>
                  )}
                </td>
                <td className="px-4 py-3 text-gray-500">
                  {new Date(contractor.created_at).toLocaleDateString("pt-BR")}
                </td>
                <td className="px-4 py-3">
                  <div className="flex items-center justify-end gap-2">
                    {!contractor.has_auth && (
                      <button
                        onClick={() => openCreateAccess(contractor)}
                        className="flex items-center gap-1 px-2 py-1 text-xs font-medium text-blue-700 bg-blue-50 border border-blue-200 rounded hover:bg-blue-100 transition-colors"
                        title="Criar acesso de login"
                      >
                        <KeyRound className="w-3 h-3" />
                        Criar Acesso
                      </button>
                    )}
                    <button
                      onClick={() => openEdit(contractor)}
                      className="text-gray-400 hover:text-gray-700 transition-colors"
                      title="Editar contratante"
                    >
                      <Pencil className="w-4 h-4" />
                    </button>
                    <button
                      onClick={() => handleDelete(contractor.id)}
                      disabled={deletingId === contractor.id}
                      className="text-red-400 hover:text-red-600 disabled:opacity-40 transition-colors"
                      title="Excluir contratante"
                    >
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </div>
                </td>
              </tr>
            ))}
            {contractors.length === 0 && (
              <tr>
                <td colSpan={6} className="px-4 py-8 text-center text-gray-400">
                  Nenhum contratante cadastrado ainda.
                </td>
              </tr>
            )}
          </tbody>
        </table>
      </div>

      {/* ── Edit modal ──────────────────────────────────────────────── */}
      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <h2 className="font-semibold text-gray-900">Editar Contratante</h2>
              <button onClick={closeEdit} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleSave} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Nome <span className="text-red-500">*</span>
                </label>
                <input
                  type="text"
                  value={editForm.name}
                  onChange={(e) => setEditForm((f) => ({ ...f, name: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={editForm.email}
                  onChange={(e) => setEditForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Telefone / WhatsApp <span className="text-red-500">*</span>
                </label>
                <input
                  type="tel"
                  value={editForm.phone}
                  onChange={(e) => setEditForm((f) => ({ ...f, phone: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={closeEdit} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
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

      {/* ── Criar Acesso modal ──────────────────────────────────────── */}
      {creatingAccess && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/50 p-4">
          <div className="bg-white rounded-xl shadow-xl w-full max-w-md">
            <div className="flex items-center justify-between p-4 border-b border-gray-100">
              <div>
                <h2 className="font-semibold text-gray-900">Criar Acesso</h2>
                <p className="text-xs text-gray-500 mt-0.5">{creatingAccess.name}</p>
              </div>
              <button onClick={closeCreateAccess} className="text-gray-400 hover:text-gray-700 transition-colors">
                <X className="w-5 h-5" />
              </button>
            </div>
            <form onSubmit={handleCreateAccess} className="p-4 space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Email de acesso <span className="text-red-500">*</span>
                </label>
                <input
                  type="email"
                  value={accessForm.email}
                  onChange={(e) => setAccessForm((f) => ({ ...f, email: e.target.value }))}
                  required
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <div>
                <label className="block text-sm font-medium text-gray-700 mb-1">
                  Senha <span className="text-red-500">*</span>
                </label>
                <input
                  type="password"
                  value={accessForm.password}
                  onChange={(e) => setAccessForm((f) => ({ ...f, password: e.target.value }))}
                  required
                  minLength={6}
                  placeholder="Mínimo 6 caracteres"
                  className="w-full px-3 py-2 border border-gray-300 rounded-md text-sm focus:outline-none focus:ring-2 focus:ring-gray-900"
                />
              </div>
              <p className="text-xs text-gray-400">
                O contratante poderá fazer login com estas credenciais e acessar apenas as instâncias atribuídas a ele.
              </p>
              <div className="flex items-center justify-end gap-3 pt-2">
                <button type="button" onClick={closeCreateAccess} className="px-4 py-2 text-sm text-gray-600 hover:text-gray-900 transition-colors">
                  Cancelar
                </button>
                <button
                  type="submit"
                  disabled={creatingAccessLoading}
                  className="px-4 py-2 bg-blue-700 text-white text-sm font-medium rounded-md hover:bg-blue-800 disabled:opacity-50 transition-colors"
                >
                  {creatingAccessLoading ? "Criando..." : "Criar Acesso"}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  )
}
