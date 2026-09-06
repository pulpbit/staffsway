import { createContext, useContext, useState, useEffect, useCallback, type ReactNode } from 'react'
import { authApi, setToken, getToken } from '@/services/api'
import type { AuthUser } from '@/types/api'

interface AuthState {
  user: AuthUser | null
  loading: boolean
  login: (email: string, password: string) => Promise<void>
  loginEmployee: (username: string, password: string) => Promise<void>
  logout: () => void
  hasRole: (...roles: string[]) => boolean
}

const AuthContext = createContext<AuthState>({
  user: null,
  loading: true,
  login: async () => {},
  loginEmployee: async () => {},
  logout: () => {},
  hasRole: () => false,
})

export function AuthProvider({ children }: { children: ReactNode }) {
  const [user, setUser] = useState<AuthState['user']>(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const t = getToken()
    if (t) {
      authApi
        .me()
        .then((r) => setUser(r.data.user))
        .catch(() => setToken(null))
        .finally(() => setLoading(false))
    } else {
      setLoading(false)
    }
  }, [])

  const login = useCallback(async (email: string, password: string) => {
    const r = await authApi.login(email, password)
    setToken(r.data.token)
    setUser(r.data.user)
  }, [])

  const loginEmployee = useCallback(async (username: string, password: string) => {
    const r = await authApi.loginEmployee(username, password)
    setToken(r.data.token)
    setUser(r.data.user)
  }, [])

  const logout = useCallback(() => {
    setToken(null)
    setUser(null)
  }, [])

  const hasRole = useCallback((...roles: string[]) => !!user && roles.includes(user.role), [user])

  return <AuthContext.Provider value={{ user, loading, login, loginEmployee, logout, hasRole }}>{children}</AuthContext.Provider>
}

export function useAuth() {
  return useContext(AuthContext)
}
