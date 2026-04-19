import { useState, useMemo, type CSSProperties, type MouseEvent, useEffect, useRef } from "react";
import { useAppDispatch, useAppSelector } from "../state_mngmt/store";
import { getFiles } from "../state_mngmt/slices/filereader_slice";

// ── Types ──
type FolderItem = { type: "folder"; name: string; path: string };
type FileItem = {
  type: "file";
  name: string;
  prefix: string;
  key: string;
  size: number;
  lastModified: string;
};
type ListItem = FolderItem | FileItem;

type SortField = "name" | "size" | "modified";
type SortDir = "asc" | "desc";
type ViewMode = "list" | "grid";
type ContextMenuState = { x: number; y: number; item: ListItem } | null;

type ExtMeta = { color: string; bg: string; label: string };



// ── Helpers ──
const formatBytes = (bytes: number): string => {
  if (bytes === 0) return "0 B";
  const units = ["B", "KB", "MB", "GB"];
  const i = Math.floor(Math.log(bytes) / Math.log(1024));
  return `${(bytes / Math.pow(1024, i)).toFixed(i === 0 ? 0 : 1)} ${units[i]}`;
};

const formatDate = (iso: string): string => {
  const d = new Date(iso);
  const now = new Date();
  const diff = now.getTime() - d.getTime();
  const mins = Math.floor(diff / 60000);
  const hours = Math.floor(diff / 3600000);
  const days = Math.floor(diff / 86400000);
  if (mins < 60) return `${mins} minutes ago`;
  if (hours < 24) return `${hours} hours ago`;
  if (days < 7) return `${days} days ago`;
  return d.toLocaleDateString("en-US", { month: "short", day: "numeric", year: "numeric" });
};

const EXT_META: Record<string, ExtMeta> = {
  pdf: { color: "#D93025", bg: "#FEEAE9", label: "PDF" },
  doc: { color: "#185ABD", bg: "#E3ECFA", label: "DOC" },
  docx: { color: "#185ABD", bg: "#E3ECFA", label: "DOCX" },
  xls: { color: "#107C41", bg: "#E2F3E8", label: "XLS" },
  xlsx: { color: "#107C41", bg: "#E2F3E8", label: "XLSX" },
  ppt: { color: "#C43E1C", bg: "#FCE4DE", label: "PPT" },
  pptx: { color: "#C43E1C", bg: "#FCE4DE", label: "PPTX" },
  png: { color: "#7B5EA7", bg: "#EDE7F6", label: "PNG" },
  jpg: { color: "#7B5EA7", bg: "#EDE7F6", label: "JPG" },
  jpeg: { color: "#7B5EA7", bg: "#EDE7F6", label: "JPEG" },
  gif: { color: "#7B5EA7", bg: "#EDE7F6", label: "GIF" },
  svg: { color: "#F4B400", bg: "#FFF8E1", label: "SVG" },
  json: { color: "#0D7377", bg: "#E0F2F1", label: "JSON" },
  csv: { color: "#107C41", bg: "#E2F3E8", label: "CSV" },
  md: { color: "#424242", bg: "#F5F5F5", label: "MD" },
  txt: { color: "#616161", bg: "#F5F5F5", label: "TXT" },
  js: { color: "#F7DF1E", bg: "#FFFDE7", label: "JS" },
  ts: { color: "#3178C6", bg: "#E3ECFA", label: "TS" },
  py: { color: "#3776AB", bg: "#E3ECFA", label: "PY" },
  html: { color: "#E44D26", bg: "#FCE4DE", label: "HTML" },
  css: { color: "#264DE4", bg: "#E3ECFA", label: "CSS" },
  sh: { color: "#4EAA25", bg: "#E2F3E8", label: "SH" },
  zip: { color: "#795548", bg: "#EFEBE9", label: "ZIP" },
};

const getExt = (name: string): string => {
  const parts = name.split(".");
  return parts.length > 1 ? parts.pop()!.toLowerCase() : "";
};

const getMeta = (name: string): ExtMeta => {
  const ext = getExt(name);
  return EXT_META[ext] || { color: "#9E9E9E", bg: "#F5F5F5", label: ext.toUpperCase() || "FILE" };
};

const itemKey = (item: ListItem): string =>
  item.type === "folder" ? item.path : item.key;

// ── Icons ──

const UploadIcon = ({ size = 35 }: { size?: number }) => (
  <svg
    width={size}
    height={size}
    viewBox="0 0 44 44"
    fill="none"
    xmlns="http://www.w3.org/2000/svg"
  >
    <circle cx="22" cy="22" r="22" fill="#3B82F6" opacity="0.12" />
    <circle cx="22" cy="22" r="17" fill="#3B82F6" opacity="0.18" />
    <path
      d="M22 28V16M22 16L17 21M22 16L27 21"
      stroke="#3B82F6"
      strokeWidth="2"
      strokeLinecap="round"
      strokeLinejoin="round"
    />
    <line
      x1="15"
      y1="32"
      x2="29"
      y2="32"
      stroke="#3B82F6"
      strokeWidth="2"
      strokeLinecap="round"
    />
  </svg>
);
const FolderIcon = ({ size = 20 }: { size?: number }) => (
  <svg width={size} height={size} viewBox="0 0 24 24" fill="none">
    <path d="M2 6C2 4.89543 2.89543 4 4 4H9.17157C9.70201 4 10.2107 4.21071 10.5858 4.58579L11.4142 5.41421C11.7893 5.78929 12.298 6 12.8284 6H20C21.1046 6 22 6.89543 22 8V18C22 19.1046 21.1046 20 20 20H4C2.89543 20 2 19.1046 2 18V6Z" fill="#F5C242" stroke="#E5A600" strokeWidth="0.5" />
  </svg>
);



const ListIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="1" y="2" width="16" height="2.5" rx="0.5" fill="currentColor" opacity="0.8" />
    <rect x="1" y="7.5" width="16" height="2.5" rx="0.5" fill="currentColor" opacity="0.5" />
    <rect x="1" y="13" width="16" height="2.5" rx="0.5" fill="currentColor" opacity="0.3" />
  </svg>
);

const GridIcon = () => (
  <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
    <rect x="1" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.8" />
    <rect x="10" y="1" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
    <rect x="1" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.5" />
    <rect x="10" y="10" width="7" height="7" rx="1.5" fill="currentColor" opacity="0.3" />
  </svg>
);

const SearchIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="6.5" cy="6.5" r="5" stroke="currentColor" strokeWidth="1.5" />
    <line x1="10.5" y1="10.5" x2="14.5" y2="14.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" />
  </svg>
);

const MoreIcon = () => (
  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
    <circle cx="8" cy="3" r="1.3" fill="currentColor" />
    <circle cx="8" cy="8" r="1.3" fill="currentColor" />
    <circle cx="8" cy="13" r="1.3" fill="currentColor" />
  </svg>
);

const ChevronIcon = ({ dir = "right" }: { dir?: "right" | "down" }) => (
  <svg width="12" height="12" viewBox="0 0 12 12" fill="none" style={{ transform: dir === "down" ? "rotate(90deg)" : "none", transition: "transform 0.15s" }}>
    <path d="M4.5 2.5L8 6L4.5 9.5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
  </svg>
);

// ── Main Component ──
export default function FileExplore3r() {
  const [viewMode, setViewMode] = useState<ViewMode>("list");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [sortField, setSortField] = useState<SortField>("name");
  const [sortDir, setSortDir] = useState<SortDir>("asc");
  const [selectedKeys, setSelectedKeys] = useState<Set<string>>(new Set());
  const [contextMenu, setContextMenu] = useState<ContextMenuState>(null);
  const [currentPath] = useState<string[]>(["Documents"]);
  const fileInputRef=useRef<HTMLInputElement>(null);


  const dispatch = useAppDispatch();
  const { fileList, loading, error } = useAppSelector(state => state.files);
  useEffect(() => { dispatch(getFiles(undefined)); }, [dispatch]);


  const handleSort = (field: SortField): void => {
    if (sortField === field) setSortDir((d) => (d === "asc" ? "desc" : "asc"));
    else {
      setSortField(field);
      setSortDir("asc");
    }
  };

  const toggleSelect = (key: string): void => {
    setSelectedKeys((prev) => {
      const next = new Set(prev);
      next.has(key) ? next.delete(key) : next.add(key);
      return next;
    });
  };

  const filtered = useMemo((): ListItem[] => {
    const items = fileList.filter((f) =>
      f.name.toLowerCase().includes(searchQuery.toLowerCase())
    );
    const folders = items.filter((i): i is FolderItem => i.type === "folder");
    const files = items.filter((i): i is FileItem => i.type !== "folder");

    files.sort((a, b) => {
      const dir = sortDir === "asc" ? 1 : -1;
      if (sortField === "name") return dir * a.name.localeCompare(b.name);
      if (sortField === "size") return dir * (a.size - b.size);
      if (sortField === "modified")
        return dir * (new Date(a.lastModified).getTime() - new Date(b.lastModified).getTime());
      return 0;
    });
    folders.sort((a, b) => a.name.localeCompare(b.name));
    return [...folders, ...files];
  }, [fileList, searchQuery, sortField, sortDir]);

  const handleContextMenu = (e: MouseEvent<HTMLDivElement>, item: ListItem): void => {
    e.preventDefault();
    e.stopPropagation();
    setContextMenu({ x: e.clientX, y: e.clientY, item });
  };

  const handleFileChange=(e:React.ChangeEvent<HTMLInputElement>)=>{
    const files=e.target.files;
    console.log(files)
    if(!files) return;


  }

  return (
    <div style={styles.wrapper} onClick={() => setContextMenu(null)}>
      <style>{globalCSS}</style>

      {/* ── Breadcrumb ── */}
      <div style={styles.breadcrumb}>
        {currentPath.map((seg, i) => (
          <span key={i} style={styles.breadcrumbItem}>
            {i > 0 && <ChevronIcon />}
            <span
              style={{
                ...styles.breadcrumbText,
                fontWeight: i === currentPath.length - 1 ? 600 : 400,
                color: i === currentPath.length - 1 ? "var(--sp-text)" : "var(--sp-text-secondary)",
              }}
            >
              {seg}
            </span>
          </span>
        ))}
      </div>

      {/* ── Toolbar ── */}
      <div style={styles.toolbar}>
        <div style={styles.toolbarLeft}>
          <div style={styles.searchBox}>
            <SearchIcon />
            <input
              type="text"
              placeholder="Search in this folder"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              style={styles.searchInput}
            />
          </div>
        </div>
        <div style={styles.toolbarRight}>
          <span style={styles.itemCount}>{filtered.length} items</span>
          <div style={styles.viewToggle}>
            <button
              style={{ ...styles.viewBtn, ...(viewMode === "list" ? styles.viewBtnActive : {}) }}
              onClick={() => setViewMode("list")}
              title="List view"
            >
              <ListIcon />
            </button>
            <button
              style={{ ...styles.viewBtn, ...(viewMode === "grid" ? styles.viewBtnActive : {}) }}
              onClick={() => setViewMode("grid")}
              title="Grid view"
            >
              <GridIcon />
            </button>

          </div>
          <button style={{ ...styles.viewBtn }} onClick={()=>fileInputRef.current?.click()}>
            <div>
              <input
                type="file"
                ref={fileInputRef}
                onChange={handleFileChange}
                multiple 
                style={{ display: "none" }}
              />
              <UploadIcon />
            </div>
            
          </button>

        </div>
      </div>

      {/* ── List View ── */}
      {viewMode === "list" && (
        <div style={styles.listContainer}>
          <div style={styles.listHeader}>
            <div style={styles.listHeaderCheck}>
              <input
                type="checkbox"
                checked={selectedKeys.size === filtered.length && filtered.length > 0}
                onChange={() => {
                  if (selectedKeys.size === filtered.length) setSelectedKeys(new Set());
                  else setSelectedKeys(new Set(filtered.map(itemKey)));
                }}
                style={styles.checkbox}
              />
            </div>
            <div style={{ ...styles.listHeaderCol, flex: 3, cursor: "pointer" }} onClick={() => handleSort("name")}>
              Name{" "}
              {sortField === "name" && (
                <span style={styles.sortArrow}>{sortDir === "asc" ? "↑" : "↓"}</span>
              )}
            </div>
            <div style={{ ...styles.listHeaderCol, flex: 1, cursor: "pointer" }} onClick={() => handleSort("modified")}>
              Modified{" "}
              {sortField === "modified" && (
                <span style={styles.sortArrow}>{sortDir === "asc" ? "↑" : "↓"}</span>
              )}
            </div>
            <div style={{ ...styles.listHeaderCol, flex: 1, cursor: "pointer" }} onClick={() => handleSort("size")}>
              Size{" "}
              {sortField === "size" && (
                <span style={styles.sortArrow}>{sortDir === "asc" ? "↑" : "↓"}</span>
              )}
            </div>
            <div style={{ ...styles.listHeaderCol, width: 48 }}></div>
          </div>

          {filtered.map((item, idx) => {
            const key = itemKey(item);
            const isSelected = selectedKeys.has(key);
            const meta = item.type === "folder" ? null : getMeta(item.name);
            return (
              <div
                key={key}
                className="sp-list-row"
                style={{
                  ...styles.listRow,
                  background: isSelected
                    ? "var(--sp-selected)"
                    : idx % 2 === 0
                      ? "transparent"
                      : "var(--sp-row-alt)",
                  animationDelay: `${idx * 25}ms`,
                }}
                onClick={() => toggleSelect(key)}
                onContextMenu={(e) => handleContextMenu(e, item)}
              >
                <div style={styles.listRowCheck}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(key)}
                    style={styles.checkbox}
                  />
                </div>
                <div style={{ ...styles.listRowCol, flex: 3, display: "flex", alignItems: "center", gap: 10 }}>
                  {item.type === "folder" ? (
                    <FolderIcon size={22} />
                  ) : (
                    <div style={{ ...styles.fileTypeBadge, background: meta!.bg, color: meta!.color }}>
                      {meta!.label}
                    </div>
                  )}
                  <span style={styles.fileName}>{item.name}</span>
                </div>
                <div style={{ ...styles.listRowCol, flex: 1, color: "var(--sp-text-secondary)", fontSize: 13 }}>
                  {item.type === "file" ? formatDate(item.lastModified) : "—"}
                </div>
                <div style={{ ...styles.listRowCol, flex: 1, color: "var(--sp-text-secondary)", fontSize: 13 }}>
                  {item.type === "file" ? formatBytes(item.size) : "—"}
                </div>
                <div style={{ ...styles.listRowCol, width: 48, display: "flex", justifyContent: "center" }}>
                  <button
                    className="sp-more-btn"
                    style={styles.moreBtn}
                    onClick={(e) => {
                      e.stopPropagation();
                      handleContextMenu(e as unknown as MouseEvent<HTMLDivElement>, item);
                    }}
                  >
                    <MoreIcon />
                  </button>
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Grid View ── */}
      {viewMode === "grid" && (
        <div style={styles.gridContainer}>
          {filtered.map((item, idx) => {
            const key = itemKey(item);
            const isSelected = selectedKeys.has(key);
            const meta = item.type === "folder" ? null : getMeta(item.name);
            return (
              <div
                key={key}
                className="sp-grid-card"
                style={{
                  ...styles.gridCard,
                  borderColor: isSelected ? "var(--sp-accent)" : "var(--sp-border)",
                  boxShadow: isSelected
                    ? "0 0 0 2px var(--sp-accent-light)"
                    : "0 1px 3px rgba(0,0,0,0.04)",
                  animationDelay: `${idx * 40}ms`,
                }}
                onClick={() => toggleSelect(key)}
                onContextMenu={(e) => handleContextMenu(e, item)}
              >
                <div style={styles.gridCardPreview}>
                  {item.type === "folder" ? (
                    <FolderIcon size={48} />
                  ) : (
                    <div style={{ ...styles.gridTypeBadge, background: meta!.bg, color: meta!.color }}>
                      {meta!.label}
                    </div>
                  )}
                </div>
                <div style={styles.gridCardInfo}>
                  <div style={styles.gridCardName} title={item.name}>
                    {item.name}
                  </div>
                  <div style={styles.gridCardMeta}>
                    {item.type === "file" ? formatDate(item.lastModified) : "Folder"}
                    {item.type === "file" && ` · ${formatBytes(item.size)}`}
                  </div>
                </div>
                <div style={styles.gridCheckbox}>
                  <input
                    type="checkbox"
                    checked={isSelected}
                    onChange={() => toggleSelect(key)}
                    style={styles.checkbox}
                  />
                </div>
              </div>
            );
          })}
        </div>
      )}

      {/* ── Context Menu ── */}
      {contextMenu && (
        <div
          style={{ ...styles.contextMenu, top: contextMenu.y, left: contextMenu.x }}
          onClick={(e) => e.stopPropagation()}
        >
          {(["Open", "Preview", "Download", "Rename", "Share", "Delete"] as const).map((action) => (
            <div
              key={action}
              className="sp-ctx-item"
              style={{
                ...styles.contextItem,
                color: action === "Delete" ? "#D93025" : "var(--sp-text)",
              }}
              onClick={() => setContextMenu(null)}
            >
              {action}
            </div>
          ))}
        </div>
      )}

      {loading && (
        <div style={styles.loadingOverlay}>
          <div style={styles.spinner} />
        </div>
      )}
    </div>
  );
}

// ── Styles ──
const styles: Record<string, CSSProperties> = {
  wrapper: {
    fontFamily: "'Segoe UI', -apple-system, BlinkMacSystemFont, sans-serif",
    maxWidth: 960,
    margin: "0 auto",
    padding: "24px 20px",
    color: "var(--sp-text)",
    minHeight: "100vh",
    position: "relative",
  },
  breadcrumb: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    marginBottom: 16,
    fontSize: 14,
  },
  breadcrumbItem: {
    display: "flex",
    alignItems: "center",
    gap: 4,
    color: "var(--sp-text-secondary)",
  },
  breadcrumbText: {
    cursor: "pointer",
    padding: "2px 4px",
    borderRadius: 4,
  },
  toolbar: {
    display: "flex",
    alignItems: "center",
    justifyContent: "space-between",
    marginBottom: 12,
    gap: 12,
    flexWrap: "wrap",
  },
  toolbarLeft: { display: "flex", alignItems: "center", gap: 8, flex: 1 },
  toolbarRight: { display: "flex", alignItems: "center", gap: 12 },
  searchBox: {
    display: "flex",
    alignItems: "center",
    gap: 8,
    background: "var(--sp-search-bg)",
    borderRadius: 8,
    padding: "7px 14px",
    border: "1px solid var(--sp-border)",
    color: "var(--sp-text-secondary)",
    maxWidth: 320,
    flex: 1,
    transition: "border-color 0.15s, box-shadow 0.15s",
  },
  searchInput: {
    border: "none",
    outline: "none",
    background: "transparent",
    fontSize: 14,
    color: "var(--sp-text)",
    width: "100%",
    fontFamily: "inherit",
  },
  itemCount: {
    fontSize: 13,
    color: "var(--sp-text-secondary)",
    whiteSpace: "nowrap",
  },
  viewToggle: {
    display: "flex",
    background: "var(--sp-search-bg)",
    borderRadius: 8,
    border: "1px solid var(--sp-border)",
    overflow: "hidden",
  },
  viewBtn: {
    border: "none",
    background: "transparent",
    padding: "6px 10px",
    cursor: "pointer",
    color: "var(--sp-text-secondary)",
    display: "flex",
    alignItems: "center",
    transition: "all 0.15s",
  },
  viewBtnActive: {
    background: "var(--sp-accent)",
    color: "#fff",
  },
  listContainer: {
    borderRadius: 10,
    border: "1px solid var(--sp-border)",
    overflow: "hidden",
    background: "var(--sp-surface)",
  },
  listHeader: {
    display: "flex",
    alignItems: "center",
    padding: "10px 16px",
    borderBottom: "1px solid var(--sp-border)",
    background: "var(--sp-header-bg)",
    fontSize: 12,
    fontWeight: 600,
    color: "var(--sp-text-secondary)",
    textTransform: "uppercase",
    letterSpacing: "0.5px",
    userSelect: "none",
  },
  listHeaderCheck: { width: 32, flexShrink: 0 },
  listHeaderCol: { padding: "0 8px" },
  sortArrow: { marginLeft: 4, fontSize: 11, opacity: 0.7 },
  listRow: {
    display: "flex",
    alignItems: "center",
    padding: "10px 16px",
    borderBottom: "1px solid var(--sp-border-light)",
    cursor: "pointer",
    transition: "background 0.12s",
    animation: "fadeSlideIn 0.25s ease both",
  },
  listRowCheck: { width: 32, flexShrink: 0 },
  listRowCol: {
    padding: "0 8px",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
  },
  fileName: { fontSize: 14, fontWeight: 500, color: "var(--sp-text)" },
  fileTypeBadge: {
    fontSize: 10,
    fontWeight: 700,
    padding: "3px 7px",
    borderRadius: 5,
    letterSpacing: "0.3px",
    flexShrink: 0,
    minWidth: 36,
    textAlign: "center",
  },
  moreBtn: {
    border: "none",
    background: "transparent",
    cursor: "pointer",
    color: "var(--sp-text-secondary)",
    borderRadius: 6,
    padding: "4px 6px",
    display: "flex",
    alignItems: "center",
    transition: "background 0.12s",
  },
  checkbox: {
    width: 16,
    height: 16,
    accentColor: "var(--sp-accent)",
    cursor: "pointer",
  },
  gridContainer: {
    display: "grid",
    gridTemplateColumns: "repeat(auto-fill, minmax(180px, 1fr))",
    gap: 14,
    padding: "4px 0",
  },
  gridCard: {
    borderRadius: 12,
    border: "1.5px solid var(--sp-border)",
    background: "var(--sp-surface)",
    overflow: "hidden",
    cursor: "pointer",
    transition: "border-color 0.15s, box-shadow 0.15s, transform 0.12s",
    position: "relative",
    animation: "fadeScaleIn 0.3s ease both",
  },
  gridCardPreview: {
    height: 110,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "var(--sp-grid-preview-bg)",
    borderBottom: "1px solid var(--sp-border-light)",
  },
  gridTypeBadge: {
    fontSize: 16,
    fontWeight: 800,
    padding: "8px 16px",
    borderRadius: 10,
    letterSpacing: "0.5px",
  },
  gridCardInfo: {
    padding: "10px 12px",
  },
  gridCardName: {
    fontSize: 13,
    fontWeight: 600,
    color: "var(--sp-text)",
    overflow: "hidden",
    textOverflow: "ellipsis",
    whiteSpace: "nowrap",
    marginBottom: 3,
  },
  gridCardMeta: {
    fontSize: 11,
    color: "var(--sp-text-secondary)",
  },
  gridCheckbox: {
    position: "absolute",
    top: 8,
    left: 8,
  },
  contextMenu: {
    position: "fixed",
    background: "var(--sp-surface)",
    border: "1px solid var(--sp-border)",
    borderRadius: 10,
    boxShadow: "0 8px 30px rgba(0,0,0,0.12)",
    padding: "6px 0",
    minWidth: 160,
    zIndex: 1000,
    animation: "fadeScaleIn 0.12s ease",
  },
  contextItem: {
    padding: "8px 16px",
    fontSize: 13,
    cursor: "pointer",
    transition: "background 0.1s",
  },
  loadingOverlay: {
    position: "absolute",
    inset: 0,
    display: "flex",
    alignItems: "center",
    justifyContent: "center",
    background: "rgba(255,255,255,0.7)",
    borderRadius: 10,
    zIndex: 10,
  },
  spinner: {
    width: 32,
    height: 32,
    border: "3px solid var(--sp-border)",
    borderTopColor: "var(--sp-accent)",
    borderRadius: "50%",
    animation: "spin 0.7s linear infinite",
  },
};

const globalCSS = `
  :root {
    --sp-text: #1a1a2e;
    --sp-text-secondary: #6b7280;
    --sp-accent: #0078d4;
    --sp-accent-light: rgba(0,120,212,0.15);
    --sp-surface: #ffffff;
    --sp-bg: #f8f9fb;
    --sp-border: #e2e5ea;
    --sp-border-light: #f0f1f3;
    --sp-search-bg: #f4f5f7;
    --sp-header-bg: #fafbfc;
    --sp-row-alt: #fafbfd;
    --sp-selected: #eaf3fd;
    --sp-grid-preview-bg: #f7f8fa;
  }

  @media (prefers-color-scheme: dark) {
    :root {
      --sp-text: #e4e6eb;
      --sp-text-secondary: #8b8fa3;
      --sp-accent: #4ca6f0;
      --sp-accent-light: rgba(76,166,240,0.15);
      --sp-surface: #1e1f2b;
      --sp-bg: #14151f;
      --sp-border: #2d2f3e;
      --sp-border-light: #252636;
      --sp-search-bg: #252636;
      --sp-header-bg: #1a1b28;
      --sp-row-alt: #1a1b28;
      --sp-selected: #1a2f4a;
      --sp-grid-preview-bg: #1a1b28;
    }
  }

  body {
    background: var(--sp-bg);
    margin: 0;
  }

  .sp-list-row:hover {
    background: var(--sp-selected) !important;
  }

  .sp-grid-card:hover {
    transform: translateY(-2px);
    box-shadow: 0 6px 20px rgba(0,0,0,0.08) !important;
    border-color: var(--sp-accent) !important;
  }

  .sp-more-btn:hover {
    background: var(--sp-search-bg);
  }

  .sp-ctx-item:hover {
    background: var(--sp-search-bg);
  }

  @keyframes fadeSlideIn {
    from { opacity: 0; transform: translateY(6px); }
    to { opacity: 1; transform: translateY(0); }
  }
  @keyframes fadeScaleIn {
    from { opacity: 0; transform: scale(0.97); }
    to { opacity: 1; transform: scale(1); }
  }

  @keyframes spin {
    to { transform: rotate(360deg); }
  }

  input[type="checkbox"] {
    margin: 0;
  }

  ::selection {
    background: var(--sp-accent-light);
  }
`;
