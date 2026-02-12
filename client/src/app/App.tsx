import { Container, Row, Col } from 'react-bootstrap';
import TodoListCard from '../features/todo/ui/TodoListCard';

export default function App() {
    return (
        <Container>
            <Row>
                <Col md={{ offset: 3, span: 6 }}>
                    <TodoListCard />
                </Col>
            </Row>
        </Container>
    );
}
