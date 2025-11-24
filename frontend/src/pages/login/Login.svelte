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
        flex-direction: column;
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
        color: rgb(146, 146, 195);
        text-decoration: none;
        font-size: clamp(12px, 1.2vw, 14px);
        font-weight: 500;
        padding: 8px 16px;
        border-radius: 20px;
        box-shadow: 0 2px 8px rgba(0, 0, 0, 0.15);
        transition: all 0.3s ease;
        z-index: 1000;
    }

    .mentions-link:hover {
        background: rgba(255, 255, 255, 1);
        box-shadow: 0 4px 12px rgba(0, 0, 0, 0.2);
        transform: translateY(-2px);
    }

    .mentions-link::before {
        content: '';
        position: absolute;
        bottom: -2px;
        left: -2px;
        width: 8px;
        height: 8px;
        background: #667eea;
        border-radius: 50%;
        opacity: 0.6;
    }

    /* Mobile - Lien en haut */
    @media (max-width: 575.98px) {
        .mentions-link {
            bottom: auto;
            top: 20px;
            left: 20px;
            font-size: clamp(10px, 2vw, 12px);
            padding: 6px 12px;
        }
    }
</style>
