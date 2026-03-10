import { Card, Badge, Button } from 'react-bootstrap';
import { useNavigate } from 'react-router-dom';
import type { Project } from '../model/types';

interface ProjectCardProps {
    project: Project;
    onDelete?: (projectId: string) => void;
}

export default function ProjectCard({ project, onDelete }: ProjectCardProps) {
    const navigate = useNavigate();
    console.log('Rendering ProjectCard for project:', project);
    return (
        <Card
            className="mb-3"
            style={{ cursor: 'pointer' }}
            onClick={() => navigate(`/projects/${project.id}`)}
        >
            <Card.Body>
                <Card.Title className="d-flex justify-content-between">
                    {project.name}
                    <Badge
                        bg={project.status === 'OPEN' ? 'success' : 'secondary'}
                    >
                        {project.status}
                    </Badge>
                    <Button
                        variant="outline-danger"
                        size="sm"
                        onClick={(e) => {
                            e.stopPropagation();
                            onDelete?.(project.id);
                        }}
                    >
                        X
                    </Button>
                </Card.Title>
                <Card.Text>{project.description}</Card.Text>
                <small className="text-muted">
                    {project.openTaskCount} task(s) remaining
                </small>
            </Card.Body>
        </Card>
    );
}
