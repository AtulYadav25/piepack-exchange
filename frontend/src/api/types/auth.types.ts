export interface LoginPayload {
  email: string
  password: string
}

export interface RegisterPayload {
  email: string
  password: string
  name?: string
}

export interface AuthUser {
  id: string
  email: string
  name: string
  createdAt?: string
}

export interface AuthResponseData {
  user: AuthUser
  token?: string
}

export interface ApiResponse<T = any> {
  success: boolean
  message: string
  data?: T
}

export interface ApiErrorResponse {
  success: boolean
  message: string
  error?: string
}

export class ApiError extends Error {
  status: number
  
  constructor(message: string, status: number) {
    super(message)
    this.name = 'ApiError'
    this.status = status
  }
}
