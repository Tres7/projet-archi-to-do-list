import React from 'react';
import { Form, Button, Alert } from 'react-bootstrap';
import type { RegisterRequest } from '../model/types';

interface RegisterFormProps {
    onSubmit: (data: RegisterRequest) => void;
    error?: string;
}

export default function RegisterForm({ onSubmit, error }: RegisterFormProps) {
    const [username, setUsername] = React.useState('');
    const [password, setPassword] = React.useState('');
    const [confirmPassword, setConfirmPassword] = React.useState('');
    const [validationError, setValidationError] = React.useState('');
    const [submitting, setSubmitting] = React.useState(false);

    const handleSubmit: React.SubmitEventHandler<HTMLFormElement> = (e) => {
        e.preventDefault();
        if (password !== confirmPassword) {
            setValidationError('Passwords do not match');
            return;
        }
        setValidationError('');
        setSubmitting(true);
        onSubmit({ username, password, confirmPassword });
        setSubmitting(false);
    };

    return (
        <Form onSubmit={handleSubmit}>
            {(error || validationError) && (
                <Alert variant="danger">{error || validationError}</Alert>
            )}
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
            <Form.Group className="mb-3">
                <Form.Label>Confirm Password</Form.Label>
                <Form.Control
                    type="password"
                    placeholder="Confirm password"
                    value={confirmPassword}
                    onChange={(e) => setConfirmPassword(e.target.value)}
                />
            </Form.Group>
            <Button
                type="submit"
                variant="success"
                disabled={submitting || !username || !password || !confirmPassword}
            >
                {submitting ? 'Registering...' : 'Register'}
            </Button>
        </Form>
    );
}
