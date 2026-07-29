import { StrictMode } from 'react'
import { createRoot } from 'react-dom/client'
import './ui/index.css'
import './index.css'
import App from './App.jsx'
import ErrorBoundary from './components/ErrorBoundary.jsx'
import WebDownloadDock from './components/WebDownloadDock.jsx'

createRoot(document.getElementById('root')).render(
  <StrictMode>
    <ErrorBoundary componentName="Markdown workspace">
      <App />
      <WebDownloadDock />
    </ErrorBoundary>
  </StrictMode>,
)
