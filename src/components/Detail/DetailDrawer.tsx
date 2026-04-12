import { usePOIStore } from '../../store/poiStore';

export default function DetailDrawer() {
  const {
    selectedPOI,
    selectPOI,
    toggleFavorite,
    toggleSequenceInclusion,
    deletePOI,
    setEditingPOI,
    setRelocatingPOI,
    isReadOnly,
  } =
    usePOIStore();

  if (!selectedPOI) return null;

  const date = new Date(selectedPOI.createdAt).toLocaleDateString('en-US', {
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });

  const handleDelete = () => {
    if (window.confirm(`Delete "${selectedPOI.title}"?`)) {
      deletePOI(selectedPOI.id);
    }
  };

  return (
    <div className="detail-drawer" role="complementary" aria-label="POI detail">
      <div className="detail-header">
        <div className="detail-meta-top">
          <span className="detail-neighborhood-badge">
            {selectedPOI.neighborhood.toUpperCase()}
          </span>
          {selectedPOI.tags.slice(0, 2).map((tag) => (
            <span key={tag} className="tag-chip">
              {tag}
            </span>
          ))}
        </div>
        <h2 className="detail-title">{selectedPOI.title}</h2>
        <p className="detail-date">Added {date}</p>
        <button
          className="detail-close"
          onClick={() => selectPOI(null)}
          aria-label="Close detail"
        >
          ✕
        </button>
      </div>

      {selectedPOI.photoUrl && (
        <div className="detail-photo">
          <img src={selectedPOI.photoUrl} alt={selectedPOI.title} loading="lazy" />
        </div>
      )}

      <div className="detail-body">
        <p className="detail-description">{selectedPOI.description}</p>

        {selectedPOI.tags.length > 0 && (
          <div className="detail-tags">
            {selectedPOI.tags.map((tag) => (
              <span key={tag} className="tag-chip tag-chip--large">
                {tag}
              </span>
            ))}
          </div>
        )}

        {selectedPOI.websiteUrl && (
          <a
            href={selectedPOI.websiteUrl}
            target="_blank"
            rel="noopener noreferrer"
            className="detail-link"
          >
            ↗ {selectedPOI.websiteUrl.replace(/^https?:\/\//, '')}
          </a>
        )}

        <div className="detail-coords">
          {selectedPOI.lat.toFixed(5)}, {selectedPOI.lng.toFixed(5)}
        </div>

        <label className="modal-checkbox detail-sequence-toggle">
          <input
            type="checkbox"
            checked={selectedPOI.includeInSequence}
            onChange={() => toggleSequenceInclusion(selectedPOI.id)}
            disabled={isReadOnly}
          />
          <span>INCLUDE IN SEQUENCE MAP</span>
        </label>
      </div>

      {!isReadOnly && (
        <div className="detail-actions">
          <button
            className={`btn-action ${selectedPOI.favorite ? 'btn-favorite-active' : 'btn-secondary'}`}
            onClick={() => toggleFavorite(selectedPOI.id)}
          >
            {selectedPOI.favorite ? '★ SAVED' : '☆ SAVE'}
          </button>
          <button
            className="btn-action btn-secondary"
            onClick={() => setEditingPOI(selectedPOI)}
          >
            ✎ EDIT
          </button>
          <button
            className="btn-action btn-secondary"
            onClick={() => { setRelocatingPOI(selectedPOI); selectPOI(null); }}
            title="Click a new spot on the map to move this pin"
          >
            ✦ MOVE
          </button>
          <button className="btn-action btn-danger" onClick={handleDelete}>
            ✕ DELETE
          </button>
        </div>
      )}
    </div>
  );
}
