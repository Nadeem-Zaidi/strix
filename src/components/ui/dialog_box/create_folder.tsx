import { useRef } from 'react';
import { Modal } from "../portal/modal";
import styles from '../../../module_css/createfolder.module.css';
import { createFolderThunk, resetFolderCreation, setFolderName } from '../../../state_mngmt/slices/create_folder';
import { useAppDispatch, useAppSelector } from '../../../state_mngmt/store';


const INVALID = /[\/\\:*?"<>|]/;

interface Props {
    prefix?: string;
    onClose: () => void;
    onCreated?: () => void;
}

export const CreateFolder = ({ prefix = "/docs", onClose, onCreated }: Props) => {
    const dispatch = useAppDispatch();
    const { loading, error, folderName } = useAppSelector(
        (state) => state.folderCreation
    );

    const inputRef = useRef<HTMLInputElement>(null);

    const isInvalid = !!folderName && INVALID.test(folderName);
    const canSubmit = !!folderName?.trim() && !isInvalid && !loading;

    // ── hint logic ────────────────────────────────────────────────────────────
    const hint = error
        ? { text: error, type: 'error' as const }
        : isInvalid
        ? { text: 'Avoid special characters: / \\ : * ? " < > |', type: 'error' as const }
        : folderName && folderName.length > 0
        ? { text: `${folderName.length} / 60 characters`, type: 'default' as const }
        : { text: 'Press Enter to confirm', type: 'default' as const };

    const hintClass = [
        styles.hint,
        hint.type === 'error' ? styles.hint_error : '',
    ].join(' ');

    // ── handlers ──────────────────────────────────────────────────────────────
    const handleChange = (e: React.ChangeEvent<HTMLInputElement>) => {
        dispatch(setFolderName(e.target.value));
    };

    const handleClear = () => {
        dispatch(setFolderName(''));
        inputRef.current?.focus();
    };

    const handleClose = () => {
        dispatch(resetFolderCreation());
        onClose();
    };

    const handleCreate = async () => {
        if (!canSubmit) return;

        const result = await dispatch(
            createFolderThunk({ folderName: folderName!.trim(), prefix })
        );

        if (createFolderThunk.fulfilled.match(result)) {
            onCreated?.();   // ← tell parent to refresh file list
            handleClose();   // ← close modal + reset state
        }
        // if rejected, error is already in Redux state
        // the hint above will show it automatically
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