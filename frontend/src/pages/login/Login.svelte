<script>
import FormLogin from '../../modules/module_login/FormLogin.svelte';
</script>

<section>
  <FormLogin />
</section>


<style>
    section {   
        display:flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        width: 100%;
        background: #020024;
background: radial-gradient(circle, rgba(2, 0, 36, 1) 0%, rgba(9, 9, 121, 1) 20%, rgba(0, 212, 255, 1) 100%);
    }


    /* Mobile (jusqu'à 576px) */
    @media (max-width: 575.98px) {
        section {   
        display: flex;
        flex-direction: column;
        align-items: center;
        justify-content: center;
        height: 100%;
        width: 100%;
        background-color: rgb(197, 223, 235);
    }
    }

    /* Tablet (576px - 768px) */
    @media (min-width: 576px) and (max-width: 767.98px) {
        
    }

    /* Desktop (768px - 1024px) */
    @media (min-width: 768px) and (max-width: 1023.98px) {
        section {
            height: 100%;
        }
    }

    /* Large Desktop (1024px - 1440px) */
    @media (min-width: 1024px) and (max-width: 1439.98px) {
        
    }

    /* Extra Large Desktop (1440px et plus) */
    @media (min-width: 1440px) {
        
    }
</style>
