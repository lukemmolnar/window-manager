import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './App.css'
import { WindowStateProvider } from './context/WindowStateContext'
import { AuthProvider } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <WindowStateProvider>
        <App />
      </WindowStateProvider>
    </AuthProvider>
  </React.StrictMode>,
)
