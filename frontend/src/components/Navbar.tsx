import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'
import { useAuthState, useLogout } from '../hooks/useAuth'

const PieLogo: React.FC<{ className?: string }> = ({ className = 'w-7 h-7' }) => (
  <svg
    viewBox="0 0 32 32"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
    className={className}
  >
    <defs>
      <linearGradient id="pieMainGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#10B981" />
        <stop offset="100%" stopColor="#059669" />
      </linearGradient>
      <linearGradient id="pieSliceGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#34D399" />
        <stop offset="100%" stopColor="#10B981" />
      </linearGradient>
      <linearGradient id="pieAccentGrad" x1="0%" y1="0%" x2="100%" y2="100%">
        <stop offset="0%" stopColor="#6EE7B7" />
        <stop offset="100%" stopColor="#34D399" />
      </linearGradient>
    </defs>
    <circle cx="16" cy="16" r="14" fill="url(#pieMainGrad)" />
    <path
      d="M16 16 L29.8 13 A14 14 0 0 0 16 2 Z"
      fill="url(#pieAccentGrad)"
      transform="translate(-1.5, -1.5)"
    />
    <path
      d="M16 16 L30 16 A14 14 0 0 1 16 30 Z"
      fill="url(#pieSliceGrad)"
      opacity="0.85"
    />
    <circle cx="16" cy="16" r="3.5" fill="#09090B" />
  </svg>
)

const Navbar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthState()
  const logoutMutation = useLogout()

  const handleLogout = () => {
    logoutMutation.mutate(undefined, {
      onSuccess: () => {
        navigate('/login')
      },
      onError: () => {
        navigate('/login')
      },
    })
  }

  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="flex items-center gap-2.5 font-semibold text-lg text-white tracking-tight hover:opacity-90 transition-opacity">
          <PieLogo className="w-7 h-7" />
          <span>PiePack Exchange</span>
        </Link>

        <div className="flex items-center gap-3">
          {isAuthenticated ? (
            <Button
              variant="outline"
              className="border-zinc-800 text-zinc-300 hover:text-white hover:bg-zinc-900"
              onClick={handleLogout}
              disabled={logoutMutation.isPending}
            >
              {logoutMutation.isPending ? 'Logging out...' : 'Logout'}
            </Button>
          ) : (
            <>
              {location.pathname !== '/login' && (
                <Button variant="ghost" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
              )}
              {location.pathname !== '/register' && (
                <Button variant="default" onClick={() => navigate('/register')}>
                  Register
                </Button>
              )}
            </>
          )}
        </div>
      </div>
    </header>
  )
}

export default Navbar
