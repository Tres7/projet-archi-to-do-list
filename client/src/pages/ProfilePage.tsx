import React from 'react';
import { Container, Row, Col, Card, Form, Button, Alert } from 'react-bootstrap';
import Header from '../shared/ui/Header';
import { useProfile } from '../features/user/model/useProfile';

export default function ProfilePage() {
    const { email, username, error, success, updateUsername, changePassword, deleteAccount } = useProfile();
    const [newUsername, setNewUsername] = React.useState('');
    const [newPassword, setNewPassword] = React.useState('');
    const [confirmDelete, setConfirmDelete] = React.useState(false);

    return (
        <>
            <Header />
            <Container className="mt-4">
                <Row>
                    <Col md={{ offset: 3, span: 6 }}>
                        {error && <Alert variant="danger">{error}</Alert>}
                        {success && <Alert variant="success">{success}</Alert>}

                        <Card className="mb-3">
                            <Card.Body>
                                <Card.Title>Profile</Card.Title>
                                <p>Current username : <strong>{username}</strong></p>
                                <p>Current email : <strong>{email}</strong></p>
                            </Card.Body>
                        </Card>

                        <Card className="mb-3">
                            <Card.Body>
                                <Card.Title>Change username</Card.Title>
                                <Form onSubmit={(e) => { e.preventDefault(); updateUsername(newUsername); }}>
                                    <Form.Control
                                        type="text"
                                        placeholder="New username"
                                        value={newUsername}
                                        onChange={(e) => setNewUsername(e.target.value)}
                                        className="mb-2"
                                    />
                                    <Button type="submit" variant="primary" disabled={!newUsername}>
                                        Update
                                    </Button>
                                </Form>
                            </Card.Body>
                        </Card>

                        <Card className="mb-3">
                            <Card.Body>
                                <Card.Title>Change password</Card.Title>
                                <Form onSubmit={(e) => { e.preventDefault(); changePassword(newPassword); }}>
                                    <Form.Control
                                        type="password"
                                        placeholder="New password"
                                        value={newPassword}
                                        onChange={(e) => setNewPassword(e.target.value)}
                                        className="mb-2"
                                    />
                                    <Button type="submit" variant="primary" disabled={!newPassword}>
                                        Update
                                    </Button>
                                </Form>
                            </Card.Body>
                        </Card>

                        <Card border="danger">
                            <Card.Body>
                                <Card.Title className="text-danger">Delete account</Card.Title>
                                <p className="text-muted">This action is irreversible.</p>
                                {!confirmDelete ? (
                                    <Button variant="outline-danger" onClick={() => setConfirmDelete(true)}>
                                        Delete my account
                                    </Button>
                                ) : (
                                    <div className="d-flex gap-2">
                                        <Button variant="danger" onClick={deleteAccount}>
                                            Confirm delete
                                        </Button>
                                        <Button variant="secondary" onClick={() => setConfirmDelete(false)}>
                                            Cancel
                                        </Button>
                                    </div>
                                )}
                            </Card.Body>
                        </Card>
                    </Col>
                </Row>
            </Container>
        </>
    );
}