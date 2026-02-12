import type { Item } from '../model/types';

export const todoApi = {
    getItems: async (): Promise<Item[]> => (await fetch('/items')).json(),
};
