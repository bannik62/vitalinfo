<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import axios from 'axios';

  const dispatch = createEventDispatcher();
  let csrfToken = null;

  async function getCsrfToken() {
    try {
      const response = await axios.get('/api/auth/csrf-token', {
        withCredentials: true
      });
      
      if (response.status === 200 && response.data?.csrfToken) {
        csrfToken = response.data.csrfToken;
      }
    } catch (error) {
      // Erreur silencieuse
    } finally {
      // Dispatch l'événement avec le token CSRF
      dispatch('csrfTokenReceived', csrfToken);
    }
  }

  onMount(() => {
    getCsrfToken();
  });
</script>

<!-- Composant invisible, juste pour la logique -->
<div style="display: none;"></div>

