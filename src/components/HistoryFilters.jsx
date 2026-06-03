import { useEffect, useRef, useState } from "react";
import { PRIMARY_SPLITS, ALL_EXERCISES } from "../data/workoutConfig";

export function HistoryFilters({
  selectedSplits,
  setSelectedSplits,
  selectedExercise,
  setSelectedExercise,
  sortOrder,
  setSortOrder,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [inputValue, setInputValue] = useState(selectedExercise);
  const dropdownRef = useRef(null);

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

  const handleInputChange = (e) => {
    const value = e.target.value;
    setInputValue(value);

    if (value.trim() === "") {
      setFilteredExercises([]);
      setIsDropdownOpen(false);
    } else {
      const filtered = ALL_EXERCISES.filter((exercise) =>
        exercise.toLowerCase().includes(value.toLowerCase())
      );
      setFilteredExercises(filtered);
      setIsDropdownOpen(filtered.length > 0);
    }
  };

  const selectExercise = (exercise) => {
    setSelectedExercise(exercise);
    setInputValue(exercise);
    setIsDropdownOpen(false);
    setFilteredExercises([]);
  };

  const clearExercise = () => {
    setSelectedExercise("");
    setInputValue("");
    setFilteredExercises([]);
  };

  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsDropdownOpen(false);
      }
    };

    document.addEventListener("mousedown", handleClickOutside);
    return () => document.removeEventListener("mousedown", handleClickOutside);
  }, []);

  useEffect(() => {
    setInputValue(selectedExercise);
  }, [selectedExercise]);

  return (
    <div className="filter-panel">
      {/* Split Type Filter - Compact */}
      <div className="split-filter-row">
        <span className="filter-label">Type:</span>
        <div className="split-buttons">
          <button
            type="button"
            className={`split-btn ${selectedSplits.length === PRIMARY_SPLITS.length ? "active" : ""}`}
            onClick={toggleAllSplits}
          >
            All
          </button>
          {PRIMARY_SPLITS.map((split) => (
            <button
              key={split}
              type="button"
              className={`split-btn ${selectedSplits.includes(split) ? "active" : ""}`}
              onClick={() => toggleSplit(split)}
            >
              {split}
            </button>
          ))}
        </div>
      </div>

      {/* Exercise Autocomplete */}
      <div className="exercise-search">
        <span className="filter-label">Exercise:</span>
        <div className="autocomplete-wrapper" ref={dropdownRef}>
          <div className="autocomplete-input-group">
            <input
              type="text"
              placeholder="Type to search..."
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => {
                if (filteredExercises.length > 0) {
                  setIsDropdownOpen(true);
                }
              }}
              className="autocomplete-input"
            />
            {selectedExercise && (
              <button
                type="button"
                className="clear-btn"
                onClick={clearExercise}
                title="Clear selection"
              >
                ✕
              </button>
            )}
          </div>

          {isDropdownOpen && filteredExercises.length > 0 && (
            <div className="autocomplete-dropdown">
              {filteredExercises.map((exercise) => (
                <button
                  key={exercise}
                  type="button"
                  className="autocomplete-option"
                  onClick={() => selectExercise(exercise)}
                >
                  {exercise}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Variation Filters & Sort - Together with Separator */}
      <div className="variations-sort-row">
        <div className="variations-group">
          <span className="filter-label">Variations:</span>
          {["All", "Standard", "Incline", "Decline", "Unilateral"].map((filter) => (
            <button
              key={filter}
              type="button"
              className="chip"
              disabled
            >
              {filter}
            </button>
          ))}
        </div>

        <div className="sort-divider"></div>

        <div className="sort-group">
          <button
            type="button"
            className="sort-btn"
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            title={`Click to sort ${sortOrder === "newest" ? "oldest" : "newest"} first`}
          >
            {sortOrder === "newest" ? "↓ Newest" : "↑ Oldest"}
          </button>
        </div>
      </div>
    </div>
  );
}

