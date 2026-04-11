import { useState, useMemo } from 'react';
import type { FormEvent } from 'react';
import { usePOIStore } from '../../store/poiStore';
import type { POI } from '../../types';
import type { CategoryId } from '../../types/categories';

interface POIFormModalProps {
  mode: 'add' | 'edit';
  lat?: number;
  lng?: number;
  poi?: POI;
  onClose: () => void;
}

const PORTLAND_NEIGHBORHOODS = [
  'Old Town', 'Pearl District', 'Downtown', 'Northwest', 'Nob Hill',
  'North Portland', 'North Mississippi', 'Northeast', 'Alberta Arts District',
  'Dekum Triangle', 'Inner SE', 'Southeast', 'SE Division', 'SE Hawthorne',
  'South Waterfront', 'West Hills', 'Sauvie Island', 'Columbia Gorge', 'Airport', 'Other',
];

export default function POIFormModal({
  mode,
  lat,
  lng,
  poi,
  onClose,
}: POIFormModalProps) {
  const { addPOI, updatePOI, pois, activeCategories } = usePOIStore();

  const [title, setTitle] = useState(poi?.title ?? '');
  const [description, setDescription] = useState(poi?.description ?? '');
  const [category, setCategory] = useState<CategoryId>(poi?.category ?? 'other');
  const [tags, setTags] = useState(poi?.tags.join(', ') ?? '');
  const [neighborhood, setNeighborhood] = useState(poi?.neighborhood ?? '');
  const [group, setGroup] = useState(poi?.group ?? '');
  const [photoUrl, setPhotoUrl] = useState(poi?.photoUrl ?? '');
  const [websiteUrl, setWebsiteUrl] = useState(poi?.websiteUrl ?? '');
  const [includeInSequence, setIncludeInSequence] = useState(poi?.includeInSequence ?? true);

  // Derive existing group names for the datalist
  const existingGroups = useMemo(
    () => Array.from(new Set(pois.map((p) => p.group).filter(Boolean))).sort(),
    [pois]
  );

  const handleSubmit = (e: FormEvent) => {
    e.preventDefault();
    const parsedTags = tags
      .split(',')
      .map((t) => t.trim())
      .filter(Boolean);

    if (mode === 'add' && lat != null && lng != null) {
        addPOI({
          title,
          description,
          category,
          includeInSequence,
          tags: parsedTags,
          neighborhood,
          group: group.trim() || undefined,
        lat,
        lng,
        photoUrl: photoUrl || undefined,
        websiteUrl: websiteUrl || undefined,
      });
    } else if (mode === 'edit' && poi) {
        updatePOI(poi.id, {
          title,
          description,
          category,
          includeInSequence,
          tags: parsedTags,
          neighborhood,
          group: group.trim() || undefined,
        photoUrl: photoUrl || undefined,
        websiteUrl: websiteUrl || undefined,
      });
    }
    onClose();
  };

  return (
    <div
      className="modal-overlay"
      role="dialog"
      aria-modal="true"
      aria-label={mode === 'add' ? 'Add location' : 'Edit location'}
      onClick={(e) => {
        if (e.target === e.currentTarget) onClose();
      }}
    >
      <div className="modal-dialog">
        <div className="modal-header">
          <h3 className="modal-title">
            {mode === 'add' ? '+ ADD LOCATION' : '✎ EDIT LOCATION'}
          </h3>
          {lat != null && mode === 'add' && (
            <p className="modal-coords">
              {lat.toFixed(5)}, {lng?.toFixed(5)}
            </p>
          )}
          <button className="modal-close" onClick={onClose} aria-label="Close">
            ✕
          </button>
        </div>

        <form className="modal-form" onSubmit={handleSubmit}>
          <div className="form-group">
            <label className="form-label" htmlFor="poi-title">
              TITLE <span className="form-required">*</span>
            </label>
            <input
              id="poi-title"
              className="form-input"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              required
              placeholder="Location name"
              autoFocus
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label className="form-label" htmlFor="poi-category">
                CATEGORY <span className="form-required">*</span>
              </label>
              <select
                id="poi-category"
                className="form-select"
                value={category}
                onChange={(e) => setCategory(e.target.value as CategoryId)}
                required
              >
                {activeCategories.map((c) => (
                  <option key={c.id} value={c.id}>
                    {c.name}
                  </option>
                ))}
              </select>
            </div>

            <div className="form-group">
              <label className="form-label" htmlFor="poi-neighborhood">
                NEIGHBORHOOD <span className="form-required">*</span>
              </label>
              <input
                id="poi-neighborhood"
                className="form-input"
                value={neighborhood}
                onChange={(e) => setNeighborhood(e.target.value)}
                required
                placeholder="e.g. Pearl District"
                list="neighborhood-list"
              />
              <datalist id="neighborhood-list">
                {PORTLAND_NEIGHBORHOODS.map((n) => (
                  <option key={n} value={n} />
                ))}
              </datalist>
            </div>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="poi-description">
              DESCRIPTION
            </label>
            <textarea
              id="poi-description"
              className="form-textarea"
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              rows={3}
              placeholder="What makes this place worth knowing about?"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="poi-tags">
              TAGS{' '}
              <span className="form-hint">(comma-separated)</span>
            </label>
            <input
              id="poi-tags"
              className="form-input"
              value={tags}
              onChange={(e) => setTags(e.target.value)}
              placeholder="e.g. coffee, outdoor, late-night"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="poi-group">
              GROUP{' '}
              <span className="form-hint">(optional — for bulk highlight)</span>
            </label>
            <input
              id="poi-group"
              className="form-input"
              value={group}
              onChange={(e) => setGroup(e.target.value)}
              placeholder="e.g. Weekend trip, Coffee crawl"
              list="group-list"
            />
            <datalist id="group-list">
              {existingGroups.map((g) => (
                <option key={g} value={g} />
              ))}
            </datalist>
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="poi-website">
              WEBSITE URL
            </label>
            <input
              id="poi-website"
              className="form-input"
              type="url"
              value={websiteUrl}
              onChange={(e) => setWebsiteUrl(e.target.value)}
              placeholder="https://"
            />
          </div>

          <div className="form-group">
            <label className="form-label" htmlFor="poi-photo">
              PHOTO URL
            </label>
            <input
              id="poi-photo"
              className="form-input"
              type="url"
              value={photoUrl}
              onChange={(e) => setPhotoUrl(e.target.value)}
              placeholder="https://..."
            />
          </div>

          <label className="modal-checkbox">
            <input
              type="checkbox"
              checked={includeInSequence}
              onChange={(e) => setIncludeInSequence(e.target.checked)}
            />
            <span>INCLUDE IN SEQUENCE MAP</span>
          </label>

          <div className="modal-footer">
            <button
              type="button"
              className="btn-action btn-secondary"
              onClick={onClose}
            >
              CANCEL
            </button>
            <button type="submit" className="btn-action btn-add">
              {mode === 'add' ? 'ADD LOCATION' : 'SAVE CHANGES'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
