<script>
import FormLogin from '../../modules/module_login/FormLogin.svelte';
</script>

<section>
  <h1>Connexion</h1>
  <FormLogin />
</section>


<style>
    section {   
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100vh;
        width: 100%;
        background-color: rgb(108, 21, 21);
    }
    h1 {
        font-size: 2rem;
        font-weight: bold;
        margin-bottom: 1rem;
        color: white;
    }
</style>
