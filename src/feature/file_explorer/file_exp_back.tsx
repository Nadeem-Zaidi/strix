import { useState, useEffect, useCallback } from "react";

type S3FILE = {
  type: string;
  name: string;
  prefix: string;
  lastmodified: string;
  size?: number;
};

const fetchData = async (
  prefix: string = " ",
  token: string | undefined = undefined
): Promise<{ items: S3FILE[]; nextToken?: string }> => {
  let url = `http://localhost:3000/api/get_storage_list?prefix=${prefix}`;
  if (token) url += `&token=${token}`;

  const response = await fetch(url, { method: "GET" });
  if (!response.ok) throw new Error("Failed to fetch");

  const result = await response.json();
  const r: S3FILE[] = [];

  if (result.result.folders) {
    result.result.folders.forEach((f: any) =>
      r.push({ type: "folder", prefix: f.path, name: f.name, lastmodified: "" })
    );
  }
  if (result.result.files) {
    result.result.files.forEach((f: any) =>
      r.push({ type: "file", prefix: f.key, name: f.name, lastmodified: f.lastModified, size: f.size })
    );
  }

  return { items: r, nextToken: result.result.nextToken };
};

const formatSize = (bytes?: number) => {
  if (!bytes) return "";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

const formatDate = (iso: string) => {
  if (!iso) return "";
  return new Date(iso).toLocaleString("en-US", {
    month: "short", day: "2-digit", year: "numeric",
    hour: "2-digit", minute: "2-digit",
  });
};

const FolderIcon = () => (
  <svg width="20" height="20" viewBox="0 0 24 24" fill="none">
    <path d="M3 7C3 5.9 3.9 5 5 5H10L12 7H19C20.1 7 21 7.9 21 9V17C21 18.1 20.1 19 19 19H5C3.9 19 3 18.1 3 17V7Z"
      fill="#DCB044" stroke="#C49B2E" strokeWidth="0.5" />
    <path d="M3 9H21V17C21 18.1 20.1 19 19 19H5C3.9 19 3 18.1 3 17V9Z"
      fill="#F0C030" stroke="#C49B2E" strokeWidth="0.5" />
  </svg>
);

const FileIcon = ({ ext }: { ext: string }) => {
  const colors: Record<string, string> = {
    md: "#4A9EFF", pdf: "#E74C3C", txt: "#95A5A6",
    js: "#F7DF1E", ts: "#3178C6", json: "#8BC34A",
  };
  const color = colors[ext] || "#7F8C8D";
  return (
    <svg width="18" height="20" viewBox="0 0 18 20" fill="none">
      <path d="M2 0H11L16 5V18C16 19.1 15.1 20 14 20H2C0.9 20 0 19.1 0 18V2C0 0.9 0.9 0 2 0Z"
        fill="white" stroke="#CBD5E1" strokeWidth="1" />
      <path d="M11 0L16 5H12C11.4 5 11 4.6 11 4V0Z" fill="#CBD5E1" />
      <rect x="3" y="8" width="10" height="1.2" rx="0.6" fill={color} opacity="0.6" />
      <rect x="3" y="11" width="8" height="1.2" rx="0.6" fill={color} opacity="0.4" />
      <rect x="3" y="14" width="6" height="1.2" rx="0.6" fill={color} opacity="0.3" />
    </svg>
  );
};

const ChevronRight = ({ open }: { open: boolean }) => (
  <svg width="10" height="10" viewBox="0 0 10 10" fill="none"
    style={{ transform: open ? "rotate(90deg)" : "rotate(0deg)", transition: "transform 0.15s" }}>
    <path d="M3 2L7 5L3 8" stroke="#666" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

export default function FileExplorer() {
  const [files, setFiles] = useState<S3FILE[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [selected, setSelected] = useState<string | null>(null);
  const [view, setView] = useState<"details" | "icons">("details");
  const [breadcrumb, setBreadcrumb] = useState<{ name: string; prefix: string }[]>([
    { name: "docs", prefix: "docs/" },
  ]);
  const [nextToken, setNextToken] = useState<string | undefined>();
  const [loadingMore, setLoadingMore] = useState(false);

  const currentPrefix = breadcrumb[breadcrumb.length - 1].prefix;

  const load = useCallback(async (prefix: string, token?: string, append = false) => {
    try {
      append ? setLoadingMore(true) : setLoading(true);
      setError(null);
      const { items, nextToken: nt } = await fetchData(prefix, token);
      setFiles(prev => append ? [...prev, ...items] : items);
      setNextToken(nt);
    } catch (e: any) {
      setError(e.message);
    } finally {
      setLoading(false);
      setLoadingMore(false);
    }
  }, []);

  useEffect(() => { load(currentPrefix); }, []);

  const openFolder = (item: S3FILE) => {
    setBreadcrumb(prev => [...prev, { name: item.name, prefix: item.prefix }]);
    setSelected(null);
    load(item.prefix);
  };

  const navigateTo = (index: number) => {
    const crumb = breadcrumb[index];
    setBreadcrumb(prev => prev.slice(0, index + 1));
    setSelected(null);
    load(crumb.prefix);
  };

  const getExt = (name: string) => name.split(".").pop()?.toLowerCase() || "";
  const folders = files.filter(f => f.type === "folder");
  const fileItems = files.filter(f => f.type === "file");

  return (
    <div style={{
      fontFamily: "'Segoe UI', system-ui, sans-serif",
      fontSize: "13px",
      background: "#f3f3f3",
      height: "100vh",
      display: "flex",
      flexDirection: "column",
      color: "#1a1a1a",
      userSelect: "none",
    }}>

      {/* Title Bar */}
      <div style={{
        background: "linear-gradient(180deg, #f0f0f0 0%, #e8e8e8 100%)",
        borderBottom: "1px solid #c0c0c0",
        padding: "6px 12px",
        display: "flex",
        alignItems: "center",
        gap: "8px",
      }}>
        <span style={{ fontSize: "14px", fontWeight: 600, color: "#333" }}>File Explorer</span>
        <span style={{ color: "#999", fontSize: "11px" }}>— S3 Browser</span>
      </div>

      {/* Toolbar */}
      <div style={{
        background: "linear-gradient(180deg, #fafafa 0%, #f0f0f0 100%)",
        borderBottom: "1px solid #d0d0d0",
        padding: "4px 8px",
        display: "flex",
        alignItems: "center",
        gap: "4px",
      }}>
        {["←", "→", "↑"].map((btn, i) => (
          <button key={i} onClick={i === 0 && breadcrumb.length > 1 ? () => navigateTo(breadcrumb.length - 2) : undefined}
            style={{
              background: "linear-gradient(180deg, #fff 0%, #e8e8e8 100%)",
              border: "1px solid #b0b0b0",
              borderRadius: "3px",
              padding: "3px 8px",
              cursor: "pointer",
              fontSize: "13px",
              color: (i === 0 && breadcrumb.length <= 1) ? "#bbb" : "#333",
            }}>
            {btn}
          </button>
        ))}

        {/* Address Bar */}
        <div style={{
          flex: 1,
          marginLeft: "8px",
          background: "white",
          border: "1px solid #0078D4",
          borderRadius: "3px",
          padding: "3px 8px",
          display: "flex",
          alignItems: "center",
          gap: "4px",
          boxShadow: "inset 0 1px 2px rgba(0,0,0,0.05)",
        }}>
          {breadcrumb.map((crumb, i) => (
            <span key={i} style={{ display: "flex", alignItems: "center", gap: "4px" }}>
              {i > 0 && <span style={{ color: "#999" }}>›</span>}
              <span onClick={() => navigateTo(i)}
                style={{
                  color: i === breadcrumb.length - 1 ? "#1a1a1a" : "#0078D4",
                  cursor: "pointer",
                  fontWeight: i === breadcrumb.length - 1 ? 600 : 400,
                }}>
                {crumb.name}
              </span>
            </span>
          ))}
        </div>

        {/* View Toggle */}
        <div style={{ display: "flex", border: "1px solid #b0b0b0", borderRadius: "3px", overflow: "hidden" }}>
          {(["details", "icons"] as const).map(v => (
            <button key={v} onClick={() => setView(v)} style={{
              background: view === v ? "linear-gradient(180deg, #dce8f8 0%, #c5d9f0 100%)" : "linear-gradient(180deg, #fff 0%, #e8e8e8 100%)",
              border: "none",
              borderRight: v === "details" ? "1px solid #b0b0b0" : "none",
              padding: "3px 8px",
              cursor: "pointer",
              fontSize: "12px",
            }}>
              {v === "details" ? "☰" : "⊞"}
            </button>
          ))}
        </div>
      </div>

      <div style={{ display: "flex", flex: 1, overflow: "hidden" }}>

        {/* Left Sidebar */}
        <div style={{
          width: "200px",
          background: "linear-gradient(180deg, #f8f8f8 0%, #f0f0f0 100%)",
          borderRight: "1px solid #d0d0d0",
          padding: "8px 0",
          overflowY: "auto",
          flexShrink: 0,
        }}>
          <div style={{ padding: "2px 8px", color: "#666", fontSize: "11px", fontWeight: 600, textTransform: "uppercase", letterSpacing: "0.5px", marginBottom: "4px" }}>
            Folders
          </div>
          {breadcrumb.map((crumb, i) => (
            <div key={i} onClick={() => navigateTo(i)}
              style={{
                padding: "4px 8px 4px " + (8 + i * 12) + "px",
                display: "flex", alignItems: "center", gap: "6px",
                cursor: "pointer",
                background: i === breadcrumb.length - 1 ? "#dce8f8" : "transparent",
                borderLeft: i === breadcrumb.length - 1 ? "2px solid #0078D4" : "2px solid transparent",
              }}>
              <ChevronRight open={i === breadcrumb.length - 1} />
              <FolderIcon />
              <span style={{ fontSize: "12px", color: "#333" }}>{crumb.name}</span>
            </div>
          ))}
          {folders.map((f, i) => (
            <div key={i} onClick={() => openFolder(f)}
              style={{
                padding: "4px 8px 4px " + (8 + breadcrumb.length * 12) + "px",
                display: "flex", alignItems: "center", gap: "6px",
                cursor: "pointer",
              }}
              onMouseEnter={e => (e.currentTarget.style.background = "#e8f0fb")}
              onMouseLeave={e => (e.currentTarget.style.background = "transparent")}
            >
              <ChevronRight open={false} />
              <FolderIcon />
              <span style={{ fontSize: "12px", color: "#333" }}>{f.name}</span>
            </div>
          ))}
        </div>

        {/* Main Content */}
        <div style={{ flex: 1, display: "flex", flexDirection: "column", overflow: "hidden", background: "white" }}>

          {/* Status / Column Headers for Details View */}
          {view === "details" && (
            <div style={{
              display: "grid",
              gridTemplateColumns: "1fr 120px 160px 80px",
              padding: "4px 12px",
              background: "linear-gradient(180deg, #f5f5f5 0%, #ebebeb 100%)",
              borderBottom: "1px solid #d0d0d0",
              color: "#555",
              fontWeight: 600,
              fontSize: "12px",
            }}>
              <span>Name</span>
              <span>Type</span>
              <span>Date Modified</span>
              <span style={{ textAlign: "right" }}>Size</span>
            </div>
          )}

          {/* File List */}
          <div style={{ flex: 1, overflowY: "auto", padding: view === "icons" ? "12px" : "0" }}>
            {loading ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>⏳</div>
                Loading...
              </div>
            ) : error ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#e74c3c" }}>
                <div style={{ fontSize: "24px", marginBottom: "8px" }}>⚠️</div>
                {error}
              </div>
            ) : files.length === 0 ? (
              <div style={{ padding: "40px", textAlign: "center", color: "#999" }}>
                This folder is empty
              </div>
            ) : view === "details" ? (
              <>
                {files.map((item, i) => (
                  <div key={i}
                    onClick={() => setSelected(item.name)}
                    onDoubleClick={() => item.type === "folder" && openFolder(item)}
                    style={{
                      display: "grid",
                      gridTemplateColumns: "1fr 120px 160px 80px",
                      padding: "5px 12px",
                      alignItems: "center",
                      background: selected === item.name ? "#cce4ff" : i % 2 === 0 ? "white" : "#fafafa",
                      borderBottom: "1px solid #f0f0f0",
                      cursor: item.type === "folder" ? "pointer" : "default",
                      transition: "background 0.1s",
                    }}
                    onMouseEnter={e => { if (selected !== item.name) e.currentTarget.style.background = "#e8f4ff"; }}
                    onMouseLeave={e => { if (selected !== item.name) e.currentTarget.style.background = i % 2 === 0 ? "white" : "#fafafa"; }}
                  >
                    <div style={{ display: "flex", alignItems: "center", gap: "8px", overflow: "hidden" }}>
                      {item.type === "folder" ? <FolderIcon /> : <FileIcon ext={getExt(item.name)} />}
                      <span style={{ overflow: "hidden", textOverflow: "ellipsis", whiteSpace: "nowrap" }}>
                        {item.name}
                      </span>
                    </div>
                    <span style={{ color: "#666" }}>{item.type === "folder" ? "File folder" : getExt(item.name).toUpperCase() + " File"}</span>
                    <span style={{ color: "#666" }}>{formatDate(item.lastmodified)}</span>
                    <span style={{ color: "#666", textAlign: "right" }}>{item.type === "file" ? formatSize(item.size) : ""}</span>
                  </div>
                ))}
              </>
            ) : (
              /* Icons View */
              <div style={{ display: "flex", flexWrap: "wrap", gap: "8px" }}>
                {files.map((item, i) => (
                  <div key={i}
                    onClick={() => setSelected(item.name)}
                    onDoubleClick={() => item.type === "folder" && openFolder(item)}
                    style={{
                      width: "90px",
                      padding: "10px 6px 8px",
                      display: "flex", flexDirection: "column", alignItems: "center", gap: "6px",
                      borderRadius: "4px",
                      background: selected === item.name ? "#cce4ff" : "transparent",
                      border: selected === item.name ? "1px solid #7ab4f5" : "1px solid transparent",
                      cursor: item.type === "folder" ? "pointer" : "default",
                      textAlign: "center",
                    }}
                    onMouseEnter={e => { if (selected !== item.name) e.currentTarget.style.background = "#e8f4ff"; }}
                    onMouseLeave={e => { if (selected !== item.name) e.currentTarget.style.background = "transparent"; }}
                  >
                    <div style={{ transform: "scale(1.8)", marginBottom: "4px" }}>
                      {item.type === "folder" ? <FolderIcon /> : <FileIcon ext={getExt(item.name)} />}
                    </div>
                    <span style={{
                      fontSize: "11px", lineHeight: "1.3",
                      overflow: "hidden", display: "-webkit-box",
                      WebkitLineClamp: 2, WebkitBoxOrient: "vertical" as any,
                      wordBreak: "break-all",
                    }}>
                      {item.name}
                    </span>
                  </div>
                ))}
              </div>
            )}

            {/* Load More */}
            {nextToken && (
              <div style={{ padding: "12px", textAlign: "center" }}>
                <button onClick={() => load(currentPrefix, nextToken, true)} disabled={loadingMore}
                  style={{
                    background: "linear-gradient(180deg, #fff 0%, #e8e8e8 100%)",
                    border: "1px solid #b0b0b0", borderRadius: "3px",
                    padding: "5px 20px", cursor: "pointer", fontSize: "12px",
                  }}>
                  {loadingMore ? "Loading..." : "Load More"}
                </button>
              </div>
            )}
          </div>

          {/* Status Bar */}
          <div style={{
            borderTop: "1px solid #d0d0d0",
            padding: "3px 12px",
            background: "linear-gradient(180deg, #f0f0f0 0%, #e8e8e8 100%)",
            display: "flex", justifyContent: "space-between",
            color: "#555", fontSize: "11px",
          }}>
            <span>{files.length} items ({folders.length} folders, {fileItems.length} files)</span>
            {selected && <span>Selected: {selected}</span>}
          </div>
        </div>
      </div>
    </div>
  );
}