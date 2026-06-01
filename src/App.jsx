import { useState, useEffect } from "react";
import { db } from "./firebase";
import {
  collection,
  addDoc,
  orderBy,
  query,
  serverTimestamp,
  deleteDoc,
  doc,
  onSnapshot,
  where,
} from "firebase/firestore";

import {
  LineChart,
  Line,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer
} from "recharts";
import { importCSV } from "./importWorkouts";

export default function App() {
  const [split, setSplit] = useState("");
  const [exercise, setExercise] = useState("");
  const [equipment, setEquipment] = useState("");
  const [weight, setWeight] = useState("");
  const [variations, setVariations] = useState([]);
  const [set1, setSet1] = useState("");
  const [set2, setSet2] = useState("");
  const [set3, setSet3] = useState("");
  const [set4, setSet4] = useState("");

  const [notes, setNotes] = useState("");

  const [workouts, setWorkouts] = useState([]);
  const [user, setUser] = useState("ryan");
  const [collapsed, setCollapsed] = useState({});

  const toggleVariation = (v) => {
    setVariations((prev) => {
      const updated = prev.includes(v)
        ? prev.filter((x) => x !== v)
        : [...prev, v];
  
      fetchLastWorkout(exercise, equipment, updated, user);
  
      return updated;
    });
  };
  const [lastWorkout, setLastWorkout] = useState(null);
  const fetchLastWorkout = (selectedExercise, selectedEquipment, selectedVariations, currentUser) => {
    const previous = workouts
      .filter((w) => {
        const sameUser = w.user === currentUser;
  
        const sameExercise = w.exercise === selectedExercise;
        const sameEquipment = w.equipment === selectedEquipment;
  
        const prevVars = w.variations || [];
        const currVars = selectedVariations || [];
  
        const sameVariations =
          prevVars.length === currVars.length &&
          prevVars.every((v) => currVars.includes(v));
  
        return (
          sameUser &&
          sameExercise &&
          sameEquipment
        );
      })
      .sort((a, b) => {
        const aTime = a.createdAt?.seconds || 0;
        const bTime = b.createdAt?.seconds || 0;
        return bTime - aTime;
      })[0];
  
    if (previous) {
      setLastWorkout(previous);
  
      setWeight(previous.weight || "");
  
      setSet1(previous.sets?.[0] || "");
      setSet2(previous.sets?.[1] || "");
      setSet3(previous.sets?.[2] || "");
      setSet4(previous.sets?.[3] || "");
    }
  };

  const workoutsRef = collection(db, "workouts");

  const exerciseMap = {
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
  
    Lower: [
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
  };
  const availableExercises = exerciseMap[split] || [];

  const exerciseCategory = {};

  Object.entries(exerciseMap).forEach(([split, exercises]) => {
    if (["Push", "Pull", "Legs"].includes(split)) {
      exercises.forEach((ex) => {
        exerciseCategory[ex] = split;
      });
    }
  });

  const groupedWorkouts = workouts.reduce((groups, workout) => {
    const key = workout.exercise;
  
    if (!groups[key]) {
      groups[key] = [];
    }
  
    groups[key].push(workout);
    return groups;
  }, {});

  const toggleCollapse = (exercise) => {
    setCollapsed((prev) => ({
      ...prev,
      [exercise]: !prev[exercise],
    }));
  };

  const groupedHistory = workouts.reduce((acc, workout) => {
    const split = exerciseCategory[workout.exercise] || "Other";
  
    if (!acc[split]) acc[split] = {};
    if (!acc[split][workout.exercise]) {
      acc[split][workout.exercise] = [];
    }
  
    acc[split][workout.exercise].push(workout);
  
    return acc;
  }, {});

  useEffect(() => {
    const q = query(
      workoutsRef,
      where("user", "==", user),
      orderBy("createdAt", "desc")
    );

    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map((doc) => {
        const d = doc.data();
      
        return {
          id: doc.id,
          ...d,
          variations: Array.isArray(d.variations) ? d.variations : [],
        };
      });

      setWorkouts(data);
    });

    return () => unsubscribe();
  }, [user]);

  const addWorkout = async (e) => {
    e.preventDefault();

    const sets = [set1, set2, set3, set4]
      .filter((s) => s !== "")
      .map(Number);

    await addDoc(workoutsRef, {
      user,
      split,
      exercise,
      equipment,
      variations: Array.isArray(variations) ? variations : [],
      weight: Number(weight),
      sets,
      notes,
      createdAt: serverTimestamp(),
    });

    setSplit("");
    setExercise("");
    setEquipment("");
    setWeight("");

    setSet1("");
    setSet2("");
    setSet3("");
    setSet4("");

    setNotes("");
  };

  const deleteWorkout = async (id) => {
    await deleteDoc(doc(db, "workouts", id));
  };


  const chartData = workouts
  .filter((w) => w.exercise === exercise)
  .sort((a, b) => {
    const aTime = a.createdAt?.seconds || 0;
    const bTime = b.createdAt?.seconds || 0;
    return aTime - bTime;
  })
  .map((w) => ({
    date: w.createdAt?.seconds
      ? new Date(w.createdAt.seconds * 1000).toLocaleDateString()
      : "",

    weight: w.weight,

    reps: Array.isArray(w.sets)
      ? w.sets.join("/")
      : "",

    notes: w.notes || ""
  }));

  const CustomTooltip = ({ active, payload }) => {
    if (active && payload && payload.length) {
      const data = payload[0].payload;
  
      return (
        <div style={{ background: "white", padding: 10, border: "1px solid #ccc" }}>
          <p><strong>{data.date}</strong></p>
          <p>Weight: {data.weight} lbs</p>
          <p>Reps: {data.reps}</p>
          {data.notes && <p>Notes: {data.notes}</p>}
        </div>
      );
    }
    return null;
  };



// RETURN STATEMENT
  return (
    <div style={{ padding: 20 }}>
      <h1>Workout Tracker</h1>

      <div style={{ marginBottom: 20 }}>
        <label>Current User: </label>

        <select value={user} onChange={(e) => setUser(e.target.value)}>
          <option value="ryan">Ryan</option>
          <option value="tuna">Tuna</option>
        </select>
      </div>

      <form onSubmit={addWorkout}>
        <select value={split} onChange={(e) => setSplit(e.target.value)}>
          <option value="">Select Split</option>
          <option value="Upper">Upper</option>
          <option value="Lower">Lower</option>
          <option value="Push">Push</option>
          <option value="Pull">Pull</option>
          <option value="Legs">Legs</option>
        </select>

        <br />

        <select
          value={exercise}
          onChange={(e) => {
            const val = e.target.value;
            setExercise(val);
            fetchLastWorkout(val, equipment, variations, user);
          }}
        >
          <option value="">Select Exercise</option>

          {availableExercises.map((ex) => (
            <option key={ex} value={ex}>
              {ex}
            </option>
          ))}
        </select>

        <br />

        <select
          value={equipment}
          onChange={(e) => {
            const val = e.target.value;
            setEquipment(val);
            fetchLastWorkout(exercise, val, variations, user);
          }}
        >
          <option value="">Equipment</option>
          <option value="Barbell">Barbell</option>
          <option value="Dumbbell">Dumbbell</option>
          <option value="Cable">Cable</option>
          <option value="Machine">Machine</option>
          <option value="Smith Machine">Smith Machine</option>
        </select>
        <br />
        
        <input
          type="file"
          accept=".csv"
          onChange={(e) => importCSV(e.target.files[0])}
        />
        <br />
        <div>
          <label>
            <input
              type="checkbox"
              checked={variations.includes("Incline")}
              onChange={() => toggleVariation("Incline")}
            />
            Incline
          </label>

          <label>
            <input
              type="checkbox"
              checked={variations.includes("Decline")}
              onChange={() => toggleVariation("Decline")}
            />
            Decline
          </label>

          <label>
            <input
              type="checkbox"
              checked={variations.includes("Unilateral")}
              onChange={() => toggleVariation("Unilateral")}
            />
            Unilateral
          </label>
        </div>

        <br />
        <input
          placeholder="Weight"
          type="number"
          value={weight}
          onChange={(e) => setWeight(e.target.value)}
        />

        <br />

        <input
          placeholder="Set 1"
          type="number"
          value={set1}
          onChange={(e) => setSet1(e.target.value)}
        />

        <br />

        <input
          placeholder="Set 2"
          type="number"
          value={set2}
          onChange={(e) => setSet2(e.target.value)}
        />

        <br />

        <input
          placeholder="Set 3"
          type="number"
          value={set3}
          onChange={(e) => setSet3(e.target.value)}
        />

        <br />

        <input
          placeholder="Set 4"
          type="number"
          value={set4}
          onChange={(e) => setSet4(e.target.value)}
        />

        <br />

        <textarea
          placeholder="Notes"
          value={notes}
          onChange={(e) => setNotes(e.target.value)}
        />

        <br />

        <button type="submit">Add Workout</button>
      </form>

      <hr />

      <h2>Progress</h2>

      {exercise ? (
        <div style={{ width: "100%", height: 300 }}>
          <ResponsiveContainer>
            <LineChart data={chartData}>
              <CartesianGrid strokeDasharray="3 3" />
              <XAxis dataKey="date" />
              <YAxis />
              <Tooltip content={<CustomTooltip />} />
              <Line
                type="monotone"
                dataKey="weight"
                stroke="#8884d8"
                strokeWidth={2}
              />
            </LineChart>
          </ResponsiveContainer>
        </div>
      ) : (
        <p>Select an exercise to view progress</p>
      )}
<h2>History</h2>

<div
  style={{
    display: "grid",
    gridTemplateColumns: "1fr 1fr 1fr",
    gap: "24px",
    alignItems: "start",
  }}
>
  {["Push", "Pull", "Legs"].map((split) => (
    <div key={split}>
      <h3>{split}</h3>

      {Object.entries(groupedHistory[split] || {})
        .sort(([a], [b]) => a.localeCompare(b))
        .map(([exercise, items]) => (
          <div key={exercise} style={{ marginBottom: 20 }}>
            <div
              onClick={() => toggleCollapse(exercise)}
              style={{
                cursor: "pointer",
                fontWeight: "bold",
                fontSize: 16,
                marginBottom: 5,
              }}
            >
              {exercise} {collapsed[exercise] ? "▶" : "▼"}
            </div>

            {!collapsed[exercise] && (
              <div style={{ paddingLeft: 10 }}>
                {items.map((w) => (
                  <div
                    key={w.id}
                    style={{
                      marginBottom: 12,
                      paddingLeft: 8,
                    }}
                  >
                    <div style={{ fontWeight: 600 }}>
                      {w.weight} lbs ({w.equipment}) —{" "}
                      {w.sets?.join(" / ")}
                    </div>

                    {Array.isArray(w.variations) &&
                      w.variations.length > 0 && (
                        <div
                          style={{
                            fontSize: 12,
                            opacity: 0.7,
                          }}
                        >
                          {w.variations.join(" • ")}
                        </div>
                      )}

                    {w.notes && (
                      <div
                        style={{
                          fontSize: 12,
                          opacity: 0.7,
                        }}
                      >
                        {w.notes}
                      </div>
                    )}

                    <button
                      onClick={() => deleteWorkout(w.id)}
                      style={{
                        marginTop: 6,
                        fontSize: 12,
                      }}
                    >
                      Delete
                    </button>
                  </div>
                ))}
              </div>
            )}
          </div>
        ))}
    </div>
  ))}
  </div>

  </div>
  );
}