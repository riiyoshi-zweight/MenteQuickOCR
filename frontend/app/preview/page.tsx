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
  const [formData, setFormData] = useState({
    date: new Date().toISOString().split('T')[0],
    customerName: "",
    netWeight: "",
    item: "",
    manifestNumber: "",
    slipType: "受領証",
  })

  // Supabaseから得意先と品目を取得
  useEffect(() => {
    fetchClients()
    fetchWasteTypes()
    loadOCRResults()
  }, [])

  // OCR結果を読み込み
  const loadOCRResults = () => {
    const ocrResultStr = localStorage.getItem('ocrResult')
    const selectedSlipType = localStorage.getItem('selectedSlipType') || '受領証'
    
    if (ocrResultStr) {
      try {
        const ocrData = JSON.parse(ocrResultStr)
        console.log('OCR結果を読み込み:', ocrData)
        
        // OCR結果をフォームに反映
        setFormData((prev) => ({
          ...prev,
          date: ocrData.slipDate || prev.date,
          customerName: ocrData.clientName || '',
          netWeight: ocrData.netWeight || '',
          item: ocrData.productName || '',
          manifestNumber: ocrData.manifestNumber || '',
          slipType: selectedSlipType
        }))
        
        // 使用済みのデータをクリーンアップ
        localStorage.removeItem('ocrResult')
        localStorage.removeItem('capturedImage')
      } catch (error) {
        console.error('OCR結果の読み込みエラー:', error)
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
          
          // OCR結果と得意先をマッチング
          matchClientFromOCR(data.data)
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
          
          // OCR結果と品目をマッチング
          matchWasteTypeFromOCR(data.data)
        }
      }
    } catch (error) {
      console.error("Failed to fetch waste types:", error)
    }
  }

  // OCR結果から得意先を自動選択
  const matchClientFromOCR = (clientList: any[]) => {
    if (formData.customerName && clientList.length > 0) {
      const ocrClientName = formData.customerName.toLowerCase()
      
      // 特別なマッチングルール（計量票用）
      // 「上越マテリアル」と「バイオマス」の両方を含む場合は「バイオマス」を選択
      if (ocrClientName.includes('上越マテリアル') && ocrClientName.includes('バイオマス')) {
        const matched = clientList.find((client) => 
          client.name === 'バイオマス'
        )
        if (matched) {
          setFormData((prev) => ({
            ...prev,
            customerName: matched.name,
            slipType: getSlipTypeFromClient(matched.name)
          }))
          console.log(`得意先「${matched.name}」に自動マッチング（特別ルール）`)
          return
        }
      }
      
      // 完全一致を探す
      let matched = clientList.find((client) => 
        client.name === formData.customerName
      )
      
      // キーワードベースの部分一致
      if (!matched) {
        // OCR結果に含まれるキーワードでマッチング
        matched = clientList.find((client) => {
          const clientNameLower = client.name.toLowerCase()
          // クライアント名がOCR結果に含まれる、またはその逆
          return ocrClientName.includes(clientNameLower) || clientNameLower.includes(ocrClientName)
        })
      }
      
      // より柔軟な部分一致（各単語でマッチング）
      if (!matched) {
        matched = clientList.find((client) => {
          const clientWords = client.name.split(/[\s　]+/)
          return clientWords.some(word => 
            word.length > 1 && ocrClientName.includes(word.toLowerCase())
          )
        })
      }
      
      // マッチした場合は選択
      if (matched) {
        setFormData((prev) => ({
          ...prev,
          customerName: matched.name,
          slipType: getSlipTypeFromClient(matched.name)
        }))
        console.log(`得意先「${matched.name}」に自動マッチング`)
      }
    }
  }

  // OCR結果から品目を自動選択
  const matchWasteTypeFromOCR = (wasteTypeList: any[]) => {
    if (formData.item && wasteTypeList.length > 0) {
      const ocrItem = formData.item.toLowerCase()
      
      // 特別なマッチングルール
      // 「有機汚泥」「有機性汚泥」→「汚泥」
      if (ocrItem.includes('汚泥')) {
        const matched = wasteTypeList.find((wasteType) => 
          wasteType.name === '汚泥'
        )
        if (matched) {
          setFormData((prev) => ({
            ...prev,
            item: matched.name
          }))
          console.log(`品目「${matched.name}」に自動マッチング（汚泥ルール）`)
          return
        }
      }
      
      // 「廃プラ」を含む場合→「廃プラスチック」
      if (ocrItem.includes('廃プラ') || ocrItem.includes('プラスチック')) {
        const matched = wasteTypeList.find((wasteType) => 
          wasteType.name === '廃プラスチック'
        )
        if (matched) {
          setFormData((prev) => ({
            ...prev,
            item: matched.name
          }))
          console.log(`品目「${matched.name}」に自動マッチング（廃プラルール）`)
          return
        }
      }
      
      // 完全一致を探す
      let matched = wasteTypeList.find((wasteType) => 
        wasteType.name === formData.item
      )
      
      // 部分一致を探す（マスタの名前がOCR結果に含まれる）
      if (!matched) {
        matched = wasteTypeList.find((wasteType) => {
          const wasteTypeLower = wasteType.name.toLowerCase()
          return ocrItem.includes(wasteTypeLower)
        })
      }
      
      // マッチした場合は選択
      if (matched) {
        setFormData((prev) => ({
          ...prev,
          item: matched.name
        }))
        console.log(`品目「${matched.name}」に自動マッチング`)
      }
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
          slipType: formData.slipType,
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
            className="w-full p-3 border border-gray-300 rounded-lg bg-white text-gray-900 focus:outline-none focus:ring-2 focus:ring-[#38b6ff] focus:border-transparent"
            style={{
              WebkitAppearance: 'none',
              MozAppearance: 'none',
              appearance: 'none',
              colorScheme: 'light'
            }}
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

        {/* Manifest Number Field - 電子マニフェストは常に空白なので非表示 */}

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