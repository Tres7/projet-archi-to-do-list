import React from 'react';
import { Form, InputGroup, Button } from 'react-bootstrap';

interface AddProjectFormProps {
    onNewProject: (name: string, description: string) => Promise<void>;
}

export default function AddProjectForm({ onNewProject }: AddProjectFormProps) {
    const [name, setName] = React.useState('');
    const [description, setDescription] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    const handleSubmit: React.SubmitEventHandler<HTMLFormElement> = async (e) => {
        e.preventDefault();
        setSubmitting(true);
        
        try {
            await onNewProject(name, description);
            setName('');
            setDescription('');
        } finally {
          setSubmitting(false);
        }
    
    };

    return (
        <Form onSubmit={handleSubmit}>
            <InputGroup className="mb-2">
                <Form.Control
                    value={name}
                    onChange={(e) => setName(e.target.value)}
                    type="text"
                    placeholder="Project name"
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
                    {submitting ? 'Creating...' : 'Add Project'}
                </Button>
            </InputGroup>
        </Form>
    );
}
