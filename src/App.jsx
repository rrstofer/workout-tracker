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
  const toggleVariation = (v) => {
    setVariations((prev) => {
      const updated = prev.includes(v)
        ? prev.filter((x) => x !== v)
        : [...prev, v];
  
      fetchLastWorkout(exercise, equipment, updated);
  
      return updated;
    });
  };
  const [lastWorkout, setLastWorkout] = useState(null);
  const fetchLastWorkout = (selectedExercise, selectedEquipment, selectedVariations) => {
    const previous = workouts
      .filter((w) => {
        const sameExercise = w.exercise === selectedExercise;
        const sameEquipment = w.equipment === selectedEquipment;
  
        const prevVars = w.variations || [];
        const currVars = selectedVariations || [];
  
        const sameVariations =
          prevVars.length === currVars.length &&
          prevVars.every((v) => currVars.includes(v));
  
        return sameExercise && sameEquipment && sameVariations;
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
            fetchLastWorkout(val, equipment, variations);;
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
            fetchLastWorkout(exercise, val, variations);
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

      <h2>History</h2>

      {workouts.map((w) => (
        <div key={w.id} style={{ marginBottom: 15 }}>
          <div>
            {w.exercise} ({w.equipment})
          </div>

          <div>
            Variations: {Array.isArray(w.variations) ? w.variations.join(", ") : ""}
          </div>

          <div>{w.weight} lbs</div>

          <div>Sets: {w.sets?.join(" / ")}</div>

          <div>{w.split}</div>

          {w.notes && <div>Notes: {w.notes}</div>}

          <button
            onClick={() => deleteWorkout(w.id)}
            style={{ marginTop: 5 }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}