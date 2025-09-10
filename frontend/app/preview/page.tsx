"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
// import { getSlipTypeFromClient } from "@/utils/slipTypeMapping" // 削除：伝票タイプはlocalStorageから取得

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
      const slipType = localStorage.getItem('selectedSlipType') || '受領証'
      
      // slip_typeをクエリパラメータとして追加
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/slips/clients?slipType=${encodeURIComponent(slipType)}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setClients(data.data)
          console.log(`伝票タイプ「${slipType}」用の得意先を${data.data.length}件取得しました`)
          
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

  // OCR結果から得意先を自動選択（高度なマッチングアルゴリズム）
  const matchClientFromOCR = (clientList: any[]) => {
    if (formData.customerName && clientList.length > 0) {
      const ocrClientName = formData.customerName.toLowerCase()
      const slipType = localStorage.getItem('selectedSlipType') || '受領証'
      
      console.log('得意先マッチング開始:', {
        ocrResult: formData.customerName,
        slipType,
        clientCount: clientList.length
      })
      
      // 伝票タイプ別の特別ルール
      // 計量票の特別ルール
      if (slipType === '計量票') {
        // 「上越マテリアル」と「バイオマス」の両方を含む場合は「バイオマス」を選択
        if (ocrClientName.includes('上越マテリアル') && ocrClientName.includes('バイオマス')) {
          const matched = clientList.find((client) => 
            client.name === 'バイオマス'
          )
          if (matched) {
            setFormData((prev) => ({
              ...prev,
              customerName: matched.name,
              slipType: slipType // localStorageから取得した値を維持
            }))
            console.log(`得意先「${matched.name}」に自動マッチング（計量票特別ルール）`)
            return
          }
        }
        
        // 「上越市水道局」→「上越市下水道センター」の変換
        if (ocrClientName.includes('上越市') && (ocrClientName.includes('水道') || ocrClientName.includes('下水道'))) {
          const matched = clientList.find((client) => 
            client.name === '上越市下水道センター'
          )
          if (matched) {
            setFormData((prev) => ({
              ...prev,
              customerName: matched.name,
              slipType: slipType // localStorageから取得した値を維持
            }))
            console.log(`得意先「${matched.name}」に自動マッチング（下水道センター変換）`)
            return
          }
        }
      }
      
      // 検量書の特別ルール（○○便、○○帰り便）
      if (slipType === '検量書' && (ocrClientName.includes('便') || ocrClientName.includes('帰り'))) {
        // 「アース帰り便」→「アース長野」などの変換
        const transportPatterns = [
          { pattern: 'アース', match: 'アース長野' },
          { pattern: 'JMATE', match: 'Jマテバイオ' },
          { pattern: 'jmate', match: 'Jマテバイオ' },
        ]
        
        for (const { pattern, match } of transportPatterns) {
          if (ocrClientName.includes(pattern.toLowerCase())) {
            const matched = clientList.find((client) => 
              client.name === match
            )
            if (matched) {
              setFormData((prev) => ({
                ...prev,
                customerName: matched.name,
                slipType: slipType // localStorageから取得した値を維持
              }))
              console.log(`得意先「${matched.name}」に自動マッチング（検量書便名変換）`)
              return
            }
          }
        }
      }
      
      // 受領証の特別ルール（ブルボン）
      if (slipType === '受領証' && ocrClientName.includes('ブルボン')) {
        // 「上越工場」か「柏崎工場」を含むか判定
        if (ocrClientName.includes('上越')) {
          const matched = clientList.find((client) => 
            client.name.includes('ブルボン') && client.name.includes('上越')
          )
          if (matched) {
            setFormData((prev) => ({
              ...prev,
              customerName: matched.name,
              slipType: slipType // localStorageから取得した値を維持
            }))
            console.log(`得意先「${matched.name}」に自動マッチング（ブルボン上越）`)
            return
          }
        } else if (ocrClientName.includes('柏崎')) {
          const matched = clientList.find((client) => 
            client.name.includes('ブルボン') && client.name.includes('柏崎')
          )
          if (matched) {
            setFormData((prev) => ({
              ...prev,
              customerName: matched.name,
              slipType: slipType // localStorageから取得した値を維持
            }))
            console.log(`得意先「${matched.name}」に自動マッチング（ブルボン柏崎）`)
            return
          }
        }
      }
      
      // 1. 完全一致を探す
      let matched = clientList.find((client) => 
        client.name === formData.customerName ||
        client.name.toLowerCase() === ocrClientName
      )
      
      // 2. 正規化して比較（スペース、記号を除去）
      if (!matched) {
        const normalizeString = (str: string) => {
          return str.toLowerCase()
            .replace(/[\s　（）()\-－・]/g, '')
            .replace(/株式会社|㈱|有限会社|有/g, '')
        }
        
        const normalizedOCR = normalizeString(formData.customerName)
        matched = clientList.find((client) => {
          const normalizedClient = normalizeString(client.name)
          return normalizedClient === normalizedOCR ||
                 normalizedClient.includes(normalizedOCR) ||
                 normalizedOCR.includes(normalizedClient)
        })
      }
      
      // 3. キーワードベースの部分一致
      if (!matched) {
        // 重要なキーワードを抽出してマッチング
        const keywords = ['ブルボン', 'バイオマス', 'アクアクリーン', '下水道', 'アース', 'JMATE', '環境開発']
        for (const keyword of keywords) {
          if (ocrClientName.includes(keyword.toLowerCase())) {
            matched = clientList.find((client) => 
              client.name.includes(keyword)
            )
            if (matched) break
          }
        }
      }
      
      // 4. より柔軟な部分一致（各単語でマッチング）
      if (!matched) {
        matched = clientList.find((client) => {
          const clientWords = client.name.split(/[\s　]+/)
          return clientWords.some(word => 
            word.length > 2 && ocrClientName.includes(word.toLowerCase())
          )
        })
      }
      
      // マッチした場合は選択
      if (matched) {
        setFormData((prev) => ({
          ...prev,
          customerName: matched.name,
          slipType: slipType // localStorageから取得した値を維持
        }))
        console.log(`得意先「${matched.name}」に自動マッチング`)
      } else {
        console.log('得意先の自動マッチング失敗:', formData.customerName)
      }
    }
  }

  // OCR結果から品目を自動選択（高度なマッチングアルゴリズム）
  const matchWasteTypeFromOCR = (wasteTypeList: any[]) => {
    if (formData.item && wasteTypeList.length > 0) {
      const ocrItem = formData.item.toLowerCase()
      const slipType = localStorage.getItem('selectedSlipType') || '受領証'
      
      console.log('品目マッチング開始:', {
        ocrResult: formData.item,
        slipType,
        wasteTypeCount: wasteTypeList.length
      })
      
      // 品目マッチングルールの定義（優先順位順）
      const matchingRules = [
        // 汚泥関連のルール
        { patterns: ['有機汚泥', '有機性汚泥', '汚泥'], target: '汚泥' },
        // 廃プラスチック関連のルール
        { patterns: ['廃プラスチック', '廃プラ', 'プラスチック'], target: '廃プラスチック' },
        // 廃油関連のルール
        { patterns: ['廃油', '油'], target: '廃油' },
        // 木くず関連のルール
        { patterns: ['木くず', '木屑', '木材'], target: '木くず' },
        // がれき類関連のルール
        { patterns: ['がれき', 'ガレキ', '瓦礫'], target: 'がれき類' },
        // 残さ関連のルール
        { patterns: ['残さ', '残渣'], target: '残さ' },
        // ガラス・陶磁器関連のルール
        { patterns: ['ガラス', '陶磁器', 'ガラ陶'], target: 'ガラス・陶磁器くず' },
        // 金属くず関連のルール
        { patterns: ['金属', '鉄', 'スクラップ'], target: '金属くず' },
        // 紙くず関連のルール
        { patterns: ['紙くず', '紙'], target: '紙くず' },
        // 繊維くず関連のルール
        { patterns: ['繊維', '布'], target: '繊維くず' },
        // 動植物性残さ関連のルール
        { patterns: ['動植物', '食品残渣', '生ごみ'], target: '動植物性残さ' },
        // ゴムくず関連のルール
        { patterns: ['ゴム', 'ゴムくず'], target: 'ゴムくず' },
        // 廃アルカリ関連のルール
        { patterns: ['アルカリ', '廃アルカリ'], target: '廃アルカリ' },
        // 廃酸関連のルール
        { patterns: ['廃酸', '酸'], target: '廃酸' },
        // 混合廃棄物関連のルール
        { patterns: ['混合', '混廃'], target: '混合廃棄物' },
      ]
      
      // ルールベースのマッチング
      for (const rule of matchingRules) {
        for (const pattern of rule.patterns) {
          if (ocrItem.includes(pattern.toLowerCase())) {
            const matched = wasteTypeList.find((wasteType) => 
              wasteType.name === rule.target
            )
            if (matched) {
              setFormData((prev) => ({
                ...prev,
                item: matched.name
              }))
              console.log(`品目「${matched.name}」に自動マッチング（${pattern}ルール）`)
              return
            }
          }
        }
      }
      
      // 完全一致を探す
      let matched = wasteTypeList.find((wasteType) => 
        wasteType.name === formData.item ||
        wasteType.name.toLowerCase() === ocrItem
      )
      
      // 正規化して比較（記号、類、くずなどを除去）
      if (!matched) {
        const normalizeWasteType = (str: string) => {
          return str.toLowerCase()
            .replace(/[\s　・]/g, '')
            .replace(/類|くず|廃/g, '')
        }
        
        const normalizedOCR = normalizeWasteType(formData.item)
        matched = wasteTypeList.find((wasteType) => {
          const normalizedWaste = normalizeWasteType(wasteType.name)
          return normalizedWaste === normalizedOCR ||
                 normalizedWaste.includes(normalizedOCR) ||
                 normalizedOCR.includes(normalizedWaste)
        })
      }
      
      // 部分一致を探す（マスタの名前がOCR結果に含まれる）
      if (!matched) {
        matched = wasteTypeList.find((wasteType) => {
          const wasteTypeLower = wasteType.name.toLowerCase()
          // 双方向で部分一致を確認
          return ocrItem.includes(wasteTypeLower) || 
                 wasteTypeLower.includes(ocrItem)
        })
      }
      
      // マッチした場合は選択
      if (matched) {
        setFormData((prev) => ({
          ...prev,
          item: matched.name
        }))
        console.log(`品目「${matched.name}」に自動マッチング`)
      } else {
        console.log('品目の自動マッチング失敗:', formData.item)
      }
    }
  }

  const handleInputChange = (field: string, value: string) => {
    setFormData((prev) => {
      const updated = { ...prev, [field]: value }
      // 得意先が変更されても、伝票タイプは変更しない（localStorageの値を維持）
      // if (field === "customerName" && value) {
      //   updated.slipType = getSlipTypeFromClient(value)
      //   console.log(`得意先「${value}」に対応する伝票タイプ: ${updated.slipType}`)
      // }
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