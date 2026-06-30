export function ChartTooltip({ active, payload, metric = "weight" }) {
  if (!active || !payload?.length) return null;

  const data = payload[0].payload;
  const metricValue = metric === "volume" ? data.volume : data.weight;

  return (
    <div className="chart-tooltip">
      <strong>{data.date}</strong>
      <span>{metricValue} lbs</span>
      <span>{data.reps}</span>
      {data.notes && <span>{data.notes}</span>}
    </div>
  );
}
