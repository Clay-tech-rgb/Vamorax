// ===== AUTHENTICATION — Firebase Auth (Vamorax Protected) =====
import { showToast, showConfirm } from './ui.js';
import { isBot, clientRateLimit } from './security.js';
import {
  auth, db, GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, updateProfile, sendEmailVerification,
  doc, setDoc, getDoc, updateDoc
} from './firebase-config.js';

// ── 1. Helper Functions ──
export function getCurrentUser() {
  return auth.currentUser;
}

export function isLoggedIn() {
  return !!auth.currentUser && auth.currentUser.emailVerified;
}

// ── 2. Logout Logic ──
export function logout() {
  showConfirm('Are you sure you want to sign out?', async () => {
    try {
      await signOut(auth);
      showToast('Signed out successfully', 'info');
      setTimeout(() => window.location.href = 'index.html', 800);
    } catch (err) {
      showToast('Logout failed', 'error');
    }
  });
}

// ── 3. Auth Guard (Satpam Dashboard) ──
export function requireAuth(redirectTo = 'login.html') {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, async user => {
      unsub();
      if (!user) {
        // User belum login
        localStorage.setItem('auth_redirect', window.location.href);
        window.location.href = redirectTo;
        resolve(false);
      } else if (!user.emailVerified) {
        // User login tapi BELUM verifikasi email
        showToast('Please verify your email first!', 'warning');
        await signOut(auth); // Tendang keluar biar gak nyangkut session-nya
        window.location.href = 'verify-email.html';
        resolve(false);
      } else {
        // Aman, boleh masuk
        resolve(true);
      }
    });
  });
}

// ── 4. UI Sync (Update Navbar) ──
export function updateNavAuth() {
  onAuthStateChanged(auth, user => {
    const loginBtns = document.querySelectorAll('.nav-login-btn');
    const userMenus = document.querySelectorAll('.nav-user-menu');
    
    // User dianggap login HANYA jika sudah verifikasi
    if (user && user.emailVerified) {
      loginBtns.forEach(el => el.classList.add('hidden'));
      userMenus.forEach(el => el.classList.remove('hidden'));
    } else {
      loginBtns.forEach(el => el.classList.remove('hidden'));
      userMenus.forEach(el => el.classList.add('hidden'));
    }
  });
}

// ── 5. Firestore Sync ──
async function saveUserToFirestore(user) {
  const ref = doc(db, 'users', user.uid);
  const snap = await getDoc(ref);
  if (!snap.exists()) {
    await setDoc(ref, {
      uid: user.uid,
      email: user.email,
      displayName: user.displayName || user.email.split('@')[0],
      photoURL: user.photoURL || '',
      createdAt: new Date().toISOString(),
      isAdmin: false, // Default bukan admin
      purchasedPresets: [],
      downloadedFreePresets: []
    });
  }
}

// ── 6. Login & Register Page Logic ──
export function initLoginPage() {
  const emailForm    = document.querySelector('#email-login-form');
  const registerForm = document.querySelector('#register-form');

  // --- Login Logic ---
  emailForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (isBot(emailForm)) return;
    if (!clientRateLimit('login', 5, 60000)) {
      showToast('Too many attempts. Wait a minute.', 'error'); return;
    }

    const email    = emailForm.querySelector('[name="email"]').value.trim();
    const password = emailForm.querySelector('[name="password"]').value;
    const btn      = emailForm.querySelector('button[type="submit"]');

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in...';

    try {
      const cred = await signInWithEmailAndPassword(auth, email, password);
      
      // CEK VERIFIKASI
      if (!cred.user.emailVerified) {
        showToast('Email not verified. Check your inbox!', 'warning');
        await signOut(auth); // Logout paksa
        btn.disabled = false;
        btn.textContent = 'Sign in';
        return;
      }

      showToast('Welcome back!', 'success');
      const redirect = localStorage.getItem('auth_redirect') || 'dashboard.html';
      localStorage.removeItem('auth_redirect');
      setTimeout(() => window.location.href = redirect, 900);

    } catch (err) {
      showToast('Invalid email or password.', 'error');
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  });

  // --- Register Logic ---
  registerForm?.addEventListener('submit', async e => {
    e.preventDefault();
    if (isBot(registerForm)) return;
    if (!clientRateLimit('register', 3, 300000)) {
      showToast('Too many registrations. Slow down!', 'error'); return;
    }

    const email    = registerForm.querySelector('[name="email"]').value.trim();
    const password = registerForm.querySelector('[name="password"]').value;
    const confirm  = registerForm.querySelector('[name="confirm"]').value;
    const btn      = registerForm.querySelector('button[type="submit"]');

    if (password !== confirm) { showToast('Passwords mismatch', 'error'); return; }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating...';

    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      
      // Update profile & Firestore
      await updateProfile(cred.user, { displayName: email.split('@')[0] });
      await saveUserToFirestore(cred.user);
      
      // Kirim Email Verifikasi
      await sendEmailVerification(cred.user);
      
      // LOGOUT PAKSA supaya gak langsung masuk dashboard
      await signOut(auth);

      showToast('Account created! Please check your email to verify.', 'success');
      setTimeout(() => window.location.href = 'verify-email.html', 2000);

    } catch (err) {
      showToast(err.message, 'error');
      btn.disabled = false;
      btn.textContent = 'Create account';
    }
  });
}

// ── 7. Google Sign In (Auto-Verified) ──
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await saveUserToFirestore(cred.user);
    
    showToast(`Welcome, ${cred.user.displayName}!`, 'success');
    setTimeout(() => window.location.href = 'dashboard.html', 900);
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      showToast('Google sign in failed.', 'error');
    }
  }
}

// ── 8. Dashboard Initialization ──
export async function initDashboard() {
  const authed = await requireAuth(); // Panggil Satpam
  if (!authed) return;

  const user = auth.currentUser;
  
  // Ambil data user dari Firestore
  const snap = await getDoc(doc(db, 'users', user.uid));
  const userData = snap.exists() ? snap.data() : {};

  // Render UI Dashboard
  const nameEl = document.querySelector('.dashboard-user-name');
  if (nameEl) nameEl.textContent = userData.displayName || user.email.split('@')[0];

  document.querySelector('.logout-btn')?.addEventListener('click', logout);
}
