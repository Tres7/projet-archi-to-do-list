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
};

