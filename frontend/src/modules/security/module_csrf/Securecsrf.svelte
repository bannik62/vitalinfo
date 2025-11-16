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
      
      console.log('🔍 Réponse CSRF complète:', response);
      console.log('🔍 Status:', response.status);
      console.log('🔍 Data:', response.data);
      
      if (response.status === 200 && response.data?.csrfToken) {
        csrfToken = response.data.csrfToken;
        console.log('✅ Token CSRF récupéré:', csrfToken);
      } else {
        console.log('❌ Erreur lors de la récupération du token CSRF - réponse invalide');
        console.log('❌ Response data:', response.data);
      }
    } catch (error) {
      console.error('❌ Erreur CSRF:', error);
      console.error('❌ Status:', error.response?.status);
      console.error('❌ Message:', error.message);
      console.error('❌ Data:', error.response?.data);
    } finally {
      // Dispatch l'événement avec le token CSRF
      console.log('📤 Dispatch csrfTokenReceived avec:', csrfToken);
      dispatch('csrfTokenReceived', csrfToken);
    }
  }

  onMount(() => {
    getCsrfToken();
  });
</script>

<!-- Composant invisible, juste pour la logique -->
<div style="display: none;"></div>

