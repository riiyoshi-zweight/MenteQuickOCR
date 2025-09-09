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
  const router = useRouter()

  const updateProgress = (value: number, message: string) => {
    setProgress(value)
    setStatusMessage(message)
  }

  const confirmPhoto = async () => {
    setIsProcessing(true)
    
    try {
      // Get slip type from localStorage
      const slipType = localStorage.getItem('selectedSlipType') || '受領証'
      
      // Store image for preview
      localStorage.setItem("capturedImage", imageData)
      
      // Update progress
      updateProgress(0.1, '伝票情報を取得しています...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      updateProgress(0.2, 'ユーザー情報を確認しています...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      updateProgress(0.3, '画像を解析しています...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      updateProgress(0.5, 'OpenAI Vision APIで解析中...')
      
      // Process OCR
      const ocrResult = await ocrAPI.processImage(imageData, slipType)
      
      updateProgress(0.8, '結果を準備しています...')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Store OCR result
      if (ocrResult.success && ocrResult.data) {
        localStorage.setItem('ocrResult', JSON.stringify(ocrResult.data))
      } else {
        localStorage.setItem('ocrResult', JSON.stringify({}))
      }
      
      updateProgress(1.0, '完了しました！')
      await new Promise(resolve => setTimeout(resolve, 500))
      
      // Navigate to preview
      router.push("/preview")
    } catch (error) {
      console.error('OCR processing failed:', error)
      alert('OCR処理に失敗しました。もう一度お試しください。')
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
                
                <div className="w-full bg-gray-200 rounded-full h-2 overflow-hidden">
                  <div 
                    className="bg-[#38b6ff] h-full rounded-full transition-all duration-500 ease-out"
                    style={{ width: `${progress * 100}%` }}
                  />
                </div>
                
                <p className="text-xs text-gray-500 mt-2">{Math.round(progress * 100)}%</p>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  )
}