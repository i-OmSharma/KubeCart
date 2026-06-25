export default function StorageWidget({ usedStorage, maxStorage }) {
  const pct = maxStorage > 0 ? Math.round((usedStorage / maxStorage) * 100) : 0;
  const nearLimit = pct >= 70;

  return (
    <div className="sm-storage-card">
      <div className="sm-storage-head">
        <span className="sm-storage-label">DATA STORAGE</span>
        <span className="sm-storage-pct">{pct}% Used</span>
      </div>
      <div className="sm-progress-track">
        <div
          className={`sm-progress-fill${nearLimit ? ' warn' : ''}`}
          style={{ width: `${Math.max(pct, 2)}%` }}
        />
      </div>
      <p className="sm-storage-note">
        {nearLimit
          ? `Approaching ${maxStorage} GB limit. Consider upgrading.`
          : `${maxStorage - usedStorage} GB available of ${maxStorage} GB total.`}
      </p>
    </div>
  );
}
