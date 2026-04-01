import type { POI } from '../../types';
import { CATEGORY_LABELS, CATEGORY_COLORS } from '../../types';

interface POIListItemProps {
  poi: POI;
  isSelected: boolean;
  onSelect: () => void;
  onHover: (id: string | null) => void;
}

export default function POIListItem({
  poi,
  isSelected,
  onSelect,
  onHover,
}: POIListItemProps) {
  const color = CATEGORY_COLORS[poi.category];

  return (
    <div
      className={`list-item${isSelected ? ' list-item--selected' : ''}`}
      role="listitem"
      tabIndex={0}
      onClick={onSelect}
      onMouseEnter={() => onHover(poi.id)}
      onMouseLeave={() => onHover(null)}
      onKeyDown={(e) => {
        if (e.key === 'Enter' || e.key === ' ') {
          e.preventDefault();
          onSelect();
        }
      }}
    >
      <div className="list-item-indicator" style={{ backgroundColor: color }} />
      <div className="list-item-content">
        <div className="list-item-top">
          <span className="list-item-title">{poi.title}</span>
          {poi.favorite && <span className="list-item-star" aria-label="Favorited">★</span>}
        </div>
        <div className="list-item-meta">
          <span className="list-item-category" style={{ color }}>
            {CATEGORY_LABELS[poi.category]}
          </span>
          <span className="list-item-sep" aria-hidden="true">·</span>
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
}
