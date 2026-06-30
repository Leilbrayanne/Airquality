import { useColors } from '../hooks/useColors';
import LoadingSpinner from './LoadingSpinner';

const Button = ({
  children,
  variant = 'primary',
  size = 'medium',
  loading = false,
  disabled = false,
  fullWidth = false,
  onClick,
  type = 'button',
  className = '',
  style = {},
  ...props
}) => {
  const colors = useColors();

  const baseStyles = {
    display: 'inline-flex',
    alignItems: 'center',
    justifyContent: 'center',
    gap: '8px',
    border: 'none',
    borderRadius: '10px',
    cursor: 'pointer',
    transition: 'all 0.3s ease',
    fontWeight: 600,
    fontFamily: 'inherit',
    position: 'relative',
    overflow: 'hidden',
    width: fullWidth ? '100%' : 'auto',
    ':hover': {
      transform: 'translateY(-2px)',
    },
    ':active': {
      transform: 'translateY(0)',
    },
    ':disabled': {
      opacity: 0.6,
      cursor: 'not-allowed',
      transform: 'none',
    },
  };

  const variantStyles = {
    primary: {
      background: colors.gradient,
      color: '#fff',
      boxShadow: '0 4px 14px rgba(0,212,170,0.2)',
      ':hover': {
        boxShadow: '0 8px 25px rgba(0,212,170,0.3)',
      },
    },
    secondary: {
      background: colors.bgCard,
      color: colors.text,
      border: `1px solid ${colors.border}`,
      ':hover': {
        borderColor: colors.primary,
        boxShadow: `0 4px 14px ${colors.primary}15`,
      },
    },
    outline: {
      background: 'transparent',
      color: colors.primary,
      border: `2px solid ${colors.primary}`,
      ':hover': {
        background: `${colors.primary}10`,
      },
    },
    ghost: {
      background: 'transparent',
      color: colors.text,
      ':hover': {
        background: `${colors.primary}10`,
      },
    },
    danger: {
      background: colors.danger,
      color: '#fff',
      ':hover': {
        background: '#ff2e43',
        boxShadow: '0 4px 14px rgba(255,71,87,0.3)',
      },
    },
  };

  const sizeStyles = {
    small: {
      padding: '8px 16px',
      fontSize: '13px',
    },
    medium: {
      padding: '12px 24px',
      fontSize: '14px',
    },
    large: {
      padding: '16px 32px',
      fontSize: '16px',
    },
  };

  const combinedStyle = {
    ...baseStyles,
    ...variantStyles[variant],
    ...sizeStyles[size],
    ...style,
  };

  return (
    <button
      type={type}
      onClick={onClick}
      disabled={disabled || loading}
      className={className}
      style={combinedStyle}
      {...props}
    >
      {loading && (
        <div style={{ marginRight: '8px' }}>
          <LoadingSpinner size={size === 'small' ? 16 : size === 'large' ? 24 : 20} color="#fff" />
        </div>
      )}
      <span style={{ opacity: loading ? 0.5 : 1 }}>
        {children}
      </span>
    </button>
  );
};

export default Button;
