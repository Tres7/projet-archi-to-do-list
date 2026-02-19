import { BrowserRouter, Route, Routes } from 'react-router-dom';
import TodoPage from '../pages/TodoPage';
import AuthPage from '../pages/AuthPage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<TodoPage />} />
                <Route path="/auth" element={<AuthPage />} />
            </Routes>
        </BrowserRouter>
    );
}
