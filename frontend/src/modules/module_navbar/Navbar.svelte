<script>
  import { onMount } from 'svelte';
  import axios from 'axios';

  let user = null;

  // (Optionnel) Récupérer l'utilisateur connecté si besoin
  onMount(async () => {
    // Ajoutez ici la logique pour récupérer le profil si besoin
    // Par exemple avec un appel API /api/auth/me
    // user = await api.get('/api/auth/me');
  });

  // Déconnexion
  async function logout() {
    try {
      // Appel à un endpoint de déconnexion si présent, sinon on supprime juste le cookie côté client
      await axios.post('http://localhost:3002/api/auth/logout', {}, {
        withCredentials: true
      });
      // Redirection après déconnexion
      window.location.href = '/login';
    } catch (err) {
      // Même si erreur, on redirige
      window.location.href = '/login';
    }
  }


</script>

<style>
  nav.navbar {
    display: flex;
    align-items: center;
    justify-content: space-between;
    background: #0077bb;
    padding: 1rem 2rem;
    color: white;
  }
  .navbar-buttons {
    display: flex;
    gap: 1rem;
  }
  .navbar-button {
    background: #fff2;
    color: white;
    border: none;
    border-radius: 4px;
    padding: 0.5rem 1.2rem;
    cursor: pointer;
    font-size: 1rem;
    transition: background 0.2s;
  }
  .navbar-button:hover {
    background: #fff4;
  }
  .navbar-title {
    font-weight: bold;
    font-size: 1.35rem;
    letter-spacing: 1px;
  }
</style>

<nav class="navbar">
  <div class="navbar-title">
    VitalInfo
  </div>
  <div class="navbar-buttons">
    <button class="navbar-button" on:click={logout}>Se déconnecter</button>
  </div>
</nav>
