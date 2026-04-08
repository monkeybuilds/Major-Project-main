function SkeletonCard({ lines = 3, className = '' }) {
    return (
        <div className={`skeleton-card ${className}`}>
            <div className="skeleton-header">
                <div className="skeleton-circle"></div>
                <div className="skeleton-line skeleton-line-short"></div>
            </div>
            {Array.from({ length: lines }).map((_, i) => (
                <div
                    key={i}
                    className={`skeleton-line ${i === lines - 1 ? 'skeleton-line-medium' : ''}`}
                ></div>
            ))}
        </div>
    );
}

function SkeletonStat() {
    return (
        <div className="skeleton-card skeleton-stat">
            <div className="skeleton-circle skeleton-circle-lg"></div>
            <div>
                <div className="skeleton-line skeleton-line-short"></div>
                <div className="skeleton-line skeleton-line-xshort"></div>
            </div>
        </div>
    );
}

export { SkeletonCard, SkeletonStat };
