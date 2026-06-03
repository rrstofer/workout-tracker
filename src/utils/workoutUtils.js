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

export const isWithinLastHours = (createdAt, hours) => {
  const date = timestampToDate(createdAt);
  if (!date) return true;
  const ageMs = Date.now() - date.getTime();
  return ageMs >= 0 && ageMs <= hours * 60 * 60 * 1000;
};
