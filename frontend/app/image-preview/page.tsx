"use client"

import { useState, useEffect } from "react"
import { ArrowLeft, Check, RotateCcw } from "lucide-react"
import { useRouter, useSearchParams } from "next/navigation"

export default function ImagePreview() {
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const router = useRouter()
  const searchParams = useSearchParams()

  useEffect(() => {
    // Get image data from localStorage or URL params
    const imageData = localStorage.getItem("capturedImage")
    if (imageData) {
      setCapturedImage(imageData)
    }
  }, [])

  const handleRetake = () => {
    localStorage.removeItem("capturedImage")
    router.back()
  }

  const handleConfirm = () => {
    router.push("/preview")
  }

  const handleBack = () => {
    localStorage.removeItem("capturedImage")
    router.back()
  }

  return (
    <div className="min-h-screen bg-white flex flex-col">
      <header className="bg-[#38b6ff] text-white p-4 flex items-center justify-between">
        <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-semibold text-center flex-1">画像プレビュー</h1>
        <div className="w-10"></div> {/* Spacer for centering */}
      </header>

      <div className="flex-1 relative">
        {capturedImage && (
          <>
            <img src={capturedImage || "/placeholder.svg"} alt="撮影した画像" className="w-full h-full object-cover" />

            <div className="absolute bottom-8 left-1/2 transform -translate-x-1/2 flex gap-6">
              <button
                onClick={handleRetake}
                className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-lg hover:bg-gray-100 transition-colors"
              >
                <RotateCcw className="w-7 h-7 text-gray-700" />
              </button>

              <button
                onClick={handleConfirm}
                className="w-16 h-16 bg-[#38b6ff] rounded-full flex items-center justify-center shadow-lg hover:bg-[#38b6ff]/90 transition-colors"
              >
                <Check className="w-7 h-7 text-white" />
              </button>
            </div>
          </>
        )}
      </div>
    </div>
  )
}
