import type { Item } from '../model/types';

export const todoApi = {
    getItems: async (): Promise<Item[]> => (await fetch('/items')).json(),

    createItem: async (name: string): Promise<Item> => {
        const response = await fetch('/items', {
            method: 'POST',
            body: JSON.stringify({ name }),
            headers: { 'Content-Type': 'application/json' },
        });
        return response.json();
    },

    updateItem: async (item: Item): Promise<Item> => {
        const response = await fetch(`/items/${item.id}`, {
            method: 'PUT',
            body: JSON.stringify({
                name: item.name,
                completed: item.completed,
            }),
            headers: { 'Content-Type': 'application/json' },
        });
        return response.json();
    },

    deleteItem: async (id: number): Promise<void> => {
        await fetch(`/items/${id}`, { method: 'DELETE' });
    },
};
