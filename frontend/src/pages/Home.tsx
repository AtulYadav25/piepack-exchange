import React from 'react'
import { useNavigate } from 'react-router-dom'
import Navbar from '../components/Navbar'
import Footer from '../components/Footer'
import { Button } from '@/components/ui/button'
import { useAuthState } from '../hooks/useAuth'

const Home: React.FC = () => {
  const navigate = useNavigate()
  const { isAuthenticated } = useAuthState()

  return (
    <div className="min-h-screen bg-zinc-950 text-zinc-100 flex flex-col justify-between font-sans">
      <Navbar />

      <main className="flex-1 flex items-center justify-center px-4 py-16">
        <div className="max-w-md w-full text-center space-y-6">
          <div className="space-y-2">
            <h1 className="text-3xl font-bold tracking-tight text-white">
              PiePack Exchange
            </h1>
            <p className="text-sm text-zinc-400">
              A simple, minimal trading application.
            </p>
          </div>

          <div className="flex items-center justify-center gap-4 pt-4">
            {isAuthenticated ? (
              <Button
                variant="default"
                size="lg"
                className="px-8 font-medium"
                onClick={() => navigate('/market')}
              >
                Start Trading
              </Button>
            ) : (
              <>
                <Button variant="default" size="lg" onClick={() => navigate('/login')}>
                  Sign In
                </Button>
                <Button variant="outline" size="lg" onClick={() => navigate('/register')}>
                  Register
                </Button>
              </>
            )}
          </div>
        </div>
      </main>

      <Footer />
    </div>
  )
}

export default Home