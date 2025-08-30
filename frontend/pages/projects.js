import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken } from '../utils/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    async function loadProjects() {
      try {
        setLoading(true);
    setError(null);

        // Note: The backend route for student projects is now /api/projects/my-projects
        const r = await fetch(`${API}/projects/my-projects`, { headers: { Authorization: `Bearer ${token}` } });
        if (!r.ok) {
          const errorData = await r.json();
          throw new Error(errorData.error || 'Failed to fetch projects');
        }
        const projectsData = await r.json();
        setProjects(projectsData);
      } catch (e) {
        console.error("Error loading projects:", e);
        setError('Error loading projects: ' + e.message);
      } finally {
        setLoading(false);
      }
    }

    loadProjects();
  }, [router]);

  if (loading) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Chargement...</span>
      </div>
      <p className="ms-2">Chargement des projets...</p>
    </div>
  );
  if (error) return <div className="alert alert-danger text-center mt-5">Error loading projects: {error}</div>;

  return (
    <div className="container mt-4 pt-5">
      <h1 className="mb-4">Mes Projets</h1>
      {projects.length === 0 ? (
        <div className="alert alert-info text-center mt-4">
          <i className="bi bi-info-circle me-2"></i> Aucun projet assigné ou approuvé pour le moment.
        </div>
      ) : (
        <div className="row">
          {projects.map(project => (
            <div key={project._id} className="col-md-6 col-lg-4 mb-4">
              <div className="card h-100 shadow-sm">
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title text-primary">
                    <i className="bi bi-folder-check me-2"></i> {project.title}
                  </h5>
                  <p className="card-text text-muted flex-grow-1">{project.description}</p>
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <span className={`badge rounded-pill bg-${project.status === 'assigned' ? 'warning text-dark' : 'success'}`}>
                      {project.status === 'assigned' ? 'Assigné' : 'Approuvé'}
                    </span>
                    {project.repoUrl && (
                      <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-sm btn-outline-secondary">
                        <i className="bi bi-github me-1"></i> Dépôt
                      </a>
                    )}
                  </div>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}

export default ProjectsPage;
