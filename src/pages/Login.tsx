import { useState } from 'react'
import { Navigate } from 'react-router-dom'
import { BarChart3, Loader2 } from 'lucide-react'
import { supabase } from '@/lib/supabase'
import { useAuthStore } from '@/store/auth'
import { Button } from '@/components/ui/button'
import { Input } from '@/components/ui/input'
import { Label } from '@/components/ui/label'
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from '@/components/ui/card'

export default function Login() {
  const user = useAuthStore((s) => s.user)
  const [isSignUp, setIsSignUp] = useState(false)
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [message, setMessage] = useState('')

  if (user) return <Navigate to="/app/dashboard" replace />

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault()
    setLoading(true)
    setError('')
    setMessage('')

    try {
      if (isSignUp) {
        const { error } = await supabase.auth.signUp({ email, password })
        if (error) throw error
        setMessage('確認信已寄出，請檢查你的信箱！')
      } else {
        const { error } = await supabase.auth.signInWithPassword({ email, password })
        if (error) throw error
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : '發生錯誤，請稍後再試')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="flex min-h-screen items-center justify-center bg-[hsl(240_10%_3.9%)] px-4">
      <div className="w-full max-w-sm space-y-6">
        <div className="flex flex-col items-center gap-2">
          <div className="flex items-center gap-2">
            <BarChart3 className="h-8 w-8 text-[hsl(142.1_76.2%_36.3%)]" />
            <span className="text-2xl font-bold text-white">Percento</span>
          </div>
          <p className="text-sm text-[hsl(240_5%_64.9%)]">個人資產管理</p>
        </div>

        <Card>
          <CardHeader>
            <CardTitle>{isSignUp ? '建立帳號' : '歡迎回來'}</CardTitle>
            <CardDescription>
              {isSignUp ? '填寫資訊開始追蹤你的資產' : '登入以查看你的資產狀況'}
            </CardDescription>
          </CardHeader>
          <CardContent>
            <form onSubmit={handleSubmit} className="space-y-4">
              <div className="space-y-2">
                <Label htmlFor="email">Email</Label>
                <Input
                  id="email"
                  type="email"
                  placeholder="you@example.com"
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  required
                />
              </div>
              <div className="space-y-2">
                <Label htmlFor="password">密碼</Label>
                <Input
                  id="password"
                  type="password"
                  placeholder="••••••••"
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  required
                  minLength={6}
                />
              </div>

              {error && <p className="text-sm text-red-400">{error}</p>}
              {message && <p className="text-sm text-green-400">{message}</p>}

              <Button type="submit" className="w-full" disabled={loading}>
                {loading && <Loader2 className="h-4 w-4 animate-spin" />}
                {isSignUp ? '註冊' : '登入'}
              </Button>

              <button
                type="button"
                onClick={() => { setIsSignUp(!isSignUp); setError('') }}
                className="w-full text-center text-sm text-[hsl(240_5%_64.9%)] hover:text-white transition-colors"
              >
                {isSignUp ? '已有帳號？登入' : '還沒有帳號？免費註冊'}
              </button>
            </form>
          </CardContent>
        </Card>
      </div>
    </div>
  )
}
