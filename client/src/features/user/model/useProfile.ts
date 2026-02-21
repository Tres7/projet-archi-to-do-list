import React from 'react';
import { useNavigate } from 'react-router-dom';
import axios from 'axios';
import { userApi } from '../api/user-api';
import { getUserId, getUsername, removeToken, setUsernameCache } from '../../../shared/utils/tokenStorage';

export const useProfile = () => {
    const [error, setError] = React.useState('');
    const [success, setSuccess] = React.useState('');
    const navigate = useNavigate();
    const userId = getUserId();
    const username = getUsername();

    const updateUsername = React.useCallback(async (newUsername: string) => {
        try {
            setError('');
            await userApi.updateUsername(userId!, newUsername);
            const updated = await userApi.getUserById(userId!);
            setUsernameCache(updated.userName);
            setSuccess('Username updated');
            navigate('/profile');
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 409) {
                setError('Username already taken');
            } else {
                setError('Failed to update username');
            }
        }
    }, [userId,navigate]);

    const changePassword = React.useCallback(async (newPassword: string) => {
        try {
            setError('');
            await userApi.changePassword(userId!, newPassword);
            setSuccess('Password changed');
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 404) {
                setError('User not found');
            } else {
                setError('Failed to change password');
            }
        }
    }, [userId]);

    const deleteAccount = React.useCallback(async () => {
        try {
            setError('');
            await userApi.deleteAccount(userId!);
            removeToken();
            navigate('/auth');
        } catch (e) {
            if (axios.isAxiosError(e) && e.response?.status === 404) {
                setError('User not found');
            } else {
                setError('Failed to delete account');
            }
        }
    }, [userId, navigate]);

    return { username, error, success, updateUsername, changePassword, deleteAccount };
};