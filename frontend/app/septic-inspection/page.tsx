"use client"

import { useState } from "react"
import { useRouter } from "next/navigation"
import { Button } from "@/components/ui/button"
import { Card, CardContent } from "@/components/ui/card"
import {
  Sheet,
  SheetContent,
  SheetHeader,
  SheetTitle,
  SheetTrigger,
  SheetClose,
} from "@/components/ui/sheet"
import {
  ClipboardCheck,
  ListOrdered,
  Users,
  GripVertical,
  ChevronRight,
  ArrowLeft,
  FileText,
  CheckCircle,
  LogOut,
  Menu,
} from "lucide-react"
import { initialCustomers, type Customer } from "@/lib/septic/customers"
import { InspectionForm } from "@/components/septic/inspection-form"

type Tab = "inspection" | "order" | "customers"

const BRAND = "#38b6ff"
const BRAND_BG = "#e8f6ff"

const TAB_LABEL: Record<Tab, string> = {
  inspection: "点検入力",
  order: "点検順調整",
  customers: "得意先一覧",
}

export default function SepticInspectionPage() {
  const router = useRouter()
  const [activeTab, setActiveTab] = useState<Tab>("inspection")
  const [customers, setCustomers] = useState<Customer[]>(initialCustomers)
  const [selectedCustomer, setSelectedCustomer] = useState<Customer | null>(null)
  const [draggedIndex, setDraggedIndex] = useState<number | null>(null)
  const [navOpen, setNavOpen] = useState(false)

  const handleDragStart = (index: number) => setDraggedIndex(index)

  const handleDragOver = (e: React.DragEvent, index: number) => {
    e.preventDefault()
    if (draggedIndex === null || draggedIndex === index) return
    const next = [...customers]
    const [moved] = next.splice(draggedIndex, 1)
    next.splice(index, 0, moved)
    setCustomers(next)
    setDraggedIndex(index)
  }

  const handleDragEnd = () => setDraggedIndex(null)

  const handleCustomerSelect = (customer: Customer) => setSelectedCustomer(customer)
  const handleFormBack = () => setSelectedCustomer(null)
  const handleFormSubmit = () => {
    if (selectedCustomer) {
      setCustomers((prev) =>
        prev.map((c) => (c.id === selectedCustomer.id ? { ...c, completed: true } : c))
      )
    }
    setSelectedCustomer(null)
  }

  const handleLogout = async () => {
    await fetch("/api/auth/logout", { method: "POST" })
    router.push("/")
  }

  const switchTab = (tab: Tab) => {
    setActiveTab(tab)
    setSelectedCustomer(null)
    setNavOpen(false)
  }

  const sortedCustomers = [...customers].sort((a, b) => {
    if (a.completed === b.completed) return 0
    return a.completed ? 1 : -1
  })

  const navItem = (tab: Tab, Icon: typeof ClipboardCheck) => (
    <SheetClose asChild>
      <button
        onClick={() => switchTab(tab)}
        className={`w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left transition-colors ${
          activeTab === tab ? "text-white" : "hover:bg-gray-100 text-gray-700"
        }`}
        style={activeTab === tab ? { backgroundColor: BRAND } : undefined}
      >
        <Icon className="h-5 w-5" />
        <span className="font-medium">{TAB_LABEL[tab]}</span>
      </button>
    </SheetClose>
  )

  return (
    <div className="min-h-screen flex flex-col bg-gray-50">
      {/* ヘッダー */}
      <header className="shadow-sm border-b text-white" style={{ backgroundColor: BRAND }}>
        <div className="flex items-center justify-between px-2 py-3">
          <div className="flex-1 flex justify-start items-center">
            <Sheet open={navOpen} onOpenChange={setNavOpen}>
              <SheetTrigger asChild>
                <button
                  className="p-2 hover:bg-white/10 rounded-lg transition-colors"
                  aria-label="メニュー"
                >
                  <Menu size={22} />
                </button>
              </SheetTrigger>
              <SheetContent side="left" className="w-72 p-0 flex flex-col bg-white">
                <SheetHeader className="px-4 py-4 border-b" style={{ backgroundColor: BRAND }}>
                  <SheetTitle className="text-white text-left">浄化槽点検</SheetTitle>
                </SheetHeader>
                <nav className="flex-1 p-2 space-y-1">
                  {navItem("inspection", ClipboardCheck)}
                  {navItem("order", ListOrdered)}
                  {navItem("customers", Users)}

                  <div className="mt-3 pt-3 border-t border-gray-200">
                    <Button
                      variant="outline"
                      className="w-full justify-start gap-3"
                      onClick={() => {
                        /* 帳票出力（未実装） */
                      }}
                    >
                      <FileText className="h-5 w-5" />
                      帳票出力
                    </Button>
                  </div>
                </nav>
                <div className="p-2 border-t border-gray-200">
                  <SheetClose asChild>
                    <button
                      onClick={() => router.push("/menu")}
                      className="w-full flex items-center gap-3 px-4 py-3 rounded-lg text-left text-gray-700 hover:bg-gray-100 transition-colors"
                    >
                      <ArrowLeft className="h-5 w-5" />
                      <span className="font-medium">メニューへ戻る</span>
                    </button>
                  </SheetClose>
                </div>
              </SheetContent>
            </Sheet>
          </div>
          <h1 className="text-lg font-semibold truncate">{TAB_LABEL[activeTab]}</h1>
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

      {/* メインコンテンツ */}
      <main className="flex-1 flex flex-col">
        {/* 点検入力 - 一覧 */}
        {activeTab === "inspection" && !selectedCustomer && (
          <div className="flex-1 p-3 space-y-2">
            {sortedCustomers.map((customer, index) => {
              const isFirstIncomplete = index === 0 && !customer.completed
              return (
                <Card
                  key={customer.id}
                  className={`cursor-pointer transition-colors ${
                    customer.completed
                      ? "bg-gray-100 opacity-60"
                      : isFirstIncomplete
                      ? "border-2"
                      : "hover:bg-gray-100"
                  }`}
                  style={
                    isFirstIncomplete && !customer.completed
                      ? { backgroundColor: BRAND_BG, borderColor: BRAND }
                      : undefined
                  }
                  onClick={() => handleCustomerSelect(customer)}
                >
                  <CardContent className="flex items-center justify-between p-3">
                    <div className="flex items-center gap-3 min-w-0">
                      <span
                        className="text-base font-semibold w-6 flex-shrink-0"
                        style={{
                          color: customer.completed
                            ? "#9ca3af"
                            : isFirstIncomplete
                            ? BRAND
                            : "#6b7280",
                        }}
                      >
                        {index + 1}
                      </span>
                      <div className="min-w-0">
                        <p
                          className={`text-sm font-semibold truncate ${
                            customer.completed ? "text-gray-400" : "text-gray-800"
                          }`}
                        >
                          {customer.name}
                        </p>
                        <p className="text-xs text-gray-500 truncate">{customer.address}</p>
                      </div>
                    </div>
                    {customer.completed ? (
                      <CheckCircle className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    ) : (
                      <ChevronRight
                        className="h-5 w-5 flex-shrink-0"
                        style={{ color: isFirstIncomplete ? BRAND : "#9ca3af" }}
                      />
                    )}
                  </CardContent>
                </Card>
              )
            })}
          </div>
        )}

        {/* 点検フォーム */}
        {activeTab === "inspection" && selectedCustomer !== null && (
          <InspectionForm
            customer={selectedCustomer}
            onBack={handleFormBack}
            onSubmit={handleFormSubmit}
          />
        )}

        {/* 点検順調整 */}
        {activeTab === "order" && (
          <div className="flex-1 p-3">
            <p className="text-xs text-gray-500 mb-2 px-1">
              ドラッグ&ドロップで順番を入れ替えてください
            </p>
            <div className="space-y-2">
              {customers.map((customer, index) => (
                <Card
                  key={customer.id}
                  draggable
                  onDragStart={() => handleDragStart(index)}
                  onDragOver={(e) => handleDragOver(e, index)}
                  onDragEnd={handleDragEnd}
                  className={`cursor-grab active:cursor-grabbing transition-all ${
                    draggedIndex === index ? "opacity-50 scale-[0.98]" : ""
                  }`}
                >
                  <CardContent className="flex items-center gap-3 p-3">
                    <GripVertical className="h-5 w-5 text-gray-400 flex-shrink-0" />
                    <span className="text-base font-semibold text-gray-500 w-6 flex-shrink-0">
                      {index + 1}
                    </span>
                    <div className="min-w-0">
                      <p className="text-sm font-semibold text-gray-800 truncate">
                        {customer.name}
                      </p>
                      <p className="text-xs text-gray-500 truncate">{customer.address}</p>
                    </div>
                  </CardContent>
                </Card>
              ))}
            </div>
          </div>
        )}

        {/* 得意先一覧 */}
        {activeTab === "customers" && (
          <div className="flex-1 p-3 space-y-2">
            {customers.map((customer) => (
              <Card key={customer.id}>
                <CardContent className="p-3">
                  <div className="flex justify-between items-start gap-2">
                    <div className="min-w-0">
                      <h3 className="font-semibold text-base text-gray-800 truncate">
                        {customer.name}
                      </h3>
                      <p className="text-xs text-gray-500 truncate">{customer.address}</p>
                    </div>
                    <span
                      className="text-xs px-2 py-0.5 rounded flex-shrink-0"
                      style={{ backgroundColor: BRAND_BG, color: BRAND }}
                    >
                      {customer.type}
                    </span>
                  </div>
                  <div className="mt-2 pt-2 border-t border-gray-200">
                    <p className="text-xs text-gray-600">
                      <span className="text-gray-500">電話: </span>
                      {customer.phone}
                    </p>
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        )}
      </main>
    </div>
  )
}
