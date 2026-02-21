import { apiClient } from '../../../shared/api/apiClient';
import type { Item } from '../model/types';

export const todoApi = {
    getItems: async (): Promise<Item[]> => {
        return (await apiClient.get<Item[]>('/items')).data;
    },

    createItem: async (name: string): Promise<Item> => {
        return (await apiClient.post<Item>('/items', { name })).data;
    },

    updateItem: async (item: Item): Promise<Item> => {
        return (await apiClient.put<Item>(`/items/${item.id}`, item)).data;
    },

    deleteItem: async (id: string): Promise<void> => {
        await apiClient.delete(`/items/${id}`);
    },
};
