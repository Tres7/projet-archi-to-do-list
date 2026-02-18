import React from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import type { LoginRequest } from '../model/types';

interface LoginFormProps {
    onSubmit: (data: LoginRequest) => void;
    error?: string;
}

export default function LoginForm({ onSubmit, error }: LoginFormProps) {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    const handleSubmit: React.SubmitEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        setSubmitting(true);
        onSubmit({ username, password });
        setSubmitting(false);
    };

    return (
        <Form onSubmit={handleSubmit}>
            {error && <Alert variant="danger">{error}</Alert>}
            <Form.Group className="mb-3">
                <Form.Label>Username</Form.Label>
                <Form.Control
                    type="text"
                    placeholder="Enter username"
                    value={username}
                    onChange={(e) => setUsername(e.target.value)}
                />
            </Form.Group>
            <Form.Group className="mb-3">
                <Form.Label>Password</Form.Label>
                <Form.Control
                    type="password"
                    placeholder="Enter password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                />
            </Form.Group>
            <Button
                type="submit"
                variant="success"
                disabled={submitting || !username || !password}
            >
                {submitting ? 'Logging in...' : 'Login'}
            </Button>
        </Form>
    );
}