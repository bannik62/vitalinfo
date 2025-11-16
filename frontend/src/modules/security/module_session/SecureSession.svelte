<script>
  import { createEventDispatcher, onMount } from 'svelte';
  import axios from 'axios';

  const dispatch = createEventDispatcher();
  let isAuthenticated = false;
  let loading = true;

  async function checkSession() {
    // Par défaut, pas authentifié
    isAuthenticated = false;
    
    try {
      const response = await axios.get('http://localhost:3000/api/auth/verify', {
        withCredentials: true,
        validateStatus: function (status) {
          // Rejeter seulement les erreurs serveur (>= 500)
          return status < 500;
        }
      });
      
      console.log('Réponse verify:', response.status, response.data);
      
      // Vérifie strictement : statut 200 ET authenticated === true
      if (response.status === 200 && response.data?.authenticated === true) {
        isAuthenticated = true;
        console.log('✅ Authentifié: true');
      } else {
        // Si statut 401, 403 ou authenticated !== true, pas authentifié
        isAuthenticated = false;
        console.log('❌ Non authentifié: false');
      }
    } catch (error) {
      // Toute erreur = pas authentifié
      isAuthenticated = false;
      console.log('❌ Erreur, non authentifié:', error.response?.status || error.message);
    } finally {
      loading = false;
      console.log('Dispatch sessionChecked avec:', isAuthenticated);
      // Dispatch l'événement avec le booléen
      dispatch('sessionChecked', isAuthenticated);
    }
  }

  onMount(() => {
    checkSession();
  });
</script>

<!-- Composant invisible, juste pour la logique -->
<div style="display: none;"></div>

