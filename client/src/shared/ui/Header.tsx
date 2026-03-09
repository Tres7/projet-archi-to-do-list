import { Navbar, Container, Button } from 'react-bootstrap';
import { Link } from 'react-router-dom';
import { getUserId, getUsername } from '../utils/tokenStorage';
import { useAuth } from '../../features/auth/model/useAuth';
import { AppNotifications } from '../notifications/AppNotification';
import { NotificationBell } from './NotificationBell';

export default function Header() {
    const username = getUsername();
    const { logout } = useAuth();
    const userId = getUserId();
    return (
        <Navbar bg="dark" variant="dark">
            <AppNotifications userId={userId ?? null} />
            <Container>
                <Navbar.Brand as={Link} to="/">
                    Project management App
                </Navbar.Brand>
                <div className="d-flex align-items-center gap-3">
                    <NotificationBell />
                    <Link
                        to="/profile"
                        className="text-white d-flex align-items-center gap-2"
                    >
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
