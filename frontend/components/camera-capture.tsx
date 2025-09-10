"use client"

import { useState, useRef, useCallback } from "react"
import { ArrowLeft, Camera } from "lucide-react"
import PhotoConfirmation from "./photo-confirmation"
import { toast } from "sonner"

interface CameraCaptureProps {
  onBack: () => void
  onCapture?: (imageData: string) => void
  companyName: string
}

export default function CameraCapture({ onBack, companyName }: CameraCaptureProps) {
  const [stream, setStream] = useState<MediaStream | null>(null)
  const [capturedImage, setCapturedImage] = useState<string | null>(null)
  const [isLoading, setIsLoading] = useState(false)
  const [showConfirmation, setShowConfirmation] = useState(false)
  const videoRef = useRef<HTMLVideoElement>(null)
  const canvasRef = useRef<HTMLCanvasElement>(null)

  const startCamera = useCallback(async () => {
    try {
      setIsLoading(true)
      const mediaStream = await navigator.mediaDevices.getUserMedia({
        video: {
          facingMode: "environment", // Use back camera
          width: { ideal: 1920 },
          height: { ideal: 1080 },
        },
      })
      setStream(mediaStream)
      if (videoRef.current) {
        videoRef.current.srcObject = mediaStream
      }
    } catch (error) {
      console.error("Error accessing camera:", error)
      toast.error("カメラにアクセスできませんでした。")
    } finally {
      setIsLoading(false)
    }
  }, [])

  const stopCamera = useCallback(() => {
    if (stream) {
      stream.getTracks().forEach((track) => track.stop())
      setStream(null)
    }
  }, [stream])

  const capturePhoto = useCallback(() => {
    if (videoRef.current && canvasRef.current) {
      const video = videoRef.current
      const canvas = canvasRef.current
      const context = canvas.getContext("2d")

      canvas.width = video.videoWidth
      canvas.height = video.videoHeight

      if (context) {
        context.drawImage(video, 0, 0)
        const imageData = canvas.toDataURL("image/jpeg", 0.8)
        setCapturedImage(imageData)
        setShowConfirmation(true)
        stopCamera()
      }
    }
  }, [stopCamera])

  const handleRetake = useCallback(() => {
    setCapturedImage(null)
    setShowConfirmation(false)
    startCamera()
  }, [startCamera])

  // Start camera when component mounts
  useState(() => {
    startCamera()
    return () => stopCamera()
  })

  // Show photo confirmation screen if image is captured
  if (showConfirmation && capturedImage) {
    return (
      <PhotoConfirmation
        imageData={capturedImage}
        companyName={companyName}
        onRetake={handleRetake}
      />
    )
  }

  return (
    <div className="fixed inset-0 bg-white flex flex-col">
      <header className="bg-[#38b6ff] text-white p-4 flex items-center justify-between flex-shrink-0">
        <button onClick={onBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>
        <h1 className="text-xl font-semibold">{companyName} - カメラ</h1>
        <div className="w-10" />
      </header>

      <div className="flex-1 relative overflow-hidden">
        <video ref={videoRef} autoPlay playsInline muted className="absolute inset-0 w-full h-full object-cover" />
        <canvas ref={canvasRef} className="hidden" />

        {isLoading && (
          <div className="absolute inset-0 flex items-center justify-center bg-black/50">
            <div className="text-white text-lg">カメラを起動中...</div>
          </div>
        )}

        <div className="absolute bottom-0 left-0 right-0 pb-8 flex justify-center">
          <button
            onClick={capturePhoto}
            disabled={!stream || isLoading}
            className="w-16 h-16 bg-white rounded-full flex items-center justify-center shadow-2xl border-4 border-gray-400 hover:bg-gray-50 transition-colors disabled:opacity-50"
          >
            <Camera className="w-8 h-8 text-gray-800" />
          </button>
        </div>
      </div>
    </div>
  )
}