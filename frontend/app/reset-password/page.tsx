"use client"

import { useState, useEffect } from "react"
import { useRouter, useSearchParams } from "next/navigation"
import Link from "next/link"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Eye, EyeOff, ArrowLeft } from "lucide-react"
import { toast } from "sonner"
import { validatePassword } from "@/lib/password-policy"

export default function ResetPasswordPage() {
  const router = useRouter()
  const searchParams = useSearchParams()
  const token = searchParams.get("token")

  const [password, setPassword] = useState("")
  const [confirmPassword, setConfirmPassword] = useState("")
  const [showPassword, setShowPassword] = useState(false)
  const [loading, setLoading] = useState(false)
  const [policyErrors, setPolicyErrors] = useState<string[]>([])

  useEffect(() => {
    if (password) {
      setPolicyErrors(validatePassword(password).errors)
    } else {
      setPolicyErrors([])
    }
  }, [password])

  if (!token) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gradient-to-br from-sky-50 to-sky-100 p-4">
        <Card className="w-full max-w-md shadow-xl border-0 bg-white/95">
          <CardContent className="pt-6">
            <p className="text-center text-gray-600">無効なリセットリンクです。</p>
            <Link href="/forgot-password" className="block text-center text-sm text-sky-500 mt-4 hover:underline">
              パスワードリセットを再申請する
            </Link>
          </CardContent>
        </Card>
      </div>
    )
  }

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()

    if (password !== confirmPassword) {
      toast.error("パスワードが一致しません")
      return
    }

    const policy = validatePassword(password)
    if (!policy.valid) {
      toast.error(policy.errors.join("、"))
      return
    }

    setLoading(true)
    try {
      const res = await fetch("/api/auth/reset-password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ token, newPassword: password }),
      })
      const data = await res.json()
      if (data.success) {
        toast.success("パスワードが更新されました")
        router.push("/")
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
          <h1 className="text-xl font-bold text-gray-800">新しいパスワードを設定</h1>
        </CardHeader>
        <CardContent>
          <form onSubmit={handleSubmit} className="space-y-6">
            <div className="space-y-2">
              <Label htmlFor="password" className="text-sm font-medium text-gray-700">
                新しいパスワード
              </Label>
              <div className="relative">
                <Input
                  id="password"
                  type={showPassword ? "text" : "password"}
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="新しいパスワード"
                  required
                  className="h-11 pr-10"
                />
                <button
                  type="button"
                  onClick={() => setShowPassword(!showPassword)}
                  className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                  tabIndex={-1}
                >
                  {showPassword ? <EyeOff className="h-4 w-4" /> : <Eye className="h-4 w-4" />}
                </button>
              </div>
              {policyErrors.length > 0 && (
                <ul className="text-xs text-red-500 space-y-0.5 mt-1">
                  {policyErrors.map((err) => (
                    <li key={err}>{err}</li>
                  ))}
                </ul>
              )}
            </div>

            <div className="space-y-2">
              <Label htmlFor="confirmPassword" className="text-sm font-medium text-gray-700">
                パスワード確認
              </Label>
              <Input
                id="confirmPassword"
                type="password"
                value={confirmPassword}
                onChange={(e) => setConfirmPassword(e.target.value)}
                placeholder="もう一度入力"
                required
                className="h-11"
              />
            </div>

            <Button
              type="submit"
              disabled={loading || policyErrors.length > 0}
              className="w-full h-11 text-white font-medium"
              style={{ backgroundColor: "#38b6ff" }}
            >
              {loading ? "更新中..." : "パスワードを更新"}
            </Button>
          </form>
        </CardContent>
      </Card>
    </div>
  )
}
