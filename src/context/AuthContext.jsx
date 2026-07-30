import { createContext, useCallback, useContext, useEffect, useState } from 'react'
import { api, getToken, setToken } from '../utils/api.js'

const AuthContext = createContext(null)

export function AuthProvider({ children }) {
  const [user, setUser] = useState(null)
  const [loading, setLoading] = useState(true)

  const loadUser = useCallback(async () => {
    if (!getToken()) {
      setUser(null)
      setLoading(false)
      return
    }
    try {
      setUser(await api.get('/user/me'))
    } catch {
      setToken(null)
      setUser(null)
    } finally {
      setLoading(false)
    }
  }, [])

  useEffect(() => {
    loadUser()
  }, [loadUser])

  const login = async (email, password) => {
    const { token, user: loggedInUser } = await api.post('/auth/login', { email, password })
    setToken(token)
    setUser(loggedInUser)
    return loggedInUser
  }

  const register = async (email, password) => {
    const { token, user: newUser } = await api.post('/auth/register', { email, password })
    setToken(token)
    setUser(newUser)
    return newUser
  }

  const logout = () => {
    setToken(null)
    setUser(null)
  }

  const refreshUser = async () => {
    const refreshed = await api.get('/user/me')
    setUser(refreshed)
    return refreshed
  }

  return (
    <AuthContext.Provider value={{ user, loading, login, register, logout, refreshUser }}>
      {children}
    </AuthContext.Provider>
  )
}

export function useAuth() {
  const ctx = useContext(AuthContext)
  if (!ctx) throw new Error('useAuth must be used within AuthProvider')
  return ctx
}
