// Import polyfill for simple-peer library
import './utils/globalPolyfill.js'

// Import the cache manager utility
import cacheManager from './utils/cacheManager.js'

import React from 'react'
import ReactDOM from 'react-dom/client'
import App from './App'
import './styles.css'
import './App.css'
import { WindowStateProvider } from './context/WindowStateContext'
import { WorkspaceProvider } from './context/WorkspaceContext'
import { AuthProvider, AuthProviderWithWindowState } from './context/AuthContext'
import { AnnouncementProvider } from './context/AnnouncementContext'
import PartyProvider from './context/PartyContext'
import DebugLogger from './utils/debugLogger'

// debug logger (disables logs by default)
DebugLogger.init();

// Check for application updates and clear cache if needed
const cacheCleared = cacheManager.checkAndUpdateVersion();
if (cacheCleared) {
  console.log('Cache cleared due to application update');
  // We don't force reload here to avoid infinite reload loops
}

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <AuthProvider>
      <WindowStateProvider>
        <WorkspaceProvider>
          <AuthProviderWithWindowState>
            <AnnouncementProvider>
              <PartyProvider>
                <App />
              </PartyProvider>
            </AnnouncementProvider>
          </AuthProviderWithWindowState>
        </WorkspaceProvider>
      </WindowStateProvider>
    </AuthProvider>
  </React.StrictMode>,
)
