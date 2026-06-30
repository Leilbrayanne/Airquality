import { useColors } from '../hooks/useColors';

const SkeletonLoader = ({ 
  type = 'text', 
  width = '100%', 
  height = '20px', 
  borderRadius = '6px',
  count = 1,
  className = ''
}) => {
  const colors = useColors();

  const renderItem = (key) => (
    <div
      key={key}
      className={className}
      style={{
        width,
        height,
        borderRadius,
        background: `linear-gradient(90deg, ${colors.border} 25%, ${colors.bgCard} 50%, ${colors.border} 75%)`,
        backgroundSize: '200% 100%',
        animation: 'shimmer 1.5s infinite',
        marginBottom: count > 1 ? '8px' : '0',
      }}
    />
  );

  if (type === 'circle') {
    return (
      <div
        style={{
          width,
          height: width,
          borderRadius: '50%',
          background: `linear-gradient(90deg, ${colors.border} 25%, ${colors.bgCard} 50%, ${colors.border} 75%)`,
          backgroundSize: '200% 100%',
          animation: 'shimmer 1.5s infinite',
        }}
        className={className}
      />
    );
  }

  if (type === 'card') {
    return (
      <div
        className={className}
        style={{
          background: colors.bgCard,
          border: `1px solid ${colors.border}`,
          borderRadius: '12px',
          padding: '20px',
          width,
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', marginBottom: '16px' }}>
          <div
            style={{
              width: '40px',
              height: '40px',
              borderRadius: '50%',
              background: `linear-gradient(90deg, ${colors.border} 25%, ${colors.bgCard} 50%, ${colors.border} 75%)`,
              backgroundSize: '200% 100%',
              animation: 'shimmer 1.5s infinite',
              marginRight: '12px',
            }}
          />
          <div style={{ flex: 1 }}>
            <div
              style={{
                width: '60%',
                height: '16px',
                borderRadius: '4px',
                background: `linear-gradient(90deg, ${colors.border} 25%, ${colors.bgCard} 50%, ${colors.border} 75%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
                marginBottom: '8px',
              }}
            />
            <div
              style={{
                width: '40%',
                height: '12px',
                borderRadius: '4px',
                background: `linear-gradient(90deg, ${colors.border} 25%, ${colors.bgCard} 50%, ${colors.border} 75%)`,
                backgroundSize: '200% 100%',
                animation: 'shimmer 1.5s infinite',
              }}
            />
          </div>
        </div>
        <div
          style={{
            width: '100%',
            height: '100px',
            borderRadius: '8px',
            background: `linear-gradient(90deg, ${colors.border} 25%, ${colors.bgCard} 50%, ${colors.border} 75%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
            marginBottom: '16px',
          }}
        />
        <div
          style={{
            width: '30%',
            height: '12px',
            borderRadius: '4px',
            background: `linear-gradient(90deg, ${colors.border} 25%, ${colors.bgCard} 50%, ${colors.border} 75%)`,
            backgroundSize: '200% 100%',
            animation: 'shimmer 1.5s infinite',
          }}
        />
      </div>
    );
  }

  if (count > 1) {
    return (
      <div className={className}>
        {Array.from({ length: count }).map((_, index) => (
          renderItem(index)
        ))}
      </div>
    );
  }

  return renderItem();
};

export default SkeletonLoader;
