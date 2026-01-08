import {Suspense} from 'react';
import {Navigate, Route, Routes} from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import PublicRoute from './routes/PublicRoute.jsx';
import NotFoundPage from '@pages/NotFoundPage.jsx';

export default function AppRouter() {
    return (
        <Suspense>
            <Routes>
                <Route element={<PublicRoute/>}></Route>

                <Route element={<ProtectedRoute/>}></Route>

                <Route element={<ProtectedRoute /*allowed={['catalog:read']}*/ />}></Route>

                <Route path="*" element={<NotFoundPage/>}/>
            </Routes>
        </Suspense>
    );
}
