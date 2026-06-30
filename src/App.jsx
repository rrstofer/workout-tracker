import { useEffect, useMemo, useState } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  updateDoc,
  orderBy,
  query,
  serverTimestamp,
  deleteDoc,
  doc,
  onSnapshot,
  where,
} from "firebase/firestore";
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";
// import { importCSV } from "./importWorkouts";
import {
  ALL_EXERCISES,
  EQUIPMENT,
  EXERCISE_MAP,
  PRIMARY_SPLITS,
  TEMPLATE_SPLITS,
  TRACKER_SPLITS,
  VARIATIONS,
} from "./data/workoutConfig";
import { ChartTooltip } from "./components/ChartTooltip";
import { LoginPage } from "./components/LoginPage";
import { TrackerSidePanel } from "./components/TrackerSidePanel";
import { Toast } from "./components/Toast";
import { UserSwitcher } from "./components/UserSwitcher";
import { HistoryFilters } from "./components/HistoryFilters";
import { useAuth } from "./context/useAuth";
import { useLocalStorage } from "./hooks/useLocalStorage";
import {
  calculateVolume,
  emptyForm,
  formatDate,
  formatPacificTime,
  getChartMetricTitle,
  getDateKey,
  getLocalDateKey,
  getPlateBreakdown,
  getSplitForExercise,
  getSplitForWorkout,
  isBarbellEquipment,
  isHistorySplitFilterAll,
  isWithinLastHours,
  matchesHistorySplitFilter,
  normalizeVariations,
  supportsBaseWeight,
  titleCaseUser,
} from "./utils/workoutUtils";

const workoutsRef = collection(db, "workouts");

export default function App() {
  const { authUser, userProfile, loading, signOut, isAdmin } = useAuth();
  const [activeView, setActiveView] = useLocalStorage("workoutTracker.activeView", "Tracker");
  const [viewedUsername, setViewedUsername] = useLocalStorage("workoutTracker.viewedUsername", null);
  const ownerUsername = userProfile?.username || "";
  const user =
    isAdmin && viewedUsername && viewedUsername !== ownerUsername
      ? viewedUsername
      : ownerUsername;
  const [workouts, setWorkouts] = useState([]);

  const [formDrafts, setFormDrafts] = useLocalStorage("workoutTracker.formDrafts", {});
  const [progressExercise, setProgressExercise] = useLocalStorage(
    "workoutTracker.progressExercise",
    ""
  );
  const [progressEquipment, setProgressEquipment] = useLocalStorage(
    "workoutTracker.progressEquipment",
    ""
  );
  const [progressVariations, setProgressVariations] = useLocalStorage(
    "workoutTracker.progressVariations",
    []
  );
  const [progressMetric, setProgressMetric] = useLocalStorage(
    "workoutTracker.progressMetric",
    "weight"
  );
  const [templateSplit, setTemplateSplit] = useLocalStorage("workoutTracker.templateSplit", "Push");
  const [selectedHistoryVariationFilters, setSelectedHistoryVariationFilters] = useLocalStorage(
    "workoutTracker.historyFilters",
    []
  );
  const [selectedHistoryExercise, setSelectedHistoryExercise] = useLocalStorage(
    "workoutTracker.selectedHistoryExercise",
    ""
  );
  const [historySortOrder, setHistorySortOrder] = useLocalStorage(
    "workoutTracker.historySortOrder",
    "newest"
  );
  const [selectedHistorySplits, setSelectedHistorySplits] = useLocalStorage(
    "workoutTracker.selectedHistorySplits",
    []
  );
  const [confirmDelete, setConfirmDelete] = useState(null);
  const [selectedHeatmapDay, setSelectedHeatmapDay] = useState(null);
  const [selectedPrPopup, setSelectedPrPopup] = useState(null);
  const [statsNow, setStatsNow] = useState(() => Date.now());
  const [editingWorkoutId, setEditingWorkoutId] = useLocalStorage(
    "workoutTracker.editingWorkoutId",
    null
  );
  const [toastMessage, setToastMessage] = useState("");

  const formDraft = formDrafts[user] || emptyForm;
  const setFormDraft = (updater) => {
    setFormDrafts((current) => {
      const currentDraft = current[user] || emptyForm;
      const nextDraft = typeof updater === "function" ? updater(currentDraft) : updater;

      return {
        ...current,
        [user]: nextDraft,
      };
    });
  };
  const {
    split,
    exercise,
    customExercise,
    equipment,
    weight,
    barWeight,
    baseWeight,
    showLoadOptions,
    variations,
    sets,
    notes,
    perSetWeights,
    setWeights,
  } = formDraft;

  useEffect(() => {
    if (!user) {
      return undefined;
    }

    const q = query(workoutsRef, where("user", "==", user), orderBy("createdAt", "desc"));

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((workoutDoc) => {
        const workout = workoutDoc.data();

        return {
          id: workoutDoc.id,
          ...workout,
          variations: normalizeVariations(workout.variations),
        };
      });

      setWorkouts(data);
    });

    return () => unsubscribe();
  }, [user]);

  useEffect(() => {
    const intervalId = window.setInterval(() => {
      setStatsNow(Date.now());
    }, 60000);

    return () => window.clearInterval(intervalId);
  }, []);

  const availableExercises = EXERCISE_MAP[split] || [];
  const resolvedExercise = exercise === "__custom__" ? customExercise.trim() : exercise;
  const isBarbell = isBarbellEquipment(equipment);
  const hasBaseWeightOption = supportsBaseWeight(equipment);
  const effectiveBarWeight = showLoadOptions && isBarbell && barWeight !== "" ? Number(barWeight) : 45;
  const effectiveBaseWeight = showLoadOptions && hasBaseWeightOption ? Number(baseWeight) || 0 : 0;
  const displayedWeight = Number(weight) || 0;
  const totalWorkingWeight = displayedWeight + effectiveBaseWeight;
  const plateBreakdown = getPlateBreakdown(displayedWeight, effectiveBarWeight);
  const selectableExercises = useMemo(
    () =>
      Array.from(new Set([...ALL_EXERCISES, ...workouts.map((workout) => workout.exercise)]))
        .filter(Boolean)
        .sort(),
    [workouts]
  );

  const userStats = useMemo(() => {
    const sevenDaysAgo = statsNow - 7 * 86400000;
    const fourteenDaysAgo = statsNow - 14 * 86400000;

    let currentCount = 0;
    let previousCount = 0;
    let currentVolume = 0;
    let previousVolume = 0;

    const getWorkoutTime = (workout) =>
      workout.createdAt?.toDate?.().getTime() ?? (workout.createdAt?.seconds || 0) * 1000;

    for (const workout of workouts) {
      const workoutTime = getWorkoutTime(workout);
      if (!workoutTime) continue;

      if (workoutTime >= sevenDaysAgo) {
        currentCount++;
        currentVolume += calculateVolume(workout);
      } else if (workoutTime >= fourteenDaysAgo) {
        previousCount++;
        previousVolume += calculateVolume(workout);
      }
    }

    // PR detection: find all PRs in the last 14 days
    const maxWeightByExercise = {};
    const chronologicalWorkouts = [...workouts].sort(
      (a, b) => getWorkoutTime(a) - getWorkoutTime(b)
    );

    const prDetails = [];

    for (const workout of chronologicalWorkouts) {
      const workoutTime = getWorkoutTime(workout);
      const workoutWeight = Number(workout.weight);
      if (!workout.exercise || !workoutTime || !Number.isFinite(workoutWeight)) continue;

      const previousMax = maxWeightByExercise[workout.exercise];
      if (previousMax !== undefined && workoutWeight > previousMax && workoutTime >= fourteenDaysAgo) {
        prDetails.push({
          exercise: workout.exercise,
          weight: workoutWeight,
          date: formatDate(workout.createdAt),
        });
      }

      maxWeightByExercise[workout.exercise] =
        previousMax === undefined ? workoutWeight : Math.max(previousMax, workoutWeight);
    }

    const sessionTrend = currentCount > previousCount ? "up" : currentCount < previousCount ? "down" : "same";
    const volumeTrend = currentVolume > previousVolume ? "up" : currentVolume < previousVolume ? "down" : "same";

    return {
      total: workouts.length,
      currentSessions: currentCount,
      sessionTrend,
      prs: prDetails.length,
      prDetails,
      currentVolume,
      volumeTrend,
      lastWorkout: workouts[0],
    };
  }, [statsNow, workouts]);

  const lastWorkout = useMemo(() => {
    if (!resolvedExercise || !equipment) return null;

    return (
      workouts.find((workout) => {
        const workoutVariations = normalizeVariations(workout.variations);
        const sameVariations =
          workoutVariations.length === variations.length &&
          variations.every((variation) => workoutVariations.includes(variation));

        return (
          workout.exercise === resolvedExercise &&
          workout.equipment === equipment &&
          sameVariations
        );
      }) || null
    );
    }, [equipment, resolvedExercise, variations, workouts]);

    const trackerProgressData = useMemo(() => {
    if (!resolvedExercise || !equipment) return [];

    return workouts
      .filter((workout) => {
        if (workout.exercise !== resolvedExercise) return false;
        if (workout.equipment !== equipment) return false;

        const workoutVariations = normalizeVariations(workout.variations);

        return variations.every((variation) =>
          workoutVariations.includes(variation)
        );
      })
      .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
      .map((workout) => ({
        date: formatDate(workout.createdAt),
        weight: Number(workout.weight) || 0,
        volume: calculateVolume(workout),
        reps: Array.isArray(workout.sets) ? workout.sets.join(" / ") : "",
      }));
  }, [
    workouts,
    resolvedExercise,
    equipment,
    variations,
  ]);

  const heatmapDays = useMemo(() => {
    const countsByDay = workouts.reduce((acc, workout) => {
      const key = getDateKey(workout.createdAt);
      if (!key) return acc;
      acc[key] = (acc[key] || 0) + 1;
      return acc;
    }, {});

    return Array.from({ length: 30 }, (_, index) => {
      const date = new Date();
      date.setHours(0, 0, 0, 0);
      date.setDate(date.getDate() - (29 - index));
      const key = getLocalDateKey(date);

      return {
        key,
        label: date.toLocaleDateString(undefined, { month: "short", day: "numeric" }),
        count: countsByDay[key] || 0,
      };
    });
  }, [workouts]);

  const progressEquipmentOptions = useMemo(() => {
    if (!progressExercise) return [];

    return Array.from(
      new Set(
        workouts
          .filter((workout) => workout.exercise === progressExercise && workout.equipment)
          .map((workout) => workout.equipment)
      )
    ).sort();
  }, [progressExercise, workouts]);

  const selectedProgressEquipment =
    progressEquipmentOptions.includes(progressEquipment)
      ? progressEquipment
      : progressEquipmentOptions[0] || "";

  const templateRecommendations = useMemo(() => {
    const sessions = workouts.reduce((acc, workout) => {
      const dateKey = getDateKey(workout.createdAt);
      if (!dateKey) return acc;

      const workoutSplit = getSplitForWorkout(workout);
      const isMatch = workout.split === templateSplit || workoutSplit === templateSplit;
      if (!isMatch) return acc;

      if (!acc[dateKey]) acc[dateKey] = [];
      acc[dateKey].push(workout);
      return acc;
    }, {});

    const exerciseStats = Object.values(sessions).reduce((acc, sessionWorkouts) => {
      sessionWorkouts
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
        .forEach((workout, index) => {
          if (!acc[workout.exercise]) {
            acc[workout.exercise] = {
              exercise: workout.exercise,
              count: 0,
              orderTotal: 0,
              equipmentCounts: {},
            };
          }

          acc[workout.exercise].count += 1;
          acc[workout.exercise].orderTotal += index;
          acc[workout.exercise].equipmentCounts[workout.equipment] =
            (acc[workout.exercise].equipmentCounts[workout.equipment] || 0) + 1;
        });

      return acc;
    }, {});

    return Object.values(exerciseStats)
      .map((item) => ({
        ...item,
        averageOrder: item.orderTotal / item.count,
        equipment:
          Object.entries(item.equipmentCounts).sort((a, b) => b[1] - a[1])[0]?.[0] || "",
      }))
      .sort((a, b) => a.averageOrder - b.averageOrder || b.count - a.count)
      .slice(0, 8);
  }, [templateSplit, workouts]);

  const progressData = useMemo(
    () =>
      workouts
        .filter((workout) => {
          if (!progressExercise || workout.exercise !== progressExercise) return false;
          if (
            progressEquipmentOptions.length > 0 &&
            workout.equipment !== selectedProgressEquipment
          ) {
            return false;
          }

          const workoutVariations = normalizeVariations(workout.variations);

          return progressVariations.every((variation) =>
            workoutVariations.includes(variation)
          );
        })
        .sort((a, b) => (a.createdAt?.seconds || 0) - (b.createdAt?.seconds || 0))
        .map((workout) => ({
          date: formatDate(workout.createdAt),
          weight: Number(workout.weight) || 0,
          volume: calculateVolume(workout),
          reps: Array.isArray(workout.sets) ? workout.sets.join(" / ") : "",
          notes: workout.notes || "",
        })),
    [
      progressEquipmentOptions.length,
      progressExercise,
      progressVariations,
      selectedProgressEquipment,
      workouts,
    ]
  );

  const filteredGroupedHistory = useMemo(() => {
    const matchesFilters = (workout) => {
      // Check variation filters
      if (selectedHistoryVariationFilters.length > 0) {
        const workoutVariations = normalizeVariations(workout.variations);
        const hasValidVariation = selectedHistoryVariationFilters.every((filter) => {
          if (filter === "Standard") return workoutVariations.length === 0;
          return workoutVariations.includes(filter);
        });
        if (!hasValidVariation) return false;
      }

      // Check exercise filter
      if (selectedHistoryExercise.trim() !== "") {
        if (workout.exercise !== selectedHistoryExercise) return false;
      }

      const workoutSplit = getSplitForWorkout(workout);

      if (!matchesHistorySplitFilter(workoutSplit, selectedHistorySplits)) {
        return false;
      }

      return true;
    };

    const filtered = workouts.filter(matchesFilters);

    // Sort by date
    const sorted = filtered.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;
      return historySortOrder === "newest" ? bTime - aTime : aTime - bTime;
    });

    // Group by split then exercise, only including non-empty splits
    return sorted.reduce((acc, workout) => {
      const workoutSplit = getSplitForWorkout(workout);
      if (!acc[workoutSplit]) acc[workoutSplit] = {};
      if (!acc[workoutSplit][workout.exercise]) acc[workoutSplit][workout.exercise] = [];

      acc[workoutSplit][workout.exercise].push(workout);
      return acc;
    }, {});
  }, [selectedHistoryVariationFilters, selectedHistoryExercise, historySortOrder, selectedHistorySplits, workouts]);

  const availableVariations = useMemo(() => {
    if (!selectedHistoryExercise.trim()) {
      return [];
    }

    return [
      ...new Set(
        workouts
          .filter(
            (workout) =>
              workout.exercise === selectedHistoryExercise
          )
          .flatMap((workout) => {
            const variations = normalizeVariations(
              workout.variations
            );

            return variations.length
              ? variations
              : ["Standard"];
          })
      ),
    ];
  }, [workouts, selectedHistoryExercise]);

  const historyTimeline = useMemo(() => {
    if (!selectedHistoryExercise.trim()) {
      return [];
    }

    const filtered = workouts.filter((workout) => {
      if (workout.exercise !== selectedHistoryExercise) {
        return false;
      }

      if (selectedHistoryVariationFilters.length > 0) {
        const workoutVariations = normalizeVariations(
          workout.variations
        );

        const hasValidVariation =
          selectedHistoryVariationFilters.every((filter) => {
            if (filter === "Standard") {
              return workoutVariations.length === 0;
            }

            return workoutVariations.includes(filter);
          });

        if (!hasValidVariation) {
          return false;
        }
      }

      return matchesHistorySplitFilter(getSplitForWorkout(workout), selectedHistorySplits);
    });

    return filtered.sort((a, b) => {
      const aTime = a.createdAt?.seconds || 0;
      const bTime = b.createdAt?.seconds || 0;

      return historySortOrder === "newest"
        ? bTime - aTime
        : aTime - bTime;
    });
  }, [
    workouts,
    selectedHistoryExercise,
    selectedHistoryVariationFilters,
    selectedHistorySplits,
    historySortOrder,
  ]);

  const recentWorkouts = useMemo(
    () => workouts.filter((workout) => isWithinLastHours(workout.createdAt, 24)),
    [workouts]
  );

  useEffect(() => {
    if (!toastMessage) return undefined;

    const timeoutId = window.setTimeout(() => setToastMessage(""), 2800);
    return () => window.clearTimeout(timeoutId);
  }, [toastMessage]);

  const updateDraftField = (field, value) => {
    setFormDraft((current) => ({
      ...current,
      [field]: value,
      ...(field === "equipment" && !isBarbellEquipment(value) ? { barWeight: "45" } : {}),
      ...(field === "equipment" && !supportsBaseWeight(value) ? { baseWeight: "" } : {}),
    }));
  };

  const toggleDraftVariation = (variation) => {
    setFormDraft((current) => ({
      ...current,
      variations: current.variations.includes(variation)
        ? current.variations.filter((item) => item !== variation)
        : [...current.variations, variation],
    }));
  };

  const handleViewUser = (username) => {
    setViewedUsername(username);
    setConfirmDelete(null);
    setEditingWorkoutId(null);
  };

  const handleSignOut = async () => {
    setViewedUsername(null);
    setConfirmDelete(null);
    setEditingWorkoutId(null);
    await signOut();
  };

  const toggleArrayValue = (value, setter) => {
    setter((current) =>
      current.includes(value)
        ? current.filter((item) => item !== value)
        : [...current, value]
    );
  };

  const toggleHistoryVariationFilter = (filter) => {
    if (filter === "All") {
      setSelectedHistoryVariationFilters([]);
      return;
    }

    setSelectedHistoryVariationFilters((current) => {
      if (filter === "Standard") {
        return current.includes("Standard") ? [] : ["Standard"];
      }

      const withoutStandard = current.filter((item) => item !== "Standard");

      return withoutStandard.includes(filter)
        ? withoutStandard.filter((item) => item !== filter)
        : [...withoutStandard, filter];
    });
  };

  const openHistoryExerciseDetail = (workoutSplit, workoutExercise) => {
    setSelectedHistorySplits([workoutSplit]);
    setSelectedHistoryExercise(workoutExercise);
  };

  const backToHistoryOverview = () => {
    setSelectedHistoryExercise("");
    setSelectedHistorySplits([]);
    setSelectedHistoryVariationFilters([]);
  };

  const updateSet = (index, value) => {
    setFormDraft((current) => ({
      ...current,
      sets: current.sets.map((item, itemIndex) => (itemIndex === index ? value : item)),
    }));
  };

  const resetForm = () => {
    setFormDraft(emptyForm);
    setEditingWorkoutId(null);
  };

  const addWorkout = async (event) => {
    event.preventDefault();

    if (perSetWeights) {
      for (let i = 0; i < 4; i++) {
        const hasReps = sets[i] !== "";
        const hasWeight = setWeights[i] !== "";
        if (hasReps && !hasWeight) {
          setToastMessage(`Set ${i + 1} needs a weight`);
          return;
        }
        if (hasWeight && !hasReps) {
          setToastMessage(`Set ${i + 1} needs reps`);
          return;
        }
      }
    }

    if ((isBarbell && Number(effectiveBarWeight) < 0) || effectiveBaseWeight < 0) {
      setToastMessage("Base weights cannot be negative");
      return;
    }

    const completedSets = sets.filter((set) => set !== "").map(Number);
    const loadedSetWeights = setWeights
      .slice(0, completedSets.length)
      .map((w) => (w !== "" ? Number(w) : Number(weight)));
    const completedSetWeights = loadedSetWeights.map((setWeight) => setWeight + effectiveBaseWeight);
    const savedWeight = Number(weight) + effectiveBaseWeight;

    const hasDifferentWeights =
      perSetWeights &&
      completedSetWeights.some((w) => w !== savedWeight);

    const workoutPayload = {
      user,
      split,
      exercise: resolvedExercise,
      equipment,
      variations,
      weight: savedWeight,
      sets: completedSets,
      notes,
    };

    if (isBarbell && Number(effectiveBarWeight) !== 45) {
      workoutPayload.barWeight = Number(effectiveBarWeight);
    }

    if (hasBaseWeightOption && effectiveBaseWeight > 0) {
      workoutPayload.baseWeight = effectiveBaseWeight;
      workoutPayload.loadWeight = Number(weight);
    }

    if (hasDifferentWeights) {
      workoutPayload.weights = completedSetWeights;
      if (hasBaseWeightOption && effectiveBaseWeight > 0) {
        workoutPayload.loadWeights = loadedSetWeights;
      }
    }

    if (editingWorkoutId) {
      await updateDoc(doc(db, "workouts", editingWorkoutId), {
        ...workoutPayload,
        updatedAt: serverTimestamp(),
      });
      setToastMessage("Workout updated");
    } else {
      await addDoc(workoutsRef, {
        ...workoutPayload,
        createdAt: serverTimestamp(),
      });
      setToastMessage("Workout logged");
    }

    resetForm();
  };

  const applyTemplateRecommendation = (recommendation) => {
    const isListedExercise = EXERCISE_MAP[templateSplit]?.includes(recommendation.exercise);

    setFormDraft((current) => ({
      ...current,
      split: templateSplit,
      exercise: isListedExercise ? recommendation.exercise : "__custom__",
      customExercise: isListedExercise ? "" : recommendation.exercise,
      equipment: recommendation.equipment,
      variations: [],
    }));
    setActiveView("Tracker");
  };

  const editWorkout = (workout) => {
    const splitForWorkout = workout.split || getSplitForWorkout(workout);
    const isListedExercise = EXERCISE_MAP[splitForWorkout]?.includes(workout.exercise);

    const hasSavedWeights = Array.isArray(workout.weights) && workout.weights.length > 0;
    const savedBaseWeight = Number(workout.baseWeight) || 0;

    setFormDraft({
      split: splitForWorkout === "Other" ? "Core" : splitForWorkout,
      exercise: isListedExercise ? workout.exercise : "__custom__",
      customExercise: isListedExercise ? "" : workout.exercise,
      equipment: workout.equipment || "",
      weight:
        workout.loadWeight !== undefined
          ? String(workout.loadWeight)
          : workout.weight
            ? String(workout.weight)
            : "",
      barWeight: workout.barWeight ? String(workout.barWeight) : "45",
      baseWeight: workout.baseWeight ? String(workout.baseWeight) : "",
      showLoadOptions: Boolean(workout.barWeight || workout.baseWeight || workout.loadWeight),
      variations: normalizeVariations(workout.variations),
      sets: Array.from({ length: 4 }, (_, index) =>
        workout.sets?.[index] === undefined ? "" : String(workout.sets[index])
      ),
      notes: workout.notes || "",
      perSetWeights: hasSavedWeights,
      setWeights: hasSavedWeights
        ? Array.from({ length: 4 }, (_, index) =>
            workout.loadWeights?.[index] !== undefined
              ? String(workout.loadWeights[index])
              : workout.weights?.[index] !== undefined
                ? String(Number(workout.weights[index]) - savedBaseWeight)
              : ""
          )
        : ["", "", "", ""],
    });
    setEditingWorkoutId(workout.id);
    setActiveView("Tracker");
    setToastMessage("Editing recent workout");
  };

  const deleteWorkout = async (id) => {
    await deleteDoc(doc(db, "workouts", id));
    setConfirmDelete(null);
    if (editingWorkoutId === id) resetForm();
    setToastMessage("Workout deleted");
  };

  if (loading) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">Workout log</p>
          <h1>Loading your session...</h1>
        </section>
      </main>
    );
  }

  if (!authUser) {
    return <LoginPage />;
  }

  if (!ownerUsername) {
    return (
      <main className="auth-shell">
        <section className="auth-panel">
          <p className="eyebrow">Workout log</p>
          <h1>Profile setup incomplete</h1>
          <p className="auth-copy">
            We could not load your profile. Try signing out and back in.
          </p>
          <button className="primary-button" type="button" onClick={handleSignOut}>
            Sign out
          </button>
        </section>
      </main>
    );
  }

  const isViewingOtherProfile =
    isAdmin && viewedUsername && viewedUsername !== ownerUsername;

  return (
    <main className="app-shell">
      <Toast message={toastMessage} />
      {isViewingOtherProfile && (
        <div className="admin-view-banner" role="status">
          Viewing <strong>{titleCaseUser(user)}</strong>&apos;s workouts as admin.
        </div>
      )}
      <section className="topbar">
        <div>
          <p className="eyebrow">Workout Tracker App</p>
          <h1>頑張れ！</h1>
        </div>

        <UserSwitcher
          currentUsername={ownerUsername}
          viewedUsername={isViewingOtherProfile ? viewedUsername : null}
          isAdmin={isAdmin}
          onViewUser={handleViewUser}
          onSignOut={handleSignOut}
          signedInLabel={titleCaseUser(ownerUsername)}
        />
      </section>

      <section className="stats-grid">
        <div className="stat-card">
          <span>Sessions (7d)</span>
          <strong>
            {userStats.currentSessions}
            {userStats.sessionTrend === "up" && <span className="trend-arrow trend-up"> ↑</span>}
            {userStats.sessionTrend === "down" && <span className="trend-arrow trend-down"> ↓</span>}
            {userStats.sessionTrend === "same" && <span className="trend-arrow trend-same"> —</span>}
          </strong>
        </div>
        <div className="stat-card" role="button" tabIndex={0} onClick={() => setSelectedPrPopup(userStats.prDetails)} onKeyDown={(e) => { if (e.key === "Enter" || e.key === " ") setSelectedPrPopup(userStats.prDetails); }}>
          <span>PRs (14d)</span>
          <strong>{userStats.prs}</strong>
        </div>
        <div className="stat-card">
          <span>Volume (7d)</span>
          <strong>
            {userStats.currentVolume.toLocaleString()} lbs
            {userStats.volumeTrend === "up" && <span className="trend-arrow trend-up"> ↑</span>}
            {userStats.volumeTrend === "down" && <span className="trend-arrow trend-down"> ↓</span>}
            {userStats.volumeTrend === "same" && <span className="trend-arrow trend-same"> —</span>}
          </strong>
        </div>
      </section>

      <section className="heatmap-panel" aria-label="Last 30 days workout heatmap">
        <div>
          <p className="eyebrow">Last 30 days</p>
          <h2>Training rhythm</h2>
        </div>
        <div className="heatmap-grid">
          {heatmapDays.map((day) => (
            <span
            aria-label={`${day.label}: ${day.count} workout${day.count === 1 ? "" : "s"}`}
            className={`heatmap-day level-${Math.min(day.count, 4)}`}
            key={day.key}
            onClick={() => setSelectedHeatmapDay(day)}
            role="button"
            tabIndex={0}
            onKeyDown={(e) => {
              if (e.key === "Enter") setSelectedHeatmapDay(day);
            }}
          />
          ))}
        </div>
      </section>

      {selectedHeatmapDay && (
        <div className="heatmap-popup" onClick={() => setSelectedHeatmapDay(null)}>
          <div
            className="heatmap-popup-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <strong>{selectedHeatmapDay.label}</strong>
            <p>
              {selectedHeatmapDay.count} workout
              {selectedHeatmapDay.count === 1 ? "" : "s"}
            </p>

            <button onClick={() => setSelectedHeatmapDay(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      {selectedPrPopup && (
        <div className="heatmap-popup" onClick={() => setSelectedPrPopup(null)}>
          <div
            className="heatmap-popup-inner"
            onClick={(e) => e.stopPropagation()}
          >
            <strong>PRs (last 14 days)</strong>
            {selectedPrPopup.length > 0 ? (
              <ul className="pr-list">
                {selectedPrPopup.map((pr, index) => (
                  <li key={index}>
                    {pr.exercise} — {pr.weight} lbs on {pr.date}
                  </li>
                ))}
              </ul>
            ) : (
              <p className="muted">No PRs in the last 14 days.</p>
            )}
            <button onClick={() => setSelectedPrPopup(null)}>
              Close
            </button>
          </div>
        </div>
      )}

      <nav className="tabbar" aria-label="App sections">
        {["Tracker", "Progress", "History", "Templates", "Settings"].map((view) => (
          <button
            className={activeView === view ? "active" : ""}
            key={view}
            type="button"
            onClick={() => setActiveView(view)}
          >
            {view}
          </button>
        ))}
      </nav>

      {activeView === "Tracker" && (
        <section className="workspace two-column">
          <form className="panel tracker-form" onSubmit={addWorkout}>
            <div className="panel-heading">
              <div>
                <p className="eyebrow">New session</p>
                <h2>Log a lift</h2>
              </div>
              <button className="ghost-button" type="button" onClick={resetForm}>
                Clear
              </button>
            </div>

            <div className="field-grid">
              <label>
                <span>Split</span>
                <select
                  value={split}
                  onChange={(event) => {
                    setFormDraft((current) => ({
                      ...current,
                      split: event.target.value,
                      exercise: "",
                      customExercise: "",
                    }));
                  }}
                  required
                >
                  <option value="">Choose split</option>
                  {TRACKER_SPLITS.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Exercise</span>
                <select
                  value={exercise}
                  onChange={(event) => updateDraftField("exercise", event.target.value)}
                  disabled={!split}
                  required
                >
                  <option value="">Choose exercise</option>
                  {availableExercises.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                  <option value="__custom__">Custom exercise</option>
                </select>
              </label>

              {exercise === "__custom__" && (
                <label>
                  <span>Custom name</span>
                  <input
                    placeholder="Abs, carries, mobility, or anything else"
                    type="text"
                    value={customExercise}
                    onChange={(event) => updateDraftField("customExercise", event.target.value)}
                    required
                  />
                </label>
              )}

              <label>
                <span>Equipment</span>
                <select
                  value={equipment}
                  onChange={(event) => updateDraftField("equipment", event.target.value)}
                  required
                >
                  <option value="">Choose equipment</option>
                  {EQUIPMENT.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="chip-group" aria-label="Exercise attributes">
              {VARIATIONS.map((variation) => (
                <button
                  className={variations.includes(variation) ? "chip active" : "chip"}
                  key={variation}
                  type="button"
                  onClick={() => toggleDraftVariation(variation)}
                >
                  {variation}
                </button>
              ))}
            </div>

            <div className="field-grid">
              <label>
                <span>{hasBaseWeightOption && effectiveBaseWeight > 0 ? "Loaded weight" : "Weight"}</span>
                <input
                  placeholder={lastWorkout?.weight ? `Last: ${lastWorkout.weight} lbs` : "Weight"}
                  type="number"
                  value={weight}
                  onChange={(event) => updateDraftField("weight", event.target.value)}
                  required
                />
              </label>
            </div>
            
            <div className="per-weight-section">
            <div className="per-weight-actions">  
              <div className="chip-group" aria-label="Per-set weight options">
                <button
                  className={perSetWeights ? "chip active" : "chip"}
                  type="button"
                  onClick={() =>
                    setFormDraft((current) => ({
                        ...current,
                        perSetWeights: !current.perSetWeights,
                        setWeights: !current.perSetWeights
                        ? current.sets.map((s) => (s !== "" ? current.weight || "" : ""))
                        : ["", "", "", ""],
                    }))
                  }
                >
                  Per-set weights
                </button>
              </div>
          </div>

            {(isBarbell || hasBaseWeightOption) && (
              <div className="chip-group" aria-label="Load calculation options">
                <button
                  className={showLoadOptions ? "chip active" : "chip"}
                  type="button"
                  onClick={() =>
                    setFormDraft((current) => ({
                      ...current,
                      showLoadOptions: !current.showLoadOptions,
                      ...(!current.showLoadOptions ? {} : { barWeight: "45", baseWeight: "" }),
                    }))
                  }
                >
                  Load math
                </button>
              </div>
            )}

            {showLoadOptions && isBarbell && (
              <div className="load-helper">
                <label>
                  <span>Bar weight</span>
                  <input
                    inputMode="decimal"
                    min="0"
                    placeholder="45"
                    type="number"
                    value={barWeight}
                    onChange={(event) => updateDraftField("barWeight", event.target.value)}
                  />
                </label>
                <div className="load-result">
                  <span>Plates per side</span>
                  <strong>{plateBreakdown.message}</strong>
                  {!plateBreakdown.isLoadable && displayedWeight > 0 && (
                    <small className="muted">
                      Needs {Math.abs(plateBreakdown.remaining).toLocaleString()} lb more per side.
                    </small>
                  )}
                </div>
              </div>
            )}

            {showLoadOptions && hasBaseWeightOption && (
              <div className="load-helper">
                <label>
                  <span>Starting weight</span>
                  <input
                    inputMode="decimal"
                    min="0"
                    placeholder="0"
                    type="number"
                    value={baseWeight}
                    onChange={(event) => updateDraftField("baseWeight", event.target.value)}
                  />
                </label>
                <div className="load-result">
                  <span>Total working weight</span>
                  <strong>{totalWorkingWeight.toLocaleString()} lbs</strong>
                  <small className="muted">
                    Saved as {displayedWeight.toLocaleString()} + {effectiveBaseWeight.toLocaleString()}.
                  </small>
                </div>
              </div>
            )}
            </div>

            <div className="sets-grid">
              {sets.map((setValue, index) => (
                <label
                  key={`set-${index + 1}`}
                  className={perSetWeights ? "set-row-per-weight" : ""}
                >
                  <span>Set {index + 1}</span>
                  {perSetWeights && (
                    <input
                      className="set-weight-input"
                      placeholder={weight || (hasBaseWeightOption ? "Loaded" : "Weight")}
                      type="number"
                      value={setWeights[index]}
                      onChange={(event) =>
                        setFormDraft((current) => ({
                          ...current,
                          setWeights: current.setWeights.map((w, wi) =>
                            wi === index ? event.target.value : w
                          ),
                        }))
                      }
                    />
                  )}
                  <input
                    placeholder={
                      lastWorkout?.sets?.[index] ? `Last: ${lastWorkout.sets[index]}` : "Reps"
                    }
                    type="number"
                    value={setValue}
                    onChange={(event) => updateSet(index, event.target.value)}
                  />
                </label>
              ))}
            </div>

            <label>
              <span>Notes</span>
              <textarea
                placeholder={
                  lastWorkout?.notes
                    ? `Last: ${lastWorkout.notes}`
                    : "Tempo, form notes, pain flags, or anything worth remembering"
                }
                value={notes}
                onChange={(event) => updateDraftField("notes", event.target.value)}
              />
              {lastWorkout?.notes && (
                <div className="muted ghost-hint">
                  Last: {lastWorkout.notes}
                </div>
              )}
            </label>

            <button className="primary-button" type="submit">
              {editingWorkoutId ? "Save changes" : "Add workout"}
            </button>
          </form>

          <TrackerSidePanel
            confirmDelete={confirmDelete}
            deleteWorkout={deleteWorkout}
            editWorkout={editWorkout}
            lastWorkout={lastWorkout}
            recentWorkouts={recentWorkouts}
            setConfirmDelete={setConfirmDelete}
            progressData={trackerProgressData}
            resolvedExercise={resolvedExercise}
          />
        </section>
      )}

      {activeView === "Templates" && (
        <section className="workspace">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Templates</p>
                <h2>Recommended order</h2>
              </div>
              <span className="pill">{titleCaseUser(user)}</span>
            </div>

            <div className="template-tabs" aria-label="Template split">
              {TEMPLATE_SPLITS.map((item) => (
                <button
                  className={templateSplit === item ? "active" : ""}
                  key={item}
                  type="button"
                  onClick={() => setTemplateSplit(item)}
                >
                  {item}
                </button>
              ))}
            </div>

            {templateRecommendations.length > 0 ? (
              <div className="template-list">
                {templateRecommendations.map((recommendation, index) => (
                  <article className="template-row" key={recommendation.exercise}>
                    <div className="template-rank">{index + 1}</div>
                    <div>
                      <strong>{recommendation.exercise}</strong>
                      <span>
                        {recommendation.equipment || "Any equipment"} - logged{" "}
                        {recommendation.count} time{recommendation.count === 1 ? "" : "s"}
                      </span>
                    </div>
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => applyTemplateRecommendation(recommendation)}
                    >
                      Use
                    </button>
                  </article>
                ))}
              </div>
            ) : (
              <div className="empty-state template-empty">
                Log a few {templateSplit} workouts and this will learn your usual exercise order.
              </div>
            )}
          </div>
        </section>
      )}

      {activeView === "Progress" && (
        <section className="workspace">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">Progress</p>
                <h2>Exercise trend</h2>
              </div>
              <span className="pill progress-count">{progressData.length} points</span>
            </div>

            <div className="field-grid progress-controls">
              <label>
                <span>Exercise</span>
                <select
                  value={progressExercise}
                  onChange={(event) => setProgressExercise(event.target.value)}
                >
                  <option value="">Choose exercise</option>
                  {selectableExercises.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>

              <label>
                <span>Equipment</span>
                <select
                  value={selectedProgressEquipment}
                  onChange={(event) => setProgressEquipment(event.target.value)}
                  disabled={!progressExercise || progressEquipmentOptions.length === 0}
                >
                  <option value="">
                    {progressExercise ? "No logged equipment yet" : "Choose exercise first"}
                  </option>
                  {progressEquipmentOptions.map((item) => (
                    <option key={item} value={item}>
                      {item}
                    </option>
                  ))}
                </select>
              </label>
            </div>

            <div className="chip-group">
              {VARIATIONS.map((variation) => (
                <button
                  className={progressVariations.includes(variation) ? "chip active" : "chip"}
                  key={variation}
                  type="button"
                  onClick={() => toggleArrayValue(variation, setProgressVariations)}
                >
                  {variation}
                </button>
              ))}
            </div>

            <div className="chart-wrap">
              <div className="chart-heading">
                <span className="chart-metric-label">
                  {getChartMetricTitle(progressMetric)}
                </span>
                <button
                  className={`chart-metric-toggle ${progressMetric === "volume" ? "active" : ""}`}
                  type="button"
                  onClick={() => setProgressMetric(progressMetric === "weight" ? "volume" : "weight")}
                >
                  {progressMetric === "weight" ? "Switch to Volume" : "Switch to Weight"}
                </button>
              </div>
              {progressExercise && progressData.length > 0 ? (
                <ResponsiveContainer>
                  <AreaChart
                    data={progressData}
                    margin={{ top: 8, right: 18, bottom: 22, left: 8 }}
                  >
                    <defs>
                      <linearGradient id="weightGradient" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="0%" stopColor="#67E8F9" stopOpacity={0.78} />
                        <stop offset="45%" stopColor="#A78BFA" stopOpacity={0.38} />
                        <stop offset="100%" stopColor="#34D399" stopOpacity={0.04} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid stroke="#263245" strokeDasharray="3 3" />
                    <XAxis dataKey="date" stroke="#94A3B8" tickLine={false} />
                    <YAxis
                      stroke="#94A3B8"
                      tickLine={false}
                      width={progressMetric === "volume" ? 76 : 52}
                      domain={[0, "dataMax + 1"]}
                    />
                    <Tooltip content={<ChartTooltip metric={progressMetric} />} />
                    <Area
                      type="monotone"
                      dataKey={progressMetric}
                      stroke="#67E8F9"
                      strokeWidth={3}
                      fill="url(#weightGradient)"
                      fillOpacity={1}
                      dot={{ r: 4, fill: "#101827", stroke: "#67E8F9", strokeWidth: 2 }}
                      activeDot={{ r: 6 }}
                    />
                  </AreaChart>
                </ResponsiveContainer>
              ) : (
                <div className="empty-state">
                  {progressExercise
                    ? "No matching data yet for this exercise and filter."
                    : "Choose an exercise to draw the progress chart."}
                </div>
              )}
            </div>
          </div>
        </section>
      )}

      {activeView === "History" && (
        <section className="workspace">
          <div className="panel">
            <div className="panel-heading">
              <div>
                <p className="eyebrow">History</p>
                <h2>Past sessions</h2>
              </div>
            </div>

            <HistoryFilters
              key={selectedHistoryExercise || "all-exercises"}
              selectedSplits={selectedHistorySplits}
              setSelectedSplits={setSelectedHistorySplits}
              selectedExercise={selectedHistoryExercise}
              setSelectedExercise={setSelectedHistoryExercise}
              sortOrder={historySortOrder}
              setSortOrder={setHistorySortOrder}
              selectedVariationFilters={selectedHistoryVariationFilters}
              toggleVariationFilter={toggleHistoryVariationFilter}
              availableVariations={availableVariations}
              workouts={workouts}
            />

            {selectedHistoryExercise ? (
              <>
              <div className="history-detail-header">
                <button
                  className="history-back-btn"
                  type="button"
                  onClick={backToHistoryOverview}
                >
                  ← All exercises
                </button>
                <div className="history-detail-title">
                  <span className="history-detail-split">
                    {isHistorySplitFilterAll(selectedHistorySplits)
                      ? getSplitForExercise(selectedHistoryExercise, workouts)
                      : selectedHistorySplits[0]}
                  </span>
                  <h3>{selectedHistoryExercise}</h3>
                  <p className="muted">
                    {historyTimeline.length} session
                    {historyTimeline.length === 1 ? "" : "s"}
                  </p>
                </div>
              </div>

              <div className="exercise-timeline">
                {historyTimeline.length === 0 ? (
                  <div className="empty-state">
                    No sessions match these filters yet. Try another variation or split type.
                  </div>
                ) : (
                  historyTimeline.map((workout) => {
                    const timelineVariations = normalizeVariations(workout.variations);

                    return (
                  <article
                    className="timeline-item"
                    key={workout.id}
                  >
                    <div className="timeline-marker" />

                    <div className="timeline-card">
                      <span className="muted timeline-date">
                        {formatDate(workout.createdAt)}
                        {" • "}
                        {formatPacificTime(workout.createdAt)} PST
                      </span>

                      <div className="timeline-stats">
                        <h4>
                          {Array.isArray(workout.weights) && workout.weights.length > 0
                            ? `${workout.weights.join(" / ")} lbs`
                            : `${workout.weight} lbs`}
                        </h4>
                        <strong className="timeline-sets">
                          {workout.sets?.join(" / ")} reps
                        </strong>
                        <span className="timeline-volume-inline">
                          · {calculateVolume(workout).toLocaleString()} lbs volume
                        </span>
                      </div>

                      {(workout.equipment || timelineVariations.length > 0) && (
                        <div className="timeline-tags">
                          {workout.equipment && (
                            <span className="timeline-tag">{workout.equipment}</span>
                          )}
                          {timelineVariations.map((variation) => (
                            <span className="timeline-tag variation" key={variation}>
                              {variation}
                            </span>
                          ))}
                        </div>
                      )}

                      {workout.notes && (
                        <p className="timeline-notes">{workout.notes}</p>
                      )}

                      <div className="workout-actions">
                        <button
                          className="ghost-button"
                          type="button"
                          onClick={() => editWorkout(workout)}
                        >
                          Edit
                        </button>

                        {confirmDelete === workout.id ? (
                          <button
                            className="danger-button"
                            type="button"
                            onClick={() => {
                              deleteWorkout(workout.id);
                              setConfirmDelete(null);
                            }}
                          >
                            Confirm
                          </button>
                        ) : (
                          <button
                            className="ghost-button"
                            type="button"
                            onClick={() =>
                              setConfirmDelete(workout.id)
                            }
                          >
                            Delete
                          </button>
                        )}
                      </div>
                    </div>
                  </article>
                    );
                  })
                )}
              </div>
              </>
            ) : (
            <div className="history-grid">
              {[
                ...PRIMARY_SPLITS,
                ...(filteredGroupedHistory?.Other ? ["Other"] : []),
              ]
                .filter((split) => filteredGroupedHistory?.[split])
                .map((workoutSplit) => (
                  <section className="history-column" key={workoutSplit}>
                    <h3>{workoutSplit === "Other" ? "Uncategorized" : workoutSplit}</h3>
                    {Object.entries(filteredGroupedHistory?.[workoutSplit] ?? {})
                      .sort(([a], [b]) => a.localeCompare(b))
                      .map(([workoutExercise, items]) => (
                        <button
                          className="history-exercise-link"
                          key={workoutExercise}
                          type="button"
                          onClick={() =>
                            openHistoryExerciseDetail(workoutSplit, workoutExercise)
                          }
                        >
                          <span className="history-exercise-name">{workoutExercise}</span>
                          <span className="history-exercise-meta">
                            <small>
                              {items.length} session{items.length === 1 ? "" : "s"}
                            </small>
                            <span className="history-exercise-chevron" aria-hidden>
                              ›
                            </span>
                          </span>
                        </button>
                      ))}
                </section>
              ))}
            </div>
            )}
          </div>
        </section>
      )}

      {activeView === "Settings" && (
        <section className="workspace two-column">
          <div className="panel">
            <p className="eyebrow">Settings</p>
            <h2>Profile</h2>
            <div className="settings-list">
              <div>
                <span>Active user</span>
                <strong>{titleCaseUser(ownerUsername)}</strong>
              </div>
              {isViewingOtherProfile && (
                <div>
                  <span>Viewing profile</span>
                  <strong>{titleCaseUser(user)}</strong>
                </div>
              )}
              <div>
                <span>Signed in with</span>
                <strong>{authUser.email}</strong>
              </div>
              <div>
                <span>Access level</span>
                <strong>{isAdmin ? "Admin" : "Member"}</strong>
              </div>
              <div>
                <span>Workout styles</span>
                <strong>Push/Pull/Legs, Upper/Lower, and Core</strong>
              </div>
              <div>
                <span>Data scope</span>
                <strong>
                  {isAdmin
                    ? "Admins can browse any profile from the header switcher"
                    : "You only see workouts tied to your Google account"}
                </strong>
              </div>
            </div>
          </div>

          <div className="panel">
            <p className="eyebrow">Ideas baked in</p>
            <h2>Built for the next pass</h2>
            <p className="muted">
              The app now has a cleaner shell for adding future settings like preferred split,
              default equipment, exercise management, or export tools without crowding the tracker.
            </p>
          </div>
        </section>
      )}
    </main>
  );
}
