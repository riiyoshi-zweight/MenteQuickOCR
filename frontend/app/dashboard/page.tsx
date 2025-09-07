"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import { LogOut } from "lucide-react"

export default function DashboardPage() {
  const [selectedCategory, setSelectedCategory] = useState<string | null>(null)
  const router = useRouter()

  const handleCategorySelect = (category: string) => {
    if (category === "industrial-waste") {
      setSelectedCategory(category)
      router.push("/industrial-waste")
    }
  }

  const handleLogout = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gray-100">
      {/* Header */}
      <header className="shadow-sm border-b" style={{ backgroundColor: "#38b6ff" }}>
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex-1" />
          {/* Increased font size from text-lg to text-xl */}
          <h1 className="text-xl font-semibold text-white">Quick OCR</h1>
          <div className="flex-1 flex justify-end">
            <button
              onClick={handleLogout}
              className="p-2 text-white hover:text-gray-200 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="ログアウト"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      {/* Main Content */}
      <main className="p-4">
        <div className="max-w-md mx-auto space-y-6">
          {/* Category Cards */}
          <div className="grid grid-cols-2 gap-4">
            {/* Industrial Waste Card - Active */}
            <Card className="bg-white shadow-sm hover:shadow-md transition-shadow cursor-pointer">
              <CardContent className="p-6 text-center space-y-4">
                <div className="flex justify-center">
                  <Image
                    src="/images/septic-tank-icon.png"
                    alt="産廃アイコン"
                    width={48}
                    height={48}
                    className="object-contain"
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-900">産廃</h3>
                  <p className="text-sm text-gray-600">産業廃棄物関連の伝票</p>
                </div>
                <Button
                  onClick={() => handleCategorySelect("industrial-waste")}
                  className="w-full text-white hover:opacity-90"
                  style={{ backgroundColor: "#38b6ff" }}
                >
                  選択
                </Button>
              </CardContent>
            </Card>

            {/* Septic Tank Card - Disabled */}
            <Card className="bg-gray-50 shadow-sm opacity-50 cursor-not-allowed">
              <CardContent className="p-6 text-center space-y-4">
                <div className="flex justify-center">
                  <Image
                    src="/images/industrial-waste-icon.png"
                    alt="浄化槽アイコン"
                    width={48}
                    height={48}
                    className="object-contain grayscale"
                  />
                </div>
                <div className="space-y-2">
                  <h3 className="font-semibold text-gray-500">浄化槽</h3>
                  <p className="text-sm text-gray-400">浄化槽点検関連の伝票</p>
                </div>
                <Button disabled className="w-full bg-gray-400 text-gray-300 cursor-not-allowed">
                  準備中
                </Button>
              </CardContent>
            </Card>
          </div>
        </div>
      </main>
    </div>
  )
}
