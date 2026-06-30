import { useColors } from '../hooks/useColors';
import LoadingSpinner from './LoadingSpinner';

const LoadingOverlay = ({ 
  message = 'Loading...', 
  showSpinner = true,
  overlayColor = 'rgba(0, 0, 0, 0.5)',
  zIndex = 1000 
}) => {
  const colors = useColors();

  return (
    <div style={{
      position: 'fixed',
      top: 0,
      left: 0,
      right: 0,
      bottom: 0,
      backgroundColor: overlayColor,
      display: 'flex',
      flexDirection: 'column',
      alignItems: 'center',
      justifyContent: 'center',
      zIndex,
      backdropFilter: 'blur(4px)',
    }}>
      <div style={{
        background: colors.bgCard,
        borderRadius: '16px',
        padding: '40px',
        display: 'flex',
        flexDirection: 'column',
        alignItems: 'center',
        gap: '20px',
        boxShadow: '0 20px 60px rgba(0,0,0,0.3)',
        border: `1px solid ${colors.border}`,
        minWidth: '300px',
        maxWidth: '90vw',
        textAlign: 'center'
      }}>
        {showSpinner && (
          <div style={{ marginBottom: '20px' }}>
            <LoadingSpinner size={60} />
          </div>
        )}
        <p style={{
          color: colors.text,
          fontSize: '16px',
          fontWeight: 500,
          margin: 0,
          textAlign: 'center'
        }}>
          {message}
        </p>
      </div>
    </div>
  );
};

export default LoadingOverlay;
