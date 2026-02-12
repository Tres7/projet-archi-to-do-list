import React from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';

interface AddItemFormProps {
    onNewItem: (newItem: string) => void;
}

export default function AddItemForm({ onNewItem }: AddItemFormProps) {
    const [newItem, setNewItem] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    const submitNewItem: React.SubmitEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        setSubmitting(true);
        onNewItem(newItem);
        setSubmitting(false);
        setNewItem('');
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
