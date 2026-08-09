import React from 'react'

const Footer: React.FC = () => {
  return (
    <footer className="border-t border-zinc-800 bg-zinc-950 py-6 text-center text-xs text-zinc-500 font-mono">
      <div className="max-w-5xl mx-auto px-4">
        © {new Date().getFullYear()} PiePack Exchange. All rights reserved.
      </div>
    </footer>
  )
}

export default Footer
