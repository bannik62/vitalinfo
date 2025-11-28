<script>
  function goBack() {
    window.history.back();
  }
</script>

<div class="mentions-legales-container">
  <div class="mentions-content">
    <button class="back-button" on:click={goBack}>← Retour</button>
    
    <h1>Mentions Légales</h1>
    
    <section>
      <h2>1. Éditeur du site</h2>
      <p>
        L'application <strong>Vitalinfo</strong> est édité à titre personnel.
      </p>
    </section>

    <section>
      <h2>2. Hébergement</h2>
      <p>
        Ce site est hébergé par <strong>codeurbase.fr</strong>.
      </p>
    </section>

    <section>
      <h2>3. Protection des données personnelles</h2>
      <p>
        Les données personnelles collectées sur ce site sont des données personnelles et sont utilisées uniquement pour un but personnel.
      </p>
      <!-- <p>
        Conformément au RGPD, vous disposez d'un droit d'accès, de rectification, 
        de suppression et d'opposition aux données vous concernant.
      </p> -->
    </section>

    <section>
      <h2>4. Propriété intellectuelle</h2>
      <p>
        L'ensemble du contenu de ce site (textes, images, logos) est la propriété 
        de l'éditeur et est protégé par le droit d'auteur.
      </p>
    </section>

    <section>
      <h2>5. Cookies</h2>
      <p>
        Ce site utilise des cookies techniques nécessaires au bon fonctionnement 
        de l'application. Ces cookies ne nécessitent pas de consentement préalable.
      </p>
    </section>

    <section>
      <h2>6. Statistiques anonymisées</h2>
      <p>
        Une mesure de fréquentation anonyme est réalisée via <strong>Umami</strong> afin de comprendre
        l'utilisation de l'application. Aucune donnée personnelle identifiable n'est collectée.
      </p>
    </section>

    <section class="last-updated">
      <p>
        <em>Dernière mise à jour : {new Date().toLocaleDateString('fr-FR', { year: 'numeric', month: 'long', day: 'numeric' })}</em>
      </p>
    </section>
  </div>
</div>

<style>
  .mentions-legales-container {
    min-height: 100vh;
    display: flex;
    justify-content: center;
    align-items: flex-start;
    padding: clamp(20px, 5vw, 60px);
    background: #020024;
    background: radial-gradient(circle, rgba(2, 0, 36, 1) 0%, rgba(9, 9, 121, 1) 20%, #020024 100%);
  }

  .mentions-content {
    max-width: 800px;
    width: 100%;
    background: rgba(255, 255, 255, 0.95);
    padding: clamp(30px, 4vw, 50px);
    border-radius: 12px;
    box-shadow: 0 8px 32px rgba(0, 0, 0, 0.2);
  }

  .back-button {
    background: rgba(9, 9, 121, 1);
    color: white;
    border: none;
    padding: clamp(8px, 1vw, 12px) clamp(16px, 2vw, 24px);
    border-radius: 6px;
    cursor: pointer;
    font-size: clamp(14px, 1.5vw, 16px);
    margin-bottom: 30px;
    transition: all 0.3s ease;
    font-weight: 500;
  }

  .back-button:hover {
    background: rgba(0, 212, 255, 1);
    transform: translateX(-3px);
  }

  h1 {
    color: #020024;
    font-size: clamp(28px, 4vw, 36px);
    margin-bottom: clamp(30px, 4vw, 40px);
    border-bottom: 4px solid #2017c7;
    border-left: 4px solid #2017c7;
    padding-bottom: 15px;
    padding-left: 10px;
    text-align: center;
    box-shadow: 10px 0px 10px rgba(0, 0, 0, 0.254) inset;
  }
  strong {
    color: #7e3def;
    font-weight: 600;
  }

  section {
    margin-bottom: clamp(25px, 3vw, 35px);
    margin-left: px;
    border-left: 2px solid #2017c7;
    border-top: 3px solid #2017c7;
    padding:10px 10px 10px 10px;
    box-shadow: 10px 10px 30px rgba(29, 120, 173, 0.372) inset;
  }
  section:last-child {
    border-left: none;
    box-shadow: none;
  }
  section:hover {
scale: 1.05;  }

  h2 {
    color: rgba(9, 9, 121, 1);
    font-size: clamp(20px, 2.5vw, 24px);
    margin-bottom: clamp(12px, 1.5vw, 16px);
    font-weight: 600;
  }

  p {
    color: #333;
    line-height: 1.7;
    font-size: clamp(14px, 1.8vw, 16px);
    margin-bottom: clamp(10px, 1.2vw, 14px);
  }

  .last-updated {
    margin-top: clamp(30px, 4vw, 40px);
    padding-top: clamp(20px, 3vw, 30px);
    border-top: 1px solid #ddd;
  }

  .last-updated p {
    color: #666;
    font-size: clamp(12px, 1.5vw, 14px);
  }

  /* Mobile */
  @media (max-width: 575.98px) {
    .mentions-legales-container {
      padding: 15px;
    }

    .mentions-content {
      padding: 20px;
    }
  }
</style>

