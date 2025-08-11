import { create } from 'zustand'
import { getCurrentUser, login as loginApi, logout as logoutApi } from '../api/auth'
import { LoginCredentials, User } from '../types/auth'

interface AuthState {
  user: User | null
  token: string | null
  isAuthenticated: boolean
  isLoading: boolean
  error: string | null

  login: (credentials: LoginCredentials) => Promise<{ success: boolean; error?: string }>
  logout: () => void
  initialize: () => Promise<void>
}

export const useAuthStore = create<AuthState>((set) => ({
  // Initial state
  user: null,
  token: localStorage.getItem('token'),
  isAuthenticated: !!localStorage.getItem('token'),
  isLoading: true,
  error: null,

  // Actions
  login: async (credentials: LoginCredentials) => {
    try {
      const response = await loginApi(credentials)
      const { user, token } = response.data

      localStorage.setItem('token', token)
      localStorage.setItem('user', JSON.stringify(user))

      set({
        user,
        token,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })

      return { success: true }
    } catch (error: any) {
      // Clear any existing data
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      const errorMessage = error.response?.data?.message || 'Login failed'

      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: errorMessage,
      })

      return {
        success: false,
        error: errorMessage,
      }
    }
  },

  logout: () => {
    logoutApi()
    localStorage.removeItem('token')
    localStorage.removeItem('user')

    set({
      user: null,
      token: null,
      isAuthenticated: false,
      isLoading: false,
      error: null,
    })
  },

  initialize: async () => {
    const token = localStorage.getItem('token')
    if (!token) {
      set({ isLoading: false })
      return
    }

    try {
      const response = await getCurrentUser()
      // First try to handle a potential nested response structure
      const userData = 'user' in response.data ? response.data.user : response.data

      set({
        user: userData,
        isAuthenticated: true,
        isLoading: false,
        error: null,
      })
    } catch (error) {
      localStorage.removeItem('token')
      localStorage.removeItem('user')

      set({
        user: null,
        token: null,
        isAuthenticated: false,
        isLoading: false,
        error: 'Authentication error',
      })
    }
  },
}))

// Export a compatibility hook that matches the old Context API pattern
export const useAuth = () => {
  const authStore = useAuthStore()
  return {
    state: {
      user: authStore.user,
      token: authStore.token,
      isAuthenticated: authStore.isAuthenticated,
      isLoading: authStore.isLoading,
      error: authStore.error,
    },
    login: authStore.login,
    logout: authStore.logout,
  }
}
