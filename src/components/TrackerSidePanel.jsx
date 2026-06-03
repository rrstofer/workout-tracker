import { formatDate, formatPacificTime } from "../utils/workoutUtils";

export function TrackerSidePanel({
  confirmDelete,
  deleteWorkout,
  editWorkout,
  lastWorkout,
  recentWorkouts,
  setConfirmDelete,
}) {
  return (
    <aside className="side-stack">
      <div className="panel last-panel">
        <p className="eyebrow">Last matching session</p>
        {lastWorkout ? (
          <>
            <h2>{lastWorkout.exercise}</h2>
            <div className="last-metric">
              <strong>{lastWorkout.weight} lbs</strong>
              <span>{lastWorkout.sets?.join(" / ")} reps</span>
            </div>
            <p>{formatDate(lastWorkout.createdAt)}</p>
            <p className="muted">
              {lastWorkout.variations?.length ? lastWorkout.variations.join(" / ") : "Standard"}
            </p>
          </>
        ) : (
          <>
            <h2>No match yet</h2>
            <p className="muted">
              Select an exercise, equipment, and attributes to see the exact previous numbers.
            </p>
          </>
        )}
      </div>

      <div className="panel recent-panel">
        <p className="eyebrow">Last 24 hours</p>
        <h2>Logged today</h2>
        {recentWorkouts.length > 0 ? (
          <div className="recent-list">
            {recentWorkouts.map((workout) => (
              <article className="recent-row" key={workout.id}>
                <div>
                  <strong>{workout.exercise}</strong>
                  <span>
                    {workout.weight} lbs - {workout.sets?.join(" / ")}
                  </span>
                  <small>
                    {workout.equipment} - {formatPacificTime(workout.createdAt)} PST
                  </small>
                </div>
                <div className="recent-actions">
                  <button className="ghost-button" type="button" onClick={() => editWorkout(workout)}>
                    Edit
                  </button>
                  {confirmDelete === workout.id ? (
                    <button
                      className="danger-button"
                      type="button"
                      onClick={() => deleteWorkout(workout.id)}
                    >
                      Confirm
                    </button>
                  ) : (
                    <button
                      className="ghost-button"
                      type="button"
                      onClick={() => setConfirmDelete(workout.id)}
                    >
                      Delete
                    </button>
                  )}
                </div>
              </article>
            ))}
          </div>
        ) : (
          <p className="muted">Nothing logged in the last 24 hours yet.</p>
        )}
      </div>
    </aside>
  );
}
