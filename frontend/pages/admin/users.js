import { useEffect, useState, useCallback } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken } from '../../utils/auth';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

function AdminUsersPage() {
  const [users, setUsers] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState(null);
  const [me, setMe] = useState(null); // Pour stocker les infos de l'utilisateur (rôle)

  // États pour les modales CRUD
  const [showAddUserModal, setShowAddUserModal] = useState(false);
  const [showEditUserModal, setShowEditUserModal] = useState(false);
  const [showDeleteUserModal, setShowDeleteUserModal] = useState(false);
  const [showToggleStatusModal, setShowToggleStatusModal] = useState(false);

  // États pour le formulaire d'ajout/édition
  const [currentUser, setCurrentUser] = useState(null); // Utilisateur actuellement sélectionné pour modification/suppression/statut
  const [userName, setUserName] = useState('');
  const [userEmail, setUserEmail] = useState('');
  const [userPassword, setUserPassword] = useState('');
  const [userRole, setUserRole] = useState('apprenant');
  const [userLevel, setUserLevel] = useState(1);
  const [userStatus, setUserStatus] = useState('active');
  const [confirmUserName, setConfirmUserName] = useState(''); // Pour la confirmation de suppression

  const router = useRouter();

  const fetchUsers = useCallback(async (token) => {
    try {
      setLoading(true);
      setError(null);

      const userRes = await fetch(`${API}/api/users/me`, { headers: { Authorization: `Bearer ${token}` } });
      if (!userRes.ok) {
        const errorData = await userRes.json();
        throw new Error(errorData.error || 'Échec du chargement des données utilisateur.');
      }
      const userData = await userRes.json();
      setMe(userData);

      if (userData.role !== 'staff' && userData.role !== 'admin') {
        router.push('/'); // Rediriger si non autorisé
        return;
      }

      const usersRes = await fetch(`${API}/api/users`, { headers: { Authorization: `Bearer ${token}` } });
      if (!usersRes.ok) {
        const errorData = await usersRes.json();
        throw new Error(errorData.error || 'Échec du chargement des utilisateurs.');
      }
      const usersData = await usersRes.json();
      setUsers(usersData);
    } catch (e) {
      setError('Erreur lors du chargement des utilisateurs: ' + e.message);
      console.error(e);
    } finally {
      setLoading(false);
    }
  }, [API, router]);

  useEffect(() => {
    const token = getAuthToken();
    if (!token) {
      router.push('/login');
      return;
    }
    fetchUsers(token);
  }, [router, fetchUsers]);

  // Fonctions de gestion des modales
  const handleShowAddUserModal = () => {
    setUserName('');
    setUserEmail('');
    setUserPassword('');
    setUserRole('apprenant');
    setUserLevel(1);
    setUserStatus('active');
    setCurrentUser(null);
    setError(null);
    setShowAddUserModal(true);
  };

  const handleCloseAddUserModal = () => {
    setShowAddUserModal(false);
    setError(null);
  };

  const handleShowEditUserModal = (user) => {
    setCurrentUser(user);
    setUserName(user.name);
    setUserEmail(user.email);
    setUserRole(user.role);
    setUserLevel(user.level || 1);
    setUserStatus(user.status || 'active');
    setUserPassword(''); // Laisser vide pour ne pas modifier si non renseigné
    setError(null);
    setShowEditUserModal(true);
  };

  const handleCloseEditUserModal = () => {
    setShowEditUserModal(false);
    setError(null);
    setCurrentUser(null);
  };

  const handleShowDeleteUserModal = (user) => {
    setCurrentUser(user);
    setConfirmUserName('');
    setError(null);
    setShowDeleteUserModal(true);
  };

  const handleCloseDeleteUserModal = () => {
    setShowDeleteUserModal(false);
    setCurrentUser(null);
    setError(null);
  };

  const handleShowToggleStatusModal = (user) => {
    setCurrentUser(user);
    setUserStatus(user.status);
    setError(null);
    setShowToggleStatusModal(true);
  };

  const handleCloseToggleStatusModal = () => {
    setShowToggleStatusModal(false);
    setCurrentUser(null);
    setError(null);
  };

  // Fonctions CRUD
  const handleCreateUser = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API}/api/users`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ name: userName, email: userEmail, password: userPassword, role: userRole, level: userLevel, status: userStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Utilisateur créé avec succès !');
        handleCloseAddUserModal();
        fetchUsers(token);
      } else {
        throw new Error(data.error || "Échec de la création de l'utilisateur.");
      }
    } catch (e) {
      console.error('Error creating user:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleUpdateUser = async (e) => {
    e.preventDefault();
    setError(null);
    setLoading(true);
    try {
      const token = getAuthToken();
      const body = { name: userName, email: userEmail, role: userRole, level: userLevel, status: userStatus };
      if (userPassword) { // N'envoyer le mot de passe que s'il est renseigné
        body.password = userPassword;
      }
      const res = await fetch(`${API}/api/users/${currentUser._id}`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify(body),
      });
      const data = await res.json();
      if (res.ok) {
        alert('Utilisateur mis à jour avec succès !');
        handleCloseEditUserModal();
        fetchUsers(token);
      } else {
        throw new Error(data.error || "Échec de la mise à jour de l'utilisateur.");
      }
    } catch (e) {
      console.error('Error updating user:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleDeleteUser = async () => {
    setError(null);
    setLoading(true);
    if (confirmUserName !== currentUser.name) {
      setError('Le nom de confirmation ne correspond pas.');
      setLoading(false);
      return;
    }
    try {
      const token = getAuthToken();
      const res = await fetch(`${API}/api/users/${currentUser._id}`, {
        method: 'DELETE',
        headers: { Authorization: `Bearer ${token}` },
      });
      if (res.ok) {
        alert('Utilisateur supprimé avec succès !');
        handleCloseDeleteUserModal();
        fetchUsers(token);
      } else {
        const errorData = await res.json();
        throw new Error(errorData.error || 'Échec de la suppression de l'utilisateur.');
      }
    } catch (e) {
      console.error('Error deleting user:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  const handleToggleUserStatus = async (newStatus) => {
    setError(null);
    setLoading(true);
    try {
      const token = getAuthToken();
      const res = await fetch(`${API}/api/users/${currentUser._id}/status`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ status: newStatus }),
      });
      const data = await res.json();
      if (res.ok) {
        alert(`Statut de l'utilisateur mis à jour à '${newStatus}' avec succès !`);
        handleCloseToggleStatusModal();
        fetchUsers(token);
      } else {
        throw new Error(data.error || 'Échec de la mise à jour du statut.');
      }
    } catch (e) {
      console.error('Error toggling user status:', e);
      setError(e.message);
    } finally {
      setLoading(false);
    }
  };

  if (loading && !me) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Chargement...</span>
      </div>
      <p className="ms-2">Chargement des données...</p>
    </div>
  );

  if (error) return <div className="alert alert-danger text-center mt-5">Error: {error}</div>;

  if (me && me.role !== 'staff' && me.role !== 'admin') {
    return <div className="alert alert-danger text-center mt-5">Accès non autorisé.</div>;
  }

  return (
    <div className="container-fluid mt-4 pt-5 px-4">
      <h1 className="mb-4">Gestion des Utilisateurs</h1>
      <div className="d-flex justify-content-end mb-3">
        <button className="btn btn-primary" onClick={handleShowAddUserModal}>
          <i className="bi bi-person-plus me-2"></i> Ajouter un Utilisateur
        </button>
      </div>

      {users.length === 0 ? (
        <div className="alert alert-info text-center">
          <i className="bi bi-info-circle me-2"></i> Aucun utilisateur trouvé.
        </div>
      ) : (
        <div className="table-responsive">
          <table className="table table-striped table-hover align-middle">
            <thead>
              <tr>
                <th>Nom</th>
                <th>Email</th>
                <th>Rôle</th>
                <th>Niveau</th>
                <th>Statut</th>
                <th>Dernier Projet Assigné</th>
                <th>Actions</th>
              </tr>
            </thead>
            <tbody>
              {users.map((user) => (
                <tr key={user._id}>
                  <td>{user.name}</td>
                  <td>{user.email}</td>
                  <td><span className="badge bg-secondary">{user.role}</span></td>
                  <td>{user.level || 'N/A'}</td>
                  <td>
                    <span className={`badge bg-${user.status === 'active' ? 'success' : user.status === 'inactive' ? 'warning text-dark' : 'danger'}`}>
                      {user.status === 'active' ? 'Actif' : user.status === 'inactive' ? 'Inactif' : 'Bloqué'}
                    </span>
                  </td>
                  <td>
                    {user.assignedProject ? (
                      <>
                        <strong>{user.assignedProject.title}</strong> (Ordre: {user.assignedProject.order})<br />
                        <span className={`badge bg-${
                          user.assignedProject.status === 'assigned' ? 'warning text-dark' :
                          user.assignedProject.status === 'submitted' ? 'info' :
                          user.assignedProject.status === 'awaiting_staff_review' ? 'primary' :
                          user.assignedProject.status === 'approved' ? 'success' :
                          user.assignedProject.status === 'rejected' ? 'danger' :
                          'secondary'
                        } mt-1`}>
                          {user.assignedProject.status === 'assigned' ? 'Assigné' :
                           user.assignedProject.status === 'submitted' ? 'Soumis' :
                           user.assignedProject.status === 'awaiting_staff_review' ? 'En attente staff' :
                           user.assignedProject.status === 'approved' ? 'Approuvé' :
                           user.assignedProject.status === 'rejected' ? 'Rejeté' :
                           'Inconnu'}
                        </span>
                        {user.assignedProject.repoUrl && (
                          <div className="mt-1">
                            <a href={user.assignedProject.repoUrl} target="_blank" rel="noopener noreferrer" className="btn btn-link btn-sm p-0 text-decoration-none">
                              <i className="bi bi-github me-1"></i> Dépôt
                            </a>
                          </div>
                        )}
                      </>
                    ) : (
                      'Aucun projet assigné'
                    )}
                  </td>
                  <td>
                    <button className="btn btn-sm btn-outline-info me-2" onClick={() => handleShowEditUserModal(user)} title="Modifier Utilisateur">
                      <i className="bi bi-pencil-square"></i>
                    </button>
                    <button className="btn btn-sm btn-outline-warning text-dark me-2" onClick={() => handleShowToggleStatusModal(user)} title="Changer Statut">
                      <i className={`bi bi-${user.status === 'active' ? 'person-x' : 'person-check'}`}></i>
                    </button>
                    <button className="btn btn-sm btn-outline-danger" onClick={() => handleShowDeleteUserModal(user)} title="Supprimer Utilisateur">
                      <i className="bi bi-trash"></i>
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}

      {/* Modale d'ajout/édition d'utilisateur */}
      {(showAddUserModal || showEditUserModal) && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-primary text-white">
                <h5 className="modal-title">{currentUser ? 'Modifier Utilisateur' : 'Ajouter un Utilisateur'}</h5>
                <button type="button" className="btn-close" onClick={currentUser ? handleCloseEditUserModal : handleCloseAddUserModal}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger mb-3">{error}</div>}
                <form onSubmit={currentUser ? handleUpdateUser : handleCreateUser}>
                  <div className="mb-3">
                    <label htmlFor="userName" className="form-label">Nom</label>
                    <input type="text" className="form-control" id="userName" value={userName} onChange={(e) => setUserName(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="userEmail" className="form-label">Email</label>
                    <input type="email" className="form-control" id="userEmail" value={userEmail} onChange={(e) => setUserEmail(e.target.value)} required />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="userPassword" className="form-label">Mot de passe {currentUser ? '(Laisser vide pour ne pas modifier)' : ''}</label>
                    <input type="password" className="form-control" id="userPassword" value={userPassword} onChange={(e) => setUserPassword(e.target.value)} { ...(!currentUser && { required: true }) } />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="userRole" className="form-label">Rôle</label>
                    <select className="form-select" id="userRole" value={userRole} onChange={(e) => setUserRole(e.target.value)}>
                      <option value="apprenant">Apprenant</option>
                      <option value="staff">Staff</option>
                      <option value="admin">Admin</option>
                      <option value="evaluator">Évaluateur</option>
                    </select>
                  </div>
                  <div className="mb-3">
                    <label htmlFor="userLevel" className="form-label">Niveau</label>
                    <input type="number" className="form-control" id="userLevel" value={userLevel} onChange={(e) => setUserLevel(parseInt(e.target.value))} min="1" />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="userStatus" className="form-label">Statut</label>
                    <select className="form-select" id="userStatus" value={userStatus} onChange={(e) => setUserStatus(e.target.value)}>
                      <option value="active">Actif</option>
                      <option value="inactive">Inactif</option>
                      <option value="blocked">Bloqué</option>
                    </select>
                  </div>
                  <button type="submit" className="btn btn-primary" disabled={loading}>
                    {loading ? (
                      <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                    ) : (
                      <i className="bi bi-save me-2"></i>
                    )}
                    {currentUser ? 'Modifier' : 'Ajouter'}
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {(showAddUserModal || showEditUserModal) && <div className="modal-backdrop fade show"></div>}

      {/* Modale de suppression d'utilisateur */}
      {showDeleteUserModal && currentUser && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-danger text-white">
                <h5 className="modal-title">Confirmer la Suppression</h5>
                <button type="button" className="btn-close" onClick={handleCloseDeleteUserModal}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger mb-3">{error}</div>}
                <p>Êtes-vous sûr de vouloir supprimer l'utilisateur "<strong>{currentUser.name}</strong>" ({currentUser.email}) ? Cette action est irréversible et supprimera également toutes les données associées (projets, évaluations, etc.).</p>
                <p>Veuillez taper le nom de l'utilisateur (exactement) pour confirmer :</p>
                <input type="text" className="form-control" value={confirmUserName} onChange={(e) => setConfirmUserName(e.target.value)} placeholder={currentUser.name} />
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseDeleteUserModal}>Annuler</button>
                <button type="button" className="btn btn-danger" onClick={handleDeleteUser} disabled={loading || confirmUserName !== currentUser.name}>
                  {loading ? (
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  ) : (
                    <i className="bi bi-trash me-2"></i>
                  )}
                  Supprimer
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showDeleteUserModal && <div className="modal-backdrop fade show"></div>}

      {/* Modale de changement de statut */}
      {showToggleStatusModal && currentUser && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-warning text-dark">
                <h5 className="modal-title">Changer le Statut de l'Utilisateur</h5>
                <button type="button" className="btn-close" onClick={handleCloseToggleStatusModal}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger mb-3">{error}</div>}
                <p>Modifier le statut de l'utilisateur "<strong>{currentUser.name}</strong>" (actuel: <span className="fw-bold">{currentUser.status}</span>) :</p>
                <select className="form-select" value={userStatus} onChange={(e) => setUserStatus(e.target.value)}>
                  <option value="active">Actif</option>
                  <option value="inactive">Inactif</option>
                  <option value="blocked">Bloqué</option>
                </select>
              </div>
              <div className="modal-footer">
                <button type="button" className="btn btn-secondary" onClick={handleCloseToggleStatusModal}>Annuler</button>
                <button type="button" className="btn btn-warning text-dark" onClick={() => handleToggleUserStatus(userStatus)} disabled={loading || userStatus === currentUser.status}>
                  {loading ? (
                    <span className="spinner-border spinner-border-sm me-2" role="status" aria-hidden="true"></span>
                  ) : (
                    <i className="bi bi-arrow-repeat me-2"></i>
                  )}
                  Mettre à jour le statut
                </button>
              </div>
            </div>
          </div>
        </div>
      )}
      {showToggleStatusModal && <div className="modal-backdrop fade show"></div>}

    </div>
  );
}

export default AdminUsersPage;
