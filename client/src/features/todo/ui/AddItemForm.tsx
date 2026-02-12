import React from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';
import type { Item } from '../model/types';
import { todoApi } from '../api/todo-api';

interface AddItemFormProps {
    onNewItem: (newItem: Item) => void;
}

export default function AddItemForm({ onNewItem }: AddItemFormProps) {
    const [newItem, setNewItem] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    const submitNewItem: React.SubmitEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        setSubmitting(true);
        todoApi.createItem(newItem).then((item) => {
            onNewItem(item);
            setSubmitting(false);
            setNewItem('');
        });
    };

    return (
        <Form onSubmit={submitNewItem}>
            <InputGroup className="mb-3">
                <Form.Control
                    value={newItem}
                    onChange={(e) => setNewItem(e.target.value)}
                    type="text"
                    placeholder="New Item"
                    aria-describedby="basic-addon1"
                />
                <Button
                    type="submit"
                    variant="success"
                    disabled={submitting || !newItem.length}
                    className={submitting ? 'disabled' : ''}
                >
                    {submitting ? 'Adding...' : 'Add Item'}
                </Button>
            </InputGroup>
        </Form>
    );
}
