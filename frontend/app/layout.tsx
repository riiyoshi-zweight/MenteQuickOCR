import type React from "react"
import type { Metadata } from "next"
import { Dela_Gothic_One } from "next/font/google"
import { Suspense } from "react"
import { Toaster } from "sonner"
import "./globals.css"

const delaGothicOne = Dela_Gothic_One({
  weight: "400",
  subsets: ["latin"],
  display: "swap",
  variable: "--font-dela-gothic-one",
})

export const metadata: Metadata = {
  title: "QuickOCR",
  description: "産業廃棄物伝票OCRシステム",
}

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode
}>) {
  return (
    <html lang="en">
      <body className={`font-sans ${delaGothicOne.variable}`}>
        <Suspense fallback={null}>{children}</Suspense>
        <Toaster 
          position="top-center"
          toastOptions={{
            duration: 4000,
            style: {
              fontSize: '14px',
            },
            success: {
              style: {
                background: '#10b981',
                color: 'white',
                border: 'none',
              },
            },
            error: {
              style: {
                background: '#ef4444',
                color: 'white',
                border: 'none',
              },
            },
          }}
        />
      </body>
    </html>
  )
}
