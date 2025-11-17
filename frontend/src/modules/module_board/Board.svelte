<script>
  import axios from 'axios';
  import Securecsrf from '../security/module_csrf/Securecsrf.svelte';
  import Navbar from '../module_navbar/Navbar.svelte';

  let csrfToken = null;

  // Upload states
  let selectedFile = null;
  let uploadLoading = false;
  let uploadMessage = '';
  let uploadMessageType = '';

  // Chat states
  let chatInput = '';
  let chatLoading = false;
  let chatMessage = '';
  let chatHistory = [];

  function handleCsrfTokenReceived(event) {
    csrfToken = event.detail;
  }

  function handleFileChange(event) {
    const fileList = event.target.files;
    selectedFile = fileList && fileList.length > 0 ? fileList[0] : null;
    uploadMessage = '';
  }

  async function uploadDocument() {
    if (!selectedFile) {
      uploadMessage = 'Veuillez sélectionner un fichier PDF.';
      uploadMessageType = 'error';
      return;
    }

    if (!csrfToken) {
      uploadMessage = 'Token CSRF indisponible. Rechargez la page.';
      uploadMessageType = 'error';
      return;
    }

    const formData = new FormData();
    formData.append('file', selectedFile);

    uploadLoading = true;
    uploadMessage = '';

    try {
      await axios.post('/api/docs/upload', formData, {
        headers: {
          'Content-Type': 'multipart/form-data',
          'X-CSRF-Token': csrfToken
        },
        withCredentials: true
      });

      uploadMessage = 'Fichier envoyé à n8n. Traitement en cours...';
      uploadMessageType = 'success';
      selectedFile = null;
    } catch (error) {
      uploadMessage =
        error.response?.data?.error || "Erreur lors de l'envoi du fichier.";
      uploadMessageType = 'error';
    } finally {
      uploadLoading = false;
    }
  }

  async function sendChatMessage() {
    if (!chatInput.trim()) {
      chatMessage = 'Veuillez saisir une question.';
      return;
    }

    if (!csrfToken) {
      chatMessage = 'Token CSRF indisponible. Rechargez la page.';
      return;
    }

    const userMessage = {
      from: 'Vous',
      text: chatInput
    };

    chatHistory = [...chatHistory, userMessage];
    chatLoading = true;
    chatMessage = '';

    try {
      const response = await axios.post(
        '/api/agent/chat',
        { message: chatInput },
        {
          headers: {
            'X-CSRF-Token': csrfToken
          },
          withCredentials: true
        }
      );

      const agentReply = {
        from: 'Agent IA',
        text: response.data?.answer || 'Réponse reçue.'
      };

      chatHistory = [...chatHistory, agentReply];
      chatInput = '';
    } catch (error) {
      chatMessage =
        error.response?.data?.error ||
        "Erreur lors de l'envoi de la question à l'agent.";
    } finally {
      chatLoading = false;
    }
  }
</script>

<!-- Composant invisible pour récupérer le token CSRF -->
<Securecsrf on:csrfTokenReceived={handleCsrfTokenReceived} />

<Navbar />

<div class="board-container">
  <div class="board-columns">
    <section class="board-card upload-card">
      <h2>Envoyer un document à n8n</h2>
      {#if uploadMessage}
        <div class="message message-{uploadMessageType}">
          {uploadMessage}
        </div>
      {/if}
      <div class="upload-body">
        <label class="file-label">
          <input type="file" accept="application/pdf" on:change={handleFileChange} />
          {#if selectedFile}
            <span>{selectedFile.name}</span>
          {:else}
            <span>Sélectionner un fichier PDF</span>
          {/if}
        </label>
        <button
          class="submit-btn"
          on:click={uploadDocument}
          disabled={uploadLoading}
        >
          {uploadLoading ? 'Transmission en cours...' : 'Envoyer vers n8n'}
        </button>
      </div>
      <p class="helper-text">
        Le document sera pris en charge par n8n pour extraction et analyse.
      </p>
    </section>

    <section class="board-card chat-card">
      <h2>Chat avec l’agent IA</h2>

      <div class="chat-history">
        {#if chatHistory.length === 0}
          <div class="chat-placeholder">
            Posez une question pour interroger l’agent après traitement du document.
          </div>
        {:else}
          {#each chatHistory as item, index}
            <div class="chat-message {item.from === 'Vous' ? 'from-user' : 'from-agent'}" >
              <div class="sender">{item.from}</div>
              <p>{item.text}</p>
            </div>
          {/each}
        {/if}
      </div>

      <div class="chat-input">
        <textarea
          rows="2"
          bind:value={chatInput}
          placeholder="Posez votre question à l’agent IA…"
          disabled={chatLoading}
        ></textarea>
        <button
          class="submit-btn"
          on:click={sendChatMessage}
          disabled={chatLoading}
        >
          {chatLoading ? 'Envoi...' : 'Envoyer'}
        </button>
      </div>
      {#if chatMessage}
        <div class="message message-error">
          {chatMessage}
        </div>
      {/if}
    </section>
  </div>
</div>

<style>
  .board-container {
    min-height: 100vh;
    padding: 40px 20px;
    background: linear-gradient(135deg, #242830 0%, #111c2d 100%);
  }

  .board-columns {
    display: flex;
    gap: 24px;
    max-width: 1200px;
    margin: 0 auto;
    flex-wrap: wrap;
  }

  .board-card {
    background: #0f172a;
    border: 1px solid rgba(255, 255, 255, 0.08);
    padding: 32px;
    border-radius: 16px;
    box-shadow: 0 20px 45px rgba(0, 0, 0, 0.55);
    flex: 1;
    min-width: 320px;
  }

  .upload-card {
    flex: 0.9;
  }

  .chat-card {
    flex: 1.1;
    display: flex;
    flex-direction: column;
  }

  h2 {
    margin: 0 0 24px 0;
    color: #f8fafc;
    font-size: 24px;
    text-align: center;
    font-weight: 600;
    letter-spacing: 0.02em;
  }

  .upload-body {
    display: flex;
    flex-direction: column;
    gap: 16px;
  }

  .file-label {
    border: 1px dashed rgba(255, 255, 255, 0.3);
    border-radius: 12px;
    padding: 18px;
    color: #cbd5f5;
    text-align: center;
    cursor: pointer;
    transition: border-color 0.3s, color 0.3s;
  }

  .file-label:hover {
    border-color: rgba(255, 255, 255, 0.6);
    color: #fff;
  }

  .file-label input {
    display: none;
  }

  .helper-text {
    margin-top: 16px;
    font-size: 14px;
    color: rgba(255, 255, 255, 0.6);
    text-align: center;
  }

  .submit-btn {
    width: 100%;
    padding: 14px;
    background: linear-gradient(135deg, #0ea5e9 0%, #2563eb 100%);
    color: white;
    border: none;
    border-radius: 10px;
    font-size: 16px;
    font-weight: 600;
    cursor: pointer;
    transition: opacity 0.3s, transform 0.2s;
  }

  .submit-btn:hover:not(:disabled) {
    opacity: 0.95;
    transform: translateY(-1px);
  }

  .submit-btn:disabled {
    opacity: 0.6;
    cursor: not-allowed;
    transform: none;
  }

  .message {
    padding: 14px 16px;
    border-radius: 10px;
    margin-bottom: 16px;
    font-size: 14px;
    text-align: center;
  }

  .message-success {
    background-color: rgba(34, 197, 94, 0.2);
    color: #bbf7d0;
    border: 1px solid rgba(34, 197, 94, 0.3);
  }

  .message-error {
    background-color: rgba(239, 68, 68, 0.15);
    color: #fecaca;
    border: 1px solid rgba(239, 68, 68, 0.3);
  }

  .chat-history {
    flex: 1;
    background: rgba(15, 23, 42, 0.6);
    border: 1px solid rgba(148, 163, 184, 0.2);
    border-radius: 12px;
    padding: 16px;
    overflow-y: auto;
    margin-bottom: 16px;
    max-height: 400px;
  }

  .chat-placeholder {
    color: rgba(226, 232, 240, 0.6);
    font-style: italic;
    text-align: center;
  }

  .chat-message {
    margin-bottom: 14px;
    padding: 12px;
    border-radius: 10px;
  }

  .chat-message .sender {
    font-size: 12px;
    text-transform: uppercase;
    letter-spacing: 0.05em;
    margin-bottom: 6px;
    opacity: 0.8;
  }

  .chat-message p {
    margin: 0;
    line-height: 1.4;
  }

  .chat-message.from-user {
    background: rgba(14, 165, 233, 0.15);
    border: 1px solid rgba(14, 165, 233, 0.4);
    color: #bae6fd;
  }

  .chat-message.from-agent {
    background: rgba(99, 102, 241, 0.15);
    border: 1px solid rgba(99, 102, 241, 0.4);
    color: #e0e7ff;
  }

  .chat-input {
    display: flex;
    flex-direction: column;
    gap: 12px;
  }

  .chat-input textarea {
    width: 100%;
    padding: 12px;
    border-radius: 10px;
    border: 1px solid rgba(148, 163, 184, 0.3);
    background: rgba(15, 23, 42, 0.6);
    color: #f8fafc;
    resize: none;
    font-size: 14px;
    font-family: inherit;
  }

  .chat-input textarea:focus {
    outline: none;
    border-color: rgba(59, 130, 246, 0.7);
  }

  @media (max-width: 991px) {
    .board-columns {
      flex-direction: column;
    }

    .board-card {
      min-width: auto;
    }
  }
</style>
