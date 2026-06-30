import { useColors } from '../hooks/useColors'

export function Skeleton({ width = '100%', height = 20, radius = 8, style = {} }) {
  const c = useColors()
  return (
    <div style={{ width, height, borderRadius: radius, background: c.border, animation: 'shimmer 1.5s infinite', ...style }} />
  )
}

export function SkeletonCard({ style = {} }) {
  const c = useColors()
  return (
    <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, ...style }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 16, marginBottom: 16 }}>
        <Skeleton width={52} height={52} radius={14} />
        <div style={{ flex: 1 }}>
          <Skeleton height={24} width="60%" style={{ marginBottom: 8 }} />
          <Skeleton height={14} width="40%" />
        </div>
      </div>
      <Skeleton height={14} style={{ marginBottom: 8 }} />
      <Skeleton height={14} width="80%" />
    </div>
  )
}

export function SkeletonDashboard() {
  const c = useColors()
  return (
    <div style={{ padding: 32 }}>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(200px,1fr))', gap: 20, marginBottom: 28 }}>
        {[1,2,3,4].map(i => <SkeletonCard key={i} />)}
      </div>
      <div style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24, marginBottom: 28 }}>
        <Skeleton height={20} width="30%" style={{ marginBottom: 20 }} />
        <Skeleton height={220} radius={12} />
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit,minmax(340px,1fr))', gap: 24 }}>
        {[1,2].map(i => (
          <div key={i} style={{ background: c.bgCard, border: `1px solid ${c.border}`, borderRadius: 16, padding: 24 }}>
            <Skeleton height={20} width="40%" style={{ marginBottom: 20 }} />
            {[1,2,3].map(j => <Skeleton key={j} height={60} radius={10} style={{ marginBottom: 12 }} />)}
          </div>
        ))}
      </div>
    </div>
  )
}
