import { useMemo, useState } from 'react';
import { usePOIStore } from '../../store/poiStore';
import { filterAndSortPOIs } from '../../utils/filtering';
import type { SortOption } from '../../types';
import type { Theme } from '../../hooks/useTheme';
import { useAuth } from '../../hooks/useAuth';
import FilterBar from './FilterBar';
import POIListItem from './POIListItem';
import SearchBar from '../UI/SearchBar';
import ShareButton from '../UI/ShareButton';
import GroupPanel from './GroupPanel';
import AuthButton from '../UI/AuthButton';
import MyMapsDrawer from './MyMapsDrawer';

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
  const auth = useAuth();
  const [myMapsOpen, setMyMapsOpen] = useState(false);

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
          <svg className="title-pencil" aria-hidden="true" viewBox="0 0 24 24" xmlns="http://www.w3.org/2000/svg">
            <rect x="9" y="1" width="6" height="3.5" rx="1" fill="#f48fb1"/>
            <rect x="9" y="4" width="6" height="1.5" fill="#aaa"/>
            <rect x="9" y="5.5" width="6" height="12" fill="#FDD835"/>
            <path d="M9 17.5 L12 23 L15 17.5 Z" fill="#e6a800"/>
            <path d="M10.8 20.5 L12 23 L13.2 20.5 Z" fill="#555"/>
          </svg>
          <span className="title-text">FieldNotes</span>
        </div>
        <div className="panel-actions">
          {!isReadOnly && (
            <button className="btn-action btn-add" onClick={onAddPOI}>
              + ADD
            </button>
          )}
          <ShareButton userId={auth.user?.id} />
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
          <AuthButton auth={auth} onOpenMyMaps={() => setMyMapsOpen(true)} />
        </div>
      </header>

      {auth.user && (
        <MyMapsDrawer
          user={auth.user}
          open={myMapsOpen}
          onClose={() => setMyMapsOpen(false)}
        />
      )}

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
