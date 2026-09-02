import { useRef, useState } from 'react';
import { Modal } from "../portal/modal";
import styles from '../../../module_css/createfolder.module.css';
import { useAppDispatch, useAppSelector, type RootState } from '../../../state_mngmt/store';
import { useSelector } from 'react-redux';
import { createFolder, getFiles } from '../../../state_mngmt/slices/filereader_slice';

// Remove the create_folder slice imports — they're no longer needed

const INVALID = /[\/\\:*?"<>|]/;

interface Props {
    prefix?: string;
    onClose: () => void;
    onCreated?: () => void;
}

export const CreateFolder = ({ prefix = "", onClose, onCreated }: Props) => {
    const dispatch = useAppDispatch();

    const { loading, breadCrumb } = useSelector((s: RootState) => s.files);

    const [folderName, setFolderName] = useState('');
    const inputRef = useRef<HTMLInputElement>(null);
    const isInvalid = INVALID.test(folderName);
    const canSubmit = folderName.trim().length > 0 && !isInvalid && !loading;

    const hint = isInvalid
        ? { text: 'Name cannot contain \\ / : * ? " < > |', isError: true }
        : { text: '', isError: false };

    const hintClass = `${styles.hint} ${hint.isError ? styles.hint_error : ''}`;

    // ── handlers ──────────────────────────────────────────────────────────────
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        setFolderName(e.target.value);
    };

    const handleClear = () => {
        setFolderName('');
        inputRef.current?.focus();
    };

    const handleClose = () => {
        setFolderName('');
        onClose();
    };

    const handleCreate = async () => {
        if (!canSubmit) return;
        const currentPath = breadCrumb.length > 0 ? `${breadCrumb.join('/')}/` : '';
        const result = await dispatch(
            createFolder({ folderName: `${currentPath}${folderName.trim()}/`, prefix })
        );

        if (createFolder.fulfilled.match(result)) {
            onCreated?.();
            handleClose();
        } 
    };

    const handleKeyDown = (e: React.KeyboardEvent<HTMLInputElement>) => {
        if (e.key === 'Enter') handleCreate();
        if (e.key === 'Escape') handleClose();
    };

    return (
        <Modal>
            <div className={styles.modal_main}>
                <div className={styles.modal_box}>

                    <div className={styles.modal_box_title}>Create Folder</div>

                    <div className={styles.modal_content}>
                        <div className={styles.field_group}>
                            <label className={styles.field_label} htmlFor="folderInput">
                                Folder name
                            </label>
                            <div className={styles.field}>
                                <span className={styles.folder_icon}>
                                    <svg width="17" height="17" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
                                        <path d="M22 19a2 2 0 0 1-2 2H4a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h5l2 3h9a2 2 0 0 1 2 2z" />
                                    </svg>
                                </span>
                                <input
                                    ref={inputRef}
                                    className={styles.field_input}
                                    type="text"
                                    id="folderInput"
                                    placeholder="Enter folder name"
                                    autoComplete="off"
                                    maxLength={60}
                                    value={folderName ?? ''}
                                    onChange={handleChange}
                                    onKeyDown={handleKeyDown}
                                    disabled={loading}
                                />
                                <button
                                    className={`${styles.clear_btn} ${folderName && folderName.length > 0 ? styles.clear_btn_visible : ''}`}
                                    onClick={handleClear}
                                    title="Clear"
                                    type="button"
                                >
                                    <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round">
                                        <path d="M18 6 6 18M6 6l12 12" />
                                    </svg>
                                </button>
                            </div>
                            <div className={hintClass}>{hint.text}</div>
                        </div>
                    </div>

                    <div className={styles.modal_actions}>
                        <button
                            className={styles.btn_secondary}
                            type="button"
                            onClick={handleClose}
                            disabled={loading}
                        >
                            Close
                        </button>
                        <button
                            className={styles.btn_primary}
                            type="button"
                            disabled={!canSubmit}
                            onClick={handleCreate}
                        >
                            {loading ? 'Creating...' : 'Create'}
                        </button>
                    </div>

                </div>
            </div>
        </Modal>
    );
};