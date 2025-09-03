import React from 'react';

const HackathonList = ({ hackathons }) => {
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
            {/* Ajoutez d'autres détails du hackathon ici */}
          </li>
        ))}
      </ul>
    </div>
  );
};

export default HackathonList;
