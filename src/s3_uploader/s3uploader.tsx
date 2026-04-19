import { useState, useCallback, useRef } from "react";
import './s3_uploader.css';
import type { S3Config } from "../feature/fileuploader/file_config";
import { s3, S3_Uploader } from "./s3_uploader";



type FileStatus = "idle" | "uploading" | "done" | "error";

interface FileItem {
  id: string;
  file: File;
  status: FileStatus;
  progress: number;
  error?: string;
}

const s3Config: S3Config = {
  region:          import.meta.env.VITE_AWS_REGION           ?? "us-east-1",
  accessKey:       import.meta.env.VITE_AWS_ACCESS_KEY_ID    ?? "",
  secretAccessKey: import.meta.env.VITE_AWS_SECRET_ACCESS_KEY ?? "",
  bucket:          import.meta.env.VITE_S3_BUCKET            ?? "my-bucket",
};


function formatSize(bytes: number) {
  if (bytes < 1024)           return `${bytes} B`;
  if (bytes < 1024 * 1024)    return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function fileIcon(name: string) {
  const ext = name.split(".").pop()?.toLowerCase() ?? "";
  if (["jpg","jpeg","png","gif","webp","svg"].includes(ext)) return "🖼";
  if (["pdf"].includes(ext))                                  return "📄";
  if (["mp4","mov","avi"].includes(ext))                      return "🎬";
  if (["mp3","wav"].includes(ext))                            return "🎵";
  if (["zip","tar","gz"].includes(ext))                       return "📦";
  return "📁";
}

// ── Circular Progress ──────────────────────
function CircularProgress({ progress }: { progress: number }) {
  const r    = 16;
  const circ = 2 * Math.PI * r;
  const offset = circ - (progress / 100) * circ;
  return (
    <svg width="44" height="44" viewBox="0 0 44 44" style={{ transform: "rotate(-90deg)" }}>
      <circle cx="22" cy="22" r={r} fill="none" stroke="#e4e4ec" strokeWidth="3.5" />
      <circle
        cx="22" cy="22" r={r}
        fill="none" stroke="#3a5aff" strokeWidth="3.5" strokeLinecap="round"
        strokeDasharray={circ} strokeDashoffset={offset}
        style={{ transition: "stroke-dashoffset 0.3s ease" }}
      />
      <text x="22" y="22" textAnchor="middle" dominantBaseline="central"
        style={{
          transform: "rotate(90deg)", transformOrigin: "22px 22px",
          fontSize: "9px", fontFamily: "IBM Plex Mono, monospace",
          fill: "#3a5aff", fontWeight: "600",
        }}>
        {progress}%
      </text>
    </svg>
  );
}

function GreenTick() {
  return (
    <svg width="22" height="22" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="#00d08412" stroke="#00d084" strokeWidth="1.5" />
      <polyline points="13,22 19,29 31,15" fill="none" stroke="#00d084" strokeWidth="2.8"
        strokeLinecap="round" strokeLinejoin="round"
        style={{ strokeDasharray: 24, strokeDashoffset: 0, animation: "drawTick 0.35s ease forwards" }}
      />
    </svg>
  );
}

function ErrorIcon() {
  return (
    <svg width="22" height="22" viewBox="0 0 44 44">
      <circle cx="22" cy="22" r="18" fill="#ff456010" stroke="#ff4560" strokeWidth="1.5" />
      <line x1="15" y1="15" x2="29" y2="29" stroke="#ff4560" strokeWidth="2.8" strokeLinecap="round" />
      <line x1="29" y1="15" x2="15" y2="29" stroke="#ff4560" strokeWidth="2.8" strokeLinecap="round" />
    </svg>
  );
}

export default function S3Uploader() {
  const [files, setFiles]         = useState<FileItem[]>([]);
  const [isDragging, setIsDragging] = useState(false);
  const [isRagProgress,setisRagProgress]=useState(false);
  const inputRef = useRef<HTMLInputElement>(null);

  const addFiles = (incoming: FileList | null) => {
    if (!incoming) return;
    const newItems: FileItem[] = Array.from(incoming).map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f, status: "idle", progress: 0,
    }));
    setFiles((prev) => [...prev, ...newItems]);
  };

  const uploadFile = useCallback(async (item: FileItem) => {
    setFiles((prev) => prev.map((f) =>
      f.id === item.id ? { ...f, status: "uploading", progress: 0 } : f
    ));
    try {
      let sim = 0;
      const interval = setInterval(() => {
        sim = Math.min(sim + Math.random() * 18, 90);
        setFiles((prev) => prev.map((f) =>
          f.id === item.id ? { ...f, progress: Math.round(sim) } : f
        ));
      }, 200);

      await s3.uploadFile(item.file);
      clearInterval(interval);
      setFiles((prev) => prev.map((f) => f.id === item.id ? { ...f, progress: 100 } : f));
      setTimeout(() => {
        setFiles((prev) => prev.map((f) =>
          f.id === item.id ? { ...f, status: "done", progress: 100 } : f
        ));
      }, 300);
    } catch (err: unknown) {
      setFiles((prev) => prev.map((f) =>
        f.id === item.id ? { ...f, status: "error", error: (err as Error).message } : f
      ));
    }
  }, []);

  const uploadAll = () =>
    files.filter((f) => f.status === "idle" || f.status === "error").forEach(uploadFile);

  const removeFile = (id: string) =>
    setFiles((prev) => prev.filter((f) => f.id !== id));

  const clearAll = () => setFiles([]);

  const handleGenerateRAG = async () => {
    setisRagProgress(true);
    try {
        const response = await fetch("http://localhost:3000/api/generate_rag", {
            method: "GET",
        });

        if (!response.ok) {
            const error = await response.json();
            console.error("API error:", error);
            return;
        }
        if(isRagProgress===false){
          alert("Completed creating vectors/embeddings")
        }

        const result = await response.json();
        setisRagProgress(false)
        if (result.status === "done") {
            clearAll();
        }

    } catch (error) {
        console.error("Network error:", error);
        setisRagProgress(false)  // ✅ don't silently swallow errors
    }
};
  const doneCount      = files.filter((f) => f.status === "done").length;
  const uploadingCount = files.filter((f) => f.status === "uploading").length;
  const idleCount      = files.filter((f) => f.status === "idle").length;

  return (
    <div className="uploader_body">
      <div className="uploader-wrap">

        {/* ── Header ── */}
        <div className="uploader-header">
          <div className="uploader-header-top">
            <span className="uploader-badge">S3 · Secure Upload</span>
          </div>
          <h1>File Ingestion</h1>
          <p>Upload assets to S3 · Track status in real-time · Generate RAG pipeline</p>
        </div>

        {/* ── Dropzone ── */}
        <div
          className={`dropzone ${isDragging ? "dragging" : ""}`}
          onDragOver={(e) => { e.preventDefault(); setIsDragging(true); }}
          onDragLeave={() => setIsDragging(false)}
          onDrop={(e) => { e.preventDefault(); setIsDragging(false); addFiles(e.dataTransfer.files); }}
          onClick={() => inputRef.current?.click()}
        >
          <div className="dropzone-icon-wrap">☁️</div>
          <h3>Drop files here or click to browse</h3>
          <p>Any file type · Multiple files supported</p>
          <input ref={inputRef} type="file" multiple
            onChange={(e) => addFiles(e.target.files)}
            onClick={(e) => e.stopPropagation()}
          />
        </div>

        {files.length > 0 && (
          <>
            {/* ── Stats ── */}
            <div className="stats-bar">
              <div className="stat">
                <div className="stat-dot idle" />
                <span className="stat-label">Queued</span>
                <span className="stat-value">{idleCount}</span>
              </div>
              <div className="stat">
                <div className="stat-dot uploading" />
                <span className="stat-label">Uploading</span>
                <span className="stat-value">{uploadingCount}</span>
              </div>
              <div className="stat">
                <div className="stat-dot done" />
                <span className="stat-label">Complete</span>
                <span className="stat-value">{doneCount} / {files.length}</span>
              </div>
            </div>

            {/* ── Actions ── */}
            <div className="actions">
              <button className="btn btn-primary" onClick={uploadAll}
                disabled={idleCount === 0 && uploadingCount > 0}>
                {uploadingCount > 0 ? `↑ Uploading ${uploadingCount}…` : "↑ Upload All"}
              </button>
              <button className="btn btn-ghost" onClick={clearAll}>Clear All</button>
            </div>

            {/* ── File Grid ── */}
            <div className="file_list_wraper">
              <div className="file-list">
                {files.map((item) => (
                  <div key={item.id} className={`file-row ${item.status}`}>

                    {/* Top: icon + name */}
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", width: "100%" }}>
                      <div className="file-icon-wrap">{fileIcon(item.file.name)}</div>
                      <div className="file-info">
                        <div className="file-name">{item.file.name}</div>
                        {item.status === "error"
                          ? <div className="file-error">⚠ {item.error}</div>
                          : <div className="file-meta">
                              {formatSize(item.file.size)}
                              {item.status === "uploading" && ` · ${item.progress}%`}
                              {item.status === "done"      && " · done"}
                            </div>
                        }
                      </div>
                    </div>

                    {/* Bottom: status + remove */}
                    <div className="file-card-footer">
                      <div className="file-status">
                        {item.status === "idle"      && <div className="idle-indicator" />}
                        {item.status === "uploading" && <CircularProgress progress={item.progress} />}
                        {item.status === "done"      && <GreenTick />}
                        {item.status === "error"     && <ErrorIcon />}
                      </div>
                      {item.status !== "uploading" && (
                        <button className="remove-btn" onClick={() => removeFile(item.id)} title="Remove">✕</button>
                      )}
                    </div>

                  </div>
                ))}
              </div>
            </div>

            {/* ── Generate RAG ── */}
            <div className="rag-section">
              <button className="btn-rag" disabled={doneCount === 0} onClick={handleGenerateRAG}>
                <span className="btn-rag-icon">◈</span>
                <span className="btn-rag-text">Generate RAG Pipeline</span>
                {doneCount > 0 && (
                  <span className="btn-rag-badge">{doneCount} file{doneCount > 1 ? "s" : ""} ready</span>
                )}
              </button>
            </div>
          </>
        )}

      </div>
    </div>
  );
}
