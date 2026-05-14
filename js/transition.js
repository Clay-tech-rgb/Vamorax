// ===== PAGE FADE + BLUR TRANSITIONS + LOADING OVERLAY =====

function createLoader() {
  const el = document.createElement('div');
  el.className = 'page-loader';
  el.id = 'pageLoader';
  el.innerHTML = '<div class="dot-shuttle"></div>';
  document.body.appendChild(el);
  return el;
}

function getLoader() {
  return document.getElementById('pageLoader') || createLoader();
}

function showLoader() {
  getLoader().classList.add('visible');
}

function hideLoader() {
  const loader = document.getElementById('pageLoader');
  if (loader) loader.classList.remove('visible');
}

export function initPageTransition() {
  // Inject loader element early
  createLoader();

  // Show loader if page takes > 300ms to become ready (lag detection)
  const lagTimer = setTimeout(showLoader, 300);

  // Fade body in once ready
  requestAnimationFrame(() => {
    requestAnimationFrame(() => {
      clearTimeout(lagTimer);
      hideLoader();
      document.body.classList.add('page-ready');
    });
  });

  // Intercept internal link clicks → show loader + fade out
  document.addEventListener('click', e => {
    const link = e.target.closest('a[href]');
    if (!link) return;
    const href = link.getAttribute('href');
    if (
      !href ||
      href.startsWith('http') ||
      href.startsWith('//') ||
      href.startsWith('#') ||
      href.startsWith('mailto') ||
      href.startsWith('tel') ||
      link.target === '_blank' ||
      e.metaKey || e.ctrlKey || e.shiftKey
    ) return;

    e.preventDefault();
    document.body.classList.remove('page-ready');
    document.body.classList.add('page-leaving');
    showLoader();
    setTimeout(() => { window.location.href = href; }, 230);
  });
}
