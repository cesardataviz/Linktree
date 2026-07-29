/**
 * Script que aplica el tema ANTES del primer pintado.
 *
 * El problema clásico: si decides el tema en un useEffect, el navegador ya
 * pintó la página en claro y el visitante ve un fogonazo blanco antes de que
 * aparezca el modo oscuro. Este script es sincrónico y bloqueante, así que la
 * clase .dark ya está puesta cuando el navegador pinta por primera vez.
 *
 * Va inline en el <head> a propósito: un archivo externo llegaría tarde.
 */
const script = `
(function () {
  try {
    var stored = localStorage.getItem('cdv.theme');
    var prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
    // Elección explícita del usuario > preferencia del sistema.
    var dark = stored ? stored === 'dark' : prefersDark;
    document.documentElement.classList.toggle('dark', dark);
  } catch (e) {
    // Si localStorage está bloqueado, se queda en modo claro. Sin drama.
  }
})();
`;

export function ThemeScript() {
  return (
    <script
      // El contenido es una constante nuestra, no entra nada del usuario.
      dangerouslySetInnerHTML={{ __html: script }}
      suppressHydrationWarning
    />
  );
}
