
interface SearchProps{
    className?:string;
    placeHolder?:string
}

export const SearchBar = ({className,placeHolder="Type your search"}:SearchProps) => {
    return <>
        <div className={`file_explorer_searchbar ${className??""}`}>
            <div className="input_wrap">
                <svg className="search-icon" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                    <circle cx="11" cy="11" r="8" />
                    <line x1="21" y1="21" x2="16.65" y2="16.65" />
                </svg>
                <input
                    className="search-input"
                    type="text"
                    placeholder="Type to search…"
                    id="searchInput"
                />
                <button className="search-btn" aria-label="Search">
                    <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round">
                        <line x1="5" y1="12" x2="19" y2="12" />
                        <polyline points="12 5 19 12 12 19" />
                    </svg>
                </button>
            </div>

        </div>
    </>
}