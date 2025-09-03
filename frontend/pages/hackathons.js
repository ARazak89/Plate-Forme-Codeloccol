import { useEffect, useState } from 'react';
import { useRouter } from 'next/router'; // Importez useRouter

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function Hackathons() {
  const [list, setList] = useState([]);
  const [error, setError] = useState(null); // Pour gérer les erreurs d'API
  const [showHackathonModal, setShowHackathonModal] = useState(false); // Nouvel état pour la modale
  const [selectedHackathon, setSelectedHackathon] = useState(null); // Nouvel état pour le hackathon sélectionné
  const [me, setMe] = useState(null); // État pour stocker les informations de l'utilisateur connecté
  const [learners, setLearners] = useState([]); // État pour stocker la liste des apprenants
  
  // États pour la création de Hackathon
  const [showCreateHackathonModal, setShowCreateHackathonModal] = useState(false); // Nouvel état pour la modale de création de hackathon
  const [newHackathonTitle, setNewHackathonTitle] = useState('');
  const [newHackathonDescription, setNewHackathonDescription] = useState('');
  const [newHackathonStartDate, setNewHackathonStartDate] = useState('');
  const [newHackathonEndDate, setNewHackathonEndDate] = useState('');
  const [newHackathonSpecifications, setNewHackathonSpecifications] = useState(''); // Remplacer githubRepoUrl par specifications
  const [newHackathonTeamSize, setNewHackathonTeamSize] = useState(1); // Nouveau champ pour la taille d'équipe

  // États pour la constitution des équipes
  const [showConstituteTeamsModal, setShowConstituteTeamsModal] = useState(false);
  const [selectedHackathonForTeams, setSelectedHackathonForTeams] = useState(null);
  const [availableLearnersForTeams, setAvailableLearnersForTeams] = useState([]);
  const [currentTeams, setCurrentTeams] = useState([]); // Format: [{ name: '', members: [] }]

  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const fetchHackathonsData = async () => {
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const r = await fetch(`${API}/api/hackathons`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Failed to fetch hackathons');
      setList(await r.json());

      // Fetch available learners for team constitution if staff/admin
      if (me && (me.role === 'staff' || me.role === 'admin')) {
        const learnersRes = await fetch(`${API}/api/hackathons/available-learners`, { headers: { Authorization: `Bearer ${token}` } });
        if (!learnersRes.ok) throw new Error('Failed to fetch available learners');
        setAvailableLearnersForTeams(await learnersRes.json());
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const loadHackathonTeams = async (hackathonId) => {
    if (!token || !hackathonId) return;
    try {
      const r = await fetch(`${API}/api/teams/hackathon/${hackathonId}`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Failed to fetch hackathon teams');
      setCurrentHackathonTeams(await r.json());
    } catch (e) {
      console.error("Error loading hackathon teams:", e);
      setError(e.message);
    }
  };

  const handleCardClick = (hackathon) => {
    setSelectedHackathon(hackathon);
    setShowHackathonModal(true);
    if (me && (me.role === 'staff' || me.role === 'admin')) {
      loadHackathonTeams(hackathon._id);
    }
  };

  const handleCloseModal = () => {
    setShowHackathonModal(false);
    setSelectedHackathon(null);
    // Réinitialiser les états spécifiques à la création/constitution d'équipes
    // setTeamName(''); // Supprimé car la nouvelle approche n'utilise pas cet état directement dans la modale
    // setSelectedMembers([]); // Supprimé
    // setCurrentHackathonTeams([]); // Supprimé
  };

  // Supprimer handleMemberSelection et handleCreateTeam existants car ils seront remplacés/adaptés
  // const handleMemberSelection = (e) => { ... };
  // const handleCreateTeam = async (e) => { ... };

  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) return;
    setError(null);
    try {
      const r = await fetch(`${API}/api/teams/${teamId}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to delete team');
      }
      alert('Équipe supprimée avec succès !');
      loadHackathonTeams(selectedHackathon._id); // Recharger les équipes du hackathon
    } catch (e) {
      setError(e.message);
    }
  };

  const handleAddMember = async (teamId, memberId) => {
    setError(null);
    try {
      const r = await fetch(`${API}/api/teams/${teamId}/add-member`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ memberId }),
      });
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to add member');
      }
      alert('Membre ajouté avec succès !');
      loadHackathonTeams(selectedHackathon._id);
    } catch (e) {
      setError(e.message);
    }
  };

  const handleRemoveMember = async (teamId, memberId) => {
    if (!confirm('Êtes-vous sûr de vouloir retirer ce membre de l\'équipe ?')) return;
    setError(null);
    try {
      const r = await fetch(`${API}/api/teams/${teamId}/remove-member`, {
        method: 'PUT',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ memberId }),
      });
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to remove member');
      }
      alert('Membre retiré avec succès !');
      loadHackathonTeams(selectedHackathon._id);
    } catch (e) {
      setError(e.message);
    }
  };

  // Refactorisation de handleCreateHackathon pour inclure teamSize et specifications
  const handleCreateHackathon = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null); // Ajoutez si nécessaire
    // setIsLoading(true); // Gérer l'état de chargement si nécessaire

    if (!token) {
      setError('Vous devez être connecté pour créer un hackathon.');
      // setIsLoading(false);
      return;
    }

    if (!newHackathonTitle || !newHackathonStartDate || !newHackathonEndDate || !newHackathonTeamSize) {
      setError('Le titre, les dates et la taille d\'équipe sont obligatoires.');
      // setIsLoading(false);
      return;
    }
    if (newHackathonTeamSize < 1) {
      setError('La taille des équipes doit être d\'au moins 1.');
      // setIsLoading(false);
      return;
    }

    try {
      const r = await fetch(`${API}/api/hackathons`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({
          title: newHackathonTitle,
          description: newHackathonDescription,
          startDate: newHackathonStartDate,
          endDate: newHackathonEndDate,
          specifications: newHackathonSpecifications, // Utilisez le nouveau champ
          teamSize: newHackathonTeamSize, // Utilisez le nouveau champ
        }),
      });
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Échec de la création du hackathon');
      }
      alert('Hackathon créé avec succès !');
      setShowCreateHackathonModal(false);
      setNewHackathonTitle('');
      setNewHackathonDescription('');
      setNewHackathonStartDate('');
      setNewHackathonEndDate('');
      setNewHackathonSpecifications(''); // Réinitialiser le nouveau champ
      setNewHackathonTeamSize(1); // Réinitialiser
      fetchHackathonsData(); // Recharger la liste des hackathons
    } catch (e) {
      setError(e.message);
    } finally {
      // setIsLoading(false);
    }
  };

  // Fonction pour gérer la constitution des équipes (copiée de dashboard.js)
  const handleConstituteTeams = async () => {
    setError(null);
    // setSuccess(null); // Ajoutez si nécessaire
    // setIsLoading(true); // Gérer l'état de chargement si nécessaire

    if (!token) {
      setError('Vous devez être connecté pour constituer les équipes.');
      // setIsLoading(false);
      return;
    }

    if (!selectedHackathonForTeams) {
      setError('Veuillez sélectionner un hackathon.');
      // setIsLoading(false);
      return;
    }

    // Vérifications côté client (redondantes avec le backend, mais offrent un feedback immédiat)
    if (currentTeams.length === 0) {
      setError('Veuillez constituer au moins une équipe.');
      // setIsLoading(false);
      return;
    }

    const allMembersInCurrentTeams = [];
    for (const team of currentTeams) {
      if (!team.name.trim()) {
        setError('Tous les noms d\'équipe sont obligatoires.');
        // setIsLoading(false);
        return;
      }
      if (team.members.length === 0) {
        setError(`L'équipe ${team.name} doit avoir au moins un membre.`);
        // setIsLoading(false);
        return;
      }
      if (team.members.length > selectedHackathonForTeams.teamSize) {
        setError(`L'équipe ${team.name} dépasse la taille maximale autorisée de ${selectedHackathonForTeams.teamSize} membres.`);
        // setIsLoading(false);
        return;
      }
      for (const memberId of team.members) {
        if (allMembersInCurrentTeams.includes(memberId)) {
          setError(`L'apprenant ${availableLearnersForTeams.find(l => l._id === memberId)?.name || memberId} est assigné à plus d'une équipe.`);
          // setIsLoading(false);
          return;
        }
        allMembersInCurrentTeams.push(memberId);
      }
    }

    try {
      const res = await fetch(`${API}/api/hackathons/${selectedHackathonForTeams._id}/constitute-teams`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ teams: currentTeams }),
      });

      const data = await res.json();

      if (res.ok) {
        // setSuccess(data.message); // Ajoutez si nécessaire
        alert(data.message);
        setShowConstituteTeamsModal(false);
        setSelectedHackathonForTeams(null);
        setCurrentTeams([]);
        fetchHackathonsData(); // Recharger les données pour refléter les nouvelles équipes
      } else {
        throw new Error(data.error || data.message || 'Échec de la constitution des équipes.');
      }
    } catch (e) {
      console.error("Error constituting teams:", e);
      setError(e.message);
    } finally {
      // setIsLoading(false);
    }
  };

  useEffect(() => {
    if (token) {
      fetchHackathonsData();
      const loadUserData = async () => {
        try {
          const userRes = await fetch(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
          if (!userRes.ok) throw new Error('Failed to fetch user data');
          const userData = await userRes.json();
          setMe(userData);

          if (userData.role === 'staff' || userData.role === 'admin') {
            const learnersRes = await fetch(`${API}/api/users?role=apprenant`, { headers: { Authorization: `Bearer ${token}` } });
            if (!learnersRes.ok) throw new Error('Failed to fetch learners');
            setLearners(await learnersRes.json()); // Mettre à jour les apprenants existants
            // setAvailableLearnersForTeams(await learnersRes.json()); // Ceci sera géré par fetchHackathonsData
          }
        } catch (e) {
          console.error("Error loading user/learners data:", e);
          setError(e.message);
        }
      };
      loadUserData();
    } else {
      router.push('/login');
    }
  }, [token, setMe, setList, setAvailableLearnersForTeams]); // Ajouter setAvailableLearnersForTeams et setList

  if (!token) return null;

  return (
    <div className="container-fluid mt-4 pt-5 px-4">
      <h1 className="mb-4">Hackathons</h1>

      {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
      {me && (me.role === 'staff' || me.role === 'admin') && (
        <div className="d-flex justify-content-end mb-3">
          <button className="btn btn-primary me-2" onClick={() => setShowCreateHackathonModal(true)}>
            <i className="bi bi-plus-circle me-2"></i> Créer un nouveau Hackathon
          </button>
          <button className="btn btn-success" onClick={() => setShowConstituteTeamsModal(true)}>
            <i className="bi bi-people me-2"></i> Constituer Équipes
          </button>
        </div>
      )}

      {list.length === 0 ? (
        <p>Aucun hackathon disponible pour le moment.</p>
      ) : (
        <div className="row g-4">
          {list.map((h) => (
            <div key={h._id} className="col-md-6 col-lg-4">
              <div
                className="card shadow-sm h-100 cursor-pointer"
                onClick={() => handleCardClick(h)}
                style={{ cursor: 'pointer' }}
              >
                <div className="card-body d-flex flex-column">
                  <h5 className="card-title text-primary">{h.title}</h5>
                  <p className="card-text text-muted flex-grow-1">{h.description}</p>
                  {h.teamSize && <p className="card-text text-muted">Taille d'équipe: {h.teamSize}</p>}
                  <div className="d-flex justify-content-between align-items-center mt-2">
                    <small className={`badge ${h.status === 'active' ? 'bg-info text-dark' : h.status === 'finished' ? 'bg-secondary' : 'bg-dark'}`}>
                      {h.status}
                    </small>
                    <small className="text-muted">
                      {new Date(h.startDate).toLocaleDateString()} - {new Date(h.endDate).toLocaleDateString()}
                    </small>
                  </div>
                  {h.participants && h.participants.length > 0 && (
                    <small className="text-muted mt-2">Participants: {h.participants.length}</small>
                  )}
                  {h.teams && h.teams.length > 0 && (
                    <small className="text-muted mt-2">Équipes constituées: {h.teams.length}</small>
                  )}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {/* Modale d'affichage des détails du Hackathon */}
      {showHackathonModal && selectedHackathon && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-primary text-white">
                <h5 className="modal-title">Détails du Hackathon: {selectedHackathon.title}</h5>
                <button type="button" className="btn-close" onClick={handleCloseModal}></button>
              </div>
              <div className="modal-body">
                <p><strong>Description:</strong> {selectedHackathon.description}</p>
                {selectedHackathon.specifications && (
                  <p><strong>Spécifications:</strong> {selectedHackathon.specifications}</p>
                )}
                <p><strong>Taille d'équipe:</strong> {selectedHackathon.teamSize}</p>
                <p><strong>Date de début:</strong> {new Date(selectedHackathon.startDate).toLocaleDateString()}</p>
                <p><strong>Date de fin:</strong> {new Date(selectedHackathon.endDate).toLocaleDateString()}</p>
                <p><strong>Statut:</strong> <span className={`badge rounded-pill ${selectedHackathon.status === 'active' ? 'bg-info text-dark' : selectedHackathon.status === 'finished' ? 'bg-secondary' : 'bg-dark'}`}>
                  {selectedHackathon.status}
                </span></p>
                {selectedHackathon.participants && selectedHackathon.participants.length > 0 && (
                  <div>
                    <p><strong>Participants ({selectedHackathon.participants.length}):</strong></p>
                    <ul className="list-group list-group-flush">
                      {selectedHackathon.participants.map(participant => (
                        <li key={participant._id} className="list-group-item d-flex align-items-center">
                          <i className="bi bi-person-circle me-2"></i> {participant.name} ({participant.email})
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {selectedHackathon.projects && selectedHackathon.projects.length > 0 && (
                  <div className="mt-3">
                    <p><strong>Projets soumis ({selectedHackathon.projects.length}):</strong></p>
                    <ul className="list-group list-group-flush">
                      {selectedHackathon.projects.map(project => (
                        <li key={project._id} className="list-group-item d-flex align-items-center">
                          <i className="bi bi-folder-fill me-2"></i> {project.title} (par {project.student.name})
                          {project.repoUrl && <a href={project.repoUrl} target="_blank" rel="noopener noreferrer" className="ms-2 badge bg-primary text-decoration-none">Dépôt</a>}
                        </li>
                      ))}
                    </ul>
                  </div>
                )}
                {/* Afficher les équipes constituées */}
                {selectedHackathon.teams && selectedHackathon.teams.length > 0 && (
                  <div className="mt-4 pt-3 border-top">
                    <h4 className="mb-3"><i className="bi bi-people-fill me-2"></i> Équipes Constituées</h4>
                    {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
                    <ul className="list-group">
                      {selectedHackathon.teams.map(team => (
                        <li key={team._id} className="list-group-item d-flex justify-content-between align-items-center flex-wrap">
                          <div>
                            <strong>{team.name}</strong> ({team.members.length} membres)
                            <ul className="list-unstyled ms-3 mt-1 small">
                              {team.members.map(member => (
                                <li key={member._id} className="d-flex align-items-center">
                                  <i className="bi bi-person-fill me-1"></i> {member.name} ({member.email})
                                  {team.members.length > 3 && (
                                    <button 
                                      className="btn btn-link btn-sm text-danger p-0 ms-2"
                                      onClick={() => handleRemoveMember(team._id, member._id)}
                                      title="Retirer le membre"
                                    >
                                      <i className="bi bi-x-circle"></i>
                                    </button>
                                  )}
                                </li>
                              ))}
                            </ul>
                          </div>
                          <button 
                            className="btn btn-sm btn-outline-danger mt-2 mt-md-0"
                            onClick={() => handleDeleteTeam(team._id)}
                            title="Supprimer l\'équipe"
                          >
                            <i className="bi bi-trash"></i> Supprimer l\'équipe
                          </button>
                        </li>
                      ))}
                    </ul>
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
      {showHackathonModal && <div className="modal-backdrop fade show"></div>}

      {/* Modale de création de Hackathon (pour staff/admin) */}
      {showCreateHackathonModal && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-primary text-white">
                <h5 className="modal-title">Créer un nouveau Hackathon</h5>
                <button type="button" className="btn-close" onClick={() => setShowCreateHackathonModal(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleCreateHackathon}>
                  <div className="mb-3">
                    <label htmlFor="newHackathonTitle" className="form-label">Titre du Hackathon</label>
                    <input
                      type="text"
                      className="form-control"
                      id="newHackathonTitle"
                      value={newHackathonTitle}
                      onChange={(e) => setNewHackathonTitle(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newHackathonDescription" className="form-label">Description</label>
                    <textarea
                      className="form-control"
                      id="newHackathonDescription"
                      rows="3"
                      value={newHackathonDescription}
                      onChange={(e) => setNewHackathonDescription(e.target.value)}
                      required
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newHackathonStartDate" className="form-label">Date de début</label>
                    <input
                      type="date"
                      className="form-control"
                      id="newHackathonStartDate"
                      value={newHackathonStartDate}
                      onChange={(e) => setNewHackathonStartDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newHackathonEndDate" className="form-label">Date de fin</label>
                    <input
                      type="date"
                      className="form-control"
                      id="newHackathonEndDate"
                      value={newHackathonEndDate}
                      onChange={(e) => setNewHackathonEndDate(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newHackathonSpecifications" className="form-label">Spécifications (Optionnel)</label>
                    <textarea
                      className="form-control"
                      id="newHackathonSpecifications"
                      rows="3"
                      value={newHackathonSpecifications}
                      onChange={(e) => setNewHackathonSpecifications(e.target.value)}
                    ></textarea>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newHackathonTeamSize" className="form-label">Taille d'équipe (1 à 5)</label>
                    <input
                      type="number"
                      className="form-control"
                      id="newHackathonTeamSize"
                      value={newHackathonTeamSize}
                      onChange={(e) => setNewHackathonTeamSize(Math.max(1, Math.min(5, parseInt(e.target.value, 10))))}
                      min="1"
                      max="5"
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary me-2">Créer le Hackathon</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowCreateHackathonModal(false)}>Annuler</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {showCreateHackathonModal && <div className="modal-backdrop fade show"></div>}

      {/* Modale de constitution des équipes (pour staff/admin) */}
      {showConstituteTeamsModal && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog modal-lg">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-success text-white">
                <h5 className="modal-title">Constituer les Équipes pour {selectedHackathonForTeams?.title || ''}</h5>
                <button type="button" className="btn-close" onClick={() => setShowConstituteTeamsModal(false)}></button>
              </div>
              <div className="modal-body">
                <form onSubmit={handleConstituteTeams}>
                  <div className="mb-3">
                    <label htmlFor="constituteHackathon" className="form-label">Hackathon à constituer</label>
                    <select
                      className="form-select"
                      id="constituteHackathon"
                      value={selectedHackathonForTeams?._id || ''}
                      onChange={(e) => {
                        const hackathon = list.find(h => h._id === e.target.value);
                        setSelectedHackathonForTeams(hackathon);
                        setCurrentTeams([]); // Réinitialiser les équipes pour le nouveau hackathon
                      }}
                      required
                    >
                      <option value="">Sélectionnez un hackathon</option>
                      {list.filter(h => h.status === 'active' && h.teamSize > 0).map(h => (
                        <option key={h._id} value={h._id}>{h.title} (Taille: {h.teamSize})</option>
                      ))}
                    </select>
                  </div>
                  {selectedHackathonForTeams && (
                    <div className="mb-3">
                      <label htmlFor="teamName" className="form-label">Nom de l'équipe</label>
                      <input
                        type="text"
                        className="form-control"
                        id="teamName"
                        value={currentTeams.length > 0 ? currentTeams[0].name : ''} // Afficher le nom de l'équipe si déjà ajouté
                        onChange={(e) => {
                          if (currentTeams.length === 0) {
                            setCurrentTeams([{ name: e.target.value, members: [] }]);
                          } else {
                            setCurrentTeams(prev => [{ ...prev[0], name: e.target.value }]);
                          }
                        }}
                        required
                      />
                    </div>
                  )}
                  {selectedHackathonForTeams && (
                    <div className="mb-3">
                      <label htmlFor="teamMembers" className="form-label">Membres (3 à 5 apprenants)</label>
                      <select
                        multiple
                        className="form-select"
                        id="teamMembers"
                        value={currentTeams.length > 0 ? currentTeams[0].members : []}
                        onChange={(e) => {
                          const selectedMemberIds = Array.from(e.target.options).filter(option => option.selected).map(option => option.value);
                          setCurrentTeams(prev => [{ ...prev[0], members: selectedMemberIds }]);
                        }}
                        required
                      >
                        {availableLearnersForTeams.filter(learner => 
                          // Filtrer les apprenants qui ne sont pas déjà dans une équipe pour ce hackathon
                          !currentTeams.some(team => team.members.some(member => member._id === learner._id))
                        ).map(learner => (
                          <option key={learner._id} value={learner._id}>{learner.name} ({learner.email})</option>
                        ))}
                      </select>
                      <small className="form-text text-muted">Sélectionnez 3 à 5 apprenants.</small>
                    </div>
                  )}
                  <button type="submit" className="btn btn-primary me-2">Constituer les Équipes</button>
                  <button type="button" className="btn btn-secondary" onClick={() => setShowConstituteTeamsModal(false)}>Annuler</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {showConstituteTeamsModal && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}
