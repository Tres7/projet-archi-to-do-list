import { Container, Row, Col, Button } from 'react-bootstrap';
import type { Task } from '../model/types';

interface TaskItemProps {
    task: Task;
    onToggle: (taskId: string) => void;
    onDelete: (taskId: string) => void;
}

export default function TaskItem({ task, onToggle, onDelete }: TaskItemProps) {
    return (
        <Container fluid className={`item ${task.status === 'DONE' && 'completed'}`}>
            <Row>
                <Col xs={1} className="text-center">
                    <Button
                        className="toggles"
                        size="sm"
                        variant="link"
                        onClick={() => onToggle(task.id)}
                        aria-label={task.status === 'DONE' ? 'Reopen task' : 'Complete task'}
                    >
                        <i className={`far ${task.status === 'DONE' ? 'fa-check-square' : 'fa-square'}`} />
                    </Button>
                </Col>
                <Col xs={10} className="name">
                    {task.name}
                </Col>
                <Col xs={1} className="text-center remove">
                    <Button
                        size="sm"
                        variant="link"
                        onClick={() => onDelete(task.id)}
                        aria-label="Remove Task"
                    >
                        <i className="fa fa-trash text-danger" />
                    </Button>
                </Col>
            </Row>
        </Container>
    );
}