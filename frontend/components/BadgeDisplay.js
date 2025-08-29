import React from 'react';

const BadgeDisplay = ({ badges }) => {
  if (!badges || badges.length === 0) {
    return (
      <div className="card shadow-sm mb-4">
        <div className="card-header bg-warning text-dark">
          <h2 className="h5 mb-0">Mes Badges</h2>
        </div>
        <div className="card-body">
          <p className="card-text">Aucun badge obtenu pour l'instant.</p>
        </div>
      </div>
    );
  }

  return (
    <div className="card shadow-sm mb-4">
      <div className="card-header bg-warning text-dark">
        <h2 className="h5 mb-0">Mes Badges</h2>
      </div>
      <div className="card-body">
        <div className="row g-3">
          {badges.map((badge) => (
            <div key={badge._id} className="col-6 col-md-4 col-lg-3">
              <div className="card h-100 text-center bg-light">
                <div className="card-body d-flex flex-column justify-content-center align-items-center">
                  <i className={`bi ${badge.icon || 'bi-patch-check'} fs-2 text-info mb-2`}></i> {/* Icône par défaut si non spécifiée */}
                  <h5 className="card-title mb-1">{badge.name}</h5>
                  <p className="card-text text-muted mb-0"><small>{badge.description}</small></p>
                </div>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};

export default BadgeDisplay;
