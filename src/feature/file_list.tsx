import { CLButton } from '../components/ui/clbutton';
import styles from '../module_css/file_explorer_list.module.css';
import { useDispatch } from 'react-redux';
import { useAppSelector, type AppDispatch, type RootState } from '../state_mngmt/store';
import { deleteFiles, getFiles, uploadFiles } from '../state_mngmt/slices/filereader_slice';
import { ActionMenuWrapper } from '../utils/action';
import { useEffect, useRef, useState } from 'react';
import type { Action } from '../types';
import { FolderIcon } from '../utils/folder_icon';
import { FileIcon } from '../utils/file_icon'; 
import { TestModal } from '../components/ui/portal/test_model';
import { CreateFolder } from '../components/ui/dialog_box/create_folder';

const getExt = (name: string) => name.split('.').pop() ?? '';
export const FileList = () => {
    const dispatch = useDispatch<AppDispatch>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const files = useAppSelector((state: RootState) => state.files.fileList);
    const [createFolderDilaog,setCreateFolderDialog]=useState<boolean>(false);

    useEffect(() => {
        dispatch(getFiles(undefined));
    }, []);

    const newActions = (): Action[] => {
        return [
            {
                label: "Folder",
                onClick: () => {
                    setCreateFolderDialog(true)
                }
            },
            {
                label: "File",
                onClick: () => {

                }
            },
            {
                label: "Upload",
                onClick: () => {
                    fileInputRef.current?.click()

                }
            }
        ]

    }

    const getActions = (file: typeof files[number]): Action[] => {
        const isFile = file.type === 'file';
        return [
            ...(isFile ? [{
                label: 'View',
                onClick: () => {
                    if ('url' in file && file.url) window.open(file.url, '_blank');
                }
            }] : []),
            {
                label: 'Copy path',
                onClick: () => {
                    const path = 'key' in file ? file.key : file.path;
                    navigator.clipboard.writeText(path);
                }
            },
            {
                label: 'Rename',
                onClick: () => console.log('Rename', file.name),
            },
            {
                label: 'Delete',
                danger: true,
                onClick: () => {
                    if ('key' in file) dispatch(deleteFiles([file.key]));
                }
            },
        ];
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const files = Array.from(e.target.files ?? []);
        if (!files.length) return;
        // user is inside docs/reports/ folder
        dispatch(uploadFiles({ files, prefix: 'docs/' }));

    }
     const onClose=()=>{
        setCreateFolderDialog(false)
     }

    return (
        <div>
            {createFolderDilaog && <CreateFolder onClose={onClose}/>}
            <div className={styles.file_list_main}>
                <div className={styles.file_list_toolbar}>
                    <div>
                        <input
                            ref={fileInputRef}
                            type="file"
                            multiple
                            style={{ display: 'none' }}
                            onChange={handleFileUpload}
                        />
                        <ActionMenuWrapper actions={newActions()} children=<CLButton
                            title="New"
                            size="sm"
                            leading={
                                <svg width="20" height="20" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
                                    <line x1="12" y1="4" x2="12" y2="20" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                                    <line x1="4" y1="12" x2="20" y2="12" stroke="currentColor" stroke-width="2" stroke-linecap="round" />
                                </svg>
                            }
                        /> />
                    </div>

                </div>

                <div className={styles.file_list_table_wrap}>
                    <table className={styles.file_list_table}>
                        <thead>
                            <tr>
                                <th className={styles.col_check}>
                                    <input type="checkbox" className={styles.checkbox} />
                                </th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Last Modified</th>
                                <th style={{ width: '48px' }} />
                            </tr>
                        </thead>
                        <tbody>
                            {files.map((file, index) => (
                                <tr key={index}>
                                    <td className={styles.col_check}>
                                        <input type="checkbox" className={styles.checkbox} />
                                    </td>

                                    {/* Name cell with icon */}
                                    <td
                                        style={{
                                            cursor: file.type === 'file' ? 'pointer' : 'default',
                                            display: 'flex',
                                            alignItems: 'center',
                                            gap: '8px',
                                        }}
                                        onClick={() => {
                                            if (file.type === 'file' && 'url' in file && file.url) {
                                                window.open(file.url, '_blank');
                                            }
                                        }}
                                    >
                                        {file.type === 'folder'
                                            ? <FolderIcon />
                                            : <FileIcon ext={getExt(file.name)} />
                                        }
                                        {file.name}
                                    </td>

                                    <td>{file.type}</td>
                                    <td>
                                        {file.type === 'file' && 'lastModified' in file
                                            ? new Date(file.lastModified).toLocaleDateString()
                                            : '—'
                                        }
                                    </td>
                                    <td style={{ textAlign: 'center' }}>
                                        <ActionMenuWrapper actions={getActions(file)} children=<div>⋮</div> />
                                        {/* <ActionsMenu actions={getActions(file)} /> */}
                                    </td>
                                </tr>
                            ))}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>

    );
};