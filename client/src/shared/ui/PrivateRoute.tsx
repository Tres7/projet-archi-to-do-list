import { Navigate } from 'react-router-dom';
import { getToken } from '../utils/tokenStorage';

export default function PrivateRoute({ children }: { children: React.ReactNode }) {
    return getToken() ? <>{children}</> : <Navigate to="/auth" />;
}