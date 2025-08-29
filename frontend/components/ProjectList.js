import React from 'react';

const ProjectList = ({ projects }) => {
  if (!projects || projects.length === 0) {
    return (
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-primary text-white">
          <h2 className="h5 mb-0">Mes Projets</h2>
        </div>
        <div className="card-body">
          <p className="card-text">Aucun projet en cours.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-primary text-white">
        <h2 className="h5 mb-0">Mes Projets</h2>
      </div>
      <ul className="list-group list-group-flush">
        {projects.map((project) => (
          <li key={project._id} className="list-group-item">
            <div className="d-flex w-100 justify-content-between">
              <h5 className="mb-1">{project.title}</h5>
              <small className={`badge ${project.status === 'approved' ? 'bg-success' : project.status === 'pending' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                {project.status}
              </small>
            </div>
            <p className="mb-1">{project.description}</p>
            {/* Ajoutez d'autres détails du projet ici */}
            {project.repoUrl && <small className="text-muted">Repo: <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">{project.repoUrl}</a></small>}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default ProjectList;
