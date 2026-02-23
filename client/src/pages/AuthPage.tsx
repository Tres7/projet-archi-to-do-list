import { useState } from 'react';
import { Container, Row, Col, Card, Tab, Nav } from 'react-bootstrap';
import LoginForm from '../features/auth/ui/LoginForm';
import RegisterForm from '../features/auth/ui/RegisterForm';
import { useAuth } from '../features/auth/model/useAuth';

export default function AuthPage() {
    const [activeTab, setActiveTab] = useState('login');
    const { login, register, error, clearError } = useAuth();

    return (
        <Container>
            <Row>
                <Col md={{ offset: 3, span: 6 }}>
                    <Card className="mt-5">
                        <Card.Body>
                            <Tab.Container
                                activeKey={activeTab}
                                onSelect={(k) => {
                                    clearError();
                                    setActiveTab(k ?? 'login')
                                }}
                            >
                                <Nav variant="tabs" className="mb-3">
                                    <Nav.Item>
                                        <Nav.Link eventKey="login">Login</Nav.Link>
                                    </Nav.Item>
                                    <Nav.Item>
                                        <Nav.Link eventKey="register">Register</Nav.Link>
                                    </Nav.Item>
                                </Nav>
                                <Tab.Content>
                                    <Tab.Pane eventKey="login">
                                        <LoginForm onSubmit={login} error={error} />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="register">
                                        <RegisterForm key={activeTab} onSubmit={register} error={error} />
                                    </Tab.Pane>
                                </Tab.Content>
                            </Tab.Container>
                        </Card.Body>
                    </Card>
                </Col>
            </Row>
        </Container>
    );
}