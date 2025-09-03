import React from 'react';

const HackathonList = ({ hackathons, me, onShowSubmitHackathonModal }) => {
  if (!hackathons || hackathons.length === 0) {
    return (
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-success text-white">
          <h2 className="h5 mb-0">Mes Hackathons</h2>
        </div>
        <div className="card-body">
          <p className="card-text">Aucun hackathon en cours.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-success text-white">
        <h2 className="h5 mb-0">Mes Hackathons</h2>
      </div>
      <ul className="list-group list-group-flush">
        {hackathons.map((hackathon) => (
          <li key={hackathon._id} className="list-group-item">
            <div className="d-flex w-100 justify-content-between align-items-center">
              <h5 className="mb-1">{hackathon.title}</h5>
              <small className={`badge ${hackathon.status === 'active' ? 'bg-info text-dark' : hackathon.status === 'finished' ? 'bg-secondary' : 'bg-dark'}`}>
                {hackathon.status}
              </small>
            </div>
            <p className="mb-1">{hackathon.description}</p>
            <small className="text-muted">
              Début: {new Date(hackathon.startDate).toLocaleDateString()}{' '}
              Fin: {new Date(hackathon.endDate).toLocaleDateString()}
            </small>
            {hackathon.teamSize && (
              <p className="mb-1 text-muted">Taille d'équipe: {hackathon.teamSize}</p>
            )}
            {me && me.role === 'apprenant' && hackathon.teams && hackathon.teams.length > 0 && (
              // Trouver l'équipe de l'apprenant pour ce hackathon
              (() => {
                const myTeam = hackathon.teams.find(team => team.members.some(member => member._id === me._id));
                if (myTeam) {
                  // Si l'équipe existe et n'a pas encore soumis, afficher le bouton
                  // Vérifier si le hackathon est toujours actif et si l'équipe n'a pas déjà soumis
                  const now = new Date();
                  const hackathonEndDate = new Date(hackathon.endDate);
                  const isSubmissionPeriodActive = now < hackathonEndDate; // Simple vérification, à affiner si nécessaire

                  if (!myTeam.repoUrl && isSubmissionPeriodActive) { // Supposons que myTeam.repoUrl indique si le projet est soumis
                    return (
                      <button
                        className="btn btn-sm btn-primary mt-2"
                        onClick={() => onShowSubmitHackathonModal(hackathon, myTeam)}
                      >
                        <i className="bi bi-upload me-1"></i> Soumettre le Projet de Hackathon
                      </button>
                    );
                  } else if (myTeam.repoUrl) {
                    return (
                      <span className="badge bg-success mt-2 d-flex align-items-center">
                        <i className="bi bi-check-circle me-1"></i> Projet Soumis
                        <a href={myTeam.repoUrl} target="_blank" rel="noopener noreferrer" className="text-white ms-2 text-decoration-none">Voir</a>
                      </span>
                    );
                  } else if (!isSubmissionPeriodActive) {
                    return (
                      <span className="badge bg-secondary mt-2"><i className="bi bi-x-circle me-1"></i> Période de soumission terminée</span>
                    );
                  }
                }
                return null;
              })()
            )}
            {/* Ajoutez d'autres détails du hackathon ici */}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HackathonList;
