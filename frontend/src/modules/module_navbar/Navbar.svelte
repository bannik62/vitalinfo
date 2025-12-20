<script>
  import { onMount } from 'svelte';
  import axios from 'axios';

  let user = null;
  let isAdmin = false;

  // Récupérer l'utilisateur connecté
  onMount(async () => {
    try {
      const response = await axios.get('/api/auth/verify', {
        withCredentials: true
      });
      user = response.data.user;
      isAdmin = user?.role === 'admin';
    } catch (err) {
      console.log('Utilisateur non authentifié');
    }
  });

  // Déconnexion
  async function logout() {
    try {
      await axios.post('/api/auth/logout', {}, {
        withCredentials: true
      });
      window.location.href = '/';
    } catch (err) {
      window.location.href = '/';
    }
  }

  // Navigation vers le dashboard sécurité
  function goToSecurity() {
    window.location.hash = '#security';
  }

  // Navigation vers le board principal
  function goToBoard() {
    window.location.hash = '';
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
    flex-wrap: wrap;
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
  .navbar-button-security {
    background: #e74c3c;
  }
  .navbar-button-security:hover {
    background: #c0392b;
  }
  .navbar-title {
    font-weight: bold;
    font-size: 1.35rem;
    letter-spacing: 1px;
  }
  
  @media (max-width: 768px) {
    nav.navbar {
      padding: 0.8rem 1rem;
      flex-direction: column;
      gap: 1rem;
    }
    .navbar-title {
      font-size: 1.1rem;
    }
    .navbar-buttons {
      width: 100%;
      justify-content: center;
    }
    .navbar-button {
      font-size: 0.9rem;
      padding: 0.4rem 1rem;
    }
  }
</style>

<nav class="navbar">
  <div class="navbar-title">
    VitalInfo
  </div>
  <div class="navbar-buttons">
    <button class="navbar-button" on:click={goToBoard}>📋 Dashboard</button>
    {#if isAdmin}
      <button class="navbar-button navbar-button-security" on:click={goToSecurity}>
        🛡️ Sécurité
      </button>
    {/if}
    <button class="navbar-button" on:click={logout}>Se déconnecter</button>
  </div>
</nav>

