<script>
    import axios from "axios";
    import Securecsrf from "../security/module_csrf/Securecsrf.svelte";

    let email = "";
    let password = "";
    let loading = false;
    let message = "";
    let messageType = "";
    let csrfToken = null;
    let showPassword = false;
    let passwordInput;
    let attemptsInfo = null;

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

    function validateEmail(email) {
        const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
        return emailRegex.test(email);
    }

    async function handleLogin() {
        const trimmedEmail = email.trim();
        const trimmedPassword = password.trim();

        if (!trimmedEmail || !trimmedPassword) {
            message = "Veuillez remplir tous les champs";
            messageType = "error";
            return;
        }

        if (!validateEmail(trimmedEmail)) {
            message = "Format d'email invalide";
            messageType = "error";
            return;
        }

        if (trimmedEmail.length > 255) {
            message = "Email trop long";
            messageType = "error";
            return;
        }

        if (trimmedPassword.length > 128) {
            message = "Mot de passe trop long";
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
                    email: trimmedEmail.toLowerCase(),
                    password: trimmedPassword,
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
                attemptsInfo = null; // Réinitialiser les tentatives après succès
                // Rediriger ou mettre à jour l'état de l'application
                setTimeout(() => {
                    window.location.reload();
                }, 1000);
            }
        } catch (error) {
            message =
                error.response?.data?.error || "Erreur lors de la connexion";
            messageType = "error";
            // Récupérer les infos de tentatives si disponibles
            attemptsInfo = error.response?.data?.attemptsInfo || null;
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
        <h3 class="italiana_regular_sans_serif">  l’agent IA administratif</h3>
        <ul>
            <li class="italiana_regular_sans_serif"><strong>Classe les documents</strong> automatiquement</li>
            <li class="italiana_regular_sans_serif"><strong>Stocke en base de données</strong> pour une organisation parfaite</li>
            <li class="italiana_regular_sans_serif"><strong>Répondez à vos questions</strong> sur les documents (“Où est la facture EDF ?”, “Combien de dépenses en 2023 ?”…)</li>
        </ul>
        <div class="ia-demo-ex">
            <span class="italiana-regular">Exemple :</span>
            <div class="ia-question">Q : Quels documents sont liés aux assurances ?</div>
            <div class="ia-reponse share-tech-regular ">R : 3 documents trouvés : “Contrat Assurance Auto.pdf”, “Facture Mutuelle 2024.pdf”, “Reçu Maison Assurée.jpg”…</div>
        </div>
    </div>

    </div>

    <div class="login-form">
        <h2>
        <span aria-label="robot-smiley" title="robot" style="font-size:2rem;vertical-align:middle;">🤖</span>
        </h2>

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
                <div class="password-input-wrapper">
                <input
                    type="password"
                    id="password"
                        bind:this={passwordInput}
                    bind:value={password}
                    placeholder="••••••••"
                    required
                    disabled={loading}
                    autocomplete="current-password"
                />
                    <button
                        type="button"
                        class="password-toggle"
                        on:click={() => {
                            showPassword = !showPassword;
                            if (passwordInput) {
                                passwordInput.type = showPassword ? "text" : "password";
                            }
                        }}
                        disabled={loading}
                        aria-label={showPassword ? "Masquer le mot de passe" : "Afficher le mot de passe"}
                    >
                        {#if showPassword}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M17.94 17.94A10.07 10.07 0 0 1 12 20c-7 0-11-8-11-8a18.45 18.45 0 0 1 5.06-5.94M9.9 4.24A9.12 9.12 0 0 1 12 4c7 0 11 8 11 8a18.5 18.5 0 0 1-2.16 3.19m-6.72-1.07a3 3 0 1 1-4.24-4.24"></path>
                                <line x1="1" y1="1" x2="23" y2="23"></line>
                            </svg>
                        {:else}
                            <svg xmlns="http://www.w3.org/2000/svg" width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round">
                                <path d="M1 12s4-8 11-8 11 8 11 8-4 8-11 8-11-8-11-8z"></path>
                                <circle cx="12" cy="12" r="3"></circle>
                            </svg>
                        {/if}
                    </button>
                </div>
            </div>

            <button type="submit" disabled={loading} class="submit-btn">
                {loading ? "Connexion..." : "Se connecter"}
            </button>
        </form>

        {#if attemptsInfo && attemptsInfo.attempts > 0}
            <div class="attempts-info">
                {#if attemptsInfo.blocked}
                    <span class="attempts-blocked">⚠️ IP bloquée - Réessayez dans {attemptsInfo.remainingMinutes} min</span>
                {:else}
                    <span class="attempts-warning">⚠️ {attemptsInfo.remaining} / 5 tentatives restantes</span>
                {/if}
            </div>
        {/if}
    </div>

</div>

<style>
    .italiana-regular {
  font-family: "Italiana", sans-serif;
  font-weight: 600;
  font-style: normal;
}
.italiana_regular_sans_serif {
  font-family: "Italiana";
  font-weight: 400;
  font-style: normal;
}
.share-tech-regular {
  font-family: "Share Tech";
  font-weight: 400;
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
        color: #33333394;
        text-shadow: 3px 3px rgba(169, 215, 222, 0.8), 0 0 15px rgba(89, 135, 146, 0.5);
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
            color: #133751;
            width: 100%;
        }

   
        .ia-agent-demo h3 {
            margin-top: 0;
            font-size:clamp(1.2rem, 9vw, 3.1rem); 
            color: #133751;
            font-weight: 700;
            text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
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
            border: 3px solid #070B14;
            font-size: 0.97em;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5) inset;
        }
        .ia-demo-ex span {
            font-weight: 600;
            color: #008c99;
        }
        .ia-question {
            margin-top: 0.25em;
            font-weight: 500;
            color: #996a05;
            font-weight: 600;
        }
        .ia-reponse {
            margin-top: 0.25em;
            color: #4a9d23;
            font-weight: 600;
        }
    .login-form {
        position: relative;
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
    .login-form::after {
        content: "Vitalinfo Agent IA";
        position: absolute;
        display: flex;
        align-items: center;
        justify-content: center;
        top: 0;
        left: 0;
        width: 100%;
        height: 15%;
        background: #020024;
        border-radius: 12px 12px 0 0;
        font-size: 18px;
        font-weight: 600;
        color: white;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
    }

    h2 {
        margin: 25px 0 25px 0;
        color: #598792;
        font-size: clamp(22px, 3vw, 28px);
        text-align: center;
        text-shadow: 2px 2px 4px rgba(0, 0, 0, 0.5);
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
        border: 2px solid #070B14;
        border-radius: 8px;
        font-size: clamp(14px, 1.8vw, 16px);
        font-family: inherit;
        transition: border-color 0.3s;
        box-sizing: border-box;
        box-shadow: 0 0 10px rgba(0, 0, 0, 0.5) inset;
  
    }

    input::placeholder {
        color: #5a70a3;
    }

    input:focus {
        outline: none;
        border-color: #667eea;
    }

    input:disabled {
        background-color: #f5f5f5;
        cursor: not-allowed;
    }

    .password-input-wrapper {
        position: relative;
        display: flex;
        align-items: center;
    }

    .password-input-wrapper input {
        padding-right: 45px;
    }

    .password-toggle {
        position: absolute;
        right: 12px;
        background: none;
        border: none;
        cursor: pointer;
        padding: 4px;
        display: flex;
        align-items: center;
        justify-content: center;
        color: #666;
        transition: color 0.3s, transform 0.2s;
        z-index: 1;
    }

    .password-toggle:hover:not(:disabled) {
        color: #667eea;
        transform: scale(1.1);
    }

    .password-toggle:disabled {
        opacity: 0.5;
        cursor: not-allowed;
    }

    .password-toggle:focus {
        outline: 2px solid #667eea;
        outline-offset: 2px;
        border-radius: 4px;
    }

    .password-toggle svg {
        display: block;
    }

    .submit-btn {
        width: 100%;
        padding: 14px;
        background: #020024;
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

    .attempts-info {
        margin-top: 10px;
        text-align: center;
    }

    .attempts-warning {
        color: #856404;
        font-size: clamp(10px, 1vw, 11px);
        font-weight: 400;
    }

    .attempts-blocked {
        color: #721c24;
        font-size: clamp(10px, 1vw, 11px);
        font-weight: 400;
    }

    /* Mobile (jusqu'à 576px) */
    @media (max-width: 575.98px) {
        .container-login-form-description {
            margin-top: 10vh;
            height: 90%;
            
        }
        
        .login-form {
            padding: 40px;
            max-width: 100%;
            min-width: auto;
            margin: 0 10px;
            height: 23%;
            margin-bottom: 10px;
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
        width: 60%;
    }
        
    }

    /* Extra Large Desktop (1440px et plus) */
    @media (min-width: 1440px) {
        .container-login-form-description-text {
        font-size: 24px;
        font-weight: bold;
        margin-bottom: 20px;
        width: 60%;
    }
    }
</style>
