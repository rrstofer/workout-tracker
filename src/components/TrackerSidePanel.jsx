import { formatDate, formatPacificTime } from "../utils/workoutUtils";

import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
} from "recharts";

import { ChartTooltip } from "./ChartTooltip";

export function TrackerSidePanel({
  confirmDelete,
  deleteWorkout,
  editWorkout,
  lastWorkout,
  recentWorkouts,
  setConfirmDelete,
  progressData,
}) {
  return (
    <aside className="side-stack">
      <div className="panel last-panel">
      <p className="eyebrow">Progress</p>

      {progressData?.length > 1 ? (
        <>
          <h2>Exercise Trend</h2>

          <div className="side-chart">
            <ResponsiveContainer width="100%" height={180}>
              <AreaChart data={progressData}>
                <defs>
                  <linearGradient id="trackerGradient" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="0%" stopColor="#67E8F9" stopOpacity={0.7} />
                    <stop offset="100%" stopColor="#34D399" stopOpacity={0.05} />
                  </linearGradient>
                </defs>

                <CartesianGrid stroke="#263245" strokeDasharray="3 3" />
                <XAxis dataKey="date" stroke="#94A3B8" hide />
                <YAxis stroke="#94A3B8" width={30} />
                <Tooltip content={<ChartTooltip />} />

                <Area
                  type="monotone"
                  dataKey="weight"
                  stroke="#67E8F9"
                  strokeWidth={2}
                  fill="url(#trackerGradient)"
                />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </>
      ) : lastWorkout ? (
        <>
          <h2>{lastWorkout.exercise}</h2>

          <div className="last-metric">
            <strong>{lastWorkout.weight} lbs</strong>
            <span>{lastWorkout.sets?.join(" / ")} reps</span>
          </div>

          <p>{formatDate(lastWorkout.createdAt)}</p>

          <p className="muted">
            {lastWorkout.variations?.length
              ? lastWorkout.variations.join(" / ")
              : "Standard"}
          </p>
        </>
      ) : (
        <>
          <h2>No data yet</h2>
          <p className="muted">
            Log this exercise to see your progress trend here.
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
