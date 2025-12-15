<script>
    import axios from "axios";
    import Securecsrf from "../security/module_csrf/Securecsrf.svelte";
    import Navbar_login from "../module_navbar_login/Navbar_login.svelte";
    let email = "";
    let password = "";
    let loading = false;
    let message = "";
    let messageType = "";
    let csrfToken = null;
    let showPassword = false;
    let passwordInput;
    let attemptsInfo = null;
    
    // Variable réactive pour détecter si l'utilisateur écrit dans les inputs
    $: isTyping = email.length > 0 || password.length > 0;

    function handleCsrfTokenReceived(event) {
        csrfToken = event.detail;
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
<Navbar_login />
<div class=" container-login-form-description">
   
    <div class="container-login-form-description-text">
        <!-- <p class="italiana-regular">Connexion à Vitalinfo</p> -->
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
        <div class="electric-card">
            <svg class="electric-card__svg" aria-hidden="true">
                <defs>
                    <filter id="electric-borders" color-interpolation-filters="sRGB" x="-20%" y="-20%" width="140%" height="140%">
                        <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise1" seed="1" />
                        <feOffset in="noise1" dx="0" dy="0" result="offsetNoise1">
                            <animate attributeName="dy" values="640;0" dur="6s" repeatCount="indefinite" calcMode="linear" />
                        </feOffset>
                        <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise2" seed="1" />
                        <feOffset in="noise2" dx="0" dy="0" result="offsetNoise2">
                            <animate attributeName="dy" values="0;-640" dur="6s" repeatCount="indefinite" calcMode="linear" />
                        </feOffset>
                        <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise3" seed="5" />
                        <feOffset in="noise3" dx="0" dy="0" result="offsetNoise3">
                            <animate attributeName="dx" values="560;0" dur="6s" repeatCount="indefinite" calcMode="linear" />
                        </feOffset>
                        <feTurbulence type="turbulence" baseFrequency="0.02" numOctaves="10" result="noise4" seed="8" />
                        <feOffset in="noise4" dx="0" dy="0" result="offsetNoise4">
                            <animate attributeName="dx" values="0;-560" dur="6s" repeatCount="indefinite" calcMode="linear" />
                        </feOffset>
                        <feComposite in="offsetNoise1" in2="offsetNoise2" result="verticalFlow" />
                        <feComposite in="offsetNoise3" in2="offsetNoise4" result="horizontalFlow" />
                        <feBlend in="verticalFlow" in2="horizontalFlow" mode="screen" result="flowNoise" />
                        <feDisplacementMap in="SourceGraphic" in2="flowNoise" scale="40" xChannelSelector="R" yChannelSelector="B" />
                    </filter>
                </defs>
            </svg>
            <div class="electric-card__border">
                <div class="electric-card__panel"></div>
            </div>
            <div class="electric-card__glow electric-card__glow--primary"></div>
            <div class="electric-card__glow electric-card__glow--secondary"></div>
            <div class="electric-card__overlay electric-card__overlay--one"></div>
            <div class="electric-card__overlay electric-card__overlay--two"></div>
            <div class="electric-card__background"></div>

            <div class="electric-card__content">
                <div class="login-form__badge">Vitalinfo Agent</div>
                <div class="robot-login" role="img" aria-label="robot_login" title="robot_login">
                    <img 
                        src="/robot_login.png" 
                        alt="robot" 
                        title="robot_login"
                        class:bright={isTyping}
                    />
                </div>

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


    .container-login-form-description-text {
        font-size: clamp(18px, 2.5vw, 24px);
        font-weight: bold;
        margin-bottom: 20px;
        color: #333;
        width: 100%;
        padding: 4%;
    }
    .ia-agent-demo {
        border:  #43C1FF 4px solid;
            margin: 1.5rem 0 1.5rem 0;
            background: linear-gradient(120deg, #837e92, #D5CFE8), #D5CFE8;
            border-radius: 15px;
            padding: 1.2rem 1rem;
            line-height: 1.5;
            color: #133751;
            width: 100%;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5) inset;
            padding: 5%;
        }

   
        .ia-agent-demo h3 {
            margin-top: 0;
            font-size:clamp(1.2rem, 9vw, 3.1rem); 
            color: #133751;
            font-weight: 700;
            text-shadow: 0 0 20px #43c0ffd4;
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
            background: #ffffff3f;
            padding: 0.6em 0.7em;
            border-radius: 6px;
            border: 3px solid #070B14;
            font-size: 0.97em;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5) inset;
        }
        .ia-demo-ex span {
            font-weight: 600;
            color: #008c99;
            width: 2rem;
            height: 2rem;
        }
        .robot-login {
            display: flex;
            justify-content: center;
            align-items: center;
            width: 100%;
            /* margin: 0 auto 1rem auto; */
        }
        .robot-login img {
            width: 7rem;
            height: 7rem;
            display: block;
            filter: 
                drop-shadow(0px -5px 8px rgba(141, 230, 238, 0.861))
                drop-shadow(10px 10px 12px rgba(19, 55, 81, 0.3))
                drop-shadow(12px 12px 15px rgba(0, 0, 0, 0.2))
                brightness(1.1);
            transition: filter 0.3s ease;
        }
        .robot-login img.bright {
            filter: 
                drop-shadow(0px -5px 8px rgba(141, 230, 238, 0.861))
                drop-shadow(10px 10px 12px rgba(19, 55, 81, 0.3))
                drop-shadow(12px 12px 15px rgba(0, 0, 0, 0.2))
                brightness(2);
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
        width: 100%;
        max-width: 420px;
        margin-top: 0px;
        position: relative;
    }

    @keyframes electricPulse {
        0% {
            opacity: 0.75;
        }
        50% {
            opacity: 0.3;
        }
        100% {
            opacity: 0.75;
        }
    }

    @keyframes electricSweep {
        0% {
            background-position: 0% 50%;
        }
        100% {
            background-position: 200% 50%;
        }
    }

    @keyframes cardDrift {
        0% {
            transform: translateY(0);
        }
        50% {
            transform: translateY(-8px);
        }
        100% {
            transform: translateY(0);
        }
    }

    .electric-card {
        --electric-border-color: #5bd3ff;
        --electric-light-color: color-mix(in srgb, var(--electric-border-color) 60%, #ffffff 40%);
        --electric-dark: rgba(3, 11, 28, 0.95);
        padding: 2px;
        border-radius: 28px;
        position: relative;
        background: linear-gradient(
                -30deg,
                color-mix(in srgb, var(--electric-border-color) 50%, transparent),
                transparent,
                color-mix(in srgb, var(--electric-border-color) 50%, transparent)
            ),
            linear-gradient(to bottom, rgba(4, 12, 32, 0.95), rgba(4, 12, 32, 0.95));
        box-shadow: 0 12px 60px rgba(8, 21, 45, 0.7);
        isolation: isolate;
    }

    .electric-card__svg {
        position: absolute;
        width: 0;
        height: 0;
        visibility: hidden;
    }

    .electric-card__border {
        border: 2px solid rgba(91, 211, 255, 0.4);
        border-radius: 24px;
        padding-right: 4px;
        padding-bottom: 4px;
    }

    .electric-card__panel {
        width: 100%;
        min-height: 520px;
        border-radius: 24px;
        border: 2px solid var(--electric-border-color);
        margin-top: -4px;
        margin-left: -4px;
        filter: url(#electric-borders);
    }

    .electric-card__glow {
        position: absolute;
        inset: 0;
        border-radius: 24px;
        pointer-events: none;
        z-index: 2;
    }

    .electric-card__glow--primary {
        border: 2px solid rgba(91, 211, 255, 0.8);
        filter: blur(1px);
        animation: electricPulse 3s ease-in-out infinite;
    }

    .electric-card__glow--secondary {
        border: 2px solid rgba(255, 255, 255, 0.35);
        filter: blur(6px);
        animation: electricPulse 5s ease-in-out infinite;
    }

    .electric-card__overlay {
        position: absolute;
        inset: 0;
        border-radius: 24px;
        mix-blend-mode: screen;
        opacity: 0.7;
        pointer-events: none;
        z-index: 3;
    }

    .electric-card__overlay--one,
    .electric-card__overlay--two {
        background: linear-gradient(
            -30deg,
            rgba(255, 255, 255, 0.8),
            rgba(91, 211, 255, 0.4),
            transparent 45%,
            transparent 65%,
            rgba(255, 255, 255, 0.7)
        );
        filter: blur(18px);
        transform: scale(1.05);
        background-size: 200% 200%;
        animation: electricSweep 6s linear infinite;
    }

    .electric-card__overlay--two {
        opacity: 0.35;
    }

    .electric-card__background {
        position: absolute;
        inset: 0;
        border-radius: 24px;
        transform: scale(1.08);
        filter: blur(30px);
        opacity: 0.4;
        background: linear-gradient(
            140deg,
            rgba(91, 211, 255, 0.6),
            rgba(255, 255, 255, 0.05),
            rgba(91, 211, 255, 0.4)
        );
        z-index: 1;
    }

    .electric-card__content {
        position: absolute;
    inset: 12px;
    border-radius: 20px;
    padding: 2rem 3rem 3rem;
    display: flex;
    flex-direction: column;
    background: linear-gradient(120deg, #595565, #d5cfe875), #D5CFE8;
    color: #f3fbff;
    text-shadow: 0 0 20px rgba(2, 191, 255, 0.18);
    border: 1px solid rgba(91, 211, 255, 0.08);
    backdrop-filter: blur(6px);
    box-shadow: inset 0 0 35px rgba(0, 140, 255, 0.08);
    z-index: 5;
    }

    .login-form__badge {
        text-align: center;
        padding: 0.75rem 1rem;
        border-radius: 12px;
        text-transform: uppercase;
        letter-spacing: 0.08em;
        font-size: 0.9rem;
        font-weight: 600;
        color: #e5f6ff;
        border: 1px solid rgba(91, 211, 255, 0.6);
        background: linear-gradient(
            120deg,
            rgba(91, 211, 255, 0.2),
            rgba(255, 255, 255, 0.02)
        );
        box-shadow: 0 0 30px rgba(91, 211, 255, 0.35);
        margin-bottom: 1.5rem;
    }



    .form-group {
        margin-bottom: 20px;
    }

    label {
        display: block;
        margin-bottom: 8px;
        color: #c4d8ff;
        font-weight: 600;
        font-size: clamp(12px, 1.5vw, 14px);
    }

    input {
        width: 100%;
        padding: 12px;
        border: 2px solid rgba(85, 159, 255, 0.5);
        border-radius: 10px;
        font-size: clamp(14px, 1.8vw, 16px);
        font-family: inherit;
        transition: border-color 0.3s, background 0.3s;
        box-sizing: border-box;
        background: rgba(7, 19, 40, 0.65);
        color: #f4fcff;
        box-shadow: 0 0 15px rgba(0, 198, 255, 0.15) inset;
    }

    input::placeholder {
        color: rgba(179, 207, 255, 0.7);
    }

    input:focus {
        outline: none;
        border-color: rgba(91, 211, 255, 0.9);
        background: rgba(6, 28, 58, 0.75);
        box-shadow: 0 0 20px rgba(91, 211, 255, 0.25) inset;
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
        background: linear-gradient(120deg, #008dff, #5bd3ff);
        color: #0e1428;
        border: none;
        border-radius: 10px;
        font-size: clamp(14px, 1.8vw, 16px);
        font-weight: 700;
        cursor: pointer;
        transition: opacity 0.3s, transform 0.2s;
        margin-top: 10px;
        box-shadow: 0 12px 25px rgba(0, 141, 255, 0.35);
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
        position: absolute;
        top: -8%;
        left: 50%;
        transform: translate(-50%, -50%);
        padding: 12px 16px;
        border-radius: 8px;
        margin-bottom: 20px;
        font-size: clamp(12px, 1.5vw, 14px);
        text-align: center;
    }

    .message-success {
        background-color: rgba(0, 179, 138, 0.16);
        color: #00f5c7;
        border: 1px solid rgba(0, 245, 199, 0.35);
    }

    .message-error {
        background-color: rgba(255, 108, 123, 0.344);
        color: #ff7b8b;
        border: 1px solid rgba(255, 123, 139, 0.35);
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
            max-width: 100%;
            min-width: auto;
            margin: 0 10px 10px;
        }

        .electric-card {
            animation: none;
        }

        .electric-card__panel {
            filter: none;
            border: 2px solid rgba(91, 211, 255, 0.6);
            box-shadow: inset 0 0 10px rgba(91, 211, 255, 0.18);
        }

        .electric-card__glow,
        .electric-card__overlay,
        .electric-card__background {
            animation: none;
        }

        .electric-card__overlay--one,
        .electric-card__overlay--two {
            background-position: 50% 50%;
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

     @media (max-width: 576px) {
        .container-login-form-description {
            padding:8% 0% 0% 0%;
        }
        .ia-agent-demo {
            margin: 1.5rem 0 1.5rem 0;
            background: linear-gradient(120deg, #837e92, #D5CFE8), #D5CFE8;
            border-radius: 0px 0px 8px 8px;
            padding: 1.2rem 1rem;
            line-height: 1.5;
            color: #133751;
            width: 100%;
            box-shadow: 0 0 20px rgba(0, 0, 0, 0.5) inset;
            padding: 2%;
        }
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
            max-width: 100%;
            min-width: auto;
            margin: 0 10px;
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
