"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, ChevronDown } from "lucide-react"
import { useRouter } from "next/navigation"
import { toast } from "sonner"
// import { getSlipTypeFromClient } from "@/utils/slipTypeMapping" // 削除：伝票タイプはlocalStorageから取得

export default function PreviewPage() {
  const router = useRouter()
  const [showConfirmation, setShowConfirmation] = useState(false)
  const [clients, setClients] = useState<any[]>([])
  const [wasteTypes, setWasteTypes] = useState<any[]>([])
  const [workerName, setWorkerName] = useState<string>("テストユーザー") // 作業者名の状態を追加
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
    // ログインユーザー名を取得
    fetchUserInfo()
    
    // OCR結果を先に読み込み、そのデータを使って得意先・品目を取得
    const ocrData = loadOCRResults()
    if (ocrData) {
      fetchClients(ocrData)
      fetchWasteTypes(ocrData)
    } else {
      // OCRデータがない場合は通常通り取得
      fetchClients(null)
      fetchWasteTypes(null)
    }
  }, [])

  // OCR結果を読み込み
  const loadOCRResults = () => {
    const ocrResultStr = localStorage.getItem('ocrResult')
    const selectedSlipType = localStorage.getItem('selectedSlipType') || '受領証'
    
    if (ocrResultStr) {
      try {
        const ocrData = JSON.parse(ocrResultStr)

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
        
        // OCRデータを返す（マッチングで使用）
        return {
          clientName: ocrData.clientName || '',
          productName: ocrData.productName || '',
          slipType: selectedSlipType
        }
      } catch (error) {
        console.error('OCR結果の読み込みエラー:', error)
        return null
      }
    }
    return null
  }

  // ログインユーザー情報を取得
  const fetchUserInfo = async () => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch(`/api/auth/me`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success && data.data) {
          setWorkerName(data.data.name || data.data.userId || "テストユーザー")
        }
      }
    } catch (error) {
      console.error("Failed to fetch user info:", error)
    }
  }

  const fetchClients = async (ocrData: any) => {
    try {
      const token = localStorage.getItem("authToken")
      const slipType = localStorage.getItem('selectedSlipType') || '受領証'
      
      // slip_typeをクエリパラメータとして追加
      const response = await fetch(`/api/slips/clients?slipType=${encodeURIComponent(slipType)}`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setClients(data.data)

          // OCR結果と得意先をマッチング（OCRデータを直接渡す）
          if (ocrData && ocrData.clientName) {
            matchClientFromOCR(data.data, ocrData.clientName, ocrData.slipType)
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch clients:", error)
    }
  }

  const fetchWasteTypes = async (ocrData: any) => {
    try {
      const token = localStorage.getItem("authToken")
      const response = await fetch(`/api/slips/waste-types`, {
        headers: {
          "Authorization": `Bearer ${token}`
        }
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          setWasteTypes(data.data)
          
          // OCR結果と品目をマッチング（OCRデータを直接渡す）
          if (ocrData && ocrData.productName) {
            matchWasteTypeFromOCR(data.data, ocrData.productName, ocrData.slipType)
          }
        }
      }
    } catch (error) {
      console.error("Failed to fetch waste types:", error)
    }
  }

  // OCR結果から得意先を自動選択（高度なマッチングアルゴリズム）
  const matchClientFromOCR = (clientList: any[], ocrClientName: string, slipType: string) => {
    if (ocrClientName && clientList.length > 0) {
      const ocrClientNameLower = ocrClientName.toLowerCase()
      
      // 伝票タイプ別の特別ルール
      // 計量票の特別ルール
      if (slipType === '計量票') {
        // 「上越マテリアル」と「バイオマス」の両方を含む場合は「バイオマス」を選択
        if (ocrClientNameLower.includes('上越マテリアル') && ocrClientNameLower.includes('バイオマス')) {
          const matched = clientList.find((client) => 
            client.name === 'バイオマス'
          )
          if (matched) {
            setFormData((prev) => ({
              ...prev,
              customerName: matched.name,
              slipType: slipType // localStorageから取得した値を維持
            }))

            return
          }
        }
        
        // 「上越市水道局」→「上越市下水道センター」の変換
        if (ocrClientNameLower.includes('上越市') && (ocrClientNameLower.includes('水道') || ocrClientNameLower.includes('下水道'))) {
          const matched = clientList.find((client) => 
            client.name === '上越市下水道センター'
          )
          if (matched) {
            setFormData((prev) => ({
              ...prev,
              customerName: matched.name,
              slipType: slipType // localStorageから取得した値を維持
            }))

            return
          }
        }
      }
      
      // 検量書の特別ルール（○○便、○○帰り便）
      if (slipType === '検量書' && (ocrClientNameLower.includes('便') || ocrClientNameLower.includes('帰り'))) {
        // 「アース帰り便」→「アース長野」などの変換
        const transportPatterns = [
          { pattern: 'アース', match: 'アース長野' },
          { pattern: 'JMATE', match: 'Jマテバイオ' },
          { pattern: 'jmate', match: 'Jマテバイオ' },
        ]
        
        for (const { pattern, match } of transportPatterns) {
          if (ocrClientNameLower.includes(pattern.toLowerCase())) {
            const matched = clientList.find((client) => 
              client.name === match
            )
            if (matched) {
              setFormData((prev) => ({
                ...prev,
                customerName: matched.name,
                slipType: slipType // localStorageから取得した値を維持
              }))

              return
            }
          }
        }
      }
      
      // 受領証の特別ルール（ブルボン）
      if (slipType === '受領証' && ocrClientNameLower.includes('ブルボン')) {
        // 「上越工場」か「柏崎工場」を含むか判定
        if (ocrClientNameLower.includes('上越')) {
          const matched = clientList.find((client) => 
            client.name.includes('ブルボン') && client.name.includes('上越')
          )
          if (matched) {
            setFormData((prev) => ({
              ...prev,
              customerName: matched.name,
              slipType: slipType // localStorageから取得した値を維持
            }))

            return
          }
        } else if (ocrClientNameLower.includes('柏崎')) {
          const matched = clientList.find((client) => 
            client.name.includes('ブルボン') && client.name.includes('柏崎')
          )
          if (matched) {
            setFormData((prev) => ({
              ...prev,
              customerName: matched.name,
              slipType: slipType // localStorageから取得した値を維持
            }))

            return
          }
        }
      }
      
      // 1. 完全一致を探す
      let matched = clientList.find((client) => 
        client.name === ocrClientName ||
        client.name.toLowerCase() === ocrClientNameLower
      )
      
      // 2. 正規化して比較（スペース、記号を除去）
      if (!matched) {
        const normalizeString = (str: string) => {
          return str.toLowerCase()
            .replace(/[\s　（）()\-－・]/g, '')
            .replace(/株式会社|㈱|有限会社|有/g, '')
            .replace(/[・]/g, '') // 中点を除去
        }
        
        const normalizedOCR = normalizeString(ocrClientName)
        matched = clientList.find((client) => {
          const normalizedClient = normalizeString(client.name)
          return normalizedClient === normalizedOCR ||
                 normalizedClient.includes(normalizedOCR) ||
                 normalizedOCR.includes(normalizedClient)
        })
      }
      
      // 3. 伝票タイプ別の優先キーワードマッチング
      if (!matched) {
        const slipTypeKeywords: { [key: string]: string[] } = {
          '受領証': ['ブルボン', 'ぶるぼん', 'bourbon', '環境開発', 'かんきょうかいはつ', '新潟環境'],
          '検量書': ['jマテバイオ', 'jまてばいお', 'ジェイマテバイオ', 'JMATE', 'マテバイオ', '上越マテリアル'],
          '計量票': ['アース富山', 'あーす富山', 'earth富山', 'アースとやま'],
          '計量伝票': ['アース長野', 'あーす長野', 'earth長野', 'アースながの']
        }
        
        const keywords = slipTypeKeywords[slipType] || []
        const generalKeywords = ['バイオマス', 'アクアクリーン', '下水道', '工場', 'センター', '製紙', '食品']
        const allKeywords = [...keywords, ...generalKeywords]
        
        for (const keyword of allKeywords) {
          const keywordLower = keyword.toLowerCase()
          if (ocrClientNameLower.includes(keywordLower)) {
            matched = clientList.find((client) => 
              client.name.toLowerCase().includes(keywordLower)
            )
            if (matched) {
              break
            }
          }
        }
      }
      
      // 4. より柔軟な部分一致（各単語でマッチング）
      if (!matched) {
        matched = clientList.find((client) => {
          const clientWords = client.name.split(/[\s　・]+/)
          return clientWords.some(word => 
            word.length > 2 && ocrClientNameLower.includes(word.toLowerCase())
          )
        })
      }
      
      // 5. 編集距離ベースのマッチング（類似度が高いものを選択）
      if (!matched && clientList.length <= 20) { // リストが小さい場合のみ
        const calculateSimilarity = (str1: string, str2: string) => {
          const longer = str1.length > str2.length ? str1 : str2
          const shorter = str1.length > str2.length ? str2 : str1
          if (longer.length === 0) return 1.0
          
          // 簡易的な類似度計算（共通文字の割合）
          let matchCount = 0
          for (let i = 0; i < shorter.length; i++) {
            if (longer.includes(shorter[i])) matchCount++
          }
          return matchCount / longer.length
        }
        
        let bestMatch = null
        let bestScore = 0
        
        for (const client of clientList) {
          const score = calculateSimilarity(ocrClientNameLower, client.name.toLowerCase())
          if (score > bestScore && score > 0.6) { // 60%以上の類似度
            bestScore = score
            bestMatch = client
          }
        }
        
        if (bestMatch) {
          matched = bestMatch
        }
      }

      // マッチした場合は選択
      if (matched) {
        setFormData((prev) => ({
          ...prev,
          customerName: matched.name,
          slipType: slipType // localStorageから取得した値を維持
        }))
      }
    }
  }

  // OCR結果から品目を自動選択（高度なマッチングアルゴリズム）
  const matchWasteTypeFromOCR = (wasteTypeList: any[], ocrProductName: string, slipType: string) => {
    if (ocrProductName && wasteTypeList.length > 0) {
      const ocrItem = ocrProductName.toLowerCase()
      
      // 検量書（Jマテバイオ）の特別ルール
      if (slipType === '検量書' && ocrProductName.toLowerCase().includes('産廃生ゴミ')) {
        const matched = wasteTypeList.find((wasteType) => 
          wasteType.name === '残さ'
        )
        if (matched) {
          setFormData((prev) => ({
            ...prev,
            item: matched.name
          }))
          return
        }
      }
      
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
        // 残さ関連のルール（産廃生ゴミも追加）
        { patterns: ['残さ', '残渣', '産廃生ゴミ', '産廃生ごみ'], target: '残さ' },
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
      
      // テキスト正規化関数
      const normalizeText = (text: string) => {
        return text
          .toLowerCase()
          .replace(/[\s　]+/g, '') // スペースを除去
          .replace(/[・]/g, '') // 中点を除去
      }
      
      const normalizedOCR = normalizeText(ocrItem)
      
      // ルールベースのマッチング
      for (const rule of matchingRules) {
        for (const pattern of rule.patterns) {
          if (normalizedOCR.includes(normalizeText(pattern))) {
            const matched = wasteTypeList.find((wasteType) => 
              normalizeText(wasteType.name).includes(normalizeText(rule.target)) ||
              wasteType.name === rule.target
            )
            if (matched) {
              setFormData((prev) => ({
                ...prev,
                item: matched.name
              }))
              return
            }
          }
        }
      }
      
      // 完全一致を探す（正規化後）
      let matched = wasteTypeList.find((wasteType) => 
        normalizeText(wasteType.name) === normalizedOCR
      )
      
      // 部分一致
      if (!matched) {
        matched = wasteTypeList.find((wasteType) => {
          const normalizedWaste = normalizeText(wasteType.name)
          return normalizedWaste.includes(normalizedOCR) || normalizedOCR.includes(normalizedWaste)
        })
      }
      
      // より柔軟な部分一致（各単語でマッチング）
      if (!matched) {
        matched = wasteTypeList.find((wasteType) => {
          const wasteWords = wasteType.name.split(/[\s　・]+/)
          return wasteWords.some(word => 
            word.length > 1 && normalizedOCR.includes(normalizeText(word))
          )
        })
      }
      
      // 類似度ベースのマッチング
      if (!matched && wasteTypeList.length <= 30) {
        let bestMatch = null
        let bestScore = 0
        
        for (const wasteType of wasteTypeList) {
          const normalizedWaste = normalizeText(wasteType.name)
          let score = 0
          
          // 共通文字数をカウント
          for (let i = 0; i < Math.min(normalizedOCR.length, normalizedWaste.length); i++) {
            if (normalizedOCR[i] === normalizedWaste[i]) score++
          }
          
          // スコアを正規化
          const normalizedScore = score / Math.max(normalizedOCR.length, normalizedWaste.length)
          
          if (normalizedScore > bestScore && normalizedScore > 0.5) {
            bestScore = normalizedScore
            bestMatch = wasteType
          }
        }
        
        if (bestMatch) {
          matched = bestMatch
        }
      }

      // マッチした場合は選択
      if (matched) {
        setFormData((prev) => ({
          ...prev,
          item: matched.name
        }))
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
      const token = localStorage.getItem("authToken")
      const response = await fetch(`/api/slips`, {
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
            <div className="font-medium">{workerName}</div>
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

        {/* Manifest Number Field */}
        <div className="space-y-2">
          <label className="block text-sm font-medium text-gray-700">
            電子マニフェスト4桁
          </label>
          <input
            type="text"
            value={formData.manifestNumber}
            onChange={(e) => handleInputChange("manifestNumber", e.target.value)}
            placeholder="4桁の番号を入力"
            maxLength={4}
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