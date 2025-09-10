import { LoginForm } from "@/components/login-form"
import { Toaster } from "sonner"

export default function LoginPage() {
  return (
    <div className="min-h-screen bg-gradient-to-br from-blue-50 to-white flex items-center justify-center p-4">
      <div className="w-full max-w-md space-y-6">
        <LoginForm />
      </div>
      <Toaster 
        position="top-center"
        toastOptions={{
          style: {
            background: '#ef4444',
            color: 'white',
            border: 'none',
          },
        }}
      />
    </div>
  )
}
