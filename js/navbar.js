// ===== VAMORAX NAVBAR — Dropdown System =====

const UPDATES_KEY       = 'vmx_last_update_seen';
const LATEST_UPDATE_ID  = '2025-05-14';

// Detect active page
function isActive(href) {
  const path = window.location.pathname.replace(/\/$/, '') || '/';
  const page = href.replace(/^.*\//, '').replace('.html', '');
  return path.endsWith('/' + page) || path === '/' && (href === 'index.html' || href === '/');
}

function hasNewUpdate() {
  return localStorage.getItem(UPDATES_KEY) !== LATEST_UPDATE_ID;
}

export function markUpdatesRead() {
  localStorage.setItem(UPDATES_KEY, LATEST_UPDATE_ID);
  document.querySelectorAll('.vmx-notif-dot').forEach(d => d.classList.add('hidden'));
}

// ── Chevron SVG ──
const CHEVRON = `<svg class="vmx-chevron" width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>`;

// ── Notification dot HTML ──
function notifDot() {
  return hasNewUpdate()
    ? `<span class="vmx-notif-dot"></span>`
    : `<span class="vmx-notif-dot hidden"></span>`;
}

export function initNavPill() {
  const oldNav = document.querySelector('.navbar');
  if (!oldNav) return;

  const brandEl   = oldNav.querySelector('.navbar-brand');
  const actionsEl = oldNav.querySelector('.navbar-actions');

  // ── Build navbar HTML ──
  const nav = document.createElement('nav');
  nav.className = 'vmx-nav';
  nav.setAttribute('role', 'navigation');
  nav.setAttribute('aria-label', 'Main navigation');

  nav.innerHTML = `
    <!-- Brand -->
    <div class="vmx-nav-brand">
      ${brandEl ? brandEl.outerHTML : ''}
    </div>

    <!-- Desktop menu -->
    <ul class="vmx-nav-menu" role="menubar">

      <li role="none">
        <a href="index.html" class="vmx-nav-link${isActive('index.html') ? ' active' : ''}" role="menuitem">Home</a>
      </li>

      <li role="none">
        <a href="shop.html" class="vmx-nav-link${isActive('shop.html') ? ' active' : ''}" role="menuitem">Shop</a>
      </li>

      <li role="none">
        <a href="free-presets.html" class="vmx-nav-link${isActive('free-presets.html') ? ' active' : ''}" role="menuitem">Free</a>
      </li>

      <!-- Resources dropdown -->
      <li class="vmx-has-dropdown" role="none">
        <button class="vmx-nav-link vmx-dropdown-trigger" aria-haspopup="true" aria-expanded="false" role="menuitem">
          Resources ${CHEVRON}
        </button>
        <ul class="vmx-dropdown" role="menu" aria-label="Resources">
          <li role="none">
            <a href="tutorials.html" class="vmx-dropdown-item${isActive('tutorials.html') ? ' active' : ''}" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polygon points="10 8 16 12 10 16 10 8"/></svg>
              Tutorials
            </a>
          </li>
          <li role="none">
            <a href="updates.html" class="vmx-dropdown-item${isActive('updates.html') ? ' active' : ''}" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M18 8A6 6 0 006 8c0 7-3 9-3 9h18s-3-2-3-9"/><path d="M13.73 21a2 2 0 01-3.46 0"/></svg>
              Updates ${notifDot()}
            </a>
          </li>
          <li role="none">
            <a href="contact.html" class="vmx-dropdown-item${isActive('contact.html') ? ' active' : ''}" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z"/><polyline points="22,6 12,13 2,6"/></svg>
              Contact
            </a>
          </li>
        </ul>
      </li>

      <!-- Tools dropdown — 2 column grid -->
      <li class="vmx-has-dropdown" role="none">
        <button class="vmx-nav-link vmx-dropdown-trigger${isActive('edit-hub.html') ? ' active' : ''}" aria-haspopup="true" aria-expanded="false" role="menuitem">
          Tools ${CHEVRON}
        </button>
        <ul class="vmx-dropdown vmx-dropdown--grid" role="menu" aria-label="Tools">
          <li role="none">
            <a href="edit-hub.html?tab=palette" class="vmx-dropdown-item" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="13.5" cy="6.5" r=".5"/><circle cx="17.5" cy="10.5" r=".5"/><circle cx="8.5" cy="7.5" r=".5"/><circle cx="6.5" cy="12.5" r=".5"/><path d="M12 2C6.5 2 2 6.5 2 12s4.5 10 10 10c.926 0 1.648-.746 1.648-1.688 0-.437-.18-.835-.437-1.125-.29-.289-.438-.652-.438-1.125a1.64 1.64 0 011.668-1.668h1.996c3.051 0 5.555-2.503 5.555-5.554C21.965 6.012 17.461 2 12 2z"/></svg>
              Color Palette
            </a>
          </li>
          <li role="none">
            <a href="edit-hub.html?tab=bitrate" class="vmx-dropdown-item" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="22 12 18 12 15 21 9 3 6 12 2 12"/></svg>
              Bitrate Calc
            </a>
          </li>
          <li role="none">
            <a href="edit-hub.html?tab=waveform" class="vmx-dropdown-item" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 18V5l12-2v13"/><circle cx="6" cy="18" r="3"/><circle cx="18" cy="16" r="3"/></svg>
              Waveform
            </a>
          </li>
          <li role="none">
            <a href="edit-hub.html?tab=decorator" class="vmx-dropdown-item" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="4 7 4 4 20 4 20 7"/><line x1="9" y1="20" x2="15" y2="20"/><line x1="12" y1="4" x2="12" y2="20"/></svg>
              Text Decorator
            </a>
          </li>
          <li role="none">
            <a href="edit-hub.html?tab=converter" class="vmx-dropdown-item" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><circle cx="8.5" cy="8.5" r="1.5"/><polyline points="21 15 16 10 5 21"/></svg>
              Image Converter
            </a>
          </li>
          <li role="none">
            <a href="edit-hub.html?tab=ratio" class="vmx-dropdown-item" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><rect x="3" y="3" width="18" height="18" rx="2"/><path d="M3 9h18M9 21V9"/></svg>
              Aspect Ratio
            </a>
          </li>
          <li role="none">
            <a href="edit-hub.html?tab=aratio" class="vmx-dropdown-item" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M15 3h6v6M9 21H3v-6M21 3l-7 7M3 21l7-7"/></svg>
              Ratio Calc
            </a>
          </li>
          <li role="none">
            <a href="edit-hub.html?tab=contrast" class="vmx-dropdown-item" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><path d="M12 2a10 10 0 010 20V2z"/></svg>
              Color Contrast
            </a>
          </li>
          <li role="none">
            <a href="edit-hub.html?tab=frametc" class="vmx-dropdown-item" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="10"/><polyline points="12 6 12 12 16 14"/></svg>
              Frame → TC
            </a>
          </li>
          <li role="none">
            <a href="edit-hub.html?tab=blur" class="vmx-dropdown-item" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="3"/><path d="M19.07 4.93a10 10 0 010 14.14M4.93 4.93a10 10 0 000 14.14"/></svg>
              Image Degrader
            </a>
          </li>
          <li role="none" style="grid-column:1/-1">
            <a href="edit-hub.html?tab=downloader" class="vmx-dropdown-item${isActive('edit-hub.html') ? ' active' : ''}" role="menuitem">
              <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M21 15v4a2 2 0 01-2 2H5a2 2 0 01-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" y1="15" x2="12" y2="3"/></svg>
              Media Downloader
            </a>
          </li>
        </ul>
      </li>

    </ul>

    <!-- Right actions -->
    <div class="vmx-nav-actions">

      <!-- Search -->
      <button class="vmx-icon-btn vmx-search-btn" id="vmxSearchBtn" title="Search" aria-label="Search">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
      </button>

      <!-- Cart -->
      <button class="vmx-icon-btn cart-btn" title="Cart" aria-label="Cart">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M6 2L3 6v14a2 2 0 002 2h14a2 2 0 002-2V6l-3-4z"/><line x1="3" y1="6" x2="21" y2="6"/><path d="M16 10a4 4 0 01-8 0"/></svg>
        <span class="cart-badge">0</span>
      </button>

      <!-- Theme -->
      <button class="vmx-icon-btn vmx-theme-btn" id="vmxThemeBtn" title="Toggle theme" aria-label="Toggle theme">
        <svg class="vmx-sun" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="12" cy="12" r="5"/><line x1="12" y1="1" x2="12" y2="3"/><line x1="12" y1="21" x2="12" y2="23"/><line x1="4.22" y1="4.22" x2="5.64" y2="5.64"/><line x1="18.36" y1="18.36" x2="19.78" y2="19.78"/><line x1="1" y1="12" x2="3" y2="12"/><line x1="21" y1="12" x2="23" y2="12"/><line x1="4.22" y1="19.78" x2="5.64" y2="18.36"/><line x1="18.36" y1="5.64" x2="19.78" y2="4.22"/></svg>
        <svg class="vmx-moon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round" style="display:none"><path d="M21 12.79A9 9 0 1111.21 3 7 7 0 0021 12.79z"/></svg>
      </button>

      <!-- Membership -->
      <a href="membership.html" class="vmx-membership-btn${isActive('membership.html') ? ' active' : ''}">Membership</a>

      <!-- Sign in / User -->
      <a href="login.html" class="vmx-signin-btn nav-login-btn">Sign in</a>
      <div class="nav-user-menu hidden" style="display:flex;align-items:center;gap:6px">
        <button class="vmx-signout-btn" id="vmxSignOutBtn" title="Sign out" aria-label="Sign out">
          <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
          Sign out
        </button>
      </div>

      <!-- Hamburger (mobile) -->
      <button class="vmx-hamburger" id="vmxHamburger" aria-label="Open menu" aria-expanded="false">
        <span></span><span></span><span></span>
      </button>

    </div>

    <!-- Search overlay (mobile + desktop) -->
    <div class="vmx-search-overlay" id="vmxSearchOverlay" role="search" aria-hidden="true">
      <div class="vmx-search-inner">
        <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><circle cx="11" cy="11" r="8"/><line x1="21" y1="21" x2="16.65" y2="16.65"/></svg>
        <input type="search" class="vmx-search-input" id="vmxSearchInput" placeholder="Search presets, tutorials…" autocomplete="off" />
        <button class="vmx-search-close" id="vmxSearchClose" aria-label="Close search">
          <svg width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
    </div>
  `;

  // Insert
  const progress = document.getElementById('top-progress');
  if (progress) progress.after(nav);
  else document.body.prepend(nav);
  oldNav.remove();

  // ── Mobile drawer ──
  const drawer = document.createElement('div');
  drawer.className = 'vmx-drawer';
  drawer.setAttribute('aria-hidden', 'true');
  drawer.innerHTML = `
    <div class="vmx-drawer-inner">
      <div class="vmx-drawer-header">
        <span class="vmx-drawer-title">Menu</span>
        <button class="vmx-icon-btn" id="vmxDrawerClose" aria-label="Close menu">
          <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round"><line x1="18" y1="6" x2="6" y2="18"/><line x1="6" y1="6" x2="18" y2="18"/></svg>
        </button>
      </div>
      <nav class="vmx-drawer-nav">
        <a href="index.html" class="vmx-drawer-link${isActive('index.html') ? ' active' : ''}">Home</a>
        <a href="shop.html" class="vmx-drawer-link${isActive('shop.html') ? ' active' : ''}">Shop</a>
        <a href="free-presets.html" class="vmx-drawer-link${isActive('free-presets.html') ? ' active' : ''}">Free Presets</a>

        <div class="vmx-drawer-group vmx-drawer-accordion" id="drawerResourcesGroup">
          <button class="vmx-drawer-group-label vmx-drawer-accordion-btn" id="drawerResourcesBtn" aria-expanded="false">
            Resources
            <svg class="vmx-drawer-accordion-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="vmx-drawer-accordion-body" id="drawerResourcesBody">
            <a href="tutorials.html" class="vmx-drawer-link vmx-drawer-sub${isActive('tutorials.html') ? ' active' : ''}">Tutorials</a>
            <a href="updates.html" class="vmx-drawer-link vmx-drawer-sub${isActive('updates.html') ? ' active' : ''}">
              Updates <span class="vmx-notif-dot${hasNewUpdate() ? '' : ' hidden'}"></span>
            </a>
            <a href="contact.html" class="vmx-drawer-link vmx-drawer-sub${isActive('contact.html') ? ' active' : ''}">Contact</a>
          </div>
        </div>

        <div class="vmx-drawer-group vmx-drawer-accordion" id="drawerToolsGroup">
          <button class="vmx-drawer-group-label vmx-drawer-accordion-btn" id="drawerToolsBtn" aria-expanded="false">
            Tools
            <svg class="vmx-drawer-accordion-chevron" width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"><polyline points="6 9 12 15 18 9"/></svg>
          </button>
          <div class="vmx-drawer-accordion-body" id="drawerToolsBody">
            <a href="edit-hub.html?tab=palette" class="vmx-drawer-link vmx-drawer-sub${isActive('edit-hub.html') ? ' active' : ''}">Color Palette</a>
            <a href="edit-hub.html?tab=bitrate" class="vmx-drawer-link vmx-drawer-sub">Bitrate Calc</a>
            <a href="edit-hub.html?tab=waveform" class="vmx-drawer-link vmx-drawer-sub">Waveform</a>
            <a href="edit-hub.html?tab=converter" class="vmx-drawer-link vmx-drawer-sub">Image Converter</a>
            <a href="edit-hub.html?tab=decorator" class="vmx-drawer-link vmx-drawer-sub">Text Decorator</a>
            <a href="edit-hub.html?tab=aratio" class="vmx-drawer-link vmx-drawer-sub">Aspect Ratio</a>
            <a href="edit-hub.html?tab=contrast" class="vmx-drawer-link vmx-drawer-sub">Color Contrast</a>
            <a href="edit-hub.html?tab=frametc" class="vmx-drawer-link vmx-drawer-sub">Frame → Timecode</a>
            <a href="edit-hub.html?tab=blur" class="vmx-drawer-link vmx-drawer-sub">Image Degrader</a>
            <a href="edit-hub.html?tab=downloader" class="vmx-drawer-link vmx-drawer-sub">Media Downloader</a>
          </div>
        </div>

        <a href="membership.html" class="vmx-drawer-link${isActive('membership.html') ? ' active' : ''}">Membership</a>
      </nav>
      <div class="vmx-drawer-footer">
        <a href="login.html" class="vmx-signin-btn nav-login-btn" style="width:100%;justify-content:center">Sign in</a>
        <div class="nav-user-menu hidden" style="width:100%;display:flex;flex-direction:column;gap:8px">
          <a href="dashboard.html" class="vmx-signin-btn" style="width:100%;justify-content:center">My Account</a>
          <button id="vmxSignOutBtnMobile" class="vmx-signout-btn" style="width:100%;justify-content:center">
            <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.5" stroke-linecap="round" stroke-linejoin="round"><path d="M9 21H5a2 2 0 01-2-2V5a2 2 0 012-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" y1="12" x2="9" y2="12"/></svg>
            Sign out
          </button>
        </div>
      </div>
    </div>
  `;
  document.body.appendChild(drawer);

  // Remove old mobile-nav elements from HTML
  document.querySelectorAll('.mobile-nav').forEach(el => el.remove());

  // ── Dropdown behavior ──
  document.querySelectorAll('.vmx-has-dropdown').forEach(item => {
    const trigger = item.querySelector('.vmx-dropdown-trigger');
    const dropdown = item.querySelector('.vmx-dropdown');
    let closeTimer;

    const open = () => {
      clearTimeout(closeTimer);
      // Close all others first
      document.querySelectorAll('.vmx-has-dropdown.open').forEach(other => {
        if (other !== item) {
          other.classList.remove('open');
          other.querySelector('.vmx-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
        }
      });
      item.classList.add('open');
      trigger?.setAttribute('aria-expanded', 'true');
    };

    const close = (delay = 120) => {
      closeTimer = setTimeout(() => {
        item.classList.remove('open');
        trigger?.setAttribute('aria-expanded', 'false');
      }, delay);
    };

    // Hover
    item.addEventListener('mouseenter', () => open());
    item.addEventListener('mouseleave', () => close());

    // Click (touch / keyboard)
    trigger?.addEventListener('click', e => {
      e.preventDefault();
      item.classList.contains('open') ? close(0) : open();
    });

    // Keep open when hovering dropdown itself
    dropdown?.addEventListener('mouseenter', () => clearTimeout(closeTimer));
    dropdown?.addEventListener('mouseleave', () => close());
  });

  // Close dropdowns on outside click
  document.addEventListener('click', e => {
    if (!e.target.closest('.vmx-has-dropdown')) {
      document.querySelectorAll('.vmx-has-dropdown.open').forEach(el => {
        el.classList.remove('open');
        el.querySelector('.vmx-dropdown-trigger')?.setAttribute('aria-expanded', 'false');
      });
    }
  });

  // ── Hamburger / Drawer ──
  const hamburger = document.getElementById('vmxHamburger');
  const drawerClose = document.getElementById('vmxDrawerClose');

  const openDrawer  = () => { drawer.classList.add('open'); drawer.setAttribute('aria-hidden', 'false'); hamburger?.setAttribute('aria-expanded', 'true'); document.body.style.overflow = 'hidden'; };
  const closeDrawer = () => { drawer.classList.remove('open'); drawer.setAttribute('aria-hidden', 'true'); hamburger?.setAttribute('aria-expanded', 'false'); document.body.style.overflow = ''; };

  hamburger?.addEventListener('click', () => drawer.classList.contains('open') ? closeDrawer() : openDrawer());
  drawerClose?.addEventListener('click', closeDrawer);
  drawer.querySelectorAll('.vmx-drawer-link').forEach(a => a.addEventListener('click', closeDrawer));

  // ── Accordion for Resources group ──
  const resBtn  = document.getElementById('drawerResourcesBtn');
  const resBody = document.getElementById('drawerResourcesBody');
  if (resBtn && resBody) {
    const isResourcePage = isActive('tutorials.html') || isActive('updates.html') || isActive('contact.html');
    if (isResourcePage) {
      resBtn.setAttribute('aria-expanded', 'true');
      resBody.style.maxHeight = resBody.scrollHeight + 'px';
    }
    resBtn.addEventListener('click', () => {
      const expanded = resBtn.getAttribute('aria-expanded') === 'true';
      resBtn.setAttribute('aria-expanded', String(!expanded));
      resBody.style.maxHeight = expanded ? '0' : resBody.scrollHeight + 'px';
    });
  }

  // ── Accordion for Tools group ──
  const accordionBtn  = document.getElementById('drawerToolsBtn');
  const accordionBody = document.getElementById('drawerToolsBody');
  if (accordionBtn && accordionBody) {
    // Auto-expand if current page is a tool
    const isToolPage = isActive('edit-hub.html') || isActive('downloader.html');
    if (isToolPage) {
      accordionBtn.setAttribute('aria-expanded', 'true');
      accordionBody.style.maxHeight = accordionBody.scrollHeight + 'px';
    }
    accordionBtn.addEventListener('click', () => {
      const expanded = accordionBtn.getAttribute('aria-expanded') === 'true';
      accordionBtn.setAttribute('aria-expanded', String(!expanded));
      accordionBody.style.maxHeight = expanded ? '0' : accordionBody.scrollHeight + 'px';
    });
  }

  // ── Search overlay ──
  const searchOverlay = document.getElementById('vmxSearchOverlay');
  const searchInput   = document.getElementById('vmxSearchInput');
  const searchClose   = document.getElementById('vmxSearchClose');
  const searchBtn     = document.getElementById('vmxSearchBtn');

  const openSearch = () => {
    searchOverlay?.classList.add('open');
    searchOverlay?.setAttribute('aria-hidden', 'false');
    setTimeout(() => searchInput?.focus(), 80);
  };
  const closeSearch = () => {
    searchOverlay?.classList.remove('open');
    searchOverlay?.setAttribute('aria-hidden', 'true');
    if (searchInput) searchInput.value = '';
  };

  searchBtn?.addEventListener('click', openSearch);
  searchClose?.addEventListener('click', closeSearch);
  searchInput?.addEventListener('keydown', e => {
    if (e.key === 'Escape') closeSearch();
    if (e.key === 'Enter' && searchInput.value.trim()) {
      window.location.href = 'search.html?q=' + encodeURIComponent(searchInput.value.trim());
    }
  });

  // ── Theme toggle ──
  const themeBtn = document.getElementById('vmxThemeBtn');
  const sunIcon  = themeBtn?.querySelector('.vmx-sun');
  const moonIcon = themeBtn?.querySelector('.vmx-moon');

  function syncThemeIcon() {
    const isDark = document.documentElement.getAttribute('data-theme') !== 'light';
    if (sunIcon)  sunIcon.style.display  = isDark  ? '' : 'none';
    if (moonIcon) moonIcon.style.display = isDark  ? 'none' : '';
  }
  syncThemeIcon();

  themeBtn?.addEventListener('click', () => {
    if (window.toggleTheme) window.toggleTheme();
    setTimeout(syncThemeIcon, 50);
  });

  // ── Sign Out buttons ──
  import('./auth.js').then(({ logout }) => {
    document.getElementById('vmxSignOutBtn')?.addEventListener('click', logout);
    document.getElementById('vmxSignOutBtnMobile')?.addEventListener('click', logout);
  });

  // Observe theme changes
  const themeObserver = new MutationObserver(syncThemeIcon);
  themeObserver.observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  // ── Notification dot on Updates link ──
  if (isActive('updates.html')) markUpdatesRead();
}

// Alias for backward compat
export { initNavPill as initLiquidNav };

export function initNotifDot() {
  // Dots are already injected by initNavPill — this is a no-op kept for compat
}
