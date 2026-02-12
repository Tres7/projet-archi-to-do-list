import React from 'react';
import AddItemForm from './AddItemForm';
import ItemDisplay from './ItemDisplay';
import { useTodos } from '../model/useTodos';

export default function TodoListCard() {
    const { items, createItem, updateItem, removeItem } = useTodos();

    if (items === null) return 'Loading...';

    return (
        <React.Fragment>
            <AddItemForm onNewItem={createItem} />
            {items.length === 0 && (
                <p className="text-center">No items yet! Add one above!</p>
            )}
            {items.map((item) => (
                <ItemDisplay
                    item={item}
                    key={item.id}
                    onItemUpdate={updateItem}
                    onItemRemoval={removeItem}
                />
            ))}
        </React.Fragment>
    );
}
