import { useState } from 'react';
import { usePOIStore } from '../../store/poiStore';
import { saveCollection } from '../../lib/collections';
import { isSupabaseConfigured } from '../../lib/supabase';

interface ShareButtonProps {
  userId?: string;
}

export default function ShareButton({ userId }: ShareButtonProps) {
  const { pois, setIsSaving, setCollectionId } = usePOIStore();
  const [shareUrl, setShareUrl] = useState<string | null>(null);
  const [copying, setCopying] = useState(false);
  const [open, setOpen] = useState(false);

  const handleShare = async () => {
    if (!isSupabaseConfigured) {
      alert('Sharing requires Supabase. Add VITE_SUPABASE_URL and VITE_SUPABASE_ANON_KEY to your .env file.');
      return;
    }
    setIsSaving(true);
    try {
      const id = await saveCollection(pois, undefined, userId);
      setCollectionId(id);
      const url = `${window.location.origin}${window.location.pathname}?c=${id}`;
      setShareUrl(url);
      window.history.replaceState({}, '', `?c=${id}`);
      setOpen(true);
    } catch (err) {
      console.error(err);
      alert('Failed to save collection. Check your Supabase configuration.');
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
          <p className="share-popup-note">Anyone with this link can view your map.</p>
        </div>
      )}
    </div>
  );
}
