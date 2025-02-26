import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './app.css'
import { WindowStateProvider } from './context/WindowStateContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <WindowStateProvider>
      <App />
    </WindowStateProvider>
  </React.StrictMode>,
)
