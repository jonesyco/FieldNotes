import { usePOIStore } from '../../store/poiStore';
import { CATEGORIES, CATEGORY_LABELS, CATEGORY_COLORS } from '../../types';

export default function FilterBar() {
  const { filter, toggleCategory, setFilter, resetFilters } = usePOIStore();
  const hasFilters =
    filter.categories.length > 0 || filter.favoritesOnly || filter.inBoundsOnly;

  return (
    <div className="filter-bar">
      <div className="filter-categories">
        {CATEGORIES.map((cat) => {
          const active = filter.categories.includes(cat);
          return (
            <button
              key={cat}
              className={`filter-chip${active ? ' filter-chip--active' : ''}`}
              style={
                active
                  ? { borderColor: CATEGORY_COLORS[cat], color: CATEGORY_COLORS[cat] }
                  : undefined
              }
              onClick={() => toggleCategory(cat)}
            >
              {CATEGORY_LABELS[cat]}
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
          />
          <span>★ FAVORITES</span>
        </label>
        <label className="filter-toggle">
          <input
            type="checkbox"
            checked={filter.inBoundsOnly}
            onChange={(e) => setFilter({ inBoundsOnly: e.target.checked })}
          />
          <span>◉ IN VIEW</span>
        </label>
        {hasFilters && (
          <button className="filter-reset" onClick={resetFilters}>
            ✕ CLEAR
          </button>
        )}
      </div>
    </div>
  );
}
