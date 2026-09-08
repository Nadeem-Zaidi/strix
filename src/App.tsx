import { Route, Routes } from 'react-router-dom'
import { AuthMain } from './features/auth/authentication_main'
import { S3FolderBrowser } from './features/storage/storage'
import { HomeChat } from './features/chat/home_chat'

function App() {
  return (
    <Routes>
      <Route path="/" element={<AuthMain />} />
      <Route path="/chathome" element={<HomeChat />} />
      <Route path="/file_explorer" element={<S3FolderBrowser/>} />
    </Routes>
  )
}

export default App
