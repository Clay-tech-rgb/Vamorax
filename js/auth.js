// ===== AUTHENTICATION — Firebase Auth =====
import { showToast, showConfirm } from './ui.js';
import { verifyRecaptcha, addHoneypot, isBot, clientRateLimit, disableConsoleInProd } from './security.js';
import {
  auth, db, GoogleAuthProvider, signInWithPopup,
  createUserWithEmailAndPassword, signInWithEmailAndPassword,
  onAuthStateChanged, signOut, updateProfile, sendEmailVerification,
  doc, setDoc, getDoc, updateDoc
} from './firebase-config.js';

// ── Current user (sync, from Firebase cache) ──
export function getCurrentUser() {
  return auth.currentUser;
}

export function isLoggedIn() {
  return !!auth.currentUser;
}

// ── Logout ──
export function logout() {
  showConfirm('Are you sure you want to sign out?', async () => {
    await signOut(auth);
    showToast('Signed out', 'info');
    setTimeout(() => window.location.href = 'index.html', 800);
  });
}

// ── Require auth guard ──
export function requireAuth(redirectTo = 'login.html') {
  return new Promise(resolve => {
    const unsub = onAuthStateChanged(auth, user => {
      unsub();
      if (!user) {
        localStorage.setItem('auth_redirect', window.location.href);
        window.location.href = redirectTo;
        resolve(false);
      } else if (!user.emailVerified) {
        // Google users are auto-verified, only block email/password unverified
        if (user.providerData?.[0]?.providerId === 'password') {
          window.location.href = 'verify-email.html';
          resolve(false);
        } else {
          resolve(true);
        }
      } else {
        resolve(true);
      }
    });
  });
}

// ── Update navbar based on auth state ──
export function updateNavAuth() {
  onAuthStateChanged(auth, user => {
    const loginBtns = document.querySelectorAll('.nav-login-btn');
    const userMenus = document.querySelectorAll('.nav-user-menu');
    if (user) {
      loginBtns.forEach(el => el.classList.add('hidden'));
      userMenus.forEach(el => el.classList.remove('hidden'));
    } else {
      loginBtns.forEach(el => el.classList.remove('hidden'));
      userMenus.forEach(el => el.classList.add('hidden'));
    }
  });
}

// ── Save user profile to Firestore ──
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
      purchasedPresets: [],
      downloadedFreePresets: []
    });
  }
}

// ── Login page logic ──
export function initLoginPage() {
  const emailForm    = document.querySelector('#email-login-form');
  const registerForm = document.querySelector('#register-form');

  // Email/password sign in
  emailForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const email    = emailForm.querySelector('[name="email"]').value.trim();
    const password = emailForm.querySelector('[name="password"]').value;
    const btn      = emailForm.querySelector('button[type="submit"]');

    // Honeypot check
    if (isBot(emailForm)) return;

    // Client-side rate limit: 5 attempts per minute
    if (!clientRateLimit('login', 5, 60_000)) {
      showToast('Too many attempts. Wait a minute.', 'error'); return;
    }

    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Signing in...';
    try {
      await signInWithEmailAndPassword(auth, email, password);
      // If not verified, redirect to verify page (don't block login)
      if (!auth.currentUser?.emailVerified) {
        showToast('Please verify your email first.', 'info');
        setTimeout(() => window.location.href = 'verify-email.html', 900);
        return;
      }
      showToast('Welcome back!', 'success');
      // Check if user came back to resend verification
      if (localStorage.getItem('resend_verify') === '1' && !auth.currentUser?.emailVerified) {
        localStorage.removeItem('resend_verify');
        const actionCodeSettings = {
          url: window.location.origin + '/auth-handler.html',
          handleCodeInApp: false,
        };
        try { await sendEmailVerification(auth.currentUser, actionCodeSettings); } catch {}
        await signOut(auth);
        window.location.href = 'verify-email.html';
        return;
      }
      const raw = localStorage.getItem('auth_redirect') || '';
      const redirect = raw && raw.startsWith(window.location.origin) && !raw.includes('login')
        ? raw : 'dashboard.html';
      localStorage.removeItem('auth_redirect');
      setTimeout(() => window.location.href = redirect, 900);
    } catch (err) {
      const msg = err.code === 'auth/invalid-credential' || err.code === 'auth/wrong-password'
        ? 'Wrong email or password.'
        : err.code === 'auth/user-not-found'
        ? 'No account found with this email.'
        : err.code === 'auth/too-many-requests'
        ? 'Too many attempts. Try again later.'
        : 'Sign in failed. Please try again.';
      showToast(msg, 'error');
      btn.disabled = false;
      btn.textContent = 'Sign in';
    }
  });

  // Register
  registerForm?.addEventListener('submit', async e => {
    e.preventDefault();
    const email    = registerForm.querySelector('[name="email"]').value.trim();
    const password = registerForm.querySelector('[name="password"]').value;
    const confirm  = registerForm.querySelector('[name="confirm"]').value;
    const captcha  = document.getElementById('captcha');

    if (password !== confirm) { showToast('Passwords do not match', 'error'); return; }
    if (captcha && !captcha.checked) { showToast('Please verify you are not a robot', 'error'); return; }

    // Honeypot check
    if (isBot(registerForm)) return;

    // Client-side rate limit
    if (!clientRateLimit('register', 3, 300_000)) {
      showToast('Too many registrations. Try again later.', 'error'); return;
    }

    const btn = registerForm.querySelector('button[type="submit"]');
    btn.disabled = true;
    btn.innerHTML = '<span class="spinner"></span> Creating account...';
    try {
      const cred = await createUserWithEmailAndPassword(auth, email, password);
      await updateProfile(cred.user, { displayName: email.split('@')[0] });
      await saveUserToFirestore(cred.user);
      // Send verification email BEFORE signing out
      const actionCodeSettings = {
        url: window.location.origin + '/auth-handler.html',
        handleCodeInApp: false,
      };
      await sendEmailVerification(cred.user, actionCodeSettings);
      showToast('Account created! Check your email to verify.', 'success');
      // Do NOT sign out — keep user logged in so verify-email page can poll
      window.location.href = 'verify-email.html';
    } catch (err) {
      const msg = err.code === 'auth/email-already-in-use'
        ? 'Email already registered. Try signing in.'
        : err.code === 'auth/weak-password'
        ? 'Password must be at least 6 characters.'
        : 'Registration failed. Please try again.';
      showToast(msg, 'error');
      btn.disabled = false;
      btn.textContent = 'Create account';
    }
  });
}

// ── Google sign in ──
export async function signInWithGoogle() {
  try {
    const provider = new GoogleAuthProvider();
    const cred = await signInWithPopup(auth, provider);
    await saveUserToFirestore(cred.user);
    showToast(`Welcome, ${cred.user.displayName || 'there'}!`, 'success');
    const raw2 = localStorage.getItem('auth_redirect') || '';
    const redirect = raw2 && raw2.startsWith(window.location.origin) && !raw2.includes('login')
      ? raw2 : 'dashboard.html';
    localStorage.removeItem('auth_redirect');
    setTimeout(() => window.location.href = redirect, 900);
  } catch (err) {
    if (err.code !== 'auth/popup-closed-by-user') {
      showToast('Google sign in failed. Try again.', 'error');
    }
  }
}

// ── Dashboard init ──
export async function initDashboard() {
  const authed = await requireAuth();
  if (!authed) return;

  const user = auth.currentUser;

  // Try to get extra data from Firestore
  let userData = {};
  try {
    const snap = await getDoc(doc(db, 'users', user.uid));
    if (snap.exists()) userData = snap.data();
  } catch {}

  const displayName = userData.displayName || user.displayName || user.email?.split('@')[0] || 'User';
  const emailEl = document.querySelector('.dashboard-user-email');
  const nameEl  = document.querySelector('.dashboard-user-name');
  if (emailEl) emailEl.textContent = user.email;
  if (nameEl)  nameEl.textContent  = displayName;

  document.querySelector('.logout-btn')?.addEventListener('click', logout);

  // Settings prefill
  const settingsName  = document.getElementById('settings-name');
  const settingsEmail = document.getElementById('settings-email');
  const settingsSave  = document.getElementById('settings-save');
  if (settingsName)  settingsName.value  = displayName;
  if (settingsEmail) settingsEmail.value = user.email;

  settingsSave?.addEventListener('click', async () => {
    const newName = settingsName?.value.trim();
    if (!newName) return;
    try {
      await updateProfile(user, { displayName: newName });
      await updateDoc(doc(db, 'users', user.uid), { displayName: newName });
      if (nameEl) nameEl.textContent = newName;
      showToast('Settings saved', 'success');
    } catch {
      showToast('Failed to save settings', 'error');
    }
  });
}
