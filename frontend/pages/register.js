import { useState } from 'react';
import { useRouter } from 'next/router'; // Importez useRouter

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function Register() {
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null); // Utilisez 'error' au lieu de 'out'
  const router = useRouter(); // Initialisez useRouter

  const submit = async (e) => {
    e.preventDefault();
    setError(null); // Réinitialiser l'erreur à chaque soumission
    try {
      const r = await fetch(`${API}/auth/register`, { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify({ name, email, password }) });
      const data = await r.json();
      if (data.id) {
        // Inscription réussie, rediriger vers la page de connexion ou de tableau de bord
        router.push('/login?registered=true'); // Rediriger vers la connexion avec un message de succès
      } else {
        setError(data.error || 'Erreur lors de l\'inscription.');
      }
    } catch (e) {
      setError('Impossible de se connecter au serveur.');
    }
  };

  return (
    // <div className="row justify-content-center mt-5">
    //   <div className="col-md-6 col-lg-4">
    //     <h1 className="text-center mb-4">Inscription</h1>
    //     <form onSubmit={submit} className="p-4 border rounded shadow-sm bg-light">
    //       <div className="mb-3">
    //         <label htmlFor="nameInput" className="form-label">Nom</label>
    //         <input
    //           type="text"
    //           className="form-control"
    //           id="nameInput"
    //           placeholder="Nom"
    //           value={name}
    //           onChange={(e) => setName(e.target.value)}
    //           required
    //         />
    //       </div>
    //       <div className="mb-3">
    //         <label htmlFor="emailInput" className="form-label">Email</label>
    //         <input
    //           type="email"
    //           className="form-control"
    //           id="emailInput"
    //           placeholder="Email"
    //           value={email}
    //           onChange={(e) => setEmail(e.target.value)}
    //           required
    //         />
    //       </div>
    //       <div className="mb-3">
    //         <label htmlFor="passwordInput" className="form-label">Mot de passe</label>
    //         <input
    //           type="password"
    //           className="form-control"
    //           id="passwordInput"
    //           placeholder="Mot de passe"
    //           value={password}
    //           onChange={(e) => setPassword(e.target.value)}
    //           required
    //         />
    //       </div>
    //       <button type="submit" className="btn btn-primary w-100">S'inscrire</button>
    //     </form>
    //
    //     {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
    //
    //     <p className="text-center mt-3">
    //       Déjà un compte ? <a href="/login" className="text-decoration-none">Se connecter</a>
    //     </p>
    //   </div>
    // </div>
    <div className="text-center mt-5">
      <h1 className="display-4 text-danger">Inscription Désactivée</h1>
      <p className="lead">L'inscription de nouveaux comptes est actuellement désactivée.</p>
      <p className="lead">Veuillez contacter un administrateur pour plus d'informations.</p>
      <a href="/login" className="btn btn-primary mt-3">Retour à la connexion</a>
    </div>
  );
}
