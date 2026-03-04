import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './index.css'
import App from './App.jsx'
import useCameraStore from './state/useCameraStore.js'
import useSimStore from './state/useSimStore.js'
import useCraftStore from './state/useCraftStore.js'

// Expose stores for debugging
window._stores = { camera: useCameraStore, sim: useSimStore, craft: useCraftStore };

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <App />
  </StrictMode>,
)
