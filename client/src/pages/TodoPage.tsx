import { Container, Row, Col } from 'react-bootstrap';
import TodoListCard from '../features/todo/ui/TodoListCard';
import Header from '../shared/ui/Header';

export default function TodoPage() {
    return (
        <>
        <Header />
            <Container className="mt-4">
                <Row>
                    <Col md={{ offset: 3, span: 6 }}>
                        <TodoListCard />
                    </Col>
                </Row>
            </Container>
        </>    
    );
}