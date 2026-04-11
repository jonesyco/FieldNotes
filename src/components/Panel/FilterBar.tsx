import { usePOIStore } from '../../store/poiStore';

interface FilterBarProps {
  disabled?: boolean;
}

export default function FilterBar({ disabled = false }: FilterBarProps) {
  const { filter, toggleCategory, setFilter, resetFilters, activeCategories } = usePOIStore();
  const hasFilters =
    filter.categories.length > 0 || filter.favoritesOnly || filter.inBoundsOnly;

  return (
    <div className="filter-bar">
      <div className="filter-categories">
        {activeCategories.map((cat) => {
          const active = filter.categories.includes(cat.id);
          return (
            <button
              key={cat.id}
              className={`filter-chip${active ? ' filter-chip--active' : ''}`}
              style={
                active
                  ? { borderColor: cat.color, color: cat.color }
                  : undefined
              }
              onClick={() => toggleCategory(cat.id)}
              disabled={disabled}
            >
              {cat.name}
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
