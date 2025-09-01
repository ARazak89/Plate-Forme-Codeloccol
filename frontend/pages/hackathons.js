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
  const [showCreateTeamModal, setShowCreateTeamModal] = useState(false); // État pour la modale de création d'équipe
  const [teamName, setTeamName] = useState(''); // État pour le nom de la nouvelle équipe
  const [selectedMembers, setSelectedMembers] = useState([]); // Membres sélectionnés pour la nouvelle équipe
  const [currentHackathonTeams, setCurrentHackathonTeams] = useState([]); // Équipes du hackathon sélectionné
  const [showCreateHackathonModal, setShowCreateHackathonModal] = useState(false); // Nouvel état pour la modale de création de hackathon
  const [newHackathonTitle, setNewHackathonTitle] = useState('');
  const [newHackathonDescription, setNewHackathonDescription] = useState('');
  const [newHackathonStartDate, setNewHackathonStartDate] = useState('');
  const [newHackathonEndDate, setNewHackathonEndDate] = useState('');
  const [newHackathonGithubRepoUrl, setNewHackathonGithubRepoUrl] = useState('');
  const router = useRouter();
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const loadHackathons = async () => {
    if (!token) {
      router.push('/login');
      return;
    }
    try {
      const r = await fetch(`${API}/hackathons`, { headers: { Authorization: `Bearer ${token}` } });
      if (!r.ok) throw new Error('Failed to fetch hackathons');
      setList(await r.json());
    } catch (e) {
      setError(e.message);
    }
  };

  const loadHackathonTeams = async (hackathonId) => {
    if (!token || !hackathonId) return;
    try {
      const r = await fetch(`${API}/teams/hackathon/${hackathonId}`, { headers: { Authorization: `Bearer ${token}` } });
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
    setTeamName('');
    setSelectedMembers([]);
    setCurrentHackathonTeams([]);
  };

  const handleMemberSelection = (e) => {
    const options = Array.from(e.target.options);
    const values = options.filter(option => option.selected).map(option => option.value);
    setSelectedMembers(values);
  };

  const handleCreateTeam = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      if (selectedMembers.length < 3 || selectedMembers.length > 5) {
        throw new Error('Une équipe doit avoir entre 3 et 5 membres.');
      }
      const r = await fetch(`${API}/teams`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Authorization: `Bearer ${token}`,
        },
        body: JSON.stringify({ name: teamName, members: selectedMembers, hackathonId: selectedHackathon._id }),
      });
      if (!r.ok) {
        const errorData = await r.json();
        throw new Error(errorData.message || 'Failed to create team');
      }
      alert('Équipe créée avec succès !');
      setShowCreateTeamModal(false);
      setTeamName('');
      setSelectedMembers([]);
      loadHackathonTeams(selectedHackathon._id); // Recharger les équipes du hackathon
    } catch (e) {
      setError(e.message);
    }
  };

  const handleDeleteTeam = async (teamId) => {
    if (!confirm('Êtes-vous sûr de vouloir supprimer cette équipe ?')) return;
    setError(null);
    try {
      const r = await fetch(`${API}/teams/${teamId}`, {
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
      const r = await fetch(`${API}/teams/${teamId}/add-member`, {
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
      const r = await fetch(`${API}/teams/${teamId}/remove-member`, {
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

  const handleCreateHackathon = async (e) => {
    e.preventDefault();
    setError(null);
    try {
      const r = await fetch(`${API}/hackathons`, {
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
          githubRepoUrl: newHackathonGithubRepoUrl,
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
      setNewHackathonGithubRepoUrl('');
      loadHackathons(); // Recharger la liste des hackathons
    } catch (e) {
      setError(e.message);
    }
  };

  useEffect(() => {
    if (token) {
      loadHackathons();
      const loadUserData = async () => {
        try {
          const userRes = await fetch(`${API}/users/me`, { headers: { Authorization: `Bearer ${token}` } });
          if (!userRes.ok) throw new Error('Failed to fetch user data');
          const userData = await userRes.json();
          setMe(userData);

          if (userData.role === 'staff' || userData.role === 'admin') {
            const learnersRes = await fetch(`${API}/users?role=apprenant`, { headers: { Authorization: `Bearer ${token}` } });
            if (!learnersRes.ok) throw new Error('Failed to fetch learners');
            setLearners(await learnersRes.json());
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
  }, [token]);

  if (!token) return null; // La redirection est gérée par useEffect

  return (
    <div>
      <h1 className="mb-4">Hackathons</h1>

      {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}

      {me && (me.role === 'staff' || me.role === 'admin') && (
        <div className="d-flex justify-content-end mb-3">
          <button className="btn btn-primary" onClick={() => setShowCreateHackathonModal(true)}>
            <i className="bi bi-plus-circle me-2"></i> Créer un nouveau Hackathon
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
                {selectedHackathon.githubRepoUrl && (
                  <p><strong>Dépôt GitHub:</strong> <a href={selectedHackathon.githubRepoUrl} target="_blank" rel="noopener noreferrer" className="text-primary text-decoration-none">{selectedHackathon.githubRepoUrl}</a></p>
                )}
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

                {/* Section de gestion des équipes (pour staff/admin) */}
                {me && (me.role === 'staff' || me.role === 'admin') && selectedHackathon && (
                  <div className="mt-4 pt-3 border-top">
                    <h4 className="mb-3"><i className="bi bi-people-fill me-2"></i> Gestion des Équipes</h4>
                    {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
                    
                    {/* Liste des équipes existantes */}
                    {currentHackathonTeams.length > 0 && (
                      <div className="mb-4">
                        <h5>Équipes Existantes:</h5>
                        <ul className="list-group">
                          {currentHackathonTeams.map(team => (
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
                                title="Supprimer l'équipe"
                              >
                                <i className="bi bi-trash"></i> Supprimer l'équipe
                              </button>
                            </li>
                          ))}
                        </ul>
                      </div>
                    )}

                    {/* Formulaire de création d'équipe */}
                    <button className="btn btn-success mb-3" onClick={() => setShowCreateTeamModal(true)}>
                      <i className="bi bi-plus-circle me-1"></i> Créer une nouvelle équipe
                    </button>

                    {showCreateTeamModal && (
                      <div className="card card-body bg-light mb-3">
                        <h5>Nouvelle Équipe pour {selectedHackathon.title}</h5>
                        <form onSubmit={handleCreateTeam}>
                          <div className="mb-3">
                            <label htmlFor="teamName" className="form-label">Nom de l'équipe</label>
                            <input 
                              type="text" 
                              className="form-control" 
                              id="teamName" 
                              value={teamName} 
                              onChange={(e) => setTeamName(e.target.value)} 
                              required 
                            />
                          </div>
                          <div className="mb-3">
                            <label htmlFor="teamMembers" className="form-label">Membres (3 à 5 apprenants)</label>
                            <select 
                              multiple 
                              className="form-select" 
                              id="teamMembers" 
                              value={selectedMembers} 
                              onChange={handleMemberSelection}
                              required
                            >
                              {learners.filter(learner => 
                                // Filtrer les apprenants qui ne sont pas déjà dans une équipe pour ce hackathon
                                !currentHackathonTeams.some(team => team.members.some(member => member._id === learner._id))
                              ).map(learner => (
                                <option key={learner._id} value={learner._id}>{learner.name} ({learner.email})</option>
                              ))}
                            </select>
                            <small className="form-text text-muted">Sélectionnez 3 à 5 apprenants.</small>
                          </div>
                          <button type="submit" className="btn btn-primary me-2">Créer l'équipe</button>
                          <button type="button" className="btn btn-secondary" onClick={() => setShowCreateTeamModal(false)}>Annuler</button>
                        </form>
                      </div>
                    )}
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
                    <label htmlFor="newHackathonGithubRepoUrl" className="form-label">URL du Dépôt GitHub (Optionnel)</label>
                    <input
                      type="url"
                      className="form-control"
                      id="newHackathonGithubRepoUrl"
                      value={newHackathonGithubRepoUrl}
                      onChange={(e) => setNewHackathonGithubRepoUrl(e.target.value)}
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
    </div>
  );
}
