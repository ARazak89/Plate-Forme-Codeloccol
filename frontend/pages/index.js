import Head from 'next/head';
import Link from 'next/link';

export default function Home() {
  return (
    <>
      <Head>
        <title>Bienvenue sur CodeLoccol</title>
        <meta name="description" content="Plateforme d'apprentissage collaboratif pour développeurs" />
      </Head>

      <div className="text-center my-5">
        <h1 className="display-4 fw-bold">Bienvenue sur <span className="text-primary">CodeLoccol</span></h1>
        <p className="lead text-muted mt-3">Votre plateforme collaborative pour apprendre, coder et grandir ensemble.</p>
        {/* Les boutons de connexion/inscription seront déplacés en bas */}
      </div>

      <div className="row my-5">
        <div className="col-md-4 text-center mb-4">
          <div className="icon-feature mb-3">
            <i className="bi bi-code-slash fs-1 text-primary"></i>
          </div>
          <h3 className="fw-bold">Projets Collaboratifs</h3>
          <p className="text-muted">Travaillez sur des projets réels, obtenez des retours et améliorez vos compétences en équipe.</p>
        </div>
        <div className="col-md-4 text-center mb-4">
          <div className="icon-feature mb-3">
            <i className="bi bi-trophy fs-1 text-success"></i>
          </div>
          <h3 className="fw-bold">Hackathons Excitants</h3>
          <p className="text-muted">Participez à des défis intenses, évaluez vos pairs et grimpez dans le classement.</p>
        </div>
        <div className="col-md-4 text-center mb-4">
          <div className="icon-feature mb-3">
            <i className="bi bi-award fs-1 text-warning"></i>
          </div>
          <h3 className="fw-bold">Badges et Niveaux</h3>
          <p className="text-muted">Gagnez des badges, progressez en niveau et suivez votre parcours d'apprentissage.</p>
        </div>
      </div>

      <div className="text-center my-5 p-4 bg-light rounded shadow-sm">
        <h2 className="fw-bold mb-3">Prêt à commencer votre aventure ?</h2>
        <p className="lead text-muted">Rejoignez des milliers de développeurs et transformez votre apprentissage.</p>
        <div className="d-grid gap-2 d-sm-flex justify-content-sm-center mt-3">
          <Link href="/login" className="btn btn-primary btn-lg px-4">
            Se connecter
          </Link>
          <Link href="/register" className="btn btn-outline-secondary btn-lg px-4">
            S'inscrire
          </Link>
        </div>
      </div>
    </>
  );
}
