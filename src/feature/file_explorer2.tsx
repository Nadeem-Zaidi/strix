import './ef2.css'
import FileExplore3r from './file_list'


export const FileExplorer2 = () => {
    return <>
        <div className="file_explorer_main">
            <div className='tool_bar'>
                <h2>Strix</h2>

                <div className='tool_bar_left'>
                    <h4>Settings</h4>
                </div>
            </div>
            <div className='file_explorer_content'>
                <div className='file_explorer_sidebar'>
                    <h4>Sidebar</h4>
                </div>

                <div className='file_explorer_files'>
                    <h4>Contetn</h4>
                    <FileExplore3r />

                </div>

            </div>

        </div>
    </>
}