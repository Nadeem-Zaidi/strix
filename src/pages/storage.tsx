import { useEffect, useRef, useState } from 'react';
import { GlowingAiSparkle } from './ai_icon';
import './storage.css';
import {
  Search,
  Sparkles,
  SlidersHorizontal,
  Settings2,
  X,
  Upload,
  ChevronDown,
  File as FileIcon,
  FolderUp,
  CheckCircle2,
  AlertCircle,
  Loader2,
  RotateCcw,
} from 'lucide-react';
import { ChatPage } from '../components/chat';
import { useListFilesQuery, useUploadFilesMutation } from '../state_mngmt/api/storage_api';

const MAX_FILE_SIZE = 100 * 1024 * 1024; // must mirror the server's multer limit
const MAX_CONCURRENT_UPLOADS = 3;

type UploadItem = {
  id: string;
  name: string;
  size: number;
  status: 'uploading' | 'success' | 'error';
  errorMessage?: string;
  file: File;
};

function formatBytes(bytes: number): string {
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function getErrorMessage(err: unknown): string {
  if (err && typeof err === 'object') {
    const maybe = err as { data?: { error?: string }; error?: string };
    if (maybe.data?.error) return maybe.data.error;
    if (typeof maybe.error === 'string') return maybe.error;
  }
  return 'Upload failed';
}

export function S3FolderBrowser() {
  const [isChatOpen, setIsChatOpen] = useState(false);
  const [isUploadMenuOpen, setIsUploadMenuOpen] = useState(false);

  const [uploadQueue, setUploadQueue] = useState<UploadItem[]>([]);
  const [isUploadPanelOpen, setIsUploadPanelOpen] = useState(false);

  // NEW: files the user just picked, waiting for confirmation before anything uploads
  const [pendingFiles, setPendingFiles] = useState<File[]>([]);
  const [isConfirmDialogOpen, setIsConfirmDialogOpen] = useState(false);

  const fileInputRef = useRef<HTMLInputElement>(null);
  const folderInputRef = useRef<HTMLInputElement>(null);
  const uploadMenuRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    const handleClickOutside = (e: MouseEvent) => {
      if (uploadMenuRef.current && !uploadMenuRef.current.contains(e.target as Node)) {
        setIsUploadMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const [continuationToken, setContinuationToken] = useState<string | undefined>(undefined);
  const { data, isLoading, isFetching, error } = useListFilesQuery(continuationToken);
  const [triggerUpload] = useUploadFilesMutation();

  const activeUploadsCount = uploadQueue.filter((item) => item.status === 'uploading').length;
  const isUploading = activeUploadsCount > 0;

  const updateItem = (id: string, patch: Partial<UploadItem>) => {
    setUploadQueue((prev) => prev.map((item) => (item.id === id ? { ...item, ...patch } : item)));
  };

  // Picking files now just opens the review dialog — nothing uploads yet.
  const handleFilesSelected = (e: React.ChangeEvent<HTMLInputElement>) => {
    const fileList = e.target.files;
    if (!fileList || fileList.length === 0) {
      e.target.value = '';
      return;
    }
    const selected = Array.from(fileList); // snapshot before clearing — input.files is live
    e.target.value = '';
    setPendingFiles(selected);
    setIsConfirmDialogOpen(true);
  };

  const removePendingFile = (index: number) => {
    setPendingFiles((prev) => prev.filter((_, i) => i !== index));
  };

  const cancelSelection = () => {
    setPendingFiles([]);
    setIsConfirmDialogOpen(false);
  };

  const uploadFileList = async (selected: File[]) => {
    if (!selected.length) return;

    const items: UploadItem[] = selected.map((file, index) => {
      const oversized = file.size > MAX_FILE_SIZE;
      return {
        id: `${Date.now()}-${index}-${file.name}`,
        name: file.name,
        size: file.size,
        file,
        status: oversized ? 'error' : 'uploading',
        errorMessage: oversized ? `Exceeds ${formatBytes(MAX_FILE_SIZE)} limit` : undefined,
      };
    });

    setUploadQueue((prev) => [...prev, ...items]);
    setIsUploadPanelOpen(true);

    const toUpload = items.filter((item) => item.status === 'uploading');
    let cursor = 0;
    const worker = async (): Promise<void> => {
      const index = cursor++;
      if (index >= toUpload.length) return;
      await runUpload(toUpload[index]);
      return worker();
    };
    await Promise.all(Array.from({ length: Math.min(MAX_CONCURRENT_UPLOADS, toUpload.length) }, worker));
  };

  // Confirming the dialog is what actually kicks the upload off.
  const confirmUpload = async () => {
    const filesToUpload = pendingFiles;
    setPendingFiles([]);
    setIsConfirmDialogOpen(false);
    await uploadFileList(filesToUpload);
  };

  const runUpload = async (item: UploadItem) => {
    updateItem(item.id, { status: 'uploading', errorMessage: undefined });
    try {
      await triggerUpload({ files: [item.file], prefix: '' }).unwrap();
      updateItem(item.id, { status: 'success' });
    } catch (err) {
      console.error(`Failed to upload ${item.name}:`, err);
      updateItem(item.id, { status: 'error', errorMessage: getErrorMessage(err) });
    }
  };

  const clearCompleted = () => {
    setUploadQueue((prev) => prev.filter((item) => item.status === 'uploading'));
  };

  return (
    <div className="app-shell">
      {/* CONFIRM-BEFORE-UPLOAD DIALOG */}
      {isConfirmDialogOpen && (
        <div
          role="dialog"
          aria-modal="true"
          onClick={cancelSelection}
          style={{
            position: 'fixed',
            inset: 0,
            background: 'rgba(0,0,0,0.45)',
            display: 'flex',
            alignItems: 'center',
            justifyContent: 'center',
            zIndex: 1000,
          }}
        >
          <div
            onClick={(e) => e.stopPropagation()}
            style={{
              background: '#fff',
              borderRadius: 12,
              width: 440,
              maxWidth: '90vw',
              maxHeight: '80vh',
              display: 'flex',
              flexDirection: 'column',
              boxShadow: '0 20px 60px rgba(0,0,0,0.28)',
              overflow: 'hidden',
            }}
          >
            {/* Header: file count + the Upload button, front and center as requested */}
            <div
              style={{
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                padding: '16px 20px',
                borderBottom: '1px solid #eee',
                gap: 12,
              }}
            >
              <div style={{ minWidth: 0 }}>
                <div style={{ fontWeight: 600, fontSize: 15, color: '#111' }}>
                  {pendingFiles.length} file{pendingFiles.length !== 1 ? 's' : ''} selected
                </div>
                <div style={{ fontSize: 12, color: '#777' }}>
                  Total: {formatBytes(pendingFiles.reduce((sum, f) => sum + f.size, 0))}
                </div>
              </div>
              <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                <button
                  type="button"
                  onClick={cancelSelection}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: '1px solid #ddd',
                    background: '#fff',
                    cursor: 'pointer',
                    fontSize: 13,
                  }}
                >
                  Cancel
                </button>
                <button
                  type="button"
                  onClick={confirmUpload}
                  disabled={pendingFiles.length === 0}
                  style={{
                    padding: '8px 14px',
                    borderRadius: 8,
                    border: 'none',
                    background: pendingFiles.length === 0 ? '#a5b4fc' : '#4f46e5',
                    color: '#fff',
                    cursor: pendingFiles.length === 0 ? 'not-allowed' : 'pointer',
                    fontSize: 13,
                    fontWeight: 600,
                    display: 'flex',
                    alignItems: 'center',
                    gap: 6,
                  }}
                >
                  <Upload size={14} />
                  Upload
                </button>
              </div>
            </div>

            {/* Scrollable list of what's about to be uploaded */}
            <div style={{ overflowY: 'auto', padding: 8, flex: 1 }}>
              {pendingFiles.length === 0 && (
                <div style={{ padding: 24, textAlign: 'center', color: '#999', fontSize: 13 }}>
                  No files left to upload.
                </div>
              )}
              {pendingFiles.map((file, index) => {
                const oversized = file.size > MAX_FILE_SIZE;
                return (
                  <div
                    key={`${file.name}-${index}`}
                    style={{
                      display: 'flex',
                      alignItems: 'center',
                      gap: 10,
                      padding: '8px 8px',
                      borderRadius: 8,
                    }}
                  >
                    <FileIcon size={18} color={oversized ? '#dc2626' : '#6366f1'} />
                    <div style={{ flex: 1, minWidth: 0 }}>
                      <div
                        title={file.name}
                        style={{
                          fontSize: 13,
                          color: '#111',
                          whiteSpace: 'nowrap',
                          overflow: 'hidden',
                          textOverflow: 'ellipsis',
                        }}
                      >
                        {file.name}
                      </div>
                      <div style={{ fontSize: 11, color: oversized ? '#dc2626' : '#888' }}>
                        {oversized ? `Too large — exceeds ${formatBytes(MAX_FILE_SIZE)}` : formatBytes(file.size)}
                      </div>
                    </div>
                    <button
                      type="button"
                      aria-label={`Remove ${file.name}`}
                      onClick={() => removePendingFile(index)}
                      style={{
                        border: 'none',
                        background: 'transparent',
                        cursor: 'pointer',
                        color: '#999',
                        padding: 4,
                      }}
                    >
                      <X size={16} />
                    </button>
                  </div>
                );
              })}
            </div>
          </div>
        </div>
      )}

      <div className="storage-main">
        <div className="storage-top-bar">
          <div className="storage-top-bar__search_bar">
            <div className="search-icon-group">
              <Search size={20} strokeWidth={2} />
              <Sparkles size={10} strokeWidth={2.5} className="sparkle-icon" />
            </div>
            <input
              className='search-input'
              type="text"
              placeholder="Get answers from files"
            />
          </div>
          <div className='storage-top-bar__actions'></div>
          <div className="action-icons">
            <div className="upload-menu" ref={uploadMenuRef}>
              <button
                type="button"
                className="upload-btn"
                disabled={isUploading}
                onClick={() => setIsUploadMenuOpen((v) => !v)}
              >
                <Upload size={16} strokeWidth={2.25} />
                <span>{isUploading ? 'Uploading…' : 'Upload'}</span>
                <ChevronDown
                  size={14}
                  strokeWidth={2.25}
                  className={`upload-btn__chevron ${isUploadMenuOpen ? 'upload-btn__chevron--open' : ''}`}
                />
              </button>

              {isUploadMenuOpen && (
                <div className="upload-menu__dropdown">
                  <button
                    type="button"
                    className="upload-menu__item"
                    onClick={() => {
                      fileInputRef.current?.click();
                      setIsUploadMenuOpen(false);
                    }}
                  >
                    <FileIcon size={16} strokeWidth={2} />
                    <div className="upload-menu__item-text">
                      <span>Upload files</span>
                      <small>Select one or more files</small>
                    </div>
                  </button>
                  <button
                    type="button"
                    className="upload-menu__item"
                    onClick={() => {
                      folderInputRef.current?.click();
                      setIsUploadMenuOpen(false);
                    }}
                  >
                    <FolderUp size={16} strokeWidth={2} />
                    <div className="upload-menu__item-text">
                      <span>Upload folder</span>
                      <small>Keeps the folder structure</small>
                    </div>
                  </button>
                </div>
              )}

              <input
                ref={fileInputRef}
                type="file"
                multiple
                style={{ display: 'none' }}
                onChange={handleFilesSelected}
              />
              <input
                ref={folderInputRef}
                type="file"
                // @ts-ignore
                webkitdirectory="true"
                directory="true"
                multiple
                style={{ display: 'none' }}
                onChange={handleFilesSelected}
              />
            </div>

            <div className="action-icons__divider" />

            <button type="button" className="icon-button" aria-label="Advanced Search">
              <Settings2 size={20} />
            </button>
            <button type="button" className="icon-button" aria-label="Filter Results">
              <SlidersHorizontal size={20} />
            </button>
          </div>
        </div>

        <div className='storage-heading'>Welcome to Drive</div>

        <div className='storage-file-list-container'>
          <div className='file-row list-header'>
            <div className="cell">Name</div>
            <div className="cell">Changed Date</div>
            <div className="cell">Owner</div>
            <div className="cell">Location</div>
            <div className="cell action-cell"></div>
          </div>

          {isLoading && <div className="file-row"><div className="cell">Loading files…</div></div>}
          {error && <div className="file-row"><div className="cell">Couldn't load files.</div></div>}
          {!isLoading && !error && data?.files.length === 0 && (
            <div className="file-row"><div className="cell">No files yet.</div></div>
          )}

          {data?.files.map((file) => (
            <div key={file.key} className="file-row list-item">
              <div className="cell name-cell">
                <span className="icon doc-icon">📄</span>
                <span className="truncate">{file.name}</span>
              </div>
              <div className="cell"><span className="truncate">{file.lastModified ?? '—'}</span></div>
              <div className="cell owner-cell"><div className="avatar">A</div><span>me</span></div>
              <div className="cell location-cell">
                <span className="icon drive-icon">🖨️</span>
                <span className="truncate">My Drive</span>
              </div>
              <div className="cell action-cell"><button className="kebab-menu">⋮</button></div>
            </div>
          ))}

          {data?.continuationToken && (
            <button onClick={() => setContinuationToken(data.continuationToken!)} disabled={isFetching}>
              Load more
            </button>
          )}
        </div>

        {/* UPLOAD PROGRESS TRACKER — appears once uploading actually starts */}
        {isUploadPanelOpen && uploadQueue.length > 0 && (
          <div className="upload-manager">
            <div className="upload-manager__header">
              <h3>
                {activeUploadsCount > 0
                  ? `Uploading ${activeUploadsCount} item${activeUploadsCount > 1 ? 's' : ''}`
                  : 'Uploads complete'}
              </h3>
              <div style={{ display: 'flex', gap: 8 }}>
                {activeUploadsCount === 0 && (
                  <button className="upload-manager__clear" onClick={clearCompleted}>
                    Clear
                  </button>
                )}
                <button
                  className="upload-manager__close"
                  onClick={() => setIsUploadPanelOpen(false)}
                >
                  <X size={16} />
                </button>
              </div>
            </div>
            <div className="upload-manager__body">
              {uploadQueue.map((item) => (
                <div key={item.id} className="upload-manager__item">
                  <FileIcon size={18} className="upload-manager__item-icon" />
                  <div className="upload-manager__item-text">
                    <span className="upload-manager__item-name truncate">{item.name}</span>
                    <small className="upload-manager__item-meta">
                      {item.status === 'error' ? item.errorMessage : formatBytes(item.size)}
                    </small>
                  </div>

                  <div className="upload-manager__item-status">
                    {item.status === 'uploading' && (
                      <Loader2 size={16} className="spinner-icon text-blue-500" />
                    )}
                    {item.status === 'success' && (
                      <CheckCircle2 size={18} className="text-green-500" />
                    )}
                    {item.status === 'error' && (
                      <>
                        <AlertCircle size={18} className="text-red-500" />
                        <button
                          className="upload-manager__retry"
                          aria-label={`Retry ${item.name}`}
                          onClick={() => runUpload(item)}
                        >
                          <RotateCcw size={14} />
                        </button>
                      </>
                    )}
                  </div>
                </div>
              ))}
            </div>
          </div>
        )}

        {!isChatOpen && (
          <button
            type="button"
            className="ai-icon"
            aria-label="Open AI assistant"
            onClick={() => setIsChatOpen(true)}
          >
            <GlowingAiSparkle />
          </button>
        )}
      </div>

      <aside className={`chat-side-panel ${isChatOpen ? 'chat-side-panel--open' : ''}`}>
        <div className="chat-side-panel__inner">
          <button
            type="button"
            className="chat-side-panel__close"
            aria-label="Close AI assistant"
            onClick={() => setIsChatOpen(false)}
          >
            <X size={18} />
          </button>
          <div className="chat-side-panel__body">
            {isChatOpen && <ChatPage />}
          </div>
        </div>
      </aside>
    </div>
  );
}