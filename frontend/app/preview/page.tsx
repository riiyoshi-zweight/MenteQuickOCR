"use client"

import { useState } from "react"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"

export default function PreviewPage() {
  const router = useRouter()
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [formData, setFormData] = useState({
    date: "2025-08-02",
    customerName: "",
    netWeight: "",
    item: "",
    manifestNumber: "",
  })

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
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

  const handleBack = () => {
    router.push("/industrial-waste")
  }

  return (
    <div className="min-h-screen bg-gray-100">
      <header className="bg-[#38b6ff] text-white p-4 flex items-center justify-center relative">
        <button onClick={handleBack} className="absolute left-4 p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-semibold">プレビュー</h1>
      </header>

      <div className="p-4 space-y-4">
        {/* Worker Section */}
        <div className="bg-white rounded-lg p-4 flex items-center gap-3">
          <div className="w-8 h-8 bg-gray-300 rounded-full flex items-center justify-center">
            <span className="text-gray-600 text-sm">👤</span>
          </div>
          <div>
            <div className="text-sm text-gray-600">作業者</div>
            <div className="font-medium">テストユーザー</div>
          </div>
        </div>

        {/* Date Field */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            伝票日付 <span className="text-red-500">*</span>
          </label>
          <input
            type="date"
            value={formData.date}
            onChange={(e) => handleInputChange("date", e.target.value)}
            className="w-full p-3 border border-gray-300 rounded-lg bg-white"
          />
        </div>

        {/* Customer Name Dropdown */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            得意先名 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={formData.customerName}
              onChange={(e) => handleInputChange("customerName", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white appearance-none"
            >
              <option value="">選択してください</option>
              <option value="アース富山">アース富山</option>
              <option value="アース長野">アース長野</option>
              <option value="Jマテバイオ">Jマテバイオ</option>
              <option value="環境開発">環境開発</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Net Weight Field */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            正味重量 (kg) <span className="text-red-500">*</span>
          </label>
          <input
            type="number"
            value={formData.netWeight}
            onChange={(e) => handleInputChange("netWeight", e.target.value)}
            placeholder="重量を入力"
            className="w-full p-3 border border-gray-300 rounded-lg bg-white"
          />
        </div>

        {/* Item Dropdown */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            品目 <span className="text-red-500">*</span>
          </label>
          <div className="relative">
            <select
              value={formData.item}
              onChange={(e) => handleInputChange("item", e.target.value)}
              className="w-full p-3 border border-gray-300 rounded-lg bg-white appearance-none"
            >
              <option value="">選択してください</option>
              <option value="燃え殻">燃え殻</option>
              <option value="汚泥">汚泥</option>
              <option value="廃油">廃油</option>
              <option value="廃酸">廃酸</option>
              <option value="廃アルカリ">廃アルカリ</option>
              <option value="廃プラスチック類">廃プラスチック類</option>
              <option value="紙くず">紙くず</option>
              <option value="木くず">木くず</option>
              <option value="繊維くず">繊維くず</option>
              <option value="動植物性残渣">動植物性残渣</option>
              <option value="ゴムくず">ゴムくず</option>
              <option value="金属くず">金属くず</option>
              <option value="ガラスくず・コンクリートくず・陶磁器くず">ガラスくず・コンクリートくず・陶磁器くず</option>
              <option value="鉱さい">鉱さい</option>
              <option value="がれき類">がれき類</option>
              <option value="動物系固形不要物">動物系固形不要物</option>
            </select>
            <ChevronDown className="absolute right-3 top-1/2 transform -translate-y-1/2 w-5 h-5 text-gray-400 pointer-events-none" />
          </div>
        </div>

        {/* Manifest Number Field */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">マニフェスト番号</label>
          <input
            type="text"
            value={formData.manifestNumber}
            onChange={(e) => handleInputChange("manifestNumber", e.target.value)}
            placeholder="マニフェスト番号を入力"
            className="w-full p-3 border border-gray-300 rounded-lg bg-white"
          />
        </div>

        {/* Save Button */}
        <button
          onClick={handleSave}
          className="w-full bg-[#38b6ff] text-white py-4 rounded-lg font-medium text-lg hover:bg-[#38b6ff]/90 transition-colors mt-8"
        >
          保存
        </button>
      </div>

      {/* Confirmation Dialog */}
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
