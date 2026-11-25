import { Link, Route, Routes } from 'react-router-dom'
import Home from './App.jsx' // Preserves your previously completed homepage at /
import Welcome from './pages/Welcome.jsx'
import Auth from './pages/Auth.jsx'
import Workspace from './pages/Workspace.jsx'
      import ApiDocs from "./pages/ApiDocs";
export default function AppRouter() {
  return (
    <Routes>
      <Route path="/" element={<Home />} />



<Route path="/docs" element={<ApiDocs />} />
      <Route path="/welcome" element={<Welcome />} />
      <Route path="/login" element={<Auth />} />
      <Route path="/signup" element={<Auth />} />
      <Route path="/workspace" element={<Workspace />} />
      <Route path="*" element={<main className="grid min-h-screen place-content-center gap-4 bg-[#f8f6ff] p-6 text-center"><h1 className="text-3xl font-bold">Page not found</h1><Link className="font-semibold text-violet-700" to="/">Return to T.O. Monitoring</Link></main>} />
    </Routes>
  )
}
