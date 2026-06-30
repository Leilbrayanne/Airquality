import { useState } from 'react';
import Navbar from '../../shared/components/Navbar';
import LoadingSpinner from '../../shared/components/LoadingSpinner';
import SkeletonLoader from '../../shared/components/SkeletonLoader';
import LoadingOverlay from '../../shared/components/LoadingOverlay';
import PageLoader from '../../shared/components/PageLoader';
import Button from '../../shared/components/Button';
import { useColors } from '../../shared/hooks/useColors';
import { FiDownload, FiRefreshCw, FiCheck, FiAlertCircle } from 'react-icons/fi';

const LoadingDemo = () => {
  const colors = useColors();
  const [showOverlay, setShowOverlay] = useState(false);
  const [showPageLoader, setShowPageLoader] = useState(false);
  const [buttonLoading, setButtonLoading] = useState(false);
  const [buttonLoading2, setButtonLoading2] = useState(false);

  const simulateLoading = (setter) => {
    setter(true);
    setTimeout(() => setter(false), 2000);
  };

  return (
    <div style={{ background: colors.bg, minHeight: '100vh', paddingBottom: '100px' }}>
      <Navbar />
      
      {showPageLoader && <PageLoader />}
      {showOverlay && (
        <LoadingOverlay 
          message="Processing your request..." 
          onClose={() => setShowOverlay(false)}
        />
      )}

      <div style={{ maxWidth: '1200px', margin: '0 auto', padding: '100px 24px 0' }}>
        <h1 style={{ fontSize: '42px', fontWeight: 800, marginBottom: '12px', color: colors.text }}>
          Loading States Demo
        </h1>
        <p style={{ color: colors.textSec, fontSize: '16px', marginBottom: '48px', maxWidth: '600px' }}>
          Explore different loading states and animations for your PureAir application.
        </p>

        {/* Spinner Variations */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: colors.text }}>
            Loading Spinners
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', 
            gap: '24px',
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            padding: '32px'
          }}>
            <div style={{ textAlign: 'center' }}>
              <LoadingSpinner size={40} />
              <p style={{ color: colors.textSec, marginTop: '12px', fontSize: '14px' }}>Default</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <LoadingSpinner size={60} thickness={6} />
              <p style={{ color: colors.textSec, marginTop: '12px', fontSize: '14px' }}>Large</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <LoadingSpinner size={30} color={colors.danger} />
              <p style={{ color: colors.textSec, marginTop: '12px', fontSize: '14px' }}>Danger</p>
            </div>
            <div style={{ textAlign: 'center' }}>
              <LoadingSpinner size={50} color={colors.success} />
              <p style={{ color: colors.textSec, marginTop: '12px', fontSize: '14px' }}>Success</p>
            </div>
          </div>
        </section>

        {/* Skeleton Loaders */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: colors.text }}>
            Skeleton Loaders
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '24px'
          }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: colors.textSec }}>
                Text Skeletons
              </h3>
              <SkeletonLoader count={3} />
              <SkeletonLoader width="70%" height="16px" />
              <SkeletonLoader width="50%" height="12px" />
            </div>
            
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: colors.textSec }}>
                Card Skeleton
              </h3>
              <SkeletonLoader type="card" width="100%" />
            </div>
            
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '16px', color: colors.textSec }}>
                Circle Skeleton
              </h3>
              <div style={{ display: 'flex', alignItems: 'center', gap: '16px' }}>
                <SkeletonLoader type="circle" width="60px" />
                <div style={{ flex: 1 }}>
                  <SkeletonLoader width="80%" height="16px" />
                  <SkeletonLoader width="60%" height="12px" />
                </div>
              </div>
            </div>
          </div>
        </section>

        {/* Button Loading States */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: colors.text }}>
            Button Loading States
          </h2>
          <div style={{ 
            display: 'flex', 
            flexWrap: 'wrap', 
            gap: '16px',
            background: colors.bgCard,
            border: `1px solid ${colors.border}`,
            borderRadius: '16px',
            padding: '32px'
          }}>
            <Button 
              loading={buttonLoading}
              onClick={() => simulateLoading(setButtonLoading)}
            >
              <FiDownload size={16} />
              Download Report
            </Button>
            
            <Button 
              variant="secondary"
              loading={buttonLoading2}
              onClick={() => simulateLoading(setButtonLoading2)}
            >
              <FiRefreshCw size={16} />
              Refresh Data
            </Button>
            
            <Button variant="outline" size="small">
              Small Button
            </Button>
            
            <Button variant="danger" size="large">
              <FiAlertCircle size={18} />
              Delete
            </Button>
            
            <Button variant="ghost" disabled>
              Disabled
            </Button>
          </div>
        </section>

        {/* Overlay & Page Loaders */}
        <section style={{ marginBottom: '60px' }}>
          <h2 style={{ fontSize: '24px', fontWeight: 700, marginBottom: '24px', color: colors.text }}>
            Overlay & Page Loaders
          </h2>
          <div style={{ 
            display: 'grid', 
            gridTemplateColumns: 'repeat(auto-fit, minmax(300px, 1fr))', 
            gap: '24px'
          }}>
            <div style={{ 
              background: colors.bgCard,
              border: `1px solid ${colors.border}`,
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: colors.text }}>
                Loading Overlay
              </h3>
              <p style={{ color: colors.textSec, marginBottom: '24px', fontSize: '14px' }}>
                Shows a modal overlay with loading spinner
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowOverlay(true);
                  setTimeout(() => setShowOverlay(false), 2000);
                }}
              >
                Show Overlay
              </Button>
            </div>
            
            <div style={{ 
              background: colors.bgCard,
              border: `1px solid ${colors.border}`,
              borderRadius: '16px',
              padding: '32px',
              textAlign: 'center'
            }}>
              <h3 style={{ fontSize: '18px', fontWeight: 600, marginBottom: '16px', color: colors.text }}>
                Page Loader
              </h3>
              <p style={{ color: colors.textSec, marginBottom: '24px', fontSize: '14px' }}>
                Full-page loader for route transitions
              </p>
              <Button 
                variant="outline"
                onClick={() => {
                  setShowPageLoader(true);
                  setTimeout(() => setShowPageLoader(false), 2000);
                }}
              >
                Show Page Loader
              </Button>
            </div>
          </div>
        </section>

        {/* Usage Instructions */}
        <section style={{ 
          background: colors.bgCard2,
          border: `1px solid ${colors.border}`,
          borderRadius: '16px',
          padding: '32px',
          marginTop: '40px'
        }}>
          <h2 style={{ fontSize: '20px', fontWeight: 700, marginBottom: '20px', color: colors.text }}>
            How to Use These Components
          </h2>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(250px, 1fr))', gap: '24px' }}>
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: colors.primary }}>
                Import Components
              </h3>
              <pre style={{ 
                background: colors.bg, 
                padding: '16px', 
                borderRadius: '8px', 
                fontSize: '13px',
                color: colors.textSec,
                overflow: 'auto'
              }}>
{`import LoadingSpinner from '../../shared/components/LoadingSpinner';
import SkeletonLoader from '../../shared/components/SkeletonLoader';
import Button from '../../shared/components/Button';`}
              </pre>
            </div>
            
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: colors.primary }}>
                Basic Usage
              </h3>
              <pre style={{ 
                background: colors.bg, 
                padding: '16px', 
                borderRadius: '8px', 
                fontSize: '13px',
                color: colors.textSec,
                overflow: 'auto'
              }}>
{`// Loading spinner
<LoadingSpinner size={40} />

// Skeleton loader  
<SkeletonLoader type="card" />

// Button with loading
<Button loading={isLoading}>
  Submit
</Button>`}
              </pre>
            </div>
            
            <div>
              <h3 style={{ fontSize: '16px', fontWeight: 600, marginBottom: '12px', color: colors.primary }}>
                Best Practices
              </h3>
              <ul style={{ color: colors.textSec, fontSize: '14px', lineHeight: 1.6, paddingLeft: '20px' }}>
                <li>Use spinners for actions under 2 seconds</li>
                <li>Use skeletons for content loading</li>
                <li>Show loading states immediately</li>
                <li>Provide feedback for all async actions</li>
                <li>Consider using progressive loading</li>
              </ul>
            </div>
          </div>
        </section>
      </div>
    </div>
  );
};

export default LoadingDemo;
