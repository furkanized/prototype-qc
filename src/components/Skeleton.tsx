export function SkeletonCard() {
  return (
    <div className="qcx-card qcx-skeleton-card" aria-hidden="true">
      <div className="qcx-skeleton qcx-skeleton-icon" />
      <div className="qcx-skeleton qcx-skeleton-line" style={{ width: "60%" }} />
      <div className="qcx-skeleton qcx-skeleton-line" style={{ width: "90%" }} />
      <div className="qcx-skeleton qcx-skeleton-line" style={{ width: "40%" }} />
    </div>
  );
}

export function SkeletonGrid({ count = 6 }: { count?: number }) {
  return (
    <div className="qcx-card-grid">
      {Array.from({ length: count }, (_, index) => (
        <SkeletonCard key={index} />
      ))}
    </div>
  );
}
