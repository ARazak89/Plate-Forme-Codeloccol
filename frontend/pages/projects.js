import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function Projects() {
  const [projects, setProjects] = useState([]); // Liste des projets assignés à l'apprenant
  const [expandedProject, setExpandedProject] = useState(null); // Pour suivre le projet étendu
  const [submissionRepoUrl, setSubmissionRepoUrl] = useState(''); // URL du dépôt pour la soumission
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showBookSlotModal, setShowBookSlotModal] = useState(false); // État de la modale de réservation
  const [currentProjectToBook, setCurrentProjectToBook] = useState(null); // Projet pour lequel on réserve
  const [availableSlots, setAvailableSlots] = useState([]); // Slots disponibles à la réservation
  const [selectedSlots, setSelectedSlots] = useState([]); // Slots sélectionnés par l'apprenant
  const [toastMessage, setToastMessage] = useState(null); // Nouvel état pour le message du toast
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const loadProjects = async () => {
    if (!token) {
      router.push('/login');
      return;
    }
    try {
    const r = await fetch(`${API}/projects/mine`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Failed to fetch projects');
      const data = await r.json();
      setProjects(data);
    } catch (e) {
      console.error("Error loading projects:", e);
      setError(e.message);
    }
  };

  useEffect(() => {
    if (token) {
      loadProjects();
    } else {
      router.push('/login');
    }
  }, [token]);

  // Effet pour gérer l'affichage du toast
  useEffect(() => {
    if (toastMessage) {
      const timer = setTimeout(() => {
        setToastMessage(null);
      }, 3000); // Le toast disparaît après 3 secondes
      return () => clearTimeout(timer);
    }
  }, [toastMessage]);

  const handleCardClick = (projectId) => {
    setExpandedProject(expandedProject === projectId ? null : projectId);
    setError(null);
    setSuccess(null);
    setSubmissionRepoUrl(''); // Réinitialiser l'URL de soumission lors de l'expansion/réduction
    // Réinitialiser les états liés aux slots lors de la fermeture/ouverture d'une carte
    setSelectedSlots([]);
    setAvailableSlots([]);
    setCurrentProjectToBook(null);
  };

  const handleOpenSubmissionFlow = async (project) => {
    setCurrentProjectToBook(project);
    fetchAvailableSlots(project._id); // Charger les slots pour ce projet
    setShowBookSlotModal(true);
    setError(null);
    setSuccess(null);
  };

  const handleSubmitSolution = async (projectId) => {
    setError(null);
    setSuccess(null);

    if (!token) {
      setError('Vous devez être connecté pour soumettre une solution.');
      return;
    }
    if (!submissionRepoUrl) {
      setError('Veuillez renseigner l\'URL de votre dépôt GitHub.');
      return;
    }

    try {
      const r = await fetch(`${API}/projects/${projectId}/submit-solution`, {
      method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ repoUrl: submissionRepoUrl }),
      });
      const data = await r.json();
      if (r.ok) {
        setSuccess('Solution soumise avec succès !');
        setSubmissionRepoUrl(''); // Réinitialiser le champ
        setExpandedProject(null); // Réduire la carte
        loadProjects(); // Recharger les projets pour refléter le changement de statut
      } else {
        throw new Error(data.message || 'Échec de la soumission de la solution.');
      }
    } catch (e) {
      setError(e.message);
    }
  };

  // Charger les slots disponibles pour un projet donné
  const fetchAvailableSlots = async (projectId) => {
    if (!token) return;
    try {
      const res = await fetch(`${API}/availability`, { headers: { Authorization: `Bearer ${token}` } });
      if (!res.ok) throw new Error('Failed to fetch available slots.');
      const data = await res.json();
      setAvailableSlots(data);
    } catch (e) {
      console.error("Error fetching available slots:", e);
      setError(e.message);
    }
  };

  const handleSlotSelection = (slot) => {
    setToastMessage(null); // Cacher tout toast précédent
    setSelectedSlots(prevSelectedSlots => {
      const isAlreadySelected = prevSelectedSlots.some(s => s._id === slot._id);
      if (isAlreadySelected) {
        return prevSelectedSlots.filter(s => s._id !== slot._id);
      } else {
        // Convertir les chaînes de temps en objets Date pour la comparaison
        const newSlotStartTime = new Date(slot.startTime);
        for (const existingSlot of prevSelectedSlots) {
          const existingSlotStartTime = new Date(existingSlot.startTime);

          const diffMs = Math.abs(newSlotStartTime.getTime() - existingSlotStartTime.getTime());
          const diffMinutes = Math.round(diffMs / 60000);

          // Nouvelle validation: empêcher la sélection de slots avec la même heure de début
          if (newSlotStartTime.getTime() === existingSlotStartTime.getTime()) {
            setToastMessage('Vous ne pouvez pas choisir deux slots ayant la même heure de début.');
            return prevSelectedSlots;
          }

          if (diffMinutes < 45) {
            setToastMessage('Veuillez choisir des slots avec un décalage d\'au moins 45 minutes.');
            return prevSelectedSlots; // Ne pas ajouter le slot si la contrainte n'est pas respectée
          }
        }
        return [...prevSelectedSlots, slot];
      }
    });
  };

  const handleSlotRemoval = (slotId) => {
    setSelectedSlots(prevSelectedSlots => prevSelectedSlots.filter(slot => slot._id !== slotId));
  };

  const handleConfirmSubmission = async () => {
    setError(null);
    setSuccess(null);

    if (selectedSlots.length !== 2) {
      setError('Veuillez sélectionner exactement deux slots pour la soumission.');
      return;
    }
    if (!currentProjectToBook) {
      setError('Aucun projet sélectionné pour la soumission.');
      return;
    }

    try {
      // Envoyer toutes les réservations sélectionnées
      for (const slot of selectedSlots) {
        const res = await fetch(`${API}/availability/book`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
          body: JSON.stringify({ slotId: slot._id, projectId: currentProjectToBook._id }),
        });
        const data = await res.json();
        if (!res.ok) {
          throw new Error(data.error || data.message || `Échec de la réservation du slot ${new Date(slot.startTime).toLocaleString()}.`);
        }
      }

      setSuccess('Slots réservés avec succès et notifications envoyées !');
      setShowBookSlotModal(false); // Fermer la modale
      setSelectedSlots([]); // Réinitialiser les slots sélectionnés
      // Au lieu de recharger tous les projets, mettons à jour l'état local du projet soumis
      setProjects(prevProjects =>
        prevProjects.map(p =>
          p._id === currentProjectToBook._id
            ? { ...p, repoUrl: submissionRepoUrl, status: 'pending' } // Mettre à jour le statut et l'URL
            : p
        )
      );
      // Mettre à jour aussi currentProjectToBook pour que la modale (si elle reste ouverte) reflète le changement
      setCurrentProjectToBook(prev => ({ ...prev, repoUrl: submissionRepoUrl, status: 'pending' }));
      setExpandedProject(null); // Fermer la carte après soumission

    } catch (e) {
      console.error("Error confirming booking:", e);
      setError(e.message);
    }
  };

  if (!token) return null;

  return (
    <div>
      <h1 className="mb-4">Mes Projets</h1>

      {success && <div className="alert alert-success mt-3" role="alert">{success}</div>}
      {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}

      {/* Toast message */}
      {toastMessage && (
        <div
          className="toast show align-items-center text-white bg-warning border-0 position-fixed bottom-0 end-0 m-3"
          role="alert"
          aria-live="assertive"
          aria-atomic="true"
          style={{ zIndex: 1050 }}
        >
          <div className="d-flex">
            <div className="toast-body">{toastMessage}</div>
            <button
              type="button"
              className="btn-close btn-close-white me-2 m-auto"
              onClick={() => setToastMessage(null)}
              aria-label="Close"
            ></button>
          </div>
        </div>
      )}

      {projects.length === 0 ? (
        <p className="lead">Aucun projet assigné ou en cours pour le moment.</p>
      ) : (
        <div className="row g-4">
          {projects.map((project) => (
            <div key={project._id} className="col-12">
              <div className="card shadow-sm">
                <div
                  className="card-header d-flex justify-content-between align-items-center bg-light cursor-pointer"
                  onClick={() => handleCardClick(project._id)}
                  style={{ cursor: 'pointer' }}
                >
                  <h5 className="mb-0">{project.title}</h5>
                  <div>
                    <span className={`badge ${project.status === 'approved' ? 'bg-success' : project.status === 'pending' ? 'bg-warning text-dark' : 'bg-secondary'}`}>
                      {project.status}
                    </span>
                  </div>
                </div>
                {expandedProject === project._id && (
                  <div className="card-body">
                    <p className="card-text"><strong>Description:</strong> {project.description}</p>

                    {project.demoVideoUrl && (
                      <div className="mb-3">
                        <h6>Démonstration Vidéo:</h6>
                        <div className="ratio ratio-16x9">
                          <iframe
                            src={project.demoVideoUrl.replace("watch?v=", "embed/")}
                            title="YouTube video player"
                            frameBorder="0"
                            allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture"
                            allowFullScreen
                          ></iframe>
                        </div>
                      </div>
                    )}

                    {project.specifications && (
                      <div className="mb-3">
                        <h6>Spécifications:</h6>
                        <p>{project.specifications}</p>
                      </div>
                    )}

                    {project.status === 'assigned' && !project.repoUrl && (
                      <div className="mt-4 p-3 border rounded bg-white">
                        <h6>Soumettre votre solution:</h6>
                        <form onSubmit={(e) => { e.preventDefault(); handleOpenSubmissionFlow(project); }}>
                          <div className="mb-3">
                            <label htmlFor={`repoUrl-${project._id}`} className="form-label">URL de votre dépôt GitHub</label>
                            <input
                              type="url"
                              className="form-control"
                              id={`repoUrl-${project._id}`}
                              value={submissionRepoUrl}
                              onChange={(e) => setSubmissionRepoUrl(e.target.value)}
                              placeholder="Ex: https://github.com/votre-user/votre-repo-solution"
                              required
                              disabled={project.status !== 'assigned' || project.repoUrl}
                            />
                          </div>
                          <button
                            type="submit"
                            className="btn btn-success w-100"
                            disabled={!submissionRepoUrl || project.status !== 'assigned' || project.repoUrl}
                          >
                            {project.status === 'assigned' ? 'Continuer vers la sélection des slots' : 'Projet soumis en attente d\'évaluation'}
                          </button>
      </form>
                    </div>
                  )}

                  {project.status === 'pending' && project.repoUrl && (
                    <div className="mt-4 alert alert-info">
                      <p>Votre projet est soumis avec l'URL: <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">{project.repoUrl}</a></p>
                      <p className="mb-0">En attente d'évaluation.</p>
                    </div>
                  )}

                    {project.status === 'approved' && project.repoUrl && (
                      <div className="mt-3 alert alert-success">
                        <p className="mb-0">Votre solution a été approuvée !</p>
                        <small>Dépôt soumis: <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">{project.repoUrl}</a></small>
                      </div>
                    )}

                    {project.status === 'rejected' && project.repoUrl && (
                      <div className="mt-3 alert alert-danger">
                        <p className="mb-0">Votre solution a été rejetée.</p>
                        <small>Dépôt soumis: <a href={project.repoUrl} target="_blank" rel="noopener noreferrer">{project.repoUrl}</a></small>
                      </div>
                    )}

                  </div>
                )}
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale pour la réservation de slots */}
      {showBookSlotModal && currentProjectToBook && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-primary text-white">
                <h5 className="modal-title">Sélectionner des Slots pour {currentProjectToBook.title}</h5>
                <button type="button" className="btn-close" onClick={() => setShowBookSlotModal(false)}></button>
              </div>
              <div className="modal-body">
                {/* Afficher les messages d'erreur/succès de cette modale ici */}
                {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
                {success && <div className="alert alert-success mt-3" role="alert">{success}</div>}

                <p>Sélectionnez **deux** slots de disponibilité d'évaluateurs différents pour votre projet.</p>
                <p>Décalage minimum de 45 minutes entre les slots.</p>

                <h6>Slots de disponibilité disponibles:</h6>
                {availableSlots.length === 0 ? (
                  <p>Aucun slot disponible pour le moment.</p>
                ) : (
                  <div className="list-group mb-3">
                    {availableSlots.map(slot => {
                      const isSlotBookedOrSelected = slot.isBooked || selectedSlots.some(s => s._id === slot._id);
                      const isDisabled = currentProjectToBook.status !== 'assigned' || currentProjectToBook.repoUrl || (selectedSlots.length >= 2 && !isSlotBookedOrSelected);

                      return (
                        <button
                          key={slot._id}
                          type="button"
                          className={`list-group-item list-group-item-action ${isSlotBookedOrSelected ? 'active' : ''}`}
                          onClick={() => handleSlotSelection(slot)}
                          disabled={isDisabled}
                        >
                          {new Date(slot.startTime).toLocaleDateString()} de {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} à {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          {slot.isBooked && <span className="ms-2 badge bg-secondary">Réservé</span>}
                        </button>
                      );
                    })}
                  </div>
                )}

                <h6>Slots sélectionnés ({selectedSlots.length}/2):</h6>
                {selectedSlots.length === 0 ? (
                  <p>Aucun slot sélectionné.</p>
                ) : (
                  <ul className="list-group mb-3">
                    {selectedSlots.map(slot => (
                      <li key={slot._id} className="list-group-item">
                        {new Date(slot.startTime).toLocaleDateString()} de {new Date(slot.startTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })} à {new Date(slot.endTime).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                        {/* {slot.evaluator && ` (Évaluateur: ${slot.evaluator.name})`} */}
                        <button type="button" className="btn btn-sm btn-danger ms-2" onClick={() => handleSlotRemoval(slot._id)}>X</button>
                      </li>
                    ))}
      </ul>
                )}

              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={() => setShowBookSlotModal(false)}>Annuler</button>
                <button
                  type="button"
                  className="btn btn-primary"
                  onClick={handleConfirmSubmission}
                  disabled={selectedSlots.length !== 2 || currentProjectToBook.status !== 'assigned' || currentProjectToBook.repoUrl}
                >
                  Confirmer la soumission du projet
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {(showBookSlotModal) && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}
