import React from 'react'
import { Navigate, Outlet } from 'react-router-dom'
import { useAuthState } from '../hooks/useAuth'

interface GuestRouteProps {
  children?: React.ReactNode
}

export const GuestRoute: React.FC<GuestRouteProps> = ({ children }) => {
  const { isAuthenticated } = useAuthState()

  if (isAuthenticated) {
    return <Navigate to="/market" replace />
  }

  return children ? <>{children}</> : <Outlet />
}
