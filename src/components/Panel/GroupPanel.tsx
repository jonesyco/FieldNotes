import { useMemo } from 'react';
import { usePOIStore } from '../../store/poiStore';

export default function GroupPanel() {
  const { pois, highlightedGroup, setHighlightedGroup } = usePOIStore();

  const groups = useMemo(() => {
    const map = new Map<string, number>();
    pois.forEach((poi) => {
      if (poi.group) map.set(poi.group, (map.get(poi.group) ?? 0) + 1);
    });
    return Array.from(map.entries()).sort((a, b) => a[0].localeCompare(b[0]));
  }, [pois]);

  if (groups.length === 0) return null;

  return (
    <div className="group-panel">
      <div className="group-panel-header">GROUPS</div>
      {groups.map(([name, count]) => (
        <button
          key={name}
          className={`group-item${highlightedGroup === name ? ' group-item--active' : ''}`}
          onClick={() => setHighlightedGroup(highlightedGroup === name ? null : name)}
          title={`Highlight all pins in "${name}"`}
        >
          <span className="group-item-name">{name}</span>
          <span className="group-item-count">{count}</span>
        </button>
      ))}
    </div>
  );
}
