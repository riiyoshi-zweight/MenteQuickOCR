"use client"

import { useRouter } from "next/navigation"
import { LogOut, FileText, ClipboardCheck, ChevronRight } from "lucide-react"

type MenuItem = {
  id: string
  label: string
  description: string
  icon: React.ComponentType<{ size?: number; className?: string }>
  href: string
  accentColor: string
  iconBg: string
}

const menuItems: MenuItem[] = [
  {
    id: "septic-inspection",
    label: "浄化槽点検",
    description: "点検記録の入力・登録",
    icon: ClipboardCheck,
    href: "/septic-inspection",
    accentColor: "#38b6ff",
    iconBg: "#e8f6ff",
  },
  {
    id: "dashboard",
    label: "伝票集計",
    description: "産廃伝票の撮影・OCR処理",
    icon: FileText,
    href: "/dashboard",
    accentColor: "#38b6ff",
    iconBg: "#e8f6ff",
  },
]

export default function MenuPage() {
  const router = useRouter()

  const handleLogout = () => {
    router.push("/")
  }

  return (
    <div className="min-h-screen bg-gray-50">
      {/* ヘッダー: 既存ページと同一構造 */}
      <header className="bg-[#38b6ff] text-white shadow-sm">
        <div className="flex items-center justify-between px-4 py-3">
          <div className="flex-1" />
          <h1 className="text-xl font-semibold">Quick OCR</h1>
          <div className="flex-1 flex justify-end">
            <button
              onClick={handleLogout}
              className="p-2 hover:bg-white/10 rounded-lg transition-colors"
              aria-label="ログアウト"
            >
              <LogOut size={20} />
            </button>
          </div>
        </div>
      </header>

      <main className="p-4 pt-6">
        <div className="max-w-md mx-auto space-y-3">
          {menuItems.map((item) => {
            const Icon = item.icon
            return (
              <button
                key={item.id}
                onClick={() => router.push(item.href)}
                className="w-full bg-white rounded-xl shadow-sm border border-gray-100 flex items-center overflow-hidden text-left transition-all duration-150 hover:shadow-md active:scale-[0.99]"
              >
                {/* 左端カラーバー */}
                <div
                  className="self-stretch w-1 flex-shrink-0"
                  style={{ backgroundColor: item.accentColor }}
                />

                {/* アイコンエリア */}
                <div
                  className="flex items-center justify-center w-14 h-14 mx-4 my-5 rounded-xl flex-shrink-0"
                  style={{ backgroundColor: item.iconBg }}
                >
                  <Icon size={26} className="text-[#38b6ff]" />
                </div>

                {/* テキストエリア */}
                <div className="flex-1 min-w-0 py-5">
                  <p className="text-base font-semibold text-gray-800 leading-tight">
                    {item.label}
                  </p>
                  <p className="text-sm text-gray-400 mt-0.5 leading-tight">
                    {item.description}
                  </p>
                </div>

                {/* 右端 chevron */}
                <ChevronRight size={20} className="text-gray-300 flex-shrink-0 mr-4" />
              </button>
            )
          })}
        </div>
      </main>
    </div>
  )
}
