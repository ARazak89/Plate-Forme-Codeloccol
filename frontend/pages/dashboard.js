import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import ProjectList from '../components/ProjectList';
import HackathonList from '../components/HackathonList';
import BadgeDisplay from '../components/BadgeDisplay';
import ProgressTracker from '../components/ProgressTracker';
import React from 'react'; // Added for React.Fragment
import { getAuthToken } from '../utils/auth';

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
  const [notifications, setNotifications] = useState([]); // Nouvel état pour les notifications
  const [showNotificationModal, setShowNotificationModal] = useState(false); // État pour la modale de notification
  const [currentNotification, setCurrentNotification] = useState(null); // Notification actuellement affichée
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

  // Utilisez useCallback pour memoizer fetchData et la rendre accessible
  const fetchData = useCallback(async () => {
    if (!token) return; // Ne pas exécuter si le token est null
    setIsLoading(true); // Début du chargement
    try {
      // Fetch user data
      const userRes = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
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
        const mySubmittedEvalRes = await fetch(`${API}/evaluations/mine`, { headers: { Authorization: `Bearer ${token}` } });
        if (mySubmittedEvalRes.ok) {
          const mySubmittedEvalData = await mySubmittedEvalRes.json();
          setMySubmittedEvaluations(mySubmittedEvalData);
        } else {
          const errorData = await mySubmittedEvalRes.json();
          throw new Error(errorData.error || 'Échec du chargement de mes évaluations soumises.');
        }
      }

      // Fetch projects for the current student (assigned or approved)
      if (userData.role === 'apprenant') {
        const myProjectsRes = await fetch(`${API}/projects/my-projects`, { headers: { Authorization: `Bearer ${token}` } });
        if (myProjectsRes.ok) {
          const myProjectsData = await myProjectsRes.json();
          setMyProjects(myProjectsData);
        } else {
          const errorData = await myProjectsRes.json();
          throw new Error(errorData.error || 'Échec du chargement de mes projets.');
        }
      }

      // Fetch pending evaluations as an evaluator (for all roles that can evaluate)
      const evalAsEvaluatorRes = await fetch(`${API}/evaluations/pending-as-evaluator`, { headers: { Authorization: `Bearer ${token}` } });
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
        const allPendingEvalsRes = await fetch(`${API}/evaluations/all-pending-for-staff`, { headers: { Authorization: `Bearer ${token}` } });
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
        const mySlotsRes = await fetch(`${API}/availability/mine`, { headers: { Authorization: `Bearer ${token}` } });
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
        const staffReviewRes = await fetch(`${API}/projects/awaiting-staff-review`, { headers: { Authorization: `Bearer ${token}` } });
        if (staffReviewRes.ok) {
          const staffReviewData = await staffReviewRes.json();
          setProjectsAwaitingStaffReview(staffReviewData);
        } else {
          const errorData = await staffReviewRes.json();
          throw new Error(errorData.error || 'Échec du chargement des projets en attente de révision du personnel.');
        }
      }

      // Fetch list of learners for staff/admin
      if (userData.role === 'staff' || userData.role === 'admin') {
        const learnersRes = await fetch(`${API}/users`, { headers: { Authorization: `Bearer ${token}` } });
        if (learnersRes.ok) {
          const learnersData = await learnersRes.json();
          setLearners(learnersData);
        } else {
          const errorData = await learnersRes.json();
          throw new Error(errorData.error || 'Échec du chargement de la liste des apprenants.');
        }
      }

      // Fetch all projects for staff/admin
      if (userData.role === 'staff' || userData.role === 'admin') {
        const allProjectsRes = await fetch(`${API}/projects/all`, { headers: { Authorization: `Bearer ${token}` } });
        if (allProjectsRes.ok) {
          const allProjectsData = await allProjectsRes.json();
          setAllProjects(allProjectsData);
        } else {
          const errorData = await allProjectsRes.json();
          throw new Error(errorData.error || 'Échec du chargement de la liste de tous les projets.');
        }
      }

      // Fetch notifications
      const notifRes = await fetch(`${API}/notifications/mine`, { headers: { Authorization: `Bearer ${token}` } });
      if (!notifRes.ok) {
        const errorData = await notifRes.json();
        throw new Error(errorData.error || 'Échec du chargement des notifications.');
      }
      const notifData = await notifRes.json();
      // Filtrer et afficher uniquement les nouvelles notifications de 'slot_booked'
      const newSlotBookedNotifications = notifData.filter(notif => notif.type === 'slot_booked' && !notif.read);
      if (newSlotBookedNotifications.length > 0) {
        setNotifications(newSlotBookedNotifications);
        setCurrentNotification(newSlotBookedNotifications[0]); // Afficher la première comme exemple
        setShowNotificationModal(true);
      }

    } catch (e) {
      console.error("Error fetching dashboard data:", e);
      setError('Échec du chargement des données du tableau de bord.');
      // Gérer l'erreur de manière appropriée, peut-être déconnecter l'utilisateur
    } finally {
      setIsLoading(false); // Fin du chargement
    }
  }, [token, setMe, setProjects, setHackathons, setBadges, setProgress, setMySubmittedEvaluations, setEvaluationsAsEvaluator, setUpcomingEvaluations, setMyCreatedSlots, setNotifications, setCurrentNotification, setShowNotificationModal, setError, setIsLoading, setProjectsAwaitingStaffReview, setLearners, setAllProjects, setAllPendingEvaluationsForStaff, setMyProjects]); // Ajouter setMyProjects ici

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
      const res = await fetch(`${API}/availability`, {
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

  const handleCloseNotificationModal = async () => {
    if (currentNotification) {
      try {
        // Marquer la notification comme lue sur le backend
        await fetch(`${API}/notifications/${currentNotification._id}/read`, {
          method: 'PUT',
          headers: { Authorization: `Bearer ${token}` },
        });
        // Supprimer la notification de la liste locale
        setNotifications(prevNotifs => prevNotifs.filter(n => n._id !== currentNotification._id));
      } catch (e) {
        console.error("Error marking notification as read:", e);
      }
    }
    setShowNotificationModal(false);
    setCurrentNotification(null);
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
      const res = await fetch(`${API}/evaluations/${currentEvaluationToSubmit._id}/submit`, {
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
      const res = await fetch(`${API}/projects`, {
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
        throw new Error(data.error || 'Échec de l\'ajout du projet.');
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
      const res = await fetch(`${API}/projects/${projectId}`, {
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

  // NOTE: La fonction renderEvaluatorDashboard n'est plus utilisée directement ici, car ses sections sont déplacées.
  // Vous pouvez la supprimer si elle n'est pas utilisée ailleurs.
  // const renderEvaluatorDashboard = () => (
  //   <div className="space-y-6">
  //     <h2 className="text-2xl font-bold text-gray-800">Votre Tableau de Bord Évaluateur</h2>

  //     {myCreatedSlots.length > 0 && (
  //       <section className="bg-white p-6 rounded-lg shadow">
  //         <h3 className="text-xl font-semibold text-gray-700 mb-4">Vos Slots de Disponibilité Créés</h3>
  //         <ul className="space-y-2">
  //           {myCreatedSlots.map((slot) => (
  //             <li key={slot._id} className="bg-gray-50 p-3 rounded-md flex justify-between items-center">
  //               <span>
  //                 Le {new Date(slot.startTime).toLocaleDateString()} de {new Date(slot.startTime).toLocaleTimeString()} à {new Date(slot.endTime).toLocaleTimeString()}
  //               </span>
  //               {slot.isBooked ? (
  //                 <small className="text-success">
  //                   Occupé par {slot.bookedByStudent ? slot.bookedByStudent.name : '[Utilisateur inconnu]'}
  //                   pour {slot.bookedForProject ? slot.bookedForProject.title : '[Projet inconnu]'}
  //                 </small>
  //               ) : (
  //                 <span className="text-blue-500">Disponible</span>
  //               )}
  //             </li>
  //           ))}
  //         </ul>
  //       </section>
  //     )}

  //     {upcomingEvaluations.length > 0 && (
  //       <section className="bg-white p-6 rounded-lg shadow">
  //         <h3 className="text-xl font-semibold text-gray-700 mb-4">Corrections à Venir</h3>
  //         <ul className="space-y-4">
  //           {upcomingEvaluations.map((evaluation) => {
  //             const evaluationTime = new Date(evaluation.slot.startTime);
  //             const now = new Date();
  //             const isEvaluationActive = now >= evaluationTime;

  //             return (
  //               <li key={evaluation._id} className="bg-gray-50 p-4 rounded-md shadow-sm">
  //                 <p className="text-lg font-medium">Projet: {evaluation.project.title}</p>
  //                 <p className="text-gray-600">Apprenant: {evaluation.student.name}</p>
  //                 <p className="text-gray-600">
  //                   Date: {evaluationTime.toLocaleDateString()} à {evaluationTime.toLocaleTimeString()}
  //                 </p>
  //                 <p className="text-gray-600">Description: {evaluation.project.description}</p>
  //                 <p className="text-gray-600">Dépôt: <a href={evaluation.project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-blue-500 hover:underline">{evaluation.project.repoUrl}</a></p>
  //                 <button
  //                   onClick={() => handleOpenEvaluationModal(evaluation)}
  //                   disabled={!isEvaluationActive}
  //                   className={`mt-3 px-4 py-2 rounded-md text-white font-semibold
  //                     ${isEvaluationActive ? 'bg-indigo-600 hover:bg-indigo-700' : 'bg-gray-400 cursor-not-allowed'}`}
  //                 >
  //                   {isEvaluationActive ? 'Évaluer' : `Actif à ${evaluationTime.toLocaleTimeString()}`}
  //                 </button>
  //               </li>
  //             );
  //           })}
  //         </ul>
  //       </section>
  //     )}

  //     {mySubmittedEvaluations.length > 0 && (
  //       <section className="bg-white p-6 rounded-lg shadow">
  //         <h3 className="text-xl font-semibold text-gray-700 mb-4">Mes Évaluations Soumises</h3>
  //         <ul className="space-y-4">
  //           {mySubmittedEvaluations.map((evaluation) => (
  //             <li key={evaluation._id} className="bg-gray-50 p-4 rounded-md shadow-sm">
  //               <p className="text-lg font-medium">Projet: {evaluation.project.title}</p>
  //               <p className="text-gray-600">Évaluateur: {evaluation.evaluator.name}</p>
  //               <p className="text-gray-600">Statut: {evaluation.status}</p>
  //               {evaluation.feedback && evaluation.status !== 'pending' && (
  //                 <div className="mt-2 text-sm text-gray-700">
  //                   <h4 className="font-semibold">Feedback:</h4>
  //                   <p>Assiduité: {evaluation.feedback.assiduite}</p>
  //                   <p>Compréhension: {evaluation.feedback.comprehension}</p>
  //                   <p>Spécifications: {evaluation.feedback.specifications}</p>
  //                   <p>Maîtrise des concepts: {evaluation.feedback.maitrise_concepts}</p>
  //                   <p>Capacité à expliquer: {evaluation.feedback.capacite_expliquer}</p>
  //                 </div>
  //               )}
  //             </li>
  //           ))}
  //         </ul>
  //       </section>
  //     )}
  //   </div>
  // );

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
    <div className="container mt-4 pt-5">
      <h1 className="mb-4">Tableau de bord</h1>
      {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
      {success && <div className="alert alert-success mt-3" role="alert">{success}</div>}
      {me && (
        <div className="row mb-4">
          <div className="col-md-6 col-lg-4 mb-3">
            <div className="card shadow-sm h-100">
              <div className="card-body">
                <h5 className="card-title">Bonjour {me.name}</h5>
                <p className="card-text">Rôle: <span className="badge bg-primary">{me.role}</span></p>
                {me.role === 'apprenant' && (
                  <button className="btn btn-success mt-3" onClick={() => setShowCreateSlotModal(true)}>
                    Créer un slot de disponibilité
                  </button>
                )}
              </div>
            </div>
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
                  {myCreatedSlots.map(slot => (
                    <div key={slot._id} className="list-group-item d-flex justify-content-between align-items-center flex-wrap py-3">
                      <div>
                        <h5 className="mb-1 text-primary">
                          <i className="bi bi-calendar-event me-2"></i>
                          {new Date(slot.startTime).toLocaleDateString()} de {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} à {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        </h5>
                        {slot.isBooked ? (
                          <small className="text-success d-flex align-items-center mt-1"><i className="bi bi-person-check me-1"></i> Occupé par {slot.bookedByStudent ? slot.bookedByStudent.name : '[Utilisateur inconnu]'} pour {slot.bookedForProject ? slot.bookedForProject.title : '[Projet inconnu]'}</small>
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
      {me && me.role === 'apprenant' && mySubmittedEvaluations.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-gradient bg-info text-white d-flex align-items-center">
                <i className="bi bi-hourglass-split me-2"></i>
                <h2 className="h5 mb-0">Mes Projets Soumis en Attente d'Évaluation</h2>
              </div>
              <div className="card-body">
                <div className="list-group list-group-flush">
                  {mySubmittedEvaluations.map(evaluation => (
                    <div key={evaluation._id} className="list-group-item d-flex justify-content-between align-items-center flex-wrap py-3">
                      <div>
                        <h5 className="mb-1">
                          <i className="bi bi-journal-text me-2"></i> Projet: {evaluation.project.title}
                          {evaluation.project.status === 'pending' && <span className="badge bg-warning text-dark ms-2 rounded-pill">En Attente Pairs</span>}
                          {evaluation.project.status === 'awaiting_staff_review' && <span className="badge bg-info ms-2 rounded-pill">En Attente Staff</span>}
                          {evaluation.project.status === 'approved' && <span className="badge bg-success ms-2 rounded-pill">Approuvé</span>}
                          {evaluation.project.status === 'rejected' && <span className="badge bg-danger ms-2 rounded-pill">Rejeté</span>}
                        </h5>
                        <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-person me-1"></i> Évaluateur: {evaluation.evaluator.name}</small>
                        <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-calendar-event me-1"></i> Date & Heure d'évaluation: {new Date(evaluation.slot.startTime).toLocaleString()}</small>
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Nouveau: Section pour les projets que j'ai créés */}
      {me && me.role === 'apprenant' && myProjects.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-gradient bg-success text-white d-flex align-items-center">
                <i className="bi bi-folder-check me-2"></i>
                <h2 className="h5 mb-0">Mes Projets ({myProjects.length})</h2>
              </div>
              <div className="card-body">
                <div className="list-group list-group-flush">
                  {myProjects.map(project => (
                    <div key={project._id} className="list-group-item d-flex justify-content-between align-items-center flex-wrap py-3">
                      <div>
                        <h5 className="mb-1">
                          <i className="bi bi-folder-open me-2"></i> {project.title}
                          {project.status === 'assigned' && <span className="badge bg-warning text-dark ms-2 rounded-pill">Assigné</span>}
                          {project.status === 'approved' && <span className="badge bg-success ms-2 rounded-pill">Approuvé</span>}
                        </h5>
                        <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-file-earmark-text me-1"></i> Description: {project.description}</small>
                        {project.repoUrl && <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-link-45deg me-1"></i> Dépôt: <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">{project.repoUrl}</a></small>}
                      </div>
                    </div>
                  ))}
                </div>
              </div>
            </div>
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
                    upcomingEvaluations.map((evaluation) => {
                      const evaluationTime = new Date(evaluation.slot.startTime);
                      const now = new Date();
                      const isEvaluationActive = now >= evaluationTime;

                      return (
                        <li key={evaluation._id} className="list-group-item d-flex justify-content-between align-items-center flex-wrap py-3">
                          <div>
                            <h5 className="mb-1 text-info"><i className="bi bi-calendar-check me-2"></i> Projet: {evaluation.project.title}</h5>
                            <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-person me-1"></i> Apprenant: {evaluation.student.name}</small>
                            <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-clock me-1"></i> Date: {evaluationTime.toLocaleDateString()} à {evaluationTime.toLocaleTimeString()}</small>
                            <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-card-text me-1"></i> Description: {evaluation.project.description}</small>
                            <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-github me-1"></i> Dépôt: <a href={evaluation.project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">{evaluation.project.repoUrl}</a></small>
                          </div>
                          <button
                            onClick={() => handleOpenEvaluationModal(evaluation)}
                            disabled={!isEvaluationActive}
                            className={`btn btn-sm mt-2 mt-md-0 ${isEvaluationActive ? 'btn-warning' : 'btn-secondary disabled'}`}
                          >
                            {isEvaluationActive ? 'Évaluer le projet' : `Actif à ${evaluationTime.toLocaleTimeString()}`}
                          </button>
                        </li>
                      );
                    })
                  ) : (
                    // Affichage pour le staff/admin
                    allPendingEvaluationsForStaff.length > 0 ? (
                      // Regrouper les évaluations par projet
                      Object.values(allPendingEvaluationsForStaff.reduce((acc, evaluation) => {
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
                            <small className="text-muted d-flex align-items-center mt-1">Statut du projet: <span className="badge bg-info ms-1 rounded-pill">{projectGroup.project.status}</span></small>
                            <small className="text-muted d-flex align-items-center mt-1">Dépôt: <a href={projectGroup.project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">{projectGroup.project.repoUrl}</a></small>
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

      {/* Section des évaluations que JE DOIS FAIRE (en tant qu'évaluateur) - Ancienne version avec évaluationsAsEvaluator, si besoin */}
      {/* Me && me.role === 'apprenant' && evaluationsAsEvaluator.length > 0 && (
        <div className="row mb-4">
          <div className="col-12">
            <div className="card shadow-sm">
              <div className="card-header bg-danger text-white">
                <h2 className="h5 mb-0">Évaluations à Réaliser (Ancien)</h2>
              </div>
              <div className="card-body">
                <div className="list-group">
                  {evaluationsAsEvaluator.map(evaluation => (
                    <div key={evaluation._id} className="list-group-item d-flex justify-content-between align-items-center flex-wrap">
                      <div>
                        <h5 className="mb-1">Projet: {evaluation.project.title}</h5>
                        <small className="text-muted">Soumis par: {evaluation.student.name}</small><br/>
                        <small className="text-muted">Date & Heure d'évaluation: {new Date(evaluation.slot.startTime).toLocaleString()}</small>
                      </div>
                      <button
                        className="btn btn-sm btn-warning mt-2 mt-md-0"
                        onClick={() => handleOpenEvaluationModal(evaluation)}
                      >
                        <i className="bi bi-pencil-square me-1"></i> Évaluer le projet
                      </button>
                    </div>
                  ))}
                </div>
              </div>
            </div>
          </div>
        </div>
      )} */}

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
                        {project.repoUrl && <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-github me-1"></i> Dépôt: <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">{project.repoUrl}</a></small>}
                        <small className="text-muted d-flex align-items-center mt-1"><i className="bi bi-calendar-event me-1"></i> Date de soumission: {new Date(project.submissionDate).toLocaleDateString()}</small>
                      </div>
                      <div className="d-flex flex-column flex-md-row mt-2 mt-md-0">
                        <button
                          className="btn btn-sm btn-success mt-2 mt-md-0 me-md-2"
                          onClick={() => handleFinalStaffReview(project._id, 'approved')}
                        >
                          <i className="bi bi-check-circle me-1"></i> Approuver
                        </button>
                        <button
                          className="btn btn-sm btn-danger mt-2 mt-md-0"
                          onClick={() => handleFinalStaffReview(project._id, 'rejected')}
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
                  <table className="table table-hover table-sm caption-top">
                    <caption>Liste des apprenants inscrits</caption>
                    <thead>
                      <tr className="table-light">
                        <th>Nom</th>
                        <th>Email</th>
                        <th>Niveau</th>
                        <th>Jours Restants</th>
                        <th>Projet Assigné</th>
                        <th className="text-center">Détails</th>
                      </tr>
                    </thead>
                    <tbody>
                      {learners.map(learner => (
                        <React.Fragment key={learner._id}>
                          <tr className="align-middle">
                            <td>{learner.name}</td>
                            <td>{learner.email}</td>
                            <td>{learner.level}</td>
                            <td>{learner.daysRemaining}</td>
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
                                    <strong>Détails du Projet Assigné:</strong>
                                    {learner.assignedProject ? (
                                      <>
                                        <p className="mb-1">Titre: {learner.assignedProject.title}</p>
                                        <p className="mb-1">Statut: <span className={`badge bg-${learner.assignedProject.status === 'assigned' ? 'info' : learner.assignedProject.status === 'pending' ? 'warning' : 'success'}`}>{learner.assignedProject.status}</span></p>
                                        {learner.assignedProject.repoUrl && <p className="mb-1">Dépôt: <a href={learner.assignedProject.repoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">{learner.assignedProject.repoUrl}</a></p>}
                                        {learner.assignedProject.submissionDate && <p className="mb-1">Date de soumission: {new Date(learner.assignedProject.submissionDate).toLocaleDateString()}</p>}
                                        {/* Ajoutez d'autres détails pertinents ici */}
                                      </>
                                    ) : (
                                      <p className="text-muted">Aucun projet actuellement assigné.</p>
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
                <button className="btn btn-light btn-sm" onClick={() => setShowAddProjectModal(true)}>
                  <i className="bi bi-plus-circle me-1"></i> Ajouter un Projet
                </button>
              </div>
              <div className="card-body">
                {allProjects.length === 0 ? (
                  <p>Aucun projet disponible.</p>
                ) : (
                  <div className="table-responsive">
                    <table className="table table-striped table-hover">
                      <thead>
                        <tr>
                          <th>Titre</th>
                          <th>Description</th>
                          <th>Étudiant</th>
                          <th>Statut</th>
                          <th>Actions</th>
                        </tr>
                      </thead>
                      <tbody>
                        {allProjects.map(project => (
                          <tr key={project._id}>
                            <td>{project.title}</td>
                            <td>{project.description.substring(0, 50)}...</td>
                            <td>{project.student ? project.student.name : 'Template'}</td>
                            <td>
                              <span className={`badge bg-${project.status === 'approved' ? 'success' : project.status === 'rejected' ? 'danger' : 'warning'}`}>
                                {project.status}
                              </span>
                            </td>
                            <td>
                              <button className="btn btn-sm btn-outline-info me-2" onClick={() => handleEditProject(project)} title="Modifier">
                                <i className="bi bi-pencil-square"></i>
                              </button>
                              <button className="btn btn-sm btn-outline-danger" onClick={() => handleDeleteProject(project._id)} title="Supprimer">
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

      {me && (me.role === 'apprenant') && (
        <div className="row">
          <div className="col-lg-6 mb-4">
            <ProjectList projects={projects} />
          </div>
          <div className="col-lg-6 mb-4">
            <HackathonList hackathons={hackathons} />
          </div>
          <div className="col-12 mb-4">
            <BadgeDisplay badges={badges} />
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
                <form onSubmit={handleCreateSlot}>
                  <div className="mb-3">
                    <label htmlFor="slotDate" className="form-label">Date</label>
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
                    <label htmlFor="slotStartTime" className="form-label">Heure de début</label>
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
                    <label htmlFor="slotEndTime" className="form-label">Heure de fin</label>
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
                  <button type="submit" className="btn btn-success">Créer le slot</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {showCreateSlotModal && <div className="modal-backdrop fade show"></div>}

      {/* Modale pour les notifications de slot réservé */}
      {showNotificationModal && currentNotification && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-info text-white">
                <h5 className="modal-title">Notification de Réservation de Slot</h5>
                <button type="button" className="btn-close" onClick={handleCloseNotificationModal}></button>
              </div>
              <div className="modal-body">
                <p>{currentNotification.message}</p>
                <small className="text-muted">Reçu le: {new Date(currentNotification.createdAt).toLocaleString()}</small>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseNotificationModal}>Fermer</button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showNotificationModal && <div className="modal-backdrop fade show"></div>}

      {/* Modale pour ajouter/modifier un projet (staff/admin) */}
      {(showAddProjectModal || showEditProjectModal) && (
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
                  {/* Pour les projets templates, repoUrl n'est pas requis. Pour les projets d'apprenant, il le sera. */}
                  {currentProjectToEdit && currentProjectToEdit.student && (
                    <div className="mb-3">
                      <label htmlFor="projectRepoUrl" className="form-label">URL du Dépôt GitHub</label>
                      <input
                        type="url"
                        className="form-control"
                        id="projectRepoUrl"
                        value={projectRepoUrl}
                        onChange={(e) => setProjectRepoUrl(e.target.value)}
                        required
                      />
                    </div>
                  )}
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
      {(showAddProjectModal || showEditProjectModal) && <div className="modal-backdrop fade show"></div>}

      {/* Modale de confirmation de suppression de projet */}
      {showDeleteProjectModal && currentProjectToDelete && (
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
      {showDeleteProjectModal && <div className="modal-backdrop fade show"></div>}

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

                <p><strong>Apprenant:</strong> {currentEvaluationToSubmit.student.name}</p>
                <p><strong>URL Dépôt GitHub:</strong> <a href={currentEvaluationToSubmit.project.repoUrl} target="_blank" rel="noopener noreferrer">{currentEvaluationToSubmit.project.repoUrl}</a></p>
                <p>Veuillez fournir votre appréciation pour les points suivants (obligatoire pour accepter):</p>

                <form>
                  <div className="mb-3">
                    <label htmlFor="feedbackAssiduite" className="form-label">Assiduité</label>
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
                    <label htmlFor="feedbackComprehension" className="form-label">Compréhension des projets</label>
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
                    <label htmlFor="feedbackSpecifications" className="form-label">Respect des spécifications</label>
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
                    <label htmlFor="feedbackMaitriseConcepts" className="form-label">Maîtrise des concepts</label>
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
                    <label htmlFor="feedbackCapaciteExpliquer" className="form-label">Capacité à expliquer</label>
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
                <button type="button" className="btn btn-danger" onClick={() => handleSubmitFeedback('rejected')}>Refuser le projet</button>
                <button 
                  type="button" 
                  className="btn btn-success" 
                  onClick={() => handleSubmitFeedback('accepted')}
                  disabled={Object.values(feedback).some(value => value.trim() === '')}
                >
                  Accepter le projet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showEvaluationModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}

// Fonction pour gérer l'évaluation finale par le personnel
const handleFinalStaffReview = async (projectId, status) => {
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
      body: JSON.stringify({ status }),
    });

    const data = await res.json();

    if (res.ok) {
      alert(data.message);
      // Recharger les données du tableau de bord pour refléter les changements
      window.location.reload(); // Solution simple pour recharger le dashboard
    } else {
      alert(data.error || 'Échec de l\'évaluation finale.');
    }
  } catch (e) {
    console.error("Error during final staff evaluation:", e);
    alert('Erreur lors de la communication avec le serveur.');
  }
};
