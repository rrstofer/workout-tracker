import { useEffect, useMemo, useRef, useState } from "react";
import { ALL_EXERCISES, PRIMARY_SPLITS } from "../data/workoutConfig";
import {
  exerciseMatchesHistorySplits,
  getSplitForExercise,
  isHistorySplitFilterAll,
} from "../utils/workoutUtils";

export function HistoryFilters({
  selectedSplits,
  setSelectedSplits,
  selectedExercise,
  setSelectedExercise,
  sortOrder,
  setSortOrder,
  selectedVariationFilters,
  toggleVariationFilter,
  availableVariations,
  workouts,
}) {
  const [isDropdownOpen, setIsDropdownOpen] = useState(false);
  const [filteredExercises, setFilteredExercises] = useState([]);
  const [inputValue, setInputValue] = useState(selectedExercise);
  const dropdownRef = useRef(null);

  const searchableExercises = useMemo(
    () =>
      Array.from(
        new Set([...ALL_EXERCISES, ...workouts.map((workout) => workout.exercise)])
      )
        .filter(Boolean)
        .sort(),
    [workouts]
  );

  const filterExercisesByQuery = (value) => {
    const query = value.trim().toLowerCase();
    if (!query) {
      return [];
    }

    return searchableExercises.filter((exercise) => {
      if (!exercise.toLowerCase().includes(query)) {
        return false;
      }

      return exerciseMatchesHistorySplits(exercise, selectedSplits, workouts);
    });
  };

  const selectSplit = (split) => {
    setSelectedSplits((current) => {
      if (!isHistorySplitFilterAll(current) && current.length === 1 && current[0] === split) {
        return [];
      }
      return [split];
    });
    setIsDropdownOpen(false);
  };

  const selectAllSplits = () => {
    setSelectedSplits([]);
    setIsDropdownOpen(false);
  };

  const handleInputChange = (event) => {
    const value = event.target.value;
    setInputValue(value);

    const filtered = filterExercisesByQuery(value);
    setFilteredExercises(filtered);
    setIsDropdownOpen(filtered.length > 0);
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
    setIsDropdownOpen(false);
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

  useEffect(() => {
    if (!selectedExercise) {
      return;
    }

    if (!exerciseMatchesHistorySplits(selectedExercise, selectedSplits, workouts)) {
      setSelectedExercise("");
      setInputValue("");
      setFilteredExercises([]);
      setIsDropdownOpen(false);
    }
  }, [selectedSplits, selectedExercise, setSelectedExercise, workouts]);

  useEffect(() => {
    if (!inputValue.trim() || selectedExercise === inputValue) {
      return;
    }

    const filtered = filterExercisesByQuery(inputValue);
    setFilteredExercises(filtered);
    setIsDropdownOpen(filtered.length > 0);
  }, [selectedSplits, workouts]);

  const allSplitsActive = isHistorySplitFilterAll(selectedSplits);

  return (
    <div className="filter-panel">
      <div className="split-filter-row">
        <span className="filter-label">Type:</span>
        <div className="split-buttons">
          <button
            type="button"
            className={`split-btn ${allSplitsActive ? "active" : ""}`}
            onClick={selectAllSplits}
          >
            All
          </button>
          {PRIMARY_SPLITS.map((split) => (
            <button
              key={split}
              type="button"
              className={`split-btn ${
                !allSplitsActive && selectedSplits.includes(split) ? "active" : ""
              }`}
              onClick={() => selectSplit(split)}
            >
              {split}
            </button>
          ))}
        </div>
      </div>

      <div className="exercise-search">
        <span className="filter-label">Exercise:</span>
        <div className="autocomplete-wrapper" ref={dropdownRef}>
          <div className="autocomplete-input-group">
            <input
              type="text"
              placeholder={
                allSplitsActive
                  ? "Type to search exercises..."
                  : `Search ${selectedSplits[0]} exercises...`
              }
              value={inputValue}
              onChange={handleInputChange}
              onFocus={() => {
                const filtered = filterExercisesByQuery(inputValue);
                setFilteredExercises(filtered);
                setIsDropdownOpen(filtered.length > 0);
              }}
              className="autocomplete-input"
              autoComplete="off"
              enterKeyHint="search"
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
                  {!allSplitsActive && (
                    <small className="autocomplete-option-meta">
                      {getSplitForExercise(exercise, workouts)}
                    </small>
                  )}
                </button>
              ))}
            </div>
          )}
        </div>
      </div>

      <div className="variations-sort-row">
        <div className="variations-toolbar">
          <span className="filter-label">Variations:</span>
          <button
            type="button"
            className="sort-btn"
            onClick={() => setSortOrder(sortOrder === "newest" ? "oldest" : "newest")}
            title={`Click to sort ${sortOrder === "newest" ? "oldest" : "newest"} first`}
            aria-label={`Sort ${sortOrder === "newest" ? "oldest" : "newest"} first`}
          >
            <span className="sort-btn-short">{sortOrder === "newest" ? "↓ Newest" : "↑ Oldest"}</span>
            <span className="sort-btn-long">
              {sortOrder === "newest" ? "↓ Newest" : "↑ Oldest"}
            </span>
          </button>
        </div>

        <div className="variation-chips">
          {["All", "Standard", "Incline", "Decline", "Unilateral"].map((filter) => {
            const isActive =
              (filter === "All" && selectedVariationFilters.length === 0) ||
              selectedVariationFilters.includes(filter);

            const isAvailable = filter === "All" || availableVariations.includes(filter);

            return (
              <button
                key={filter}
                type="button"
                disabled={!isAvailable}
                className={`chip ${isActive ? "active" : ""}`}
                onClick={() => toggleVariationFilter(filter)}
              >
                {filter}
              </button>
            );
          })}
        </div>
      </div>
    </div>
  );
}
