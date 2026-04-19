import { Route, Routes } from "react-router-dom"
import { ChatUi } from "./components/chat"
import { AuthMain } from "./authentication/authentication_main"
import FileExplorer from "./feature/file_explorer/file_explorer"
import './global/file_exp.css'


function App() {
  return (
    <>
    <Routes>
      <Route path="/" element={<AuthMain />} />
      <Route path="/chathome" element={<ChatUi />} />
      <Route path="/vector_upload" element={<FileExplorer/>} />
    </Routes>
    {/* <FileExplorer2/> */}
    </>
  )
}

export default App
 