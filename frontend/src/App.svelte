<script>
  import { onMount } from 'svelte';
  import SecureSession from './modules/security/module_session/SecureSession.svelte';
  import PageLogin from './pages/login/Login.svelte';
  import Board from './modules/module_board/Board.svelte';
  import MentionsLegales from './pages/MentionsLegales.svelte';
  import Security from './pages/admin/Security.svelte';
  
  let isAuthenticated = false;
  let loading = true;
  let showMentionsLegales = false;
  let showSecurity = false;

  function checkHash() {
    if (typeof window !== 'undefined') {
      showMentionsLegales = window.location.hash === '#mentions-legales';
      showSecurity = window.location.hash === '#security';
    }
  }

  onMount(() => {
    checkHash();
    // Écouter les changements d'URL
    window.addEventListener('hashchange', checkHash);
    
    // Enregistrer le Service Worker pour PWA
    if ('serviceWorker' in navigator) {
      navigator.serviceWorker
        .register('/service-worker.js')
        .then((registration) => {
          console.log('Service Worker enregistré:', registration);
        })
        .catch((error) => {
          console.error('Erreur enregistrement Service Worker:', error);
        });
    }
    
    return () => {
      window.removeEventListener('hashchange', checkHash);
    };
  });

  function handleSessionChecked(event) {
    const authValue = Boolean(event.detail);
    
    isAuthenticated = authValue;
    loading = false;
  }
</script>

<!-- Composant invisible pour vérifier la session -->
<SecureSession on:sessionChecked={handleSessionChecked} />

 

{#if loading}
  <div class="loading">Chargement...</div>
  {:else if showMentionsLegales}
    <MentionsLegales />
  {:else if showSecurity}
    {#if isAuthenticated}
      <Security />
    {:else}
      <PageLogin />
    {/if}
  {:else}
    <main>
      {#if isAuthenticated}
        <Board />
      {:else}
        <PageLogin />
      {/if}
    </main>
  {/if}
<style>
  .loading {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    display: flex;
    justify-content: center;
    align-items: center;
    height: 10vh;
    font-size: 18px;
  }

  main {
    position: relative;
    top: 0;
    left: 0;
    width: 100%;
    height:100%;
  }

</style>
