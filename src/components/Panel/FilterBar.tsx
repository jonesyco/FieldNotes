import { usePOIStore } from '../../store/poiStore';
import { collectTagsFromPois } from '../../utils/tags';

interface FilterBarProps {
  disabled?: boolean;
}

export default function FilterBar({ disabled = false }: FilterBarProps) {
  const { filter, toggleTag, setFilter, resetFilters, pois } = usePOIStore();
  const allTags = collectTagsFromPois(pois);
  const activeTags = Array.isArray(filter.tags) ? filter.tags : [];
  const hasFilters =
    activeTags.length > 0 || filter.favoritesOnly || filter.inBoundsOnly;

  return (
    <div className="filter-bar">
      <div className="filter-categories">
        {allTags.map((tag) => {
          const active = activeTags.some((selectedTag) => selectedTag.toLowerCase() === tag.toLowerCase());
          return (
            <button
              key={tag}
              className={`filter-chip${active ? ' filter-chip--active' : ''}`}
              onClick={() => toggleTag(tag)}
              disabled={disabled}
            >
              {tag}
            </button>
          );
        })}
      </div>
      <div className="filter-toggles">
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={filter.favoritesOnly}
            onChange={(e) => setFilter({ favoritesOnly: e.target.checked })}
            disabled={disabled}
          />
          <span>★ FAVORITES</span>
        </label>
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={filter.inBoundsOnly}
            onChange={(e) => setFilter({ inBoundsOnly: e.target.checked })}
            disabled={disabled}
          />
          <span>◉ IN VIEW</span>
        </label>
        {hasFilters && (
          <button className="filter-reset" onClick={resetFilters} disabled={disabled}>
            ✕ CLEAR
          </button>
        )}
      </div>
    </div>
  );
}
