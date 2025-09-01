import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken } from '../utils/auth';
import React from 'react'; // Added for React.Fragment

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function ProjectsPage() {
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [showProjectModal, setShowProjectModal] = useState(false); // Nouvel état pour la modale
  const [selectedProject, setSelectedProject] = useState(null); // Nouvel état pour le projet sélectionné
  const [me, setMe] = useState(null); // Pour stocker les infos de l'utilisateur (rôle)
  const [allProjects, setAllProjects] = useState([]); // Pour stocker tous les projets (staff/admin)
  // États pour les modales CRUD des projets
  const [showAddProjectModal, setShowAddProjectModal] = useState(false);
  const [showEditProjectModal, setShowEditProjectModal] = useState(false);
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false);
  const [currentProjectToEdit, setCurrentProjectToEdit] = useState(null);
  const [currentProjectToDelete, setCurrentProjectToDelete] = useState(null);
  const [confirmProjectTitle, setConfirmProjectTitle] = useState('');
  // États pour le formulaire d'ajout/modification de projet
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectRepoUrl, setProjectRepoUrl] = useState('');
  const [projectDemoVideoUrl, setProjectDemoVideoUrl] = useState('');
  const [projectSpecifications, setProjectSpecifications] = useState('');
  const [projectSize, setProjectSize] = useState('short');
  const router = useRouter();

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    async function loadData() {
      try {
        setLoading(true);
    setError(null);

        // Charger les informations de l'utilisateur
        const userRes = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
        if (!userRes.ok) {
          const errorData = await userRes.json();
          throw new Error(errorData.error || 'Échec du chargement des données utilisateur.');
        }
        const userData = await userRes.json();
        setMe(userData);

        // Chargement conditionnel des projets
        let projectsToSet = [];
        if (userData.role === 'staff' || userData.role === 'admin') {
          // Pour staff/admin: charger tous les projets
          const allProjectsRes = await fetch(`${API}/projects/all`, { headers: { Authorization: `Bearer ${token}` } });
          if (!allProjectsRes.ok) {
            const errorData = await allProjectsRes.json();
            throw new Error(errorData.error || 'Échec du chargement de tous les projets.');
          }
          const rawProjects = await allProjectsRes.json();
          // Dédupliquer les projets par _id
          const uniqueProjects = Array.from(new Map(rawProjects.map(project => [project._id, project])).values());
          // Sépare les projets templates des projets assignés
          const projectTemplates = uniqueProjects.filter(p => p.status === 'template');
          const studentProjects = uniqueProjects.filter(p => p.status !== 'template');

          // Regrouper les projets d'apprenants par leur templateProject
          const groupedProjects = projectTemplates.map(template => ({
            ...template,
            assignedProjects: studentProjects.filter(p => p.templateProject && p.templateProject._id === template._id)
          }));
          
          // Si des projets d'apprenants n'ont pas de template (ce qui ne devrait pas arriver avec la logique actuelle, mais au cas où)
          const projectsWithoutTemplate = studentProjects.filter(p => !p.templateProject);
          
          setAllProjects(groupedProjects);
          setProjects(projectsWithoutTemplate); // Pourrait être utilisé pour afficher des projets non liés à un template
        } else {
          // Pour apprenant: charger leurs projets
          const myProjectsRes = await fetch(`${API}/projects/my-projects`, { headers: { Authorization: `Bearer ${token}` } });
          if (!myProjectsRes.ok) {
            const errorData = await myProjectsRes.json();
            throw new Error(errorData.error || 'Échec du chargement de mes projets.');
          }
          projectsToSet = await myProjectsRes.json();
        }
        setProjects(projectsToSet);
    } catch (e) {
        console.error("Error loading projects page data:", e);
        setError('Error loading data: ' + e.message);
      } finally {
        setLoading(false);
      }
    }

    loadData();
  }, [router]);

  const getEmbedUrl = (url) => {
    if (!url) return null;
    // Gérer YouTube
    const youtubeMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:youtube\.com\/(?:embed\/|watch\?v=|v\/)|youtu\.be\/)([\w-]{11})(?:\S+)?/);
    if (youtubeMatch && youtubeMatch[1]) {
      return `https://www.youtube.com/embed/${youtubeMatch[1]}`;
    }
    // Gérer Vimeo (simple - peut nécessiter plus de robustesse)
    const vimeoMatch = url.match(/(?:https?:\/\/)?(?:www\.)?(?:vimeo\.com\/(?:video\/|)([0-9]+))(?:\S+)?/);
    if (vimeoMatch && vimeoMatch[1]) {
      return `https://player.vimeo.com/video/${vimeoMatch[1]}`;
    }
    return null;
  };

  const handleCardClick = (project) => {
    setSelectedProject(project);
    setShowProjectModal(true);
  };

  const handleCloseModal = () => {
    setShowProjectModal(false);
    setSelectedProject(null);
  };

  // Fonctions CRUD pour les projets (pour staff/admin)
  const handleAddProject = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Token not found. Please log in.');
      }

      const res = await fetch(`${API}/projects`, {
      method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: projectTitle, description: projectDescription, demoVideoUrl: projectDemoVideoUrl, specifications: projectSpecifications, size: projectSize }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Projet ajouté avec succès !');
        setShowAddProjectModal(false);
        // Réinitialiser les champs du formulaire
        setProjectTitle('');
        setProjectDescription('');
        setProjectDemoVideoUrl('');
        setProjectSpecifications('');
        setProjectSize('short');
        loadData(); // Recharger toutes les données
      } else {
        throw new Error(data.error || 'Échec de l\'ajout du projet.');
      }
    } catch (e) {
      console.error("Error adding project:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleEditProject = (project) => {
    setCurrentProjectToEdit(project);
    setProjectTitle(project.title);
    setProjectDescription(project.description);
    setProjectRepoUrl(project.repoUrl || '');
    setProjectDemoVideoUrl(project.demoVideoUrl || '');
    setProjectSpecifications(project.specifications || '');
    setProjectSize(project.size || 'short');
    setShowEditProjectModal(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    if (!currentProjectToEdit) return;

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Token not found. Please log in.');
      }

      const res = await fetch(`${API}/projects/${currentProjectToEdit._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          title: projectTitle, 
          description: projectDescription, 
          repoUrl: currentProjectToEdit.student ? projectRepoUrl : undefined, // N'envoyer repoUrl que pour les projets d'apprenant
          demoVideoUrl: projectDemoVideoUrl, 
          specifications: projectSpecifications, 
          size: projectSize 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Projet mis à jour avec succès !');
        setShowEditProjectModal(false);
        setCurrentProjectToEdit(null);
        // Réinitialiser les champs du formulaire
        setProjectTitle('');
        setProjectDescription('');
        setProjectRepoUrl('');
        setProjectDemoVideoUrl('');
        setProjectSpecifications('');
        setProjectSize('short');
        loadData(); // Recharger toutes les données
      } else {
        throw new Error(data.error || 'Échec de la mise à jour du projet.');
      }
    } catch (e) {
      console.error("Error updating project:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteProject = (projectId) => {
    // Trouver le projet à supprimer pour afficher son titre dans la modale de confirmation
    const project = allProjects.find(p => p._id === projectId);
    if (project) {
      setCurrentProjectToDelete(project);
      setShowDeleteProjectModal(true);
    }
  };

  const handleDeleteProjectConfirmed = async (projectId) => {
    setError(null);
    setLoading(true);

    try {
      const token = getAuthToken();
      if (!token) {
        throw new Error('Token not found. Please log in.');
      }

      const res = await fetch(`${API}/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
      if (res.ok) {
        alert('Projet supprimé avec succès !');
        setShowDeleteProjectModal(false);
        setCurrentProjectToDelete(null);
        loadData(); // Recharger toutes les données
      } else {
        throw new Error(data.error || 'Échec de la suppression du projet.');
      }
    } catch (e) {
      console.error("Error deleting project:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

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
      <h1 className="mb-4">{me && (me.role === 'staff' || me.role === 'admin') ? 'Gestion des Projets' : 'Mes Projets'}</h1>
      {error && <div className="alert alert-danger text-center mt-5">Error: {error}</div>}

      {me && (me.role === 'staff' || me.role === 'admin') ? (
        // Vue pour Staff/Admin: Tableau de tous les projets avec CRUD
        <div className="row">
          <div className="col-12 mb-3 d-flex justify-content-end">
            <button className="btn btn-primary" onClick={() => setShowAddProjectModal(true)}>
              <i className="bi bi-plus-circle me-2"></i> Ajouter un Nouveau Projet
            </button>
          </div>
          <div className="col-12">
            {allProjects.length === 0 ? (
              <div className="alert alert-info text-center mt-4">
                <i className="bi bi-info-circle me-2"></i> Aucun projet disponible pour le moment.
              </div>
            ) : (
              <div className="table-responsive">
                <table className="table table-striped table-hover">
                  <thead>
                    <tr>
                      <th>Titre</th>
                      <th>Description</th>
                      <th>Type</th> {/* Nouvelle colonne pour distinguer template/assigné */}
                      <th>Étudiant Assigné</th> {/* Nouvelle colonne pour l'étudiant */}
                      <th>Statut</th>
                      <th>Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allProjects.map(projectGroup => (
                      <React.Fragment key={projectGroup._id}>
                        <tr className="table-primary">
                          <td><strong>{projectGroup.title}</strong></td>
                          <td>{projectGroup.description.substring(0, 70)}...</td>
                          <td><span className="badge bg-dark">Modèle</span></td>
                          <td>N/A</td>
                          <td><span className="badge bg-secondary">Template</span></td>
                          <td>
                            <button className="btn btn-sm btn-outline-info me-2" onClick={() => handleEditProject(projectGroup)} title="Modifier Modèle">
                              <i className="bi bi-pencil-square"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteProject(projectGroup._id)} title="Supprimer Modèle">
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                        {projectGroup.assignedProjects.length > 0 ? (
                          projectGroup.assignedProjects.map(assignedProject => (
                            <tr key={assignedProject._id}>
                              <td><i className="bi bi-arrow-return-right me-2"></i> {assignedProject.title}</td>
                              <td><small>{assignedProject.description.substring(0, 50)}...</small></td>
                              <td><span className="badge bg-info">Assigné</span></td>
                              <td>{assignedProject.student ? assignedProject.student.name : 'N/A'}</td>
                              <td>
                                <span className={`badge bg-${assignedProject.status === 'approved' ? 'success' : assignedProject.status === 'rejected' ? 'danger' : 'warning'}`}>
                                  {assignedProject.status}
                                </span>
                              </td>
                              <td>
                                <button className="btn btn-sm btn-outline-info me-2" onClick={() => handleEditProject(assignedProject)} title="Modifier Projet Assigné">
                                  <i className="bi bi-pencil-square"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteProject(assignedProject._id)} title="Supprimer Projet Assigné">
                                  <i className="bi bi-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td colSpan="6" className="text-center text-muted">Aucun projet assigné pour ce modèle.</td>
                          </tr>
                        )}
                      </React.Fragment>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </div>
      ) : (
        // Vue pour Apprenant: Cartes de projets
        projects.length === 0 ? (
          <div className="alert alert-info text-center mt-4">
            <i className="bi bi-info-circle me-2"></i> Aucun projet assigné ou approuvé pour le moment.
          </div>
        ) : (
          <div className="row">
            {projects.map(project => (
              <div key={project._id} className="col-md-6 col-lg-4 mb-4">
                <div 
                  className="card h-100 shadow-sm cursor-pointer"
                  onClick={() => handleCardClick(project)}
                  style={{ cursor: 'pointer' }}
                >
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
        )
      )}

      {/* Modale d'affichage des détails du projet (pour apprenant) */}
      {me && me.role === 'apprenant' && showProjectModal && selectedProject && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-primary text-white">
                <h5 className="modal-title">Détails du Projet: {selectedProject.title}</h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <div className="modal-body">
                <p><strong>Description:</strong> {selectedProject.description}</p>
                {selectedProject.specifications && <p><strong>Spécifications:</strong> {selectedProject.specifications}</p>}
                {selectedProject.demoVideoUrl && (
                      <div className="mb-3">
                    <strong>Vidéo de Démonstration:</strong>
                    {getEmbedUrl(selectedProject.demoVideoUrl) ? (
                      <div className="ratio ratio-16x9 mt-2">
                          <iframe
                          src={getEmbedUrl(selectedProject.demoVideoUrl)}
                          title="Vidéo de Démonstration"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          className="rounded"
                          ></iframe>
                      </div>
                    ) : (
                      <p className="mt-2 text-muted">Impossible d'afficher la vidéo. Lien: <a href={selectedProject.demoVideoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">{selectedProject.demoVideoUrl}</a></p>
                    )}
                  </div>
                )}
                {selectedProject.repoUrl && (
                  <p><strong>Dépôt GitHub:</strong> <a href={selectedProject.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">{selectedProject.repoUrl}</a></p>
                )}
                <p><strong>Statut:</strong> <span className={`badge rounded-pill bg-${selectedProject.status === 'assigned' ? 'warning text-dark' : 'success'}`}>
                  {selectedProject.status === 'assigned' ? 'Assigné' : 'Approuvé'}
                </span></p>
                {selectedProject.submissionDate && <p><strong>Date de Soumission:</strong> {new Date(selectedProject.submissionDate).toLocaleDateString()}</p>}
                {selectedProject.student && <p><strong>Apprenant:</strong> {selectedProject.student.name}</p>}
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseModal}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {me && me.role === 'apprenant' && showProjectModal && <div className="modal-backdrop fade show"></div>}

      {/* Modale pour ajouter/modifier un projet (staff/admin) */}
      {me && (me.role === 'staff' || me.role === 'admin') && (showAddProjectModal || showEditProjectModal) && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-success text-white">
                <h5 className="modal-title">{currentProjectToEdit ? 'Modifier le Projet' : 'Ajouter un Projet'}</h5>
                <button type="button" className="btn-close" onClick={() => {setShowAddProjectModal(false); setShowEditProjectModal(false); setCurrentProjectToEdit(null);}}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={currentProjectToEdit ? handleUpdateProject : handleAddProject}>
                  <div className="mb-3">
                    <label htmlFor="projectTitle" className="form-label">Titre du Projet</label>
                    <input
                      type="text"
                      className="form-control"
                      id="projectTitle"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="projectDescription" className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      id="projectDescription"
                      rows="3"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="projectDemoVideoUrl" className="form-label">URL Vidéo de Démonstration (Optionnel)</label>
                    <input
                      type="url"
                      className="form-control"
                      id="projectDemoVideoUrl"
                      value={projectDemoVideoUrl}
                      onChange={(e) => setProjectDemoVideoUrl(e.target.value)}
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="projectSpecifications" className="form-label">Spécifications (Optionnel)</label>
                    <textarea
                      className="form-control"
                      id="projectSpecifications"
                      rows="3"
                      value={projectSpecifications}
                      onChange={(e) => setProjectSpecifications(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="projectSize" className="form-label">Taille du Projet</label>
                    <select
                      className="form-select"
                      id="projectSize"
                      value={projectSize}
                      onChange={(e) => setProjectSize(e.target.value)}
                      required
                    >
                      <option value="short">Court (1 jour)</option>
                      <option value="medium">Moyen (2 jours)</option>
                      <option value="long">Long (3 jours)</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-success">{currentProjectToEdit ? 'Modifier' : 'Ajouter'} le Projet</button>
                </form>
              </div>
            </div>
          </div>
                  </div>
                )}
      {me && (me.role === 'staff' || me.role === 'admin') && (showAddProjectModal || showEditProjectModal) && <div className="modal-backdrop fade show"></div>}

      {/* Modale de confirmation de suppression de projet (staff/admin) */}
      {me && (me.role === 'staff' || me.role === 'admin') && showDeleteProjectModal && currentProjectToDelete && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-danger text-white">
                <h5 className="modal-title">Confirmer la Suppression</h5>
                <button type="button" className="btn-close" onClick={() => {setShowDeleteProjectModal(false); setCurrentProjectToDelete(null); setConfirmProjectTitle('');}}></button>
              </div>
              <div className="modal-body">
                <p>Êtes-vous sûr de vouloir supprimer le projet "<strong>{currentProjectToDelete.title}</strong>" ? Cette action est irréversible.</p>
                <p>Veuillez taper le titre du projet (exactement) pour confirmer :</p>
                <input
                  type="text"
                  className="form-control"
                  value={confirmProjectTitle}
                  onChange={(e) => setConfirmProjectTitle(e.target.value)}
                  placeholder={currentProjectToDelete.title}
                />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => {setShowDeleteProjectModal(false); setCurrentProjectToDelete(null); setConfirmProjectTitle('');}}>Annuler</button>
                <button
                  type="button"
                  className="btn btn-danger" 
                  onClick={() => handleDeleteProjectConfirmed(currentProjectToDelete._id)}
                  disabled={confirmProjectTitle !== currentProjectToDelete.title} // Désactivé si le titre ne correspond pas
                >
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {me && (me.role === 'staff' || me.role === 'admin') && showDeleteProjectModal && <div className="modal-backdrop fade show"></div>}

    </div>
  );
}

export default ProjectsPage;
