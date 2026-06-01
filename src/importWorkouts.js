import Papa from "papaparse";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function importCSV(file) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,

    complete: async (results) => {
      for (const row of results.data) {
        const sets = [row.Set1, row.Set2, row.Set3, row.Set4]
          .filter((x) => x !== "" && x !== undefined && x !== null)
          .map(Number);

        const variations = (row.Attribute || "")
          .split(",")
          .map((v) => v.trim())
          .filter(Boolean);

        const rawExercise = row.ExerciseKey || "";

        const exercise = rawExercise
        .replace(/\b(incline|decline)\b/i, "")
        .replace(/\s+/g, " ")
        .trim();

        await addDoc(collection(db, "workouts"), {
          user: row.User.toLowerCase(),
          split: row.Split,

          exercise: exercise,
          equipment: row.Equipment,

          weight: Number(row.Weight),
          sets,

          variations,

          notes: row.Notes || "",

          createdAt: Timestamp.fromDate(new Date(row.Date)),
        });
      }

      alert("Import complete!");
    },
  });
}