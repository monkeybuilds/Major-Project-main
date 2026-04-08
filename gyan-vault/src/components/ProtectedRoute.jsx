import { Navigate } from 'react-router-dom';

function ProtectedRoute({ children }) {
    const token = localStorage.getItem('gyan_vault_token');

    if (!token) {
        return <Navigate to="/" replace />;
    }

    return children;
}

export default ProtectedRoute;
