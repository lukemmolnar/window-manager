// Import polyfill for simple-peer library
import './utils/globalPolyfill.js'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './App.css'
import { WindowStateProvider } from './context/WindowStateContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { AuthProvider, AuthProviderWithWindowState } from './context/AuthContext'
import { AnnouncementProvider } from './context/AnnouncementContext'
import DebugLogger from './utils/debugLogger'

// Initialize debug logger (disables logs by default)
DebugLogger.init();

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <WindowStateProvider>
        <WorkspaceProvider>
          <AuthProviderWithWindowState>
            <AnnouncementProvider>
              <App />
            </AnnouncementProvider>
          </AuthProviderWithWindowState>
        </WorkspaceProvider>
      </WindowStateProvider>
    </AuthProvider>
  </React.StrictMode>,
)
