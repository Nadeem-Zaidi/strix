import { useCallback, useEffect, useRef } from "react";
import { getExt, type FileItem, type S3FILE } from "../../types";
import { useAppDispatch, useAppSelector } from "../../state_mngmt/store";
import {
  fetchDirectory,
  selectItem,
  navigateTo,
  openFolder,
} from "../../state_mngmt/slices/file_explorer_slice";
import { createSelector } from "@reduxjs/toolkit";
import type { RootState } from "../../state_mngmt/store";
import { faEllipsisVertical, faPlus, faUpload, faVectorPolygon } from "@fortawesome/free-solid-svg-icons";
import { Icon } from "../../components/ui/icon";
import { MenuIcon } from "../../components/ui/file_explorer_icons/menu_icon";
import { FolderIcon } from "../../components/ui/file_explorer_icons/folder_icon";
import { FileIcon } from "../../components/ui/file_explorer_icons/file_icon";
import { FileTypeBadge } from "../../components/ui/file_explorer_icons/file_badge";
import {
  setActionPosition,
  setSearch,
  setSearchExpanded,
  setSidebarOpen,
  setViewType,
  toggleSidebar,
  setSf,
  uploadFiles,
  generateRag,
  deleteFiles,
} from "../../state_mngmt/slices/file_explorer_ui_slice";
import { RagLoader } from "../../components/ui/loaders/rag_loader";


const selectFiles = (s: RootState) => s.fileExplorer.files ?? [];
const selectBreadcrumb = (s: RootState) => s.fileExplorer.breadCrumb ?? [];
const selectSelected = (s: RootState) => s.fileExplorer.selected ?? null;

const selectCurrentPrefix = createSelector(
  selectBreadcrumb,
  (crumbs) => crumbs[crumbs.length - 1]?.prefix ?? ""  // empty string, not " "
);

const selectSelectedItem = createSelector(
  [selectFiles, selectSelected],
  (files, name) => {
    if (!files || !name) return undefined;
    return files.find((f) => f.name === name);
  }
);


const formatSize = (bytes?: number) => {
  if (!bytes) return "—";
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 ** 2) return `${(bytes / 1024).toFixed(1)} KB`;
  return `${(bytes / 1024 ** 2).toFixed(1)} MB`;
};

const formatDate = (iso: string | Date) => {
  if (!iso) return "—";
  const d = typeof iso === "string" ? new Date(iso) : iso;
  const now = new Date();
  const days = Math.floor((now.getTime() - d.getTime()) / 86400000);
  if (days === 0)
    return "Today, " + d.toLocaleTimeString("en-US", { hour: "2-digit", minute: "2-digit" });
  if (days === 1) return "Yesterday";
  if (days < 7) return d.toLocaleDateString("en-US", { weekday: "long" });
  return d.toLocaleDateString("en-US", {
    month: "short",
    day: "numeric",
    year: days > 365 ? "numeric" : undefined,
  });
};


export default function FileExplorer() {
  const dispatch = useAppDispatch();
  const files = useAppSelector(selectFiles);
  const loading = useAppSelector((s) => s.fileExplorer.loading);
  const loadingMore = useAppSelector((s) => s.fileExplorer.loadingMore);
  const error = useAppSelector((s) => s.fileExplorer.error);
  const selected = useAppSelector((s) => s.fileExplorer.selected);
  const breadcrumb = useAppSelector(selectBreadcrumb);
  const nextToken = useAppSelector((s) => s.fileExplorer.nextToken);
  const currentPrefix = useAppSelector(selectCurrentPrefix);
  const selectedItem = useAppSelector(selectSelectedItem);


  const fileViewType = useAppSelector((s) => s.fileExplorerUi.viewtype);
  const search = useAppSelector((s) => s.fileExplorerUi.search);
  const sidebarOpen = useAppSelector((s) => s.fileExplorerUi.sideBarOpen);
  const searchExpanded = useAppSelector((s) => s.fileExplorerUi.searchExpanded);
  const actionPos = useAppSelector((s) => s.fileExplorerUi.actionPosition);
  const sf = useAppSelector((s) => s.fileExplorerUi.sf);
  const ragLoading=useAppSelector((s)=>s.fileExplorerUi.ragLoading);

  const searchInputRef = useRef<HTMLInputElement>(null);
  const inputRef = useRef<HTMLInputElement>(null);
  const currentPrefixRef = useRef(currentPrefix);
  const sfRef = useRef(sf);


  useEffect(() => { currentPrefixRef.current = currentPrefix; }, [currentPrefix]);
  useEffect(() => { sfRef.current = sf; }, [sf]);


  const filtered = files.filter((f) => f.name.toLowerCase().includes(search.toLowerCase()));
  const folders = filtered.filter((f) => f.type === "folder");
  const fileItems = filtered.filter((f) => f.type === "file");

  const uf = useCallback((incoming: FileList | null) => {
    if (!incoming) return;
    const newFiles: FileItem[] = Array.from(incoming).map((f) => ({
      id: `${f.name}-${f.size}-${Date.now()}-${Math.random()}`,
      file: f,
      status: "idle" as const,
      progress: 0,
    }));
    dispatch(setSf([...sf, ...newFiles]));
    dispatch(uploadFiles({ files: newFiles, prefix: currentPrefix }));
  }, [dispatch, currentPrefix]);

  useEffect(() => {
    dispatch(fetchDirectory({ prefix: currentPrefix }));
  }, [dispatch, currentPrefix,sf]);

  useEffect(() => {
    const onResize = () => {
      if (window.innerWidth > 640) dispatch(setSidebarOpen(false));
    };
    window.addEventListener("resize", onResize);
    return () => window.removeEventListener("resize", onResize);
  }, [dispatch]);

  useEffect(() => {
    if (!actionPos) return;
    const handler = () => dispatch(setActionPosition(null));
    document.addEventListener("mousedown", handler);
    return () => document.removeEventListener("mousedown", handler);
  }, [actionPos, dispatch]);

  /* ── Handlers ── */
  const handleOpenFolder = (item: S3FILE) => {
    dispatch(openFolder(item));
    dispatch(setSearch(""));
    dispatch(setSidebarOpen(false));
  };

  const handleNavigateTo = (index: number) => {
    dispatch(navigateTo(index));
    dispatch(setSearch(""));
    dispatch(setSidebarOpen(false));
  };

  const handleSelectItem = (name: string) => {
    dispatch(selectItem(name));
  };

  const handleLoadMore = () => {
    dispatch(fetchDirectory({ prefix: currentPrefix, token: nextToken, append: true }));
  };

  const handleSearchIconClick = () => {
    if (!searchExpanded) {
      dispatch(setSearchExpanded(true));
      setTimeout(() => searchInputRef.current?.focus(), 50);
    }
  };

  const handleSearchBlur = () => {
    if (!search) dispatch(setSearchExpanded(false));
  };

  const handleActionsClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    dispatch(setActionPosition(actionPos ? null : { x: e.clientX, y: e.clientY }));
  };


  const handlePreviewFile = (item: S3FILE) => {
    if (!item.url) return;
    const ext = getExt(item.name);
    if (ext === "md") {
      fetch(item.url)
        .then((r) => r.text())
        .then((text) => {
          const html = `
                    <!DOCTYPE html>
                    <html>
                      <head>
                        <meta charset="utf-8"/>
                        <title>${item.name}</title>
                        <script src="https://cdn.jsdelivr.net/npm/marked/marked.min.js"><\/script>
                        <style>
                          body { font-family: -apple-system, sans-serif; max-width: 800px; margin: 40px auto; padding: 0 20px; color: #1f2937; line-height: 1.6; }
                          pre  { background: #f3f4f6; padding: 16px; border-radius: 8px; overflow-x: auto; }
                          code { background: #f3f4f6; padding: 2px 6px; border-radius: 4px; font-size: 0.9em; }
                          img  { max-width: 100%; }
                        </style>
                      </head>
                      <body>
                        <div id="content"></div>
                        <script>
                          document.getElementById('content').innerHTML = marked.parse(${JSON.stringify(text)});
                        <\/script>
                      </body>
                    </html>`;
          const blob = new Blob([html], { type: "text/html" });
          window.open(URL.createObjectURL(blob), "_blank");
        });
      return;
    }
    window.open(item.url, "_blank");
  };

  return (
    <div className="file-explorer">
      {ragLoading && <RagLoader size={34} text="Generating Vectors"/>}
      <div className="top-bar">

        {/* Sidebar toggle */}
        <button
          className="sidebar-toggle"
          onClick={() => dispatch(toggleSidebar())}
          aria-label="Toggle sidebar"
        >
          <MenuIcon open={sidebarOpen} />
        </button>

        {/* Back button */}
        <div className="nav-buttons">
          <button
            className={`nav-btn ${breadcrumb.length > 1 ? "nav-btn--active" : "nav-btn--disabled"}`}
            onClick={breadcrumb.length > 1 ? () => handleNavigateTo(breadcrumb.length - 2) : undefined}
          >
            <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
              <path d="M9 11L5 7L9 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
            </svg>
          </button>
        </div>

        {/* Breadcrumb */}
        <div className="breadcrumb">
          {breadcrumb.map((crumb, i) => {
            const isHidden = breadcrumb.length > 2 && i < breadcrumb.length - 2;
            return (
              <span
                key={i}
                className={`breadcrumb__item${isHidden ? " breadcrumb__item--hidden" : ""}`}
              >
                {i > 0 && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M4.5 9L7.5 6L4.5 3" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" />
                  </svg>
                )}
                {i === 0 && (
                  <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                    <path d="M3 11L9 1" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
                  </svg>
                )}
                <span
                  className={`breadcrumb__label ${i === breadcrumb.length - 1
                    ? "breadcrumb__label--active"
                    : "breadcrumb__label--inactive"
                    }`}
                  onClick={() => handleNavigateTo(i)}
                >
                  {crumb.name}
                </span>
              </span>
            );
          })}
        </div>

        {/* Actions menu */}
        <div className="toolbar_actions">
          <Icon icon={faEllipsisVertical} onClick={handleActionsClick} />
        </div>

        {actionPos && (
          <div
            className="action_options"
            style={{ top: actionPos.y, left: actionPos.x }}
            onMouseDown={(e) => e.stopPropagation()}
          >
            <div className="actions_options__item" onClick={() => inputRef.current?.click()}>
              <input
                ref={inputRef}
                type="file"
                multiple
                style={{ display: "none" }}
                onChange={(e) => {
                  if (!e.target.files) return;
                  uf(e.target.files);
                  e.target.value = "";
                }}
              />
              <Icon icon={faUpload} />
              <span className="actions_options__item__title">Upload Files</span>
            </div>
            <div className="actions_options__item">
              <Icon icon={faPlus} />
              <span className="actions_options__item__title">Create Folder</span>
            </div>
            <div className="actions_options__item" onClick={async () => {
              console.log("prefix:", JSON.stringify(currentPrefix));
              await dispatch(generateRag(currentPrefix))}}>
              <Icon icon={faVectorPolygon} />
              <span className="actions_options__item__title">Create RAG</span>
            </div>
          </div>
        )}

        {/* Search */}
        <div
          className={`search-box${searchExpanded ? " search-box--expanded" : ""}`}
          onClick={handleSearchIconClick}
        >
          <svg width="13" height="13" viewBox="0 0 13 13" fill="none" style={{ flexShrink: 0 }}>
            <circle cx="5.5" cy="5.5" r="4" stroke="#9CA3AF" strokeWidth="1.5" />
            <path d="M9 9L11.5 11.5" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round" />
          </svg>
          <input
            ref={searchInputRef}
            value={search}
            onChange={(e) => dispatch(setSearch(e.target.value))}
            onBlur={handleSearchBlur}
            placeholder="Search files..."
          />
          {search && (
            <span
              className="search-box__clear"
              onClick={(e) => {
                e.stopPropagation();
                dispatch(setSearch(""));
                dispatch(setSearchExpanded(false));
              }}
            >
              ×
            </span>
          )}
        </div>

        {/* List / Grid toggle */}
        <div className="view-toggle">
          {(["list", "grid"] as const).map((v) => (
            <button
              key={v}
              onClick={() => dispatch(setViewType(v))}
              className={`view-toggle__btn ${fileViewType === v ? "view-toggle__btn--active" : ""}`}
            >
              {v === "list" ? (
                <svg width="13" height="11" viewBox="0 0 13 11" fill="none">
                  <rect y="0.5" width="13" height="1.5" rx="0.75" fill="currentColor" />
                  <rect y="4.5" width="13" height="1.5" rx="0.75" fill="currentColor" />
                  <rect y="8.5" width="13" height="1.5" rx="0.75" fill="currentColor" />
                </svg>
              ) : (
                <svg width="12" height="12" viewBox="0 0 12 12" fill="none">
                  <rect x="0" y="0" width="5" height="5" rx="1" fill="currentColor" />
                  <rect x="7" y="0" width="5" height="5" rx="1" fill="currentColor" />
                  <rect x="0" y="7" width="5" height="5" rx="1" fill="currentColor" />
                  <rect x="7" y="7" width="5" height="5" rx="1" fill="currentColor" />
                </svg>
              )}
            </button>
          ))}
        </div>
      </div>

      {/* ════════════ BODY ════════════ */}
      <div className="body">

        {/* Mobile overlay */}
        {sidebarOpen && (
          <div
            className="sidebar-overlay"
            onClick={() => dispatch(setSidebarOpen(false))}
          />
        )}

        {/* Sidebar */}
        <div className={`sidebar${sidebarOpen ? " sidebar--open" : ""}`}>
          <div className="sidebar__section-label">Location</div>
          {breadcrumb.map((crumb, i) => (
            <div
              key={i}
              onClick={() => handleNavigateTo(i)}
              className={`sidebar__item ${i === breadcrumb.length - 1 ? "sidebar__item--active" : ""}`}
              style={{ paddingLeft: `${8 + i * 10}px` }}
            >
              <FolderIcon size={16} />
              <span className={`sidebar__item-label ${i === breadcrumb.length - 1 ? "sidebar__item-label--active" : "sidebar__item-label--inactive"}`}>
                {crumb.name}
              </span>
            </div>
          ))}
          {folders.length > 0 && (
            <>
              <div className="sidebar__section-label sidebar__section-label--sub">
                Subfolders
              </div>
              {folders.map((f, i) => (
                <div
                  key={i}
                  onClick={() => handleOpenFolder(f)}
                  className="sidebar__item"
                  style={{ paddingLeft: `${8 + breadcrumb.length * 10}px` }}
                >
                  <FolderIcon size={14} />
                  <span className="sidebar__item-label sidebar__item-label--inactive">
                    {f.name}
                  </span>
                </div>
              ))}
            </>
          )}
        </div>

        {/* Main */}
        <div className="main">

          {/* Column headers */}
          {fileViewType === "list" && !loading && filtered.length > 0 && (
            <div className="col-headers">
              <span>Name</span>
              <span className="col-type">Type</span>
              <span className="col-date">Modified</span>
              <span style={{ textAlign: "right" }}>Size</span>
              <span style={{ textAlign: "center" }}>Action</span>
            </div>
          )}

          {/* Content */}
          <div className={`content${fileViewType === "grid" ? " content--grid" : ""}`}>
            {loading ? (
              <div className="loading-state">
                <div className="spinner" />
                <span>Loading files…</span>
              </div>
            ) : error ? (
              <div className="error-state">
                <span style={{ fontSize: 28 }}>⚠️</span>
                <span>{error}</span>
              </div>
            ) : filtered.length === 0 ? (
              <div className="empty-state">
                <svg width="40" height="40" viewBox="0 0 40 40" fill="none">
                  <rect x="4" y="8" width="32" height="24" rx="3" fill="#F3F4F6" stroke="#E5E7EB" strokeWidth="1.5" />
                  <path d="M4 14H36" stroke="#E5E7EB" strokeWidth="1.5" />
                  <path d="M12 22H28M12 27H22" stroke="#D1D5DB" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                <span>{search ? "No results found" : "This folder is empty"}</span>
              </div>
            ) : fileViewType === "list" ? (

              /* LIST VIEW */
              filtered.map((item, i) => {
                const isFolder = item.type === "folder";
                const ext = getExt(item.name);
                return (
                  <div
                    key={i}
                    className={[
                      "list-tile",
                      selected === item.name ? "list-tile--selected" : "",
                      isFolder ? "list-tile--folder" : "list-tile--file",
                    ].join(" ")}
                    onClick={() => handleSelectItem(item.name)}
                    onDoubleClick={() => {
                      if (isFolder) handleOpenFolder(item);
                      else handlePreviewFile(item);
                    }}
                    onTouchEnd={(e) => {
                      if (isFolder) { e.preventDefault(); handleOpenFolder(item); }
                    }}
                  >
                    <div className="list-tile__name">
                      <div className={`list-tile__icon ${isFolder ? "list-tile__icon--folder" : "list-tile__icon--file"}`}>
                        {isFolder ? <FolderIcon size={18} /> : <FileIcon ext={ext} size={18} />}
                      </div>
                      <div className="list-tile__text">
                        <span className="list-tile__label">{item.name}</span>
                        <span className="list-tile__sub">
                          {isFolder
                            ? formatDate(item.lastModified) === "—" ? "Folder" : formatDate(item.lastModified)
                            : [formatSize(item.size), formatDate(item.lastModified)].filter((s) => s !== "—").join(" · ")
                          }
                        </span>
                      </div>
                    </div>
                    <div className="list-tile__type">
                      {isFolder
                        ? <span className="list-tile__type-folder">Folder</span>
                        : <FileTypeBadge ext={ext} />
                      }
                    </div>
                    <span className="list-tile__date">{formatDate(item.lastModified)}</span>
                    <span className="list-tile__size">{isFolder ? "—" : formatSize(item.size)}</span>
                    <div className="list-tile__action">
                      <button
                        className="list-tile__delete-btn"
                        onClick={() => dispatch(deleteFiles({
                          keys: [`${currentPrefix}${item.name}`],
                          prefix: currentPrefix
                        }))}
                      >
                        <svg width="14" height="14" viewBox="0 0 24 24" fill="currentColor">
                          <path d="M16 9v10H8V9h8m-1.5-6h-5l-1 1H5v2h14V4h-3.5l-1-1zM18 7H6v12c0 1.1.9 2 2 2h8c1.1 0 2-.9 2-2V7z" />
                        </svg>
                      </button>
                    </div>
                  </div>
                );
              })

            ) : (

              /* GRID VIEW */
              <div className="grid-layout">
                {filtered.map((item, i) => (
                  <div
                    key={i}
                    onClick={() => handleSelectItem(item.name)}
                    onDoubleClick={() => {
                      if (item.type === "folder") handleOpenFolder(item);
                      else handlePreviewFile(item);
                    }}
                    onTouchEnd={(e) => {
                      if (item.type === "folder") { e.preventDefault(); handleOpenFolder(item); }
                    }}
                    className={[
                      "grid-item",
                      selected === item.name ? "grid-item--selected" : "",
                      item.type === "folder" ? "grid-item--folder" : "grid-item--file",
                    ].join(" ")}
                  >
                    <div className="grid-item__icon">
                      {item.type === "folder"
                        ? <FolderIcon />
                        : <FileIcon ext={getExt(item.name)} />
                      }
                    </div>
                    <span className={`grid-item__label${item.type === "folder" ? " grid-item__label--folder" : ""}`}>
                      {item.name}
                    </span>
                    {item.type === "file" && <FileTypeBadge ext={getExt(item.name)} />}
                  </div>
                ))}
              </div>
            )}

            {/* Load more */}
            {nextToken && (
              <div className="load-more">
                <button
                  onClick={handleLoadMore}
                  disabled={loadingMore}
                  className="load-more__btn"
                >
                  {loadingMore ? "Loading…" : "Load more"}
                </button>
              </div>
            )}
          </div>

          {/* Status bar */}
          <div className="status-bar">
            <span>
              {folders.length > 0 && `${folders.length} folder${folders.length !== 1 ? "s" : ""}`}
              {folders.length > 0 && fileItems.length > 0 && ", "}
              {fileItems.length > 0 && `${fileItems.length} file${fileItems.length !== 1 ? "s" : ""}`}
              {filtered.length === 0 && "Empty"}
              {search && ` matching "${search}"`}
            </span>
            {selected && selectedItem && (
              <span className="status-bar__selected">
                {selectedItem.name}
                {selectedItem.type === "file" && selectedItem.size
                  ? ` · ${formatSize(selectedItem.size)}`
                  : ""}
              </span>
            )}
          </div>

        </div>
      </div>
    </div>
  );
}