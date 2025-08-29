import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

export default function EvaluationPage() {
  const router = useRouter();
  const { id } = router.query; // Récupérer l'ID de l'évaluation depuis l'URL
  const [evaluation, setEvaluation] = useState(null);
  const [score, setScore] = useState(0);
  const [comments, setComments] = useState('');
  const [error, setError] = useState(null);
  const [success, setSuccess] = useState(null);
  const [startTime, setStartTime] = useState(null); // Ajout de l'état pour l'heure de début
  const [endTime, setEndTime] = useState(null);     // Ajout de l'état pour l'heure de fin
  const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;

  const isEvaluationActive = () => {
    if (!startTime || !endTime) return false;
    const now = new Date();
    const reviewWindowEnd = new Date(endTime.getTime() + 60 * 60 * 1000); // 1 heure après l'heure de fin

    return now >= startTime && now <= reviewWindowEnd;
  };

  useEffect(() => {
    if (!token) {
      router.push('/login');
      return;
    }
    if (id) {
      const fetchEvaluation = async () => {
        try {
          const res = await fetch(`${API}/evaluations/${id}`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('Failed to fetch evaluation details');
          const data = await res.json();
          setEvaluation(data);
          setScore(data.score || 0);
          setComments(data.comments || '');
          if (data.slot) { // Assurez-vous que le slot existe avant d'accéder à ses propriétés
            setStartTime(new Date(data.slot.startTime));
            setEndTime(new Date(data.slot.endTime));
          }
        } catch (e) {
          console.error("Error fetching evaluation:", e);
          setError(e.message);
        }
      };
      fetchEvaluation();
    }
  }, [id, token]);

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError(null);
    setSuccess(null);

    if (!token) {
      setError('Vous devez être connecté pour soumettre une évaluation.');
      return;
    }

    try {
      const res = await fetch(`${API}/evaluations/${id}/submit`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
        body: JSON.stringify({ score, comments }),
      });
      const data = await res.json();
      if (res.ok) {
        setSuccess('Évaluation soumise avec succès !');
        router.push('/dashboard'); // Rediriger vers le tableau de bord après soumission
      } else {
        throw new Error(data.message || 'Échec de la soumission de l\'évaluation.');
      }
    } catch (e) {
      setError(e.message);
    }
  };

  if (!token || !evaluation) {
    return <div className="text-center mt-5"><p className="lead">Chargement de l'évaluation...</p></div>;
  }

  return (
    <div className="row justify-content-center mt-4">
      <div className="col-md-8 col-lg-6">
        <h1 className="mb-4">Évaluer le Projet: {evaluation.project.title}</h1>
        <div className="card shadow-sm mb-4">
          <div className="card-header bg-primary text-white">
            <h2 className="h5 mb-0">Détails de l'évaluation</h2>
          </div>
          <div className="card-body">
            <p><strong>Projet:</strong> {evaluation.project.title}</p>
            <p><strong>Description du Projet:</strong> {evaluation.project.description}</p>
            <p><strong>Propriétaire du Projet:</strong> {evaluation.project.student?.name}</p>
            <p><strong>À évaluer par:</strong> {evaluation.evaluator.name}</p>
            <p><strong>URL du Dépôt:</strong> <a href={evaluation.project.repoUrl} target="_blank" rel="noopener noreferrer">{evaluation.project.repoUrl}</a></p>
            <p><strong>Date de soumission:</strong> {new Date(evaluation.createdAt).toLocaleDateString()}</p>
          </div>
        </div>

        <div className="card shadow-sm mb-4">
          <div className="card-header bg-info text-white">
            <h2 className="h5 mb-0">Checklist d'évaluation (Score et Commentaires)</h2>
          </div>
          <div className="card-body">
            <form onSubmit={handleSubmit}>
              <div className="mb-3">
                <label htmlFor="scoreInput" className="form-label">Score (0-5)</label>
                <input
                  type="number"
                  className="form-control"
                  id="scoreInput"
                  value={score}
                  onChange={(e) => setScore(Math.max(0, Math.min(5, Number(e.target.value))))} // Assurer que le score est entre 0 et 5
                  min="0"
                  max="5"
                  required
                />
              </div>
              <div className="mb-3">
                <label htmlFor="commentsTextarea" className="form-label">Commentaires</label>
                <textarea
                  className="form-control"
                  id="commentsTextarea"
                  rows="5"
                  value={comments}
                  onChange={(e) => setComments(e.target.value)}
                  placeholder="Vos commentaires détaillés sur le projet..."
                  required
                  disabled={!isEvaluationActive()} // Désactiver si l'évaluation n'est pas active
                ></textarea>
              </div>
              <button type="submit" className="btn btn-success w-100" disabled={!isEvaluationActive()}>Soumettre l'évaluation</button>
            </form>
          </div>
        </div>

        {success && <div className="alert alert-success mt-3" role="alert">{success}</div>}
        {error && <div className="alert alert-danger mt-3" role="alert">{error}</div>}
      </div>
    </div>
  );
}
