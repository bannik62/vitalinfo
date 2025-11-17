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
    background-color: #ede4e4;
  }

  main {
    position: relative;
    top: 0;
    left: 0;
    width: 100%;
    height:100%;
  }
  @media (max-width: 575.98px) {
    main {
    }
  }
 
</style>
