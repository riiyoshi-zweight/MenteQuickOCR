"use client"

import { useState } from "react"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { ArrowLeft } from "lucide-react"
import { toast } from "sonner"

export default function ForgotPasswordPage() {
  const [userId, setUserId] = useState("")
  const [submitted, setSubmitted] = useState(false)
  const [loading, setLoading] = useState(false)

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    setLoading(true)
    try {
      const res = await fetch("/api/auth/forgot-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId }),
      })
      const data = await res.json()
      if (data.success) {
        setSubmitted(true)
      } else {
        toast.error(data.error || "エラーが発生しました")
      }
    } catch {
      toast.error("通信エラーが発生しました")
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-sky-100 p-4">
      <Card className="w-full max-w-md shadow-xl border-0 bg-white/95 backdrop-blur-sm">
        <CardHeader className="pb-4">
          <Link href="/" className="flex items-center gap-2 text-sm text-gray-500 hover:text-gray-700 mb-4">
            <ArrowLeft className="h-4 w-4" />
            ログインに戻る
          </Link>
          <h1 className="text-xl font-bold text-gray-800">パスワードリセット</h1>
        </CardHeader>
        <CardContent>
          {submitted ? (
            <div className="space-y-4">
              <p className="text-sm text-gray-600">
                登録されたメールアドレス宛にリセットリンクを送信しました。メールをご確認ください。
              </p>
              <p className="text-xs text-gray-400">
                リンクの有効期限は1時間です。メールが届かない場合は、ユーザーIDとメールアドレスの登録状況を管理者にご確認ください。
              </p>
            </div>
          ) : (
            <form onSubmit={handleSubmit} className="space-y-6">
              <div className="space-y-2">
                <Label htmlFor="userId" className="text-sm font-medium text-gray-700">
                  ユーザーID
                </Label>
                <Input
                  id="userId"
                  value={userId}
                  onChange={(e) => setUserId(e.target.value)}
                  placeholder="ユーザーIDを入力してください"
                  required
                  className="h-11"
                />
              </div>
              <Button
                type="submit"
                disabled={loading}
                className="w-full h-11 text-white font-medium"
                style={{ backgroundColor: "#38b6ff" }}
              >
                {loading ? "送信中..." : "リセットリンクを送信"}
              </Button>
            </form>
          )}
        </CardContent>
      </Card>
    </div>
  )
}
