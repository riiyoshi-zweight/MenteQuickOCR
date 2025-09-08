"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { getSlipTypeFromClient } from "@/utils/slipTypeMapping"

export default function PreviewPage() {
  const router = useRouter()
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [wasteTypes, setWasteTypes] = useState<any[]>([])
  const [isProcessing, setIsProcessing] = useState(false)
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0], // 現在の日付をデフォルトに
    customerName: "",
    netWeight: "",
    item: "",
    manifestNumber: "",
    slipType: "受領証", // デフォルトは受領証
  })

  // Supabaseから得意先と品目を取得
  useEffect(() => {
    fetchClients()
    fetchWasteTypes()
    processOCR()
  }, [])

  // OCR処理
  const processOCR = async () => {
    const capturedImage = localStorage.getItem("capturedImage")
    const selectedSlipType = localStorage.getItem("selectedSlipType") || "受領証"
    
    if (capturedImage) {
      setIsProcessing(true)
      try {
        const token = localStorage.getItem("authToken")
        const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/ocr/process-base64`, {
          method: 'POST',
          headers: {
            "Content-Type": "application/json",
            "Authorization": `Bearer ${token}`
          },
          body: JSON.stringify({
            image: capturedImage,
            slipType: selectedSlipType,
            usePreprocessing: true,
            useHighDetail: false
          })
        })
        
        if (response.ok) {
          const result = await response.json()
          if (result.success && result.data) {
            const ocrData = result.data
            setFormData((prev) => ({
              ...prev,
              date: ocrData.slipDate || prev.date,
              customerName: ocrData.clientName || '',
              netWeight: ocrData.netWeight || '',
              item: ocrData.productName || '',
              manifestNumber: ocrData.manifestNumber || '',
              slipType: selectedSlipType
            }))
            console.log('OCR処理完了:', ocrData)
          }
        }
      } catch (error) {
        console.error('OCR処理エラー:', error)
      } finally {
        setIsProcessing(false)
        // 処理後は画像を削除
        localStorage.removeItem("capturedImage")
        localStorage.removeItem("selectedSlipType")
      }
    }
  }

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

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      // 得意先が変更されたら、対応する伝票タイプを自動設定
      if (field === "customerName" && value) {
        updated.slipType = getSlipTypeFromClient(value)
        console.log(`得意先「${value}」に対応する伝票タイプ: ${updated.slipType}`)
      }
      return updated
    })
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
          slipType: formData.slipType, // 得意先に応じた伝票タイプ
          isManualInput: false
        })
      })
      
      const data = await response.json()
      console.log('登録レスポンス:', data)
      
      if (response.ok && data.success) {
        setShowConfirmation(false)
        alert('登録が完了しました')
        router.push("/dashboard")
      } else {
        alert(data.error || '登録に失敗しました')
      }
    } catch (error) {
      console.error('登録エラー:', error)
      alert('登録中にエラーが発生しました')
    }
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
        {/* OCR処理中のインジケータ */}
        {isProcessing && (
          <div className="bg-blue-100 text-blue-700 p-3 rounded-lg text-center">
            OCR処理中...
          </div>
        )}
        
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
              {clients.map((client) => (
                <option key={client.id} value={client.name}>
                  {client.name}
                </option>
              ))}
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
              {wasteTypes.map((wasteType) => (
                <option key={wasteType.id} value={wasteType.name}>
                  {wasteType.name}
                </option>
              ))}
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
