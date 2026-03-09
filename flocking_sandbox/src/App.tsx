import { useRef } from 'react'
import './App.css'

function App() {
  const canvasRef = useRef<HTMLCanvasElement | null>(null)

  return (
    <main className="app">
      <canvas ref={canvasRef} className="canvas" />
    </main>
  )
}

export default App
