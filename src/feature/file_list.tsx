import { CLButton } from '../components/ui/clbutton';
import styles from '../module_css/file_explorer_list.module.css';
import { useDispatch, useSelector } from 'react-redux';
import { useAppSelector, type AppDispatch, type RootState } from '../state_mngmt/store';
import { addpath, deleteFiles, generateRAG, getFiles, resetPath, slicePath, uploadFiles } from '../state_mngmt/slices/filereader_slice';
import { ActionMenuWrapper } from '../utils/action';
import { Fragment, useEffect, useRef, useState } from 'react';
import type { Action } from '../types';
import { FolderIcon } from '../utils/folder_icon';
import { FileIcon } from '../utils/file_icon';
import { CreateFolder } from '../components/ui/dialog_box/create_folder';
import { selectAllItems, selectIsSelected, selectItems, selectSelectedKeys, toggleItem } from '../state_mngmt/slices/select_item_slice';

const getExt = (name: string) => name.split('.').pop() ?? '';

export const FileList = () => {
    const dispatch = useDispatch<AppDispatch>();
    const fileInputRef = useRef<HTMLInputElement>(null);
    const { fileList: files, breadCrumb, loading } = useSelector((s: RootState) => s.files);
    const [createFolderDialog, setCreateFolderDialog] = useState<boolean>(false);
    const selectedItems = useAppSelector(selectItems)
    const items=useAppSelector(selectSelectedKeys)


    const checked = (file: any) => {
        dispatch(toggleItem(file))
    }
    useEffect(() => {
        const prefix = breadCrumb.length > 0 ? `${breadCrumb.join('/')}/` : undefined;
        dispatch(getFiles({ prefix, nextToken: undefined }));
    }, [breadCrumb]);

    const newActions = (): Action[] => [
        {
            label: 'Folder',
            onClick: () => setCreateFolderDialog(true),
        },
        {
            label: 'File',
            onClick: () => { },
        },
        {
            label: 'Upload',
            onClick: () => fileInputRef.current?.click(),
        },
    ];

    const getActions = (file: typeof files[number]): Action[] => {
        const isFile = file.type === 'file';
        return [
            ...(isFile ? [{
                label: 'View',
                onClick: () => {
                    if ('url' in file && file.url) window.open(file.url, '_blank');
                },
            }] : []),
            {
                label: 'Copy path',
                onClick: () => {
                    const path = 'key' in file ? file.key : file.path;
                    navigator.clipboard.writeText(path);
                },
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
                },
            },
        ];
    };

    const handleFileUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
        const selectedFiles = Array.from(e.target.files ?? []);
        if (!selectedFiles.length) return;
        const prefix = breadCrumb.length > 0 ? `${breadCrumb.join('/')}/` : '';

        dispatch(uploadFiles({ files: selectedFiles, prefix: prefix }));
    };

    const handleFolderClick = (file: typeof files[number]) => {
        if (file.type === 'folder') {
            dispatch(addpath(file.name));
        }
    };

    const handleCrumbClick = (index: number) => {
        // index = -1 means root
        if (index === -1) {
            dispatch(resetPath());
        } else {
            dispatch(slicePath(index + 1));
        }
    };

    return (
        <div>
            {createFolderDialog && <CreateFolder onClose={() => setCreateFolderDialog(false)} />}

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
                        <ActionMenuWrapper
                            actions={newActions()}
                            children={
                                <CLButton
                                    title="New"
                                    size="sm"
                                    leading={
                                        <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                            <line x1="12" y1="5" x2="12" y2="19" />
                                            <line x1="5" y1="12" x2="19" y2="12" />
                                        </svg>
                                    }
                                />
                            }
                        />
                    </div>
                    <div className={styles.toolbar_divider} />
                    <nav className={styles.breadcrumb}>
                        <span
                            className={`${styles.crumb} ${breadCrumb.length === 0 ? styles.crumb_active : ''}`}
                            onClick={() => handleCrumbClick(-1)}
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                                <path d="M3 9l9-7 9 7v11a2 2 0 01-2 2H5a2 2 0 01-2-2z" />
                                <polyline points="9 22 9 12 15 12 15 22" />
                            </svg>
                            Root
                        </span>

                        {breadCrumb.map((segment, i) => {
                            const isLast = i === breadCrumb.length - 1;
                            return (
                                <Fragment key={i}>
                                    <span className={styles.crumb_chevron}>›</span>
                                    <span
                                        className={`${styles.crumb} ${isLast ? styles.crumb_active : ''}`}
                                        onClick={() => !isLast && handleCrumbClick(i)}
                                    >
                                        {segment}
                                    </span>
                                </Fragment>
                            );
                        })}
                    </nav>
                    <div>
                        <button onClick={()=>dispatch(generateRAG({prefix:breadCrumb.join(",")}))}>Generate Rag</button>
                    </div>

                </div>

                <div className={styles.file_list_table_wrap}>
                    <table className={styles.file_list_table}>
                        <thead>
                            <tr>
                                <th className={styles.col_check}>
                                    <input
                                        type="checkbox"
                                        className={styles.checkbox}
                                        onChange={() => dispatch(selectAllItems(files))}
                                    />
                                </th>
                                <th>Name</th>
                                <th>Type</th>
                                <th>Last Modified</th>
                                <th style={{ width: '48px' }} />
                            </tr>
                        </thead>
                        <tbody>
                            {files.map((file, index) => {
                                const key='key' in file?file.key:file.path;
                                return <tr key={index}>
                                    <td className={styles.col_check}>
                                        <input
                                            type="checkbox"
                                            className={styles.checkbox}
                                            checked={!!selectedItems[key] }
                                            onChange={() => checked(file)}
                                        />
                                    </td>
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
                                            } else if (file.type === 'folder') {
                                                handleFolderClick(file)
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
                                    </td>
                                </tr>
                            })}
                        </tbody>
                    </table>
                </div>
            </div>
        </div>
    );
};
