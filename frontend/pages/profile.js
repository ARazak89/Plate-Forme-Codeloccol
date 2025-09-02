import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import { getAuthToken } from '../utils/auth'; // Importer la fonction getAuthToken

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';
const STATIC_ASSETS_BASE_URL = API.replace('/api', '');

export default function Profile() {
  const [user, setUser] = useState(null);
  const [oldPassword, setOldPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [confirmNewPassword, setConfirmNewPassword] = useState('');
  const [selectedFile, setSelectedFile] = useState(null); // Pour le fichier de la photo de profil
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [showPasswordModal, setShowPasswordModal] = useState(false); // État pour la modale du mot de passe
  const [showProfilePictureModal, setShowProfilePictureModal] = useState(false); // État pour la modale de la photo
  const router = useRouter();
  const token = getAuthToken(); // Utiliser la fonction d'aide

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    const fetchUserProfile = async () => {
      try {
        const res = await fetch(`${API}/api/users/me`, {
          headers: { Authorization: `Bearer ${token}` },
        });
        if (!res.ok) throw new Error('Failed to fetch user profile.');
        const data = await res.json();
        setUser(data);
      } catch (e) {
        console.error('Error fetching user profile:', e);
        setError(e.message);
      }
    };
    fetchUserProfile();
  }, [token]);

  const handleChangePassword = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (newPassword !== confirmNewPassword) {
      setError('Les nouveaux mots de passe ne correspondent pas.');
      return;
    }
    if (newPassword.length < 6) {
      setError('Le nouveau mot de passe doit contenir au moins 6 caractères.');
      return;
    }

    try {
      const res = await fetch(`${API}/api/users/me/password`, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ oldPassword, newPassword }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Mot de passe mis à jour avec succès !');
        setOldPassword('');
        setNewPassword('');
        setConfirmNewPassword('');
        setShowPasswordModal(false); // Fermer la modale
      } else {
        throw new Error(data.message || 'Échec de la mise à jour du mot de passe.');
      }
    } catch (e) {
      setError(e.message);
    }
  };

  const handleFileChange = (e) => {
    setSelectedFile(e.target.files[0]);
  };

  const handleUpdateProfilePicture = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!selectedFile) {
      setError('Veuillez sélectionner un fichier image.');
      return;
    }

    const formData = new FormData();
    formData.append('profilePicture', selectedFile); // 'profilePicture' doit correspondre au nom du champ dans Multer

    try {
      const res = await fetch(`${API}/api/users/me/profile-picture`, {
        method: 'PUT',
        headers: { Authorization: `Bearer ${token}` }, // Pas de Content-Type ici, FormData le gère
        body: formData,
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Photo de profil mise à jour avec succès !');
        setUser(prevUser => ({ ...prevUser, profilePicture: data.profilePicture })); // Mettre à jour localement
        setSelectedFile(null); // Réinitialiser le fichier sélectionné
        setShowProfilePictureModal(false); // Fermer la modale
      } else {
        throw new Error(data.message || 'Échec de la mise à jour de la photo de profil.');
      }
    } catch (e) {
      console.error('Error updating profile picture:', e);
      setError(e.message);
    }
  };

  if (!user) return (
    <div className="d-flex justify-content-center align-items-center vh-100">
      <div className="spinner-border text-primary" role="status">
        <span className="visually-hidden">Chargement...</span>
      </div>
      <p className="ms-2">Chargement du profil...</p>
    </div>
  );

  return (
    <div className="container-fluid mt-4 pt-5 px-4">
      <h1 className="mb-4">Mon Profil</h1>

      {success && <div className="alert alert-success mt-3" role="alert">{success}</div>}
      {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}

      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-gradient bg-primary text-white d-flex align-items-center">
          <i className="bi bi-person-circle me-2"></i>
          <h2 className="h5 mb-0">Informations Générales</h2>
        </div>
        <div className="card-body">
          <div className="row align-items-center mb-4">
            <div className="col-md-auto text-center mb-3 mb-md-0">
              <img
                src={user.profilePicture ? `${STATIC_ASSETS_BASE_URL}${user.profilePicture}` : '/default-avatar.jpg'}
                alt="Photo de profil"
                className="rounded-circle border border-4 border-primary shadow-sm"
                style={{ width: '120px', height: '120px', objectFit: 'cover' }}
              />
            </div>
            <div className="col-md">
              <h4 className="mb-1 text-primary">{user.name}</h4>
              <p className="text-muted mb-0">{user.email}</p>
            </div>
          </div>

          <div className="row">
            <div className="col-md-6 mb-3">
              <p className="d-flex align-items-center mb-1"><strong className="me-2"><i className="bi bi-briefcase me-2 text-primary"></i>Rôle:</strong> <span className="badge bg-primary">{user.role}</span></p>
              <p className="d-flex align-items-center mb-1"><strong className="me-2"><i className="bi bi-activity me-2 text-success"></i>Statut:</strong> <span className="badge bg-success">{user.status}</span></p>
              {user.role === 'apprenant' && (
                <p className="d-flex align-items-center mb-1"><strong className="me-2"><i className="bi bi-hourglass-split me-2 text-warning"></i>Jours Restants:</strong> {user.daysRemaining}</p>
              )}
            </div>
            <div className="col-md-6 mb-3">
              {user.role === 'apprenant' && (
                <p className="d-flex align-items-center mb-1"><strong className="me-2"><i className="bi bi-graph-up me-2 text-info"></i>Niveau:</strong> {user.level}</p>
              )}
              <p className="d-flex align-items-center mb-1"><strong className="me-2"><i className="bi bi-clock me-2 text-muted"></i>Dernière Connexion:</strong> {new Date(user.lastLogin).toLocaleDateString()}</p>
              {user.role === 'apprenant' && (
                <p className="d-flex align-items-center mb-1"><strong className="me-2"><i className="bi bi-check-circle me-2 text-success"></i>Projets Complétés:</strong> {user.totalProjectsCompleted}</p>
              )}
            </div>
          </div>

          <div className="d-flex flex-wrap justify-content-center mt-4 gap-3">
            <button className="btn btn-outline-primary d-flex align-items-center" onClick={() => setShowProfilePictureModal(true)}>
              <i className="bi bi-image me-2"></i> Changer la photo
            </button>
            <button className="btn btn-outline-primary d-flex align-items-center" onClick={() => setShowPasswordModal(true)}>
              <i className="bi bi-key me-2"></i> Changer le mot de passe
            </button>
          </div>
        </div>
      </div>

      {/* Modale pour changer la photo de profil */}
      {showProfilePictureModal && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-primary text-white">
                <h5 className="modal-title">Changer la Photo de Profil</h5>
                <button type="button" className="btn-close" onClick={() => setShowProfilePictureModal(false)}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger mb-3" role="alert">{error}</div>}
                {success && <div className="alert alert-success mb-3" role="alert">{success}</div>}
                <form onSubmit={handleUpdateProfilePicture}>
                  <div className="mb-3">
                    <label htmlFor="profilePictureFile" className="form-label">Sélectionner une nouvelle photo</label>
                    <input
                      type="file"
                      className="form-control"
                      id="profilePictureFile"
                      accept="image/*"
                      onChange={handleFileChange}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary d-flex align-items-center">
                    <i className="bi bi-upload me-2"></i> Mettre à jour la photo
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}

      {/* Modale pour changer le mot de passe */}
      {showPasswordModal && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-gradient bg-primary text-white">
                <h5 className="modal-title">Changer le Mot de Passe</h5>
                <button type="button" className="btn-close" onClick={() => setShowPasswordModal(false)}></button>
              </div>
              <div className="modal-body">
                {error && <div className="alert alert-danger mb-3" role="alert">{error}</div>}
                {success && <div className="alert alert-success mb-3" role="alert">{success}</div>}
                <form onSubmit={handleChangePassword}>
                  <div className="mb-3">
                    <label htmlFor="oldPassword" className="form-label">Ancien Mot de Passe</label>
                    <input
                      type="password"
                      className="form-control"
                      id="oldPassword"
                      value={oldPassword}
                      onChange={(e) => setOldPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="newPassword" className="form-label">Nouveau Mot de Passe</label>
                    <input
                      type="password"
                      className="form-control"
                      id="newPassword"
                      value={newPassword}
                      onChange={(e) => setNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <div className="mb-3">
                    <label htmlFor="confirmNewPassword" className="form-label">Confirmer Nouveau Mot de Passe</label>
                    <input
                      type="password"
                      className="form-control"
                      id="confirmNewPassword"
                      value={confirmNewPassword}
                      onChange={(e) => setConfirmNewPassword(e.target.value)}
                      required
                    />
                  </div>
                  <button type="submit" className="btn btn-primary d-flex align-items-center">
                    <i className="bi bi-save me-2"></i> Changer le Mot de Passe
                  </button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {(showPasswordModal || showProfilePictureModal) && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}
