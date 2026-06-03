import { PRIMARY_SPLITS } from "../data/workoutConfig";

export function HistoryFilters({
  searchTerm,
  setSearchTerm,
  sortOrder,
  setSortOrder,
  selectedSplits,
  setSelectedSplits,
}) {
  const toggleSplit = (split) => {
    setSelectedSplits((current) =>
      current.includes(split)
        ? current.filter((item) => item !== split)
        : [...current, split]
    );
  };

  const toggleAllSplits = () => {
    if (selectedSplits.length === PRIMARY_SPLITS.length) {
      setSelectedSplits([]);
    } else {
      setSelectedSplits([...PRIMARY_SPLITS]);
    }
  };

  return (
    <div className="filter-panel">
      <div className="filter-section">
        <label>
          <span>Search Exercise</span>
          <input
            type="text"
            placeholder="Search by name..."
            value={searchTerm}
            onChange={(e) => setSearchTerm(e.target.value)}
            className="search-input"
          />
        </label>
      </div>

      <div className="filter-section">
        <label>
          <span>Sort by Date</span>
          <select value={sortOrder} onChange={(e) => setSortOrder(e.target.value)}>
            <option value="newest">Newest first</option>
            <option value="oldest">Oldest first</option>
          </select>
        </label>
      </div>

      <div className="filter-section">
        <span>Filter by Split Type</span>
        <div className="split-checkboxes">
          <button
            type="button"
            className={`filter-checkbox ${selectedSplits.length === PRIMARY_SPLITS.length ? "active" : ""}`}
            onClick={toggleAllSplits}
          >
            <span className="checkbox-check">✓</span>
            <span>All Types</span>
          </button>
          {PRIMARY_SPLITS.map((split) => (
            <button
              key={split}
              type="button"
              className={`filter-checkbox ${selectedSplits.includes(split) ? "active" : ""}`}
              onClick={() => toggleSplit(split)}
            >
              <span className="checkbox-check">✓</span>
              <span>{split}</span>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}
