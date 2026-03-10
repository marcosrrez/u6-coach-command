import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom'
import Layout from './components/Layout'
import Dashboard from './pages/Dashboard'
import Calendar from './pages/Calendar'
import Session from './pages/Session'
import GameDay from './pages/GameDay'
import Drills from './pages/Drills'
import Players from './pages/Players'
import AIChat from './pages/AIChat'
import Settings from './pages/Settings'

function App() {
  return (
    <BrowserRouter>
      <Routes>
        <Route path="/" element={<Layout />}>
          <Route index element={<Dashboard />} />
          <Route path="calendar" element={<Calendar />} />
          <Route path="session/:id" element={<Session />} />
          <Route path="game/:id" element={<GameDay />} />
          <Route path="drills" element={<Drills />} />
          <Route path="players" element={<Players />} />
          <Route path="ai" element={<AIChat />} />
          <Route path="settings" element={<Settings />} />
          <Route path="*" element={<Navigate to="/" replace />} />
        </Route>
      </Routes>
    </BrowserRouter>
  )
}

export default App
