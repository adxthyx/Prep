import React from 'react'
import ReactDOM from 'react-dom/client'
import { createHashRouter, RouterProvider } from 'react-router-dom'
import './index.css'
import { StoreProvider } from './store'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import ProjectTIL from './pages/ProjectTIL'
import SdeRoadmap from './pages/SdeRoadmap'
import AiRoadmap from './pages/AiRoadmap'
import Dsa from './pages/Dsa'
import Hld from './pages/Hld'
import Lld from './pages/Lld'

const router = createHashRouter([
  {
    element: <Layout />,
    children: [
      { path: '/', element: <Dashboard /> },
      { path: '/project', element: <ProjectTIL /> },
      { path: '/sde', element: <SdeRoadmap /> },
      { path: '/ai', element: <AiRoadmap /> },
      { path: '/dsa', element: <Dsa /> },
      { path: '/hld', element: <Hld /> },
      { path: '/lld', element: <Lld /> },
    ],
  },
])

ReactDOM.createRoot(document.getElementById('root')).render(
  <React.StrictMode>
    <StoreProvider>
      <RouterProvider router={router} />
    </StoreProvider>
  </React.StrictMode>
)
