import { useMutation, useQuery, useQueryClient } from '@tanstack/react-query'
import { authApi } from '../api/auth.api'
import type {
  LoginPayload,
  RegisterPayload,
  ApiResponse,
  AuthResponseData,
  ApiError,
  AuthUser,
} from '../api/types/auth.types'

export const authKeys = {
  all: ['auth'] as const,
  user: () => [...authKeys.all, 'user'] as const,
}

export const useAuthState = () => {
  const { data: user } = useQuery<AuthUser | null>({
    queryKey: authKeys.user(),
    queryFn: () => {
      const stored = localStorage.getItem('user')
      return stored ? JSON.parse(stored) : null
    },
    initialData: () => {
      const stored = typeof window !== 'undefined' ? localStorage.getItem('user') : null
      return stored ? JSON.parse(stored) : null
    },
    staleTime: Infinity,
  })

  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null
  const isAuthenticated = Boolean(token || user)

  return {
    isAuthenticated,
    user,
  }
}

export const useLogin = () => {
  const queryClient = useQueryClient()

  return useMutation<ApiResponse<AuthResponseData>, ApiError, LoginPayload>({
    mutationFn: (payload: LoginPayload) => authApi.login(payload),
    onSuccess: (response) => {
      if (response.data?.token) {
        localStorage.setItem('token', response.data.token)
      }
      if (response.data?.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user))
      }
      queryClient.setQueryData(authKeys.user(), response.data?.user || null)
    },
  })
}

export const useRegister = () => {
  const queryClient = useQueryClient()

  return useMutation<ApiResponse<AuthResponseData>, ApiError, RegisterPayload>({
    mutationFn: (payload: RegisterPayload) => authApi.register(payload),
    onSuccess: (response) => {
      if (response.data?.token) {
        localStorage.setItem('token', response.data.token)
      }
      if (response.data?.user) {
        localStorage.setItem('user', JSON.stringify(response.data.user))
      }
      queryClient.setQueryData(authKeys.user(), response.data?.user || null)
    },
  })
}

export const useLogout = () => {
  const queryClient = useQueryClient()

  return useMutation<ApiResponse<null>, ApiError, void>({
    mutationFn: () => authApi.logout(),
    onSuccess: () => {
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      queryClient.setQueryData(authKeys.user(), null)
      queryClient.removeQueries({ queryKey: authKeys.all })
    },
    onError: () => {
      // Force local cleanup even if request fails
      localStorage.removeItem('token')
      localStorage.removeItem('user')
      queryClient.setQueryData(authKeys.user(), null)
    },
  })
}
