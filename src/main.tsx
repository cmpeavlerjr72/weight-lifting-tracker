import React from 'react'
import ReactDOM from 'react-dom/client'
import { RouterProvider } from 'react-router-dom'
import { router } from './app/router'
import './index.css'

// NEW
import { PlayerLinkProvider } from './player/PlayerLinkContext'

ReactDOM.createRoot(document.getElementById('root')!).render(
  <React.StrictMode>
    <PlayerLinkProvider>
      <RouterProvider router={router} />
    </PlayerLinkProvider>
  </React.StrictMode>
)
