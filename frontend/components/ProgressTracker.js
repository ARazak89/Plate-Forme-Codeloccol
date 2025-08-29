import React from 'react';

const ProgressTracker = ({ level, daysRemaining, progress }) => {
  const progressPercentage = progress && progress.totalProjects > 0
    ? ((progress.currentProject / progress.totalProjects) * 100).toFixed(0)
    : 0;

  return (
    <div className="card shadow-sm h-100">
      <div className="card-header bg-info text-white">
        <h2 className="h5 mb-0">Ma Progression</h2>
      </div>
      <div className="card-body">
        <div className="mb-3">
          <p className="card-text mb-1">Niveau actuel: <span className="fw-bold text-primary">{level}</span></p>
          <p className="card-text">Jours restants: <span className="fw-bold text-success">{daysRemaining}</span></p>
        </div>

        {progress && (
          <div>
            <h3 className="h6">Progression des projets</h3>
            <p className="card-text">
              {progress.currentProject} / {progress.totalProjects} projets complétés
            </p>
            <div className="progress" style={{ height: '20px' }}>
              <div
                className="progress-bar bg-success"
                role="progressbar"
                style={{ width: `${progressPercentage}%` }}
                aria-valuenow={progressPercentage}
                aria-valuemin="0"
                aria-valuemax="100"
              >
                {progressPercentage}%
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
};

export default ProgressTracker;
