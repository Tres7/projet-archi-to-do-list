import { Container, Row, Col } from 'react-bootstrap';
import Header from '../shared/ui/Header';
import ProjectCard from '../features/project/ui/ProjectCard';
import AddProjectForm from '../features/project/ui/AddProjectForm';
import { useProjects } from '../features/project/model/useProjects';

export default function ProjectsPage() {
    const { projects, createProject } = useProjects();

    return (
        <>
            <Header />
            <Container className="mt-4">
                <Row>
                    <Col md={{ offset: 3, span: 6 }}>
                        <AddProjectForm onNewProject={createProject} />
                        {projects.length === 0 && (
                            <p className="text-center">No projects yet! You can add one!</p>
                        )}
                        {projects.map((project) => (
                            <ProjectCard key={project.id} project={project} />
                        ))}
                    </Col>
                </Row>
            </Container>
        </>
    );
}
