import { apiClient } from './client'
import type {
  LoginPayload,
  RegisterPayload,
  ApiResponse,
  AuthResponseData,
} from './types/auth.types'

export const authApi = {
  login: async (payload: LoginPayload): Promise<ApiResponse<AuthResponseData>> => {
    return apiClient.post<ApiResponse<AuthResponseData>>('/api/v1/auth/login', payload)
  },

  register: async (payload: RegisterPayload): Promise<ApiResponse<AuthResponseData>> => {
    return apiClient.post<ApiResponse<AuthResponseData>>('/api/v1/auth/register', payload)
  },

  logout: async (): Promise<ApiResponse<null>> => {
    return apiClient.post<ApiResponse<null>>('/api/v1/auth/logout')
  },
}
