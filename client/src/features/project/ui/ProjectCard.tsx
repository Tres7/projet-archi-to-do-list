import { Card, Badge } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../model/types';

interface ProjectCardProps {
    project: Project;
}

export default function ProjectCard({ project }: ProjectCardProps) {
    const navigate = useNavigate();

    return (
        <Card
            className="mb-3"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/projects/${project.id}`)}
        >
            <Card.Body>
                <Card.Title className="d-flex justify-content-between">
                    {project.name}
                    <Badge bg={project.status === 'OPEN' ? 'success' : 'secondary'}>
                        {project.status}
                    </Badge>
                </Card.Title>
                <Card.Text>{project.description}</Card.Text>
                <small className="text-muted">{project.openTaskCount} task(s) remaining</small>
            </Card.Body>
        </Card>
    );
}
