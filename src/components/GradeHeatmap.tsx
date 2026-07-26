/* Heatmap 7 dias × 24h — determinístico (mesma semente = mesma grade), server-safe */
const DIAS = ['Dom', 'Seg', 'Ter', 'Qua', 'Qui', 'Sex', 'Sáb'];

export function GradeHeatmap({ seed = 1.7, compact = false }: { seed?: number; compact?: boolean }) {
  const rows = DIAS.map((dia, d) => {
    const cells = Array.from({ length: 24 }, (_, h) => {
      const n = (Math.sin((d + 1) * (h + 2) * seed) + 1) / 2;
      const lv = n > 0.8 ? 4 : n > 0.62 ? 3 : n > 0.4 ? 2 : n > 0.22 ? 1 : 0;
      return lv;
    });
    return { dia, cells };
  });
  const shown = compact ? rows.slice(1, 6) : rows;
  return (
    <div className="grade">
      <table>
        <thead>
          <tr>
            <th />
            {Array.from({ length: 24 }, (_, h) => <th key={h}>{h}</th>)}
          </tr>
        </thead>
        <tbody>
          {shown.map((r) => (
            <tr key={r.dia}>
              <td className="dia">{r.dia}</td>
              {r.cells.map((lv, i) => <td key={i}><div className={`cel lv${lv}`} /></td>)}
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
