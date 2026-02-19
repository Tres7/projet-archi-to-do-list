import React from 'react';
import { useNavigate } from 'react-router-dom';
import { authApi } from '../api/auth-api';
import { setToken, removeToken, getToken } from '../../../shared/utils/tokenStorage';
import type { LoginRequest, RegisterRequest } from './types';

export const useAuth = () => {
    const [isAuthenticated, setIsAuthenticated] = React.useState<boolean>(
        () => !!getToken(),
    );
    const [error, setError] = React.useState<string>('');
    const navigate = useNavigate();

    const login = React.useCallback(async (data: LoginRequest) => {
        try {
            setError('');
            const token = await authApi.login(data);
            setToken(token);
            setIsAuthenticated(true);
            navigate('/');
        } catch {
            setError('Invalid username or password');
        }
    }, [navigate]);

    const register = React.useCallback(async (data: RegisterRequest) => {
        try {
            setError('');
            await authApi.register(data);
            const token = await authApi.login({
                username: data.username,
                password: data.password,
            });
            setToken(token);
            setIsAuthenticated(true);
            navigate('/');
        } catch {
            setError('Registration failed. Username may already exist.');
        }
    }, [navigate]);

    const logout = React.useCallback(() => {
        removeToken();
        setIsAuthenticated(false);
        navigate('/auth');
    }, [navigate]);

    return { isAuthenticated, error, login, register, logout };
};
