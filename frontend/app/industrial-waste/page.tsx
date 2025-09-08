"use client"

import { ArrowLeft, LogOut } from "lucide-react"
import { useRouter } from "next/navigation"
import { useState } from "react"
import Image from "next/image"
import CameraCapture from "@/components/camera-capture"

export default function IndustrialWastePage() {
  const router = useRouter()
  const [showCamera, setShowCamera] = useState(false)
  const [selectedCompany, setSelectedCompany] = useState<string>("")

  const handleBack = () => {
    router.push("/dashboard")
  }

  const handleLogout = () => {
    router.push("/")
  }

  const handleCompanySelect = (company: typeof companies[0]) => {
    setSelectedCompany(company.name)
    // 選択した会社と伝票タイプをlocalStorageに保存
    localStorage.setItem('selectedCompany', company.name)
    localStorage.setItem('selectedSlipType', company.slipType)
    setShowCamera(true)
  }

  const handleCameraBack = () => {
    setShowCamera(false)
    setSelectedCompany("")
  }

  const handleImageCapture = (imageData: string) => {
    console.log("Image captured for", selectedCompany)
    setShowCamera(false)
    setSelectedCompany("")
  }

  const handleManualInput = () => {
    router.push("/manual-input")
  }

  const companies = [
    {
      id: "earth-toyama",
      name: "アース富山",
      subtitle: "計量票",
      slipType: "計量票",
      icon: "/images/earth-toyama-icon.png",
    },
    {
      id: "earth-nagano",
      name: "アース長野",
      subtitle: "計量伝票",
      slipType: "計量伝票",
      icon: "/images/earth-nagano-icon.png",
    },
    {
      id: "jmate-bio",
      name: "Jマテバイオ",
      subtitle: "検量書",
      slipType: "検量書",
      icon: "/images/jmate-bio-icon.png",
    },
    {
      id: "environmental-dev",
      name: "環境開発",
      subtitle: "受領証",
      slipType: "受領証",
      icon: "/images/environmental-dev-icon.png",
    },
  ]

  if (showCamera) {
    return <CameraCapture onBack={handleCameraBack} onCapture={handleImageCapture} companyName={selectedCompany} />
  }

  return (
    <div className="min-h-screen bg-gray-50">
      <header className="bg-[#38b6ff] text-white p-4 flex items-center justify-between">
        <button onClick={handleBack} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <ArrowLeft className="w-6 h-6" />
        </button>

        <h1 className="text-xl font-semibold">産廃</h1>

        <button onClick={handleLogout} className="p-2 hover:bg-white/10 rounded-lg transition-colors">
          <LogOut className="w-6 h-6" />
        </button>
      </header>

      <main className="p-6">
        <div className="grid grid-cols-2 gap-4">
          {companies.map((company) => (
            <div
              key={company.id}
              className="bg-white rounded-xl p-6 shadow-sm border border-gray-100 flex flex-col items-center text-center"
            >
              <div className="w-24 h-24 mb-4 flex items-center justify-center">
                <Image
                  src={company.icon || "/placeholder.svg"}
                  alt={company.name}
                  width={96}
                  height={96}
                  className="w-full h-full object-contain"
                />
              </div>

              <button
                onClick={() => handleCompanySelect(company)}
                className="border-2 border-[#38b6ff] text-[#38b6ff] bg-white px-6 py-2 rounded-full font-medium hover:bg-[#38b6ff]/5 transition-colors"
              >
                選択
              </button>
            </div>
          ))}
        </div>

        <div className="mt-8">
          <button
            onClick={handleManualInput}
            className="w-full bg-white border-2 border-[#38b6ff] text-[#38b6ff] py-4 rounded-xl font-medium flex items-center justify-center gap-2 hover:bg-[#38b6ff]/5 transition-colors"
          >
            <svg className="w-5 h-5" fill="none" stroke="currentColor" viewBox="0 0 24 24">
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth={2}
                d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z"
              />
            </svg>
            手動で入力
          </button>
        </div>
      </main>
    </div>
  )
}
