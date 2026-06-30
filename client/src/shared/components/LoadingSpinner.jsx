import { useColors } from '../hooks/useColors';

const LoadingSpinner = ({ size = 40, color, thickness = 4, className = '' }) => {
  const colors = useColors();
  const spinnerColor = color || colors.primary;

  return (
    <div 
      className={className}
      style={{
        display: 'inline-block',
        position: 'relative',
        width: size,
        height: size,
      }}
    >
      <div
        style={{
          boxSizing: 'border-box',
          display: 'block',
          position: 'absolute',
          width: size,
          height: size,
          border: `${thickness}px solid ${spinnerColor}20`,
          borderRadius: '50%',
          animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite',
          borderColor: `${spinnerColor}20 transparent transparent transparent`,
        }}
      />
      <div
        style={{
          boxSizing: 'border-box',
          display: 'block',
          position: 'absolute',
          width: size,
          height: size,
          border: `${thickness}px solid ${spinnerColor}20`,
          borderRadius: '50%',
          animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite',
          borderColor: `${spinnerColor}20 transparent transparent transparent`,
          animationDelay: '-0.45s',
        }}
      />
      <div
        style={{
          boxSizing: 'border-box',
          display: 'block',
          position: 'absolute',
          width: size,
          height: size,
          border: `${thickness}px solid ${spinnerColor}20`,
          borderRadius: '50%',
          animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite',
          borderColor: `${spinnerColor}20 transparent transparent transparent`,
          animationDelay: '-0.3s',
        }}
      />
      <div
        style={{
          boxSizing: 'border-box',
          display: 'block',
          position: 'absolute',
          width: size,
          height: size,
          border: `${thickness}px solid ${spinnerColor}`,
          borderRadius: '50%',
          animation: 'spin 1.2s cubic-bezier(0.5, 0, 0.5, 1) infinite',
          borderColor: `${spinnerColor} transparent transparent transparent`,
          animationDelay: '-0.15s',
        }}
      />
    </div>
  );
};

export default LoadingSpinner;
