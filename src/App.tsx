import './global/file_exp.css'
import { UsersFileExplorer } from "./feature/file_explorer2"
import { Route, Routes } from 'react-router-dom'
import { AuthMain } from './authentication/authentication_main'
import FileExplorer from './feature/file_explorer/file_exp_back'
import { ChatUi } from './components/chat'


function App() {
  return (
    <>
    {/* <Routes>
      <Route path="/" element={<AuthMain />} />
      <Route path="/chathome" element={<ChatUi />} />
      <Route path="/vector_upload" element={<FileExplorer/>} />
    </Routes> */}
    <UsersFileExplorer/>
    </>
  )
}

export default App
 