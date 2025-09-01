import React from 'react';

const UserSummaryCard = ({ me, onShowCreateSlotModal, onShowAddUserModal }) => {
  return (
    <div className="card shadow-sm h-100 border-0 transform-hover">
      <div className="card-body d-flex flex-column">
        <div className="d-flex align-items-center mb-3">
          <i className="bi bi-person-circle fs-1 text-primary me-3"></i>
          <div>
            <h5 className="card-title mb-0">Bonjour {me.name}</h5>
            <p className="text-muted mb-0">{me.email}</p>
          </div>
        </div>
        <p className="card-text flex-grow-1">
          Rôle: <span className="badge bg-primary me-2">{me.role}</span>
          {me.role === 'apprenant' && (
            <>
              <span className="badge bg-info me-2"><i className="bi bi-graph-up me-1"></i> Niveau: {me.level}</span>
              <span className="badge bg-warning text-dark"><i className="bi bi-hourglass-split me-1"></i> Jours Restants: {me.daysRemaining}</span>
            </>
          )}
        </p>
        <div className="mt-auto d-flex flex-wrap">
          {me.role === 'apprenant' && (
            <button className="btn btn-success mt-2 me-2" onClick={onShowCreateSlotModal}>
              <i className="bi bi-plus-circle me-1"></i> Créer un slot de disponibilité
            </button>
          )}
          {(me.role === 'staff' || me.role === 'admin') && (
            <button className="btn btn-primary mt-2" onClick={onShowAddUserModal}>
              <i className="bi bi-person-plus me-1"></i> Ajouter un Utilisateur
            </button>
          )}
        </div>
      </div>
    </div>
  );
};

export default UserSummaryCard;
