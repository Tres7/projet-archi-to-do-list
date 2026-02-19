import React from 'react';
import { useNavigate } from 'react-router-dom';
import { userApi } from '../api/user-api';
import { getUserId, getUsername, removeToken } from '../../../shared/utils/tokenStorage';

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
            setSuccess('Nom d\'utilisateur mis à jour');
        } catch {
            setError('Échec de la mise à jour du nom');
        }
    }, [userId]);

    const changePassword = React.useCallback(async (newPassword: string) => {
        try {
            setError('');
            await userApi.changePassword(userId!, newPassword);
            setSuccess('Mot de passe modifié');
        } catch {
            setError('Échec du changement de mot de passe');
        }
    }, [userId]);

    const deleteAccount = React.useCallback(async () => {
        try {
            setError('');
            await userApi.deleteAccount(userId!);
            removeToken();
            navigate('/auth');
        } catch {
            setError('Échec de la suppression du compte');
        }
    }, [userId, navigate]);

    return { username, error, success, updateUsername, changePassword, deleteAccount };
};