"use client"

import type React from "react"

import { useState, useEffect } from "react"
import { useRouter } from "next/navigation"
import Image from "next/image"
import { Button } from "@/components/ui/button"
import { Input } from "@/components/ui/input"
import { Label } from "@/components/ui/label"
import { Checkbox } from "@/components/ui/checkbox"
import { Card, CardContent, CardHeader } from "@/components/ui/card"
import { Eye, EyeOff } from "lucide-react"
import { Toaster, toast } from "sonner"

export function LoginForm() {
  const [username, setUsername] = useState("")
  const [password, setPassword] = useState("")
  const [rememberMe, setRememberMe] = useState(false)
  const [showPassword, setShowPassword] = useState(false)
  const router = useRouter()

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault()
    
    try {
      // 実際のAPI呼び出し
      const response = await fetch(`${process.env.NEXT_PUBLIC_API_URL || '/api'}/auth/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ userId: username, password })
      })
      
      if (response.ok) {
        const data = await response.json()
        if (data.success) {
          localStorage.setItem("authToken", data.data.token)
          localStorage.setItem("userName", data.data.user.name)
          if (rememberMe) {
            localStorage.setItem("savedUsername", username)
          }
          router.push("/dashboard")
          return
        } else {
          // APIからのエラーメッセージを使用
          if (data.error && data.error.includes("パスワード")) {
            toast.error("パスワードが間違っています")
          } else if (data.error && data.error.includes("ユーザー")) {
            toast.error("ユーザー名が間違っています")
          } else {
            toast.error("ログイン情報を確認してください")
          }
        }
      } else {
        // HTTPステータスに基づくエラー処理
        if (response.status === 401) {
          toast.error("ログイン情報を確認してください")
        } else {
          toast.error("ログイン情報を確認してください")
        }
      }
    } catch (error) {
      console.error("Login error:", error)
      toast.error("ログイン情報を確認してください")
    }
  }

  // 保存されたユーザー名を読み込む
  useEffect(() => {
    const savedUsername = localStorage.getItem("savedUsername")
    if (savedUsername) {
      setUsername(savedUsername)
      setRememberMe(true)
    }
  }, [])

  return (
    <Card className="shadow-xl border-0 bg-white/95 backdrop-blur-sm">
      <CardHeader className="text-center pb-6">
        <div className="flex justify-center mb-6">
          <Image
            src="/images/quick-ocr-logo.png"
            alt="Quick OCR Logo"
            width={120}
            height={120}
            className="object-contain"
          />
        </div>
      </CardHeader>
      <CardContent className="space-y-6">
        <form onSubmit={handleSubmit} className="space-y-6">
          <div className="space-y-2">
            <Label htmlFor="username" className="text-sm font-medium text-gray-700">
              ユーザー名
            </Label>
            <Input
              id="username"
              type="text"
              value={username}
              onChange={(e) => setUsername(e.target.value)}
              className="h-11 border-gray-200"
              style={
                {
                  "--tw-ring-color": "#38b6ff",
                  borderColor: username ? "#38b6ff" : undefined,
                } as React.CSSProperties
              }
              placeholder="ユーザー名を入力してください"
              required
            />
          </div>

          <div className="space-y-2">
            <Label htmlFor="password" className="text-sm font-medium text-gray-700">
              パスワード
            </Label>
            <div className="relative">
              <Input
                id="password"
                type={showPassword ? "text" : "password"}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                className="h-11 border-gray-200 pr-10"
                style={
                  {
                    "--tw-ring-color": "#38b6ff",
                    borderColor: password ? "#38b6ff" : undefined,
                  } as React.CSSProperties
                }
                placeholder="パスワードを入力してください"
                required
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-gray-500 hover:text-gray-700 focus:outline-none"
                tabIndex={-1}
              >
                {showPassword ? (
                  <EyeOff className="h-4 w-4" />
                ) : (
                  <Eye className="h-4 w-4" />
                )}
              </button>
            </div>
          </div>

          <div className="flex items-center space-x-2">
            <Checkbox
              id="remember"
              checked={rememberMe}
              onCheckedChange={(checked) => setRememberMe(checked as boolean)}
              className="border-gray-300"
              style={
                {
                  "--tw-bg-opacity": rememberMe ? "1" : "0",
                  backgroundColor: rememberMe ? "#38b6ff" : "transparent",
                  borderColor: rememberMe ? "#38b6ff" : undefined,
                } as React.CSSProperties
              }
            />
            <Label htmlFor="remember" className="text-sm text-gray-600 cursor-pointer">
              ログイン情報を保存する
            </Label>
          </div>

          <Button
            type="submit"
            className="w-full h-11 text-white font-medium rounded-lg transition-colors hover:opacity-90"
            style={{ backgroundColor: "#38b6ff" }}
          >
            ログイン
          </Button>
        </form>
      </CardContent>
    </Card>
  )
}
