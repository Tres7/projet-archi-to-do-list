import React from 'react';
import type { Item } from './types';
import { todoApi } from '../api/todo-api';

export const useTodos = () => {
    const [items, setItems] = React.useState<Item[]>([]);

    React.useEffect(() => {
        todoApi.getItems().then(setItems);
    }, []);

    const createItem = React.useCallback(
        async (name: string) => {
            const created = await todoApi.createItem(name);
            setItems([...items, created]);
        },
        [items],
    );

    const updateItem = React.useCallback(
        async (item: Item) => {
            const updated = await todoApi.updateItem(item);
            const index = items.findIndex((i) => i.id === updated.id);
            setItems([
                ...items.slice(0, index),
                updated,
                ...items.slice(index + 1),
            ]);
            return updated;
        },
        [items],
    );

    const removeItem = React.useCallback(
        async (item: Item) => {
            await todoApi.deleteItem(item.id);
            const index = items.findIndex((i) => i.id === item.id);
            setItems([...items.slice(0, index), ...items.slice(index + 1)]);
        },
        [items],
    );

    return { items, createItem, updateItem, removeItem };
};
