import { useColors } from '../hooks/useColors';
import LoadingSpinner from './LoadingSpinner';

const PageLoader = () => {
  const colors = useColors();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: colors.bg,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex: 9999,
    }}>
      <div style={{
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '24px',
      }}>
        <div style={{
          position: 'relative',
          width: '80px',
          height: '80px',
        }}>
          <LoadingSpinner size={80} thickness={6} />
        </div>
        
        <div style={{
          display: 'flex',
          flexDirection: 'column',
          alignItems: 'center',
          gap: '12px',
        }}>
          <h3 style={{
            color: colors.text,
            fontSize: '20px',
            fontWeight: 600,
            margin: 0,
          }}>
            PureAir
          </h3>
          <p style={{
            color: colors.textSec,
            fontSize: '14px',
            margin: 0,
            textAlign: 'center',
            maxWidth: '300px',
          }}>
            Loading your dashboard...
          </p>
        </div>

        <div style={{
          display: 'flex',
          gap: '8px',
          marginTop: '20px',
        }}>
          {[0, 1, 2].map((i) => (
            <div
              key={i}
              style={{
                width: '8px',
                height: '8px',
                borderRadius: '50%',
                backgroundColor: colors.primary,
                opacity: 0.3,
                animation: `pulse 1.4s ease-in-out ${i * 0.2}s infinite`,
              }}
            />
          ))}
        </div>
      </div>
    </div>
  );
};

export default PageLoader;
