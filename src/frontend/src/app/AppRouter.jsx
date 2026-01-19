import {Suspense} from 'react';
import {Navigate, Route, Routes} from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import PublicRoute from './routes/PublicRoute.jsx';
import NotFoundPage from '@pages/NotFoundPage.jsx';
import SwaggerPage from '@pages/SwaggerPage.jsx';
import SwaggerOAuthRedirect from '@pages/SwaggerOAuthRedirect.jsx';

export default function AppRouter() {
    return (
        <Suspense>
            <Routes>
                <Route element={<PublicRoute/>}>
                    <Route path="/" element={<Navigate to="/swagger" replace/>}/>
                    <Route path="/swagger" element={<SwaggerPage/>}/>
                    <Route path="/swagger/oauth2-redirect" element={<SwaggerOAuthRedirect/>}/>
                    <Route path="/swagger/oauth2-redirect.html" element={<SwaggerOAuthRedirect/>}/>
                </Route>

                <Route element={<ProtectedRoute/>}></Route>

                <Route element={<ProtectedRoute /*allowed={['catalog:read']}*/ />}></Route>

                <Route path="*" element={<NotFoundPage/>}/>
            </Routes>
        </Suspense>
    );
}
