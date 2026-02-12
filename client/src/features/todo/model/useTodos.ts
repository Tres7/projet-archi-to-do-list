import React from 'react';
import type { Item } from './types';
import { todoApi } from '../api/todo-api';

export const useTodos = () => {
    const [items, setItems] = React.useState<Item[]>([]);

    React.useEffect(() => {
        todoApi.getItems().then(setItems);
    }, []);

    const onNewItem = React.useCallback(
        (newItem: Item) => {
            setItems([...items, newItem]);
        },
        [items],
    );

    const onItemUpdate = React.useCallback(
        (item: Item) => {
            const index = items.findIndex((i) => i.id === item.id);
            setItems([
                ...items.slice(0, index),
                item,
                ...items.slice(index + 1),
            ]);
        },
        [items],
    );

    const onItemRemoval = React.useCallback(
        (item: Item) => {
            const index = items.findIndex((i) => i.id === item.id);
            setItems([...items.slice(0, index), ...items.slice(index + 1)]);
        },
        [items],
    );

    return {
        items,
        onNewItem,
        onItemUpdate,
        onItemRemoval,
    };
};
