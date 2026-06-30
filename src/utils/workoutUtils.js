import { EXERCISE_CATEGORY, PRIMARY_SPLITS } from "../data/workoutConfig";

export const emptyForm = {
  split: "",
  exercise: "",
  customExercise: "",
  equipment: "",
  weight: "",
  barWeight: "45",
  baseWeight: "",
  showLoadOptions: false,
  variations: [],
  sets: ["", "", "", ""],
  notes: "",
  perSetWeights: false,
  setWeights: ["", "", "", ""],
};

export const BARBELL_PLATES = [45, 35, 25, 10, 5];

export const isBarbellEquipment = (equipment) => equipment === "Barbell";

export const supportsBaseWeight = (equipment) =>
  ["Cable", "Machine", "Smith Machine"].includes(equipment);

export const getChartMetricTitle = (metric) =>
  metric === "volume" ? "Volume Per Session" : "Weight Per Session";

export const getPlateBreakdown = (totalWeight, barWeight = 45) => {
  const target = Number(totalWeight);
  const bar = Number(barWeight) || 45;

  if (!Number.isFinite(target) || target <= 0) {
    return {
      perSideWeight: 0,
      plates: [],
      remaining: 0,
      isLoadable: false,
      message: "Enter a total weight to see plates.",
    };
  }

  const perSideWeight = (target - bar) / 2;

  if (perSideWeight < 0) {
    return {
      perSideWeight,
      plates: [],
      remaining: Math.abs(perSideWeight),
      isLoadable: false,
      message: "Target is lighter than the bar.",
    };
  }

  const plates = [];
  let remaining = perSideWeight;

  BARBELL_PLATES.forEach((plate) => {
    const count = Math.floor((remaining + 0.0001) / plate);
    if (count > 0) {
      plates.push({ plate, count });
      remaining -= plate * count;
    }
  });

  const roundedRemaining = Math.round(remaining * 100) / 100;

  return {
    perSideWeight,
    plates,
    remaining: roundedRemaining,
    isLoadable: Math.abs(roundedRemaining) < 0.001,
    message:
      plates.length > 0
        ? plates.map(({ plate, count }) => `${count}x${plate}`).join(" + ")
        : "Empty bar",
  };
};

export const titleCaseUser = (user) => user.charAt(0).toUpperCase() + user.slice(1);

export const normalizeVariations = (value) => {
  if (!value) return [];
  if (Array.isArray(value)) return value;
  return String(value)
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
};

export const timestampToDate = (value) => {
  if (!value) return null;
  if (value instanceof Date) return value;
  if (typeof value.toDate === "function") return value.toDate();
  if (typeof value.seconds === "number") return new Date(value.seconds * 1000);
  return null;
};

export const formatDate = (createdAt) =>
  timestampToDate(createdAt)?.toLocaleDateString() || "No date";

export const formatPacificTime = (createdAt) =>
  timestampToDate(createdAt)?.toLocaleTimeString("en-US", {
    timeZone: "America/Los_Angeles",
    hour: "numeric",
    minute: "2-digit",
  }) || "Syncing...";

export const getLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getDateKey = (createdAt) => {
  const date = timestampToDate(createdAt);
  if (!date) return "";
  return getLocalDateKey(date);
};

export const getSplitForWorkout = (workout) =>
  EXERCISE_CATEGORY[workout.exercise] || workout.split || "Other";

export const isHistorySplitFilterAll = (selectedSplits) =>
  selectedSplits.length === 0 || selectedSplits.length === PRIMARY_SPLITS.length;

export const getSplitForExercise = (exercise, workouts = []) => {
  if (EXERCISE_CATEGORY[exercise]) {
    return EXERCISE_CATEGORY[exercise];
  }

  const matches = workouts.filter((workout) => workout.exercise === exercise);
  if (matches.length === 0) {
    return "Other";
  }

  const splitCounts = {};
  matches.forEach((workout) => {
    const split = getSplitForWorkout(workout);
    splitCounts[split] = (splitCounts[split] || 0) + 1;
  });

  return Object.entries(splitCounts).sort((a, b) => b[1] - a[1])[0][0];
};

export const matchesHistorySplitFilter = (workoutSplit, selectedSplits) =>
  isHistorySplitFilterAll(selectedSplits) || selectedSplits.includes(workoutSplit);

export const exerciseMatchesHistorySplits = (exercise, selectedSplits, workouts = []) => {
  if (isHistorySplitFilterAll(selectedSplits)) {
    return true;
  }

  const exerciseSplit = getSplitForExercise(exercise, workouts);
  return selectedSplits.includes(exerciseSplit);
};

export const isWithinLastHours = (createdAt, hours) => {
  const date = timestampToDate(createdAt);
  if (!date) return true;
  const ageMs = Date.now() - date.getTime();
  return ageMs >= 0 && ageMs <= hours * 60 * 60 * 1000;
};

export const calculateVolume = (workout) => {
  if (!workout || !Array.isArray(workout.sets)) return 0;

  const weights = Array.isArray(workout.weights) && workout.weights.length > 0
    ? workout.weights
    : workout.sets.map(() => Number(workout.weight) || 0);

  return workout.sets.reduce((total, reps, index) => {
    const repCount = Number(reps) || 0;
    const setWeight = weights[index] !== undefined ? Number(weights[index]) : 0;
    return total + repCount * setWeight;
  }, 0);
};
