import { Container, Row, Col, Button } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import Header from '../shared/ui/Header';
import TaskListCard from '../features/task/ui/TaskListCard';
import { useProjectDetail } from '../features/project/model/useProjectDetail';

export default function ProjectDetailPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const { project, closeProject } = useProjectDetail(projectId!);

    if (!project) return <p>Loading...</p>;

    return (
        <>
            <Header />
            <Container className="mt-4">
                <Row>
                    <Col md={{ offset: 3, span: 6 }}>
                        <div className="d-flex justify-content-between align-items-center mb-3">
                            <h2>{project.name}</h2>
                            <Button
                                variant="danger"
                                disabled={project.openTaskCount > 0}
                                onClick={closeProject}
                            >
                                Close Project
                            </Button>
                        </div>
                        <p className="text-muted">{project.description}</p>
                        <TaskListCard
                            projectId={project.id}
                            initialTasks={project.tasks}
                        />
                    </Col>
                </Row>
            </Container>
        </>
    );
}
