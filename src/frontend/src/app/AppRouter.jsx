import {Suspense} from 'react';
import {Navigate, Route, Routes} from 'react-router-dom';
import ProtectedRoute from './routes/ProtectedRoute.jsx';
import PublicRoute from './routes/PublicRoute.jsx';
import NotFoundPage from '@pages/NotFoundPage.jsx';
import SwaggerPage from '@pages/swagger/SwaggerPage.jsx';
import SwaggerOAuthRedirect from '@pages/swagger/SwaggerOAuthRedirect.jsx';
import TestListPage from '@pages/tests/TestListPage.jsx';
import TestCreatePage from '@pages/tests/TestCreatePage.jsx';
import TestEditPage from '@pages/tests/TestEditPage.jsx';
import QuestionEditPage from '@pages/tests/QuestionEditPage.jsx';
import TestAttemptPage from '@pages/tests/TestAttemptPage.jsx';
import ProfilePage from '@pages/tests/Profile/ProfilePage.jsx';
import InDevelopment from "@pages/InDevelopment.jsx";

export default function AppRouter() {
    return (
        <Suspense>
            <Routes>
                <Route element={<PublicRoute/>}>
                    <Route path="/" element={<Navigate to="/tests" replace/>}/>
                    <Route path="/swagger" element={<SwaggerPage/>}/>
                    <Route path="/swagger/oauth2-redirect" element={<SwaggerOAuthRedirect/>}/>
                    <Route path ="/groups" element={<InDevelopment/>}/>
                    <Route path="*" element={<NotFoundPage/>}/>
                </Route>

                <Route element={<ProtectedRoute/>}>
                    <Route path="/tests" element={<TestListPage/>}/>
                    <Route path="/tests/create" element={<TestCreatePage/>}/>
                    <Route path="/tests/:testId/edit" element={<TestEditPage/>}/>
                    <Route path="/tests/:testId/questions" element={<QuestionEditPage/>}/>
                    <Route path="/tests/:testId/attempt/:attemptId" element={<TestAttemptPage/>}/>
                    <Route path = "/profile" element={<ProfilePage/>}/>
                </Route>
            </Routes>
        </Suspense>
    );
}
