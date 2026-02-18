import { BrowserRouter, Route, Routes } from 'react-router-dom';
import TodoPage from '../pages/TodoPage';

export default function App() {
    return (
        <BrowserRouter>
            <Routes>
                <Route path="/" element={<TodoPage />} />
            </Routes>
        </BrowserRouter>
    );
}
