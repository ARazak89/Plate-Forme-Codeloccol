// import 'bootstrap/dist/css/bootstrap.min.css'; // Assurez-vous que Bootstrap est importé
import 'bootstrap-icons/font/bootstrap-icons.css'; // Importez les icônes Bootstrap
import '../styles/global.css'; // Importez vos styles globaux ici

import { useEffect } from 'react';
import { useRouter } from 'next/router';
import Head from 'next/head';
import Layout from '../components/Layout'; // Importez le nouveau Layout

const publicPaths = ['/', '/login', '/register', '/forgot-password']; // Définissez les chemins publics ici

export default function App({ Component, pageProps }) {
  const router = useRouter();

  // Le useEffect pour la redirection est maintenant géré dans le composant Layout
  // Pour les pages publiques, pas de redirection ici.
  useEffect(() => {
    // Note: La logique d'authentification et de redirection est maintenant principalement gérée par le Layout.
    // Ce useEffect ici est pour les cas où une page non authentifiée tente d'accéder à une ressource protégée directement.
    const token = typeof window !== 'undefined' ? localStorage.getItem('token') : null;
    if (!token && !publicPaths.includes(router.pathname)) {
      router.push('/login');
    }
  }, [router.pathname]);


  // Si la page est publique, ne pas utiliser le Layout
  if (publicPaths.includes(router.pathname)) {
    return (
      <>
        <Head>
          <meta name="viewport" content="width=device-width, initial-scale=1" />
          <link href="https://cdn.jsdelivr.net/npm/bootstrap@5.3.3/dist/css/bootstrap.min.css" rel="stylesheet" integrity="sha384-QWTKZyjpPEjISv5WaRU9OFeRpok6YctnYmDr5pNlyT2bRjXh0JMhjY6hW+ALEwIH" crossOrigin="anonymous" />

          <link rel="stylesheet" href="https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css" />
        </Head>
        <div className="container-fluid py-3">
          <Component {...pageProps} />
        </div>
        <footer className="footer mt-auto py-3 bg-light text-center">
          <div className="container">
            <span className="text-muted">Copyright &copy; CodeLoccol 2025</span>
          </div>
        </footer>
      </>
    );
  }

  // Pour les pages non publiques (protégées), utiliser le Layout
  return (
    <Layout>
      <Component {...pageProps} />
    </Layout>
  );
}
