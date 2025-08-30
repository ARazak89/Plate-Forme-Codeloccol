import React from 'react';
import Head from 'next/head';
import { useEffect, useState } from 'react';
import { useRouter } from 'next/router';
import Script from 'next/script'; // Importez Script
import { getAuthToken } from '../utils/auth'; // Importer la fonction getAuthToken

const API = process.env.NEXT_PUBLIC_API_URL || 'http://localhost:4000/api';

const Layout = ({ children }) => {
  const [user, setUser] = useState(null);
  const [daysRemaining, setDaysRemaining] = useState(0);
  const [notificationsCount, setNotificationsCount] = useState(0);
  const router = useRouter();
  const [token, setToken] = useState(null); // Gérer le token localement
  const [loading, setLoading] = useState(true); // Nouvel état de chargement

  useEffect(() => {
    // Au premier chargement, essayer de récupérer le token depuis localStorage
    if (!token && typeof window !== 'undefined') {
      const storedToken = localStorage.getItem('token');
      if (storedToken) {
        setToken(storedToken);
      } else {
        // Si aucun token, définir l'état comme chargé et rediriger
        setLoading(false);
        router.push('/login');
        return;
      }
    }

    if (token) {
      const fetchUserData = async () => {
        try {
          const res = await fetch(`${API}/users/me`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) {
            // Si le token est invalide, le supprimer et rediriger
            localStorage.removeItem('token');
            router.push('/login');
            return;
          }
          const data = await res.json();
          setUser(data);
          setDaysRemaining(data.daysRemaining || 0);
          setLoading(false); // Fin du chargement après la récupération des données
        } catch (e) {
          console.error('Error fetching user data:', e);
          localStorage.removeItem('token'); // S'assurer que le token invalide est supprimé
          router.push('/login');
          setLoading(false);
        }
      };

      const fetchNotificationsCount = async () => {
        try {
          const res = await fetch(`${API}/notifications/count`, {
            headers: { Authorization: `Bearer ${token}` },
          });
          if (!res.ok) throw new Error('Failed to fetch notifications count');
          const data = await res.json();
          setNotificationsCount(data.count);
        } catch (e) {
          console.error('Error fetching notifications count:', e);
        }
      };

      fetchUserData();
      fetchNotificationsCount();

      const interval = setInterval(() => {
        fetchUserData();
        fetchNotificationsCount();
      }, 60000);

      return () => clearInterval(interval);
    }
  }, [token, router]);

  const handleLogout = () => {
    localStorage.removeItem('token');
    router.push('/login');
  };

  if (loading) {
    return (
      <div className="d-flex justify-content-center align-items-center vh-100">
        <div className="spinner-border text-primary" role="status">
          <span className="visually-hidden">Chargement...</span>
        </div>
        <p className="ms-2">Chargement de l'application...</p>
      </div>
    );
  }

  if (!user) {
    // Si pas d'utilisateur après chargement (par ex. redirection vers login), ne rien afficher
    return null;
  }

  return (
    <div className="d-flex flex-column min-vh-100">
      <Head>
        <title>CodeLoccol Dashboard</title>
        <meta name="viewport" content="width=device-width, initial-scale=1" />
        <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossOrigin="anonymous" />
        <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
      </Head>

      {/* Navbar */}
      <nav className="navbar navbar-expand-lg navbar-dark bg-dark fixed-top">
        <div className="container-fluid">
          <a className="navbar-brand" href="/dashboard">CodeLoccol</a>
          <button className="navbar-toggler" type="button" data-bs-toggle="collapse" data-bs-target="#navbarNav" aria-controls="navbarNav" aria-expanded="false" aria-label="Toggle navigation">
            <span className="navbar-toggler-icon"></span>
          </button>
          <div className="collapse navbar-collapse" id="navbarNav">
            <ul className="navbar-nav me-auto mb-2 mb-lg-0">
              {/* Future Navbar items */}
            </ul>
            {/* Chrono au centre (pour l'exemple, simple texte) */}
            <div className="d-flex justify-content-center flex-grow-1">
              <span className="navbar-text text-light me-3">
                <i className="bi bi-clock me-1"></i> Jours restants: {daysRemaining}
              </span>
            </div>
            {/* Notifications à droite */}
            <ul className="navbar-nav">
              <li className="nav-item">
                <a className="nav-link" href="#">
                  <i className="bi bi-bell-fill"></i> Notifications
                  {notificationsCount > 0 && (
                    <span className="badge bg-danger rounded-pill ms-1">{notificationsCount}</span>
                  )}
                </a>
              </li>
              <li className="nav-item dropdown">
                <a className="nav-link dropdown-toggle" href="#" id="navbarDropdown" role="button" data-bs-toggle="dropdown" aria-expanded="false">
                  <i className="bi bi-person-circle"></i> {user.name}
                </a>
                <ul className="dropdown-menu dropdown-menu-end" aria-labelledby="navbarDropdown">
                  <li><a className="dropdown-item" href="/profile">Profil</a></li>
                  <li><hr className="dropdown-divider" /></li>
                  <li><button className="dropdown-item" onClick={handleLogout}>Déconnexion</button></li>
                </ul>
              </li>
            </ul>
          </div>
        </div>
      </nav>

      <div className="d-flex flex-grow-1 h-100 overflow-hidden pt-5">
        {/* Sidebar */}
        <nav id="sidebarMenu" className="col-md-3 col-lg-2 d-md-block bg-light sidebar position-fixed top-0 bottom-0 collapse h-100 overflow-auto pt-5" >
          <div className="position-sticky pt-3">
            <ul className="nav flex-column">
              <li className="nav-item">
                <a className="nav-link active" aria-current="page" href="/dashboard">
                  <i className="bi bi-house-door-fill me-2"></i>
                  Tableau de bord
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/projects">
                  <i className="bi bi-folder-fill me-2"></i>
                  Mes Projets
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/hackathons">
                  <i className="bi bi-cup-fill me-2"></i>
                  Hackathons
                </a>
              </li>
              {/* Ajout des liens pour d'autres pages comme la gestion de profil, etc. */}
              <li className="nav-item">
                <a className="nav-link" href="/profile">
                  <i className="bi bi-person-circle me-2"></i>
                  Mon Profil
                </a>
              </li>
              <li className="nav-item">
                <a className="nav-link" href="/evaluations">
                  <i className="bi bi-check2-square me-2"></i>
                  Évaluations
                </a>
              </li>
              {user && (user.role === 'staff' || user.role === 'admin') && (
                <li className="nav-item">
                  <a className="nav-link" href="/admin/settings">
                    <i className="bi bi-gear-fill me-2"></i>
                    Admin/Staff
                  </a>
                </li>
              )}
            </ul>
          </div>
        </nav>

        {/* Main Content */}
        <main className="col-md-9 ms-sm-auto col-lg-10 px-md-4 h-100 overflow-auto pt-5">
          {children}
        </main>
      </div>
      <footer className="footer mt-auto py-3 bg-light text-center">
        <div className="container">
          <span className="text-muted">Copyright &copy; CodeLoccol 2025</span>
        </div>
      </footer>

      {/* Script Bootstrap JS pour les fonctionnalités interactives (navbar toggler, dropdowns) */}
      <Script src="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/js/bootstrap.bundle.min.js" integrity="sha384-YvpcrYf0tY3lHB60NNkmXc5s9fDVZLESaAA55NDzOxhy9GkcIdslK1eN7N6jIeHz" crossOrigin="anonymous"></Script>
    </div>
  );
};

export default Layout;
