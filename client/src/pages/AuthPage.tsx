import { useState } from 'react';
import { Container, Row, Col, Card, Tab, Nav } from 'react-bootstrap';
import LoginForm from '../features/auth/ui/LoginForm';
import RegisterForm from '../features/auth/ui/RegisterForm';
import type { LoginRequest, RegisterRequest } from '../features/auth/model/types';

export default function AuthPage() {
    const [activeTab, setActiveTab] = useState('login');

    const handleLogin = (data: LoginRequest) => {
        console.log('login', data);
    };

    const handleRegister = (data: RegisterRequest) => {
        console.log('register', data);
    };

    return (
        <Container>
            <Row>
                <Col md={{ offset: 3, span: 6 }}>
                    <Card className="mt-5">
                        <Card.Body>
                            <Tab.Container
                                activeKey={activeTab}
                                onSelect={(k) => setActiveTab(k ?? 'login')}
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
                                        <LoginForm onSubmit={handleLogin} />
                                    </Tab.Pane>
                                    <Tab.Pane eventKey="register">
                                        <RegisterForm onSubmit={handleRegister} />
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