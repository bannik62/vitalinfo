<script>
  import axios from 'axios';
  import Securecsrf from '../security/module_csrf/Securecsrf.svelte';
  
  let titre = '';
  let description = '';
  let loading = false;
  let message = '';
  let messageType = '';
  let csrfToken = null;

  function handleCsrfTokenReceived(event) {
    csrfToken = event.detail;
  }

  async function envoyer() {
    if (!titre.trim() || !description.trim()) {
      message = 'Veuillez remplir tous les champs';
      messageType = 'error';
      return;
    }

    if (!csrfToken) {
      message = 'Token CSRF non disponible. Veuillez recharger la page.';
      messageType = 'error';
      return;
    }

    loading = true;
    message = '';
    
    try {
      const response = await axios.post('http://localhost:3000/api/board', {
        titre,
        description
      }, {
        headers: {
          'X-CSRF-Token': csrfToken
        },
        withCredentials: true
      });
      message = 'Message envoyé avec succès !';
      messageType = 'success';
      titre = '';
      description = '';
    } catch (error) {
      message = error.response?.data?.error || 'Erreur lors de l\'envoi';
      messageType = 'error';
    } finally {
      loading = false;
    }
  }
</script>

<!-- Composant invisible pour récupérer le token CSRF -->
<Securecsrf on:csrfTokenReceived={handleCsrfTokenReceived} />

<div class="board-container">
  <div class="board-card">
    <h2>Nouveau message</h2>
    
    {#if message}
      <div class="message message-{messageType}">
        {message}
      </div>
    {/if}

    <form on:submit|preventDefault={envoyer}>
      <div class="form-group">
        <label for="titre">Titre</label>
        <input
          type="text"
          id="titre"
          bind:value={titre}
          placeholder="Entrez un titre"
          required
          disabled={loading}
        />
      </div>

      <div class="form-group">
        <label for="description">Description</label>
        <textarea
          id="description"
          bind:value={description}
          placeholder="Entrez une description"
          rows="4"
          required
          disabled={loading}
        ></textarea>
      </div>

      <button type="submit" disabled={loading} class="submit-btn">
        {loading ? 'Envoi en cours...' : 'Envoyer'}
      </button>
    </form>
  </div>
</div>

<style>
  .board-container {
    display: flex;
    justify-content: center;
    align-items: center;
    min-height: 100vh;
    padding: 20px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
  }

  .board-card {
    background: white;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    width: 100%;
    max-width: 500px;
  }

  h2 {
    margin: 0 0 30px 0;
    color: #333;
    font-size: 28px;
    text-align: center;
  }

  .form-group {
    margin-bottom: 20px;
  }

  label {
    display: block;
    margin-bottom: 8px;
    color: #555;
    font-weight: 600;
    font-size: 14px;
  }

  input,
  textarea {
    width: 100%;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 16px;
    font-family: inherit;
    transition: border-color 0.3s;
    box-sizing: border-box;
  }

  input:focus,
  textarea:focus {
    outline: none;
    border-color: #667eea;
  }

  input:disabled,
  textarea:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
  }

  textarea {
    resize: vertical;
    min-height: 100px;
  }

  .submit-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #667eea 0%, #764ba2 100%);
    color: white;
    border: none;
    border-radius: 8px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.3s, transform 0.2s;
    margin-top: 10px;
  }

  .submit-btn:hover:not(:disabled) {
    opacity: 0.9;
    transform: translateY(-2px);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .message {
    padding: 12px 16px;
    border-radius: 8px;
    margin-bottom: 20px;
    font-size: 14px;
    text-align: center;
  }

  .message-success {
    background-color: #d4edda;
    color: #155724;
    border: 1px solid #c3e6cb;
  }

  .message-error {
    background-color: #f8d7da;
    color: #721c24;
    border: 1px solid #f5c6cb;
  }
</style>
