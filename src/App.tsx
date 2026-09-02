import './global/file_exp.css'
import { UsersFileExplorer } from "./feature/file_explorer2"
import { Route, Routes } from 'react-router-dom'
import { AuthMain } from './authentication/authentication_main'
import FileExplorer from './feature/file_explorer/file_exp_back'
import { ChatPage } from './components/chat'
import { S3FolderBrowser } from './pages/storage'



function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<AuthMain />} />
      <Route path="/chathome" element={<ChatPage />} />
      <Route path="/file_explorer" element={<S3FolderBrowser/>} />
    </Routes>
    {/* <UsersFileExplorer/> */}
    </>
  )
}

export default App
 