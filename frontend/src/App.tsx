import { BrowserRouter as Router, Routes, Route } from 'react-router-dom'
import './App.css'
import Home from './pages/Home'
import Login from './pages/Login'
import Register from './pages/Register'
import Market from './pages/Market'
import { GuestRoute } from './components/GuestRoute'
import TradingPage from './pages/TradingPage'
import { Toaster } from 'react-hot-toast';

function App() {
  return (
    <Router>
      <Toaster
        position="bottom-right"
        toastOptions={{
          style: {
            background: '#18181b',
            color: '#f4f4f5',
            border: '1px solid #27272a',
          },
        }}
      />
      <Routes>
        <Route path="/" element={<Home />} />
        <Route element={<GuestRoute />}>
          <Route path="/login" element={<Login />} />
          <Route path="/register" element={<Register />} />
        </Route>
        <Route path="/market" element={<Market />} />
        <Route path="/market/:symbol" element={<TradingPage />} />
        <Route path="/trade/:symbol" element={<TradingPage />} />
      </Routes>
    </Router>
  )
}

export default App
