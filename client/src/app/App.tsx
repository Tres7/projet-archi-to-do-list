import { BrowserRouter, Navigate, Route, Routes } from 'react-router-dom';
import AuthPage from '../pages/AuthPage';
import PrivateRoute from '../shared/ui/PrivateRoute';
import ProfilePage from '../pages/ProfilePage';
import ProjectDetailPage from '../pages/ProjectDetailPage';
import ProjectsPage from '../pages/ProjectsPage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={
                    <PrivateRoute>
                        <Navigate to="/projects" />
                    </PrivateRoute>
                } />

                <Route path="/projects" element={
                    <PrivateRoute>
                        <ProjectsPage />
                    </PrivateRoute>
                } />

                <Route path="/projects/:projectId" element={
                    <PrivateRoute>
                        <ProjectDetailPage />
                    </PrivateRoute>
                } />

                <Route path="/profile" element={
                    <PrivateRoute>
                        <ProfilePage />
                    </PrivateRoute>
                } />

                <Route path="/auth" element={<AuthPage />} />

            </Routes>
        </BrowserRouter>
    );
}
