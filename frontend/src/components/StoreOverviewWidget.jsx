// Bars = per-store storage_gi, normalized. All counts from real backend data.
export default function StoreOverviewWidget({ stores }) {
  const running      = stores.filter(s => s.status === 'running').length;
  const provisioning = stores.filter(s => s.status === 'provisioning').length;
  const failed       = stores.filter(s => s.status === 'failed').length;
  const total        = stores.length;

  // Build bars from real per-store storage data (last 6 stores)
  const recent = stores.slice(-6);
  const maxGi  = Math.max(...recent.map(s => s.storage_gi ?? 1), 1);
  const bars   = Array.from({ length: 6 }, (_, i) => {
    const store = recent[i];
    if (!store) return { h: 8, w: 'light' };
    const h = Math.max(Math.round(((store.storage_gi ?? 1) / maxGi) * 95), 10);
    const w = store.status === 'running' ? 'full'
            : store.status === 'provisioning' ? 'mid'
            : 'light';
    return { h, w };
  });

  return (
    <div className="sm-sales-card">
      <span className="sm-sales-label">STORE OVERVIEW</span>
      <div className="sm-sales-amount">
        <span className="sm-sales-num">{total}</span>
        <span className="sm-sales-badge">{running} running</span>
      </div>
      <div className="sm-store-overview-badges">
        {provisioning > 0 && (
          <span className="sm-ov-badge provisioning">{provisioning} provisioning</span>
        )}
        {failed > 0 && (
          <span className="sm-ov-badge failed">{failed} failed</span>
        )}
        {total === 0 && (
          <span className="sm-ov-badge empty">no stores yet</span>
        )}
      </div>
      <div className="sm-chart">
        {bars.map((bar, i) => (
          <div key={i} className={`sm-chart-bar ${bar.w}`} style={{ height: `${bar.h}%` }} />
        ))}
      </div>
    </div>
  );
}
