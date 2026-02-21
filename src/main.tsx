import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import { PlayerLinkProvider } from './pages/player/PlayerLinkContext'
import './index.css'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PlayerLinkProvider>
      <RouterProvider router={router} />
    </PlayerLinkProvider>
  </React.StrictMode>
)
