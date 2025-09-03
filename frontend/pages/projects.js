import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken } from '../utils/auth';
import React from 'react'; // Added for React.Fragment

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

// Fonction utilitaire pour s'assurer que les propriétés sont des tableaux
const sanitizeProjectArrays = (project) => ({
  ...project,
  objectives: project.objectives || [],
  specifications: project.specifications || [],
  exerciseStatements: project.exerciseStatements || [],
  resourceLinks: project.resourceLinks || [],
});

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
  const [projectSpecifications, setProjectSpecifications] = useState([]); // Changé de chaîne à tableau
  const [projectSize, setProjectSize] = useState('short');
  const [projectExerciseStatements, setProjectExerciseStatements] = useState([]); // Changé de chaîne à tableau
  const [projectResourceLinks, setProjectResourceLinks] = useState([]); // Changé de chaîne à tableau
  const [projectObjectives, setProjectObjectives] = useState([]); // Changé de chaîne à tableau
  const [projectOrder, setProjectOrder] = useState(0); // Nouvel état pour l'ordre du projet
  
  // États pour la soumission de projet par un apprenant
  const [showSubmitProjectModal, setShowSubmitProjectModal] = useState(false);
  const [currentProjectToSubmit, setCurrentProjectToSubmit] = useState(null);
  const [projectSubmissionRepoUrl, setProjectSubmissionRepoUrl] = useState('');
  const [availableSlots, setAvailableSlots] = useState([]);
  const [selectedSlotIds, setSelectedSlotIds] = useState([]);
  const [success, setSuccess] = useState(null);
  
  const router = useRouter();

  const loadData = useCallback(async (token) => {
    try {
      setLoading(true);
      setError(null);

      // Charger les informations de l'utilisateur
      const userRes = await fetch(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
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
        const allProjectsRes = await fetch(`${API}/api/projects/all`, { headers: { Authorization: `Bearer ${token}` } });
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

        // Regrouper les projets d'apprenants par leur templateProject et assainir les propriétés
        const groupedProjects = projectTemplates.map(template => ({
          ...sanitizeProjectArrays(template),
          assignedProjects: studentProjects.filter(p => p.templateProject && p.templateProject._id === template._id).map(sanitizeProjectArrays)
        }));
        
        // Si des projets d'apprenants n'ont pas de template (ce qui ne devrait pas arriver avec la logique actuelle, mais au cas où)
        const projectsWithoutTemplate = studentProjects.filter(p => !p.templateProject).map(sanitizeProjectArrays);
        
        setAllProjects(groupedProjects);
        setProjects(projectsWithoutTemplate); // Pourrait être utilisé pour afficher des projets non liés à un template
      } else {
        // Pour apprenant: charger leurs projets
        const myProjectsRes = await fetch(`${API}/api/projects/my-projects`, { headers: { Authorization: `Bearer ${token}` } });
        if (!myProjectsRes.ok) {
          const errorData = await myProjectsRes.json();
          throw new Error(errorData.error || 'Échec du chargement de mes projets.');
        }
        const rawProjects = await myProjectsRes.json();
        console.log('Projets bruts reçus:', rawProjects);
        
        // Dédupliquer les projets par templateProject._id en gardant le statut le plus avancé
        // quand un projet passe de assigned à pending puis approved
        const projectMap = new Map();
        
        rawProjects.forEach(project => {
          // Assainir le projet avant de l'ajouter à la map
          const sanitizedProject = sanitizeProjectArrays(project);
          const key = sanitizedProject.templateProject ? sanitizedProject.templateProject._id || sanitizedProject.templateProject : sanitizedProject._id;
          const existingProject = projectMap.get(key);
          
          if (!existingProject) {
            projectMap.set(key, sanitizedProject);
          } else {
            // Garder le projet avec le statut le plus avancé
            const statusOrder = { 'assigned': 0, 'pending': 1, 'approved': 2 };
            const existingStatus = statusOrder[existingProject.status] || 0;
            const newStatus = statusOrder[sanitizedProject.status] || 0;
            
            if (newStatus > existingStatus) {
              projectMap.set(key, sanitizedProject);
            }
          }
        });
        
        const uniqueProjects = Array.from(projectMap.values());
        console.log('Projets uniques après déduplication:', uniqueProjects);
        
        // Trier par ordre du templateProject, puis par statut (assigned en premier, puis pending, puis approved)
        projectsToSet = uniqueProjects.sort((a, b) => {
          // D'abord par ordre du template
          const orderA = a.templateProject ? (a.templateProject.order || 0) : 0;
          const orderB = b.templateProject ? (b.templateProject.order || 0) : 0;
          if (orderA !== orderB) return orderA - orderB;
          
          // Puis par statut (assigned > pending > approved)
          const statusOrder = { 'assigned': 0, 'pending': 1, 'approved': 2 };
          return statusOrder[a.status] - statusOrder[b.status];
        });
      }
      setProjects(projectsToSet);
    } catch (e) {
      console.error("Error loading projects page data:", e);
      setError('Error loading data: ' + e.message);
    } finally {
      setLoading(false);
    }
  }, [API, setMe, setProjects, setAllProjects, setError, setLoading]); // Ajouter toutes les dépendances ici

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }

    loadData(token); // Passer le token à loadData
  }, [router, loadData]); // Ajouter loadData aux dépendances du useEffect

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
    const sanitizedProject = {
      ...project,
      objectives: project.objectives || [],
      specifications: project.specifications || [],
      exerciseStatements: project.exerciseStatements || [],
      resourceLinks: project.resourceLinks || [],
    };
    setSelectedProject(sanitizedProject);
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

      const res = await fetch(`${API}/api/projects`, {
      method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          title: projectTitle, 
          description: projectDescription, 
          demoVideoUrl: projectDemoVideoUrl, 
          specifications: projectSpecifications, 
          size: projectSize, 
          order: projectOrder, 
          objectives: projectObjectives, 
          exerciseStatements: projectExerciseStatements, 
          resourceLinks: projectResourceLinks 
        }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Projet ajouté avec succès !');
        setShowAddProjectModal(false);
        // Réinitialiser les champs du formulaire
        setProjectTitle('');
        setProjectDescription('');
        setProjectDemoVideoUrl('');
        setProjectSpecifications([]); // Réinitialiser
        setProjectSize('short');
        setProjectExerciseStatements([]); // Réinitialiser
        setProjectResourceLinks([]); // Réinitialiser
        setProjectObjectives([]); // Réinitialiser
        setProjectOrder(0); // Réinitialiser
        loadData(token); // Recharger toutes les données
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

  const handleShowAddProjectModal = () => {
    // Calculer le plus grand numéro d'ordre existant parmi les templates de projet
    const maxOrder = allProjects.reduce((max, projectGroup) => {
      return Math.max(max, projectGroup.order || 0);
    }, 0);
    setProjectOrder(maxOrder + 1);
    setShowAddProjectModal(true);
    // Réinitialiser les autres champs du formulaire pour un nouveau projet
    setProjectTitle('');
    setProjectDescription('');
    setProjectRepoUrl('');
    setProjectDemoVideoUrl('');
    setProjectSpecifications([]);
    setProjectSize('short');
    setProjectExerciseStatements([]);
    setProjectResourceLinks([]);
    setProjectObjectives([]);
    setError(null);
  };

  const handleEditProject = (project) => {
    setCurrentProjectToEdit(project);
    setProjectTitle(project.title);
    setProjectDescription(project.description);
    setProjectRepoUrl(project.repoUrl || '');
    setProjectDemoVideoUrl(project.demoVideoUrl || '');
    setProjectSpecifications(project.specifications || []); // Joindre pour l'édition
    setProjectSize(project.size || 'short');
    setProjectExerciseStatements(project.exerciseStatements || []); // Joindre pour l'édition
    setProjectResourceLinks(project.resourceLinks || []); // Joindre pour l'édition
    setProjectObjectives(project.objectives || []); // Joindre pour l'édition
    setProjectOrder(project.order || 0); // Pré-remplir l'ordre
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

      const res = await fetch(`${API}/api/projects/${currentProjectToEdit._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ 
          title: projectTitle, 
          description: projectDescription, 
          repoUrl: currentProjectToEdit.student ? projectRepoUrl : undefined, 
          demoVideoUrl: projectDemoVideoUrl, 
          specifications: projectSpecifications, 
          size: projectSize, 
          exerciseStatements: projectExerciseStatements, 
          resourceLinks: projectResourceLinks, 
          objectives: projectObjectives,
          order: projectOrder, // Inclure l'ordre
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
        setProjectSpecifications([]); // Réinitialiser
        setProjectSize('short');
        setProjectExerciseStatements([]); // Réinitialiser
        setProjectResourceLinks([]); // Réinitialiser
        setProjectObjectives([]); // Réinitialiser
        setProjectOrder(0); // Réinitialiser
        loadData(getAuthToken()); // Recharger toutes les données
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

      const res = await fetch(`${API}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
        });
        const data = await res.json();
      if (res.ok) {
        alert('Projet supprimé avec succès !');
        setShowDeleteProjectModal(false);
        setCurrentProjectToDelete(null);
        loadData(getAuthToken()); // Recharger toutes les données
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

  // Fonctions pour la soumission de projet par un apprenant
  const handleOpenSubmitProjectModal = async (project) => {
    setCurrentProjectToSubmit(project);
    setProjectSubmissionRepoUrl('');
    setSelectedSlotIds([]);
    setError(null);
    setSuccess(null);
    
    try {
      const token = getAuthToken();
      // Charger les slots disponibles pour ce projet
      const slotsRes = await fetch(`${API}/api/availability/available-for-project/${project._id}`, {
        headers: { Authorization: `Bearer ${token}` }
      });
      if (slotsRes.ok) {
        const slotsData = await slotsRes.json();
        setAvailableSlots(slotsData);
      } else {
        setError('Impossible de charger les créneaux disponibles.');
      }
    } catch (e) {
      setError('Erreur lors du chargement des créneaux.');
    }
    
    setShowSubmitProjectModal(true);
  };

  const handleSubmitProject = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setLoading(true);

    const isRepoUrlOptional = [
      "CLI (Command Line Interface)",
      "Pratique guidée Git / GitHub"
    ].includes(currentProjectToSubmit?.title);

    if (!currentProjectToSubmit || selectedSlotIds.length !== 2 || (!isRepoUrlOptional && !projectSubmissionRepoUrl)) {
      let errorMessage = 'Veuillez sélectionner exactement 2 créneaux d\'évaluateurs différents.';
      if (!isRepoUrlOptional && !projectSubmissionRepoUrl) {
        errorMessage = 'Veuillez fournir l\'URL du dépôt GitHub et sélectionner exactement 2 créneaux d\'évaluateurs différents.';
      }
      if (isRepoUrlOptional && selectedSlotIds.length !== 2) {
        errorMessage = 'Veuillez sélectionner exactement 2 créneaux d\'évaluateurs différents.';
      }
      setError(errorMessage);
      setLoading(false);
      return;
    }

    // Vérifier que les 2 slots sont d'évaluateurs différents
    const selectedSlots = availableSlots.filter(slot => selectedSlotIds.includes(slot._id));
    const evaluatorIds = selectedSlots.map(slot => slot.evaluator._id);
    const uniqueEvaluators = [...new Set(evaluatorIds)];
    
    if (uniqueEvaluators.length !== 2) {
      setError('Vous devez sélectionner exactement 2 créneaux d\'évaluateurs différents.');
      setLoading(false);
      return;
    }

    try {
      const token = getAuthToken();
      const res = await fetch(`${API}/api/projects/${currentProjectToSubmit._id}/submit`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({
          repoUrl: projectSubmissionRepoUrl,
          selectedSlotIds: selectedSlotIds
        }),
        });
        const data = await res.json();
      if (res.ok) {
        setSuccess('Projet soumis avec succès ! Il sera évalué par vos pairs.');
        setShowSubmitProjectModal(false);
        setCurrentProjectToSubmit(null);
        setProjectSubmissionRepoUrl('');
        setSelectedSlotIds([]);
        setAvailableSlots([]);
        loadData(getAuthToken()); // Recharger les données
      } else {
        throw new Error(data.error || 'Échec de la soumission du projet.');
      }
    } catch (e) {
      console.error("Error submitting project:", e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleCloseSubmitProjectModal = () => {
    setShowSubmitProjectModal(false);
    setCurrentProjectToSubmit(null);
    setProjectSubmissionRepoUrl('');
    setSelectedSlotIds([]);
    setAvailableSlots([]);
    setError(null);
    setSuccess(null);
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
    <div className="container-fluid mt-4 pt-5 px-4">
      <h1 className="mb-4">{me && (me.role === 'staff' || me.role === 'admin') ? 'Gestion des Projets' : 'Mes Projets'}</h1>
      {error && <div className="alert alert-danger text-center mt-5">Error: {error}</div>}

      {me && (me.role === 'staff' || me.role === 'admin') ? (
        // Vue pour Staff/Admin: Tableau de tous les projets avec CRUD
        <div className="row">
          <div className="col-12 mb-3 d-flex justify-content-end">
            <button className="btn btn-primary" onClick={handleShowAddProjectModal}>
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
                <table className="table table-striped table-hover align-middle">
                  <thead>
                    <tr>
                      <th>Ordre</th>
                      <th>Titre du Projet</th>
                      <th>Description</th>
                      <th>Type</th>
                      <th>Étudiant Assigné</th>
                      <th>Statut</th>
                      <th className="text-center">Actions</th>
                    </tr>
                  </thead>
                  <tbody>
                    {allProjects.map(projectGroup => (
                      <React.Fragment key={projectGroup._id}>
                        <tr className="table-primary">
                          <td><strong>{projectGroup.order}</strong></td>
                          <td><i className="bi bi-folder-fill me-2 text-primary"></i><strong>{projectGroup.title}</strong></td>
                          <td>{projectGroup.description.substring(0, 70)}...</td>
                          <td><span className="badge bg-dark rounded-pill"><i className="bi bi-gear me-1"></i> Maître</span></td>
                          <td>N/A</td>
                          <td><span className="badge bg-secondary rounded-pill"><i className="bi bi-puzzle-fill me-1"></i> Actif</span></td>
                          <td className="text-center">
                            <button className="btn btn-sm btn-outline-info me-2" onClick={() => handleEditProject(projectGroup)} title="Modifier Projet Maître">
                              <i className="bi bi-pencil-square"></i>
                            </button>
                            <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteProject(projectGroup._id)} title="Supprimer Projet Maître">
                              <i className="bi bi-trash"></i>
                            </button>
                          </td>
                        </tr>
                        {projectGroup.assignedProjects.length > 0 ? (
                          projectGroup.assignedProjects.map(assignedProject => (
                            <tr key={assignedProject._id}>
                              <td></td> {/* Cellule vide pour l'alignement */}
                              <td><i className="bi bi-arrow-return-right me-2 text-muted"></i> {assignedProject.title}</td>
                              <td><small>{assignedProject.description.substring(0, 50)}...</small></td>
                              <td><span className="badge bg-success rounded-pill"><i className="bi bi-person-check me-1"></i> Apprenant</span></td>
                              <td>{assignedProject.student ? assignedProject.student.name : 'N/A'}</td>
                              <td>
                                <span className={`badge bg-${assignedProject.status === 'approved' ? 'success' : assignedProject.status === 'rejected' ? 'danger' : 'warning'} rounded-pill`}>
                                  <i className={`bi bi-${assignedProject.status === 'approved' ? 'check-circle' : assignedProject.status === 'rejected' ? 'x-circle' : 'hourglass-split'} me-1`}></i>
                                  {assignedProject.status === 'approved' ? 'Approuvé' : assignedProject.status === 'rejected' ? 'Rejeté' : 'En attente'}
                                </span>
                              </td>
                              <td className="text-center">
                                <button className="btn btn-sm btn-outline-info me-2" onClick={() => handleEditProject(assignedProject)} title="Modifier Projet de l'Apprenant">
                                  <i className="bi bi-pencil-square"></i>
                                </button>
                                <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteProject(assignedProject._id)} title="Supprimer Projet de l'Apprenant">
                                  <i className="bi bi-trash"></i>
                                </button>
                              </td>
                            </tr>
                          ))
                        ) : (
                          <tr>
                            <td></td>
                            <td colSpan="5" className="text-center text-muted py-2">Aucun projet assigné pour ce projet maître.</td>
                            <td></td>
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
                  className="card h-100 shadow-hover-3d border-0"
                  onClick={() => handleCardClick(project)}
                  style={{ cursor: 'pointer' }}
                >
                  <div className="card-body d-flex flex-column">
                    <div>
                      <h5 className="card-title text-primary mb-2">
                        <i className="bi bi-folder-check me-2"></i> {project.title}
                      </h5>
                      {project.templateProject && project.templateProject.order && (
                        <p className="card-text text-muted"><small>(Projet {project.templateProject.order})</small></p>
                      )}
                    </div>

                    {/* Indicateur de statut avec icône */}
                    <div className="mt-3 mb-3 d-flex align-items-center">
                      <span className={`badge rounded-pill bg-${
                        project.status === 'assigned' ? 'warning text-dark' :
                        project.status === 'pending' ? 'info' :
                        'success'
                      } me-2`}>
                        <i className={`bi bi-${
                          project.status === 'assigned' ? 'clock' :
                          project.status === 'pending' ? 'hourglass-split' :
                          'check-circle'
                        } me-1`}></i>
                        {project.status === 'assigned' ? 'Assigné' :
                         project.status === 'pending' ? 'En cours d\'évaluation' :
                         'Approuvé'}
                      </span>
                      
                      {/* Message spécial pour les projets approuvés */}
                      {project.status === 'approved' && (
                        <span className="text-success small"><i className="bi bi-trophy-fill me-1"></i> Projet Approuvé !</span>
                      )}
                    </div>

                    {/* Bouton de soumission pour les projets assignés */}
                    {project.status === 'assigned' && (
                      <div className="mt-auto">
                        <button
                          onClick={(e) => {
                            e.stopPropagation();
                            handleOpenSubmitProjectModal(project);
                          }}
                          className="btn btn-primary w-100 btn-sm"
                          title="Soumettre ce projet"
                        >
                          <i className="bi bi-upload me-2"></i>
                          Soumettre le Projet
                        </button>
                      </div>
                    )}
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
                {/* Bannière de félicitations pour les projets approuvés */}
                {selectedProject.status === 'approved' && (
                  <div className="alert alert-success border-0 mb-4">
                    <div className="d-flex align-items-center">
                      <i className="bi bi-trophy-fill fs-1 me-3 text-warning"></i>
                      <div>
                        <h5 className="mb-1">🎉 Félicitations !</h5>
                        <p className="mb-0">Votre projet a été approuvé avec succès. Excellent travail !</p>
                          </div>
                    </div>
                    </div>
                  )}

                <div className="row">
                  <div className="col-md-8">
                    <h6 className="text-primary mb-3">Informations du Projet</h6>
                    
                    {/* Objectives */}
                    {selectedProject.objectives && (selectedProject.objectives || []).length > 0 && (
                      <div className="mb-3">
                        <h6 className="text-primary mb-2 d-flex align-items-center"><i className="bi bi-bullseye me-2"></i> Objectifs</h6>
                        <ul className="list-group list-group-flush border-top pt-2">
                          {(selectedProject.objectives || []).map((objective, index) => (
                            <li key={index} className="list-group-item d-flex align-items-start border-0 py-1 px-0">
                              <i className="bi bi-check-lg text-success me-2 mt-1"></i> {objective}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    <p className="d-flex align-items-center mb-1"><i className="bi bi-journal-text me-2 text-muted"></i><strong>Description:</strong> {selectedProject.description}</p>
                    {selectedProject.specifications && (selectedProject.specifications || []).length > 0 && (
                      <div className="mb-3">
                        <h6 className="text-primary mb-2 d-flex align-items-center"><i className="bi bi-file-earmark-text me-2"></i> Spécifications</h6>
                        <ul className="list-group list-group-flush border-top pt-2">
                          {(selectedProject.specifications || []).map((spec, index) => (
                            <li key={index} className="list-group-item d-flex align-items-start border-0 py-1 px-0">
                              <i className="bi bi-check-lg text-success me-2 mt-1"></i> {spec}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}
                    
                    {/* Statut avec icône */}
                    <div className="mb-3 d-flex align-items-center">
                      <strong>Statut:</strong> 
                      <span className={`badge rounded-pill bg-${selectedProject.status === 'assigned' ? 'warning text-dark' : selectedProject.status === 'pending' ? 'info' : 'success'} ms-2`}>
                        <i className={`bi bi-${selectedProject.status === 'assigned' ? 'clock' : selectedProject.status === 'pending' ? 'hourglass-split' : 'check-circle'} me-1`}></i>
                        {selectedProject.status === 'assigned' ? 'Assigné' : selectedProject.status === 'pending' ? 'En cours d\'évaluation' : 'Approuvé'}
                      </span>
                    </div>
                    
                    {selectedProject.submissionDate && (
                      <p className="d-flex align-items-center mb-1"><i className="bi bi-calendar-event me-2 text-muted"></i><strong>Date de Soumission:</strong> {new Date(selectedProject.submissionDate).toLocaleDateString('fr-FR', {
                        year: 'numeric',
                        month: 'long',
                        day: 'numeric',
                        hour: '2-digit',
                        minute: '2-digit'
                      })}</p>
                    )}

                    {/* Resource Links */}
                    {selectedProject.resourceLinks && (selectedProject.resourceLinks || []).length > 0 && (
                      <div className="mt-3">
                        <h6 className="text-primary mb-2 d-flex align-items-center"><i className="bi bi-link-45deg me-2"></i> Ressources Supplémentaires</h6>
                        <ul className="list-group list-group-flush border-top pt-2">
                          {(selectedProject.resourceLinks || []).map((link, index) => (
                            <li key={index} className="list-group-item d-flex align-items-start border-0 py-1 px-0">
                              <i className="bi bi-box-arrow-up-right text-info me-2 mt-1"></i>
                              <a href={link} target="_blank" rel="noopener noreferrer" className="text-info text-decoration-none">{link}</a>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {selectedProject.exerciseStatements && (selectedProject.exerciseStatements || []).length > 0 && (
                      <div className="mt-3">
                        <h6 className="text-primary mb-2 d-flex align-items-center"><i className="bi bi-list-task me-2"></i> Énoncés d'Exercice</h6>
                        <ul className="list-group list-group-flush border-top pt-2">
                          {(selectedProject.exerciseStatements || []).map((statement, index) => (
                            <li key={index} className="list-group-item d-flex align-items-start border-0 py-1 px-0">
                              <i className="bi bi-check-lg text-success me-2 mt-1"></i> {statement}
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                  </div>
                  
                  <div className="col-md-4">
                    <h6 className="text-primary mb-3">Liens</h6>
                    
                    {/* Dépôt GitHub avec bouton stylisé */}
                    {selectedProject.repoUrl && (
                      <div className="mb-3">
                        <a 
                          href={selectedProject.repoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-dark w-100 d-flex align-items-center justify-content-center"
                        >
                          <i className="bi bi-github me-2"></i>
                          Voir le Dépôt GitHub
                        </a>
                      </div>
                    )}

                    {/* Vidéo de démonstration */}
                    {selectedProject.demoVideoUrl && (
                      <div className="mb-3">
                        <a 
                          href={selectedProject.demoVideoUrl} 
                          target="_blank" 
                          rel="noopener noreferrer" 
                          className="btn btn-outline-primary w-100 d-flex align-items-center justify-content-center"
                        >
                          <i className="bi bi-play-circle me-2"></i>
                          Voir la Vidéo de Démo
                        </a>
                      </div>
                    )}
                  </div>
                </div>
                
                {/* Vidéo de démonstration intégrée */}
                {selectedProject.demoVideoUrl && getEmbedUrl(selectedProject.demoVideoUrl) && (
                  <div className="mt-4 p-3 bg-light rounded shadow-sm">
                    <h6 className="text-primary mb-3"><i className="bi bi-camera-video me-2"></i> Vidéo de Démonstration</h6>
                    <div className="ratio ratio-16x9">
                      <iframe
                        src={getEmbedUrl(selectedProject.demoVideoUrl)}
                        title="Vidéo de Démonstration"
                        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                        allowFullScreen
                        className="rounded"
                      ></iframe>
                    </div>
                  </div>
                )}
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
                {error && <div className="alert alert-danger mb-3" role="alert">{error}</div>}
                <form onSubmit={currentProjectToEdit ? handleUpdateProject : handleAddProject}>
                  {/* Titre */}
                  <div className="mb-3">
                    <label htmlFor="projectTitle" className="form-label">Titre du Projet <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      id="projectTitle"
                      value={projectTitle}
                      onChange={(e) => setProjectTitle(e.target.value)}
                      required
                    />
                  </div>

                  {/* Objectifs */}
                  <div className="mb-3">
                    <label htmlFor="projectObjectives" className="form-label d-block">Objectifs (Optionnel)</label>
                    {projectObjectives.map((objective, index) => (
                      <div key={index} className="input-group mb-2">
                        <input
                          type="text"
                          className="form-control"
                          value={objective}
                          onChange={(e) => {
                            const newObjectives = [...projectObjectives];
                            newObjectives[index] = e.target.value;
                            setProjectObjectives(newObjectives);
                          }}
                          placeholder="Entrez un objectif"
                        />
                        <button
                          className="btn btn-outline-danger"
                          type="button"
                          onClick={() => {
                            const newObjectives = projectObjectives.filter((_, i) => i !== index);
                            setProjectObjectives(newObjectives);
                          }}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary mt-2"
                      onClick={() => setProjectObjectives([...projectObjectives, ''])}
                    >
                      <i className="bi bi-plus-circle me-2"></i> Ajouter un objectif
                    </button>
                    <div className="form-text text-muted">Décrivez les principaux objectifs que l'apprenant doit atteindre.</div>
                  </div>

                  {/* Description */}
                  <div className="mb-3">
                    <label htmlFor="projectDescription" className="form-label">Description <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      id="projectDescription"
                      rows="3"
                      value={projectDescription}
                      onChange={(e) => setProjectDescription(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  
                  {/* Spécifications */}
                  <div className="mb-3">
                    <label htmlFor="projectSpecifications" className="form-label d-block">Spécifications (Optionnel)</label>
                    {projectSpecifications.map((spec, index) => (
                      <div key={index} className="input-group mb-2">
                        <textarea
                          className="form-control"
                          rows="2"
                          value={spec}
                          onChange={(e) => {
                            const newSpecs = [...projectSpecifications];
                            newSpecs[index] = e.target.value;
                            setProjectSpecifications(newSpecs);
                          }}
                          placeholder="Entrez une spécification"
                        ></textarea>
                        <button
                          className="btn btn-outline-danger"
                          type="button"
                          onClick={() => {
                            const newSpecs = projectSpecifications.filter((_, i) => i !== index);
                            setProjectSpecifications(newSpecs);
                          }}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary mt-2"
                      onClick={() => setProjectSpecifications([...projectSpecifications, ''])}
                    >
                      <i className="bi bi-plus-circle me-2"></i> Ajouter une spécification
                    </button>
                  </div>

                  {/* Liens de Ressources */}
                  <div className="mb-3">
                    <label htmlFor="projectResourceLinks" className="form-label">Liens de Ressources (un par ligne, Optionnel)</label>
                    {projectResourceLinks.map((link, index) => (
                      <div key={index} className="input-group mb-2">
                        <input
                          type="url"
                          className="form-control"
                          value={link}
                          onChange={(e) => {
                            const newLinks = [...projectResourceLinks];
                            newLinks[index] = e.target.value;
                            setProjectResourceLinks(newLinks);
                          }}
                          placeholder="https://example.com/doc.pdf"
                        />
                        <button
                          className="btn btn-outline-danger"
                          type="button"
                          onClick={() => {
                            const newLinks = projectResourceLinks.filter((_, i) => i !== index);
                            setProjectResourceLinks(newLinks);
                          }}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary mt-2"
                      onClick={() => setProjectResourceLinks([...projectResourceLinks, ''])}
                    >
                      <i className="bi bi-plus-circle me-2"></i> Ajouter un lien
                    </button>
                    <div className="form-text text-muted">Fournissez des liens vers des documentations, tutoriels, ou autres ressources utiles.</div>
                  </div>

                  {/* URL Vidéo de Démonstration (Optionnel) */}
                  <div className="mb-3">
                    <label htmlFor="projectDemoVideoUrl" className="form-label">URL Vidéo de Démonstration (Optionnel)</label>
                    <input
                      type="url"
                      className="form-control"
                      id="projectDemoVideoUrl"
                      value={projectDemoVideoUrl}
                      onChange={(e) => setProjectDemoVideoUrl(e.target.value)}
                      placeholder="https://www.youtube.com/watch?v=exemple"
                    />
                  </div>

                  {/* Champ pour les énoncés d'exercice */}
                  <div className="mb-3">
                    <label htmlFor="projectExerciseStatements" className="form-label d-block">Énoncés d'Exercice</label>
                    {projectExerciseStatements.map((statement, index) => (
                      <div key={index} className="input-group mb-2">
                        <input
                          type="text"
                          className="form-control"
                          value={statement}
                          onChange={(e) => {
                            const newStatements = [...projectExerciseStatements];
                            newStatements[index] = e.target.value;
                            setProjectExerciseStatements(newStatements);
                          }}
                          placeholder="Entrez un énoncé d'exercice"
                        />
                        <button
                          className="btn btn-outline-danger"
                          type="button"
                          onClick={() => {
                            const newStatements = projectExerciseStatements.filter((_, i) => i !== index);
                            setProjectExerciseStatements(newStatements);
                          }}
                        >
                          <i className="bi bi-x"></i>
                        </button>
                      </div>
                    ))}
                    <button
                      type="button"
                      className="btn btn-sm btn-outline-primary mt-2"
                      onClick={() => setProjectExerciseStatements([...projectExerciseStatements, ''])}
                    >
                      <i className="bi bi-plus-circle me-2"></i> Ajouter un énoncé d'exercice
                    </button>
                    <div className="form-text text-muted">Ajoutez les étapes ou les consignes de l'exercice, une par ligne.</div>
                  </div>

                  {/* Ordre du Projet (Numéro) */}
                  <div className="mb-3">
                    <label htmlFor="projectOrder" className="form-label">Ordre du Projet <span className="text-danger">*</span></label>
                    <input
                      type="number"
                      className="form-control"
                      id="projectOrder"
                      value={projectOrder}
                      onChange={(e) => setProjectOrder(parseInt(e.target.value, 10))}
                      required
                    />
                    <div className="form-text text-muted">Définissez un numéro d'ordre pour ce projet (ex: 1, 2, 3...).</div>
                  </div>

                  {/* Taille du Projet */}
                  <div className="mb-3">
                    <label htmlFor="projectSize" className="form-label">Taille du Projet <span className="text-danger">*</span></label>
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

                  <button type="submit" className="btn btn-success mt-3">{currentProjectToEdit ? 'Modifier' : 'Ajouter'} le Projet</button>
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
                {error && <div className="alert alert-danger mb-3" role="alert">{error}</div>}
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
                  <i className="bi bi-trash me-2"></i> Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {me && (me.role === 'staff' || me.role === 'admin') && showDeleteProjectModal && <div className="modal-backdrop fade show"></div>}

      {/* Modale de soumission de projet (apprenant) */}
      {me && me.role === 'apprenant' && showSubmitProjectModal && currentProjectToSubmit && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-primary text-white">
                <h5 className="modal-title">
                  <i className="bi bi-upload me-2"></i>
                  Soumettre le Projet: {currentProjectToSubmit.title}
                </h5>
                <button type="button" className="btn-close" onClick={handleCloseSubmitProjectModal}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger mb-3" role="alert">{error}</div>}
                {success && <div className="alert alert-success mb-3" role="alert">{success}</div>}

                <div className="mb-4 p-3 bg-light border rounded">
                  <h6 className="text-primary d-flex align-items-center mb-3"><i className="bi bi-info-circle me-2"></i> Informations du Projet</h6>
                  
                  {currentProjectToSubmit.objectives && (currentProjectToSubmit.objectives || []).length > 0 && (
                    <div className="mb-3">
                      <h6 className="text-primary mb-2 d-flex align-items-center"><i className="bi bi-bullseye me-2"></i> Objectifs</h6>
                      <ul className="list-group list-group-flush border-top pt-2">
                        {(currentProjectToSubmit.objectives || []).map((objective, index) => (
                          <li key={index} className="list-group-item d-flex align-items-start border-0 py-1 px-0">
                            <i className="bi bi-check-lg text-success me-2 mt-1"></i> {objective}
                      </li>
                    ))}
      </ul>
                    </div>
                  )}

                  <p className="d-flex align-items-center mb-1"><strong>Description:</strong> {currentProjectToSubmit.description}</p>
                  {currentProjectToSubmit.specifications && (currentProjectToSubmit.specifications || []).length > 0 && (
                    <div className="mb-3">
                      <h6 className="text-primary mb-2 d-flex align-items-center"><i className="bi bi-file-earmark-text me-2"></i> Spécifications</h6>
                      <ul className="list-group list-group-flush border-top pt-2">
                        {(currentProjectToSubmit.specifications || []).map((spec, index) => (
                          <li key={index} className="list-group-item d-flex align-items-start border-0 py-1 px-0">
                            <i className="bi bi-check-lg text-success me-2 mt-1"></i> {spec}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {currentProjectToSubmit.resourceLinks && (currentProjectToSubmit.resourceLinks || []).length > 0 && (
                    <div className="mt-3">
                      <h6 className="text-primary mb-2 d-flex align-items-center"><i className="bi bi-link-45deg me-2"></i> Ressources Supplémentaires</h6>
                      <ul className="list-group list-group-flush border-top pt-2">
                        {(currentProjectToSubmit.resourceLinks || []).map((link, index) => (
                          <li key={index} className="list-group-item d-flex align-items-start border-0 py-1 px-0">
                            <i className="bi bi-box-arrow-up-right text-info me-2 mt-1"></i>
                            <a href={link} target="_blank" rel="noopener noreferrer" className="text-info text-decoration-none">{link}</a>
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                  {currentProjectToSubmit.demoVideoUrl && (
                    <p className="d-flex align-items-center mb-1"><i className="bi bi-camera-video me-2 text-muted"></i><a href={currentProjectToSubmit.demoVideoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">Vidéo de Démonstration</a></p>
                  )}
                  {currentProjectToSubmit.exerciseStatements && (currentProjectToSubmit.exerciseStatements || []).length > 0 && (
                    <div className="mt-3">
                      <h6 className="text-primary mb-2 d-flex align-items-center"><i className="bi bi-list-task me-2"></i> Énoncés d'Exercice</h6>
                      <ul className="list-group list-group-flush border-top pt-2">
                        {(currentProjectToSubmit.exerciseStatements || []).map((statement, index) => (
                          <li key={index} className="list-group-item d-flex align-items-start border-0 py-1 px-0">
                            <i className="bi bi-check-lg text-success me-2 mt-1"></i> {statement}
                          </li>
                        ))}
                      </ul>
                    </div>
                  )}
                </div>

                <form onSubmit={handleSubmitProject}>
                  <div className="mb-3">
                    <label htmlFor="repoUrl" className="form-label">
                      <i className="bi bi-github me-1"></i>
                      URL du Dépôt GitHub {!(isRepoUrlOptional) && <span className="text-danger">*</span>}
                    </label>
                    <input
                      type="url"
                      className="form-control form-control-lg"
                      id="repoUrl"
                      value={projectSubmissionRepoUrl}
                      onChange={(e) => setProjectSubmissionRepoUrl(e.target.value)}
                      placeholder="https://github.com/votre-username/votre-projet"
                      required={!isRepoUrlOptional}
                    />
                    <div className="form-text text-muted">Assurez-vous que votre dépôt est public et contient le code source du projet.</div>
                  </div>

                  <div className="mb-4 p-3 bg-light border rounded">
                    <label className="form-label d-block mb-3">
                      <i className="bi bi-calendar-check me-1"></i>
                      Sélectionner 2 Créneaux d'Évaluation (Obligatoire) <span className="text-danger">*</span>
                    </label>
                    <div className="alert alert-info py-2">
                      <i className="bi bi-info-circle me-2"></i>
                      <strong>Important :</strong> Vous devez sélectionner exactement 2 créneaux d'évaluateurs différents pour que votre projet soit évalué.
                    </div>
                    {availableSlots.length > 0 ? (
                      <div className="row">
                        {availableSlots.map((slot) => (
                          <div key={slot._id} className="col-md-6 mb-3">
                            <div className="form-check form-check-inline border rounded p-3 w-100 bg-white shadow-sm">
                              <input
                                className="form-check-input"
                                type="checkbox"
                                id={`slot-${slot._id}`}
                                value={slot._id}
                                checked={selectedSlotIds.includes(slot._id)}
                                onChange={(e) => {
                                  if (e.target.checked) {
                                    if (selectedSlotIds.length < 2) {
                                      setSelectedSlotIds([...selectedSlotIds, slot._id]);
                                    } else {
                                      setError('Vous ne pouvez sélectionner que 2 créneaux maximum.');
                                    }
                                  } else {
                                    setSelectedSlotIds(selectedSlotIds.filter(id => id !== slot._id));
                                    setError(null);
                                  }
                                }}
                              />
                              <label className="form-check-label" htmlFor={`slot-${slot._id}`}>
                                <div className="d-flex flex-column align-items-start ms-2">
                                  <strong className="text-dark">Le {new Date(slot.startTime).toLocaleDateString('fr-FR')}</strong>
                                  <small className="text-muted">
                                    de {new Date(slot.startTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })} à 
                                    {new Date(slot.endTime).toLocaleTimeString('fr-FR', { hour: '2-digit', minute: '2-digit' })}
                                  </small>
                                  <small className="text-info mt-1 d-flex align-items-center"><i className="bi bi-calendar-check me-1"></i> Créneau d'évaluation disponible</small>
                                </div>
                              </label>
                            </div>
                          </div>
                        ))}
                      </div>
                    ) : (
                      <div className="alert alert-warning py-2">
                        <i className="bi bi-exclamation-triangle me-2"></i>
                        Aucun créneau d'évaluation disponible pour le moment. Veuillez réessayer plus tard.
                      </div>
                    )}
                    <div className="form-text mt-3 text-dark">
                      <i className="bi bi-clipboard-check me-1"></i> Créneaux sélectionnés: <strong>{selectedSlotIds.length}</strong>/2
                      {selectedSlotIds.length === 2 && (
                        <span className="text-success ms-2 d-inline-flex align-items-center">
                          <i className="bi bi-check-circle me-1"></i>
                          Parfait ! Vous avez sélectionné 2 créneaux.
                        </span>
                      )}
                    </div>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseSubmitProjectModal}>
                  <i className="bi bi-x-circle me-2"></i> Annuler
                </button>
                <button
                  type="submit"
                  className="btn btn-primary"
                  onClick={handleSubmitProject}
                  disabled={loading || !projectSubmissionRepoUrl || selectedSlotIds.length !== 2}
                >
                  {loading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Soumission en cours...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-upload me-2"></i>
                      Soumettre le Projet
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {me && me.role === 'apprenant' && showSubmitProjectModal && <div className="modal-backdrop fade show"></div>}

    </div>
  );
}

export default ProjectsPage;
