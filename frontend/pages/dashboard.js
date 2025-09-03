import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import ProjectList from '../components/ProjectList';
import HackathonList from '../components/HackathonList';
import BadgeDisplay from '../components/BadgeDisplay';
import ProgressTracker from '../components/ProgressTracker';
import React from 'react'; // Added for React.Fragment
import { getAuthToken } from '../utils/auth';
import UserSummaryCard from '../components/UserSummaryCard'; // Importation du nouveau composant

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function Dashboard() {
  const [me, setMe] = useState(null);
  const [projects, setProjects] = useState([]);
  const [hackathons, setHackathons] = useState([]);
  const [badges, setBadges] = useState([]);
  const [progress, setProgress] = useState(null);
  const [mySubmittedEvaluations, setMySubmittedEvaluations] = useState([]); // Pour les projets que j'ai soumis
  const [evaluationsAsEvaluator, setEvaluationsAsEvaluator] = useState([]); // Pour les projets que je dois évaluer
  const [showCreateSlotModal, setShowCreateSlotModal] = useState(false); // État de la modale
  const [slotDate, setSlotDate] = useState('');
  const [slotStartTime, setSlotStartTime] = useState('09:00'); // Par défaut 9h
  const [slotEndTime, setSlotEndTime] = useState('09:45'); // Par défaut 9h45
  const [showEvaluationModal, setShowEvaluationModal] = useState(false); // Nouvel état pour la modale d'évaluation
  const [currentEvaluationToSubmit, setCurrentEvaluationToSubmit] = useState(null); // Évaluation en cours de soumission
  const [upcomingEvaluations, setUpcomingEvaluations] = useState([]); // Nouvel état pour les évaluations à venir
  const [projectsAwaitingStaffReview, setProjectsAwaitingStaffReview] = useState([]); // Nouvel état pour les projets en attente de révision du personnel
  const [learners, setLearners] = useState([]); // Nouveau: Liste des apprenants pour le staff/admin
  const [allProjects, setAllProjects] = useState([]); // Nouveau: Liste de tous les projets pour le staff/admin
  const [allPendingEvaluationsForStaff, setAllPendingEvaluationsForStaff] = useState([]); // Nouveau: Toutes les évaluations en attente pour le staff
  const [expandedLearners, setExpandedLearners] = useState({}); // État pour gérer les détails des apprenants déroulés
  const [showAddProjectModal, setShowAddProjectModal] = useState(false); // Nouvel état pour la modale d'ajout de projet
  const [showEditProjectModal, setShowEditProjectModal] = useState(false); // Nouvel état pour la modale de modification de projet
  const [showDeleteProjectModal, setShowDeleteProjectModal] = useState(false); // Nouvel état pour la modale de suppression de projet
  const [currentProjectToEdit, setCurrentProjectToEdit] = useState(null); // Projet actuellement sélectionné pour la modification
  const [currentProjectToDelete, setCurrentProjectToDelete] = useState(null); // Projet actuellement sélectionné pour la suppression
  // États pour le formulaire d'ajout/modification de projet
  const [projectTitle, setProjectTitle] = useState('');
  const [projectDescription, setProjectDescription] = useState('');
  const [projectRepoUrl, setProjectRepoUrl] = useState(''); // Pour les projets d'apprenant
  const [projectDemoVideoUrl, setProjectDemoVideoUrl] = useState('');
  const [projectSpecifications, setProjectSpecifications] = useState('');
  const [projectSize, setProjectSize] = useState('short');

  const [myProjects, setMyProjects] = useState([]); // Nouvel état pour les projets de l'apprenant
  const [confirmProjectTitle, setConfirmProjectTitle] = useState(''); // Nouvel état pour la double confirmation

  const [feedback, setFeedback] = useState({
    assiduite: '',
    comprehension: '',
    specifications: '',
    maitrise_concepts: '',
    capacite_expliquer: '',
  });
  const [error, setError] = useState(null); // Ajoutez cet état si non présent
  const [success, setSuccess] = useState(null); // Ajoutez cet état si non présent
  const [isLoading, setIsLoading] = useState(true); // Nouvel état de chargement
  const [myCreatedSlots, setMyCreatedSlots] = useState([]); // Nouveau: Slots créés par l'apprenant
  const [token, setToken] = useState(null); // Gérer le token localement
  const router = useRouter();

  // Nouveaux états pour l'ajout d'utilisateur (staff/admin)
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [newUserName, setNewUserName] = useState('');
  const [newUserEmail, setNewUserEmail] = useState('');
  const [newUserPassword, setNewUserPassword] = useState('');
  const [newUserRole, setNewUserRole] = useState('apprenant'); // Rôle par défaut

  // Utilisez useCallback pour memoizer fetchData et la rendre accessible
  const fetchData = useCallback(async () => {
    if (!token) return; // Ne pas exécuter si le token est null
    setIsLoading(true); // Début du chargement
    try {
      // Fetch user data
      const userRes = await fetch(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!userRes.ok) {
        const errorData = await userRes.json();
        throw new Error(errorData.error || 'Échec du chargement des données utilisateur.');
      }
      const userData = await userRes.json();
      setMe(userData);
      setProjects(userData.projects || []);
      setHackathons(userData.hackathons || []);
      setBadges(userData.badges || []);
      setProgress(userData.progress || null);

      // Fetch evaluations for my submitted projects (for apprenant only)
      if (userData.role === 'apprenant') {
        const mySubmittedEvalRes = await fetch(`${API}/api/evaluations/mine`, { headers: { Authorization: `Bearer ${token}` } });
        if (mySubmittedEvalRes.ok) {
          const mySubmittedEvalData = await mySubmittedEvalRes.json();
          setMySubmittedEvaluations(mySubmittedEvalData);
        } else {
          const errorData = await mySubmittedEvalRes.json();
          throw new Error(errorData.error || 'Échec du chargement de mes évaluations soumises.');
        }
      }

      // Fetch projects for the current student (assigned, pending, or approved)
      if (userData.role === 'apprenant') {
        const myProjectsRes = await fetch(`${API}/api/projects/my-projects`, { headers: { Authorization: `Bearer ${token}` } });
        if (myProjectsRes.ok) {
          const rawMyProjectsData = await myProjectsRes.json();
          
          // Les projets reçus sont déjà filtrés pour l'utilisateur et contiennent seulement l'assignation pertinente
          // Nous devons formater ces données pour qu'elles soient compatibles avec l'UI existante si nécessaire
          const formattedStudentProjects = rawMyProjectsData.map(project => {
            // Ici, nous nous assurons que les propriétés sont des tableaux pour éviter les erreurs R.map
            const sanitizedProject = {
              ...project,
              objectives: project.objectives || [],
              specifications: project.specifications || [],
              exerciseStatements: project.exerciseStatements || [],
              resourceLinks: project.resourceLinks || [],
            };
            const assignment = sanitizedProject.assignments && sanitizedProject.assignments.length > 0 ? sanitizedProject.assignments[0] : null;

            if (assignment) {
              return {
                ...sanitizedProject, // Détails du projet maître
                ...assignment,       // Détails de l'assignation (status, repoUrl, submissionDate, etc.)
                assignmentId: assignment._id, // Ajouter l'ID de l'assignation pour faciliter l'utilisation
                student: assignment.student ? { _id: assignment.student._id, name: assignment.student.name, email: assignment.student.email } : null, // Références directes pour compatibilité UI
                evaluations: (assignment.evaluations || []).map(evalItem => ({
                  ...evalItem,
                  evaluator: evalItem.evaluator ? { _id: evalItem.evaluator._id, name: evalItem.evaluator.name } : null,
                })),
              };
            } else {
              return sanitizedProject;
            }
          });
          // Trier par ordre du projet maître
          const sortedMyProjects = formattedStudentProjects.sort((a, b) => (a.order || 0) - (b.order || 0));
          
          setMyProjects(sortedMyProjects);
        } else {
          const errorData = await myProjectsRes.json();
          throw new Error(errorData.error || 'Échec du chargement de mes projets.');
        }
      }

      // Fetch pending evaluations as an evaluator (for all roles that can evaluate)
        const evalAsEvaluatorRes = await fetch(`${API}/api/evaluations/pending-as-evaluator`, { headers: { Authorization: `Bearer ${token}` } });
        if (evalAsEvaluatorRes.ok) {
          const evalAsEvaluatorData = await evalAsEvaluatorRes.json();
          setEvaluationsAsEvaluator(evalAsEvaluatorData);
        setUpcomingEvaluations(evalAsEvaluatorData); // upcomingEvaluations est la même liste pour l'instant
        } else {
          const errorData = await evalAsEvaluatorRes.json();
          throw new Error(errorData.error || 'Échec du chargement des évaluations à réaliser.');
        }

      // Fetch all pending evaluations for staff/admin
      if (userData.role === 'staff' || userData.role === 'admin') {
        const allPendingEvalsRes = await fetch(`${API}/api/evaluations/all-pending-for-staff`, { headers: { Authorization: `Bearer ${token}` } });
        if (allPendingEvalsRes.ok) {
          const allPendingEvalsData = await allPendingEvalsRes.json();
          setAllPendingEvaluationsForStaff(allPendingEvalsData);
        } else {
          const errorData = await allPendingEvalsRes.json();
          throw new Error(errorData.error || 'Échec du chargement de toutes les évaluations en attente pour le staff.');
        }
        }

      // Fetch my created slots (for apprenant only, if they are also evaluators)
      if (userData.role === 'apprenant') {
        const mySlotsRes = await fetch(`${API}/api/availability/mine`, { headers: { Authorization: `Bearer ${token}` } });
        if (mySlotsRes.ok) {
          const mySlotsData = await mySlotsRes.json();
          setMyCreatedSlots(mySlotsData);
        } else {
          const errorData = await mySlotsRes.json();
          throw new Error(errorData.error || 'Échec du chargement de mes slots de disponibilité.');
        }
      }

      // Fetch projects awaiting staff review (for staff/admin only)
      if (userData.role === 'staff' || userData.role === 'admin') {
        const staffReviewRes = await fetch(`${API}/api/projects/awaiting-staff-review`, { headers: { Authorization: `Bearer ${token}` } });
        if (staffReviewRes.ok) {
          const staffReviewData = await staffReviewRes.json();
          // Les données sont déjà formatées par le backend pour inclure les détails des assignations
          const sanitizedStaffReviewData = staffReviewData.map(assignment => ({
            ...assignment, // L'assignation est déjà fusionnée avec le projet maître
            student: assignment.student ? { _id: assignment.student._id, name: assignment.student.name, email: assignment.student.email } : null,
            evaluations: (assignment.evaluations || []).map(evalItem => ({
              ...evalItem,
              evaluator: evalItem.evaluator ? { _id: evalItem.evaluator._id, name: evalItem.evaluator.name } : null,
            })),
          }));
          setProjectsAwaitingStaffReview(sanitizedStaffReviewData);
        } else {
          const errorData = await staffReviewRes.json();
          throw new Error(errorData.error || 'Échec du chargement des projets en attente de révision du personnel.');
        }
      }

      // Fetch list of learners for staff/admin
      if (userData.role === 'staff' || userData.role === 'admin') {
        const learnersRes = await fetch(`${API}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
        if (learnersRes.ok) {
          const learnersData = await learnersRes.json();
          setLearners(learnersData);
        } else {
          const errorData = await learnersRes.json();
          throw new Error(errorData.error || 'Échec du chargement de la liste des apprenants.');
        }
      }

      // Fetch all projects (master projects with assignments) for staff/admin
      if (userData.role === 'staff' || userData.role === 'admin') {
        const allProjectsRes = await fetch(`${API}/api/projects/all`, { headers: { Authorization: `Bearer ${token}` } });
        if (allProjectsRes.ok) {
          const rawAllProjectsData = await allProjectsRes.json();
          // Assainir les projets maîtres et leurs assignations
          const sanitizedAllProjects = rawAllProjectsData.map(project => ({
            ...project,
            objectives: project.objectives || [],
            specifications: project.specifications || [],
            exerciseStatements: project.exerciseStatements || [],
            resourceLinks: project.resourceLinks || [],
            assignments: (project.assignments || []).map(assign => ({
              ...assign,
              student: assign.student ? { _id: assign.student._id, name: assign.student.name, email: assign.student.email } : null, // S'assurer que student est un objet
              evaluations: (assign.evaluations || []).map(evalItem => ({
                ...evalItem,
                evaluator: evalItem.evaluator ? { _id: evalItem.evaluator._id, name: evalItem.evaluator.name } : null,
              })),
            })),
          }));
          setAllProjects(sanitizedAllProjects);
        } else {
          const errorData = await allProjectsRes.json();
          throw new Error(errorData.error || 'Échec du chargement de la liste de tous les projets.');
        }
      }

      // Fetch notifications
      const notifRes = await fetch(`${API}/api/notifications/mine`, { headers: { Authorization: `Bearer ${token}` } });
      if (!notifRes.ok) {
        const errorData = await notifRes.json();
        throw new Error(errorData.error || 'Échec du chargement des notifications.');
      }
      const notifData = await notifRes.json();
      const newSlotBookedNotifications = notifData.filter(notif => !notif.read); // Afficher toutes les nouvelles notifications non lues
      if (newSlotBookedNotifications.length > 0) {
        // setNotifications(newSlotBookedNotifications); // Supprimé
      }

    } catch (e) {
      console.error("Error fetching dashboard data:", e);
      setError('Échec du chargement des données du tableau de bord.');
      // Gérer l'erreur de manière appropriée, peut-être déconnecter l'utilisateur
    } finally {
      setIsLoading(false); // Fin du chargement
    }
  }, [token, setMe, setHackathons, setBadges, setProgress, setMySubmittedEvaluations, setEvaluationsAsEvaluator, setUpcomingEvaluations, setMyCreatedSlots, setError, setIsLoading, setProjectsAwaitingStaffReview, setLearners, setAllProjects, setAllPendingEvaluationsForStaff, setMyProjects]); // Supprimer setAvailableLearnersForTeams et setShowCreateHackathonModal

  useEffect(() => {
    // Tenter de récupérer le token une seule fois au montage du composant
    const storedToken = getAuthToken();
    if (storedToken && !token) {
      setToken(storedToken);
      // Gérer le jeton OAuth de l'URL si applicable, après l'initialisation du token
    if (typeof window !== 'undefined') {
      const urlParams = new URLSearchParams(window.location.search);
      const oauthToken = urlParams.get('token');
      if (oauthToken) {
        localStorage.setItem('token', oauthToken);
          setToken(oauthToken); // Mettre à jour l'état du token
        router.replace('/dashboard', undefined, { shallow: true });
          return;
      }
    }
    } else if (!storedToken && !token) {
      // Si aucun token n'est trouvé (ni stocké, ni en OAuth) et que l'état n'est pas encore défini
      router.push('/login');
      return;
    }
    
    // Appeler fetchData seulement si le token est présent dans l'état
    if (token) {
      fetchData();
    }

  }, [token, router, fetchData]);

  const handleCreateSlot = async (e) => {
    e.preventDefault();
    // Réinitialiser les messages d'erreur/succès précédents
    setError(null);
    setSuccess(null);

    if (!token) {
      setError('Vous devez être connecté pour créer un slot.');
      return;
    }

    // Construire les objets Date en UTC pour éviter les problèmes de fuseau horaire
    const startDateTime = new Date(`${slotDate}T${slotStartTime}:00.000Z`);
    const endDateTime = new Date(`${slotDate}T${slotEndTime}:00.000Z`);

    try {
      const res = await fetch(`${API}/api/availability`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ startTime: startDateTime, endTime: endDateTime }),
      });
      const data = await res.json();

      if (res.ok) {
        setSuccess('Slot de disponibilité créé avec succès !');
        setShowCreateSlotModal(false); // Fermer la modale
        setSlotDate(''); // Réinitialiser le formulaire
        setSlotStartTime('09:00');
        setSlotEndTime('09:45');
        fetchData(); // Recharger les données pour inclure le nouveau slot
      } else {
        throw new Error(data.error || data.message || 'Échec de la création du slot.');
      }
    } catch (e) {
      console.error("Error creating availability slot:", e);
      setError(e.message);
    }
  };

  const handleOpenEvaluationModal = (evaluation) => {
    setCurrentEvaluationToSubmit(evaluation);
    setFeedback({
      assiduite: '',
      comprehension: '',
      specifications: '',
      maitrise_concepts: '',
      capacite_expliquer: '',
    });
    setShowEvaluationModal(true);
  };

  const handleCloseEvaluationModal = () => {
    setShowEvaluationModal(false);
    setCurrentEvaluationToSubmit(null);
    setFeedback({
      assiduite: '',
      comprehension: '',
      specifications: '',
      maitrise_concepts: '',
      capacite_expliquer: '',
    });
    setShowEvaluationModal(false);
  };

  const handleFeedbackChange = (e) => {
    const { name, value } = e.target;
    setFeedback((prev) => ({ ...prev, [name]: value }));
  };

  const handleSubmitFeedback = async (status) => {
    if (!currentEvaluationToSubmit) return;

    if (status === 'accepted') {
      const feedbackKeys = ['assiduite', 'comprehension', 'specifications', 'maitrise_concepts', 'capacite_expliquer'];
      const allFeedbackProvided = feedbackKeys.every(key => feedback[key] && feedback[key].trim() !== '');
      if (!allFeedbackProvided) {
        setError('Tous les champs de feedback sont obligatoires pour accepter le projet.');
        return;
      }
    }

    setIsLoading(true);
    setError(null);
    setSuccess(null);

    try {
      const res = await fetch(`${API}/api/evaluations/${currentEvaluationToSubmit._id}/submit`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ feedback, status }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess(data.message);
        fetchData(); // Refresh data to update evaluation lists
        handleCloseEvaluationModal();
      } else {
        setError(data.error || 'Échec de la soumission de l\'évaluation.');
      }
    } catch (e) {
      setError(e.message || 'Erreur lors de la communication avec le serveur.');
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour gérer l'ajout d'un nouveau projet
  const handleAddProject = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API}/api/projects`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ title: projectTitle, description: projectDescription, demoVideoUrl: projectDemoVideoUrl, specifications: projectSpecifications, size: projectSize }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Projet ajouté avec succès !');
        setShowAddProjectModal(false);
        // Réinitialiser les champs du formulaire
        setProjectTitle('');
        setProjectDescription('');
        setProjectDemoVideoUrl('');
        setProjectSpecifications('');
        setProjectSize('short');
        fetchData(); // Recharger la liste des projets
      } else {
        throw new Error(data.error || 'Échec de l ajout du projet.');
      }
    } catch (e) {
      console.error("Error adding project:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour gérer la modification d'un projet
  const handleEditProject = (project) => {
    setCurrentProjectToEdit(project);
    setProjectTitle(project.title);
    setProjectDescription(project.description);
    setProjectRepoUrl(project.repoUrl || ''); // Si c'est un projet d'apprenant
    setProjectDemoVideoUrl(project.demoVideoUrl || '');
    setProjectSpecifications(project.specifications || '');
    setProjectSize(project.size || 'short');
    setShowEditProjectModal(true);
  };

  const handleUpdateProject = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    if (!currentProjectToEdit) return;

    try {
      const res = await fetch(`${API}/api/projects/${currentProjectToEdit._id}`, {
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
        setSuccess('Projet mis à jour avec succès !');
        setShowEditProjectModal(false);
        setCurrentProjectToEdit(null);
        // Réinitialiser les champs du formulaire
        setProjectTitle('');
        setProjectDescription('');
        setProjectRepoUrl('');
        setProjectDemoVideoUrl('');
        setProjectSpecifications('');
        setProjectSize('short');
        fetchData(); // Recharger la liste des projets
      } else {
        throw new Error(data.error || 'Échec de la mise à jour du projet.');
      }
    } catch (e) {
      console.error("Error updating project:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  // Fonction pour gérer la suppression d'un projet
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
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API}/api/projects/${projectId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Projet supprimé avec succès !');
        setShowDeleteProjectModal(false);
        setCurrentProjectToDelete(null);
        fetchData(); // Recharger la liste des projets
      } else {
        throw new Error(data.error || 'Échec de la suppression du projet.');
      }
    } catch (e) {
      console.error("Error deleting project:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  const handleAddUser = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);
    setIsLoading(true);

    try {
      const res = await fetch(`${API}/api/users`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: newUserName, email: newUserEmail, password: newUserPassword, role: newUserRole }),
      });

      const data = await res.json();
      if (res.ok) {
        setSuccess('Utilisateur ajouté avec succès !');
        setShowAddUserModal(false);
        // Réinitialiser les champs du formulaire
        setNewUserName('');
        setNewUserEmail('');
        setNewUserPassword('');
        setNewUserRole('apprenant');
        fetchData(); // Recharger les données pour inclure le nouvel utilisateur
      } else {
        throw new Error(data.error || 'Échec de l\'ajout de l\'utilisateur.');
      }
    } catch (e) {
      console.error("Error adding user:", e);
      setError(e.message);
    } finally {
      setIsLoading(false);
    }
  };

  if (!token) return <div className="text-center mt-5"><p className="lead">Veuillez vous connecter.</p></div>;

  if (isLoading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="ms-2">Chargement du tableau de bord...</p>
      </div>
    );
  }

  return (
    <div className="container-fluid mt-4 pt-5 px-4">
      <h1 className="mb-4">Tableau de bord</h1>
      {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
      {success && <div className="alert alert-success mt-3" role="alert">{success}</div>}
      {me && (
        <div className="row mb-4">
          <div className="col-md-6 col-lg-4 mb-3">
            <UserSummaryCard
              me={me}
              onShowCreateSlotModal={() => setShowCreateSlotModal(true)}
              onShowAddUserModal={() => setShowAddUserModal(true)}
            />
          </div>
          <div className="col-md-6 col-lg-8 mb-3">
            {me.role === 'apprenant' && progress && (
            <ProgressTracker level={me.level} daysRemaining={me.daysRemaining} progress={progress} />
            )}
          </div>
        </div>
      )}

      {/* Nouveau: Section pour les slots que j'ai créés */}
      {me && me.role === 'apprenant' && myCreatedSlots.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-gradient bg-primary text-white d-flex align-items-center">
                <i className="bi bi-calendar-check me-2"></i>
                <h2 className="h5 mb-0">Mes Slots de Disponibilité</h2>
              </div>
              <div className="card-body">
                <div className="list-group list-group-flush">
                  {myCreatedSlots.filter(slot => {
                    const slotEndTime = new Date(slot.endTime);
                    const oneHourAfterEndTime = new Date(slotEndTime.getTime() + 60 * 60 * 1000); // Ajoute 1 heure en millisecondes
                    const currentTime = new Date();
                    return currentTime < oneHourAfterEndTime;
                  }).map(slot => (
                    <div key={slot._id} className="list-group-item d-flex justify-content-between align-items-center flex-wrap py-3 list-group-item-action">
                      <div>
                        <h5 className="mb-1 text-primary d-flex align-items-center">
                          <i className="bi bi-calendar-event me-2"></i>
                          <span>
                            {new Date(slot.startTime).toLocaleDateString()} de {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} à {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </h5>
                        {slot.isBooked ? (
                          <small className="text-success d-flex align-items-center mt-1"><i className="bi bi-person-check-fill me-1"></i> Réservé par: {slot.bookedByStudent ? <strong>{slot.bookedByStudent.name}</strong> : '[Utilisateur inconnu]'} pour le projet: {slot.bookedForProject ? <strong>{slot.bookedForProject.title}</strong> : '[Projet inconnu]'}</small>
                        ) : (
                          <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-check-circle me-1"></i> Disponible</small>
                        )}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section des évaluations de MES PROJETS SOUMIS */}
      {me && me.role === 'apprenant' && mySubmittedEvaluations.length > 0 && (() => {
        // Filtrer les projets en attente (exclure approved et rejected)
        const pendingProjects = Object.values(mySubmittedEvaluations.reduce((acc, evaluation) => {
          const projectId = evaluation.project._id;
          if (!acc[projectId]) {
            acc[projectId] = {
              project: evaluation.project,
              evaluators: []
            };
          }
          acc[projectId].evaluators.push(evaluation.evaluator.name);
          if (!acc[projectId].submissionDate && evaluation.project.submissionDate) {
            acc[projectId].submissionDate = evaluation.project.submissionDate;
          }
          if (!acc[projectId].status) {
            acc[projectId].status = evaluation.project.status;
          }
          return acc;
        }, {}))
        .filter(projectGroup =>
          projectGroup.status !== 'approved' &&
          projectGroup.status !== 'rejected'
        );

        return pendingProjects.length > 0;
      })() && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-gradient bg-info text-white d-flex align-items-center">
                <i className="bi bi-hourglass-split me-2"></i>
                <h2 className="h5 mb-0">Projets en Cours d'Évaluation</h2>
              </div>
              <div className="card-body">
                <div className="list-group list-group-flush">
                  {(() => {
                    // Filtrer les projets en attente (exclure approved et rejected)
                    const pendingProjects = Object.values(mySubmittedEvaluations.reduce((acc, evaluation) => {
                      const projectId = evaluation.project._id;
                      if (!acc[projectId]) {
                        acc[projectId] = {
                          project: evaluation.project,
                          evaluators: []
                        };
                      }
                      acc[projectId].evaluators.push(evaluation.evaluator.name);
                      if (!acc[projectId].submissionDate && evaluation.project.submissionDate) {
                        acc[projectId].submissionDate = evaluation.project.submissionDate;
                      }
                      if (!acc[projectId].status) {
                        acc[projectId].status = evaluation.project.status;
                      }
                      return acc;
                    }, {}))
                    .filter(projectGroup =>
                      projectGroup.status !== 'approved' &&
                      projectGroup.status !== 'rejected'
                    );

                    return pendingProjects.length > 0 ? (
                      pendingProjects.map(projectGroup => (
                      <div key={projectGroup.project._id} className="card mb-3 shadow-sm border-info">
                        <div className="card-body">
                          <h5 className="card-title d-flex align-items-center mb-2">
                            <i className="bi bi-journal-text me-2 text-info"></i> Projet: {projectGroup.project.title}
                            {projectGroup.status === 'pending' && <span className="badge bg-warning text-dark ms-2 rounded-pill"><i className="bi bi-hourglass-split me-1"></i> En Attente Pairs</span>}
                            {projectGroup.status === 'awaiting_staff_review' && <span className="badge bg-info ms-2 rounded-pill"><i className="bi bi-person-workspace me-1"></i> En Attente Staff</span>}
                          </h5>
                          <p className="card-text mb-1 d-flex align-items-center"><i className="bi bi-person-check me-2 text-muted"></i> Évaluateurs: <strong>{projectGroup.evaluators.join(', ')}</strong></p>
                          {projectGroup.project.repoUrl && <p className="card-text mb-1 d-flex align-items-center"><i className="bi bi-github me-2 text-muted"></i> Dépôt: <a href={projectGroup.project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">{'projectGroup.project.repoUrl'}</a></p>}
                          {projectGroup.submissionDate && <p className="card-text mb-1 d-flex align-items-center"><i className="bi bi-calendar-event me-2 text-muted"></i> Date de soumission: {new Date(projectGroup.submissionDate).toLocaleString()}</p>}
                        </div>
                      </div>
                    ))
                  ) : (
                    <p className="text-center text-muted py-3">Aucun projet soumis en attente d'évaluation.</p>
                  );
                })()}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section pour tous les projets assignés à l'apprenant */}
      {me && me.role === 'apprenant' && myProjects.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-gradient bg-success text-white d-flex align-items-center">
                <i className="bi bi-folder-check me-2"></i>
                <h2 className="h5 mb-0">Mes Projets Assignés ({myProjects.length})</h2>
              </div>
              <div className="card-body">
                <div className="list-group list-group-flush">
                  {myProjects.map(project => (
                    <div
                      key={project.assignmentId}
                      className="card mb-3 shadow-sm border-success transform-hover"
                    >
                      <div className="card-body d-flex flex-column flex-md-row justify-content-between align-items-start align-items-md-center">
                        <div className="flex-grow-1 mb-2 mb-md-0" onClick={() => router.push('/projects')} style={{ cursor: 'pointer' }}>
                          <h5 className="card-title d-flex align-items-center mb-1">
                            <i className="bi bi-folder-open me-2 text-success"></i> {project.title}
                            {console.log(`Projet ${project.title} - Statut au rendu: ${project.status}`)}
                            <span className={`badge rounded-pill bg-${
                              project.status === 'assigned' ? 'warning text-dark' :
                              project.status === 'pending' ? 'info' :
                              'success'
                            } ms-2`}>
                              <i className={`bi bi-${
                                project.status === 'assigned' ? 'clock' :
                                project.status === 'pending' ? 'hourglass-split' :
                                'check-circle'
                              } me-1`}></i>
                              {project.status === 'assigned' ? 'Assigné' :
                               project.status === 'pending' ? 'En cours d\'évaluation' :
                               'Approuvé'}
                            </span>
                            {project.order && (
                              <small className="text-muted ms-2">(Projet {project.order})</small>
                            )}
                          </h5>
                          {/* <p className="card-text mb-1 text-muted d-flex align-items-center"><i className="bi bi-file-earmark-text me-2"></i> Description: {project.description}</p> */}
                        </div>
                        {/* {project.repoUrl && (
                          <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-outline-primary btn-sm d-flex align-items-center mt-2 mt-md-0">
                            <i className="bi bi-github me-2"></i> Voir le Dépôt GitHub
                          </a>
                        )} */}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Section Hackathons et Badges (pour apprenant) */}
      {me && me.role === 'apprenant' && (
        <div className="row mb-4">
          <div className="col-lg-6 mb-4">
            <HackathonList hackathons={hackathons} />
          </div>
          <div className="col-lg-6 mb-4">
            <BadgeDisplay badges={badges} />
          </div>
        </div>
      )}

      {/* Section des évaluations que JE DOIS FAIRE (en tant qu'évaluateur) */}
      {me && (me.role === 'apprenant' || me.role === 'staff' || me.role === 'admin') && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-gradient bg-warning text-dark d-flex align-items-center">
                <i className="bi bi-list-check me-2"></i>
                <h2 className="h5 mb-0">Corrections à Venir {me.role !== 'apprenant' && '(Toutes les évaluations en attente)'}</h2>
              </div>
              <div className="card-body">
                <ul className="list-group list-group-flush">
                  {me.role === 'apprenant' ? (
                    // Affichage pour l'apprenant
                    upcomingEvaluations.filter(evaluation => {
                      const evaluationEndTime = new Date(evaluation.slot.endTime);
                      const twoHoursAfterEndTime = new Date(evaluationEndTime.getTime() + 2 * 60 * 60 * 1000); // Ajoute 2 heures en millisecondes
                      const currentTime = new Date();
                      return currentTime < twoHoursAfterEndTime;
                    }).map((evaluation) => {
                      const evaluationStartTime = new Date(evaluation.slot.startTime);
                      const evaluationEndTime = new Date(evaluation.slot.endTime);
                    const now = new Date();

                      const gracePeriodEnd = new Date(evaluationEndTime.getTime() + 60 * 60 * 1000); // 1 heure après l'heure de fin

                      const isEvaluationActive = now >= evaluationStartTime && now <= gracePeriodEnd;
                      const buttonText = isEvaluationActive ? 'Évaluer le projet' :
                                         now < evaluationStartTime ? `Actif à ${evaluationStartTime.toLocaleTimeString()}` :
                                         'Évaluation expirée';

                    return (
                        <li key={evaluation._id} className="list-group-item d-flex justify-content-between align-items-center flex-wrap py-3">
                        <div>
                            <h5 className="mb-1 text-info"><i className="bi bi-calendar-check me-2"></i> Projet: {evaluation.project.title}</h5>
                            <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-person me-1"></i> Apprenant: {evaluation.student.name}</small>
                            <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-clock me-1"></i> Date: {evaluationStartTime.toLocaleDateString()} de {evaluationStartTime.toLocaleTimeString()} à {evaluationEndTime.toLocaleTimeString()}</small>
                            {/* <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-card-text me-1"></i> Description: {evaluation.project.description}</small> */}
                            <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-github me-1"></i> Dépôt: <a href={evaluation.project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">{evaluation.project.repoUrl}</a></small>
                        </div>
                        <button
                          onClick={() => handleOpenEvaluationModal(evaluation)}
                          disabled={!isEvaluationActive}
                            className={`btn btn-sm mt-2 mt-md-0 ${isEvaluationActive ? 'btn-warning' : 'btn-secondary disabled'}`}
                        >
                            {buttonText}
                        </button>
                        </li>
                      );
                    })
                  ) : (
                    // Affichage pour le staff/admin
                    allPendingEvaluationsForStaff.filter(evaluation => {
                      const evaluationEndTime = new Date(evaluation.slot.endTime);
                      const twoHoursAfterEndTime = new Date(evaluationEndTime.getTime() + 2 * 60 * 60 * 1000); // Ajoute 2 heures en millisecondes
                      const currentTime = new Date();
                      return currentTime < twoHoursAfterEndTime;
                    }).length > 0 ? (
                      // Regrouper les évaluations par projet
                      Object.values(allPendingEvaluationsForStaff.filter(evaluation => {
                        const evaluationEndTime = new Date(evaluation.slot.endTime);
                        const twoHoursAfterEndTime = new Date(evaluationEndTime.getTime() + 2 * 60 * 60 * 1000);
                        const currentTime = new Date();
                        return currentTime < twoHoursAfterEndTime;
                      }).reduce((acc, evaluation) => {
                        const projectId = evaluation.project._id;
                        if (!acc[projectId]) {
                          acc[projectId] = {
                            project: evaluation.project,
                            evaluations: []
                          };
                        }
                        acc[projectId].evaluations.push(evaluation);
                        return acc;
                      }, {})).map((projectGroup) => (
                        <li key={projectGroup.project._id} className="list-group-item d-flex flex-column align-items-start flex-wrap mb-3 py-3">
                          <div>
                            <h5 className="mb-1"><i className="bi bi-journals me-2"></i> Projet: {projectGroup.project.title} (Soumis par: {projectGroup.project.student?.name})</h5>
                            <small className="text-muted d-flex align-items-center mt-1">Statut du projet: <span className="badge bg-info ms-1 rounded-pill">{(projectGroup.project.status).replace(/_/g, ' ')}</span></small>
                            <small className="text-muted d-flex align-items-center mt-1">Dépôt: <a href={projectGroup.project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">{'projectGroup.project.repoUrl'}</a></small>
                          </div>
                          <div className="mt-3 w-100">
                            <strong>Évaluations des pairs :</strong>
                            <ul className="list-group mt-2">
                              {projectGroup.evaluations.map(evalItem => {
                                const evaluationTime = new Date(evalItem.slot.endTime); // Heure de fin du slot
                                const submissionTime = evalItem.submissionDate ? new Date(evalItem.submissionDate) : null;
                                const gracePeriodEnd = new Date(evaluationTime.getTime() + 60 * 60 * 1000); // 1 heure après l'heure de fin

                                let statusText = 'En attente';
                                let statusBadgeClass = 'bg-warning';
                                let timeStatus = 'N/A';

                                if (evalItem.status === 'accepted') {
                                  statusText = 'Acceptée';
                                  statusBadgeClass = 'bg-success';
                                  if (submissionTime && submissionTime <= gracePeriodEnd) {
                                    timeStatus = 'Dans les temps';
                                  } else if (submissionTime) {
                                    timeStatus = 'En retard';
                                  }
                                } else if (evalItem.status === 'rejected') {
                                  statusText = 'Rejetée';
                                  statusBadgeClass = 'bg-danger';
                                  if (submissionTime && submissionTime <= gracePeriodEnd) {
                                    timeStatus = 'Dans les temps';
                                  } else if (submissionTime) {
                                    timeStatus = 'En retard';
                                  }
                                }

                                return (
                                  <li key={evalItem._id} className="list-group-item d-flex justify-content-between align-items-center flex-wrap">
                                    <span className="d-flex align-items-center">
                                      <i className="bi bi-person-check me-2"></i> Évaluateur: <strong>{evalItem.evaluator.name}</strong> ({evalItem.evaluator.email})
                                    </span>
                                    <div>
                                      <span className={`badge me-2 rounded-pill ${statusBadgeClass}`}>{statusText}</span>
                                      <span className="badge bg-secondary rounded-pill">{timeStatus}</span>
                                    </div>
                      </li>
                    );
                  })}
                            </ul>
                          </div>
                        </li>
                      ))
                    ) : (
                      <p className="text-center text-muted py-3">Aucune évaluation en attente pour le moment.</p>
                    )
                  )}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nouveau: Section pour les projets en attente de révision finale du personnel */}
      {me && (me.role === 'staff' || me.role === 'admin') && projectsAwaitingStaffReview.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-gradient bg-danger text-white d-flex align-items-center">
                <i className="bi bi-file-earmark-check me-2"></i>
                <h2 className="h5 mb-0">Projets en Attente de Révision Finale (Personnel)</h2>
              </div>
              <div className="card-body">
                <ul className="list-group list-group-flush">
                  {projectsAwaitingStaffReview.map(project => (
                    <li key={project._id} className="list-group-item d-flex justify-content-between align-items-center flex-wrap py-3">
                      <div>
                        <h5 className="mb-1 text-danger"><i className="bi bi-exclamation-triangle me-2"></i> Projet: {project.title}</h5>
                        <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-person me-1"></i> Soumis par: {project.student.name}</small>
                        <small className="text-muted d-flex align-items-center mt-1">Statut actuel: <span className="badge bg-info ms-1 rounded-pill">En Attente Staff</span></small>
                        {project.repoUrl && <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-github me-1"></i> Dépôt: <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">{'project.repoUrl'}</a></small>}
                        <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-calendar-event me-1"></i> Date de soumission: {new Date(project.submissionDate).toLocaleDateString()}</small>
                      </div>
                      <div className="d-flex flex-column flex-md-row mt-2 mt-md-0">
                        <button
                          className="btn btn-sm btn-success mt-2 mt-md-0 me-md-2"
                          onClick={() => handleFinalStaffReview(project.projectId, project.assignmentId, 'approved')}
                        >
                          <i className="bi bi-check-circle me-1"></i> Approuver
                        </button>
                        <button
                          className="btn btn-sm btn-danger mt-2 mt-md-0"
                          onClick={() => handleFinalStaffReview(project.projectId, project.assignmentId, 'rejected')}
                        >
                          <i className="bi bi-x-circle me-1"></i> Rejeter
                        </button>
                      </div>
                    </li>
                  ))}
                </ul>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nouveau: Section pour la liste des apprenants (pour staff/admin) */}
      {me && (me.role === 'staff' || me.role === 'admin') && learners.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-gradient bg-dark text-white d-flex justify-content-between align-items-center">
                <i className="bi bi-people me-2"></i>
                <h2 className="h5 mb-0">Liste des Apprenants</h2>
              </div>
              <div className="card-body">
                <div className="table-responsive">
                  <table className="table table-hover table-striped table-sm caption-top align-middle">
                    <caption>Liste des apprenants inscrits</caption>
                    <thead className="table-light">
                      <tr>
                        <th>Nom</th>
                        <th>Email</th>
                        <th className="text-center">Niveau</th>
                        <th className="text-center">Jours Restants</th>
                        <th>Projet Assigné</th>
                        <th className="text-center">Actions</th>
                      </tr>
                    </thead>
                    <tbody>
                      {learners.map(learner => (
                        <React.Fragment key={learner._id}>
                          <tr>
                            <td>{learner.name}</td>
                            <td>{learner.email}</td>
                            <td className="text-center"><span className="badge bg-primary">{learner.level}</span></td>
                            <td className="text-center"><span className="badge bg-info">{learner.daysRemaining}</span></td>
                            <td>
                              {learner.assignedProject ? (
                                <span className={`badge rounded-pill bg-${learner.assignedProject.status === 'assigned' ? 'info' : learner.assignedProject.status === 'pending' ? 'warning' : 'success'}`}>
                                  {learner.assignedProject.title}
                                </span>
                              ) : (
                                <span className="badge rounded-pill bg-secondary">Aucun</span>
                              )}
                            </td>
                            <td className="text-center">
                              <button
                                className="btn btn-sm btn-outline-secondary py-0 px-1"
                                onClick={() => {
                                  const newExpandedLearners = { ...expandedLearners };
                                  if (newExpandedLearners[learner._id]) {
                                    delete newExpandedLearners[learner._id];
                                  } else {
                                    newExpandedLearners[learner._id] = true;
                                  }
                                  setExpandedLearners(newExpandedLearners);
                                }}
                                aria-expanded={expandedLearners[learner._id]}
                                aria-controls={`learner-details-${learner._id}`}
                                title={expandedLearners[learner._id] ? 'Masquer les détails' : 'Voir les détails'}
                              >
                                <i className={`bi bi-chevron-${expandedLearners[learner._id] ? 'up' : 'down'}`}></i>
                              </button>
                            </td>
                          </tr>
                          {expandedLearners[learner._id] && (
                          <tr>
                            <td colSpan="6" className="p-0 border-0">
                              <div className="collapse show" id={`learner-details-${learner._id}`}>
                                <div className="bg-light p-3 border-start border-primary border-3 ms-3 mb-2 me-3 shadow-sm rounded">
                                  <h6 className="text-primary mb-2">Détails du Projet Assigné:</h6>
                                  {learner.assignedProject ? (
                                    <>
                                      <p className="mb-1 d-flex align-items-center"><i className="bi bi-journal-text me-2 text-primary"></i> Titre: <strong>{learner.assignedProject.title}</strong></p>
                                      <p className="mb-1 d-flex align-items-center"><i className="bi bi-info-circle me-2 text-info"></i> Statut: <span className={`badge bg-${learner.assignedProject.status === 'info' ? 'info' : learner.assignedProject.status === 'pending' ? 'warning' : 'success'} ms-1`}>{learner.assignedProject.status}</span></p>
                                      {learner.assignedProject.repoUrl && <p className="mb-1 d-flex align-items-center"><i className="bi bi-github me-2 text-dark"></i> Dépôt: <a href={learner.assignedProject.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">{learner.assignedProject.repoUrl}</a></p>}
                                      {learner.assignedProject.submissionDate && <p className="mb-1 d-flex align-items-center"><i className="bi bi-calendar-event me-2 text-muted"></i> Date de soumission: {new Date(learner.assignedProject.submissionDate).toLocaleDateString()}</p>}
                                    </>
                                  ) : (
                                    <p className="text-muted d-flex align-items-center"><i className="bi bi-x-circle me-2"></i> Aucun projet actuellement assigné.</p>
                                  )}
                                </div>
                              </div>
                            </td>
                          </tr>
                          )}
                        </React.Fragment>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nouveau: Section pour la liste de tous les projets (pour staff/admin) */}
      {me && (me.role === 'staff' || me.role === 'admin') && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-gradient bg-success text-white d-flex justify-content-between align-items-center">
                <i className="bi bi-journals me-2"></i>
                <h2 className="h5 mb-0">Gestion des Projets</h2>
                <div className="d-flex">
                  <button className="btn btn-light btn-sm me-2" onClick={() => router.push('/hackathons')}>
                    <i className="bi bi-lightbulb me-1"></i> Gérer les Hackathons
                  </button>
                  <button className="btn btn-light btn-sm" onClick={() => setShowAddProjectModal(true)}>
                    <i className="bi bi-plus-circle me-1"></i> Ajouter un Projet
                  </button>
                </div>
              </div>
              <div className="card-body">
                {allProjects.length === 0 ? (
                  <p>Aucun projet disponible.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped table-hover align-middle">
                      <thead className="table-light">
                        <tr>
                          <th>Titre</th>
                          <th>Description</th>
                          <th>Étudiant</th>
                          <th>Statut</th>
                          <th className="text-center">Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allProjects.map(project => (
                          <tr key={project._id}>
                            <td><i className="bi bi-journal-text me-2"></i>{project.title}</td>
                            <td>{project.description.substring(0, 50)}...</td>
                            <td>{project.student ? <span className="badge bg-secondary"><i className="bi bi-person me-1"></i>{project.student.name}</span> : <span className="badge bg-dark">Template</span>}</td>
                            <td>
                              <span className={`badge bg-${project.status === 'approved' ? 'success' : project.status === 'rejected' ? 'danger' : project.status === 'template' ? 'dark' : 'warning'} rounded-pill`}>
                                <i className={`bi bi-${project.status === 'approved' ? 'check-circle' : project.status === 'rejected' ? 'x-circle' : project.status === 'template' ? 'file-earmark' : 'hourglass-split'} me-1`}></i>
                                {project.status === 'approved' ? 'Approuvé' : project.status === 'rejected' ? 'Rejeté' : project.status === 'template' ? 'Modèle' : 'En attente'}
                              </span>
                            </td>
                            <td className="text-center">
                              <button className="btn btn-sm btn-outline-info me-2" onClick={() => handleEditProject(project)} title="Modifier le projet">
                                <i className="bi bi-pencil-square"></i>
                              </button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteProject(project._id)} title="Supprimer le projet">
                                <i className="bi bi-trash"></i>
                              </button>
                            </td>
                          </tr>
                        ))}
                      </tbody>
                    </table>
                  </div>
                )}
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale pour créer un slot de disponibilité */}
      {showCreateSlotModal && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-primary text-white">
                <h5 className="modal-title">Créer un Slot de Disponibilité</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateSlotModal(false)}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger mb-3" role="alert">{error}</div>}
                {success && <div className="alert alert-success mb-3" role="alert">{success}</div>}
                <form onSubmit={handleCreateSlot}>
                  <div className="mb-3">
                    <label htmlFor="slotDate" className="form-label">Date <span className="text-danger">*</span></label>
                    <input
                      type="date"
                      className="form-control"
                      id="slotDate"
                      value={slotDate}
                      onChange={(e) => setSlotDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="slotStartTime" className="form-label">Heure de début <span className="text-danger">*</span></label>
                    <input
                      type="time"
                      className="form-control"
                      id="slotStartTime"
                      value={slotStartTime}
                      onChange={(e) => {
                        const newStartTime = e.target.value;
                        setSlotStartTime(newStartTime);
                        // Calculer l'heure de fin en ajoutant 30 minutes
                        const [hours, minutes] = newStartTime.split(':').map(Number);
                        const date = new Date();
                        date.setHours(hours, minutes + 30, 0, 0);
                        const newEndTime = date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', hourCycle: 'h23' });
                        setSlotEndTime(newEndTime);
                      }}
                      min="09:00"
                      max="16:15" // Max 16:15 pour un slot de 45 minutes finissant à 17:00
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="slotEndTime" className="form-label">Heure de fin <span className="text-danger">*</span></label>
                    <input
                      type="time"
                      className="form-control"
                      id="slotEndTime"
                      value={slotEndTime}
                      onChange={(e) => setSlotEndTime(e.target.value)}
                      min="09:45"
                      max="17:00"
                      required
                      readOnly // Rendre l'heure de fin non modifiable manuellement
                    />
                  </div>
                  <button type="submit" className="btn btn-success d-flex align-items-center" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Création...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-plus-circle me-2"></i> Créer le slot
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {showCreateSlotModal && <div className="modal-backdrop fade show"></div>}

      {/* Modale pour l'évaluation de projet */}
      {showEvaluationModal && currentEvaluationToSubmit && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-warning text-dark">
                <h5 className="modal-title">Évaluer le Projet: {currentEvaluationToSubmit.project.title}</h5>
                <button type="button" className="btn-close" onClick={handleCloseEvaluationModal}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
                {success && <div className="alert alert-success mt-3" role="alert">{success}</div>}

                <p className="d-flex align-items-center mb-1"><strong><i className="bi bi-person me-2"></i>Apprenant:</strong> {currentEvaluationToSubmit.student.name}</p>
                <p className="d-flex align-items-center mb-3"><strong><i className="bi bi-github me-2"></i>URL Dépôt GitHub:</strong> <a href={currentEvaluationToSubmit.project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">{currentEvaluationToSubmit.project.repoUrl}</a></p>
                <p className="alert alert-info py-2 d-flex align-items-center"><i className="bi bi-info-circle me-2"></i> Veuillez fournir votre appréciation pour les points suivants (obligatoire pour accepter):</p>

                <form>
                  <div className="mb-3">
                    <label htmlFor="feedbackAssiduite" className="form-label">Assiduité <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      id="feedbackAssiduite"
                      name="assiduite"
                      rows="3"
                      value={feedback.assiduite}
                      onChange={handleFeedbackChange}
                      required={true} // Rendre obligatoire si statut accepté
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="feedbackComprehension" className="form-label">Compréhension des projets <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      id="feedbackComprehension"
                      name="comprehension"
                      rows="3"
                      value={feedback.comprehension}
                      onChange={handleFeedbackChange}
                      required={true}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="feedbackSpecifications" className="form-label">Respect des spécifications <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      id="feedbackSpecifications"
                      name="specifications"
                      rows="3"
                      value={feedback.specifications}
                      onChange={handleFeedbackChange}
                      required={true}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="feedbackMaitriseConcepts" className="form-label">Maîtrise des concepts <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      id="feedbackMaitriseConcepts"
                      name="maitrise_concepts"
                      rows="3"
                      value={feedback.maitrise_concepts}
                      onChange={handleFeedbackChange}
                      required={true}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="feedbackCapaciteExpliquer" className="form-label">Capacité à expliquer <span className="text-danger">*</span></label>
                    <textarea
                      className="form-control"
                      id="feedbackCapaciteExpliquer"
                      name="capacite_expliquer"
                      rows="3"
                      value={feedback.capacite_expliquer}
                      onChange={handleFeedbackChange}
                      required={true}
                    ></textarea>
                  </div>
                </form>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-danger d-flex align-items-center" onClick={() => handleSubmitFeedback('rejected')} disabled={isLoading}>
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Rejet en cours...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-x-circle me-2"></i> Refuser le projet
                    </>
                  )}
                </button>
                <button
                  type="button"
                  className="btn btn-success d-flex align-items-center"
                  onClick={() => handleSubmitFeedback('accepted')}
                  disabled={isLoading || Object.values(feedback).some(value => value.trim() === '')}
                >
                  {isLoading ? (
                    <>
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                      Acceptation...
                    </>
                  ) : (
                    <>
                      <i className="bi bi-check-circle me-2"></i> Accepter le projet
                    </>
                  )}
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showEvaluationModal && <div className="modal-backdrop fade show"></div>}

      {/* Modale pour ajouter un utilisateur (staff/admin) */}
      {showAddUserModal && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-primary text-white">
                <h5 className="modal-title"><i className="bi bi-person-plus me-2"></i> Ajouter un Nouvel Utilisateur</h5>
                <button type="button" className="btn-close" onClick={() => setShowAddUserModal(false)}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger mb-3" role="alert">{error}</div>}
                {success && <div className="alert alert-success mb-3" role="alert">{success}</div>}
                <form onSubmit={handleAddUser}>
                  <div className="mb-3">
                    <label htmlFor="newUserName" className="form-label">Nom <span className="text-danger">*</span></label>
                    <input
                      type="text"
                      className="form-control"
                      id="newUserName"
                      value={newUserName}
                      onChange={(e) => setNewUserName(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newUserEmail" className="form-label">Email <span className="text-danger">*</span></label>
                    <input
                      type="email"
                      className="form-control"
                      id="newUserEmail"
                      value={newUserEmail}
                      onChange={(e) => setNewUserEmail(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newUserPassword" className="form-label">Mot de Passe <span className="text-danger">*</span></label>
                    <input
                      type="password"
                      className="form-control"
                      id="newUserPassword"
                      value={newUserPassword}
                      onChange={(e) => setNewUserPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newUserRole" className="form-label">Rôle <span className="text-danger">*</span></label>
                    <select
                      className="form-control"
                      id="newUserRole"
                      value={newUserRole}
                      onChange={(e) => setNewUserRole(e.target.value)}
                      required
                    >
                      <option value="apprenant">Apprenant</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary d-flex align-items-center" disabled={isLoading}>
                    {isLoading ? (
                      <>
                        <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                        Ajout en cours...
                      </>
                    ) : (
                      <>
                        <i className="bi bi-person-plus me-2"></i> Ajouter l'utilisateur
                      </>
                    )}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {showAddUserModal && <div className="modal-backdrop fade show"></div>}

    </div>
  );
}

// Fonction pour gérer l'évaluation finale par le personnel
const handleFinalStaffReview = async (projectId, assignmentId, status) => {
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
  if (!token) {
    alert('Vous devez être connecté pour effectuer cette action.');
    return;
  }

  try {
    const res = await fetch(`${API}/projects/${projectId}/final-evaluate`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
      },
      body: JSON.stringify({ assignmentId, status }), // Inclure l'ID d'assignation
    });

    const data = await res.json();

    if (res.ok) {
      alert(data.message);
      fetchData(); // Recharger les données du tableau de bord pour refléter les changements
    } else {
      alert(data.error || 'Échec de l\'évaluation finale.');
    }
  } catch (e) {
    console.error("Error during final staff evaluation:", e);
    alert('Erreur lors de la communication avec le serveur.');
  }
};
