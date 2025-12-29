"use client"

import { ArrowLeft, LogOut, User, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState, useEffect } from "react"
import { toast } from "sonner"

export default function ManualInputPage() {
  const router = useRouter()
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [wasteTypes, setWasteTypes] = useState<any[]>([])
  const [workerName, setWorkerName] = useState<string>("") // 作業者名の状態を追加
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // 現在の日付をデフォルトに
    customerName: "",
    netWeight: "",
    item: "",
    manifestNumber: "",
  })

  // Supabaseから得意先と品目を取得
  useEffect(() => {
    fetchUserInfo()
    fetchClients()
    fetchWasteTypes()
  }, [])

  const fetchClients = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/slips/clients`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setClients(data.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error)
    }
  }

  const fetchWasteTypes = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/slips/waste-types`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setWasteTypes(data.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch waste types:", error)
    }
  }

  // ログインユーザー情報を取得
  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/me`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setWorkerName(data.data.name || data.data.userId || "")
          console.log('作業者名を設定:', data.data.name || data.data.userId)
        }
      }
    } catch (error) {
      console.error("Failed to fetch user info:", error)
    }
  }

  const handleBack = () => {
    router.push("/industrial-waste")
  }

  const handleLogout = () => {
    router.push("/")
  }

  const handleSave = () => {
    setShowConfirmation(true)
  }

  const handleConfirmSave = async () => {
    try {
      console.log('登録処理開始:', formData)
      
      const token = localStorage.getItem("authToken")
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/slips`, {
        method: 'POST',
        headers: {
          "Content-Type": "application/json",
          "Authorization": `Bearer ${token}`
        },
        body: JSON.stringify({
          slipDate: formData.date,
          clientName: formData.customerName,
          netWeight: formData.netWeight,
          productName: formData.item,
          itemName: formData.item,
          manifestNumber: formData.manifestNumber || null,
          slipType: '手動入力',
          isManualInput: true
        })
      })
      
      const data = await response.json()
      console.log('登録レスポンス:', data)
      
      if (response.ok && data.success) {
        setShowConfirmation(false)
        toast.success('登録が完了しました')
        router.push("/dashboard")
      } else {
        toast.error(data.error || '登録に失敗しました')
      }
    } catch (error) {
      console.error('登録エラー:', error)
      toast.error('登録中にエラーが発生しました')
    }
  }

  const handleCancelSave = () => {
    setShowConfirmation(false)
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({
      ...prev,
      [field]: value,
    }))
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#38b6ff] text-white p-4 flex items-center justify-between">
        <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>

        <h1 className="text-xl font-semibold">手動入力</h1>

        <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <LogOut className="w-6 h-6" />
        </button>
      </header>

      <main className="p-6">
        <div className="bg-white rounded-xl p-4 mb-6 shadow-sm border border-gray-100">
          <div className="flex items-center gap-3">
            <User className="w-5 h-5 text-gray-600" />
            <div>
              <div className="text-sm text-gray-600">作業者</div>
              <div className="font-medium">{workerName || "読み込み中..."}</div>
            </div>
          </div>
        </div>

        <div className="space-y-4">
          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              伝票日付 <span className="text-red-500">*</span>
            </label>
            <input
              type="date"
              value={formData.date}
              onChange={(e) => handleInputChange("date", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#38b6ff] focus:border-transparent"
              style={{
                WebkitAppearance: 'none',
                MozAppearance: 'none',
                appearance: 'none',
                colorScheme: 'light'
              }}
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              得意先名 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.customerName}
                onChange={(e) => handleInputChange("customerName", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white appearance-none pr-12"
              >
                <option value="">選択してください</option>
                {clients.map((client) => (
                  <option key={client.id} value={client.name}>
                    {client.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              正味重量 (kg) <span className="text-red-500">*</span>
            </label>
            <input
              type="number"
              value={formData.netWeight}
              onChange={(e) => handleInputChange("netWeight", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white"
              placeholder=""
            />
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">
              品目 <span className="text-red-500">*</span>
            </label>
            <div className="relative">
              <select
                value={formData.item}
                onChange={(e) => handleInputChange("item", e.target.value)}
                className="w-full p-3 border border-gray-300 rounded-lg bg-white appearance-none pr-12"
              >
                <option value="">選択してください</option>
                {wasteTypes.map((wasteType) => (
                  <option key={wasteType.id} value={wasteType.name}>
                    {wasteType.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="absolute right-4 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
            </div>
          </div>

          <div>
            <label className="block text-sm font-medium text-gray-700 mb-2">マニフェスト番号</label>
            <input
              type="text"
              value={formData.manifestNumber}
              onChange={(e) => handleInputChange("manifestNumber", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white"
              placeholder=""
            />
          </div>
        </div>

        <div className="mt-8">
          <button
            onClick={handleSave}
            className="w-full bg-[#38b6ff] text-white py-4 rounded-xl font-medium text-lg hover:bg-[#2ea5ef] transition-colors"
          >
            保存
          </button>
        </div>
      </main>

      {showConfirmation && (
        <div className="fixed inset-0 bg-black bg-opacity-50 flex items-center justify-center z-50 p-4">
          <div className="bg-white rounded-xl p-6 max-w-md w-full">
            <h2 className="text-lg font-semibold mb-4 text-center">入力内容の確認</h2>
            <div className="space-y-3 mb-6">
              <div className="flex justify-between">
                <span className="text-gray-600">伝票日付:</span>
                <span>{formData.date}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">得意先名:</span>
                <span>{formData.customerName || "未選択"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">正味重量:</span>
                <span>{formData.netWeight ? `${formData.netWeight}kg` : "未入力"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">品目:</span>
                <span>{formData.item || "未選択"}</span>
              </div>
              <div className="flex justify-between">
                <span className="text-gray-600">マニフェスト番号:</span>
                <span>{formData.manifestNumber || "未入力"}</span>
              </div>
            </div>
            <div className="flex gap-3">
              <button
                onClick={handleConfirmSave}
                className="flex-1 py-3 px-4 bg-[#38b6ff] text-white rounded-lg hover:bg-[#2ea5ef] transition-colors"
              >
                はい
              </button>
              <button
                onClick={handleCancelSave}
                className="flex-1 py-3 px-4 border border-gray-300 rounded-lg text-gray-700 hover:bg-gray-50 transition-colors"
              >
                いいえ
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
