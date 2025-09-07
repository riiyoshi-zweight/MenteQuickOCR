"use client"

import { ArrowLeft, LogOut, User, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"

export default function ManualInputPage() {
  const router = useRouter()
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [formData, setFormData] = useState({
    date: "2025-08-02",
    customerName: "",
    netWeight: "",
    item: "",
    manifestNumber: "",
  })

  const customerOptions = [
    "アース富山株式会社",
    "アース長野株式会社",
    "Jマテバイオ株式会社",
    "環境開発株式会社",
    "その他",
  ]

  const itemOptions = [
    "廃プラスチック類",
    "金属くず",
    "ガラスくず・コンクリートくず・陶磁器くず",
    "木くず",
    "紙くず",
    "繊維くず",
    "その他",
  ]

  const handleBack = () => {
    router.push("/industrial-waste")
  }

  const handleLogout = () => {
    router.push("/")
  }

  const handleSave = () => {
    setShowConfirmation(true)
  }

  const handleConfirmSave = () => {
    setShowConfirmation(false)
    router.push("/dashboard")
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
              <div className="font-medium">テストユーザー</div>
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
              className="w-full p-4 border border-gray-300 rounded-lg bg-gray-50 text-lg"
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
                className="w-full p-4 border border-gray-300 rounded-lg bg-gray-50 text-lg appearance-none pr-12"
              >
                <option value="">選択してください</option>
                {customerOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
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
              className="w-full p-4 border border-gray-300 rounded-lg bg-gray-50 text-lg"
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
                className="w-full p-4 border border-gray-300 rounded-lg bg-gray-50 text-lg appearance-none pr-12"
              >
                <option value="">選択してください</option>
                {itemOptions.map((option) => (
                  <option key={option} value={option}>
                    {option}
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
              className="w-full p-4 border border-gray-300 rounded-lg bg-gray-50 text-lg"
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
