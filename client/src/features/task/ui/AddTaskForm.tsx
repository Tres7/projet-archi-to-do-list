import React from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';

interface AddTaskFormProps {
    onNewTask: (name: string, description: string) => void;
}

export default function AddTaskForm({ onNewTask }: AddTaskFormProps) {
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    const handleSubmit: React.SubmitEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        setSubmitting(true);
        onNewTask(name, description);
        setSubmitting(false);
        setName('');
        setDescription('');
    };

    return (
        <Form onSubmit={handleSubmit}>
            <InputGroup className="mb-2">
                <Form.Control
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    type="text"
                    placeholder="Task name"
                />
            </InputGroup>
            <InputGroup className="mb-3">
                <Form.Control
                    value={description}
                    onChange={(e) => setDescription(e.target.value)}
                    type="text"
                    placeholder="Description"
                />
                <Button
                    type="submit"
                    variant="success"
                    disabled={submitting || !name.length}
                >
                    {submitting ? 'Adding...' : 'Add Task'}
                </Button>
            </InputGroup>
        </Form>
    );
}
