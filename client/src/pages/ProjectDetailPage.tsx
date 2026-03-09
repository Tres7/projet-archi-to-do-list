import { Container, Row, Col, Button } from 'react-bootstrap';
import { useParams } from 'react-router-dom';
import Header from '../shared/ui/Header';
import TaskListCard from '../features/task/ui/TaskListCard';
import { useProjectDetail } from '../features/project/model/useProjectDetail';
import { useNotificationEvent } from '../shared/notifications/useNotificationEvent';

export default function ProjectDetailPage() {
    const { projectId } = useParams<{ projectId: string }>();
    const { project, closeProject, fetchProjectDetail } = useProjectDetail(
        projectId!,
    );

    useNotificationEvent('task.created', (event) => {
        if (event.projectId !== projectId) return;
        fetchProjectDetail();
    });

    useNotificationEvent('task.updated', (event) => {
        console.log('task.updated event received', event);
        if (event.projectId !== projectId) return;
        fetchProjectDetail();
    });

    useNotificationEvent('task.deleted', (event) => {
        if (event.projectId !== projectId) return;
        fetchProjectDetail();
    });

    useNotificationEvent('project.closed', (event) => {
        if (event.projectId !== projectId) return;
        fetchProjectDetail();
    });

    useNotificationEvent('operation.rejected', (event) => {
        if (event.projectId !== projectId) return;
        alert(event.reason);
    });

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
                                disabled={
                                    project.openTaskCount > 0 ||
                                    project.status === 'CLOSED'
                                }
                                onClick={closeProject}
                            >
                                Close Project
                            </Button>
                        </div>
                        <p className="text-muted">{project.description}</p>
                        <TaskListCard
                            projectId={project.id}
                            tasks={project.tasks}
                        />
                    </Col>
                </Row>
            </Container>
        </>
    );
}
