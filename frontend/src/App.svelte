<script>
  import SecureSession from './modules/security/module_session/SecureSession.svelte';
  import PageLogin from './pages/login/Login.svelte';
  import Board from './modules/module_board/Board.svelte';
  
  let isAuthenticated = false;
  let loading = true;

  function handleSessionChecked(event) {
    console.log('App.svelte - Événement reçu:', event);
    console.log('App.svelte - event.detail:', event.detail);
    console.log('App.svelte - Type de event.detail:', typeof event.detail);
    
    const authValue = Boolean(event.detail);
    console.log('App.svelte - authValue (Boolean):', authValue);
    
    isAuthenticated = authValue;
    loading = false;
    
    console.log('App.svelte - isAuthenticated après assignation:', isAuthenticated);
    console.log('App.svelte - Affichera:', isAuthenticated ? 'Board' : 'PageLogin');
  }
</script>

<!-- Composant invisible pour vérifier la session -->
<SecureSession on:sessionChecked={handleSessionChecked} />

 

{#if loading}
  <div class="loading">Chargement...</div>
  {:else}
    <main>
      {#if isAuthenticated}
        <Board />
      {:else}
        <PageLogin />
      {/if}
      <a href="https://codeurbase.fr" target="_blank" rel=" noreferrer" class="codeurbase-link">
        Powered by codeurbase.fr
      </a>
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

  .codeurbase-link {
    position: fixed;
    bottom: 20px;
    right: 20px;
    color: rgba(9, 9, 121, 1);
    text-decoration: none;
    font-size: clamp(12px, 1.2vw, 14px);
    font-weight: 500;
    padding: 8px 16px;
    border-radius: 20px;
    box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
    transition: all 0.3s ease;
    z-index: 1000;
  }

  .codeurbase-link:hover {
    background: rgba(255, 255, 255, 1);
    box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
    transform: translateY(-2px);
  }

  .codeurbase-link::before {
    content: '';
    position: absolute;
    bottom: -2px;
    right: -2px;
    width: 8px;
    height: 8px;
    background: #667eea;
    border-radius: 50%;
    opacity: 0.6;
  }

  .codeurbase-link::after {
    content: '↗';
    margin-left: 4px;
    font-size: 0.9em;
  }

  /* Mobile - Lien en haut */
  @media (max-width: 575.98px) {
    .codeurbase-link {
      bottom: auto;
      top: 20px;
      right: 20px;
      font-size: clamp(10px, 2vw, 12px);
      padding: 6px 12px;
    }
  }
</style>
