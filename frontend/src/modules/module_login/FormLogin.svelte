<script>
  import axios from 'axios';
  import Securecsrf from '../security/module_csrf/Securecsrf.svelte';
  
  let email = '';
  let password = '';
  let loading = false;
  let message = '';
  let messageType = '';
  let csrfToken = null;

  function handleCsrfTokenReceived(event) {
    console.log('📥 FormLogin - Événement csrfTokenReceived reçu');
    console.log('📥 FormLogin - event:', event);
    console.log('📥 FormLogin - event.detail:', event.detail);
    csrfToken = event.detail;
    console.log('📥 FormLogin - Token CSRF assigné:', csrfToken ? 'Oui (' + csrfToken + ')' : 'Non');
  }

  async function handleLogin() {
    if (!email.trim() || !password.trim()) {
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
      const response = await axios.post('/api/auth/login', {
        email,
        password
      }, {
        headers: {
          'X-CSRF-Token': csrfToken
        },
        withCredentials: true
      });
      
      if (response.data.success) {
        message = 'Connexion réussie !';
        messageType = 'success';
        // Rediriger ou mettre à jour l'état de l'application
        setTimeout(() => {
          window.location.reload();
        }, 1000);
      }
    } catch (error) {
      message = error.response?.data?.error || 'Erreur lors de la connexion';
      messageType = 'error';
    } finally {
      loading = false;
    }
  }
</script>

<!-- Composant invisible pour récupérer le token CSRF -->
<Securecsrf on:csrfTokenReceived={handleCsrfTokenReceived} />

<div class="login-form">
  <h2>Connexion</h2>
  
  {#if message}
    <div class="message message-{messageType}">
      {message}
    </div>
  {/if}

  <form on:submit|preventDefault={handleLogin}>
    <div class="form-group">
      <label for="email">Email</label>
      <input
        type="email"
        id="email"
        bind:value={email}
        placeholder="votre@email.com"
        required
        disabled={loading}
        autocomplete="email"
      />
    </div>

    <div class="form-group">
      <label for="password">Mot de passe</label>
      <input
        type="password"
        id="password"
        bind:value={password}
        placeholder="••••••••"
        required
        disabled={loading}
        autocomplete="current-password"
      />
    </div>

    <button type="submit" disabled={loading} class="submit-btn">
      {loading ? 'Connexion...' : 'Se connecter'}
    </button>
  </form>
</div>

<style>
  .login-form {
    background: white;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    width: 100%;
    max-width: 400px;
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

  input {
    width: 100%;
    padding: 12px;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    font-size: 16px;
    font-family: inherit;
    transition: border-color 0.3s;
    box-sizing: border-box;
  }

  input:focus {
    outline: none;
    border-color: #667eea;
  }

  input:disabled {
    background-color: #f5f5f5;
    cursor: not-allowed;
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

