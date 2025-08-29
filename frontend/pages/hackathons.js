import { useEffect, useState } from 'react';
import { useRouter } from 'next/router'; // Importez useRouter

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function Hackathons() {
  const [list, setList] = useState([]);
  const [error, setError] = useState(null); // Pour gérer les erreurs d'API
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

  useEffect(() => {
    if (token) {
      loadHackathons();
    } else {
      router.push('/login');
    }
  }, [token]);

  if (!token) return null; // La redirection est gérée par useEffect

  return (
    <div>
      <h1 className="mb-4">Hackathons</h1>

      {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}

      {list.length === 0 ? (
        <p>Aucun hackathon disponible pour le moment.</p>
      ) : (
        <div className="row g-4">
          {list.map((h) => (
            <div key={h._id} className="col-md-6 col-lg-4">
              <div className="card shadow-sm h-100">
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
                  {/* Vous pouvez ajouter un bouton pour rejoindre ou voir les détails ici */}
                </div>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
