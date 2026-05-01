import { memo } from 'react';
import type { DragEvent } from 'react';
import type { POI } from '../../types';

interface POIListItemProps {
  poi: POI;
  isSelected: boolean;
  onSelect: () => void;
  onHover: (id: string | null) => void;
  sequenceNumber?: number;
  sequenceMode?: boolean;
  isSequenceStart?: boolean;
  isSequenceEnd?: boolean;
  draggable?: boolean;
  isDragSource?: boolean;
  dropPlacement?: 'before' | 'after' | null;
  onDragStart?: (event: DragEvent<HTMLDivElement>) => void;
  onDragOver?: (event: DragEvent<HTMLDivElement>) => void;
  onDrop?: (event: DragEvent<HTMLDivElement>) => void;
  onDragEnd?: () => void;
}

export default memo(function POIListItem({
  poi,
  isSelected,
  onSelect,
  onHover,
  sequenceNumber,
  sequenceMode = false,
  isSequenceStart = false,
  isSequenceEnd = false,
  draggable = false,
  isDragSource = false,
  dropPlacement = null,
  onDragStart,
  onDragOver,
  onDrop,
  onDragEnd,
}: POIListItemProps) {
  const primaryTag = poi.tags[0];

  return (
    <div
      className={[
        'list-item',
        isSelected ? 'list-item--selected' : '',
        sequenceMode ? 'list-item--sequence' : '',
        isDragSource ? 'list-item--dragging' : '',
        dropPlacement === 'before' ? 'list-item--drop-before' : '',
        dropPlacement === 'after' ? 'list-item--drop-after' : '',
      ].filter(Boolean).join(' ')}
      role="listitem"
      tabIndex={0}
      onClick={onSelect}
      onMouseEnter={() => onHover(poi.id)}
      onMouseLeave={() => onHover(null)}
      draggable={draggable}
      onDragStart={onDragStart}
      onDragOver={onDragOver}
      onDrop={onDrop}
      onDragEnd={onDragEnd}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="list-item-indicator" />
      <div className="list-item-content">
        <div className="list-item-top">
          <div className="list-item-title-group">
            {sequenceMode && (
              <>
                <span className="list-item-sequence">{sequenceNumber ?? '—'}</span>
                <span className="list-item-drag" aria-hidden="true">⋮⋮</span>
              </>
            )}
            <span className="list-item-title">{poi.title}</span>
          </div>
          {poi.favorite && <span className="list-item-star" aria-label="Favorited">★</span>}
        </div>
        <div className="list-item-meta">
          {sequenceMode && isSequenceStart && <span className="tag-chip">START</span>}
          {sequenceMode && isSequenceEnd && <span className="tag-chip">END</span>}
          {sequenceMode && (isSequenceStart || isSequenceEnd) && <span className="list-item-sep" aria-hidden="true">·</span>}
          {primaryTag && (
            <>
              <span className="list-item-category">{primaryTag}</span>
              <span className="list-item-sep" aria-hidden="true">·</span>
            </>
          )}
          <span className="list-item-neighborhood">{poi.neighborhood.toUpperCase()}</span>
        </div>
        {poi.tags.length > 0 && (
          <div className="list-item-tags">
            {poi.tags.slice(0, 3).map((tag) => (
              <span key={tag} className="tag-chip">{tag}</span>
            ))}
          </div>
        )}
      </div>
    </div>
  );
});
