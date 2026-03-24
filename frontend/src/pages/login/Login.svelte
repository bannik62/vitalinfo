<script>
  import Landing from '../../modules/landing/Landing.svelte';
</script>

<Landing />

<a href="#mentions-legales" class="mentions-link">Mentions légales</a>

<style>
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
