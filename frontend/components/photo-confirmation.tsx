"use client"

import { useState } from "react"
import { ArrowLeft, RotateCcw, Check } from "lucide-react"
import { useRouter } from "next/navigation"
import { ocrAPI } from "@/lib/api"

interface PhotoConfirmationProps {
  imageData: string
  companyName: string
  onRetake: () => void
}

export default function PhotoConfirmation({ imageData, companyName, onRetake }: PhotoConfirmationProps) {
  const [isProcessing, setIsProcessing] = useState(false)
  const [progress, setProgress] = useState(0)
  const [statusMessage, setStatusMessage] = useState("")
  const [ocrPreview, setOcrPreview] = useState<any>(null)
  const router = useRouter()

  const updateProgress = (value: number, message: string) => {
    setProgress(value)
    setStatusMessage(message)
  }

  const confirmPhoto = async () => {
    setIsProcessing(true)
    setOcrPreview(null)
    
    try {
      // Get slip type from localStorage
      const slipType = localStorage.getItem('selectedSlipType') || '受領証'
      
      // Store image for preview
      localStorage.setItem("capturedImage", imageData)
      
      // Update progress
      updateProgress(0.1, '伝票情報を取得しています...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      updateProgress(0.2, 'ユーザー情報を確認しています...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      updateProgress(0.3, '画像を解析しています...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      updateProgress(0.5, 'OpenAI Vision APIで解析中...')
      
      // Process OCR
      const ocrResult = await ocrAPI.processImage(imageData, slipType)
      
      updateProgress(0.7, '結果を処理しています...')
      await new Promise(resolve => setTimeout(resolve, 300))
      
      // Check if OCR was successful - only netWeight is truly required
      // Date can default to today, client and product can be selected from dropdown
      if (!ocrResult.success) {
        throw new Error('OCR処理に失敗しました')
      }
      
      // Even if some fields are missing, continue if we have any data
      const ocrData = ocrResult.data || {}
      const confidence = ocrResult.confidence || {}
      
      // Show OCR result preview with confidence indicators
      updateProgress(0.8, '読み取り結果を確認中...')
      setOcrPreview({
        ...ocrData,
        confidence: confidence
      })
      await new Promise(resolve => setTimeout(resolve, 1000))
      
      // Store OCR result (with defaults for missing fields)
      const finalResult = {
        slipDate: ocrData.slipDate || new Date().toISOString().split('T')[0],
        clientName: ocrData.clientName || '',
        netWeight: ocrData.netWeight || '',
        productName: ocrData.productName || '',
        manifestNumber: '' // 電子マニフェストは常に空白
      }
      localStorage.setItem('ocrResult', JSON.stringify(finalResult))
      
      updateProgress(1.0, '完了しました！')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Navigate to preview
      router.push("/preview")
    } catch (error) {
      console.error('OCR processing failed:', error)
      setOcrPreview(null)
      setProgress(0)
      setStatusMessage('')
      alert('OCR処理に失敗しました。もう一度お試しください。')
      // Don't navigate back, just reset the processing state
      setIsProcessing(false)
    }
  }

  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      <header className="bg-[#38b6ff] text-white p-4 flex items-center justify-between flex-shrink-0">
        <button onClick={onRetake} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-semibold">{companyName} - 写真確認</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 relative overflow-hidden">
        <img 
          src={imageData} 
          alt="Captured" 
          className="absolute inset-0 w-full h-full object-cover" 
          style={{ opacity: isProcessing ? 0.3 : 1 }}
        />

        {!isProcessing && (
          <div className="absolute bottom-0 left-0 right-0 pb-8 flex justify-center gap-4">
            <button
              onClick={onRetake}
              className="w-14 h-14 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-gray-400 hover:bg-gray-50 transition-colors"
            >
              <RotateCcw className="w-6 h-6 text-gray-800" />
            </button>

            <button
              onClick={confirmPhoto}
              className="w-14 h-14 bg-[#38b6ff] rounded-full flex items-center justify-center shadow-2xl border-4 border-[#2a9ae6] hover:bg-[#2a9ae6] transition-colors"
            >
              <Check className="w-6 h-6 text-white" />
            </button>
          </div>
        )}
        
        {isProcessing && (
          <div className="absolute inset-0 flex items-center justify-center">
            <div className="bg-white p-8 rounded-2xl shadow-2xl max-w-sm w-full mx-4">
              <div className="text-center">
                <div className="mb-6">
                  <div className="animate-spin rounded-full h-16 w-16 border-4 border-gray-200 border-t-[#38b6ff] mx-auto"></div>
                </div>
                
                <h2 className="text-xl font-semibold mb-2">OCR処理中</h2>
                <p className="text-sm text-gray-600 mb-4">{statusMessage}</p>
                
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden mb-4">
                  <div 
                    className="bg-[#38b6ff] h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                
                <p className="text-xs text-gray-500 mb-4">{Math.round(progress * 100)}%</p>
                
                {/* OCR Result Preview */}
                {ocrPreview && (
                  <div className="mt-4 p-4 bg-gray-50 rounded-lg text-left">
                    <h3 className="text-sm font-semibold mb-2 text-gray-700">読み取り結果:</h3>
                    <div className="space-y-2 text-xs">
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">日付:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ocrPreview.slipDate || '今日の日付'}</span>
                          {ocrPreview.confidence?.slipDate && (
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              ocrPreview.confidence.slipDate >= 80 ? 'bg-green-100 text-green-700' : 
                              ocrPreview.confidence.slipDate >= 50 ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-gray-100 text-gray-600'
                            }`}>
                              {ocrPreview.confidence.slipDate === 50 ? 'デフォルト' : `${ocrPreview.confidence.slipDate}%`}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">得意先:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate ml-2">{ocrPreview.clientName || '未読取'}</span>
                          {ocrPreview.confidence?.clientName !== undefined && (
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              ocrPreview.confidence.clientName >= 80 ? 'bg-green-100 text-green-700' : 
                              ocrPreview.confidence.clientName > 0 ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-red-100 text-red-700'
                            }`}>
                              {ocrPreview.confidence.clientName === 0 ? '要選択' : `${ocrPreview.confidence.clientName}%`}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">正味重量:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium">{ocrPreview.netWeight ? `${ocrPreview.netWeight}kg` : '未読取'}</span>
                          {ocrPreview.confidence?.netWeight !== undefined && (
                            <span className={`px-1.5 py-0.5 rounded text-xs font-semibold ${
                              ocrPreview.confidence.netWeight === 100 ? 'bg-green-100 text-green-700' : 
                              'bg-red-100 text-red-700'
                            }`}>
                              {ocrPreview.confidence.netWeight === 100 ? '✓' : '要確認'}
                            </span>
                          )}
                        </div>
                      </div>
                      
                      <div className="flex justify-between items-center">
                        <span className="text-gray-600">品目:</span>
                        <div className="flex items-center gap-2">
                          <span className="font-medium truncate ml-2">{ocrPreview.productName || '未読取'}</span>
                          {ocrPreview.confidence?.productName !== undefined && (
                            <span className={`px-1.5 py-0.5 rounded text-xs ${
                              ocrPreview.confidence.productName >= 80 ? 'bg-green-100 text-green-700' : 
                              ocrPreview.confidence.productName > 0 ? 'bg-yellow-100 text-yellow-700' : 
                              'bg-red-100 text-red-700'
                            }`}>
                              {ocrPreview.confidence.productName === 0 ? '要選択' : `${ocrPreview.confidence.productName}%`}
                            </span>
                          )}
                        </div>
                      </div>
                    </div>
                    
                    {/* Show warning if net weight is missing */}
                    {(!ocrPreview.netWeight || ocrPreview.confidence?.netWeight === 0) && (
                      <div className="mt-3 p-2 bg-yellow-50 border border-yellow-200 rounded">
                        <p className="text-xs text-yellow-800">
                          ⚠️ 正味重量が読み取れませんでした。プレビュー画面で手動入力してください。
                        </p>
                      </div>
                    )}
                  </div>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}