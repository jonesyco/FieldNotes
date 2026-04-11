import { useState } from 'react';
import { usePOIStore } from '../../store/poiStore';
import { saveCollection } from '../../lib/collections';
import { isSupabaseConfigured } from '../../lib/supabase';

interface ShareButtonProps {
  userId?: string;
  /** "share" (default): save & share. "fork": create independent copy. */
  mode?: 'share' | 'fork';
}

export default function ShareButton({ userId, mode = 'share' }: ShareButtonProps) {
  const { pois, setIsSaving, setCollectionId, activeCategories, collectionId, sequenceEnabled } = usePOIStore();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [open, setOpen] = useState(false);

  const buildUrl = (id: string) =>
    `${window.location.origin}${window.location.pathname}?c=${id}`;

  const handleShare = async () => {
    if (!isSupabaseConfigured) {
      alert('Sharing requires Supabase. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
      return;
    }
    // Already in collaborative mode — just show the existing share URL
    if (collectionId) {
      setShareUrl(buildUrl(collectionId));
      setOpen(true);
      return;
    }
    setIsSaving(true);
    try {
      const id = await saveCollection(pois, undefined, userId, activeCategories, sequenceEnabled);
      setCollectionId(id);
      const url = buildUrl(id);
      setShareUrl(url);
      window.history.replaceState({}, '', `?c=${id}`);
      setOpen(true);
    } catch (err) {
      console.error(err);
      alert('Failed to save collection. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleFork = async () => {
    if (!isSupabaseConfigured) return;
    setIsSaving(true);
    try {
      const id = await saveCollection(pois, undefined, userId, activeCategories, sequenceEnabled);
      setCollectionId(id);
      const url = buildUrl(id);
      window.history.replaceState({}, '', `?c=${id}`);
      setShareUrl(url);
      setOpen(true);
    } catch (err) {
      console.error(err);
      alert('Failed to fork. Please try again.');
    } finally {
      setIsSaving(false);
    }
  };

  const handleCopy = async () => {
    if (!shareUrl) return;
    await navigator.clipboard.writeText(shareUrl);
    setCopying(true);
    setTimeout(() => setCopying(false), 2000);
  };

  if (mode === 'fork') {
    return (
      <>
        <button
          className="readonly-edit-btn"
          onClick={handleFork}
          title="Fork this map as your own independent copy"
        >
          ⑂ FORK
        </button>
        {open && shareUrl && (
          <div className="share-popup" role="dialog" aria-label="Fork created">
            <div className="share-popup-header">
              <span>MAP FORKED</span>
              <button className="share-popup-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
            </div>
            <p className="share-popup-label">Your fork's URL:</p>
            <div className="share-popup-url">
              <input readOnly value={shareUrl} className="share-url-input" onFocus={(e) => e.target.select()} />
              <button className="btn-copy" onClick={handleCopy}>{copying ? '✓ COPIED' : 'COPY'}</button>
            </div>
            <p className="share-popup-note">This is now your independent copy. Changes won't affect the original.</p>
          </div>
        )}
      </>
    );
  }

  return (
    <div className="share-btn-wrapper">
      <button
        className="btn-action btn-share"
        onClick={handleShare}
        title={isSupabaseConfigured ? 'Save & share this map' : 'Configure Supabase to enable sharing'}
      >
        ↗ SHARE
      </button>

      {open && shareUrl && (
        <div className="share-popup" role="dialog" aria-label="Share this map">
          <div className="share-popup-header">
            <span>MAP SAVED</span>
            <button className="share-popup-close" onClick={() => setOpen(false)} aria-label="Close">✕</button>
          </div>
          <p className="share-popup-label">Share this URL:</p>
          <div className="share-popup-url">
            <input
              readOnly
              value={shareUrl}
              className="share-url-input"
              onFocus={(e) => e.target.select()}
            />
            <button className="btn-copy" onClick={handleCopy}>
              {copying ? '✓ COPIED' : 'COPY'}
            </button>
          </div>
          <p className="share-popup-note">Signed-in owners can keep editing this live map; everyone else gets a read-only view.</p>
        </div>
      )}
    </div>
  );
}
