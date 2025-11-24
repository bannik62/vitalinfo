<nav class="navbar-login">
  <img
    class="navbar-login__logo"
    src="/logo-vitalinfo.png"
    alt="Logo Vitalinfo"
    width="140"
    height="48"
    loading="lazy"
  />
</nav>

<style>
  .navbar-login {
    position: fixed;
    top: 0;
    left: 0;
    width: 100%;
    height: 15vh;
    display: flex;
    align-items: center;
    padding: 1.25rem 2rem;
    box-sizing: border-box;
    background: #020024;
    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  }

  .navbar-login__logo {
    position: relative;
    top: 120%;
    left: 5%;
    transform: translate(-50%, -50%);
    display: inline;
    object-fit: contain;
    width: 10%;
    height: 250%;

    box-shadow: 0 4px 20px rgba(0, 0, 0, 0.05);
  }
  @media (max-width: 575.98px) {
    .navbar-login {
      display: none;
    }
    .navbar-login__logo {
      bottom: 120%;
      left: 5%;
      transform: translate(-50%, -50%);
      display: inline;
      object-fit: contain;
      width: 10%;
      height: 250%;
    }
  }
</style>

