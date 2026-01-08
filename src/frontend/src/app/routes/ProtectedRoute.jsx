import { Navigate, Outlet, useLocation } from 'react-router-dom';

export default function ProtectedRoute({ allowed = [], requireAuthOnly = false }) {
    const location = useLocation();

    return <Outlet />;
}
