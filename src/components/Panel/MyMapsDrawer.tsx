import { useEffect, useState } from 'react';
import type { User } from '@supabase/supabase-js';
import type { Collection } from '../../lib/collections';
import { loadUserCollections } from '../../lib/collections';
import { isSupabaseConfigured } from '../../lib/supabase';
import { usePOIStore } from '../../store/poiStore';

interface MyMapsDrawerProps {
  user: User;
  open: boolean;
  onClose: () => void;
}

export default function MyMapsDrawer({ user, open, onClose }: MyMapsDrawerProps) {
  const [collections, setCollections] = useState<Collection[]>([]);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [copiedId, setCopiedId] = useState<string | null>(null);
  const loadCollectionForEditing = usePOIStore(s => s.loadCollectionForEditing);

  useEffect(() => {
    if (!open || !isSupabaseConfigured) return;
    setLoading(true);
    setError(null);
    loadUserCollections(user.id)
      .then(setCollections)
      .catch(() => setError('Failed to load your maps.'))
      .finally(() => setLoading(false));
  }, [open, user.id]);

  const handleOpen = async (id: string) => {
    await loadCollectionForEditing(id);
    onClose();
  };

  const handleShare = async (id: string) => {
    const url = `${window.location.origin}${window.location.pathname}?c=${id}`;
    await navigator.clipboard.writeText(url);
    setCopiedId(id);
    setTimeout(() => setCopiedId(null), 2000);
  };

  return (
    <div className={`my-maps-drawer${open ? ' open' : ''}`} role="dialog" aria-label="My Maps" aria-hidden={!open}>
      <div className="my-maps-header">
        <span className="my-maps-title">MY MAPS</span>
        <button className="my-maps-close" onClick={onClose} aria-label="Close">✕</button>
      </div>

      <div className="my-maps-body">
        {loading && <div className="my-maps-status">Loading…</div>}
        {error && <div className="my-maps-status my-maps-error">{error}</div>}

        {!loading && !error && collections.length === 0 && (
          <div className="my-maps-empty">
            <p>No saved maps yet.</p>
            <p className="my-maps-empty-hint">
              Use <strong>↗ SHARE</strong> to save a map to your account.
            </p>
          </div>
        )}

        {collections.map(col => (
          <div key={col.id} className="my-maps-item">
            <div className="my-maps-item-info">
              <span className="my-maps-item-title">{col.title ?? 'Untitled Map'}</span>
              <span className="my-maps-item-meta">
                {col.pois.length} location{col.pois.length !== 1 ? 's' : ''} &middot;{' '}
                {new Date(col.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="my-maps-item-actions">
              <button className="btn-maps-action" onClick={() => handleOpen(col.id)}>
                Open
              </button>
              <button
                className="btn-maps-action btn-maps-share"
                onClick={() => handleShare(col.id)}
                title="Copy share link"
              >
                {copiedId === col.id ? '✓' : '↗'}
              </button>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
