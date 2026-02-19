import { BrowserRouter, Route, Routes } from 'react-router-dom';
import TodoPage from '../pages/TodoPage';
import AuthPage from '../pages/AuthPage';
import PrivateRoute from '../shared/ui/PrivateRoute';
import ProfilePage from '../pages/ProfilePage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={
                    <PrivateRoute>
                        <TodoPage />
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
