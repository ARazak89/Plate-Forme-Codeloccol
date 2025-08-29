import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

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
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    const fetchUserProfile = async () => {
      try {
        const res = await fetch(`${API}/users/me`, {
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
      const res = await fetch(`${API}/users/me/password`, {
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
      const res = await fetch(`${API}/users/me/profile-picture`, {
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

  if (!user) return <p>Chargement du profil...</p>;

  return (
    <div className="container mt-5">
      <h1 className="mb-4">Mon Profil</h1>

      {success && <div className="alert alert-success" role="alert">{success}</div>}
      {error && <div className="alert alert-danger" role="alert">{error}</div>}

      <div className="card mb-4 shadow-sm">
        <div className="card-header bg-primary text-white">
          <h2 className="h5 mb-0">Informations Générales</h2>
        </div>
        <div className="card-body">
          <div className="text-center mb-4">
            <img
              src={user.profilePicture ? `${STATIC_ASSETS_BASE_URL}${user.profilePicture}` : '/default-avatar.png'}
              alt="Photo de profil"
              className="rounded-circle border border-3"
              style={{ width: '150px', height: '150px', objectFit: 'cover' }}
            />
          </div>
          <p><strong>Nom:</strong> {user.name}</p>
          <p><strong>Email:</strong> {user.email}</p>
          <p><strong>Rôle:</strong> {user.role}</p>
          <p><strong>Statut:</strong> {user.status}</p>
          <p><strong>Jours Restants:</strong> {user.daysRemaining}</p>
          <p><strong>Niveau:</strong> {user.level}</p>
          <p><strong>Dernière Connexion:</strong> {new Date(user.lastLogin).toLocaleDateString()}</p>
          <p><strong>Projets Complétés:</strong> {user.totalProjectsCompleted}</p>

          <div className="d-flex justify-content-center mt-4 gap-3">
            <button className="btn btn-info" onClick={() => setShowProfilePictureModal(true)}>
              Changer la photo de profil
            </button>
            <button className="btn btn-warning" onClick={() => setShowPasswordModal(true)}>
              Changer le mot de passe
            </button>
          </div>
        </div>
      </div>

      {/* Modale pour changer la photo de profil */}
      {showProfilePictureModal && (
        <div className="modal" tabIndex="-1" style={{ display: 'block' }}>
          <div className="modal-dialog">
            <div className="modal-content">
              <div className="modal-header bg-info text-white">
                <h5 className="modal-title">Changer la Photo de Profil</h5>
                <button type="button" className="btn-close" onClick={() => setShowProfilePictureModal(false)}></button>
              </div>
              <div className="modal-body">
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
                  <button type="submit" className="btn btn-info">Mettre à jour la photo</button>
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
              <div className="modal-header bg-warning text-dark">
                <h5 className="modal-title">Changer le Mot de Passe</h5>
                <button type="button" className="btn-close" onClick={() => setShowPasswordModal(false)}></button>
              </div>
              <div className="modal-body">
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
                  <button type="submit" className="btn btn-warning">Changer le Mot de Passe</button>
                </form>
              </div>
            </div>
          </div>
        </div>
      )}
      {/* Pour afficher l'overlay de la modale */}
      {(showPasswordModal || showProfilePictureModal) && <div className="modal-backdrop fade show"></div>}
    </div>
  );
}
