import { BrowserRouter, Routes, Route } from 'react-router-dom'

import Sidebar from './components/Sidebar.tsx'
import Header from './components/Header.tsx'

import UploadCall from './pages/UploadCall'
import Dashboard from './pages/Dashboard'
import AskCallInsight from './pages/AskCallInsight'

import './App.css'

function App() {
  return (
    <BrowserRouter>
      <div className="app-layout">

        <Sidebar />

        <div className="main-area">
          <Header />

          <main className="page-content">
            <Routes>

              <Route path="/" element={<UploadCall />} />

              <Route
                path="/dashboard"
                element={<Dashboard />}
              />

              <Route
                path="/ask"
                element={<AskCallInsight />}
              />

            </Routes>
          </main>
        </div>

      </div>
    </BrowserRouter>
  )
}

export default App