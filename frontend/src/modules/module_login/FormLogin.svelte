<script>
    import axios from "axios";
    import Securecsrf from "../security/module_csrf/Securecsrf.svelte";

    let email = "";
    let password = "";
    let loading = false;
    let message = "";
    let messageType = "";
    let csrfToken = null;

    function handleCsrfTokenReceived(event) {
        console.log("📥 FormLogin - Événement csrfTokenReceived reçu");
        console.log("📥 FormLogin - event:", event);
        console.log("📥 FormLogin - event.detail:", event.detail);
        csrfToken = event.detail;
        console.log(
            "📥 FormLogin - Token CSRF assigné:",
            csrfToken ? "Oui (" + csrfToken + ")" : "Non"
        );
    }

    async function handleLogin() {
        if (!email.trim() || !password.trim()) {
            message = "Veuillez remplir tous les champs";
            messageType = "error";
            return;
        }

        if (!csrfToken) {
            message = "Token CSRF non disponible. Veuillez recharger la page.";
            messageType = "error";
            return;
        }

        loading = true;
        message = "";

        try {
            const response = await axios.post(
                "/api/auth/login",
                {
                    email,
                    password,
                },
                {
                    headers: {
                        "X-CSRF-Token": csrfToken,
                    },
                    withCredentials: true,
                }
            );

            if (response.data.success) {
                message = "Connexion réussie !";
                messageType = "success";
                // Rediriger ou mettre à jour l'état de l'application
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } catch (error) {
            message =
                error.response?.data?.error || "Erreur lors de la connexion";
            messageType = "error";
        } finally {
            loading = false;
        }
    }
</script>

<!-- Composant invisible pour récupérer le token CSRF -->
<Securecsrf on:csrfTokenReceived={handleCsrfTokenReceived} />
<div class=" container-login-form-description">
   
    <div class="container-login-form-description-text">
        <p class="italiana-regular">Connexion à Vitalinfo</p>
    <div class="ia-agent-demo">
        <h3 class="italiana-regular">  l’agent IA administratif</h3>
        <ul>
            <li class="italiana-regular"><strong>Classe les documents</strong> automatiquement</li>
            <li class="italiana-regular"><strong>Stocke en base de données</strong> pour une organisation parfaite</li>
            <li class="italiana-regular"><strong>Répondez à vos questions</strong> sur les documents (“Où est la facture EDF ?”, “Combien de dépenses en 2023 ?”…)</li>
        </ul>
        <div class="ia-demo-ex">
            <span class="italiana-regular">Exemple :</span>
            <div class="ia-question">Q : Quels documents sont liés aux assurances ?</div>
            <div class="ia-reponse">R : 3 documents trouvés : “Contrat Assurance Auto.pdf”, “Facture Mutuelle 2024.pdf”, “Reçu Maison Assurée.jpg”…</div>
        </div>
    </div>

    </div>

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
                {loading ? "Connexion..." : "Se connecter"}
            </button>
        </form>
    </div>

</div>

<style>
    .italiana-regular {
  font-family: "Italiana", sans-serif;
  font-weight: 600;
  font-style: normal;
}

    .container-login-form-description {
        display: flex;
        align-items: center;
        justify-content: space-around;
        flex-wrap: wrap;
        height: 100%;
        width: 90%;
        background-color: #f0f0f0;
        border-radius: 12px;
        box-shadow: -10px 10px 66px rgba(79, 99, 130, 0.7) inset
    }
    .container-login-form-description p {
        text-align: center;
        margin-bottom: 50px;
        text-decoration: underline #598792;
        text-underline-offset: 8px;
        text-decoration-thickness: 5px;
        color: #333;
        text-shadow: 3px 3px 8px rgba(207, 215, 216, 0.8), 0 0 15px rgba(89, 135, 146, 0.5);
    }
    .container-login-form-description-text {
        font-size: clamp(18px, 2.5vw, 24px);
        font-weight: bold;
        margin-bottom: 20px;
        color: #333;
        width: 100%;
    }
    .ia-agent-demo {
            margin: 1.5rem 0 1.5rem 0;
            background: #f6f5f67f;
            border-radius: 8px;
            padding: 1.2rem 1rem;
            line-height: 1.5;
            color: #0b5082;
            width: 100%;
        }

   
        .ia-agent-demo h3 {
            margin-top: 0;
            font-size:clamp(1.2rem, 9vw, 3.1rem); 
            color: #598792;
            font-weight: 700;
        }
        p {
            font-size:clamp(1.2rem, 9vw, 3.1rem); 
        }
        .ia-agent-demo ul {
            margin: 0.3em 0 0.6em 1.2em;
            padding: 0;
        }
        .ia-agent-demo li {
            margin-bottom: 0.3em;
            font-size:clamp(1.2rem, 6vw, 0.5rem); 
        }
        .ia-demo-ex {
            margin-top: 0.9em;
            background: #635b653f;
            padding: 0.6em 0.7em;
            border-radius: 6px;
            font-size: 0.97em;
        }
        .ia-demo-ex span {
            font-weight: 600;
            color: #008c99;
        }
        .ia-question {
            margin-top: 0.25em;
            font-weight: 500;
            color: #4c3502;
        }
        .ia-reponse {
            margin-top: 0.25em;
            color: #256616;
        }
    .login-form {
    background: white;
    padding: 40px;
    border-radius: 12px;
    box-shadow: 0 10px 40px rgba(0, 0, 0, 0.2);
    width: 100%;
    max-width: 400px;
    min-width: 300px;
    height: 45%;
    margin-top: 50px;
    }

    h2 {
        margin: 0 0 30px 0;
        color: #553939;
        font-size: clamp(22px, 3vw, 28px);
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
        font-size: clamp(12px, 1.5vw, 14px);
    }

    input {
        width: 100%;
        padding: 12px;
        border: 2px solid #e0e0e0;
        border-radius: 8px;
        font-size: clamp(14px, 1.8vw, 16px);
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
        font-size: clamp(14px, 1.8vw, 16px);
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
        font-size: clamp(12px, 1.5vw, 14px);
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

    /* Mobile (jusqu'à 576px) */
    @media (max-width: 575.98px) {
        .container-login-form-description {
            margin-top: 10vh;
            height: 90%;
        }
        
        .login-form {
            padding: 20px;
            max-width: 100%;
            min-width: auto;
            margin: 0 10px;
            height: 23%;
        }
        
        h2 {
            font-size: 22px;
            margin-bottom: 20px;
        }
        
        input {
            padding: 10px;
            font-size: 14px;
        }
        
        .submit-btn {
            padding: 12px;
            font-size: 14px;
        }
    }

    /* Tablet (576px - 768px) */
    @media (min-width: 576px) and (max-width: 767.98px) {
        
    }

    /* Desktop (768px - 1024px) */
    @media (min-width: 768px) and (max-width: 1023.98px) {
        .container-login-form-description {
            height: 90%;
            font-size: 14px;
        }
        .container-login-form-description-text {
            font-size: 14px;

        }
        .login-form {
            padding: 10px;
            max-width: 100%;
            min-width: auto;
            margin: 0 10px;
            height: 23%;
        }
    }

    /* Large Desktop (1024px - 1440px) */
    @media (min-width: 1024px) and (max-width: 1439.98px) {
        .container-login-form-description-text {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 20px;
        color: #333;
        width: 60%;
    }
        
    }

    /* Extra Large Desktop (1440px et plus) */
    @media (min-width: 1440px) {
        .container-login-form-description-text {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 20px;
        color: #333;
        width: 60%;
    }
    }
</style>
