<svelte:head>
  <link rel="preconnect" href="https://fonts.googleapis.com" />
  <link
    href="https://fonts.googleapis.com/css2?family=Space+Mono:wght@400;700&family=DM+Sans:opsz,wght@9..40,300;9..40,400;9..40,500&display=swap"
    rel="stylesheet"
  />
</svelte:head>

<script>
  import { onMount } from 'svelte';
  import FormLogin from '../module_login/FormLogin.svelte';

  onMount(() => {
    document.body.classList.add('vitalinfo-landing');

    const observer = new IntersectionObserver(
      (entries) => {
        entries.forEach((e) => {
          if (e.isIntersecting) {
            e.target.classList.add('visible');
            observer.unobserve(e.target);
          }
        });
      },
      { threshold: 0.12 }
    );
    document.querySelectorAll('.reveal').forEach((el) => observer.observe(el));

    return () => {
      document.body.classList.remove('vitalinfo-landing');
      observer.disconnect();
    };
  });

  const features = [
    {
      tag: 'DOC',
      title: 'Classe les documents automatiquement',
      desc: 'Automatique — sans tri manuel dossier par dossier.',
    },
    {
      tag: 'DB',
      title: 'Stocke en base de données',
      desc: 'pour une organisation parfaite',
    },
    {
      tag: 'QA',
      title: 'Répondez à vos questions sur les documents',
      desc: '« Où est la facture EDF ? », « Combien de dépenses en 2023 ? »…',
    },
  ];

  const stack = [
    { name: 'Node.js', hl: true },
    { name: 'Express', hl: true },
    { name: 'Svelte', hl: true },
    { name: 'PostgreSQL', hl: false },
    { name: 'JWT + CSRF', hl: true },
    { name: 'Axios', hl: false },
  ];
</script>

<div class="landing-root" id="top">
  <nav>
    <a href="#top" class="nav-logo">vital<span>info</span><span class="dim">;</span></a>
    <div class="nav-links">
      <a href="#features">features</a>
      <a href="#demo">exemple</a>
      <a href="#stack">stack</a>
    </div>
    <div class="nav-actions">
      <a href="#top" class="nav-brand-link" aria-label="Vitalinfo — haut de page">
        <img
          class="nav-brand-logo"
          src="/logo-vitalinfo.png"
          alt="Vitalinfo"
          width="140"
          height="48"
          loading="lazy"
        />
      </a>
    </div>
  </nav>

  <section class="hero">
    <div class="hero-grid"></div>
    <div class="hero-split">
      <div class="hero-copy">
        <div class="hero-badge">// agent IA · documents administratifs</div>
        <h1>l’agent IA administratif</h1>
        <p class="hero-sub">
          Classez, stockez et interrogez vos pièces administratives. Moins de
          recherche manuelle, plus de réponses actionnables.
        </p>
        <div class="hero-actions">
          <a href="#connexion" class="btn-primary">Se connecter</a>
          <a href="#features" class="btn-ghost">Voir les capacités</a>
        </div>
        <div class="hero-code">
          <div><span class="c-g">// initialisation agent</span></div>
          <div><span class="c-b">const</span> agent = <span class="c-b">new</span> <span class="c-a">VitalinfoAgent</span>({'{'}</div>
          <div>&nbsp;&nbsp;mode: <span class="c-s">'admin_docs'</span>,</div>
          <div>&nbsp;&nbsp;storage: <span class="c-s">'postgresql'</span>,</div>
          <div>&nbsp;&nbsp;qa: <span class="c-y">true</span>,</div>
          <div>&nbsp;&nbsp;csrf: <span class="c-y">true</span> <span class="c-g">// requêtes sécurisées</span></div>
          <div>{'}'});</div>
          <div>&nbsp;</div>
          <div><span class="c-g">// ✓ classement · ✓ recherche · ✓ session</span></div>
        </div>
      </div>
      <div class="hero-aside" id="connexion">
        <FormLogin />
      </div>
    </div>
  </section>

  <div class="stats-bar">
    <div class="stat-item">
      <div class="stat-num">IA</div>
      <div class="stat-label">classement &amp; Q&amp;A</div>
    </div>
    <div class="stat-item">
      <div class="stat-num">CSRF</div>
      <div class="stat-label">protection formulaires</div>
    </div>
    <div class="stat-item">
      <div class="stat-num">JWT</div>
      <div class="stat-label">session sécurisée</div>
    </div>
    <div class="stat-item">
      <div class="stat-num">∞</div>
      <div class="stat-label">questions sur vos docs</div>
    </div>
  </div>

  <section id="features">
    <div class="container">
      <div class="reveal">
        <div class="section-label">// 01 — FONCTIONNALITÉS</div>
        <h2>Ce que fait l’agent, concrètement.</h2>
        <p class="section-sub">Les mêmes promesses que ton produit, mais présentées comme une vraie landing.</p>
      </div>
      <div class="features-grid reveal">
        {#each features as f}
          <div class="feat-card">
            <div class="feat-icon">{f.tag}</div>
            <div class="feat-title">{f.title}</div>
            <p class="feat-desc">{f.desc}</p>
          </div>
        {/each}
      </div>
    </div>
  </section>

  <section id="demo" class="demo-section">
    <div class="container">
      <div class="section-label reveal">// 02 — EXEMPLE</div>
      <h2 class="reveal">Interaction type chat sur tes documents.</h2>
      <div class="demo-terminal reveal">
        <div class="terminal-bar">
          <div class="dot dot-r"></div>
          <div class="dot dot-y"></div>
          <div class="dot dot-g"></div>
        </div>
        <div class="terminal-body">
          <div><span class="t-prompt">Q :</span> <span class="t-val">Quels documents sont liés aux assurances ?</span></div>
          <div>&nbsp;</div>
          <div><span class="t-prompt">R :</span> <span class="t-ok">3 documents trouvés :</span></div>
          <div><span class="t-out">  · « Contrat Assurance Auto.pdf »</span></div>
          <div><span class="t-out">  · « Facture Mutuelle 2024.pdf »</span></div>
          <div><span class="t-out">  · « Reçu Maison Assurée.jpg » …</span></div>
        </div>
      </div>
    </div>
  </section>

  <section id="stack" class="stack-section">
    <div class="container">
      <div class="split">
        <div class="reveal">
          <div class="section-label">// 03 — STACK</div>
          <h2>Construit pour tenir en prod.</h2>
          <p class="section-sub">Backend API, front Svelte, auth renforcée — sans surcouche inutile.</p>
          <div class="stack-grid">
            {#each stack as s}
              <span class="stack-pill" class:hl={s.hl}>{s.name}</span>
            {/each}
          </div>
        </div>
        <div class="terminal-block reveal">
          <div class="terminal-bar">
            <div class="dot dot-r"></div>
            <div class="dot dot-y"></div>
            <div class="dot dot-g"></div>
          </div>
          <div class="terminal-body">
            <div><span class="t-prompt">$ </span><span class="t-cmd">vitalinfo status --verbose</span></div>
            <div>&nbsp;</div>
            <div><span class="t-out">api&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span class="t-ok">✓ /api/auth</span></div>
            <div><span class="t-out">csrf&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp;&nbsp; </span><span class="t-ok">✓ token actif</span></div>
            <div><span class="t-out">session&nbsp;&nbsp;&nbsp;&nbsp; </span><span class="t-ok">✓ cookie httpOnly</span></div>
            <div><span class="t-out">agent_docs&nbsp; </span><span class="t-ok">✓ prêt</span></div>
          </div>
        </div>
      </div>
    </div>
  </section>

  <footer>
    <div class="footer-logo">vitalinfo<span class="dim">;</span></div>
    <div class="footer-links">
      <a href="#connexion">Connexion</a>
      <a href="https://codeurbase.fr" target="_blank" rel="noopener noreferrer">codeurbase.fr</a>
    </div>
    <div class="footer-copy">agent IA administratif</div>
  </footer>
</div>

<style>
  :global(html) {
    scroll-behavior: smooth;
  }

  :global(body.vitalinfo-landing) {
    background: #0a0c0f;
    color: #e8eaf0;
    font-family: 'DM Sans', sans-serif;
    font-size: 16px;
    line-height: 1.6;
    overflow-x: hidden;
  }

  :global(body.vitalinfo-landing *) {
    --bg: #0a0c0f;
    --bg2: #111318;
    --bg3: #1a1d24;
    --border: rgba(255, 255, 255, 0.07);
    --border2: rgba(255, 255, 255, 0.13);
    --text: #e8eaf0;
    --muted: #7a7f8e;
    --accent: #5bd3ff;
    --danger: #ff4d6a;
    --mono: 'Space Mono', monospace;
    --sans: 'DM Sans', sans-serif;
  }

  .landing-root {
    min-height: 100vh;
  }

  nav {
    position: fixed;
    top: 0;
    left: 0;
    right: 0;
    z-index: 200;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    padding: 10px 2rem;
    min-height: 72px;
    height: auto;
    gap: 0.75rem;
    background: rgba(10, 12, 15, 0.85);
    backdrop-filter: blur(12px);
    border-bottom: 0.5px solid var(--border);
  }

  @media (max-width: 640px) {
    nav {
      padding: 0.5rem 1rem;
      height: auto;
      min-height: 64px;
      gap: 0.5rem;
    }
    .nav-links {
      order: 2;
    }
    .nav-actions {
      order: 3;
      flex-wrap: wrap;
      flex-basis: 100%;
      justify-content: flex-end;
      padding-top: 0.25rem;
      border-top: 0.5px solid var(--border);
    }

    .nav-brand-logo {
      height: 54px;
      max-width: min(210px, 72vw);
    }
  }

  .nav-logo {
    font-family: var(--mono);
    font-size: 14px;
    color: var(--accent);
    letter-spacing: 0.02em;
    flex-shrink: 0;
    text-decoration: none;
  }

  .nav-logo span {
    color: var(--muted);
  }

  .dim {
    color: rgba(255, 255, 255, 0.15);
  }

  .nav-links {
    display: flex;
    gap: 1.5rem;
    flex-shrink: 0;
  }

  .nav-links a {
    font-family: var(--mono);
    font-size: 12px;
    color: var(--muted);
    text-decoration: none;
    letter-spacing: 0.05em;
    transition: color 0.2s;
  }

  .nav-links a:hover {
    color: var(--text);
  }

  .nav-actions {
    display: flex;
    align-items: center;
    gap: 1rem;
    flex-wrap: wrap;
    flex-shrink: 0;
  }

  .nav-brand-link {
    display: flex;
    align-items: center;
    line-height: 0;
    text-decoration: none;
    opacity: 0.95;
    transition: opacity 0.2s;
  }

  .nav-brand-link:hover {
    opacity: 1;
  }

  .nav-brand-logo {
    display: block;
    height: 56px;
    width: auto;
    max-width: min(220px, 52vw);
    object-fit: contain;
  }

  .hero {
    padding: 108px 2rem 3rem;
    position: relative;
    overflow: hidden;
  }

  .hero-grid {
    position: absolute;
    inset: 0;
    background-image: linear-gradient(rgba(91, 211, 255, 0.05) 1px, transparent 1px),
      linear-gradient(90deg, rgba(91, 211, 255, 0.05) 1px, transparent 1px);
    background-size: 40px 40px;
    mask-image: radial-gradient(ellipse 80% 80% at 50% 40%, black 20%, transparent 100%);
    pointer-events: none;
  }

  .hero-split {
    position: relative;
    z-index: 1;
    max-width: 1100px;
    margin: 0 auto;
    display: grid;
    grid-template-columns: minmax(0, 1fr) minmax(300px, 420px);
    gap: 2.5rem;
    align-items: start;
  }

  @media (max-width: 960px) {
    .hero-split {
      grid-template-columns: 1fr;
    }
    .hero-aside {
      justify-self: center;
      width: 100%;
      max-width: 420px;
    }
  }

  .hero-copy {
    text-align: left;
  }

  .hero-badge {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.12em;
    color: var(--accent);
    border: 0.5px solid rgba(91, 211, 255, 0.35);
    background: rgba(91, 211, 255, 0.06);
    padding: 5px 14px;
    border-radius: 2px;
    margin-bottom: 1.25rem;
    display: inline-block;
    animation: fadeUp 0.6s ease both;
  }

  .hero-copy h1 {
    font-family: var(--mono);
    font-size: clamp(1.75rem, 4vw, 2.6rem);
    font-weight: 700;
    line-height: 1.15;
    letter-spacing: -0.02em;
    color: var(--text);
    max-width: 640px;
    animation: fadeUp 0.6s 0.08s ease both;
  }

  .hero-sub {
    font-size: 1.05rem;
    color: var(--muted);
    max-width: 520px;
    margin: 1rem 0 0;
    font-weight: 300;
    animation: fadeUp 0.6s 0.16s ease both;
  }

  .hero-actions {
    display: flex;
    gap: 1rem;
    margin-top: 1.75rem;
    flex-wrap: wrap;
    animation: fadeUp 0.6s 0.22s ease both;
  }

  .btn-primary {
    font-family: var(--mono);
    font-size: 13px;
    background: var(--accent);
    color: #000;
    border: none;
    padding: 12px 28px;
    border-radius: 3px;
    cursor: pointer;
    text-decoration: none;
    font-weight: 700;
    letter-spacing: 0.04em;
    transition: opacity 0.2s, transform 0.15s;
    display: inline-block;
  }

  .btn-primary:hover {
    opacity: 0.88;
    transform: translateY(-1px);
  }

  .btn-ghost {
    font-family: var(--mono);
    font-size: 13px;
    background: transparent;
    color: var(--text);
    border: 0.5px solid var(--border2);
    padding: 12px 28px;
    border-radius: 3px;
    cursor: pointer;
    text-decoration: none;
    letter-spacing: 0.04em;
    transition: border-color 0.2s;
    display: inline-block;
  }

  .btn-ghost:hover {
    border-color: var(--text);
  }

  .hero-code {
    margin-top: 2rem;
    font-family: var(--mono);
    font-size: 12px;
    background: var(--bg2);
    border: 0.5px solid var(--border2);
    border-radius: 6px;
    padding: 1.25rem 1.5rem;
    line-height: 1.9;
    max-width: 520px;
    animation: fadeUp 0.6s 0.28s ease both;
    position: relative;
  }

  .hero-code::before {
    content: '';
    position: absolute;
    top: -1px;
    left: 24px;
    right: 24px;
    height: 1px;
    background: linear-gradient(90deg, transparent, var(--accent), transparent);
  }

  .c-g {
    color: var(--muted);
  }

  .c-a {
    color: var(--accent);
  }

  .c-b {
    color: #79b8ff;
  }

  .c-s {
    color: #f97583;
  }

  .c-y {
    color: #ffea7f;
  }

  .hero-aside {
    padding-top: 0.25rem;
  }

  .stats-bar {
    border-top: 0.5px solid var(--border);
    border-bottom: 0.5px solid var(--border);
    background: var(--bg2);
    display: flex;
    justify-content: center;
    flex-wrap: wrap;
  }

  .stat-item {
    padding: 1.5rem 2.5rem;
    text-align: center;
    border-right: 0.5px solid var(--border);
  }

  .stat-item:last-child {
    border-right: none;
  }

  .stat-num {
    font-family: var(--mono);
    font-size: 1.65rem;
    font-weight: 700;
    color: var(--accent);
  }

  .stat-label {
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.06em;
    font-family: var(--mono);
    margin-top: 2px;
  }

  section {
    padding: 0;
  }

  .container {
    max-width: 1100px;
    margin: 0 auto;
    padding: 6rem 2rem;
  }

  .demo-section .container {
    padding-top: 0;
  }

  .section-label {
    font-family: var(--mono);
    font-size: 11px;
    letter-spacing: 0.15em;
    color: var(--accent);
    margin-bottom: 0.75rem;
  }

  .container h2 {
    font-family: var(--mono);
    font-size: clamp(1.5rem, 3vw, 2.4rem);
    font-weight: 700;
    line-height: 1.2;
    letter-spacing: -0.01em;
    color: var(--text);
    margin-bottom: 1rem;
  }

  .section-sub {
    color: var(--muted);
    font-size: 1rem;
    max-width: 520px;
    font-weight: 300;
    margin-bottom: 2rem;
  }

  .features-grid {
    display: grid;
    grid-template-columns: repeat(auto-fit, minmax(260px, 1fr));
    gap: 1px;
    background: var(--border);
    border: 0.5px solid var(--border);
    border-radius: 8px;
    overflow: hidden;
  }

  .feat-card {
    background: var(--bg);
    padding: 2rem;
    transition: background 0.2s;
  }

  .feat-card:hover {
    background: var(--bg2);
  }

  .feat-icon {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--accent);
    letter-spacing: 0.1em;
    margin-bottom: 1rem;
    padding: 4px 10px;
    border: 0.5px solid rgba(91, 211, 255, 0.25);
    display: inline-block;
    border-radius: 2px;
    background: rgba(91, 211, 255, 0.06);
  }

  .feat-title {
    font-family: var(--mono);
    font-size: 0.95rem;
    font-weight: 700;
    color: var(--text);
    margin-bottom: 0.5rem;
  }

  .feat-desc {
    font-size: 0.875rem;
    color: var(--muted);
    font-weight: 300;
    line-height: 1.7;
  }

  .demo-terminal {
    margin-top: 1.5rem;
    background: var(--bg2);
    border: 0.5px solid var(--border2);
    border-radius: 6px;
    overflow: hidden;
  }

  .stack-section {
    background: var(--bg2);
  }

  .stack-grid {
    display: flex;
    flex-wrap: wrap;
    gap: 0.75rem;
    margin-top: 1.5rem;
  }

  .stack-pill {
    font-family: var(--mono);
    font-size: 12px;
    padding: 6px 16px;
    border: 0.5px solid var(--border2);
    border-radius: 2px;
    color: var(--text);
    letter-spacing: 0.05em;
    background: var(--bg3);
    transition: border-color 0.2s, color 0.2s;
  }

  .stack-pill:hover {
    border-color: var(--accent);
    color: var(--accent);
  }

  .stack-pill.hl {
    border-color: rgba(91, 211, 255, 0.45);
    color: var(--accent);
    background: rgba(91, 211, 255, 0.06);
  }

  .split {
    display: grid;
    grid-template-columns: 1fr 1fr;
    gap: 3rem;
    align-items: center;
  }

  @media (max-width: 768px) {
    .split {
      grid-template-columns: 1fr;
      gap: 2rem;
    }
  }

  .terminal-block {
    background: var(--bg);
    border: 0.5px solid var(--border2);
    border-radius: 6px;
    overflow: hidden;
  }

  .terminal-bar {
    display: flex;
    align-items: center;
    gap: 6px;
    padding: 10px 16px;
    border-bottom: 0.5px solid var(--border);
    background: var(--bg3);
  }

  .dot {
    width: 10px;
    height: 10px;
    border-radius: 50%;
  }

  .dot-r {
    background: #ff5f57;
  }

  .dot-y {
    background: #ffbd2e;
  }

  .dot-g {
    background: #28ca41;
  }

  .terminal-body {
    padding: 1.25rem 1.5rem;
    font-family: var(--mono);
    font-size: 12px;
    line-height: 2;
  }

  .t-prompt {
    color: var(--accent);
  }

  .t-cmd {
    color: var(--text);
  }

  .t-out {
    color: var(--muted);
  }

  .t-val {
    color: #79b8ff;
  }

  .t-ok {
    color: var(--accent);
  }

  footer {
    border-top: 0.5px solid var(--border);
    padding: 2rem;
    display: flex;
    align-items: center;
    justify-content: space-between;
    flex-wrap: wrap;
    gap: 1rem;
  }

  .footer-logo {
    font-family: var(--mono);
    font-size: 13px;
    color: var(--muted);
  }

  .footer-copy {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    letter-spacing: 0.06em;
  }

  .footer-links {
    display: flex;
    gap: 1.5rem;
  }

  .footer-links a {
    font-family: var(--mono);
    font-size: 11px;
    color: var(--muted);
    text-decoration: none;
    letter-spacing: 0.06em;
    transition: color 0.2s;
  }

  .footer-links a:hover {
    color: var(--text);
  }

  @keyframes fadeUp {
    from {
      opacity: 0;
      transform: translateY(18px);
    }
    to {
      opacity: 1;
      transform: translateY(0);
    }
  }

  :global(.reveal) {
    opacity: 0;
    transform: translateY(24px);
    transition: opacity 0.6s ease, transform 0.6s ease;
  }

  :global(.reveal.visible) {
    opacity: 1;
    transform: none;
  }
</style>
