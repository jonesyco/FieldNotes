import { useCallback, useMemo, useState } from 'react';
import type { DragEvent } from 'react';
import { usePOIStore } from '../../store/poiStore';
import { filterAndSortPOIs } from '../../utils/filtering';
import type { SortOption } from '../../types';
import type { Theme } from '../../hooks/useTheme';
import type { AuthState } from '../../hooks/useAuth';
import FilterBar from './FilterBar';
import POIListItem from './POIListItem';
import SearchBar from '../UI/SearchBar';
import ShareButton from '../UI/ShareButton';
import GroupPanel from './GroupPanel';
import AuthButton from '../UI/AuthButton';
import MyMapsDrawer from './MyMapsDrawer';
import SettingsModal from '../UI/SettingsModal';

interface SidePanelProps {
  auth: AuthState;
  onAddPOI: () => void;
  onExport: () => void;
  onImport: () => void;
  theme: Theme;
  onToggleTheme: () => void;
}

export default function SidePanel({ auth, onAddPOI, onExport, onImport, theme, onToggleTheme }: SidePanelProps) {
  const {
    pois,
    filter,
    mapBounds,
    selectedPOI,
    selectPOI,
    hoverPOI,
    setFilter,
    collectionId,
    isReadOnly,
    syncError,
    sequenceEnabled,
    reorderPOIs,
    routeLoading,
    routeError,
    upsideDownMode,
  } =
    usePOIStore();
  const [myMapsOpen, setMyMapsOpen] = useState(false);
  const [settingsOpen, setSettingsOpen] = useState(false);
  const [draggedId, setDraggedId] = useState<string | null>(null);
  const [dropTarget, setDropTarget] = useState<{ id: string; placement: 'before' | 'after' } | null>(null);

  const filtered = useMemo(
    () => filterAndSortPOIs(pois, filter, mapBounds),
    [pois, filter, mapBounds]
  );
  const visiblePois = sequenceEnabled ? pois : filtered;
  const includedSequenceIds = useMemo(
    () => new Map(
      pois
        .filter((poi) => poi.includeInSequence)
        .map((poi, index) => [poi.id, index + 1])
    ),
    [pois]
  );

  const handleDragStart = useCallback((poiId: string, event: DragEvent<HTMLDivElement>) => {
    if (!sequenceEnabled || isReadOnly) return;
    setDraggedId(poiId);
    event.dataTransfer.effectAllowed = 'move';
    event.dataTransfer.setData('text/plain', poiId);
  }, [sequenceEnabled, isReadOnly]);

  const handleDragOver = useCallback((targetId: string, event: DragEvent<HTMLDivElement>) => {
    if (!sequenceEnabled || isReadOnly || !draggedId || draggedId === targetId) return;

    event.preventDefault();
    const rect = event.currentTarget.getBoundingClientRect();
    const placement = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    setDropTarget({ id: targetId, placement });
    event.dataTransfer.dropEffect = 'move';
  }, [sequenceEnabled, isReadOnly, draggedId]);

  const handleDrop = useCallback((targetId: string, event: DragEvent<HTMLDivElement>) => {
    if (!sequenceEnabled || isReadOnly) return;

    event.preventDefault();
    const sourceId = draggedId ?? event.dataTransfer.getData('text/plain');
    if (!sourceId || sourceId === targetId) {
      setDraggedId(null);
      setDropTarget(null);
      return;
    }

    const rect = event.currentTarget.getBoundingClientRect();
    const placement = event.clientY < rect.top + rect.height / 2 ? 'before' : 'after';
    reorderPOIs(sourceId, targetId, placement);
    setDraggedId(null);
    setDropTarget(null);
  }, [sequenceEnabled, isReadOnly, draggedId, reorderPOIs]);

  const handleDragEnd = useCallback(() => {
    setDraggedId(null);
    setDropTarget(null);
  }, []);

  return (
    <aside className="side-panel" aria-label="Points of interest panel">
      <header className="panel-header">
        <div className="site-title">
          <span className="title-text">FieldNotes</span>
        </div>
        <div className="panel-actions">
          <button className="btn-action btn-add" onClick={onAddPOI} disabled={isReadOnly}>
            + ADD
          </button>
          <ShareButton userId={auth.user?.id} />
          <button
            className="btn-action btn-secondary"
            onClick={() => setSettingsOpen(true)}
            title="Open settings"
            aria-label="Open settings"
          >
            ⚙
          </button>
          <button
            className="btn-action btn-secondary btn-theme"
            onClick={onToggleTheme}
            aria-label={upsideDownMode ? 'Theme locked in upside down mode' : (theme === 'dark' ? 'Switch to light mode' : 'Switch to dark mode')}
            title={upsideDownMode ? 'UPSIDE DOWN LOCKS MAP THEME' : (theme === 'dark' ? 'Light mode' : 'Dark mode')}
            disabled={upsideDownMode}
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

      <SettingsModal
        open={settingsOpen}
        onClose={() => setSettingsOpen(false)}
        onExport={onExport}
        onImport={onImport}
      />

      {collectionId && (
        <div className="readonly-banner" role="status">
          <span>{syncError ?? (isReadOnly ? '● SHARED VIEW' : '● LIVE SHARED MAP')}</span>
          {isReadOnly && <ShareButton userId={auth.user?.id} mode="fork" />}
        </div>
      )}

      <div className="panel-search">
        <SearchBar disabled={sequenceEnabled} />
      </div>

      <FilterBar disabled={sequenceEnabled} />

      {sequenceEnabled && (
        <div className={`sequence-banner${routeError ? ' sequence-banner--error' : ''}`} role="status">
          {routeError ?? (routeLoading ? 'ROUTING ORDERED STOPS...' : 'DRAG LOCATIONS TO REORDER THE ROUTE')}
        </div>
      )}

      <GroupPanel />

      <div className="panel-list-header">
        <span className="list-count">
          {visiblePois.length} {sequenceEnabled ? 'SEQUENCED LOCATIONS' : 'LOCATIONS'}
        </span>
        <select
          className="sort-select"
          value={filter.sort}
          onChange={(e) => setFilter({ sort: e.target.value as SortOption })}
          aria-label="Sort order"
          disabled={sequenceEnabled}
        >
          <option value="newest">NEWEST</option>
          <option value="alphabetical">A–Z</option>
          <option value="tag">TAG</option>
          <option value="neighborhood">AREA</option>
        </select>
      </div>

      <div className="panel-list" role="list" aria-label="POI list">
        {visiblePois.length === 0 ? (
          <div className="list-empty">NO RESULTS</div>
        ) : (
          visiblePois.map((poi) => (
            <POIListItem
              key={poi.id}
              poi={poi}
              isSelected={selectedPOI?.id === poi.id}
              sequenceNumber={sequenceEnabled ? includedSequenceIds.get(poi.id) : undefined}
              sequenceMode={sequenceEnabled}
              draggable={sequenceEnabled && !isReadOnly}
              isDragSource={draggedId === poi.id}
              dropPlacement={dropTarget?.id === poi.id ? dropTarget.placement : null}
              onDragStart={(event) => handleDragStart(poi.id, event)}
              onDragOver={(event) => handleDragOver(poi.id, event)}
              onDrop={(event) => handleDrop(poi.id, event)}
              onDragEnd={handleDragEnd}
              onSelect={() => selectPOI(poi)}
              onHover={hoverPOI}
            />
          ))
        )}
      </div>
    </aside>
  );
}
