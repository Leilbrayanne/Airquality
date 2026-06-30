import { useState, useRef, useEffect } from 'react';
import { useTranslation } from 'react-i18next';
import { useColors } from '../../shared/hooks/useColors';
import { FiGlobe, FiChevronDown, FiCheck } from 'react-icons/fi';

const LanguageSwitcher = () => {
  const { t, i18n } = useTranslation();
  const colors = useColors();
  const [isOpen, setIsOpen] = useState(false);
  const dropdownRef = useRef(null);

  const changeLanguage = (lng) => {
    i18n.changeLanguage(lng);
    localStorage.setItem('i18nextLng', lng);
    setIsOpen(false);
  };

  const currentLanguage = i18n.language || 'en';

  const languages = [
    { code: 'en', name: 'English', nativeName: 'English', flag: '🇺🇸' },
    { code: 'fr', name: 'French', nativeName: 'Français', flag: '🇫🇷' }
  ];

  const currentLang = languages.find(lang => lang.code === currentLanguage) || languages[0];

  // Close dropdown when clicking outside
  useEffect(() => {
    const handleClickOutside = (event) => {
      if (dropdownRef.current && !dropdownRef.current.contains(event.target)) {
        setIsOpen(false);
      }
    };

    document.addEventListener('mousedown', handleClickOutside);
    return () => document.removeEventListener('mousedown', handleClickOutside);
  }, []);

  const buttonStyle = {
    background: colors.bgCard,
    color: colors.text,
    border: `1px solid ${colors.border}`,
    borderRadius: '10px',
    padding: '8px 16px',
    cursor: 'pointer',
    fontSize: '14px',
    fontWeight: '500',
    transition: 'all 0.3s ease',
    display: 'flex',
    alignItems: 'center',
    gap: '10px',
    minWidth: '140px',
    justifyContent: 'space-between',
    boxShadow: isOpen ? `0 0 0 2px ${colors.primary}20` : 'none',
  };

  const buttonHoverStyle = {
    borderColor: colors.primary,
    transform: 'translateY(-1px)',
    boxShadow: `0 4px 12px ${colors.primary}15`
  };

  return (
    <div ref={dropdownRef} style={{ position: 'relative' }}>
      <button
        onClick={() => setIsOpen(!isOpen)}
        style={buttonStyle}
        onMouseEnter={(e) => {
          e.currentTarget.style.borderColor = colors.primary;
          e.currentTarget.style.transform = 'translateY(-1px)';
          e.currentTarget.style.boxShadow = `0 4px 12px ${colors.primary}15`;
        }}
        onMouseLeave={(e) => {
          e.currentTarget.style.borderColor = colors.border;
          e.currentTarget.style.transform = 'translateY(0)';
          e.currentTarget.style.boxShadow = isOpen ? `0 0 0 2px ${colors.primary}20` : 'none';
        }}
        onMouseDown={(e) => {
          e.currentTarget.style.transform = 'translateY(0)';
        }}
        onMouseUp={(e) => {
          e.currentTarget.style.transform = 'translateY(-1px)';
        }}
      >
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <FiGlobe size={16} color={colors.primary} />
          <span style={{ fontSize: '14px' }}>{currentLang.name}</span>
        </div>
        <FiChevronDown 
          size={16} 
          color={colors.textSec} 
          style={{ 
            transform: isOpen ? 'rotate(180deg)' : 'rotate(0deg)',
            transition: 'transform 0.3s ease'
          }} 
        />
      </button>

      {isOpen && (
        <div
          style={{
            position: 'absolute',
            top: 'calc(100% + 8px)',
            right: 0,
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '12px',
            padding: '8px',
            minWidth: '180px',
            boxShadow: '0 10px 40px rgba(0,0,0,0.2)',
            zIndex: 1000,
            animation: 'fadeIn 0.2s ease'
          }}
        >
          {languages.map((lang) => (
            <button
              key={lang.code}
              onClick={() => changeLanguage(lang.code)}
              style={{
                background: currentLanguage === lang.code ? `${colors.primary}15` : 'transparent',
                color: currentLanguage === lang.code ? colors.primary : colors.text,
                border: 'none',
                borderRadius: '8px',
                padding: '10px 14px',
                cursor: 'pointer',
                fontSize: '14px',
                fontWeight: currentLanguage === lang.code ? '600' : '400',
                transition: 'all 0.2s ease',
                display: 'flex',
                alignItems: 'center',
                justifyContent: 'space-between',
                width: '100%',
                marginBottom: '4px',
                ':hover': {
                  background: `${colors.primary}10`,
                  transform: 'translateX(2px)'
                },
                ':last-child': {
                  marginBottom: 0
                }
              }}
            >
              <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                <span style={{ fontSize: '18px' }}>{lang.flag}</span>
                <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-start' }}>
                  <span style={{ fontSize: '14px', fontWeight: '500' }}>{lang.name}</span>
                  <span style={{ fontSize: '12px', color: colors.textSec, marginTop: '2px' }}>
                    {lang.nativeName}
                  </span>
                </div>
              </div>
              {currentLanguage === lang.code && (
                <FiCheck size={16} color={colors.primary} />
              )}
            </button>
          ))}
        </div>
      )}

      <style jsx="true">{`
        @keyframes fadeIn {
          from {
            opacity: 0;
            transform: translateY(-10px);
          }
          to {
            opacity: 1;
            transform: translateY(0);
          }
        }
      `}</style>
    </div>
  );
};

export default LanguageSwitcher;
