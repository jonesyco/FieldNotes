import { useMemo } from 'react';
import { usePOIStore } from '../../store/poiStore';
import { filterAndSortPOIs } from '../../utils/filtering';
import type { SortOption } from '../../types';
import type { Theme } from '../../hooks/useTheme';
import FilterBar from './FilterBar';
import POIListItem from './POIListItem';
import SearchBar from '../UI/SearchBar';
import ShareButton from '../UI/ShareButton';
import GroupPanel from './GroupPanel';

interface SidePanelProps {
  onAddPOI: () => void;
  onExport: () => void;
  onImport: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export default function SidePanel({ onAddPOI, onExport, onImport, theme, onToggleTheme }: SidePanelProps) {
  const { pois, filter, mapBounds, selectedPOI, selectPOI, hoverPOI, setFilter, isReadOnly, setIsReadOnly, setCollectionId } =
    usePOIStore();

  const filtered = useMemo(
    () => filterAndSortPOIs(pois, filter, mapBounds),
    [pois, filter, mapBounds]
  );

  const handleOpenInEditor = () => {
    setIsReadOnly(false);
    setCollectionId(null);
    window.history.replaceState({}, '', window.location.pathname);
  };

  return (
    <aside className="side-panel" aria-label="Points of interest panel">
      <header className="panel-header">
        <div className="site-title">
          <span className="title-hex" aria-hidden="true">⬡</span>
          <span className="title-text">FIELDNOTES</span>
        </div>
        <p className="panel-subtitle">POINTS OF INTEREST</p>
        <div className="panel-actions">
          {!isReadOnly && (
            <button className="btn-action btn-add" onClick={onAddPOI}>
              + ADD
            </button>
          )}
          <ShareButton />
          <button className="btn-action btn-secondary" onClick={onExport}>
            ↓
          </button>
          <button className="btn-action btn-secondary" onClick={onImport}>
            ↑
          </button>
          <button
            className="btn-action btn-secondary btn-theme"
            onClick={onToggleTheme}
            aria-label={theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode'}
            title={theme === 'dark' ? 'Light mode' : 'Dark mode'}
          >
            {theme === 'dark' ? '☀' : '☾'}
          </button>
        </div>
      </header>

      {isReadOnly && (
        <div className="readonly-banner" role="status">
          <span>VIEWING SHARED MAP</span>
          <button className="readonly-edit-btn" onClick={handleOpenInEditor}>
            OPEN IN EDITOR
          </button>
        </div>
      )}

      <div className="panel-search">
        <SearchBar />
      </div>

      <FilterBar />

      <GroupPanel />

      <div className="panel-list-header">
        <span className="list-count">{filtered.length} LOCATIONS</span>
        <select
          className="sort-select"
          value={filter.sort}
          onChange={(e) => setFilter({ sort: e.target.value as SortOption })}
          aria-label="Sort order"
        >
          <option value="newest">NEWEST</option>
          <option value="alphabetical">A–Z</option>
          <option value="category">CATEGORY</option>
          <option value="neighborhood">AREA</option>
        </select>
      </div>

      <div className="panel-list" role="list" aria-label="POI list">
        {filtered.length === 0 ? (
          <div className="list-empty">NO RESULTS</div>
        ) : (
          filtered.map((poi) => (
            <POIListItem
              key={poi.id}
              poi={poi}
              isSelected={selectedPOI?.id === poi.id}
              onSelect={() => selectPOI(poi)}
              onHover={hoverPOI}
            />
          ))
        )}
      </div>
    </aside>
  );
}
