import { Navbar, Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getUsername } from '../utils/tokenStorage';
import { useAuth } from '../../features/auth/model/useAuth';

export default function Header() {
     const username = getUsername();
     const { logout } = useAuth();
    return (
        <Navbar bg="dark" variant="dark">
            <Container>
                <Navbar.Brand as={Link} to="/">Todo App</Navbar.Brand>
                <div className="d-flex align-items-center gap-3">
                    <Link to="/profile" className="text-white d-flex align-items-center gap-2">
                        <i className="fa-solid fa-user fa-lg" />
                        {username && <span>{username}</span>}
                    </Link>
                    <Button variant="outline-light" size="sm" onClick={logout}>
                        Logout
                    </Button>
                </div>
            </Container>
        </Navbar>
    );
}
