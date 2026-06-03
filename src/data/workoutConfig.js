export const USERS = ["ryan", "tuna"];
export const VARIATIONS = ["Incline", "Decline", "Unilateral"];
export const HISTORY_FILTERS = ["All", "Standard", ...VARIATIONS];
export const EQUIPMENT = ["Barbell", "Dumbbell", "Cable", "Machine", "Smith Machine"];
export const TRACKER_SPLITS = ["Upper", "Push", "Pull", "Legs", "Core"];
export const TEMPLATE_SPLITS = ["Push", "Pull", "Legs", "Upper", "Core"];
export const PRIMARY_SPLITS = ["Push", "Pull", "Legs", "Core"];

export const EXERCISE_MAP = {
  Push: [
    "Bench Press",
    "Shoulder Press",
    "Fly",
    "Bottom Up Fly",
    "Lateral Raise",
    "Tricep Pushdown",
    "Overhead Tricep Extension",
  ],
  Pull: [
    "Pull Up",
    "Lat Pulldown",
    "Lat Pullover",
    "Row",
    "T-Bar Row",
    "Rear Delt Fly",
    "Bicep Curl",
    "Hammer Curl",
  ],
  Legs: [
    "Squat",
    "Hack Squat",
    "Deadlift",
    "Romanian Deadlift",
    "Leg Press",
    "Hip Thrust",
    "Leg Curl",
    "Leg Extension",
    "Calf Raise",
    "Seated Calf Raise",
  ],
  Upper: [
    "Bench Press",
    "Shoulder Press",
    "Fly",
    "Bottom Up Fly",
    "Lateral Raise",
    "Tricep Pushdown",
    "Overhead Tricep Extension",
    "Pull Up",
    "Lat Pulldown",
    "Lat Pullover",
    "Row",
    "T-Bar Row",
    "Rear Delt Fly",
    "Bicep Curl",
    "Hammer Curl",
  ],
  Core: [
    "Cable Crunch",
    "Hanging Leg Raise",
    "Captain's Chair",
    "Ab Crunch Machine",
    "Plank",
    "Side Plank",
    "Pallof Press",
    "Russian Twist",
    "Back Extension",
  ],
};

export const EXERCISE_CATEGORY = Object.entries(EXERCISE_MAP).reduce(
  (acc, [split, exercises]) => {
    if (PRIMARY_SPLITS.includes(split)) {
      exercises.forEach((exercise) => {
        acc[exercise] = split;
      });
    }

    return acc;
  },
  {}
);

export const ALL_EXERCISES = Array.from(new Set(Object.values(EXERCISE_MAP).flat())).sort();
