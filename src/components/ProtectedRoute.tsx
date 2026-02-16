import { Navigate, useLocation } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';

export function ProtectedRoute({ children }: { children: React.ReactNode }) {
  const { isAuthenticated, user } = useAuth();
  const location = useLocation();

  console.log('🔒 ProtectedRoute check:');
  console.log('   - isAuthenticated:', isAuthenticated);
  console.log('   - user:', user);
  console.log('   - current location:', location.pathname);

  if (!isAuthenticated) {
    console.log('❌ Not authenticated, redirecting to /login');
    return <Navigate to="/login" replace state={{ from: location }} />;
  }

  console.log('✅ Authenticated, rendering protected content');
  return <>{children}</>;
}