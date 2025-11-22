<script>
import FormLogin from '../../modules/module_login/FormLogin.svelte';
</script>

<section>
  <FormLogin />
  <a href="#mentions-legales" class="mentions-link">Mentions légales</a>
</section>


<style>
    section {   
        display:flex;
        align-items: center;
        justify-content: center;
        min-height: 100vh;
        width: 100%;
        background: #020024;
/* background: radial-gradient(circle, rgba(2, 0, 36, 1) 0%, rgba(9, 9, 121, 1) 20%, rgba(0, 212, 255, 1) 100%); */
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

    .mentions-link {
        position: fixed;
        bottom: 20px;
        left: 20px;
        color: rgba(255, 255, 255, 0.8);
        text-decoration: none;
        font-size: clamp(11px, 1.1vw, 13px);
        transition: all 0.3s ease;
        z-index: 1000;
    }

    .mentions-link:hover {
        color: rgba(255, 255, 255, 1);
        text-decoration: underline;
    }

    /* Mobile */
    @media (max-width: 575.98px) {
        .mentions-link {
            bottom: 60px;
            left: 20px;
            font-size: clamp(10px, 2vw, 12px);
        }
    }
</style>
