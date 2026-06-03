import { EXERCISE_CATEGORY } from "../data/workoutConfig";

export const emptyForm = {
  split: "",
  exercise: "",
  customExercise: "",
  equipment: "",
  weight: "",
  variations: [],
  sets: ["", "", "", ""],
  notes: "",
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

export const formatDate = (createdAt) =>
  createdAt?.seconds ? new Date(createdAt.seconds * 1000).toLocaleDateString() : "No date";

export const getLocalDateKey = (date) => {
  const year = date.getFullYear();
  const month = String(date.getMonth() + 1).padStart(2, "0");
  const day = String(date.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
};

export const getDateKey = (createdAt) => {
  if (!createdAt?.seconds) return "";
  return getLocalDateKey(new Date(createdAt.seconds * 1000));
};

export const getSplitForWorkout = (workout) =>
  EXERCISE_CATEGORY[workout.exercise] || workout.split || "Other";

export const isWithinLastHours = (createdAt, hours) => {
  if (!createdAt?.seconds) return false;
  const ageMs = Date.now() - createdAt.seconds * 1000;
  return ageMs >= 0 && ageMs <= hours * 60 * 60 * 1000;
};
