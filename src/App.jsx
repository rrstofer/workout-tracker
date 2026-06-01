import { useState, useEffect } from "react";
import { db } from "./firebase";
import { collection, addDoc, orderBy, query } from "firebase/firestore";
import { serverTimestamp } from "firebase/firestore";
import { deleteDoc, doc } from "firebase/firestore";
import { onSnapshot } from "firebase/firestore";
import { where } from "firebase/firestore";

export default function App() {
  const [name, setName] = useState("");
  const [sets, setSets] = useState("");
  const [reps, setReps] = useState("");
  const [workouts, setWorkouts] = useState([]);

  const workoutsRef = collection(db, "workouts");

  const [user, setUser] = useState("ryan");

  useEffect(() => {
    const q = query(
      workoutsRef,
      where("user", "==", user),
      orderBy("createdAt", "desc")
    );
    console.log("Current user:", user);
    const unsubscribe = onSnapshot(q, (snapshot) => {
      const data = snapshot.docs.map(doc => ({
        id: doc.id,
        ...doc.data()
      }));
  
      setWorkouts(data);
    });
  
    return () => unsubscribe();
  }, [user]);

  // Add workout
  const addWorkout = async (e) => {
    e.preventDefault();

    if (!name || !sets || !reps) return;

    await addDoc(workoutsRef, {
      name,
      sets: Number(sets),
      reps: Number(reps),
      user, // MUST be "ryan" or "tuna"
      createdAt: serverTimestamp()
    });

    setName("");
    setSets("");
    setReps("");


  };

// add del workout function
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
        <input
          placeholder="Exercise (e.g. Bench Press)"
          value={name}
          onChange={(e) => setName(e.target.value)}
        />
        <br />

        <input
          placeholder="Sets"
          type="number"
          value={sets}
          onChange={(e) => setSets(e.target.value)}
        />
        <br />

        <input
          placeholder="Reps"
          type="number"
          value={reps}
          onChange={(e) => setReps(e.target.value)}
        />
        <br />

        <button type="submit">Add Workout</button>
      </form>

      <hr />

      <h2>History</h2>

      {workouts.map((w) => (
        <div key={w.id} style={{ marginBottom: 10 }}>
          <strong>{w.name}</strong> — {w.sets} × {w.reps}

          <button
            onClick={() => deleteWorkout(w.id)}
            style={{ marginLeft: 10 }}
          >
            Delete
          </button>
        </div>
      ))}
    </div>
  );
}