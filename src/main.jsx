import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './App.css'
import { WindowStateProvider } from './context/WindowStateContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { AuthProvider, AuthProviderWithWindowState } from './context/AuthContext'

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <WindowStateProvider>
        <WorkspaceProvider>
          <AuthProviderWithWindowState>
            <App />
          </AuthProviderWithWindowState>
        </WorkspaceProvider>
      </WindowStateProvider>
    </AuthProvider>
  </React.StrictMode>,
)
