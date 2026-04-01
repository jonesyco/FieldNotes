import { usePOIStore } from '../../store/poiStore';

export default function SearchBar() {
  const { filter, setFilter } = usePOIStore();
  return (
    <div className="search-bar">
      <span className="search-icon">⌕</span>
      <input
        type="text"
        className="search-input"
        placeholder="SEARCH TITLE, TAG, NEIGHBORHOOD..."
        value={filter.search}
        onChange={(e) => setFilter({ search: e.target.value })}
        aria-label="Search points of interest"
      />
      {filter.search && (
        <button
          className="search-clear"
          onClick={() => setFilter({ search: '' })}
          aria-label="Clear search"
        >
          ✕
        </button>
      )}
    </div>
  );
}
