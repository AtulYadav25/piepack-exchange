import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { Button } from '@/components/ui/button'

const Navbar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()

  return (
    <header className="border-b border-zinc-800 bg-zinc-950">
      <div className="max-w-5xl mx-auto px-4 h-16 flex items-center justify-between">
        <Link to="/" className="font-semibold text-lg text-white tracking-tight">
          PiePack Exchange
        </Link>

        <div className="flex items-center gap-3">
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
        </div>
      </div>
    </header>
  )
}

export default Navbar
