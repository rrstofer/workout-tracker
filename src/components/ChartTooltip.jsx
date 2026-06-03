export function ChartTooltip({ active, payload }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;

  return (
    <div className="chart-tooltip">
      <strong>{data.date}</strong>
      <span>{data.weight} lbs</span>
      <span>{data.reps}</span>
      {data.notes && <span>{data.notes}</span>}
    </div>
  );
}
