import { useState, useCallback, useRef, useEffect } from 'react';
import MapView from './components/MapView/MapView';
import LocationSearch from './components/MapView/LocationSearch';
import SidePanel from './components/Panel/SidePanel';
import DetailDrawer from './components/Detail/DetailDrawer';
import POIFormModal from './components/Forms/POIFormModal';
import TourModal from './components/Tour/TourModal';
import { usePOIStore } from './store/poiStore';
import { useAuth } from './hooks/useAuth';
import { useTheme } from './hooks/useTheme';
import { useCollectionSync } from './hooks/useCollectionSync';
import { useSequenceRoute } from './hooks/useSequenceRoute';
import type { POI } from './types';
import { getDisplayTitle } from './utils/spookyText';
import { playUpsideDownSting } from './utils/upsideDownAudio';

export default function App() {
  const { theme, toggleTheme } = useTheme();
  const auth = useAuth();
  const { addingMode, setAddingMode, editingPOI, setEditingPOI, pois, importPOIs,
    loadSharedCollection, relocatingPOI, setRelocatingPOI, updatePOI, selectPOI, isReadOnly,
    searchPreview, setSearchPreview, searchReturnTarget, setFlyTo, upsideDownMode } =
    usePOIStore();
  useCollectionSync();
  useSequenceRoute();

  const [addCoords, setAddCoords] = useState<{ lat: number; lng: number } | null>(null);
  const [initialCenter, setInitialCenter] = useState<[number, number] | null>(null);
  const importInputRef = useRef<HTMLInputElement>(null);
  const previousUpsideDownMode = useRef(upsideDownMode);

  // On mount: check for shared collection URL param, and get geolocation
  useEffect(() => {
    if (auth.loading) return;

    const params = new URLSearchParams(window.location.search);
    const collectionId = params.get('c');
    if (collectionId) {
      loadSharedCollection(collectionId, auth.user?.id);
    }

    // Get user's location for initial map center
    if (navigator.geolocation) {
      navigator.geolocation.getCurrentPosition(
        (pos) => setInitialCenter([pos.coords.longitude, pos.coords.latitude]),
        () => setInitialCenter(null) // fall back to default
      );
    }
  }, [auth.loading, auth.user?.id, loadSharedCollection]);

  useEffect(() => {
    if (previousUpsideDownMode.current !== upsideDownMode) {
      playUpsideDownSting(upsideDownMode);
      previousUpsideDownMode.current = upsideDownMode;
    }
  }, [upsideDownMode]);

  const handleMapClick = useCallback(
    (lat: number, lng: number) => {
      if (isReadOnly) return;

      if (relocatingPOI) {
        updatePOI(relocatingPOI.id, { lat, lng });
        selectPOI({ ...relocatingPOI, lat, lng });
        setRelocatingPOI(null);
      } else if (addingMode) {
        setAddCoords({ lat, lng });
        setAddingMode(false);
      }
    },
    [isReadOnly, relocatingPOI, addingMode, setAddingMode, updatePOI, selectPOI, setRelocatingPOI]
  );

  const handleAddPOI = () => {
    if (isReadOnly) return;
    setAddingMode(true);
  };

  const handleAddFromSearch = () => {
    if (isReadOnly || !searchPreview) return;
    setAddCoords({ lat: searchPreview.lat, lng: searchPreview.lng });
    setSearchPreview(null);
  };

  const handleDismissSearch = () => {
    setSearchPreview(null);
    if (searchReturnTarget) setFlyTo(searchReturnTarget);
  };

  const handleCloseForm = () => {
    setAddCoords(null);
    setEditingPOI(null);
  };

  const handleExport = () => {
    const json = JSON.stringify(pois, null, 2);
    const blob = new Blob([json], { type: 'application/json' });
    const url = URL.createObjectURL(blob);
    const a = document.createElement('a');
    a.href = url;
    a.download = `fieldnotes-${new Date().toISOString().slice(0, 10)}.json`;
    a.click();
    URL.revokeObjectURL(url);
  };

  const handleImport = () => {
    if (isReadOnly) return;
    importInputRef.current?.click();
  };

  const handleImportFile = (e: React.ChangeEvent<HTMLInputElement>) => {
    if (isReadOnly) return;

    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = (ev) => {
      try {
        const data = JSON.parse(ev.target?.result as string) as POI[];
        if (Array.isArray(data)) importPOIs(data);
        else alert('Invalid format: expected a JSON array of POIs');
      } catch {
        alert('Could not parse file — invalid JSON');
      }
    };
    reader.readAsText(file);
    e.target.value = '';
  };

  return (
    <div className="app-layout">
      <SidePanel
        auth={auth}
        onAddPOI={handleAddPOI}
        onExport={handleExport}
        onImport={handleImport}
        theme={theme}
        onToggleTheme={toggleTheme}
      />

      <main className={`map-area${upsideDownMode ? ' map-area--upside-down' : ''}`}>
        <MapView key={upsideDownMode ? 'upside-down' : theme} onMapClick={handleMapClick} theme={theme} initialCenter={initialCenter} />
        <LocationSearch />
        {!isReadOnly && searchPreview && (
          <div className="add-mode-banner add-mode-banner--search" role="status">
            <span>{searchPreview.label.split(',').slice(0, 2).join(',').toUpperCase()}</span>
            <button onClick={handleAddFromSearch}>+ ADD LOCATION</button>
            <button onClick={handleDismissSearch}>✕ DISMISS</button>
          </div>
        )}
        {!isReadOnly && addingMode && (
          <div className="add-mode-banner" role="status">
            <span>CLICK MAP TO PLACE NEW LOCATION</span>
            <button onClick={() => setAddingMode(false)}>CANCEL</button>
          </div>
        )}
        {!isReadOnly && relocatingPOI && (
          <div className="add-mode-banner add-mode-banner--move" role="status">
            <span>CLICK MAP TO MOVE "{getDisplayTitle(relocatingPOI.title, upsideDownMode).toUpperCase()}"</span>
            <button onClick={() => setRelocatingPOI(null)}>CANCEL</button>
          </div>
        )}
      </main>

      <DetailDrawer />

      <TourModal />

      {!isReadOnly && addCoords && (
        <POIFormModal
          mode="add"
          lat={addCoords.lat}
          lng={addCoords.lng}
          onClose={handleCloseForm}
        />
      )}

      {!isReadOnly && editingPOI && (
        <POIFormModal
          mode="edit"
          poi={editingPOI}
          onClose={handleCloseForm}
        />
      )}

      <input
        ref={importInputRef}
        type="file"
        accept=".json"
        style={{ display: 'none' }}
        onChange={handleImportFile}
        aria-hidden="true"
      />
    </div>
  );
}
