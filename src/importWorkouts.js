import Papa from "papaparse";
import { addDoc, collection, Timestamp } from "firebase/firestore";
import { db } from "./firebase";

export async function importCSV(file) {
  Papa.parse(file, {
    header: true,
    skipEmptyLines: true,

    complete: async (results) => {
      for (const row of results.data) {
        const sets = [
          row.Set1,
          row.Set2,
          row.Set3,
          row.Set4,
        ]
          .filter((x) => x !== "")
          .map(Number);

        await addDoc(collection(db, "workouts"), {
            user: row.User.toLowerCase(),
            
            split: row.Split,
            
            // Use ExerciseKey instead of Exercise
            exercise: row.ExerciseKey,
            
            equipment: row.Equipment,
            
            weight: Number(row.Weight),
            
            sets,
            
            notes: row.Notes || "",
            
            createdAt: Timestamp.fromDate(
                new Date(row.Date)
            ),
            });
      }

      alert("Import complete!");
    },
  });
}