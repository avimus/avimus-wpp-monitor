import { ContractorForm } from "@/components/admin/ContractorForm"

export default function NewContractorPage() {
  return (
    <div>
      <div className="mb-6">
        <h1 className="text-xl font-bold text-gray-900">Novo Contratante</h1>
        <p className="text-sm text-gray-500 mt-1">
          O contratante receberá acesso ao painel de monitoramento.
        </p>
      </div>
      <ContractorForm />
    </div>
  )
}
