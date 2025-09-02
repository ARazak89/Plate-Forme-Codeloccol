import { useState } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function Login() {
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState(null); // Pour gérer les messages d'erreur
  const router = useRouter();

  const submit = async (e) => {
    e.preventDefault();
    setError(null); // Réinitialiser l'erreur à chaque soumission
    try {
      const r = await fetch(`${API}/api/auth/login`, { method: 'POST', headers: {'Content-Type':'application/json'}, body: JSON.stringify({ email, password })});
      const data = await r.json();
      if (data.token) {
        localStorage.setItem('token', data.token);
        router.push('/dashboard'); // Rediriger vers le tableau de bord
      } else {
        setError(data.message || 'Erreur de connexion.'); // Afficher l'erreur du backend ou un message générique
      }
    } catch (e) {
      setError('Impossible de se connecter au serveur.'); // Erreur réseau ou autre
    }
  };

  return (
    <div className="row justify-content-center mt-5">
      <div className="col-md-6 col-lg-4">
        <h1 className="text-center mb-4">Connexion</h1>
        <form onSubmit={submit} className="p-4 border rounded shadow-sm bg-light">
          <div className="mb-3">
            <label htmlFor="emailInput" className="form-label">Email</label>
            <input
              type="email"
              className="form-control"
              id="emailInput"
              placeholder="Email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              required
            />
          </div>
          <div className="mb-3">
            <label htmlFor="passwordInput" className="form-label">Mot de passe</label>
            <input
              type="password"
              className="form-control"
              id="passwordInput"
              placeholder="Mot de passe"
              value={password}
              onChange={(e) => setPassword(e.target.value)}
              required
            />
          </div>
          <button type="submit" className="btn btn-primary w-100">Se connecter</button>
        </form>

        {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}

        {/* <p className="text-center mt-3">
          Pas encore de compte ? <a href="/register" className="text-decoration-none">Créer un compte</a>
        </p> */}
        <p className="text-center">
          <a href="/forgot-password" className="text-decoration-none">Mot de passe oublié ?</a>
        </p>

        {/* <div className="text-center mt-4">
          <p className="mb-3">Ou se connecter avec :</p>
          <div className="d-grid gap-2">
            <button
              className="btn btn-outline-danger d-flex align-items-center justify-content-center"
              onClick={() => (window.location.href = `${API}/auth/google`)}
            >
              <i className="bi bi-google me-2"></i> Se connecter avec Google
            </button>
            <button
              className="btn btn-outline-dark d-flex align-items-center justify-content-center mt-2"
              onClick={() => (window.location.href = `${API}/auth/github`)}
            >
              <i className="bi bi-github me-2"></i> Se connecter avec GitHub
            </button>
          </div>
        </div> */}
      </div>
    </div>
  );
}
