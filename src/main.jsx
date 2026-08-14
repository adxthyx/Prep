import React from 'react'
import ReactDOM from 'react-dom/client'
import { createBrowserRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { StoreProvider } from './store'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ProjectTIL from './pages/ProjectTIL'
import SdeRoadmap from './pages/SdeRoadmap'
import AiRoadmap from './pages/AiRoadmap'
import AiPapers from './pages/AiPapers'
import Dsa from './pages/Dsa'
import Hld from './pages/Hld'
import Lld from './pages/Lld'
import Settings from './pages/Settings'

const BASE_PATH = '/prep'

// Keep direct Vercel deployment URLs usable as well as the public /prep proxy.
if (window.location.pathname !== BASE_PATH && !window.location.pathname.startsWith(`${BASE_PATH}/`)) {
  const routePath = window.location.pathname === '/' ? '/' : window.location.pathname
  window.history.replaceState(
    window.history.state,
    '',
    `${BASE_PATH}${routePath}${window.location.search}${window.location.hash}`
  )
}

const router = createBrowserRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/project', element: <ProjectTIL /> },
      { path: '/sde', element: <SdeRoadmap /> },
      { path: '/ai', element: <AiRoadmap /> },
      { path: '/ai-papers', element: <AiPapers /> },
      { path: '/dsa', element: <Dsa /> },
      { path: '/hld', element: <Hld /> },
      { path: '/lld', element: <Lld /> },
      { path: '/settings', element: <Settings /> },
    ],
  },
], {
  basename: BASE_PATH,
})

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  </React.StrictMode>
)
