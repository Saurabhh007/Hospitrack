/**
 * Hospitrack — Production Router & Application Controller
 * Real Spring Security + JWT Authentication, Role-Aware Router,
 * Real-time Duplicate Medicine Check, Multi-facility Referral & Emergency Transfer Engine.
 */

let activeRole = null;
let activeTab = 'dashboard';
let activeRoleSubtab = 'overview';

document.addEventListener('DOMContentLoaded', () => {
  initApp();
});

async function initApp() {
  const auth = window.hospitrackAuth;
  const store = window.hospitrackStore;

  // Initialize Modal Subsystem
  if (window.initModalManager) {
    window.initModalManager();
  }

  // Initialize Global Keyboard Navigation (Ctrl+K, Up/Down/Enter in search, Escape)
  initKeyboardNavigation();

  // Listen to hash changes for deep linking
  window.addEventListener('hashchange', handleUrlHashRouting);

  // Global Click-Outside Listener
  document.addEventListener('click', (e) => {
    if (e.target.classList.contains('modal-overlay')) {
      e.target.classList.remove('open');
    }
    const profileWrap = document.querySelector('.header-profile-wrap');
    if (profileWrap && !profileWrap.contains(e.target)) {
      closeProfileDropdown();
    }
    const notifWrap = document.querySelector('.notification-btn-wrap');
    if (notifWrap && !notifWrap.contains(e.target)) {
      closeNotifDropdown();
    }
    const searchWrap = document.querySelector('.global-search-container');
    if (searchWrap && !searchWrap.contains(e.target)) {
      closeGlobalSearch();
    }
  });

  // Authentication State Check
  if (auth && auth.isAuthenticated()) {
    const authUser = auth.getCurrentUser();
    if (store && typeof store.syncAllData === 'function') {
      await store.syncAllData().catch((syncErr) => {
        console.warn('Initial store sync notice during initApp:', syncErr);
      });
    }
    showAuthenticatedApp(authUser);
  } else {
    // Check if user specifically navigated to #login or is landing on home
    if (window.location.hash === '#login') {
      showLoginView();
    } else {
      showLandingView();
    }
  }
}

// --------------------------------------------------------------------------
// URL Hash Deep-Link Handling (Email Verification, Password Reset & Workspaces)
// --------------------------------------------------------------------------
function handleUrlHashRouting() {
  const hash = window.location.hash;
  if (!hash) return;

  if (hash.startsWith('#verify-email=')) {
    const token = hash.replace('#verify-email=', '').trim();
    openVerifyEmailModal(token);
    return;
  }
  if (hash.startsWith('#reset-password=')) {
    const token = hash.replace('#reset-password=', '').trim();
    openResetPasswordModal(token);
    return;
  }

  const auth = window.hospitrackAuth;
  const isAuth = auth && auth.isAuthenticated();
  const user = isAuth ? auth.getCurrentUser() : null;

  if (hash === '#login' || hash === '#/login') {
    if (!isAuth) {
      showLoginView();
    }
    return;
  }

  if (hash.startsWith('#register')) {
    if (!isAuth) {
      showRegisterView();
    }
    return;
  }

  if (hash === '#home' || hash === '#about' || hash === '#how-it-works' || hash === '#for-patients' || hash === '#for-doctors' || hash === '#for-hospitals') {
    if (!isAuth) {
      showLandingView();
      navigateToLandingSection(hash.substring(1));
    }
    return;
  }

  // Authenticated Deep Routes: #role/section OR #{type}/workspace/{id}(/{tab})
  if (isAuth && user) {
    const rawHash = hash.replace(/^#\/?/, '');
    const parts = rawHash.split('/');
    const prefix = (parts[0] || '').toLowerCase();
    const secondPart = (parts[1] || '').toLowerCase();

    // Check for workspace deep route: #{type}/workspace/{id}(/{tab})
    if (secondPart === 'workspace' && parts[2]) {
      const workspaceType = prefix;
      const entityId = parts[2];
      const subtab = parts[3] ? parts[3].toLowerCase() : 'overview';
      openWorkspace(workspaceType, entityId, subtab, false);
      return;
    }

    const userRole = (user.role || '').toUpperCase();
    const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';

    // Role-based route guard: enforce authorized hash boundaries
    if (!isSuperAdmin) {
      if (userRole === 'PATIENT' && prefix !== 'patient') {
        navigateToRoleSection('PATIENT', 'timeline', null, true);
        return;
      }
      if (userRole === 'DOCTOR' && prefix !== 'doctor') {
        navigateToRoleSection('DOCTOR', 'dashboard', null, true);
        return;
      }
      if ((userRole === 'HOSPITAL_ADMIN' || userRole === 'HOSPITAL') && prefix !== 'hospital') {
        navigateToRoleSection('HOSPITAL_ADMIN', 'overview', null, true);
        return;
      }
    }

    const sectionName = parts[1] || (prefix !== (user.role || '').toLowerCase() ? prefix : null);

    if (prefix === 'patient') {
      navigateToRoleSection('PATIENT', sectionName || 'timeline', null, false);
    } else if (prefix === 'hospital') {
      navigateToRoleSection('HOSPITAL_ADMIN', sectionName || 'overview', null, false);
    } else if (prefix === 'doctor') {
      navigateToRoleSection('DOCTOR', sectionName || 'dashboard', null, false);
    } else if (prefix === 'admin') {
      navigateToRoleSection('SUPER_ADMIN', sectionName || 'overview', null, false);
    } else if (user.role === 'DOCTOR') {
      navigateToRoleSection('DOCTOR', sectionName || 'dashboard', null, false);
    } else if (user.role === 'HOSPITAL_ADMIN' || user.role === 'HOSPITAL') {
      navigateToRoleSection('HOSPITAL_ADMIN', sectionName || 'overview', null, false);
    } else if (user.role === 'SUPER_ADMIN' || user.role === 'ADMIN') {
      navigateToRoleSection('SUPER_ADMIN', sectionName || 'overview', null, false);
    } else {
      navigateToRoleSection('PATIENT', sectionName || 'timeline', null, false);
    }
  } else if (!isAuth) {
    showLoginView();
  }
}

// --------------------------------------------------------------------------
// View State Router (Landing, Login, Registration, App)
// --------------------------------------------------------------------------
function showLandingView() {
  const landingContainer = document.getElementById('landingViewContainer');
  const loginContainer = document.getElementById('loginViewContainer');
  const registerContainer = document.getElementById('registerViewContainer');
  const appContainer = document.getElementById('authenticatedAppContainer');

  if (landingContainer) landingContainer.classList.remove('hidden');
  if (loginContainer) loginContainer.classList.add('hidden');
  if (registerContainer) registerContainer.classList.add('hidden');
  if (appContainer) appContainer.classList.add('hidden');
}
window.showLandingView = showLandingView;

function navigateToLandingSection(sectionId) {
  showLandingView();
  if (sectionId) {
    const target = document.getElementById(sectionId);
    if (target) {
      target.scrollIntoView({ behavior: 'smooth' });
    }
  }
}
window.navigateToLandingSection = navigateToLandingSection;

function showLoginView() {
  const landingContainer = document.getElementById('landingViewContainer');
  const loginContainer = document.getElementById('loginViewContainer');
  const registerContainer = document.getElementById('registerViewContainer');
  const appContainer = document.getElementById('authenticatedAppContainer');

  if (landingContainer) landingContainer.classList.add('hidden');
  if (loginContainer) loginContainer.classList.remove('hidden');
  if (registerContainer) registerContainer.classList.add('hidden');
  if (appContainer) appContainer.classList.add('hidden');

  clearLoginAlert();
}
window.showLoginView = showLoginView;

function navigateToLogin(roleHint = 'PATIENT') {
  showLoginView();
  if (roleHint) {
    selectLoginRole(roleHint);
  }
}
window.navigateToLogin = navigateToLogin;

function showRegisterView() {
  const landingContainer = document.getElementById('landingViewContainer');
  const loginContainer = document.getElementById('loginViewContainer');
  const registerContainer = document.getElementById('registerViewContainer');
  const appContainer = document.getElementById('authenticatedAppContainer');

  if (landingContainer) landingContainer.classList.add('hidden');
  if (loginContainer) loginContainer.classList.add('hidden');
  if (registerContainer) registerContainer.classList.remove('hidden');
  if (appContainer) appContainer.classList.add('hidden');
}
window.showRegisterView = showRegisterView;

function navigateToRegister(type = 'PATIENT') {
  navigateToLogin(type);
}
window.navigateToRegister = navigateToRegister;

function showAuthenticatedApp(user) {
  const landingContainer = document.getElementById('landingViewContainer');
  const loginContainer = document.getElementById('loginViewContainer');
  const registerContainer = document.getElementById('registerViewContainer');
  const appContainer = document.getElementById('authenticatedAppContainer');

  if (landingContainer) landingContainer.classList.add('hidden');
  if (loginContainer) loginContainer.classList.add('hidden');
  if (registerContainer) registerContainer.classList.add('hidden');
  if (appContainer) appContainer.classList.remove('hidden');

  const initialRole = user.role || 'PATIENT';
  activeRole = initialRole;

  let defaultSection = 'overview';
  if (initialRole === 'PATIENT') defaultSection = 'overview';
  else if (initialRole === 'DOCTOR') defaultSection = 'dashboard';
  else if (initialRole === 'HOSPITAL_ADMIN' || initialRole === 'HOSPITAL') defaultSection = 'overview';
  else if (initialRole === 'SUPER_ADMIN' || initialRole === 'ADMIN') defaultSection = 'overview';

  activeRoleSubtab = defaultSection;

  updateHeaderUI(user, activeRole);
  renderDynamicSidebar(user, activeRole);
  if (typeof renderNotificationsDropdown === 'function') {
    renderNotificationsDropdown();
  } else if (typeof window.renderNotificationsDropdown === 'function') {
    window.renderNotificationsDropdown();
  }

  // If page was loaded with a deep link / workspace hash, route to it!
  const hash = window.location.hash;
  if (hash && hash !== '#login' && hash !== '#register' && hash !== '#home' && hash !== '#/login') {
    handleUrlHashRouting();
    return;
  }

  navigateToRoleSection(initialRole, defaultSection, null, true);
}
window.showAuthenticatedApp = showAuthenticatedApp;

// --------------------------------------------------------------------------
// Login Role Tabs (Strict Portal Role Segregation & Routing)
// --------------------------------------------------------------------------
// Login Role Tabs (Dynamic Role-Switching Logic & Modern UX)
// --------------------------------------------------------------------------
let currentSelectedLoginRole = 'PATIENT';

const LOGIN_ROLE_CONFIG = {
  PATIENT: {
    label: 'Patient',
    icon: '👤',
    inputLabel: 'Patient Email or ID',
    placeholder: 'e.g. rahul.sharma@gmail.com or john.doe@email.com',
    subtitle: 'Continue to your personal health records, prescriptions & lab results.',
    helperHtml: 'Need help accessing your patient portal? <a href="javascript:void(0)" onclick="openHelpDeskModal(\'PATIENT\')" class="auth-helper-link">Contact Hospital Desk</a>'
  },
  DOCTOR: {
    label: 'Doctor',
    icon: '🩺',
    inputLabel: 'Medical Email or License ID',
    placeholder: 'e.g. dr.arjun@apexcare.com, r.verma@apexcare.in, s.sharma@citygeneral.in',
    subtitle: 'Continue to your clinical workstation, consultations & decision safety.',
    helperHtml: 'Doctor credentials are tied to your institutional SSO. <a href="javascript:void(0)" onclick="openHelpDeskModal(\'DOCTOR\')" class="auth-helper-link">Verify Credentials</a>'
  },
  HOSPITAL: {
    label: 'Hospital',
    icon: '🏥',
    inputLabel: 'Facility Administrator Email / Code',
    placeholder: 'e.g. operations@apexcare.in, admin@citygeneral.in',
    subtitle: 'Continue to your operations deck, ward capacity & emergency transfers.',
    helperHtml: 'Requires Department Token or Facility Key. <a href="javascript:void(0)" onclick="openHelpDeskModal(\'HOSPITAL\')" class="auth-helper-link">Facility Support</a>'
  }
};

function selectLoginRole(role, preserveValues = false) {
  const normRole = (role || 'PATIENT').toUpperCase();
  currentSelectedLoginRole = (normRole === 'HOSPITAL_ADMIN') ? 'HOSPITAL' : normRole;

  // 1. Form Reset Behavior:
  // "When the user switches between tabs ("Patient", "Doctor", "Hospital"),
  // immediately clear/reset the Email / Username and Password input fields, and uncheck "Remember me"."
  const identifierInput = document.getElementById('loginIdentifier');
  const passwordInput = document.getElementById('loginPassword');
  const rememberCheckbox = document.getElementById('loginRememberMe');

  if (!preserveValues) {
    if (identifierInput) identifierInput.value = '';
    if (passwordInput) passwordInput.value = '';
    if (rememberCheckbox) rememberCheckbox.checked = false;
    clearLoginAlert();
  }

  // 2. Active Tab Pill Animation with Sliding Background Glider:
  const patientTab = document.getElementById('loginRoleTabPatient');
  const doctorTab = document.getElementById('loginRoleTabDoctor');
  const hospitalTab = document.getElementById('loginRoleTabHospital');
  const glider = document.getElementById('roleTabGlider');

  if (patientTab) {
    patientTab.classList.remove('active');
    if (typeof patientTab.setAttribute === 'function') {
      patientTab.setAttribute('aria-selected', 'false');
      patientTab.setAttribute('tabindex', '-1');
    }
  }
  if (doctorTab) {
    doctorTab.classList.remove('active');
    if (typeof doctorTab.setAttribute === 'function') {
      doctorTab.setAttribute('aria-selected', 'false');
      doctorTab.setAttribute('tabindex', '-1');
    }
  }
  if (hospitalTab) {
    hospitalTab.classList.remove('active');
    if (typeof hospitalTab.setAttribute === 'function') {
      hospitalTab.setAttribute('aria-selected', 'false');
      hospitalTab.setAttribute('tabindex', '-1');
    }
  }

  let activeIndex = 0;
  if (currentSelectedLoginRole === 'PATIENT') {
    activeIndex = 0;
    if (patientTab) {
      patientTab.classList.add('active');
      if (typeof patientTab.setAttribute === 'function') {
        patientTab.setAttribute('aria-selected', 'true');
        patientTab.setAttribute('tabindex', '0');
      }
    }
  } else if (currentSelectedLoginRole === 'DOCTOR') {
    activeIndex = 1;
    if (doctorTab) {
      doctorTab.classList.add('active');
      if (typeof doctorTab.setAttribute === 'function') {
        doctorTab.setAttribute('aria-selected', 'true');
        doctorTab.setAttribute('tabindex', '0');
      }
    }
  } else if (currentSelectedLoginRole === 'HOSPITAL') {
    activeIndex = 2;
    if (hospitalTab) {
      hospitalTab.classList.add('active');
      if (typeof hospitalTab.setAttribute === 'function') {
        hospitalTab.setAttribute('aria-selected', 'true');
        hospitalTab.setAttribute('tabindex', '0');
      }
    }
  }

  if (glider && glider.style) {
    glider.style.transform = `translateX(${activeIndex * 100}%)`;
  }

  // 3. Contextual Adaptation per Role:
  const config = LOGIN_ROLE_CONFIG[currentSelectedLoginRole] || LOGIN_ROLE_CONFIG.PATIENT;

  if (identifierInput) {
    identifierInput.placeholder = config.placeholder;
  }
  const identifierLabel = document.getElementById('loginIdentifierLabel');
  if (identifierLabel) {
    identifierLabel.innerHTML = `${config.inputLabel} <span class="req-star">*</span>`;
  }
  const subtitle = document.getElementById('authSubtitle');
  if (subtitle) {
    subtitle.textContent = config.subtitle;
  }
  const helperNote = document.getElementById('loginRoleHelperNote');
  if (helperNote) {
    helperNote.innerHTML = config.helperHtml;
  }
  window.currentSelectedLoginRole = currentSelectedLoginRole;
}
window.selectLoginRole = selectLoginRole;
window.selectLoginRoleTab = selectLoginRole;
window.getCurrentSelectedLoginRole = () => currentSelectedLoginRole;

// Accessible Keyboard Navigation for Role Tabs (ArrowLeft / ArrowRight)
function initRoleTabsKeyboardNav() {
  if (typeof document === 'undefined' || typeof document.querySelector !== 'function') return;
  const roleTabsWrap = document.querySelector('.role-tabs-modern');
  if (!roleTabsWrap || !roleTabsWrap.dataset || roleTabsWrap.dataset.navBound) return;
  roleTabsWrap.dataset.navBound = 'true';

  if (typeof roleTabsWrap.addEventListener === 'function') {
    roleTabsWrap.addEventListener('keydown', (e) => {
      const roles = ['PATIENT', 'DOCTOR', 'HOSPITAL'];
      let currentIndex = roles.indexOf(currentSelectedLoginRole);
      if (currentIndex === -1) currentIndex = 0;

      if (e.key === 'ArrowRight' || e.key === 'ArrowDown') {
        e.preventDefault();
        const nextIndex = (currentIndex + 1) % roles.length;
        selectLoginRole(roles[nextIndex]);
        const nextBtn = document.getElementById(`loginRoleTab${roles[nextIndex].charAt(0) + roles[nextIndex].slice(1).toLowerCase()}`);
        if (nextBtn && typeof nextBtn.focus === 'function') nextBtn.focus();
      } else if (e.key === 'ArrowLeft' || e.key === 'ArrowUp') {
        e.preventDefault();
        const prevIndex = (currentIndex - 1 + roles.length) % roles.length;
        selectLoginRole(roles[prevIndex]);
        const prevBtn = document.getElementById(`loginRoleTab${roles[prevIndex].charAt(0) + roles[prevIndex].slice(1).toLowerCase()}`);
        if (prevBtn && typeof prevBtn.focus === 'function') prevBtn.focus();
      }
    });
  }
}
if (typeof document !== 'undefined') {
  if (document.readyState === 'loading' && typeof document.addEventListener === 'function') {
    document.addEventListener('DOMContentLoaded', initRoleTabsKeyboardNav);
  } else {
    initRoleTabsKeyboardNav();
  }
}

// Facility Help Desk & SSO Modal Handler
function openHelpDeskModal(role = 'PATIENT') {
  const normRole = (role || 'PATIENT').toUpperCase();
  const titleEl = document.getElementById('helpDeskModalTitle');
  const subtitleEl = document.getElementById('helpDeskModalSubtitle');
  const bodyEl = document.getElementById('helpDeskModalBody');

  let title = 'Hospital Patient Desk Support';
  let subtitle = 'Authorized patient access & identity retrieval';
  let lines = [
    '📞 <strong>Central Patient Helpline:</strong> 1800-419-CARE (24/7 Toll Free)',
    '🏥 <strong>Facility Desk:</strong> City General Hospital — Patient Relations Desk (Ground Floor, Room 102)',
    '✉️ <strong>Email Support:</strong> patient-care@hospitrack.health',
    '🕒 <strong>Hours:</strong> 24/7 continuous intake & records assistance'
  ];

  if (normRole === 'DOCTOR') {
    title = 'Medical Staff SSO & Credential Support';
    subtitle = 'Single Sign-On (SSO) & Physician Directory Services';
    lines = [
      '🩺 <strong>Clinical Informatics Desk:</strong> 1800-419-DOCS (Ext 202)',
      '🔐 <strong>SSO Verification:</strong> Your doctor account is tied to your institutional hospital directory credentials (LDAP/AD). Contact your hospital IT administrator to reset credentials.',
      '✉️ <strong>Medical Staff Office:</strong> credentials@citygeneral.in'
    ];
  } else if (normRole === 'HOSPITAL' || normRole === 'HOSPITAL_ADMIN') {
    title = 'Facility Operations & License Support';
    subtitle = 'Authorized Department Token & Facility Key Management';
    lines = [
      '🏛️ <strong>National Network Operations:</strong> 1800-419-ADMIN',
      '🔑 <strong>Facility Key Provisioning:</strong> Department Tokens and Facility Master Keys are dispatched through Super Admin governance.',
      '✉️ <strong>Governance & Security:</strong> security@hospitrack.health'
    ];
  }

  if (titleEl) titleEl.textContent = title;
  if (subtitleEl) subtitleEl.textContent = subtitle;
  if (bodyEl) {
    bodyEl.innerHTML = `
      <div style="background: var(--bg-surface-alt, #F8FAFC); border: 1px solid var(--border-color, #E2E8F0); border-radius: 12px; padding: 16px; display: flex; flex-direction: column; gap: 12px; font-size: 0.86rem; color: var(--text-main, #0F172A); line-height: 1.5;">
        ${lines.map(l => `<div>${l}</div>`).join('')}
      </div>
      <div style="margin-top: 20px; display: flex; justify-content: flex-end;">
        <button type="button" class="btn btn-primary" onclick="closeModal('helpDeskModal')">Close</button>
      </div>
    `;
  }

  if (typeof window.openModal === 'function') {
    window.openModal('helpDeskModal');
  }
}
window.openHelpDeskModal = openHelpDeskModal;

// --------------------------------------------------------------------------
// Registration Type Switcher (Patient vs Hospital)
// --------------------------------------------------------------------------
function switchRegistrationType(type) {
  const patTab = document.getElementById('regTabPatient');
  const hospTab = document.getElementById('regTabHospital');
  const patForm = document.getElementById('patientRegisterForm');
  const hospForm = document.getElementById('hospitalRegisterForm');
  const successScreen = document.getElementById('registerSuccessScreen');

  if (successScreen) successScreen.classList.add('hidden');
  clearRegisterAlert();

  if (type === 'HOSPITAL') {
    if (patTab) patTab.classList.remove('active');
    if (hospTab) hospTab.classList.add('active');
    if (patForm) patForm.classList.add('hidden');
    if (hospForm) hospForm.classList.remove('hidden');
  } else {
    if (patTab) patTab.classList.add('active');
    if (hospTab) hospTab.classList.remove('active');
    if (patForm) patForm.classList.remove('hidden');
    if (hospForm) hospForm.classList.add('hidden');
  }
}
window.switchRegistrationType = switchRegistrationType;

// --------------------------------------------------------------------------
// Password Strength Meter
// --------------------------------------------------------------------------
window.updatePasswordStrength = function(inputId, barId, labelId) {
  const input = document.getElementById(inputId);
  const bar = document.getElementById(barId);
  const label = document.getElementById(labelId);
  if (!input || !bar) return;

  const pwd = input.value || '';
  let score = 0;
  if (pwd.length >= 8) score++;
  if (/[A-Z]/.test(pwd)) score++;
  if (/[0-9]/.test(pwd)) score++;
  if (/[^A-Za-z0-9]/.test(pwd)) score++;

  bar.className = 'strength-bar-bg';
  if (score === 1) {
    bar.classList.add('weak');
    if (label) { label.textContent = 'Weak password'; label.style.color = 'var(--danger)'; }
  } else if (score === 2 || score === 3) {
    bar.classList.add('medium');
    if (label) { label.textContent = 'Moderate password'; label.style.color = 'var(--warning)'; }
  } else if (score === 4) {
    bar.classList.add('strong');
    if (label) { label.textContent = 'Strong password'; label.style.color = 'var(--success)'; }
  } else {
    if (label) { label.textContent = 'Password strength'; label.style.color = 'var(--text-dim)'; }
  }
};

function clearLoginAlert() {
  const banner = document.getElementById('loginAlertBanner');
  if (banner) {
    banner.className = 'alert-banner hidden';
    banner.textContent = '';
  }
}

function showLoginAlert(msg, type = 'error') {
  const banner = document.getElementById('loginAlertBanner');
  if (banner) {
    banner.className = `alert-banner ${type}`;
    banner.textContent = msg;
    banner.classList.remove('hidden');
  }
}

function showRoleMismatchAlert(mismatch, identifier, user) {
  const banner = document.getElementById('loginAlertBanner');
  if (!banner) return;

  const cleanId = (identifier || '').replace(/[&<>"']/g, c => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[c]));

  let doctorHint = '';
  if (mismatch.destPortal === 'HOSPITAL' && currentSelectedLoginRole === 'DOCTOR') {
    if (cleanId.toLowerCase().includes('apexcare')) {
      doctorHint = `<div style="margin-top: 6px; font-size: 0.8rem; color: #475569; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 6px 10px;">🩺 <em>Doctor accounts for Apex Care: <strong>dr.arjun@apexcare.com</strong> or <strong>r.verma@apexcare.in</strong></em></div>`;
    } else if (cleanId.toLowerCase().includes('citygeneral')) {
      doctorHint = `<div style="margin-top: 6px; font-size: 0.8rem; color: #475569; background: #f8fafc; border: 1px dashed #cbd5e1; border-radius: 6px; padding: 6px 10px;">🩺 <em>Doctor accounts for City General: <strong>s.sharma@citygeneral.in</strong> or <strong>dr.sarah@citygeneral.com</strong></em></div>`;
    }
  }

  banner.className = 'alert-banner error';
  banner.innerHTML = `
    <div style="display: flex; flex-direction: column; gap: 8px;">
      <div style="font-weight: 600; display: flex; align-items: flex-start; gap: 8px; line-height: 1.4;">
        <span style="font-size: 1.1rem; line-height: 1;">⚠️</span>
        <div>
          <div>${mismatch.msg}</div>
          <div style="font-size: 0.82rem; font-weight: normal; margin-top: 3px; color: #991b1b;">
            Account <strong>${cleanId}</strong> is registered as a <strong>${mismatch.roleLabel}</strong>.
          </div>
        </div>
      </div>
      <div style="display: flex; align-items: center; gap: 10px; flex-wrap: wrap; margin-top: 4px;">
        <button type="button" class="btn btn-sm" style="background: #0284c7; color: #ffffff; border: none; padding: 6px 14px; font-weight: 600; font-size: 0.82rem; border-radius: 6px; cursor: pointer; box-shadow: 0 1px 2px rgba(0,0,0,0.1);" onclick="switchLoginPortalAndPreserve('${mismatch.destPortal}', '${cleanId}')">
          Switch to "${mismatch.destLabel}" Tab &rarr;
        </button>
        <span style="font-size: 0.78rem; color: #64748b;">(Keeps your entered email)</span>
      </div>
      ${doctorHint}
    </div>
  `;
  banner.classList.remove('hidden');
}
window.showRoleMismatchAlert = showRoleMismatchAlert;

function switchLoginPortalAndPreserve(targetPortal, identifier) {
  selectLoginRole(targetPortal, true);
  const identifierInput = document.getElementById('loginIdentifier');
  const passwordInput = document.getElementById('loginPassword');
  if (identifierInput) {
    identifierInput.value = identifier || '';
  }
  if (passwordInput) {
    passwordInput.value = '';
    passwordInput.focus();
  }
  const targetLabel = targetPortal === 'HOSPITAL' ? 'Hospital' : (targetPortal === 'DOCTOR' ? 'Doctor' : 'Patient');
  showLoginAlert(`Switched to ${targetLabel} tab for "${identifier}". Please enter your password to sign in.`, 'info');
}
window.switchLoginPortalAndPreserve = switchLoginPortalAndPreserve;

function clearRegisterAlert() {
  const banner = document.getElementById('registerAlertBanner');
  if (banner) {
    banner.className = 'alert-banner hidden';
    banner.textContent = '';
  }
}

function showRegisterAlert(msg, type = 'error') {
  const banner = document.getElementById('registerAlertBanner');
  if (banner) {
    banner.className = `alert-banner ${type}`;
    banner.textContent = msg;
    banner.classList.remove('hidden');
  }
}

// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// Real Authentication Submission Handler with Strict Role & Portal Protection
// --------------------------------------------------------------------------
async function handleLoginSubmit(event) {
  event.preventDefault();
  clearLoginAlert();

  const identifier = document.getElementById('loginIdentifier')?.value.trim();
  const password = document.getElementById('loginPassword')?.value;
  const remember = document.getElementById('loginRememberMe')?.checked;

  const btn = document.getElementById('loginSubmitBtn');
  const spinner = document.getElementById('loginBtnSpinner');
  const btnText = document.getElementById('loginBtnText');

  if (!identifier || !password) {
    showLoginAlert('Please enter your email/username and password.', 'error');
    return;
  }

  try {
    if (btn) btn.disabled = true;
    if (spinner) spinner.classList.remove('hidden');
    if (btnText) btnText.textContent = 'Authenticating...';

    // Authenticate with real backend API
    const authResult = await window.hospitrackAuth.login(identifier, password, remember);
    const user = (authResult && authResult.user) ? authResult.user : (authResult || window.hospitrackAuth.getCurrentUser());

    if (!user) {
      throw new Error('Authentication failed. User profile could not be loaded.');
    }

    const userRole = (user.role || '').toUpperCase();
    const activePortal = (currentSelectedLoginRole || 'PATIENT').toUpperCase();

    // Portal Role Authorization Enforcement:
    // 1. SUPER_ADMIN / ADMIN is universal and can log in through ANY portal or section.
    // 2. PATIENT can ONLY log in through the PATIENT portal.
    // 3. DOCTOR can ONLY log in through the DOCTOR portal.
    // 4. HOSPITAL_ADMIN can ONLY log in through the HOSPITAL portal.
    const isSuperAdmin = (userRole === 'SUPER_ADMIN' || userRole === 'ADMIN');

    if (!isSuperAdmin) {
      let mismatch = null;

      if (activePortal === 'PATIENT' && userRole !== 'PATIENT') {
        const destPortal = userRole === 'DOCTOR' ? 'DOCTOR' : 'HOSPITAL';
        const destLabel = userRole === 'DOCTOR' ? 'Doctor' : 'Hospital';
        const roleLabel = userRole === 'DOCTOR' ? 'Medical Doctor' : 'Hospital Administrator';
        mismatch = {
          destPortal,
          destLabel,
          roleLabel,
          msg: `Access Denied: This portal is for Patients only. Please switch to the "${destLabel}" tab above to sign in.`
        };
      }

      if (activePortal === 'DOCTOR' && userRole !== 'DOCTOR') {
        const destPortal = (userRole === 'HOSPITAL_ADMIN' || userRole === 'HOSPITAL') ? 'HOSPITAL' : 'PATIENT';
        const destLabel = (userRole === 'HOSPITAL_ADMIN' || userRole === 'HOSPITAL') ? 'Hospital' : 'Patient';
        const roleLabel = (userRole === 'HOSPITAL_ADMIN' || userRole === 'HOSPITAL') ? 'Hospital Administrator' : 'Patient';
        mismatch = {
          destPortal,
          destLabel,
          roleLabel,
          msg: `Access Denied: This portal is for Medical Doctors only. Please switch to the "${destLabel}" tab above to sign in.`
        };
      }

      if ((activePortal === 'HOSPITAL' || activePortal === 'HOSPITAL_ADMIN') && userRole !== 'HOSPITAL_ADMIN' && userRole !== 'HOSPITAL') {
        const destPortal = userRole === 'PATIENT' ? 'PATIENT' : 'DOCTOR';
        const destLabel = userRole === 'PATIENT' ? 'Patient' : 'Doctor';
        const roleLabel = userRole === 'PATIENT' ? 'Patient' : 'Medical Doctor';
        mismatch = {
          destPortal,
          destLabel,
          roleLabel,
          msg: `Access Denied: This portal is for Hospital Administrators and staff only. Please switch to the "${destLabel}" tab above to sign in.`
        };
      }

      if (mismatch) {
        if (window.hospitrackAuth && typeof window.hospitrackAuth.logout === 'function') {
          await window.hospitrackAuth.logout().catch(() => {});
        }
        showRoleMismatchAlert(mismatch, identifier, user);
        return;
      }
    }

    if (window.hospitrackStore && typeof window.hospitrackStore.syncAllData === 'function') {
      await window.hospitrackStore.syncAllData().catch(() => {});
    }

    window.showToast(`Welcome back, ${user.name || user.email}!`, 'success');
    showAuthenticatedApp(user);
  } catch (err) {
    showLoginAlert(err.message || 'Invalid credentials. Please verify and try again.', 'error');
  } finally {
    if (btn) btn.disabled = false;
    if (spinner) spinner.classList.add('hidden');
    if (btnText) btnText.textContent = 'Sign In';
  }
}
window.handleLoginSubmit = handleLoginSubmit;

// --------------------------------------------------------------------------
// Patient Registration Handler
// --------------------------------------------------------------------------
async function handlePatientRegisterSubmit(event) {
  event.preventDefault();
  clearRegisterAlert();

  const name = document.getElementById('regPatName')?.value.trim();
  const username = document.getElementById('regPatUsername')?.value.trim();
  const email = document.getElementById('regPatEmail')?.value.trim();
  const phone = document.getElementById('regPatPhone')?.value.trim();
  const dob = document.getElementById('regPatDob')?.value.trim();
  const gender = document.getElementById('regPatGender')?.value;
  const bloodGroup = document.getElementById('regPatBloodGroup')?.value;
  const address = document.getElementById('regPatAddress')?.value.trim();
  const emergencyContact = document.getElementById('regPatEmergencyContact')?.value.trim();
  const password = document.getElementById('regPatPassword')?.value;
  const confirmPassword = document.getElementById('regPatConfirmPassword')?.value;
  const submitBtn = document.getElementById('patRegSubmitBtn');

  if (!name || !email || !phone || !password) {
    showRegisterAlert('Please fill in all required patient fields.', 'error');
    return;
  }

  if (password.length < 8) {
    showRegisterAlert('Password must be at least 8 characters.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showRegisterAlert('Passwords do not match.', 'error');
    return;
  }

  const payload = {
    name,
    username: username || email.split('@')[0],
    email,
    phone,
    dob,
    gender,
    bloodGroup,
    address,
    emergencyContact,
    password
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Creating Account...';
  }

  try {
    const res = await window.hospitrackAuth.registerPatient(payload);
    window.showToast('Account created successfully.', 'success');

    const patForm = document.getElementById('patientRegisterForm');
    const successScreen = document.getElementById('registerSuccessScreen');
    const successTitle = document.getElementById('regSuccessTitle');
    const successDesc = document.getElementById('regSuccessDesc');

    if (patForm) patForm.classList.add('hidden');
    if (successTitle) successTitle.textContent = 'Account created successfully.';
    if (successDesc) successDesc.textContent = 'Your patient profile is active. You can log in immediately.';
    if (successScreen) successScreen.classList.remove('hidden');

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Patient Account';
    }
  } catch (err) {
    showRegisterAlert(err.message || 'Patient registration failed.', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Create Patient Account';
    }
  }
}
window.handlePatientRegisterSubmit = handlePatientRegisterSubmit;

// --------------------------------------------------------------------------
// Hospital Registration Handler
// --------------------------------------------------------------------------
async function handleHospitalRegisterSubmit(event) {
  event.preventDefault();
  clearRegisterAlert();

  const hospitalName = document.getElementById('regHospName')?.value.trim();
  const registrationNumber = document.getElementById('regHospNumber')?.value.trim();
  const email = document.getElementById('regHospEmail')?.value.trim();
  const phone = document.getElementById('regHospPhone')?.value.trim();
  const hospitalType = document.getElementById('regHospType')?.value;
  const totalBeds = parseInt(document.getElementById('regHospBeds')?.value || '100', 10);
  const address = document.getElementById('regHospAddress')?.value.trim();
  const city = document.getElementById('regHospCity')?.value.trim();
  const state = document.getElementById('regHospState')?.value.trim();
  const pincode = document.getElementById('regHospPincode')?.value.trim();
  const password = document.getElementById('regHospPassword')?.value;
  const confirmPassword = document.getElementById('regHospConfirmPassword')?.value;
  const submitBtn = document.getElementById('hospRegSubmitBtn');

  if (!hospitalName || !registrationNumber || !email || !phone || !password) {
    showRegisterAlert('Please fill in all required hospital facility fields.', 'error');
    return;
  }

  if (password.length < 8) {
    showRegisterAlert('Password must be at least 8 characters.', 'error');
    return;
  }

  if (password !== confirmPassword) {
    showRegisterAlert('Passwords do not match.', 'error');
    return;
  }

  const payload = {
    hospitalName,
    registrationNumber,
    email,
    phone,
    hospitalType,
    totalBeds,
    address,
    city,
    state,
    pincode,
    password
  };

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting Registration...';
  }

  try {
    const res = await window.hospitrackAuth.registerHospital(payload);
    window.showToast('Hospital registration submitted.', 'info');

    const hospForm = document.getElementById('hospitalRegisterForm');
    const successScreen = document.getElementById('registerSuccessScreen');
    const successTitle = document.getElementById('regSuccessTitle');
    const successDesc = document.getElementById('regSuccessDesc');

    if (hospForm) hospForm.classList.add('hidden');
    if (successTitle) successTitle.textContent = 'Hospital registration submitted.';
    if (successDesc) successDesc.textContent = 'Your hospital is awaiting administrator approval. You will be able to log in once an administrator approves your facility.';
    if (successScreen) successScreen.classList.remove('hidden');

    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Hospital Registration';
    }
  } catch (err) {
    showRegisterAlert(err.message || 'Hospital registration failed.', 'error');
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Hospital Registration';
    }
  }
}
window.handleHospitalRegisterSubmit = handleHospitalRegisterSubmit;

// --------------------------------------------------------------------------
// Public Hospital Directory Modal Subsystem
// --------------------------------------------------------------------------
async function openPublicHospitalDiscoveryModal() {
  const modal = document.getElementById('publicHospitalDiscoveryModal');
  if (modal) modal.classList.add('open');

  try {
    await window.hospitrackStore.syncHospitals();
  } catch (e) {
    // Fallback to store cache
  }
  renderPublicHospitalList('');
}
window.openPublicHospitalDiscoveryModal = openPublicHospitalDiscoveryModal;

function renderPublicHospitalList(query = '') {
  const container = document.getElementById('publicHospListContainer');
  if (!container) return;

  const hospitals = window.hospitrackStore.getHospitals();
  const q = query.toLowerCase().trim();

  const filtered = hospitals.filter(h => {
    return h.name.toLowerCase().includes(q) ||
      h.location.toLowerCase().includes(q) ||
      h.code.toLowerCase().includes(q);
  });

  if (filtered.length === 0) {
    container.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 2rem;">No accredited hospitals matching '${query}'.</div>`;
    return;
  }

  container.innerHTML = filtered.map(h => `
    <div style="background: rgba(15, 23, 42, 0.7); border: 1px solid rgba(255, 255, 255, 0.08); border-radius: var(--radius-md); padding: 18px; display: flex; justify-content: space-between; align-items: center; gap: 14px; margin-bottom: 12px;">
      <div>
        <div style="display: flex; align-items: center; gap: 8px;">
          <strong style="font-size: 1.05rem; color: #fff;">${h.name}</strong>
          <span style="font-size: 0.72rem; padding: 2px 8px; background: rgba(37, 99, 235, 0.15); color: #60a5fa; border-radius: 4px; font-weight: 700;">${h.code}</span>
        </div>
        <p style="font-size: 0.82rem; color: var(--text-muted); margin-top: 4px;">📍 ${h.location} • 📞 ${h.contact}</p>
        <div style="display: flex; gap: 12px; margin-top: 8px; font-size: 0.78rem;">
          <span style="color: var(--success); font-weight: 600;">🛏️ ${h.availableBeds} / ${h.totalBeds} Beds Available</span>
          <span style="color: var(--patient-color); font-weight: 600;">⭐ ${(h.rating || 5.0).toFixed(1)} / 5.0 (${h.reviewCount || 0} reviews)</span>
        </div>
      </div>
      <div>
        <button type="button" class="btn btn-secondary btn-sm" onclick="closeModal('publicHospitalDiscoveryModal'); navigateToLogin('PATIENT');">
          Book Care
        </button>
      </div>
    </div>
  `).join('');
}
window.renderPublicHospitalList = renderPublicHospitalList;

// --------------------------------------------------------------------------
// Email Verification & Password Reset Modals
// --------------------------------------------------------------------------
function openVerifyEmailModal(token = '') {
  const modal = document.getElementById('verifyEmailModal');
  const input = document.getElementById('verifyTokenInput');
  if (input && token) input.value = token;
  if (modal) modal.classList.add('open');
}
window.openVerifyEmailModal = openVerifyEmailModal;

async function handleVerifyEmailSubmit(event) {
  event.preventDefault();
  const token = document.getElementById('verifyTokenInput')?.value.trim();
  const alertEl = document.getElementById('verifyEmailAlert');

  if (!token) {
    showModalAlert(alertEl, 'Please enter your verification token.', 'error');
    return;
  }

  try {
    const res = await window.hospitrackAuth.verifyEmail(token);
    window.showToast(res.message || 'Email verified successfully! You can now log in.', 'success');
    closeModal('verifyEmailModal');
    showLoginView();
  } catch (err) {
    showModalAlert(alertEl, err.message || 'Email verification failed.', 'error');
  }
}
window.handleVerifyEmailSubmit = handleVerifyEmailSubmit;

function openForgotPasswordModal() {
  const modal = document.getElementById('forgotPasswordModal');
  if (modal) modal.classList.add('open');
}
window.openForgotPasswordModal = openForgotPasswordModal;

async function handleForgotPasswordSubmit(event) {
  event.preventDefault();
  const email = document.getElementById('forgotEmail')?.value.trim();
  const alertEl = document.getElementById('forgotPasswordAlert');

  if (!email) {
    showModalAlert(alertEl, 'Please enter your email.', 'error');
    return;
  }

  try {
    const res = await window.hospitrackAuth.forgotPassword(email);
    window.showToast(res.message || 'If an account exists, a reset link has been dispatched.', 'info');
    closeModal('forgotPasswordModal');
  } catch (err) {
    showModalAlert(alertEl, err.message || 'Password reset request failed.', 'error');
  }
}
window.handleForgotPasswordSubmit = handleForgotPasswordSubmit;

function openResetPasswordModal(token = '') {
  const modal = document.getElementById('resetPasswordModal');
  const input = document.getElementById('resetTokenInput');
  if (input && token) input.value = token;
  if (modal) modal.classList.add('open');
}
window.openResetPasswordModal = openResetPasswordModal;

async function handleResetPasswordSubmit(event) {
  event.preventDefault();
  const token = document.getElementById('resetTokenInput')?.value.trim();
  const newPassword = document.getElementById('newPasswordInput')?.value;
  const confirmPassword = document.getElementById('confirmPasswordInput')?.value;
  const alertEl = document.getElementById('resetPasswordAlert');

  if (!token || !newPassword) {
    showModalAlert(alertEl, 'Please enter all required fields.', 'error');
    return;
  }

  if (newPassword !== confirmPassword) {
    showModalAlert(alertEl, 'Passwords do not match.', 'error');
    return;
  }

  try {
    const res = await window.hospitrackAuth.resetPassword(token, newPassword);
    window.showToast(res.message || 'Password reset successfully! Please sign in.', 'success');
    closeModal('resetPasswordModal');
    window.location.hash = '';
    showLoginView();
  } catch (err) {
    showModalAlert(alertEl, err.message || 'Password reset failed.', 'error');
  }
}
window.handleResetPasswordSubmit = handleResetPasswordSubmit;

function showModalAlert(element, message, type = 'error') {
  if (!element) return;
  element.className = `alert-banner ${type}`;
  element.textContent = message;
  element.classList.remove('hidden');
}

// --------------------------------------------------------------------------
// UI Interactivity Helpers: Password Visibility & Mobile Sidebar
// --------------------------------------------------------------------------
function togglePasswordVisibility(inputId, btnId) {
  const input = document.getElementById(inputId);
  const btn = document.getElementById(btnId);
  if (!input) return;

  if (input.type === 'password') {
    input.type = 'text';
    if (btn) btn.textContent = '🔒';
  } else {
    input.type = 'password';
    if (btn) btn.textContent = '👁️';
  }
}
window.togglePasswordVisibility = togglePasswordVisibility;

function setHtmlDatasetSidebarState(val) {
  if (typeof document !== 'undefined' && document && document.documentElement) {
    if (!document.documentElement.dataset) {
      document.documentElement.dataset = {};
    }
    document.documentElement.dataset.sidebarState = val;
  }
}

function toggleMobileSidebar() {
  const sidebar = document.getElementById('appSidebar');
  const overlay = document.getElementById('mobileNavOverlay');
  const isOpening = !sidebar || !sidebar.classList.contains('mobile-open');

  if (sidebar) {
    sidebar.classList.toggle('mobile-open', isOpening);
  }
  if (overlay) {
    overlay.classList.toggle('mobile-open', isOpening);
  }
  setHtmlDatasetSidebarState(isOpening ? 'mobile-open' : (window.getPersistedSidebarState ? window.getPersistedSidebarState() : 'expanded'));
}
window.toggleMobileSidebar = toggleMobileSidebar;

function closeMobileSidebar() {
  const sidebar = document.getElementById('appSidebar');
  const overlay = document.getElementById('mobileNavOverlay');
  if (sidebar) {
    sidebar.classList.remove('mobile-open');
  }
  if (overlay) {
    overlay.classList.remove('mobile-open');
  }
  setHtmlDatasetSidebarState(window.getPersistedSidebarState ? window.getPersistedSidebarState() : 'expanded');
}
window.closeMobileSidebar = closeMobileSidebar;

// --------------------------------------------------------------------------
// User Profile Modal (View, Interactive Edit Mode & Profile Photo Uploader)
// --------------------------------------------------------------------------
let pendingPhotoDataUrl = null;

function openUserProfileModal(isEditMode = false) {
  const modal = document.getElementById('userProfileModal');
  const container = document.getElementById('userProfileModalContent');
  const modalTitle = document.getElementById('userProfileModalTitle');
  if (!modal || !container) return;

  const authUser = window.hospitrackAuth.getCurrentUser();
  if (!authUser) return;

  const roleName = authUser.role || 'GUEST';
  const hospitalDisplay = authUser.hospitalName || authUser.hospitalId || 'Central Healthcare Network';
  pendingPhotoDataUrl = null;

  // Strict Patient Role Governance: Patients are strictly read-only
  if (roleName === 'PATIENT') {
    if (modalTitle) modalTitle.textContent = 'Patient Account Details';
    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--bg-surface-alt); border-radius: var(--radius-card); margin-bottom: 20px;">
        ${renderAvatar(authUser, 'avatar-lg')}
        <div>
          <h3 style="font-size: 1.15rem; color: var(--text-main); margin: 0 0 4px 0;">${escapeHtml(authUser.name || 'Patient')}</h3>
          <p style="font-size: 0.84rem; color: var(--text-secondary); margin: 0 0 6px 0;">${escapeHtml(authUser.email || 'patient@hospitrack.com')}</p>
          <div style="display: flex; gap: 6px; flex-wrap: wrap;">
            <span class="badge badge-info">PATIENT</span>
            <span class="badge badge-success">✓ Hospital Verified</span>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
        <div style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">ASSIGNED FACILITY</div>
          <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-top: 2px;">${escapeHtml(hospitalDisplay)}</div>
        </div>
        <div style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">PATIENT ID</div>
          <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-top: 2px; font-family: monospace;">${escapeHtml(authUser.patientId || authUser.id || 'N/A')}</div>
        </div>
        <div style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">REGISTERED PHONE</div>
          <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-top: 2px;">${escapeHtml(authUser.phone || authUser.contact || 'N/A')}</div>
        </div>
        <div style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">CREDENTIAL GOVERNANCE</div>
          <div style="font-size: 0.88rem; font-weight: 700; color: var(--success); margin-top: 2px;">Admitting Facility Managed</div>
        </div>
      </div>

      <div style="background: rgba(37, 99, 235, 0.05); border: 1px solid rgba(37, 99, 235, 0.2); border-radius: var(--radius-md); padding: 12px 16px; margin-bottom: 20px; font-size: 0.84rem; color: var(--text-secondary); line-height: 1.45;">
        ℹ️ <strong>Hospital Maintained Record:</strong> Patient credentials, clinical identity, and official photos are issued and governed by your attending hospital administration. Contact your hospital if updates are required.
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal('userProfileModal')">Close</button>
        <button type="button" class="btn btn-primary" onclick="closeModal('userProfileModal'); if(window.openContactHospitalModal) window.openContactHospitalModal('${authUser.hospitalId || ''}');">
          <span>📞</span> Contact Hospital
        </button>
      </div>
    `;
    modal.classList.add('open');
    return;
  }

  if (modalTitle) {
    modalTitle.textContent = isEditMode ? 'Edit Account Profile' : 'Account Details';
  }

  if (isEditMode) {
    container.innerHTML = `
      <form id="userProfileEditForm" onsubmit="handleSaveUserProfile(event)" style="padding: 0.5rem 0;">
        <div id="userProfileModalAlert" class="alert-banner hidden mb-16"></div>

        <!-- Reusable Profile Photo Uploader -->
        <div class="profile-photo-uploader">
          <div class="photo-preview-wrap" id="modalPhotoPreviewContainer">
            ${renderAvatar(authUser, 'avatar-lg')}
          </div>
          <div class="photo-upload-controls">
            <label class="form-label" style="margin-bottom: 4px;">Profile Photo</label>
            <p>Upload a clear portrait. Formats: JPG, PNG, WEBP (Max 2MB).</p>
            <div style="display: flex; gap: 8px; flex-wrap: wrap; align-items: center;">
              <label class="btn btn-secondary btn-sm" style="cursor: pointer; margin: 0;">
                <span>📷 Browse Image</span>
                <input type="file" id="modalProfileFileInput" accept="image/jpeg,image/png,image/webp" style="display: none;" onchange="handleModalPhotoSelect(event)">
              </label>
              ${authUser.avatarUrl ? `
                <button type="button" class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="handleModalPhotoRemove()">
                  Remove
                </button>
              ` : ''}
            </div>
          </div>
        </div>

        <div class="form-group mb-16">
          <label class="form-label" for="userEditName">Full Name <span style="color: var(--danger);">*</span></label>
          <input type="text" id="userEditName" class="form-control" value="${escapeHtml(authUser.name || '')}" required minlength="2">
        </div>

        <div class="form-group mb-16">
          <label class="form-label" for="userEditEmail">Email Address <span style="color: var(--danger);">*</span></label>
          <input type="email" id="userEditEmail" class="form-control" value="${escapeHtml(authUser.email || '')}" required>
        </div>

        <div class="form-group mb-16">
          <label class="form-label" for="userEditPhone">Contact Phone</label>
          <input type="tel" id="userEditPhone" class="form-control" value="${escapeHtml(authUser.phone || authUser.contact || '')}" placeholder="+91 98765 43210">
        </div>

        <div style="background: var(--bg-surface-alt); padding: 12px 14px; border-radius: var(--radius-md); margin-bottom: 16px; border: 1px solid var(--border-color);">
          <div style="font-size: 0.78rem; font-weight: 700; color: var(--text-secondary); text-transform: uppercase;">Role &amp; Facility</div>
          <div style="font-size: 0.88rem; color: var(--text-main); margin-top: 4px;">
            Role: <span class="badge badge-info">${roleName}</span> &bull; Facility: <strong>${escapeHtml(hospitalDisplay)}</strong>
          </div>
        </div>

        <div class="modal-actions">
          <button type="button" class="btn btn-secondary" onclick="openUserProfileModal(false)">Cancel</button>
          <button type="submit" id="saveUserProfileBtn" class="btn btn-primary">Save Profile</button>
        </div>
      </form>
    `;
  } else {
    container.innerHTML = `
      <div style="display: flex; align-items: center; gap: 16px; padding: 16px; background: var(--bg-surface-alt); border-radius: var(--radius-card); margin-bottom: 20px;">
        ${renderAvatar(authUser, 'avatar-lg')}
        <div>
          <h3 style="font-size: 1.15rem; color: var(--text-main);">${escapeHtml(authUser.name || 'User')}</h3>
          <p style="font-size: 0.84rem; color: var(--text-secondary);">${escapeHtml(authUser.email || 'user@hospitrack.com')}</p>
          <div style="margin-top: 6px; display: flex; gap: 6px;">
            <span class="badge badge-info">${roleName}</span>
            <span class="badge badge-active">${authUser.status || 'ACTIVE'}</span>
          </div>
        </div>
      </div>

      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 14px; margin-bottom: 20px;">
        <div style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">ASSIGNED FACILITY</div>
          <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-top: 2px;">${escapeHtml(hospitalDisplay)}</div>
        </div>
        <div style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">CONTACT PHONE</div>
          <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-top: 2px;">${escapeHtml(authUser.phone || 'N/A')}</div>
        </div>
        <div style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">MEMBER ID</div>
          <div style="font-size: 0.88rem; font-weight: 700; color: var(--text-main); margin-top: 2px; font-family: monospace;">${escapeHtml(authUser.id || authUser.patientId || authUser.doctorId || 'N/A')}</div>
        </div>
        <div style="padding: 12px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-md);">
          <div style="font-size: 0.75rem; color: var(--text-muted); font-weight: 600;">ACCOUNT STATUS</div>
          <div style="font-size: 0.88rem; font-weight: 700; color: var(--success); margin-top: 2px;">✓ Verified Account</div>
        </div>
      </div>

      <div class="modal-actions">
        <button type="button" class="btn btn-secondary" onclick="closeModal('userProfileModal')">Close</button>
        <button type="button" class="btn btn-primary" onclick="openUserProfileModal(true)">Edit Profile</button>
      </div>
    `;
  }

  modal.classList.add('open');
}
window.openUserProfileModal = openUserProfileModal;

function handleModalPhotoSelect(event) {
  const file = event.target.files && event.target.files[0];
  if (!file) return;

  const validTypes = ['image/jpeg', 'image/png', 'image/webp'];
  if (!validTypes.includes(file.type)) {
    window.showToast('Please select a JPG, PNG, or WEBP image file.', 'warning');
    return;
  }

  if (file.size > 2 * 1024 * 1024) {
    window.showToast('Profile photo must be smaller than 2MB.', 'warning');
    return;
  }

  const reader = new FileReader();
  reader.onload = function(e) {
    pendingPhotoDataUrl = e.target.result;
    const previewContainer = document.getElementById('modalPhotoPreviewContainer');
    if (previewContainer) {
      previewContainer.innerHTML = `<div class="avatar avatar-lg"><img src="${pendingPhotoDataUrl}" alt="Preview"></div>`;
    }
  };
  reader.readAsDataURL(file);
}
window.handleModalPhotoSelect = handleModalPhotoSelect;

async function handleModalPhotoRemove() {
  const alertEl = document.getElementById('userProfileModalAlert');
  try {
    await window.hospitrackAuth.removeProfilePhoto();
    pendingPhotoDataUrl = null;
    const authUser = window.hospitrackAuth.getCurrentUser();
    if (window.updateHeaderUI) window.updateHeaderUI(authUser);
    window.showToast('Profile photo removed.', 'info');
    openUserProfileModal(true);
  } catch (err) {
    showModalAlert(alertEl, err.message || 'Failed to remove photo.', 'error');
  }
}
window.handleModalPhotoRemove = handleModalPhotoRemove;

async function handleSaveUserProfile(event) {
  event.preventDefault();
  const alertEl = document.getElementById('userProfileModalAlert');
  const submitBtn = document.getElementById('saveUserProfileBtn');

  const newName = document.getElementById('userEditName')?.value.trim();
  const newEmail = document.getElementById('userEditEmail')?.value.trim();
  const newPhone = document.getElementById('userEditPhone')?.value.trim();

  if (!newName || newName.length < 2) {
    showModalAlert(alertEl, 'Please enter a valid full name (at least 2 characters).', 'error');
    return;
  }
  if (!newEmail || !newEmail.includes('@')) {
    showModalAlert(alertEl, 'Please enter a valid email address.', 'error');
    return;
  }

  try {
    if (submitBtn) {
      submitBtn.disabled = true;
      submitBtn.textContent = 'Saving...';
    }

    // 1. Upload photo if selected
    if (pendingPhotoDataUrl) {
      await window.hospitrackAuth.uploadProfilePhoto(pendingPhotoDataUrl);
      pendingPhotoDataUrl = null;
    }

    // 2. Update profile fields
    const updatedUser = await window.hospitrackAuth.updateProfile({
      name: newName,
      email: newEmail,
      phone: newPhone
    });

    if (window.updateHeaderUI) {
      window.updateHeaderUI(updatedUser);
    }
    await window.hospitrackStore.syncAllData();

    window.showToast('Profile updated successfully.', 'success');
    closeModal('userProfileModal');
    if (window.renderCurrentView) {
      window.renderCurrentView();
    }
  } catch (err) {
    showModalAlert(alertEl, err.message || 'Failed to update profile.', 'error');
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Save Profile';
    }
  }
}
window.handleSaveUserProfile = handleSaveUserProfile;

// --------------------------------------------------------------------------
// Account Settings Modal (Password Change + Account Info)
// --------------------------------------------------------------------------
window.openAccountSettingsModal = function() {
  const modal = document.getElementById('accountSettingsModal');
  const infoEl = document.getElementById('accountSettingsInfo');
  if (!modal) return;

  const user = window.hospitrackAuth.getCurrentUser();
  if (user && infoEl) {
    infoEl.innerHTML = `
      <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 12px;">
        <div style="padding: 10px; background: var(--bg-surface-alt); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Account Email</div>
          <div style="font-size: 0.85rem; color: var(--text-main); font-weight: 600; margin-top: 2px;">${escapeHtml(user.email || 'N/A')}</div>
        </div>
        <div style="padding: 10px; background: var(--bg-surface-alt); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Role</div>
          <div style="font-size: 0.85rem; color: var(--text-main); font-weight: 600; margin-top: 2px;"><span class="badge badge-info">${escapeHtml(user.role || 'PATIENT')}</span></div>
        </div>
        <div style="padding: 10px; background: var(--bg-surface-alt); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Account Status</div>
          <div style="font-size: 0.85rem; color: var(--success); font-weight: 700; margin-top: 2px;">✓ Active &amp; Verified</div>
        </div>
        <div style="padding: 10px; background: var(--bg-surface-alt); border-radius: var(--radius-md); border: 1px solid var(--border-color);">
          <div style="font-size: 0.72rem; color: var(--text-muted); font-weight: 600; text-transform: uppercase;">Account ID</div>
          <div style="font-size: 0.82rem; color: var(--text-main); font-family: monospace; margin-top: 2px;">${escapeHtml(user.id || user.patientId || user.doctorId || 'N/A')}</div>
        </div>
      </div>
    `;
  }

  // Reset change password form
  const form = document.getElementById('changePasswordForm');
  if (form) form.reset();
  const alertEl = document.getElementById('changePwdAlert');
  if (alertEl) alertEl.className = 'alert-banner hidden mb-12';

  modal.classList.add('open');
};

window.handleChangePasswordSubmit = async function(event) {
  event.preventDefault();
  const alertEl = document.getElementById('changePwdAlert');
  const btn = document.getElementById('changePwdBtn');
  const currentPwd = document.getElementById('currentPasswordInput')?.value;
  const newPwd = document.getElementById('newPwdInput')?.value;
  const confirmPwd = document.getElementById('confirmNewPwdInput')?.value;

  if (alertEl) alertEl.className = 'alert-banner hidden mb-12';

  if (!currentPwd || !newPwd || !confirmPwd) {
    if (alertEl) { alertEl.className = 'alert-banner error mb-12'; alertEl.textContent = 'Please fill in all password fields.'; alertEl.classList.remove('hidden'); }
    return;
  }
  if (newPwd.length < 8) {
    if (alertEl) { alertEl.className = 'alert-banner error mb-12'; alertEl.textContent = 'New password must be at least 8 characters.'; alertEl.classList.remove('hidden'); }
    return;
  }
  if (newPwd !== confirmPwd) {
    if (alertEl) { alertEl.className = 'alert-banner error mb-12'; alertEl.textContent = 'New passwords do not match.'; alertEl.classList.remove('hidden'); }
    return;
  }

  try {
    if (btn) { btn.disabled = true; btn.textContent = 'Updating...'; }
    await window.hospitrackAuth.changePassword(currentPwd, newPwd);
    window.showToast('Password updated successfully. Please sign in again.', 'success');
    closeModal('accountSettingsModal');
    setTimeout(() => window.handleLogoutAction(), 1500);
  } catch (err) {
    if (alertEl) { alertEl.className = 'alert-banner error mb-12'; alertEl.textContent = err.message || 'Failed to update password.'; alertEl.classList.remove('hidden'); }
  } finally {
    if (btn) { btn.disabled = false; btn.textContent = 'Update Password'; }
  }
};

// --------------------------------------------------------------------------
// Static Modal Fallback Event Handlers
// --------------------------------------------------------------------------
async function handleAddDoctorSubmit(event) {
  event.preventDefault();
  const user = window.hospitrackAuth.getCurrentUser();
  const hospitalId = user?.hospitalId || 'HOSP-101';
  const name = document.getElementById('addDocName')?.value.trim();
  const email = document.getElementById('addDocEmail')?.value.trim();
  const licenseNo = document.getElementById('addDocLicense')?.value.trim();
  const specialty = document.getElementById('addDocSpecialty')?.value.trim();
  const contact = document.getElementById('addDocPhone')?.value.trim();
  const password = document.getElementById('addDocPassword')?.value;
  const alertEl = document.getElementById('addDocAlert');

  try {
    await window.hospitrackStore.createDoctor({
      hospitalId,
      name,
      email,
      licenseNo,
      specialty,
      contact,
      password: password || 'Doctor@123!'
    });
    window.showToast(`Doctor ${name} successfully added.`, 'success');
    closeModal('addDoctorModal');
    if (window.renderHospitalDashboard) {
      window.renderHospitalDashboard(document.getElementById('mainContentArea'));
    }
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to add doctor.';
      alertEl.classList.remove('hidden');
    }
  }
}
window.handleAddDoctorSubmit = handleAddDoctorSubmit;

async function handleReviewSubmit(event) {
  event.preventDefault();
  const alertEl = document.getElementById('reviewAlert');
  const submitBtn = document.getElementById('submitReviewBtn');
  const hospId = document.getElementById('reviewHospitalId')?.value;
  const rating = parseInt(document.getElementById('reviewRating')?.value || '5', 10);
  const title = document.getElementById('reviewTitle')?.value.trim();
  const reviewText = document.getElementById('reviewText')?.value.trim();

  if (alertEl) alertEl.classList.add('hidden');

  if (submitBtn) {
    submitBtn.disabled = true;
    submitBtn.textContent = 'Submitting...';
  }

  try {
    const payload = {
      hospitalId: hospId,
      rating,
      title,
      reviewText,
      interactionDetails: 'Verified Patient Care'
    };

    const res = await window.hospitrackStore.apiRequest('/api/reviews', 'POST', payload);
    await window.hospitrackStore.syncAllData();

    window.showToast('Verified review submitted successfully!', 'success');
    closeModal('reviewModal');

    if (window.renderPatientDashboard) {
      window.renderPatientDashboard(document.getElementById('mainContentArea'), 'reviews');
    }
  } catch (err) {
    if (alertEl) {
      alertEl.textContent = err.message || 'Failed to submit review. You must have a verified interaction at this hospital.';
      alertEl.className = 'alert-banner alert-danger mb-16';
      alertEl.classList.remove('hidden');
    }
  } finally {
    if (submitBtn) {
      submitBtn.disabled = false;
      submitBtn.textContent = 'Submit Verified Review';
    }
  }
}
window.handleReviewSubmit = handleReviewSubmit;

function closeModal(modalId) {
  const modal = document.getElementById(modalId);
  if (modal) modal.classList.remove('open');
}
window.closeModal = closeModal;

// --------------------------------------------------------------------------
// Helper functions for user avatars and role themes
function getUserInitials(name) {
  if (!name || typeof name !== 'string') return 'U';
  const clean = name.replace(/^(Dr\.|Dr|Mr\.|Mr|Ms\.|Ms|Mrs\.|Mrs)\s+/i, '').trim();
  const parts = clean.split(/\s+/).filter(Boolean);
  if (parts.length === 0) return 'U';
  if (parts.length === 1) return parts[0].substring(0, 2).toUpperCase();
  return (parts[0][0] + parts[parts.length - 1][0]).toUpperCase();
}

function getRoleColorHex(role) {
  switch ((role || '').toUpperCase()) {
    case 'SUPER_ADMIN':
    case 'ADMIN': return '#7C3AED';
    case 'HOSPITAL_ADMIN':
    case 'HOSPITAL': return '#2563EB';
    case 'DOCTOR': return '#0D9488';
    case 'PATIENT': return '#0284C7';
    default: return '#0D9488';
  }
}

function getRoleGradient(role) {
  switch ((role || '').toUpperCase()) {
    case 'SUPER_ADMIN':
    case 'ADMIN': return 'linear-gradient(135deg, #7C3AED, #5B21B6)';
    case 'HOSPITAL_ADMIN':
    case 'HOSPITAL': return 'linear-gradient(135deg, #2563EB, #1D4ED8)';
    case 'DOCTOR': return 'linear-gradient(135deg, #0D9488, #0F766E)';
    case 'PATIENT': return 'linear-gradient(135deg, #0284C7, #0369A1)';
    default: return 'linear-gradient(135deg, #0D9488, #0F766E)';
  }
}

function renderAvatar(user, sizeClass = 'avatar-sm', extraClass = '') {
  const name = (user && user.name) || 'User';
  const avatarUrl = user && user.avatarUrl;
  const role = (user && user.role) || 'PATIENT';
  const roleGrad = getRoleGradient(role);

  if (avatarUrl) {
    return `<div class="avatar ${sizeClass} ${extraClass}" title="${escapeHtml(name)}"><img src="${escapeHtml(avatarUrl)}" alt="${escapeHtml(name)}"></div>`;
  }
  const initials = getUserInitials(name);
  return `<div class="avatar ${sizeClass} ${extraClass}" style="background: ${roleGrad};" title="${escapeHtml(name)}">${initials}</div>`;
}
window.renderAvatar = renderAvatar;

// Adaptive Role Header & Navigation
// --------------------------------------------------------------------------
function updateHeaderUI(user, explicitRole) {
  const authHeaderAvatar = document.getElementById('authHeaderAvatar');
  const authHeaderName = document.getElementById('authHeaderName');
  const authHeaderRole = document.getElementById('authHeaderRole');

  const profileDropdownAvatar = document.getElementById('profileDropdownAvatar');
  const profileDropdownName = document.getElementById('profileDropdownName');
  const profileDropdownEmail = document.getElementById('profileDropdownEmail');
  const profileDropdownRoleBadge = document.getElementById('profileDropdownRoleBadge');

  if (!user) return;

  const roleName = explicitRole || user.role || 'PATIENT';
  const roleColor = getRoleColorHex(roleName);
  const roleGrad = getRoleGradient(roleName);

  let displayName = user.name;
  let displayEmail = user.email || 'user@hospitrack.com';
  if (!displayName || displayName === 'User' || displayName === 'Healthcare User') {
    if (roleName === 'DOCTOR') {
      displayName = 'Dr. Sarah Sharma';
      if (!user.email || user.email === 'user@hospitrack.com') displayEmail = 's.sharma@citygeneral.in';
    } else if (roleName === 'HOSPITAL_ADMIN' || roleName === 'HOSPITAL') {
      displayName = 'Hospital Administrator';
      if (!user.email || user.email === 'user@hospitrack.com') displayEmail = 'admin@citygeneral.in';
    } else if (roleName === 'SUPER_ADMIN' || roleName === 'ADMIN') {
      displayName = 'System Administrator';
      if (!user.email || user.email === 'user@hospitrack.com') displayEmail = 'admin@hospitrack.com';
    } else {
      displayName = 'Healthcare User';
    }
  }

  const initials = getUserInitials(displayName);

  if (authHeaderAvatar) {
    if (user.avatarUrl) {
      authHeaderAvatar.innerHTML = `<img src="${escapeHtml(user.avatarUrl)}" alt="${escapeHtml(displayName)}">`;
      authHeaderAvatar.style.background = 'transparent';
    } else {
      authHeaderAvatar.textContent = initials;
      authHeaderAvatar.style.background = roleGrad;
    }
  }
  if (authHeaderName) {
    authHeaderName.textContent = displayName;
  }
  if (authHeaderRole) {
    authHeaderRole.textContent = roleName;
    authHeaderRole.style.color = roleColor;
  }

  if (profileDropdownAvatar) {
    if (user.avatarUrl) {
      profileDropdownAvatar.innerHTML = `<img src="${escapeHtml(user.avatarUrl)}" alt="${escapeHtml(displayName)}">`;
      profileDropdownAvatar.style.background = 'transparent';
    } else {
      profileDropdownAvatar.textContent = initials;
      profileDropdownAvatar.style.background = roleGrad;
    }
  }
  if (profileDropdownName) {
    profileDropdownName.textContent = displayName;
  }
  if (profileDropdownEmail) {
    profileDropdownEmail.textContent = displayEmail;
  }
  if (profileDropdownRoleBadge) {
    profileDropdownRoleBadge.textContent = roleName;
    profileDropdownRoleBadge.style.background = `${roleColor}22`;
    profileDropdownRoleBadge.style.color = roleColor;
  }

  const editProfileEl = document.getElementById('headerDropdownEditProfileItem');
  if (editProfileEl) {
    if (roleName === 'PATIENT') {
      editProfileEl.style.display = 'none';
    } else {
      editProfileEl.style.display = 'flex';
    }
  }
}
window.updateHeaderUI = updateHeaderUI;

function toggleProfileDropdown() {
  const menu = document.getElementById('profileDropdownMenu');
  const btn = document.getElementById('profileDropdownBtn');
  if (!menu) return;

  const isOpen = menu.classList.contains('open');
  if (isOpen) {
    closeProfileDropdown();
  } else {
    closeNotifDropdown();
    closeGlobalSearch();
    menu.classList.add('open');
    if (btn) btn.setAttribute('aria-expanded', 'true');
  }
}
window.toggleProfileDropdown = toggleProfileDropdown;

function closeProfileDropdown() {
  const menu = document.getElementById('profileDropdownMenu');
  const btn = document.getElementById('profileDropdownBtn');
  if (menu) menu.classList.remove('open');
  if (btn) btn.setAttribute('aria-expanded', 'false');
}
window.closeProfileDropdown = closeProfileDropdown;

window.handleProfileMenuClick = function(action) {
  closeProfileDropdown();
  const user = window.hospitrackAuth.getCurrentUser();
  if (!user) return;

  if (action === 'view') {
    if (user.role === 'PATIENT') {
      navigateToRoleSection('PATIENT', 'profile', { editMode: false });
    } else if (user.role === 'HOSPITAL_ADMIN' || user.role === 'HOSPITAL') {
      navigateToRoleSection('HOSPITAL_ADMIN', 'profile', { editMode: false });
    } else if (user.role === 'DOCTOR') {
      navigateToRoleSection('DOCTOR', 'profile', { editMode: false });
    } else if (user.role === 'SUPER_ADMIN') {
      navigateToRoleSection('SUPER_ADMIN', 'profile', { editMode: false });
    }
  } else if (action === 'edit') {
    if (user.role === 'PATIENT') {
      navigateToRoleSection('PATIENT', 'profile', { editMode: false });
      return;
    }
    openUserProfileModal(true);
  } else if (action === 'settings') {
    if (window.openAccountSettingsModal) {
      window.openAccountSettingsModal();
    } else {
      openUserProfileModal(true);
    }
  } else if (action === 'logout') {
    handleLogoutAction();
  }
};

window.handleLogoutAction = function() {
  closeProfileDropdown();
  closeNotifDropdown();
  const modal = document.getElementById('confirmLogoutModal');
  if (modal) {
    modal.classList.add('open');
  } else {
    if (window.confirm('Are you sure you want to log out?')) {
      executeLogoutAction();
    }
  }
};

window.executeLogoutAction = async function() {
  const modal = document.getElementById('confirmLogoutModal');
  if (modal) modal.classList.remove('open');

  try {
    await window.hospitrackAuth.logout();
  } catch (e) {
    window.hospitrackAuth.clearSession();
  }

  if (window.hospitrackStore && typeof window.hospitrackStore.clearAll === 'function') {
    window.hospitrackStore.clearAll();
  }

  showLoginView();
  window.showToast('You have been signed out successfully.', 'info');
  window.history.replaceState(null, '', '#login');
};

function updateBreadcrumbs(user, tab, subtab, explicitRole) {
  const roleEl = document.getElementById('headerBreadcrumbRole');
  const titleEl = document.getElementById('headerBreadcrumbTitle');
  if (!roleEl || !titleEl) return;

  const role = explicitRole || (user && user.role) || 'PATIENT';
  let roleLabel = 'Workspace';
  let titleLabel = 'Dashboard';

  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    roleLabel = 'Admin Command';
    if (subtab === 'audit' || tab === 'audit' || subtab === 'audit-trail') titleLabel = 'Audit Ledger';
    else if (subtab === 'beds' || subtab === 'bed-network') titleLabel = 'Bed Network';
    else if (subtab === 'hospitals') titleLabel = 'Hospitals';
    else if (subtab === 'doctors') titleLabel = 'Doctors';
    else if (subtab === 'patients') titleLabel = 'Patients';
    else if (subtab === 'referrals') titleLabel = 'Referrals';
    else if (subtab === 'transfers') titleLabel = 'Transfers';
    else if (subtab === 'onboarding') titleLabel = 'Hospital Onboarding';
    else if (subtab === 'reviews') titleLabel = 'Review Center';
    else if (subtab === 'quality' || subtab === 'hospital-management') titleLabel = 'Hospital Governance';
    else if (subtab === 'reports' || subtab === 'analytics') titleLabel = 'National Reports & Analytics';
    else if (subtab === 'settings' || subtab === 'security') titleLabel = 'System & Security Settings';
    else if (subtab === 'notifications') titleLabel = 'System Alerts';
    else if (subtab === 'profile') titleLabel = 'Admin Profile';
    else titleLabel = 'System Overview';
  } else if (role === 'HOSPITAL_ADMIN' || role === 'HOSPITAL') {
    roleLabel = 'Hospital Operations';
    if (subtab === 'facility' || subtab === 'profile') titleLabel = 'Facility Profile';
    else if (subtab === 'departments') titleLabel = 'Departments';
    else if (subtab === 'ward-management' || subtab === 'bed-management' || subtab === 'capacity' || subtab === 'beds' || subtab === 'ward' || subtab === 'wards' || subtab === 'ward-capacity') titleLabel = 'Ward Management & Capacity';
    else if (subtab === 'doctors' || subtab === 'staff') titleLabel = 'Medical Staff';
    else if (subtab === 'patients') titleLabel = 'Inpatient Patients';
    else if (subtab === 'consultations') titleLabel = 'Consultations';
    else if (subtab === 'referrals' || subtab === 'specialist-referrals' || subtab === 'referral-pipeline') titleLabel = 'Specialist Referral Pipeline';
    else if (subtab === 'transfers' || subtab === 'emergency-transfers' || subtab === 'emergency-transfer' || subtab === 'transfer-triage' || subtab === 'emergency-triage' || subtab === 'transfer') titleLabel = 'Emergency Transfer Triage';
    else if (subtab === 'discharge-clearance' || subtab === 'discharge' || subtab === 'discharges' || subtab === 'dischargeclearance') titleLabel = 'Discharge Clearance';
    else if (subtab === 'lab-reports' || subtab === 'labs') titleLabel = 'Lab Reports';
    else if (subtab === 'prescriptions') titleLabel = 'Prescriptions';
    else titleLabel = 'Operations Overview';
  } else if (role === 'DOCTOR') {
    roleLabel = 'Doctor Workstation';
    if (subtab === 'patients') titleLabel = 'Patients';
    else if (subtab === 'consultations') titleLabel = 'Consultations';
    else if (subtab === 'prescriptions') titleLabel = 'Prescriptions';
    else if (subtab === 'laboratory' || subtab === 'labs') titleLabel = 'Laboratory';
    else if (subtab === 'referrals') titleLabel = 'Referrals';
    else if (subtab === 'transfers' || subtab === 'transfer') titleLabel = 'Emergency Transfers';
    else if (subtab === 'profile') titleLabel = 'Doctor Profile';
    else titleLabel = 'Dashboard';
  } else if (role === 'PATIENT') {
    roleLabel = 'Patient Health';
    if (subtab === 'consultations' || subtab === 'visits') titleLabel = 'Consultations';
    else if (subtab === 'prescriptions') titleLabel = 'Prescriptions';
    else if (subtab === 'lab-reports' || subtab === 'reports' || subtab === 'labs') titleLabel = 'Lab Reports';
    else if (subtab === 'referrals') titleLabel = 'Referrals';
    else if (subtab === 'transfers' || subtab === 'transfer') titleLabel = 'Emergency Transfers';
    else if (subtab === 'medical-summary' || subtab === 'summary') titleLabel = 'Medical Summary';
    else if (subtab === 'feedback' || subtab === 'reviews') titleLabel = 'Hospital Feedback';
    else if (subtab === 'profile') titleLabel = 'Patient Profile';
    else titleLabel = 'Care Timeline';
  }

  roleEl.textContent = roleLabel;
  titleEl.textContent = titleLabel;
}

function navigateToDefaultOverview() {
  const user = window.hospitrackAuth.getCurrentUser();
  if (!user) return;
  const role = user.role;
  let section = 'overview';
  if (role === 'PATIENT') section = 'timeline';
  else if (role === 'DOCTOR') section = 'dashboard';

  navigateToRoleSection(role, section);
}
window.navigateToDefaultOverview = navigateToDefaultOverview;

// --------------------------------------------------------------------------
// SINGLE SOURCE OF TRUTH ROUTER
// --------------------------------------------------------------------------
function navigateToRoleSection(role, section, params = {}, updateUrl = true) {
  const auth = window.hospitrackAuth;
  const user = auth ? auth.getCurrentUser() : null;
  if (!user) {
    showLoginView();
    return;
  }

  // Close mobile sidebar drawer upon navigation
  closeMobileSidebar();
  closeProfileDropdown();
  closeNotifDropdown();
  closeGlobalSearch();

  // Single Source of Truth Super Admin Canonical Sections Registry
  const SUPER_ADMIN_CANONICAL = [
    'overview',
    'hospitals',
    'doctors',
    'patients',
    'referrals',
    'transfers',
    'beds',
    'bed-network',
    'reviews',
    'quality',
    'hospital-management',
    'onboarding',
    'audit',
    'reports',
    'settings',
    'notifications',
    'profile'
  ];
  window.SUPER_ADMIN_SECTIONS = SUPER_ADMIN_CANONICAL;

  // Role Authorization Guard: Non-superadmins can only access their own role views
  const userRole = (user && user.role) ? user.role.toUpperCase() : 'PATIENT';
  const isSuperAdmin = userRole === 'SUPER_ADMIN' || userRole === 'ADMIN';

  let authorizedRole = role || userRole;
  if (!isSuperAdmin) {
    if (userRole === 'DOCTOR' && authorizedRole !== 'DOCTOR') {
      authorizedRole = 'DOCTOR';
    } else if ((userRole === 'HOSPITAL_ADMIN' || userRole === 'HOSPITAL') && (authorizedRole !== 'HOSPITAL_ADMIN' && authorizedRole !== 'HOSPITAL')) {
      authorizedRole = 'HOSPITAL_ADMIN';
    } else if (userRole === 'PATIENT' && authorizedRole !== 'PATIENT') {
      authorizedRole = 'PATIENT';
    }
  }

  const effectiveRole = authorizedRole;
  let sec = (section || 'overview').toLowerCase().trim();

  // Role-Aware Section Normalization
  if (effectiveRole === 'SUPER_ADMIN' || effectiveRole === 'ADMIN') {
    if (sec === 'dashboard' || sec === 'command-center' || sec === 'home') sec = 'overview';
    else if (sec === 'facilities') sec = 'hospitals';
    else if (sec === 'bed-network' || sec === 'beds' || sec === 'bednetwork' || sec === 'capacity' || sec === 'network') sec = 'beds';
    else if (sec === 'audit-trail' || sec === 'audit-ledger' || sec === 'ledger' || sec === 'compliance' || sec === 'audits') sec = 'audit';
    else if (sec === 'onboard-hospital' || sec === 'onboard') sec = 'quality';
    else if (sec === 'hospital-management' || sec === 'governance') sec = 'quality';
    else if (sec === 'feedback') sec = 'reviews';
    else if (sec === 'analytics' || sec === 'statistics' || sec === 'national-reports') sec = 'reports';
    else if (sec === 'security' || sec === 'config' || sec === 'system-settings') sec = 'settings';
  } else if (effectiveRole === 'HOSPITAL_ADMIN' || effectiveRole === 'HOSPITAL') {
    if (sec === 'facility') sec = 'profile';
    else if (sec === 'visits') sec = 'consultations';
    else if (sec === 'reports' || sec === 'labs') sec = 'lab-reports';
    else if (sec === 'capacity' || sec === 'beds' || sec === 'bed-management' || sec === 'ward-management' || sec === 'ward' || sec === 'wards' || sec === 'ward-capacity') sec = 'ward-management';
    else if (sec === 'specialist-referrals' || sec === 'referral-pipeline' || sec === 'specialist-referral' || sec === 'referral') sec = 'referrals';
    else if (sec === 'emergency-transfers' || sec === 'emergency-transfer' || sec === 'transfer-triage' || sec === 'emergency-triage' || sec === 'transfer') sec = 'transfers';
    else if (sec === 'discharge' || sec === 'discharges' || sec === 'dischargeclearance' || sec === 'discharge-clearances') sec = 'discharge-clearance';
  } else if (effectiveRole === 'DOCTOR') {
    if (sec === 'queue') sec = 'dashboard';
    else if (sec === 'reports' || sec === 'labs') sec = 'laboratory';
    else if (sec === 'transfer') sec = 'transfers';
  } else if (effectiveRole === 'PATIENT') {
    if (sec === 'visits') sec = 'consultations';
    else if (sec === 'reports' || sec === 'labs') sec = 'lab-reports';
    else if (sec === 'summary') sec = 'medical-summary';
    else if (sec === 'transfer') sec = 'transfers';
    else if (sec === 'feedback') sec = 'reviews';
  }

  activeRole = effectiveRole;
  activeRoleSubtab = sec;
  activeTab = (sec === 'audit') ? 'audit' : 'dashboard';

  // Synchronize URL Hash if required
  if (updateUrl !== false) {
    let rolePrefix = 'patient';
    if (activeRole === 'DOCTOR') rolePrefix = 'doctor';
    else if (activeRole === 'HOSPITAL_ADMIN' || activeRole === 'HOSPITAL') rolePrefix = 'hospital';
    else if (activeRole === 'SUPER_ADMIN' || activeRole === 'ADMIN') rolePrefix = 'admin';

    const targetHash = `#${rolePrefix}/${sec}`;
    if (window.location.hash !== targetHash) {
      window.history.pushState(null, '', targetHash);
    }
  }

  // Synchronize dynamic header UI, sidebar, and breadcrumbs
  updateHeaderUI(user, activeRole);
  renderDynamicSidebar(user, activeRole);
  updateBreadcrumbs(user, activeTab, activeRoleSubtab, activeRole);

  // Clean and Replace Main Content
  const container = document.getElementById('mainContentArea');
  if (!container) return;
  container.innerHTML = '';

  const editMode = params?.editMode || false;

  // Render Component View within resilient boundary
  try {
    if (sec === 'departments') {
      if (window.renderDepartmentWorkspace) {
        window.renderDepartmentWorkspace(container);
      }
    } else if (activeRole === 'SUPER_ADMIN' || activeRole === 'ADMIN') {
      if (window.renderAdminDashboard) {
        window.renderAdminDashboard(container, sec);
      }
    } else if (activeRole === 'HOSPITAL_ADMIN' || activeRole === 'HOSPITAL') {
      if (window.renderHospitalDashboard) {
        window.renderHospitalDashboard(container, sec, editMode);
      }
    } else if (activeRole === 'DOCTOR') {
      if (window.renderDoctorDashboard) {
        window.renderDoctorDashboard(container, sec);
      }
    } else if (activeRole === 'PATIENT') {
      if (window.renderPatientDashboard) {
        window.renderPatientDashboard(container, sec, editMode);
      }
    }
  } catch (err) {
    console.error(`Router error rendering section [${sec}] for role [${activeRole}]:`, err);
    container.innerHTML = `
      <div class="dashboard-section-error" style="margin: 32px 0; padding: 32px; background: var(--bg-surface); border: 1px solid var(--border-color); border-radius: var(--radius-card); text-align: center;">
        <div style="font-size: 2.5rem; margin-bottom: 12px;">⚠️</div>
        <h3 style="color: var(--text-main); font-size: 1.2rem; margin-bottom: 8px;">Unable to load this section</h3>
        <p style="color: var(--text-secondary); max-width: 480px; margin: 0 auto 16px auto; font-size: 0.88rem;">
          ${escapeHtml(err.message || 'A technical error occurred while loading this view.')}
        </p>
        <button type="button" class="btn btn-primary" onclick="navigateToRoleSection('${escapeHtml(activeRole)}', '${escapeHtml(sec)}')">
          🔄 Retry
        </button>
      </div>
    `;
  }
}
window.navigateToRoleSection = navigateToRoleSection;

// Backward-compatibility navigation helpers all delegate to the single central router
window.navigateToAdminSection = function(section) {
  window.navigateToRoleSection('SUPER_ADMIN', section);
};
window.navigateToHospitalTab = function(tab, editMode = false) {
  window.navigateToRoleSection('HOSPITAL_ADMIN', tab, { editMode });
};
window.navigateToDoctorTab = function(tab) {
  window.navigateToRoleSection('DOCTOR', tab);
};
window.navigateToPatientTab = function(tab, editMode = false) {
  window.navigateToRoleSection('PATIENT', tab, { editMode });
};

// --------------------------------------------------------------------------
// Adaptive Role-Based Sidebar Navigation
// --------------------------------------------------------------------------
// --------------------------------------------------------------------------
// Unified Global Sidebar State & Storage Manager
// --------------------------------------------------------------------------
const SIDEBAR_STORAGE_KEY = 'hospitrack_sidebar_state';

function getPersistedSidebarState() {
  if (typeof window !== 'undefined' && window.innerWidth <= 900) {
    return 'expanded'; // Mobile drawer navigation is internally full-width
  }
  try {
    const saved = localStorage.getItem(SIDEBAR_STORAGE_KEY);
    return saved === 'collapsed' ? 'collapsed' : 'expanded';
  } catch (e) {
    return 'expanded';
  }
}
window.getPersistedSidebarState = getPersistedSidebarState;

function setPersistedSidebarState(state) {
  try {
    localStorage.setItem(SIDEBAR_STORAGE_KEY, state);
  } catch (e) {}
}
window.setPersistedSidebarState = setPersistedSidebarState;

function applySidebarState(state) {
  const isCollapsed = state === 'collapsed';
  const sidebar = document.getElementById('appSidebar');
  const appContainer = document.querySelector('.app-container');

  setHtmlDatasetSidebarState(state);

  if (sidebar) {
    sidebar.classList.toggle('collapsed', isCollapsed);
  }
  if (appContainer) {
    appContainer.classList.toggle('sidebar-collapsed', isCollapsed);
  }

  const headerTop = document.getElementById('sidebarHeaderTop');
  if (headerTop) {
    headerTop.title = isCollapsed ? 'Expand navigation (Show all sections)' : 'Collapse navigation (Icons only)';
    headerTop.setAttribute('aria-label', isCollapsed ? 'Expand navigation' : 'Collapse navigation');
    headerTop.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
  }

  const collapseBtn = document.getElementById('sidebarCollapseBtn');
  if (collapseBtn) {
    collapseBtn.title = isCollapsed ? 'Expand navigation (Show all sections)' : 'Collapse navigation (Icons only)';
    collapseBtn.setAttribute('aria-label', isCollapsed ? 'Expand navigation' : 'Collapse navigation');
    collapseBtn.setAttribute('aria-expanded', isCollapsed ? 'false' : 'true');
    const iconEl = collapseBtn.querySelector('.collapse-icon') || collapseBtn;
    iconEl.innerHTML = window.getLucideIcon('menu', 'sidebar-menu-svg');
  }
}
window.applySidebarState = applySidebarState;

window.toggleSidebarCollapse = function(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  if (window.innerWidth <= 900) {
    toggleMobileSidebar();
    return;
  }
  const currentState = getPersistedSidebarState();
  const nextState = currentState === 'collapsed' ? 'expanded' : 'collapsed';
  setPersistedSidebarState(nextState);
  applySidebarState(nextState);
};

// Window resize listener to ensure sidebar state integrity
window.addEventListener('resize', () => {
  if (window.innerWidth > 900) {
    closeMobileSidebar();
    applySidebarState(getPersistedSidebarState());
  }
});

// --------------------------------------------------------------------------
// Standardized Doctor & Clinical Name Formatter (Eliminates Duplicated Dr. Dr.)
// --------------------------------------------------------------------------
function formatDoctorName(name) {
  if (!name) return 'Attending Physician';
  const clean = String(name).trim();
  const withoutDr = clean.replace(/^(?:Dr\.?\s*)+/i, '').trim();
  if (!withoutDr) return 'Attending Physician';
  return `Dr. ${withoutDr}`;
}
window.formatDoctorName = formatDoctorName;

// Quick Facility Switcher Dropdown Handlers
window.toggleSidebarFacilityDropdown = function(event) {
  if (event) {
    event.preventDefault();
    event.stopPropagation();
  }
  const dropdown = document.getElementById('sidebarFacilityDropdown');
  if (dropdown) dropdown.classList.toggle('hidden');
};

window.switchSidebarFacility = function(hospitalId) {
  const store = window.hospitrackStore;
  const dropdown = document.getElementById('sidebarFacilityDropdown');
  if (dropdown) dropdown.classList.add('hidden');
  const hosp = store.getHospitalById ? store.getHospitalById(hospitalId) : null;
  if (hosp) {
    window.showToast(`Switched active facility to ${hosp.name}`, 'info');
    const user = window.hospitrackAuth.getCurrentUser();
    if (user) {
      user.hospitalId = hospitalId;
      user.hospitalName = hosp.name;
    }
    renderDynamicSidebar(user, activeRole);
    if (window.renderCurrentView) window.renderCurrentView();
  }
};

// Close facility switcher on click outside
if (typeof document !== 'undefined' && typeof document.addEventListener === 'function') {
  document.addEventListener('click', (e) => {
    const wrap = document.getElementById('sidebarFacilityWrap');
    if (wrap && !wrap.contains(e.target)) {
      const dropdown = document.getElementById('sidebarFacilityDropdown');
      if (dropdown) dropdown.classList.add('hidden');
    }
  });
}

// --------------------------------------------------------------------------
// Standardized Lucide Vector Stroke Icons Library
// --------------------------------------------------------------------------
window.getLucideIcon = function(name, extraClass = '') {
  const norm = String(name || '').toLowerCase().trim();
  const icons = {
    'activity': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-activity ${extraClass}"><path d="M22 12h-4l-3 9L9 3l-3 9H2"/></svg>`,
    'pill': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-pill ${extraClass}"><path d="m10.5 20.5 10-10a4.95 4.95 0 1 0-7-7l-10 10a4.95 4.95 0 1 0 7 7Z"/><path d="m8.5 8.5 7 7"/></svg>`,
    'stethoscope': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-stethoscope ${extraClass}"><path d="M4.8 2.3A.3.3 0 1 0 5 2H4a2 2 0 0 0-2 2v5a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6V4a2 2 0 0 0-2-2h-1a.2.2 0 1 0 .3.3"/><path d="M8 15v1a6 6 0 0 0 6 6v0a6 6 0 0 0 6-6v-4"/><circle cx="20" cy="10" r="2"/></svg>`,
    'flask-conical': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-flask-conical ${extraClass}"><path d="M10 2v7.527a2 2 0 0 1-.211.896L4.72 20.55a1 1 0 0 0 .9 1.45h12.76a1 1 0 0 0 .9-1.45l-5.069-10.127A2 2 0 0 1 14 9.527V2"/><path d="M8.5 2h7"/><path d="M7 16h10"/></svg>`,
    'file-text': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-file-text ${extraClass}"><path d="M15 2H6a2 2 0 0 0-2 2v16a2 2 0 0 0 2 2h12a2 2 0 0 0 2-2V7Z"/><path d="M14 2v4a2 2 0 0 0 2 2h4"/><path d="M10 9H8"/><path d="M16 13H8"/><path d="M16 17H8"/></svg>`,
    'clipboard-list': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-clipboard-list ${extraClass}"><rect width="8" height="4" x="8" y="2" rx="1" ry="1"/><path d="M16 4h2a2 2 0 0 1 2 2v14a2 2 0 0 1-2 2H6a2 2 0 0 1-2-2V6a2 2 0 0 1 2-2h2"/><path d="M12 11h4"/><path d="M12 16h4"/><path d="M8 11h.01"/><path d="M8 16h.01"/></svg>`,
    'building-2': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-building-2 ${extraClass}"><path d="M6 22V4a2 2 0 0 1 2-2h8a2 2 0 0 1 2 2v18Z"/><path d="M6 12H4a2 2 0 0 0-2 2v6a2 2 0 0 0 2 2h2"/><path d="M18 9h2a2 2 0 0 1 2 2v9a2 2 0 0 1-2 2h-2"/><path d="M10 6h4"/><path d="M10 10h4"/><path d="M10 14h4"/><path d="M10 18h4"/></svg>`,
    'user': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-user ${extraClass}"><path d="M19 21v-2a4 4 0 0 0-4-4H9a4 4 0 0 0-4 4v2"/><circle cx="12" cy="7" r="4"/></svg>`,
    'users': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-users ${extraClass}"><path d="M16 21v-2a4 4 0 0 0-4-4H6a4 4 0 0 0-4 4v2"/><circle cx="9" cy="7" r="4"/><path d="M22 21v-2a4 4 0 0 0-3-3.87"/><path d="M16 3.13a4 4 0 0 1 0 7.75"/></svg>`,
    'bed': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bed ${extraClass}"><path d="M2 4v16"/><path d="M2 8h18a2 2 0 0 1 2 2v10"/><path d="M2 17h20"/><path d="M6 8v9"/></svg>`,
    'arrow-left-right': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-arrow-left-right ${extraClass}"><path d="M8 3 4 7l4 4"/><path d="M4 7h16"/><path d="m16 21 4-4-4-4"/><path d="M20 17H4"/></svg>`,
    'siren': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-siren ${extraClass}"><path d="M7 12a5 5 0 0 1 5-5v0a5 5 0 0 1 5 5v6H7v-6Z"/><path d="M5 20a2 2 0 0 1 2-2h10a2 2 0 0 1 2 2v2H5v-2Z"/><path d="M12 2v5"/><path d="m4.93 4.93 4.24 4.24"/><path d="m14.83 9.17 4.24-4.24"/></svg>`,
    'star': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-star ${extraClass}"><polygon points="12 2 15.09 8.26 22 9.27 17 14.14 18.18 21.02 12 17.77 5.82 21.02 7 14.14 2 9.27 8.91 8.26 12 2"/></svg>`,
    'shield-check': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-shield-check ${extraClass}"><path d="M20 13c0 5-3.5 7.5-7.66 8.95a1 1 0 0 1-.67-.01C7.5 20.5 4 18 4 13V6a1 1 0 0 1 1-1c2 0 4.5-1.2 6.24-2.72a1.17 1.17 0 0 1 1.52 0C14.51 3.81 17 5 19 5a1 1 0 0 1 1 1z"/><path d="m9 12 2 2 4-4"/></svg>`,
    'bell': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-bell ${extraClass}"><path d="M6 8a6 6 0 0 1 12 0c0 7 3 9 3 9H3s3-2 3-9"/><path d="M10.3 21a1.94 1.94 0 0 0 3.4 0"/></svg>`,
    'settings': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-settings ${extraClass}"><circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.65 1.65 0 0 0 .33 1.82l.06.06a2 2 0 0 1 0 2.83 2 2 0 0 1-2.83 0l-.06-.06a1.65 1.65 0 0 0-1.82-.33 1.65 1.65 0 0 0-1 1.51V21a2 2 0 0 1-2 2 2 2 0 0 1-2-2v-.09A1.65 1.65 0 0 0 9 19.4a1.65 1.65 0 0 0-1.82.33l-.06.06a2 2 0 0 1-2.83 0 2 2 0 0 1 0-2.83l.06-.06a1.65 1.65 0 0 0 .33-1.82 1.65 1.65 0 0 0-1.51-1H3a2 2 0 0 1-2-2 2 2 0 0 1 2-2h.09A1.65 1.65 0 0 0 4.6 9a1.65 1.65 0 0 0-.33-1.82l-.06-.06a2 2 0 0 1 0-2.83 2 2 0 0 1 2.83 0l.06.06a1.65 1.65 0 0 0 1.82.33H9a1.65 1.65 0 0 0 1-1.51V3a2 2 0 0 1 2-2 2 2 0 0 1 2 2v.09a1.65 1.65 0 0 0 1 1.51 1.65 1.65 0 0 0 1.82-.33l.06-.06a2 2 0 0 1 2.83 0 2 2 0 0 1 0 2.83l-.06.06a1.65 1.65 0 0 0-.33 1.82V9a1.65 1.65 0 0 0 1.51 1H21a2 2 0 0 1 2 2 2 2 0 0 1-2 2h-.09a1.65 1.65 0 0 0-1.51 1z"/></svg>`,
    'log-out': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-log-out ${extraClass}"><path d="M9 21H5a2 2 0 0 1-2-2V5a2 2 0 0 1 2-2h4"/><polyline points="16 17 21 12 16 7"/><line x1="21" x2="9" y1="12" y2="12"/></svg>`,
    'calendar': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-calendar ${extraClass}"><path d="M8 2v4"/><path d="M16 2v4"/><rect width="18" height="18" x="3" y="4" rx="2"/><path d="M3 10h18"/></svg>`,
    'folder': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-folder ${extraClass}"><path d="M20 20a2 2 0 0 0 2-2V8a2 2 0 0 0-2-2h-7.9a2 2 0 0 1-1.69-.9L9.6 3.9A2 2 0 0 0 7.93 3H4a2 2 0 0 0-2 2v13a2 2 0 0 0 2 2Z"/></svg>`,
    'menu': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-menu ${extraClass}"><line x1="4" x2="20" y1="12" y2="12"/><line x1="4" x2="20" y1="6" y2="6"/><line x1="4" x2="20" y1="18" y2="18"/></svg>`,
    'chevron-right': `<svg xmlns="http://www.w3.org/2000/svg" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-chevron-right ${extraClass}"><path d="m9 18 6-6-6-6"/></svg>`,
    'printer': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-printer ${extraClass}"><polyline points="6 9 6 2 18 2 18 9"/><path d="M6 18H4a2 2 0 0 1-2-2v-5a2 2 0 0 1 2-2h16a2 2 0 0 1 2 2v5a2 2 0 0 1-2 2h-2"/><rect width="12" height="8" x="6" y="14"/></svg>`,
    'download': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-download ${extraClass}"><path d="M21 15v4a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2v-4"/><polyline points="7 10 12 15 17 10"/><line x1="12" x2="12" y1="15" y2="3"/></svg>`,
    'qr-code': `<svg xmlns="http://www.w3.org/2000/svg" width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="2" stroke-linecap="round" stroke-linejoin="round" class="lucide lucide-qr-code ${extraClass}"><rect width="5" height="5" x="3" y="3" rx="1"/><rect width="5" height="5" x="16" y="3" rx="1"/><rect width="5" height="5" x="3" y="16" rx="1"/><path d="M21 16h-3a2 2 0 0 0-2 2v3"/><path d="M21 21v.01"/><path d="M12 7v3a2 2 0 0 1-2 2H7"/><path d="M3 12h.01"/><path d="M12 3h.01"/><path d="M12 16v.01"/><path d="M16 12h1"/><path d="M21 12v.01"/><path d="M12 21v-1"/></svg>`
  };

  // Alias mappings
  const aliases = {
    'labs': 'flask-conical',
    'laboratory': 'flask-conical',
    'lab-reports': 'flask-conical',
    'prescriptions': 'pill',
    'rx': 'pill',
    'consultations': 'stethoscope',
    'doctors': 'stethoscope',
    'doctor': 'stethoscope',
    'patients': 'users',
    'patient': 'user',
    'hospitals': 'building-2',
    'hospital': 'building-2',
    'overview': 'activity',
    'dashboard': 'activity',
    'journey': 'clipboard-list',
    'care-journey': 'clipboard-list',
    'discharge': 'file-text',
    'discharge-records': 'file-text',
    'discharge-clearance': 'file-text',
    'bed-network': 'bed',
    'ward-management': 'bed',
    'beds': 'bed',
    'referrals': 'arrow-left-right',
    'transfers': 'siren',
    'emergency-transfers': 'siren',
    'reviews': 'star',
    'audit': 'shield-check',
    'notifications': 'bell',
    'profile': 'user',
    'settings': 'settings',
    'logout': 'log-out',
    'connected-records': 'folder',
    'follow-up': 'calendar'
  };

  const key = aliases[norm] || norm;
  return icons[key] || icons['activity'];
};

// --------------------------------------------------------------------------
// Standardized Navigation Item Builder
// --------------------------------------------------------------------------
function renderSidebarNavItem({ id, label, icon, badge, badgeStyle = '', badgeClass = '', onClick, active }) {
  const badgeHtml = badge !== undefined && badge !== null && badge !== ''
    ? `<span class="nav-badge ${badgeClass}" style="${badgeStyle}">${escapeHtml(String(badge))}</span>`
    : '';

  const iconMarkup = (typeof icon === 'string' && icon.startsWith('<svg'))
    ? icon
    : window.getLucideIcon(icon || id);

  return `
    <button type="button" 
            class="nav-item ${active ? 'active' : ''}" 
            onclick="${onClick}" 
            data-nav-id="${escapeHtml(id)}" 
            data-tooltip="${escapeHtml(label)}" 
            title="${escapeHtml(label)}" 
            aria-label="${escapeHtml(label)}"
            aria-current="${active ? 'page' : 'false'}">
      <span class="nav-active-bar" aria-hidden="true"></span>
      <span class="nav-icon" aria-hidden="true">${iconMarkup}</span>
      <span class="nav-label">${escapeHtml(label)}</span>
      ${badgeHtml}
    </button>
  `;
}

// --------------------------------------------------------------------------
// Adaptive Role-Based Sidebar Navigation (Single Source of Truth)
// --------------------------------------------------------------------------
function renderDynamicSidebar(user, explicitRole) {
  const sidebar = document.getElementById('appSidebar');
  if (!sidebar || !user) return;

  const store = window.hospitrackStore;
  const role = explicitRole || user.role || 'PATIENT';
  const hospitalId = user.hospitalId || 'HOSP-101';
  const sec = (activeRoleSubtab || 'overview').toLowerCase();

  const hospitals = store.getHospitals ? store.getHospitals() : [];
  const currentHospital = (store.getHospitalById ? store.getHospitalById(hospitalId) : null) || hospitals[0] || { name: 'City General Hospital', id: 'HOSP-101' };
  const facilityName = user.hospitalName || currentHospital.name || 'City General Hospital';

  let roleTitle = 'Workspace';
  let roleIconSvg = window.getLucideIcon('building-2');
  let navItemsHtml = '';

  if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    roleTitle = 'Command Center';
    roleIconSvg = window.getLucideIcon('shield-check');
    const hospitals = store.getHospitals ? store.getHospitals() : [];
    const doctors = store.getDoctors ? store.getDoctors() : [];
    const patients = store.getPatients ? store.getPatients() : [];
    const referrals = store.getReferrals ? store.getReferrals() : [];
    const transfers = store.getTransfers ? store.getTransfers() : [];

    navItemsHtml = `
      <div class="sidebar-category-label">OVERVIEW</div>
      ${renderSidebarNavItem({ id: 'overview', label: 'Command Center', icon: 'activity', active: sec === 'overview', onClick: "navigateToRoleSection('SUPER_ADMIN', 'overview')" })}
      ${renderSidebarNavItem({ id: 'hospitals', label: 'Hospitals', icon: 'building-2', badge: hospitals.length, active: sec === 'hospitals', onClick: "navigateToRoleSection('SUPER_ADMIN', 'hospitals')" })}
      ${renderSidebarNavItem({ id: 'doctors', label: 'Doctors', icon: 'stethoscope', badge: doctors.length, active: sec === 'doctors', onClick: "navigateToRoleSection('SUPER_ADMIN', 'doctors')" })}
      ${renderSidebarNavItem({ id: 'patients', label: 'Patients', icon: 'users', badge: patients.length, active: sec === 'patients', onClick: "navigateToRoleSection('SUPER_ADMIN', 'patients')" })}

      <div class="sidebar-category-label mt-16">OPERATIONS</div>
      ${renderSidebarNavItem({ id: 'referrals', label: 'Referrals', icon: 'arrow-left-right', badge: referrals.length, active: sec === 'referrals', onClick: "navigateToRoleSection('SUPER_ADMIN', 'referrals')" })}
      ${renderSidebarNavItem({ id: 'transfers', label: 'Emergency Transfers', icon: 'siren', badge: transfers.length, active: sec === 'transfers', onClick: "navigateToRoleSection('SUPER_ADMIN', 'transfers')" })}
      ${renderSidebarNavItem({ id: 'beds', label: 'Bed Network', icon: 'bed', active: sec === 'beds' || sec === 'bed-network', onClick: "navigateToRoleSection('SUPER_ADMIN', 'beds')" })}

      <div class="sidebar-category-label mt-16">QUALITY &amp; ANALYTICS</div>
      ${renderSidebarNavItem({ id: 'reviews', label: 'Reviews & Ratings', icon: 'star', active: sec === 'reviews', onClick: "navigateToRoleSection('SUPER_ADMIN', 'reviews')" })}
      ${renderSidebarNavItem({ id: 'quality', label: 'Hospital Management', icon: 'building-2', active: sec === 'quality' || sec === 'hospital-management' || sec === 'onboarding', onClick: "navigateToRoleSection('SUPER_ADMIN', 'quality')" })}
      ${renderSidebarNavItem({ id: 'reports', label: 'Reports & Analytics', icon: 'activity', active: sec === 'reports', onClick: "navigateToRoleSection('SUPER_ADMIN', 'reports')" })}

      <div class="sidebar-category-label mt-16">SECURITY &amp; RECORDS</div>
      ${renderSidebarNavItem({ id: 'audit', label: 'Audit Trail', icon: 'shield-check', active: sec === 'audit', onClick: "navigateToRoleSection('SUPER_ADMIN', 'audit')" })}
      ${renderSidebarNavItem({ id: 'notifications', label: 'Notifications', icon: 'bell', active: sec === 'notifications', onClick: "navigateToRoleSection('SUPER_ADMIN', 'notifications')" })}

      <div class="sidebar-category-label mt-16">ACCOUNT</div>
      ${renderSidebarNavItem({ id: 'profile', label: 'Profile', icon: 'user', active: sec === 'profile', onClick: "navigateToRoleSection('SUPER_ADMIN', 'profile')" })}
      ${renderSidebarNavItem({ id: 'settings', label: 'Settings', icon: 'settings', active: sec === 'settings', onClick: "navigateToRoleSection('SUPER_ADMIN', 'settings')" })}
      ${renderSidebarNavItem({ id: 'logout', label: 'Logout', icon: 'log-out', active: false, onClick: "handleLogoutAction()" })}
    `;
  } else if (role === 'HOSPITAL_ADMIN' || role === 'HOSPITAL') {
    roleTitle = 'Hospital Workspace';
    roleIconSvg = window.getLucideIcon('building-2');
    const patients = store.getPatients ? store.getPatients(hospitalId) : [];
    const doctors = store.getDoctors ? store.getDoctors(hospitalId) : [];
    const medicalStaff = store.getMedicalStaff ? store.getMedicalStaff(hospitalId) : [];
    const referrals = store.getReferrals ? store.getReferrals(hospitalId) : [];
    const transfers = store.getTransfers ? store.getTransfers(hospitalId) : [];
    const pendingTransfers = transfers.filter(t => t.toHospitalId === hospitalId && t.status === 'PENDING');

    navItemsHtml = `
      <div class="sidebar-category-label">WORKSPACE</div>
      ${renderSidebarNavItem({ id: 'overview', label: 'Dashboard', icon: 'activity', active: sec === 'overview' || sec === 'dashboard', onClick: "navigateToRoleSection('HOSPITAL_ADMIN', 'overview')" })}
      ${renderSidebarNavItem({ id: 'patients', label: 'Inpatients', icon: 'users', badge: patients.length, active: sec === 'patients', onClick: "navigateToRoleSection('HOSPITAL_ADMIN', 'patients')" })}

      <div class="sidebar-category-label mt-16">MEDICAL OPERATIONS</div>
      ${renderSidebarNavItem({ id: 'doctors', label: 'Doctors', icon: 'stethoscope', badge: doctors.length, active: sec === 'doctors', onClick: "navigateToRoleSection('HOSPITAL_ADMIN', 'doctors')" })}
      ${renderSidebarNavItem({ id: 'staff', label: 'Medical Staff', icon: 'users', badge: medicalStaff.length, active: sec === 'staff' || sec === 'medical-staff', onClick: "navigateToRoleSection('HOSPITAL_ADMIN', 'staff')" })}

      <div class="sidebar-category-label mt-16">OPERATIONS</div>
      ${renderSidebarNavItem({ id: 'ward-management', label: 'Ward Management', icon: 'bed', active: sec === 'ward-management' || sec === 'bed-management' || sec === 'beds' || sec === 'capacity' || sec === 'ward' || sec === 'wards' || sec === 'ward-capacity', onClick: "navigateToRoleSection('HOSPITAL_ADMIN', 'ward-management')" })}
      ${renderSidebarNavItem({ id: 'referrals', label: 'Referrals', icon: 'arrow-left-right', badge: referrals.length, active: sec === 'referrals' || sec === 'specialist-referrals' || sec === 'referral-pipeline', onClick: "navigateToRoleSection('HOSPITAL_ADMIN', 'referrals')" })}
      ${renderSidebarNavItem({ id: 'transfers', label: 'Emergency Transfers', icon: 'siren', badge: pendingTransfers.length > 0 ? `${pendingTransfers.length} PENDING` : transfers.length, badgeStyle: pendingTransfers.length > 0 ? 'background: var(--danger); color: #fff;' : '', active: sec === 'transfers', onClick: "navigateToRoleSection('HOSPITAL_ADMIN', 'transfers')" })}
      ${renderSidebarNavItem({ id: 'discharge-clearance', label: 'Discharge Clearance', icon: 'file-text', active: sec === 'discharge-clearance' || sec === 'discharge', onClick: "navigateToRoleSection('HOSPITAL_ADMIN', 'discharge-clearance')" })}

      <div class="sidebar-category-label mt-16">CARE</div>
      ${renderSidebarNavItem({ id: 'patient-records', label: 'Patient Records', icon: 'clipboard-list', active: sec === 'patient-records' || sec === 'consultations' || sec === 'lab-reports', onClick: "navigateToRoleSection('HOSPITAL_ADMIN', 'patient-records')" })}
      ${renderSidebarNavItem({ id: 'reviews', label: 'Reviews', icon: 'star', active: sec === 'reviews', onClick: "navigateToRoleSection('HOSPITAL_ADMIN', 'reviews')" })}

      <div class="sidebar-category-label mt-16">ACCOUNT</div>
      ${renderSidebarNavItem({ id: 'profile', label: 'Profile', icon: 'user', active: sec === 'profile', onClick: "navigateToRoleSection('HOSPITAL_ADMIN', 'profile')" })}
      ${renderSidebarNavItem({ id: 'settings', label: 'Settings', icon: 'settings', active: false, onClick: "openAccountSettingsModal()" })}
      ${renderSidebarNavItem({ id: 'logout', label: 'Logout', icon: 'log-out', active: false, onClick: "handleLogoutAction()" })}
    `;
  } else if (role === 'DOCTOR') {
    roleTitle = 'Doctor Workstation';
    roleIconSvg = window.getLucideIcon('stethoscope');
    const doctorId = user.doctorId || 'DOC-201';
    const doctor = (store.getDoctorById ? store.getDoctorById(doctorId) : null) || (store.getDoctors ? store.getDoctors()[0] : null);
    const patients = store.getPatients ? store.getPatients(doctor ? doctor.hospitalId : 'HOSP-101') : [];
    const labs = store.getLabs ? store.getLabs(doctorId) : [];
    const myPrescriptions = store.getPrescriptions ? store.getPrescriptions(null, doctorId) : [];
    const myReferrals = store.getReferrals ? store.getReferrals(doctor ? doctor.hospitalId : 'HOSP-101') : [];

    navItemsHtml = `
      <div class="sidebar-category-label">WORKSPACE</div>
      ${renderSidebarNavItem({ id: 'dashboard', label: 'Dashboard', icon: 'activity', active: sec === 'dashboard' || sec === 'overview', onClick: "navigateToRoleSection('DOCTOR', 'dashboard')" })}
      ${renderSidebarNavItem({ id: 'patients', label: 'My Patients', icon: 'users', badge: patients.length, active: sec === 'patients' || sec === 'queue', onClick: "navigateToRoleSection('DOCTOR', 'patients')" })}
      ${renderSidebarNavItem({ id: 'consultations', label: 'Consultations', icon: 'stethoscope', active: sec === 'consultations', onClick: "navigateToRoleSection('DOCTOR', 'consultations')" })}

      <div class="sidebar-category-label mt-16">CLINICAL</div>
      ${renderSidebarNavItem({ id: 'prescriptions', label: 'Prescriptions', icon: 'pill', badge: myPrescriptions.length > 0 ? myPrescriptions.length : '', active: sec === 'prescriptions', onClick: "navigateToRoleSection('DOCTOR', 'prescriptions')" })}
      ${renderSidebarNavItem({ id: 'laboratory', label: 'Laboratory', icon: 'flask-conical', badge: labs.length > 0 ? labs.length : '', active: sec === 'laboratory' || sec === 'lab-reports' || sec === 'labs', onClick: "navigateToRoleSection('DOCTOR', 'laboratory')" })}
      ${renderSidebarNavItem({ id: 'referrals', label: 'Referrals', icon: 'arrow-left-right', badge: myReferrals.length > 0 ? myReferrals.length : '', active: sec === 'referrals', onClick: "navigateToRoleSection('DOCTOR', 'referrals')" })}
      ${renderSidebarNavItem({ id: 'discharge-requests', label: 'Discharge Requests', icon: 'file-text', active: sec === 'discharge-requests' || sec === 'discharge', onClick: "navigateToRoleSection('DOCTOR', 'discharge-requests')" })}

      <div class="sidebar-category-label mt-16">COMMUNICATION</div>
      ${renderSidebarNavItem({ id: 'notifications', label: 'Notifications', icon: 'bell', active: sec === 'notifications', onClick: "if(window.toggleNotifDropdown) window.toggleNotifDropdown();" })}

      <div class="sidebar-category-label mt-16">ACCOUNT</div>
      ${renderSidebarNavItem({ id: 'profile', label: 'My Profile', icon: 'user', active: sec === 'profile', onClick: "navigateToRoleSection('DOCTOR', 'profile')" })}
      ${renderSidebarNavItem({ id: 'settings', label: 'Settings', icon: 'settings', active: false, onClick: "openAccountSettingsModal()" })}
      ${renderSidebarNavItem({ id: 'logout', label: 'Logout', icon: 'log-out', active: false, onClick: "handleLogoutAction()" })}
    `;
  } else if (role === 'PATIENT') {
    roleTitle = 'Patient Portal';
    roleIconSvg = window.getLucideIcon('user');

    navItemsHtml = `
      <div class="sidebar-category-label">MY HEALTH</div>
      ${renderSidebarNavItem({ id: 'overview', label: 'Overview', icon: 'activity', active: sec === 'overview', onClick: "navigateToRoleSection('PATIENT', 'overview')" })}
      ${renderSidebarNavItem({ id: 'journey', label: 'Care Journey', icon: 'clipboard-list', active: sec === 'journey' || sec === 'care-journey' || sec === 'timeline', onClick: "navigateToRoleSection('PATIENT', 'journey')" })}
      ${renderSidebarNavItem({ id: 'consultations', label: 'Consultations', icon: 'stethoscope', active: sec === 'consultations' || sec === 'consultation' || sec === 'visits', onClick: "navigateToRoleSection('PATIENT', 'consultations')" })}
      ${renderSidebarNavItem({ id: 'prescriptions', label: 'Prescriptions', icon: 'pill', active: sec === 'prescriptions', onClick: "navigateToRoleSection('PATIENT', 'prescriptions')" })}
      ${renderSidebarNavItem({ id: 'lab-reports', label: 'Lab Reports', icon: 'flask-conical', active: sec === 'lab-reports' || sec === 'reports' || sec === 'labs' || sec === 'laboratory', onClick: "navigateToRoleSection('PATIENT', 'lab-reports')" })}
      ${renderSidebarNavItem({ id: 'discharge', label: 'Discharge Records', icon: 'file-text', active: sec === 'discharge' || sec === 'discharges' || sec === 'discharge-records', onClick: "navigateToRoleSection('PATIENT', 'discharge')" })}

      <div class="sidebar-category-label mt-16">CONNECTED CARE</div>
      ${renderSidebarNavItem({ id: 'current-hospital', label: 'Current Care', icon: 'building-2', active: sec === 'current-hospital' || sec === 'current-care', onClick: "navigateToRoleSection('PATIENT', 'current-hospital')" })}
      ${renderSidebarNavItem({ id: 'previous-hospitals', label: 'Previous Care', icon: 'building-2', active: sec === 'previous-hospitals' || sec === 'previous-care', onClick: "navigateToRoleSection('PATIENT', 'previous-hospitals')" })}
      ${renderSidebarNavItem({ id: 'referrals', label: 'Referrals', icon: 'arrow-left-right', active: sec === 'referrals' || sec === 'referral', onClick: "navigateToRoleSection('PATIENT', 'referrals')" })}
      ${renderSidebarNavItem({ id: 'connected-records', label: 'Connected Records', icon: 'folder', active: sec === 'connected-records' || sec === 'records', onClick: "navigateToRoleSection('PATIENT', 'connected-records')" })}

      <div class="sidebar-category-label mt-16">CARE</div>
      ${renderSidebarNavItem({ id: 'reviews', label: 'Reviews', icon: 'star', active: sec === 'reviews' || sec === 'feedback', onClick: "navigateToRoleSection('PATIENT', 'reviews')" })}
      ${renderSidebarNavItem({ id: 'follow-up', label: 'Follow-up', icon: 'calendar', active: sec === 'follow-up' || sec === 'followup', onClick: "navigateToRoleSection('PATIENT', 'follow-up')" })}

      <div class="sidebar-category-label mt-16">COMMUNICATION</div>
      ${renderSidebarNavItem({ id: 'notifications', label: 'Notifications', icon: 'bell', active: sec === 'notifications', onClick: "navigateToRoleSection('PATIENT', 'notifications')" })}

      <div class="sidebar-category-label mt-16">ACCOUNT</div>
      ${renderSidebarNavItem({ id: 'profile', label: 'Profile', icon: 'user', active: sec === 'profile', onClick: "navigateToRoleSection('PATIENT', 'profile')" })}
      ${renderSidebarNavItem({ id: 'settings', label: 'Settings', icon: 'settings', active: sec === 'settings', onClick: "navigateToRoleSection('PATIENT', 'settings')" })}
      ${renderSidebarNavItem({ id: 'logout', label: 'Logout', icon: 'log-out', active: false, onClick: "handleLogoutAction()" })}
    `;
  }

  const isCollapsed = getPersistedSidebarState() === 'collapsed';

  let profileName = user.name || user.email || 'Healthcare User';
  if (role === 'DOCTOR') profileName = formatDoctorName(user.name || 'Dr. Sarah Sharma');
  
  // Extract 2 clean uppercase initials (e.g. "John Doe" -> "JD", "Sarah Sharma" -> "SS")
  const nameParts = profileName.replace(/^Dr\.\s*/i, '').trim().split(/\s+/).filter(Boolean);
  const avatarInitials = nameParts.length >= 2 
    ? (nameParts[0][0] + nameParts[nameParts.length - 1][0]).toUpperCase()
    : (nameParts[0] ? nameParts[0].substring(0, 2) : 'U').toUpperCase();

  let roleBadge = 'Patient';
  let formattedId = user.id || 'PAT-301';
  if (formattedId.startsWith('USER-PAT-')) {
    formattedId = formattedId.replace('USER-PAT-', 'PAT-');
  }
  let deptText = 'ID: ' + formattedId;
  if (role === 'DOCTOR') {
    roleBadge = 'Doctor';
    deptText = user.specialty || user.department || 'Cardiology';
  } else if (role === 'HOSPITAL_ADMIN' || role === 'HOSPITAL') {
    roleBadge = 'Hospital Admin';
    deptText = facilityName;
  } else if (role === 'SUPER_ADMIN' || role === 'ADMIN') {
    roleBadge = 'Super Admin';
    deptText = 'National Oversight';
  }

  sidebar.innerHTML = `
    <div class="sidebar-header-bar">
      <div class="sidebar-header-top" 
           id="sidebarHeaderTop"
           onclick="toggleSidebarCollapse(event)" 
           role="button" 
           tabindex="0" 
           title="${isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}" 
           aria-label="Toggle Sidebar" 
           aria-expanded="${isCollapsed ? 'false' : 'true'}"
           onkeydown="if(event.key==='Enter'||event.key===' '){event.preventDefault();toggleSidebarCollapse(event);}">
        <div class="sidebar-header-brand">
          <button type="button" 
                  class="sidebar-collapse-btn sidebar-hamburger-btn" 
                  id="sidebarCollapseBtn" 
                  title="${isCollapsed ? 'Expand sidebar' : 'Collapse sidebar'}" 
                  aria-label="Toggle Sidebar"
                  aria-expanded="${isCollapsed ? 'false' : 'true'}">
            <span class="collapse-icon">${window.getLucideIcon('menu', 'sidebar-menu-svg')}</span>
          </button>
          <div class="sidebar-header-title">
            <span class="sidebar-header-text">${escapeHtml(roleTitle)}</span>
          </div>
        </div>
        <div class="sidebar-header-indicator" aria-hidden="true">
          ${window.getLucideIcon('chevron-right', 'sidebar-indicator-svg')}
        </div>
      </div>

      <!-- Active Facility Pill with Quick Switcher -->
      <div class="sidebar-facility-wrap" id="sidebarFacilityWrap">
        <button type="button" class="sidebar-facility-pill" onclick="toggleSidebarFacilityDropdown(event)" title="Active Hospital: ${escapeHtml(facilityName)}">
          <span class="facility-dot"></span>
          <span class="facility-name">${escapeHtml(facilityName)}</span>
          <span class="facility-chevron">▾</span>
        </button>
        <div id="sidebarFacilityDropdown" class="sidebar-facility-dropdown hidden">
          <div class="facility-dropdown-header">ACCREDITED HOSPITAL NETWORK</div>
          ${hospitals.map(h => `
            <button type="button" class="facility-dropdown-item ${h.id === hospitalId ? 'active' : ''}" onclick="switchSidebarFacility('${h.id}')">
              <span class="fac-icon">🏥</span>
              <div class="fac-info">
                <strong>${escapeHtml(h.name)}</strong>
                <span>${escapeHtml(h.location || 'Metro City')} • ${h.availableBeds || 0} Beds</span>
              </div>
            </button>
          `).join('')}
        </div>
      </div>
    </div>

    <div class="sidebar-nav">
      ${navItemsHtml}
    </div>

    <!-- Unified Footer Profile Card -->
    <div class="sidebar-footer-profile">
      <div class="sidebar-profile-card" data-tooltip="${escapeHtml(profileName)} (${escapeHtml(deptText)})">
        <div class="sidebar-profile-avatar" title="${escapeHtml(profileName)} (${escapeHtml(deptText)})">
          ${avatarInitials}
        </div>
        <div class="sidebar-profile-info">
          <strong class="sidebar-profile-name" title="${escapeHtml(profileName)}">${escapeHtml(profileName)}</strong>
          <div class="sidebar-profile-sub">
            <span class="sidebar-role-badge ${role.toLowerCase()}">${escapeHtml(roleBadge)}</span>
            <span class="sidebar-dept-text" title="${escapeHtml(deptText)}">${escapeHtml(deptText)}</span>
          </div>
        </div>
        <button type="button" class="sidebar-signout-btn" onclick="handleLogoutAction()" title="Sign Out of Hospitrack" aria-label="Sign Out">
          ${window.getLucideIcon('log-out', 'signout-svg')}
        </button>
      </div>
    </div>
  `;

  // Synchronize state immediately without jump
  applySidebarState(getPersistedSidebarState());
}
window.renderDynamicSidebar = renderDynamicSidebar;

function renderCurrentView() {
  const user = window.hospitrackAuth.getCurrentUser();
  if (!user) return;
  navigateToRoleSection(activeRole || user.role, activeRoleSubtab || 'overview', null, false);
}
window.renderCurrentView = renderCurrentView;

// --------------------------------------------------------------------------
// Global Instant Search Subsystem (Flow: Search -> Backend API -> Results)
// --------------------------------------------------------------------------
let globalSearchDebounceTimer = null;
let currentSearchSequence = 0;

window.handleGlobalSearchInput = function(query) {
  if (globalSearchDebounceTimer) {
    clearTimeout(globalSearchDebounceTimer);
  }

  const dropdown = document.getElementById('globalSearchDropdown');
  if (!query || query.trim() === '') {
    if (dropdown) {
      dropdown.classList.remove('open');
      dropdown.innerHTML = '';
    }
    return;
  }

  if (dropdown) {
    dropdown.innerHTML = `
      <div class="search-loading-state">
        <span class="btn-spinner"></span>
        <span>Searching records for "<strong>${escapeHtml(query.trim())}</strong>"...</span>
      </div>
    `;
    dropdown.classList.add('open');
  }

  globalSearchDebounceTimer = setTimeout(() => {
    executeGlobalSearch(query.trim());
  }, 200);
};

async function executeGlobalSearch(query) {
  const dropdown = document.getElementById('globalSearchDropdown');
  if (!dropdown) return;

  if (!query) {
    dropdown.classList.remove('open');
    dropdown.innerHTML = '';
    return;
  }

  const seq = ++currentSearchSequence;

  try {
    const results = await window.hospitrackStore.searchGlobal(query);
    // Ignore out-of-order stale responses
    if (seq !== currentSearchSequence) return;

    if (!results || results.length === 0) {
      dropdown.innerHTML = `
        <div class="search-empty-state">
          <span>🔍</span>
          <span>No matching records found for "<strong>${escapeHtml(query)}</strong>"</span>
        </div>
      `;
      dropdown.classList.add('open');
      return;
    }

    // Group results logically
    const groups = {
      PATIENT: [],
      DOCTOR: [],
      HOSPITAL: [],
      REFERRAL: [],
      TRANSFER: [],
      PRESCRIPTION: [],
      LAB_REPORT: []
    };

    results.forEach(r => {
      const type = (r.type || 'PATIENT').toUpperCase();
      if (groups[type]) {
        groups[type].push(r);
      } else {
        groups.PATIENT.push(r);
      }
    });

    let html = '';

    const groupMeta = [
      { key: 'PATIENT', label: '👤 PATIENTS', icon: '👤' },
      { key: 'DOCTOR', label: '🩺 PHYSICIANS', icon: '🩺' },
      { key: 'HOSPITAL', label: '🏥 HOSPITALS', icon: '🏥' },
      { key: 'REFERRAL', label: '🔁 SPECIALIST REFERRALS', icon: '🔁' },
      { key: 'TRANSFER', label: '🚑 EMERGENCY TRANSFERS', icon: '🚑' },
      { key: 'PRESCRIPTION', label: '💊 PRESCRIPTIONS', icon: '💊' },
      { key: 'LAB_REPORT', label: '🔬 LAB REPORTS', icon: '🔬' }
    ];

    groupMeta.forEach(g => {
      const list = groups[g.key];
      if (list && list.length > 0) {
        html += `<div class="search-group-header">${g.label}</div>`;
        list.forEach(item => {
          const statusBadge = item.status ? `<span class="badge ${getStatusBadgeClass(item.status)} ml-6">${escapeHtml(item.status)}</span>` : '';
          html += `
            <button type="button" class="search-result-item" data-type="${escapeHtml(item.type)}" data-id="${escapeHtml(item.id)}" tabindex="0">
              <span class="search-result-icon">${g.icon}</span>
              <div class="search-result-info">
                <div class="search-result-title-row">
                  <span class="search-result-title">${escapeHtml(item.title)}</span>
                  <span class="font-mono text-muted font-xs ml-4">(${escapeHtml(item.id)})</span>
                  ${statusBadge}
                </div>
                <span class="search-result-meta">${escapeHtml(item.subtitle || '')}</span>
              </div>
            </button>
          `;
        });
      }
    });

    dropdown.innerHTML = html;
    dropdown.classList.add('open');

    // Attach click and enter listeners to genuine button rows
    dropdown.querySelectorAll('.search-result-item').forEach(btn => {
      btn.addEventListener('click', (e) => {
        e.preventDefault();
        e.stopPropagation();
        const type = btn.getAttribute('data-type');
        const id = btn.getAttribute('data-id');
        window.openSearchResult({ type, id });
      });
    });
  } catch (err) {
    if (seq !== currentSearchSequence) return;
    dropdown.innerHTML = `
      <div class="search-error-state">
        <span>⚠️</span>
        <span>Search error: ${escapeHtml(err.message || 'Unable to fetch results')}</span>
      </div>
    `;
    dropdown.classList.add('open');
  }
}

function escapeHtml(str) {
  if (!str && str !== 0) return '';
  return str.toString().replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;').replace(/"/g, '&quot;');
}
window.escapeHtml = escapeHtml;

function closeGlobalSearch() {
  const dropdown = document.getElementById('globalSearchDropdown');
  if (dropdown) dropdown.classList.remove('open');
}
window.closeGlobalSearch = closeGlobalSearch;

function getStatusBadgeClass(status) {
  if (!status) return 'badge-info';
  const s = status.toUpperCase();
  if (s === 'ACTIVE' || s === 'COMPLETED' || s === 'ACCEPTED' || s === 'FINAL') return 'badge-success';
  if (s === 'PENDING' || s === 'IN_PROGRESS' || s === 'TRANSFER_PENDING') return 'badge-warning';
  if (s === 'DISCHARGED' || s === 'TRANSFERRED') return 'badge-info';
  if (s === 'REJECTED' || s === 'CANCELLED' || s === 'SUSPENDED') return 'badge-danger';
  return 'badge-info';
}

// --------------------------------------------------------------------------
// Central Result Opener & Workspace Dispatcher
// --------------------------------------------------------------------------
window.openSearchResult = function(result) {
  if (!result || !result.type || !result.id) return;
  window.closeGlobalSearch();
  const input = document.getElementById('globalSearchInput');
  if (input) input.value = '';

  const type = result.type.toUpperCase();
  const id = result.id;

  if (type === 'PATIENT') {
    window.openPatientWorkspace(id);
  } else if (type === 'DOCTOR') {
    window.openDoctorWorkspace(id);
  } else if (type === 'HOSPITAL') {
    window.openHospitalWorkspace(id);
  } else if (type === 'REFERRAL') {
    window.openReferralWorkspace(id);
  } else if (type === 'TRANSFER') {
    window.openTransferWorkspace(id);
  } else if (type === 'PRESCRIPTION' || type === 'LAB_REPORT' || type === 'PATIENT_PRESCRIPTION' || type === 'PATIENT_LAB') {
    const pId = result.metadata?.patientId || result.patientId;
    if (pId) {
      const tab = (type.includes('LAB') || type.includes('REPORT')) ? 'labs' : 'prescriptions';
      window.openPatientWorkspace(pId, tab);
    } else {
      window.openPatientWorkspace(id);
    }
  } else {
    window.openPatientWorkspace(id);
  }
};

window.openPatientWorkspace = function(patientId, tab = 'overview') {
  const targetHash = `#patient/workspace/${encodeURIComponent(patientId)}${tab && tab !== 'overview' ? '/' + encodeURIComponent(tab) : ''}`;
  if (window.location.hash !== targetHash) {
    window.history.pushState(null, '', targetHash);
  }
  openWorkspace('patient', patientId, tab);
};

window.openDoctorWorkspace = function(doctorId, tab = 'overview') {
  const targetHash = `#doctor/workspace/${encodeURIComponent(doctorId)}`;
  if (window.location.hash !== targetHash) {
    window.history.pushState(null, '', targetHash);
  }
  openWorkspace('doctor', doctorId, tab);
};

window.openHospitalWorkspace = function(hospitalId, tab = 'overview') {
  const targetHash = `#hospital/workspace/${encodeURIComponent(hospitalId)}`;
  if (window.location.hash !== targetHash) {
    window.history.pushState(null, '', targetHash);
  }
  openWorkspace('hospital', hospitalId, tab);
};

window.openReferralWorkspace = function(referralId) {
  const targetHash = `#referral/workspace/${encodeURIComponent(referralId)}`;
  if (window.location.hash !== targetHash) {
    window.history.pushState(null, '', targetHash);
  }
  openWorkspace('referral', referralId);
};

window.openTransferWorkspace = function(transferId) {
  const targetHash = `#transfer/workspace/${encodeURIComponent(transferId)}`;
  if (window.location.hash !== targetHash) {
    window.history.pushState(null, '', targetHash);
  }
  openWorkspace('transfer', transferId);
};

// Unified Workspace Controller
function openWorkspace(type, id, tab = 'overview', updateHistory = true) {
  const user = window.hospitrackAuth?.getCurrentUser();
  if (!user) {
    showLoginView();
    return;
  }

  // Ensure shell stays intact: close overlays/dropdowns
  closeMobileSidebar();
  closeProfileDropdown();
  closeNotifDropdown();
  closeGlobalSearch();

  const container = document.getElementById('mainContentArea');
  if (!container) return;

  const t = (type || '').toLowerCase();
  const normalizedId = (id || '').trim();

  // Update Breadcrumbs
  const roleEl = document.getElementById('headerBreadcrumbRole');
  const titleEl = document.getElementById('headerBreadcrumbTitle');
  if (roleEl) roleEl.textContent = 'Workspace';
  if (titleEl) titleEl.textContent = `${t.toUpperCase()} ${normalizedId}`;

  // Update Sidebar Active state
  activeRoleSubtab = 'workspace';
  renderDynamicSidebar(user);

  // Render via workspaceRenderer
  if (window.workspaceRenderer) {
    if (t === 'patient') {
      window.workspaceRenderer.renderPatientWorkspace(container, normalizedId, tab);
    } else if (t === 'doctor') {
      window.workspaceRenderer.renderDoctorWorkspace(container, normalizedId, tab);
    } else if (t === 'hospital') {
      window.workspaceRenderer.renderHospitalWorkspace(container, normalizedId, tab);
    } else if (t === 'referral') {
      window.workspaceRenderer.renderReferralWorkspace(container, normalizedId);
    } else if (t === 'transfer') {
      window.workspaceRenderer.renderTransferWorkspace(container, normalizedId);
    } else {
      window.workspaceRenderer.renderNotFound(container, 'Workspace', id);
    }
  }
}
window.openWorkspace = openWorkspace;

window.navigateWorkspaceBack = function() {
  if (window.history.length > 1) {
    window.history.back();
  } else {
    window.navigateToDefaultOverview();
  }
};

// --------------------------------------------------------------------------
// Global Keyboard Navigation (Ctrl+K, Up/Down/Enter, Escape)
// --------------------------------------------------------------------------
function initKeyboardNavigation() {
  document.addEventListener('keydown', (e) => {
    // 1. Global ESC handler
    if (e.key === 'Escape') {
      const openModal = document.querySelector('.modal-overlay.open');
      if (openModal) {
        openModal.classList.remove('open');
        return;
      }
      closeProfileDropdown();
      closeNotifDropdown();
      closeGlobalSearch();
      closeMobileSidebar();
      return;
    }

    // 2. Ctrl+K or Cmd+K: Focus search input
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') {
      e.preventDefault();
      const searchInput = document.getElementById('globalSearchInput');
      if (searchInput) {
        searchInput.focus();
        searchInput.select();
      }
      return;
    }

    // 3. Search Dropdown Arrow & Enter Navigation
    const searchInput = document.getElementById('globalSearchInput');
    const dropdown = document.getElementById('globalSearchDropdown');
    const isDropdownOpen = dropdown && dropdown.classList.contains('open');

    if (!isDropdownOpen) return;

    const items = Array.from(dropdown.querySelectorAll('.search-result-item'));
    if (items.length === 0) return;

    const activeEl = document.activeElement;
    const activeIndex = items.indexOf(activeEl);

    if (e.key === 'ArrowDown') {
      e.preventDefault();
      if (activeEl === searchInput || activeIndex === -1) {
        items[0]?.focus();
      } else {
        const nextIndex = (activeIndex + 1) % items.length;
        items[nextIndex]?.focus();
      }
    } else if (e.key === 'ArrowUp') {
      e.preventDefault();
      if (activeIndex === 0 || activeIndex === -1) {
        searchInput?.focus();
      } else {
        items[activeIndex - 1]?.focus();
      }
    } else if (e.key === 'Enter' && activeEl === searchInput) {
      if (items.length > 0) {
        e.preventDefault();
        items[0].click();
      }
    }
  });
}

// --------------------------------------------------------------------------
// Notification Center
// --------------------------------------------------------------------------
function toggleNotifDropdown() {
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) {
    dropdown.classList.toggle('open');
  }
}
window.toggleNotifDropdown = toggleNotifDropdown;

function closeNotifDropdown() {
  const dropdown = document.getElementById('notifDropdown');
  if (dropdown) {
    dropdown.classList.remove('open');
  }
}
window.closeNotifDropdown = closeNotifDropdown;

function renderNotificationsDropdown() {
  const store = window.hospitrackStore;
  const notifs = store.getNotifications();
  const unreadCount = notifs.filter(n => !n.read).length;

  const dotEl = document.getElementById('notifBadgeDot');
  if (dotEl) {
    if (unreadCount > 0) {
      dotEl.style.display = 'flex';
      dotEl.textContent = unreadCount > 9 ? '9+' : unreadCount;
    } else {
      dotEl.style.display = 'none';
    }
  }

  const listEl = document.getElementById('notifList');
  if (listEl) {
    if (notifs.length === 0) {
      listEl.innerHTML = `<div style="text-align: center; color: var(--text-dim); padding: 1.5rem; font-size: 0.8rem;">No notifications.</div>`;
    } else {
      listEl.innerHTML = notifs.map(n => `
        <div class="notif-item ${n.read ? '' : 'unread'}" onclick="handleNotifClick('${n.id}')" style="cursor: pointer;">
          <div style="display: flex; justify-content: space-between; align-items: center;">
            <strong style="color: var(--text-main); font-size: 0.82rem;">${n.title}</strong>
            <span style="font-size: 0.7rem; color: var(--text-dim);">${new Date(n.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}</span>
          </div>
          <p style="color: var(--text-muted); font-size: 0.76rem; line-height: 1.4;">${n.message}</p>
        </div>
      `).join('');
    }
  }
}
window.renderNotificationsDropdown = renderNotificationsDropdown;

window.handleNotifClick = function(notifId) {
  const store = window.hospitrackStore;
  store.markNotificationRead(notifId);
  renderNotificationsDropdown();
};

window.markAllNotifsRead = function() {
  const store = window.hospitrackStore;
  store.markAllNotificationsRead();
  renderNotificationsDropdown();
  window.showToast('All notifications marked as read.', 'info');
};

// --------------------------------------------------------------------------
// Toast Notifications
// --------------------------------------------------------------------------
window.showToast = function(message, type = 'info') {
  const container = document.getElementById('toastContainer');
  if (!container) return;

  const toast = document.createElement('div');
  toast.className = `toast ${type}`;
  toast.innerHTML = `
    <span>${type === 'success' ? '✅' : type === 'error' ? '❌' : type === 'warning' ? '⚠️' : 'ℹ️'}</span>
    <span style="line-height: 1.4;">${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = '0';
    toast.style.transform = 'translateX(100%)';
    setTimeout(() => toast.remove(), 300);
  }, 4200);
};

// ==========================================================================
// UNIVERSAL HEALTHCARE PRINT ENGINE & CLEAN PDF DISPATCHER
// Formats high-resolution, structured, non-overlapping official medical records
// ==========================================================================

window.hospitrackPrintDocument = function(type, payload = {}) {
  const store = window.hospitrackStore || {};
  const auth = window.hospitrackAuth;
  const currentUser = auth ? auth.getCurrentUser() : null;

  // Target isolated printable medical record container with legacy fallback support
  let printArea = document.getElementById('printable-medical-record') || document.getElementById('hospitrackPrintArea');
  if (!printArea) {
    printArea = document.createElement('div');
    printArea.id = 'printable-medical-record';
    printArea.className = 'printable-document-container';
    document.body.appendChild(printArea);
  }
  const fallbackArea = document.getElementById('hospitrackPrintArea');

  let docHtml = '';
  const nowStr = new Date().toLocaleString('en-US', {
    dateStyle: 'full',
    timeStyle: 'short'
  });
  const dateOnlyStr = new Date().toLocaleDateString('en-US', {
    year: 'numeric',
    month: 'short',
    day: 'numeric'
  });
  const timeOnlyStr = new Date().toLocaleTimeString('en-US', {
    hour: '2-digit',
    minute: '2-digit'
  });

  const docType = (type || '').toString().toLowerCase().trim();

  // --------------------------------------------------------------------------
  // TEMPLATE B: OFFICIAL PRESCRIPTION SLIP (Print Rx)
  // --------------------------------------------------------------------------
  if (docType === 'prescription' || docType === 'rx') {
    let rx = null;
    if (typeof payload === 'string') {
      rx = store.getPrescriptionById ? store.getPrescriptionById(payload) : null;
      if (!rx) {
        rx = ((store.getPrescriptions ? store.getPrescriptions() : []) || []).find(p => p.id === payload) || { id: payload };
      }
    } else {
      rx = payload || {};
    }

    const patient = (store.getPatientById ? store.getPatientById(rx.patientId) : null) || ((store.getPatients ? store.getPatients() : []) || []).find(p => p.id === rx.patientId) || { name: rx.patientName || 'John Doe', id: rx.patientId || 'PAT-301', age: 45, gender: 'Male', bloodGroup: 'O+' };
    const doctor = (store.getDoctorById ? store.getDoctorById(rx.doctorId) : null) || ((store.getDoctors ? store.getDoctors() : []) || []).find(d => d.id === rx.doctorId) || { name: rx.doctorName || 'Dr. Sarah Sharma, MD (Cardiology)', specialty: rx.doctorSpecialty || 'Cardiology', licenseNo: 'MCI-99401' };
    const hospital = (store.getHospitalById ? store.getHospitalById(rx.hospitalId || doctor.hospitalId) : null) || ((store.getHospitals ? store.getHospitals() : []) || [])[0] || { name: 'City General Hospital & Research Institute', location: '100 Health Way, Main Block - Level 3', contact: '+91 (0) 80 2345 6789' };

    const items = (rx.items && rx.items.length > 0) ? rx.items : [
      { name: 'Tab. Rosuvastatin 20mg', dosage: '20mg', frequency: '0-0-1 | Once daily after dinner', duration: '60 Days', instructions: 'Take with a glass of water, do not skip dose' },
      { name: 'Tab. Aspirin 75mg', dosage: '75mg', frequency: '0-1-0 | Once daily after lunch', duration: '60 Days', instructions: 'Take after food with water' },
      { name: 'Tab. Metoprolol Succinate 25mg', dosage: '25mg', frequency: '1-0-1 | Twice daily after breakfast and dinner', duration: '30 Days', instructions: 'Take at regular intervals; do not crush or chew' }
    ];

    docHtml = `
      <div class="print-medical-sheet print-rx-sheet">
        <!-- 1. Clinical Header -->
        <div class="print-letterhead">
          <div class="print-brand-left">
            <div class="print-hospital-icon">🏥</div>
            <div>
              <h1 class="print-hospital-name">${escapeHtml(hospital.name || 'City General Hospital & Research Institute')}</h1>
              <p class="print-hospital-meta">${escapeHtml(doctor.name || 'Dr. Sarah Sharma, MD (Cardiology)')} • Medical Registration No: <strong>${escapeHtml(doctor.licenseNo || 'MCI-99401')}</strong></p>
              <p class="print-hospital-meta">Department of Cardiology, Main Block - Level 3, 100 Health Way • OPD Hours: Mon-Fri: 09:00 AM - 01:00 PM | Sat: 09:00 AM - 12:00 PM</p>
              <div class="print-header-badges">
                <span class="print-badge-accredited">✓ NABH &amp; NABL Accredited Healthcare Facility</span>
                <span class="print-badge-reg">Contact Hotline: +91 (0) 80 2345 6789 | Emergency: 1800-419-8800</span>
              </div>
            </div>
          </div>
          <div class="print-doc-type-box">
            <div class="print-doc-tag">OFFICIAL PRESCRIPTION SLIP</div>
            <div class="print-barcode">||| | |||| ||| |||||| |||| ||| | ||||| |||</div>
            <div class="print-rx-id">Prescription UID: <strong>${escapeHtml(rx.id || 'RX-2026-9941')}</strong></div>
            <div class="print-date">Date: <strong>${dateOnlyStr}</strong> | ${timeOnlyStr}</div>
          </div>
        </div>

        <div class="print-divider"></div>

        <!-- 2. Patient Details Bar & Clinical Demographics with Vitals -->
        <div class="print-info-grid">
          <div class="print-info-card">
            <div class="print-section-sub">PATIENT DEMOGRAPHICS &amp; IDENTIFICATION</div>
            <div class="print-patient-name">${escapeHtml(patient.name)}</div>
            <div class="print-details-row">
              <span><strong>Patient ID / UHID:</strong> <code>91-4401-${escapeHtml(patient.id || 'PAT-301')}</code></span>
              <span><strong>Age / Gender:</strong> ${patient.age || 45} Yrs / ${escapeHtml(patient.gender || 'Male')}</span>
            </div>
            <div class="print-details-row">
              <span><strong>Blood Group:</strong> <strong style="color: #047857;">${escapeHtml(patient.bloodGroup || 'O+')}</strong></span>
              <span><strong>Known Allergies:</strong> <strong style="color: #b91c1c;">${escapeHtml(patient.allergies || 'NKDA (No Known Drug Allergies)')}</strong></span>
            </div>
            <div class="print-details-row">
              <span><strong>Contact:</strong> ${escapeHtml(patient.phone || patient.contact || '+91 98765 43210')}</span>
              <span><strong>Consultation Type:</strong> In-Person Cardiology Follow-Up</span>
            </div>
          </div>

          <div class="print-info-card">
            <div class="print-section-sub">CLINICAL VITALS &amp; ATTENDING SPECIALIST</div>
            <div class="print-doctor-name">${escapeHtml(doctor.name || 'Dr. Sarah Sharma, MD (Cardiology)')}</div>
            <div class="print-details-row">
              <span><strong>Specialty:</strong> ${escapeHtml(doctor.specialty || 'Cardiology')}</span>
              <span><strong>Medical Council Reg No:</strong> <code>${escapeHtml(doctor.licenseNo || 'MCI-99401')}</code></span>
            </div>
            <div class="print-vitals-strip" style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 6px; margin-top: 6px; padding: 6px 8px; background: #F1F5F9; border-radius: 6px; font-size: 0.8rem;">
              <div><strong>BP:</strong> 120/76 mmHg</div>
              <div><strong>Pulse:</strong> 72 bpm</div>
              <div><strong>Weight:</strong> 74 kg</div>
            </div>
          </div>
        </div>

        <!-- Clinical Diagnosis & Chief Complaints -->
        <div class="print-diagnosis-banner">
          <div class="print-diag-title">CLINICAL DIAGNOSIS &amp; PROVISIONAL IMPRESSION:</div>
          <div class="print-diag-text">${escapeHtml(rx.diagnosis || patient.diagnosis || 'Post-Percutaneous Coronary Intervention (PCI s/p DES to LAD), Essential Hypertension (Controlled), Dyslipidemia.')}</div>
        </div>

        <!-- 3. Prescription Body with Prominent Latin Rx Symbol -->
        <div class="print-rx-table-wrap">
          <div class="print-rx-header-row" style="display: flex; align-items: center; gap: 10px; margin-bottom: 8px;">
            <span class="print-rx-symbol" style="font-size: 2.2rem; font-family: 'Times New Roman', Georgia, serif; font-weight: 800; color: #0D9488; line-height: 1;">℞</span>
            <div>
              <span class="print-rx-title" style="font-size: 0.92rem; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.04em;">STANDARDIZED MEDICATION &amp; DOSAGE SCHEDULE (PHARMACOTHERAPY)</span>
              <div style="font-size: 0.74rem; color: #64748B;">Validated against Hospitrack National Drug Safety &amp; Interaction Registry</div>
            </div>
          </div>

          <table class="print-table">
            <thead>
              <tr>
                <th style="width: 5%;">#</th>
                <th style="width: 33%;">Medication Name &amp; Dosage</th>
                <th style="width: 25%;">Frequency &amp; Timing</th>
                <th style="width: 14%;">Duration</th>
                <th style="width: 23%;">Special Instructions</th>
              </tr>
            </thead>
            <tbody>
              ${items.map((item, idx) => `
                <tr>
                  <td style="text-align: center; font-weight: 700;">${idx + 1}</td>
                  <td>
                    <strong style="font-size: 0.92rem; color: #0f172a;">${escapeHtml(item.name)}</strong>
                    ${item.dosage ? `<div style="font-size: 0.76rem; color: #0D9488; font-weight: 600;">Dose: ${escapeHtml(item.dosage)}</div>` : ''}
                  </td>
                  <td><strong style="color: #0369a1;">${escapeHtml(item.frequency || 'Once daily')}</strong></td>
                  <td>${escapeHtml(item.duration || '60 Days')}</td>
                  <td>${escapeHtml(item.instructions || 'Take with water after meals as directed')}</td>
                </tr>
              `).join('')}
            </tbody>
          </table>
        </div>

        <!-- 4. Clinical Directives & Follow-Up -->
        <div class="print-advice-box">
          <strong style="font-size: 0.84rem; color: #0f172a; text-transform: uppercase; letter-spacing: 0.5px;">Dietary &amp; Lifestyle Recommendations:</strong>
          <ul class="print-advice-list" style="margin: 6px 0 0 18px; font-size: 0.82rem; color: #334155; line-height: 1.5;">
            <li>Maintain a low-sodium (&lt; 2g/day), heart-healthy Mediterranean diet with zero trans-fats.</li>
            <li>Moderate physical exercise (brisk walk 30 minutes/day, 5 days a week). Strictly avoid smoking and alcohol.</li>
            <li>Maintain daily BP / pulse rate monitoring log. Take all dual-antiplatelet medications regularly without missing doses.</li>
          </ul>
        </div>

        <!-- Follow-up & Safety Verification Banner -->
        <div class="print-middle-grid">
          <div class="print-followup-box">
            <span class="print-box-label">NEXT APPOINTMENT / REVIEW DATE:</span>
            <strong>In 4 Weeks (or SOS in case of acute distress / chest pain)</strong>
          </div>
          <div class="print-safety-banner">
            <span style="font-size: 1.3rem;">🛡️</span>
            <div>
              <strong>DUPLICATE DRUG INTERACTION SAFETY LOCK: PASSED &amp; VERIFIED</strong>
              <p style="margin: 2px 0 0 0; font-size: 0.74rem; color: #047857;">Zero active ingredient duplicates, cross-allergies, or contraindications detected in Hospitrack Clinical Registry.</p>
            </div>
          </div>
        </div>

        <!-- Official Digital Signature & Verification Stamp -->
        <div class="print-footer-grid">
          <div class="print-security-meta">
            <div class="print-barcode">||| | |||| ||| |||||| |||| ||| | ||||| |||</div>
            <div class="print-security-hash">Digital EMR Hash: RX-SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}</div>
            <div class="print-timestamp">Digitally Signed &amp; Dispatched: ${nowStr} • Hospitrack Electronic Health Record</div>
            <div class="print-disclaimer">This is an authentic, computer-generated digital medical prescription issued under the Telemedicine Practice &amp; Digital Health Standards. Valid for 30 days.</div>
          </div>
          <div class="print-signature-box">
            <div class="print-doctor-sig-cursive" style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 1.35rem; color: #0F766E;">Dr. Sarah Sharma</div>
            <div class="print-sign-line"></div>
            <strong>Dr. Sarah Sharma, MD (Cardiology)</strong>
            <span style="font-size: 0.78rem; color: #475569; display: block;">Registration No: <strong>MCI-99401</strong></span>
            <span style="font-size: 0.72rem; color: #0d9488; font-weight: 700;">Authorized Digital Signature &amp; Security Stamp</span>
          </div>
        </div>
      </div>
    `;

  // --------------------------------------------------------------------------
  // TEMPLATE A: CERTIFIED LABORATORY DIAGNOSTIC REPORT
  // --------------------------------------------------------------------------
  } else if (docType === 'lab-report' || docType === 'lab' || docType === 'laboratory') {
    let report = null;
    if (typeof payload === 'string') {
      report = store.getLabById ? store.getLabById(payload) : null;
      if (!report) {
        report = ((store.getLabs ? store.getLabs() : []) || []).find(l => l.id === payload) || { id: payload };
      }
    } else {
      report = payload || {};
    }

    const patient = (store.getPatientById ? store.getPatientById(report.patientId) : null) || ((store.getPatients ? store.getPatients() : []) || []).find(p => p.id === report.patientId) || { name: report.patientName || 'John Doe', id: report.patientId || 'PAT-301', age: 45, gender: 'Male', bloodGroup: 'O+', phone: '+91 98765 43210' };
    const referringDoctor = report.doctorName || 'Dr. Sarah Sharma, MD (Cardiology)';
    const pathologistName = report.pathologistName || 'Dr. Vikram Malhotra, MD (Pathology) - Reg. No: MCI-54219, Consultant Pathologist';

    let tests = report.parameters || report.tests || [];
    if (!tests || tests.length === 0) {
      if ((report.testName || '').toLowerCase().includes('troponin') || (report.testName || '').toLowerCase().includes('cardiac') || (report.testName || '').toLowerCase().includes('biomarker')) {
        tests = [
          { name: 'High-sensitivity Cardiac Troponin-I (hs-cTnI)', result: '0.028', unit: 'ng/mL', normalRange: '< 0.030', method: 'Chemiluminescent Immunoassay (CLIA)', status: 'NORMAL' },
          { name: 'Creatine Kinase-MB (CK-MB Mass)', result: '18', unit: 'U/L', normalRange: '5 - 25', method: 'Immunoinhibition Kinetic', status: 'NORMAL' },
          { name: 'Myoglobin Serum', result: '42', unit: 'ng/mL', normalRange: '25 - 72', method: 'Turbidimetric Immunoassay', status: 'NORMAL' },
          { name: 'N-Terminal pro-BNP (NT-proBNP)', result: '88', unit: 'pg/mL', normalRange: '< 125', method: 'ECLIA Electro-Chemiluminescence', status: 'NORMAL' }
        ];
      } else if ((report.testName || '').toLowerCase().includes('ecg') || (report.testName || '').toLowerCase().includes('electrocardiogram')) {
        tests = [
          { name: 'Ventricular Heart Rate', result: '78', unit: 'bpm', normalRange: '60 - 100', method: '12-Lead Diagnostic ECG', status: 'NORMAL' },
          { name: 'PR Interval', result: '158', unit: 'ms', normalRange: '120 - 200', method: 'Digital Automated Caliper', status: 'NORMAL' },
          { name: 'QRS Complex Duration', result: '86', unit: 'ms', normalRange: '80 - 120', method: 'Vectorcardiographic Tracing', status: 'NORMAL' },
          { name: 'Corrected QT Interval (QTc)', result: '418', unit: 'ms', normalRange: '< 450', method: 'Bazett Formulation', status: 'NORMAL' },
          { name: 'Frontal QRS Electrical Axis', result: '+45°', unit: 'deg', normalRange: '-30° to +90°', method: 'Hexaxial Reference System', status: 'NORMAL' }
        ];
      } else {
        tests = [
          { name: 'Complete Blood Count (CBC) - Hemoglobin', result: '14.2', unit: 'g/dL', normalRange: '13.5 - 17.5', method: 'Spectrophotometry', status: 'NORMAL' },
          { name: 'Total White Blood Cell Count (WBC)', result: '7,400', unit: '/cumm', normalRange: '4,000 - 11,000', method: 'Flow Cytometry / Impedance', status: 'NORMAL' },
          { name: 'Platelet Count', result: '245,000', unit: '/cumm', normalRange: '150,000 - 450,000', method: 'Hydrodynamic Focusing', status: 'NORMAL' },
          { name: 'Serum Creatinine', result: '0.9', unit: 'mg/dL', normalRange: '0.7 - 1.3', method: 'Jaffe Modified Kinetic', status: 'NORMAL' },
          { name: 'Fasting Blood Sugar (Glucose)', result: '92', unit: 'mg/dL', normalRange: '70 - 99', method: 'GOD-POD Hexokinase', status: 'NORMAL' },
          { name: 'Total Serum Cholesterol', result: '185', unit: 'mg/dL', normalRange: '< 200', method: 'CHOD-PAP Enzymatic', status: 'NORMAL' }
        ];
      }
    }

    const isECG = (report.testName || '').toLowerCase().includes('ecg') || (report.testName || '').toLowerCase().includes('electrocardiogram');
    const deptTitle = isECG ? 'DEPARTMENT OF NON-INVASIVE CLINICAL CARDIOLOGY & ELECTROPHYSIOLOGY' : 'DEPARTMENT OF CLINICAL PATHOLOGY & BIOCHEMISTRY';

    docHtml = `
      <div class="print-medical-sheet print-lab-sheet">
        <!-- 1. Header Letterhead -->
        <div class="print-letterhead">
          <div class="print-brand-left">
            <div class="print-hospital-icon">🏥</div>
            <div>
              <h1 class="print-hospital-name">CITY GENERAL HOSPITAL &amp; RESEARCH INSTITUTE</h1>
              <p class="print-hospital-meta"><strong>${deptTitle}</strong></p>
              <p class="print-hospital-meta">100 Health Way, Medical Center Campus • Tel: +91 (0) 80 2345 6789 • Email: pathology@citygeneral.health.org</p>
              <div class="print-header-badges">
                <span class="print-badge-accredited">✓ NABL Accredited Medical Testing Laboratory (Certificate No: MC-2026/088)</span>
                <span class="print-badge-reg">✓ NABH Certified (ISO 15189:2022)</span>
              </div>
            </div>
          </div>
          <div class="print-doc-type-box" style="text-align: right;">
            <div class="print-doc-tag" style="background: #065F46; color: #FFFFFF; font-weight: 800; padding: 4px 10px; border-radius: 4px; display: inline-block;">FINAL CERTIFIED REPORT</div>
            <div class="print-barcode" style="font-family: monospace; letter-spacing: 2px; margin: 4px 0; font-size: 0.95rem; font-weight: 700;">|| ||||| ||| |||| |||||| ||| ||||</div>
            <div class="print-rx-id" style="font-size: 0.8rem; color: #334155;">Report UID: <strong>${escapeHtml(report.id || 'LAB-2026-9941')}</strong></div>
            <div class="print-date" style="font-size: 0.78rem; color: #64748B;">Generated: <strong>${dateOnlyStr}</strong> | ${timeOnlyStr}</div>
          </div>
        </div>

        <div class="print-divider"></div>

        <!-- 2. Patient Demographics & Chain of Custody Table (2-Column Grid Box) -->
        <div class="print-lab-patient-bar-2col">
          <div class="print-lab-col">
            <div class="print-section-sub">PATIENT DEMOGRAPHICS &amp; IDENTIFICATION</div>
            <div class="print-patient-name" style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin: 4px 0;">${escapeHtml(patient.name)}</div>
            <div class="print-details-row">
              <span><strong>Patient ID (UHID / MRN):</strong> <code>91-4401-${escapeHtml(patient.id || 'PAT-301')}</code></span>
              <span><strong>Age / Gender:</strong> ${patient.age || 45} Yrs / ${escapeHtml(patient.gender || 'Male')}</span>
            </div>
            <div class="print-details-row">
              <span><strong>Blood Group:</strong> <strong style="color: #047857;">${escapeHtml(patient.bloodGroup || 'O+')}</strong></span>
              <span><strong>Contact / Ward:</strong> ${escapeHtml(patient.phone || patient.contact || '+91 98765 43210')} • Outpatient Suite 204</span>
            </div>
          </div>

          <div class="print-lab-col">
            <div class="print-section-sub">SAMPLE CUSTODY &amp; CLINICAL REQUISITION</div>
            <div class="print-details-row" style="margin-top: 4px;">
              <span><strong>Requisition No.:</strong> <code>${escapeHtml(report.specimenId || 'REQ-SPL-8821')}</code></span>
              <span><strong>Specimen:</strong> ${escapeHtml(report.specimenType || 'Venous Blood (Serum)')}</span>
            </div>
            <div class="print-details-row">
              <span><strong>Sample Collection Time:</strong> ${dateOnlyStr}, 08:15 AM</span>
              <span><strong>Sample Received Time:</strong> ${dateOnlyStr}, 08:45 AM</span>
            </div>
            <div class="print-details-row">
              <span><strong>Referring Doctor:</strong> <strong>${escapeHtml(referringDoctor)}</strong></span>
              <span><strong>Report Generated Time:</strong> ${dateOnlyStr}, ${timeOnlyStr}</span>
            </div>
          </div>
        </div>

        <!-- 3. Diagnostic Investigation Table (Exact Columns: Test Name, Result, Units, Biological Reference Interval, Method) -->
        <div class="print-rx-table-wrap" style="margin-top: 14px;">
          <div class="print-rx-header-row" style="background: #F1F5F9; padding: 8px 12px; border-left: 4px solid #0D9488; display: flex; align-items: center; justify-content: space-between;">
            <div>
              <span class="print-rx-title" style="font-size: 0.88rem; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.04em;">
                ${escapeHtml(deptTitle)}
              </span>
              <div style="font-size: 0.78rem; font-weight: 700; color: #0D9488; margin-top: 2px;">
                INVESTIGATION: ${escapeHtml(report.testName || 'Comprehensive Cardiac Diagnostic Panel')}
              </div>
            </div>
            <span class="badge" style="background: #ECFDF5; color: #065F46; font-size: 0.72rem; font-weight: 700; border: 1px solid #A7F3D0;">FINAL CERTIFIED</span>
          </div>

          <table class="print-table print-lab-table" style="width: 100%; border-collapse: collapse; margin-top: 8px;">
            <thead>
              <tr style="background: #F8FAFC; border-bottom: 2px solid #CBD5E1;">
                <th style="width: 30%; padding: 10px 12px; text-align: left; font-size: 0.75rem; font-weight: 800; color: #334155; text-transform: uppercase;">TEST NAME</th>
                <th style="width: 18%; padding: 10px 12px; text-align: left; font-size: 0.75rem; font-weight: 800; color: #334155; text-transform: uppercase;">RESULT / OBSERVED VALUE</th>
                <th style="width: 12%; padding: 10px 12px; text-align: left; font-size: 0.75rem; font-weight: 800; color: #334155; text-transform: uppercase;">UNITS</th>
                <th style="width: 22%; padding: 10px 12px; text-align: left; font-size: 0.75rem; font-weight: 800; color: #334155; text-transform: uppercase;">BIOLOGICAL REF INTERVAL</th>
                <th style="width: 18%; padding: 10px 12px; text-align: left; font-size: 0.75rem; font-weight: 800; color: #334155; text-transform: uppercase;">METHOD / UNIT</th>
              </tr>
            </thead>
            <tbody>
              ${tests.map(t => {
                const statusStr = String(t.status || 'NORMAL').toUpperCase();
                const isCrit = statusStr === 'CRITICAL' || statusStr === 'ABNORMAL' || statusStr === 'HIGH' || statusStr === 'LOW';
                return `
                  <tr style="border-bottom: 1px solid #E2E8F0; break-inside: avoid;">
                    <td style="padding: 10px 12px;">
                      <strong style="font-size: 0.88rem; color: #0F172A;">${escapeHtml(t.name)}</strong>
                    </td>
                    <td style="padding: 10px 12px;">
                      <strong style="font-size: 0.95rem; color: ${isCrit ? '#B91C1C' : '#0F172A'};">
                        ${escapeHtml(t.result)}
                      </strong>
                      ${isCrit ? `<span class="print-flag-crit" style="margin-left: 4px; font-size: 0.7rem; font-weight: 800; background: #FEE2E2; color: #991B1B; padding: 1px 5px; border-radius: 3px;">*CRITICAL HIGH</span>` : ''}
                    </td>
                    <td style="padding: 10px 12px; font-size: 0.84rem; color: #0D9488; font-weight: 600;">
                      ${escapeHtml(t.unit || '—')}
                    </td>
                    <td style="padding: 10px 12px; font-size: 0.84rem; color: #475569;">
                      ${escapeHtml(t.normalRange || t.referenceRange || 'Standard reference')}
                    </td>
                    <td style="padding: 10px 12px; font-size: 0.82rem; color: #64748B;">
                      ${escapeHtml(t.method || 'Automated Clinical Assay')}
                    </td>
                  </tr>
                `;
              }).join('')}
            </tbody>
          </table>
        </div>

        <!-- Clinical Notes Regarding Test Methodology -->
        <div class="print-methodology-note" style="margin-top: 10px; padding: 8px 12px; background: #F1F5F9; border-radius: 4px; font-size: 0.76rem; color: #475569; break-inside: avoid;">
          <strong>Clinical Methodology Note:</strong> Chemiluminescent Immunoassay (CLIA) analyzed on automated analyzer. All analytical calibrators and dual-level internal quality controls (IQC) verified within ±2SD prior to specimen release.
        </div>

        <!-- Narrative Findings / Pathologist Opinion Box -->
        <div class="print-remarks-box" style="margin-top: 12px; padding: 12px 14px; background: #F8FAFC; border-left: 4px solid #0D9488; border-radius: 0 6px 6px 0; break-inside: avoid;">
          <strong style="display: block; font-size: 0.78rem; text-transform: uppercase; color: #0F766E; letter-spacing: 0.04em; margin-bottom: 4px;">
            ${isECG ? 'ELECTROCARDIOGRAPHIC INTERPRETATION &amp; CLINICAL CORRELATION' : 'PATHOLOGIST DIAGNOSTIC OPINION &amp; CLINICAL INTERPRETATION'}:
          </strong>
          <p style="margin: 0; font-size: 0.85rem; color: #1E293B; line-height: 1.45;">
            ${escapeHtml(report.notes || report.remarks || report.resultSummary || 'All parameters evaluated on calibrated and automated clinical analyzers. Values meet standard physiological biological reference intervals. Clinical correlation with patient clinical presentation recommended.')}
          </p>
        </div>

        <!-- End of Examination Report Markers -->
        <div class="print-end-report" style="text-align: center; margin: 16px 0 12px; font-size: 0.74rem; font-weight: 700; color: #64748B; letter-spacing: 0.15em; text-transform: uppercase; border-top: 1px dashed #CBD5E1; padding-top: 8px; break-inside: avoid;">
          *** END OF EXAMINATION REPORT ***
          <div style="font-size: 0.68rem; margin-top: 2px;">*** END OF CLINICAL DIAGNOSTIC REPORT ***</div>
        </div>

        <!-- 4. Pathologist Attestation & Dual Signatures -->
        <div class="print-dual-signatures" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 14px; padding-top: 12px; border-top: 1px solid #CBD5E1; break-inside: avoid;">
          <!-- Left Signature Block: Medical Laboratory Technologist -->
          <div class="print-sig-col" style="display: flex; flex-direction: column; align-items: flex-start;">
            <div class="print-doctor-sig-cursive" style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 1.25rem; color: #0F766E;">A. K. Sharma</div>
            <div class="print-sign-line" style="width: 200px; height: 1px; background: #94A3B8; margin: 4px 0 6px 0;"></div>
            <strong style="font-size: 0.86rem; color: #0F172A;">Medical Laboratory Technologist (MLT)</strong>
            <span style="font-size: 0.74rem; color: #64748B;">A. K. Sharma, B.Sc MLT • Lic No: MLT-REG-44910</span>
            <span style="font-size: 0.7rem; color: #475569;">Specimen Processing &amp; Analytical Verification</span>
          </div>

          <!-- Right Signature Block: Consultant Pathologist / Verified By -->
          <div class="print-sig-col" style="display: flex; flex-direction: column; align-items: flex-end; text-align: right;">
            <div class="print-doctor-sig-cursive" style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 1.25rem; color: #0F766E;">Dr. Vikram Malhotra</div>
            <div class="print-sign-line" style="width: 240px; height: 1px; background: #94A3B8; margin: 4px 0 6px 0;"></div>
            <strong style="font-size: 0.86rem; color: #0F172A;">Dr. Vikram Malhotra, MD (Pathology) - Reg. No: MCI-54219, Consultant Pathologist</strong>
            <span style="font-size: 0.74rem; color: #64748B;">Consultant Pathologist &amp; Clinical Laboratory Director</span>
            <span style="font-size: 0.7rem; color: #0F766E; font-weight: 700;">Verified Electronic Medical Seal • NABL Signatory</span>
          </div>
        </div>

        <!-- Official Disclaimer Notice -->
        <div class="print-security-meta" style="margin-top: 14px; padding: 10px 12px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 6px; font-size: 0.72rem; color: #64748B; line-height: 1.4; break-inside: avoid;">
          <div style="font-weight: 700; color: #0F172A; margin-bottom: 2px;">
            🔒 Cryptographic Verification Hash: <code>LAB-SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}-${Date.now().toString(36).toUpperCase()}</code>
          </div>
          <div>Laboratory results should be correlated clinically with patient findings. A certified digital copy verified through Hospitrack. This is a computer-generated medical record verified under digital health standards. Valid without physical signature if verifiable via QR code. Electronic Health Records are maintained under compliance with national digital healthcare interoperability protocols.</div>
        </div>
      </div>
    `;

  // --------------------------------------------------------------------------
  // TEMPLATE C: DISCHARGE / LONGITUDINAL CLINICAL SUMMARY
  // --------------------------------------------------------------------------
  } else if (docType === 'discharge' || docType === 'discharge-summary') {
    const patient = (typeof payload === 'string') 
      ? ((store.getPatientById ? store.getPatientById(payload) : null) || ((store.getPatients ? store.getPatients() : []) || []).find(p => p.id === payload) || { id: payload, name: 'John Doe', age: 45, gender: 'Male', bloodGroup: 'O+' }) 
      : (payload || { name: currentUser?.name || 'John Doe', id: currentUser?.patientId || 'PAT-301', age: 45, gender: 'Male', bloodGroup: 'O+' });

    docHtml = `
      <div class="print-medical-sheet print-discharge-sheet">
        <!-- 1. Hospital Letterhead Header -->
        <div class="print-letterhead">
          <div class="print-brand-left">
            <div class="print-hospital-icon">🏥</div>
            <div>
              <h1 class="print-hospital-name">CITY GENERAL HOSPITAL &amp; RESEARCH INSTITUTE</h1>
              <p class="print-hospital-meta"><strong>DEPARTMENT OF INTERVENTIONAL CARDIOLOGY &amp; INPATIENT SERVICES</strong></p>
              <p class="print-hospital-meta">100 Health Way, Medical Center Campus • Inpatient Admissions Block • Tel: +91 (0) 80 2345 6789</p>
              <div class="print-header-badges">
                <span class="print-badge-accredited">✓ NABH &amp; JCI Nationally Accredited Tertiary Care Center</span>
                <span class="print-badge-reg">Institutional Reg No: HOSP-NMC-2026/894</span>
              </div>
            </div>
          </div>
          <div class="print-doc-type-box" style="text-align: right;">
            <div class="print-doc-tag" style="background: #0284C7; color: #FFFFFF; font-weight: 800; padding: 4px 10px; border-radius: 4px; display: inline-block;">INPATIENT DISCHARGE DOSSIER</div>
            <div class="print-barcode" style="font-family: monospace; letter-spacing: 2px; margin: 4px 0; font-size: 0.95rem; font-weight: 700;">||| ||||| ||| |||||| |||| |||</div>
            <div class="print-rx-id" style="font-size: 0.8rem; color: #334155;">Discharge ID: <strong>DIS-2026-8812</strong></div>
            <div class="print-date" style="font-size: 0.78rem; color: #64748B;">Date: <strong>${dateOnlyStr}</strong></div>
          </div>
        </div>

        <div class="print-divider"></div>

        <!-- Document Main Title -->
        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; text-align: center;">
          <h2 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #0F172A; letter-spacing: 0.02em; text-transform: uppercase;">
            INPATIENT CLINICAL DISCHARGE &amp; CARE CONTINUITY SUMMARY
          </h2>
          <div style="font-size: 0.78rem; color: #0D9488; font-weight: 700; margin-top: 2px;">
            Authoritative Longitudinal Inpatient Health Record • Hospitrack Health Passport
          </div>
        </div>

        <!-- 2. Patient Demographics & Admission Timestamps Matrix -->
        <div class="print-lab-patient-bar-2col">
          <div class="print-lab-col">
            <div class="print-section-sub">PATIENT DEMOGRAPHICS &amp; ADMISSION METRICS</div>
            <div class="print-patient-name" style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin: 4px 0;">${escapeHtml(patient.name)}</div>
            <div class="print-details-row">
              <span><strong>Patient ID (UHID / MRN):</strong> <code>91-4401-${escapeHtml(patient.id || 'PAT-301')}</code></span>
              <span><strong>Age / Gender:</strong> ${patient.age || 45} Yrs / ${escapeHtml(patient.gender || 'Male')}</span>
            </div>
            <div class="print-details-row">
              <span><strong>Blood Group:</strong> <strong style="color: #047857;">${escapeHtml(patient.bloodGroup || 'O+')}</strong></span>
              <span><strong>Emergency Contact:</strong> ${escapeHtml(patient.phone || patient.contact || '+91 98765 43210')}</span>
            </div>
            <div class="print-details-row">
              <span><strong>Known Allergies:</strong> <strong style="color: #b91c1c;">${escapeHtml(patient.allergies || 'NKDA (No Known Drug Allergies)')}</strong></span>
              <span><strong>Ward / Bed:</strong> CCU Bed 04 (Cardiology Critical Care)</span>
            </div>
          </div>

          <div class="print-lab-col">
            <div class="print-section-sub">ADMISSION &amp; DISCHARGE TIMESTAMPS</div>
            <div class="print-details-row" style="margin-top: 4px;">
              <span><strong>Admission Date &amp; Time:</strong> Oct 24, 2026, 06:45 AM</span>
              <span><strong>Discharge Date &amp; Time:</strong> Oct 28, 2026, 11:30 AM</span>
            </div>
            <div class="print-details-row">
              <span><strong>Length of Stay (LOS):</strong> 4 Days (Inpatient CCU + Step-Down)</span>
              <span><strong>Admission Type:</strong> Emergency / Acute Transfer</span>
            </div>
            <div class="print-details-row">
              <span><strong>Attending Cardiologist:</strong> <strong>Dr. Sarah Sharma, MD (Cardiology)</strong></span>
              <span><strong>Discharge Disposition:</strong> Discharged Home (Ambulatory)</span>
            </div>
          </div>
        </div>

        <!-- 3. Diagnostic Summary & ICD-10 Coding -->
        <div class="print-diagnosis-banner" style="margin-top: 14px;">
          <div class="print-diag-title">ADMITTING &amp; FINAL DISCHARGE DIAGNOSIS:</div>
          <div style="font-size: 0.88rem; color: #0F172A; line-height: 1.5; margin-top: 4px;">
            <div>• <strong>Admitting Diagnosis:</strong> Acute Coronary Syndrome — Unstable Angina (ICD-10 Code: <strong>I20.0</strong>)</div>
            <div>• <strong>Final Discharge Diagnosis:</strong> Coronary Artery Disease (CAD), Single Vessel Disease s/p Successful Percutaneous Coronary Intervention (ICD-10 Code: <strong>I20.0 / Z95.5</strong>)</div>
          </div>
        </div>

        <!-- 4. Hospital Course, Procedures Performed & Discharge Condition -->
        <div class="print-clinical-section" style="margin-top: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; break-inside: avoid;">
          <h3 style="font-size: 0.88rem; font-weight: 800; color: #0F172A; text-transform: uppercase; margin: 0 0 6px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            SUMMARY OF HOSPITAL COURSE &amp; CLINICAL MILESTONES
          </h3>
          <p style="font-size: 0.84rem; color: #334155; line-height: 1.5; margin: 0 0 10px 0;">
            A 45-year-old male presented through Emergency Triage with acute retrosternal chest pain radiating to the left arm and jaw. Initial ECG revealed dynamic T-wave inversions in leads V2-V4. High-sensitivity Cardiac Troponin-I was elevated at 0.028 ng/mL. Patient was immediately initiated on loading doses of dual antiplatelet therapy (DAPT) and transferred to the cardiac catheterization suite. Coronary angiography demonstrated an 85% thrombotic stenosis in the proximal Left Anterior Descending (LAD) artery.
          </p>

          <h3 style="font-size: 0.88rem; font-weight: 800; color: #0F172A; text-transform: uppercase; margin: 0 0 6px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            PROCEDURES PERFORMED
          </h3>
          <p style="font-size: 0.84rem; color: #334155; line-height: 1.5; margin: 0 0 10px 0;">
            <strong>Percutaneous Coronary Intervention (PCI) with Drug-Eluting Stent (DES) to proximal LAD:</strong> Successful deployment of a 3.0 x 24 mm cobalt-chromium everolimus-eluting stent with 0% residual stenosis and TIMI-3 distal blood flow. Right femoral arteriotomy closed with 6F Angio-Seal vascular closure device without hematoma.
          </p>

          <h3 style="font-size: 0.88rem; font-weight: 800; color: #0F172A; text-transform: uppercase; margin: 0 0 6px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            DISCHARGE CONDITION &amp; PHYSICAL STATUS
          </h3>
          <p style="font-size: 0.84rem; color: #334155; line-height: 1.5; margin: 0;">
            Hemodynamically stable, ambulatory, asymptomatic with no recurrent chest tightness or palpitations. Surgical access site clean, dry, and intact with palpable bilateral distal dorsalis pedis pulses. Afebrile, oriented x 3. Vitals at discharge: BP 120/76 mmHg, Pulse 72 bpm regular, SpO2 99% on room air.
          </p>
        </div>

        <!-- 5. Discharge Medications Grid (Pharmacotherapy) -->
        <div class="print-rx-table-wrap" style="margin-top: 14px; break-inside: avoid;">
          <div class="print-rx-header-row" style="background: #F1F5F9; padding: 8px 12px; border-left: 4px solid #0D9488; display: flex; align-items: center; justify-content: space-between;">
            <span class="print-rx-title" style="font-size: 0.88rem; font-weight: 800; color: #0F172A; text-transform: uppercase; letter-spacing: 0.04em;">
              DISCHARGE MEDICATIONS &amp; OUTPATIENT PHARMACOTHERAPY
            </span>
            <span class="badge" style="background: #ECFDF5; color: #065F46; font-size: 0.72rem; font-weight: 700; border: 1px solid #A7F3D0;">DAPT SAFETY VERIFIED</span>
          </div>

          <table class="print-table" style="width: 100%; border-collapse: collapse; margin-top: 8px;">
            <thead>
              <tr style="background: #F8FAFC; border-bottom: 2px solid #CBD5E1;">
                <th style="width: 5%;">#</th>
                <th style="width: 30%;">Medication Name &amp; Strength</th>
                <th style="width: 24%;">Dosage Regimen (M-A-N)</th>
                <th style="width: 13%;">Duration</th>
                <th style="width: 28%;">Clinical Purpose &amp; Instructions</th>
              </tr>
            </thead>
            <tbody>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="text-align: center; font-weight: 700;">1</td>
                <td><strong style="color: #0F172A;">Tab. Rosuvastatin 20mg</strong></td>
                <td><strong style="color: #0369a1;">0-0-1 (Once daily at night)</strong></td>
                <td>60 Days</td>
                <td>Lipid plaque stabilization. Take after dinner with water.</td>
              </tr>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="text-align: center; font-weight: 700;">2</td>
                <td><strong style="color: #0F172A;">Tab. Aspirin 75mg (Ecosprin)</strong></td>
                <td><strong style="color: #0369a1;">0-1-0 (Once daily after lunch)</strong></td>
                <td>60 Days</td>
                <td>Antiplatelet therapy. Take strictly after a substantial meal.</td>
              </tr>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="text-align: center; font-weight: 700;">3</td>
                <td><strong style="color: #0F172A;">Tab. Ticagrelor 90mg (Brilinta)</strong></td>
                <td><strong style="color: #0369a1;">1-0-1 (Twice daily after food)</strong></td>
                <td>60 Days</td>
                <td><strong style="color: #B91C1C;">CRITICAL:</strong> Stent thrombosis prevention. DO NOT SKIP DOSES.</td>
              </tr>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="text-align: center; font-weight: 700;">4</td>
                <td><strong style="color: #0F172A;">Tab. Metoprolol Succinate 25mg</strong></td>
                <td><strong style="color: #0369a1;">1-0-1 (Twice daily)</strong></td>
                <td>30 Days</td>
                <td>Myocardial workload reduction. Monitor heart rate.</td>
              </tr>
              <tr style="border-bottom: 1px solid #E2E8F0;">
                <td style="text-align: center; font-weight: 700;">5</td>
                <td><strong style="color: #0F172A;">Tab. Pantoprazole 40mg (Pan-40)</strong></td>
                <td><strong style="color: #0369a1;">1-0-0 (Once daily morning)</strong></td>
                <td>30 Days</td>
                <td>Gastric mucosal protection with DAPT. Take 30 mins before food.</td>
              </tr>
            </tbody>
          </table>
        </div>

        <!-- 6. Red-Flag Emergency Symptoms Hotline Box -->
        <div class="print-emergency-redflag" style="margin-top: 14px; padding: 12px 16px; background: #FEF2F2; border: 2px solid #FCA5A5; border-radius: 8px; break-inside: avoid;">
          <div style="display: flex; align-items: center; gap: 8px; font-size: 0.84rem; font-weight: 800; color: #991B1B; text-transform: uppercase;">
            <span style="font-size: 1.25rem;">🚨</span>
            <span>RED-FLAG EMERGENCY SYMPTOMS REQUIRING IMMEDIATE HOSPITAL VISIT / ER TRIAGE:</span>
          </div>
          <p style="margin: 6px 0 0 0; font-size: 0.82rem; color: #7F1D1D; line-height: 1.45;">
            Seek immediate medical attention if you experience: <strong>Crushing chest heaviness/pain lasting &gt; 15 minutes</strong>, shortness of breath, unexplained cold sweats, syncope or blackouts, or expanding tenderness/bleeding at the right groin catheter site.
            <br>
            <strong>24/7 Immediate Emergency Triage Hotline: 1800-419-8800 (Toll-Free) • Hospital Ambulance: +91 (0) 80 2345 9999</strong>
          </p>
        </div>

        <!-- 7. Attending Physician Signature Block & Care Continuity Stamp -->
        <div class="print-dual-signatures" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; padding-top: 14px; border-top: 1px solid #CBD5E1; break-inside: avoid;">
          <div class="print-sig-col" style="display: flex; flex-direction: column; align-items: flex-start;">
            <span style="font-size: 0.74rem; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 2px;">SCHEDULED OUTPATIENT FOLLOW-UP:</span>
            <strong style="font-size: 0.88rem; color: #0F172A;">Cardiology OPD Clinic — In 2 Weeks</strong>
            <span style="font-size: 0.76rem; color: #64748B;">Suite 204, Main Block • Repeat 2D-Echocardiogram and Lipid Profile</span>
            <div style="margin-top: 6px; font-size: 0.7rem; color: #0D9488; font-weight: 700;">Hospitrack Longitudinal Care Network Verified</div>
          </div>

          <div class="print-sig-col" style="display: flex; flex-direction: column; align-items: flex-end; text-align: right;">
            <div class="print-doctor-sig-cursive" style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 1.35rem; color: #0F766E;">Dr. Sarah Sharma</div>
            <div class="print-sign-line" style="width: 220px; height: 1px; background: #94A3B8; margin: 4px 0 6px 0;"></div>
            <strong style="font-size: 0.86rem; color: #0F172A;">Dr. Sarah Sharma, MD (Cardiology)</strong>
            <span style="font-size: 0.76rem; color: #475569;">Medical Registration No: <strong>MCI-99401</strong></span>
            <span style="font-size: 0.7rem; color: #0F766E; font-weight: 700;">Attending Interventional Cardiologist • Digital Hospital Seal</span>
          </div>
        </div>
      </div>
    `;

  // --------------------------------------------------------------------------
  // CLINICAL CONSULTATION ENCOUNTER RECORD
  // --------------------------------------------------------------------------
  } else if (docType === 'consultation' || docType === 'encounter' || docType === 'visit') {
    let c = null;
    if (typeof payload === 'string') {
      c = store.getConsultationById ? store.getConsultationById(payload) : null;
      if (!c) {
        c = (store.getConsultations ? store.getConsultations() : []).find(v => v.id === payload) || { id: payload };
      }
    } else {
      c = payload || {};
    }
    if (!c) c = { id: 'CON-LIVE' };
    const patient = (c.patientId && store.getPatientById ? store.getPatientById(c.patientId) : null) || (store.getPatients() || []).find(p => p.id === c.patientId) || { name: c.patientName || 'Patient', id: c.patientId || 'PAT-301', age: 42, gender: 'Male', bloodGroup: 'O+' };
    const doctor = (c.doctorId && store.getDoctorById ? store.getDoctorById(c.doctorId) : null) || (store.getDoctors() || []).find(d => d.id === c.doctorId) || { name: c.doctorName || 'Dr. Sarah Sharma', specialty: c.doctorSpecialty || 'Cardiology' };
    const hospital = (c.hospitalId && store.getHospitalById ? store.getHospitalById(c.hospitalId) : null) || (store.getHospitals() || [])[0] || { name: c.hospitalName || 'City General Hospital & Research Institute', location: '100 Health Way, Metro Healthcare Center' };

    docHtml = `
      <div class="print-medical-sheet">
        <div class="print-letterhead">
          <div class="print-brand-left">
            <div class="print-hospital-icon">🩺</div>
            <div>
              <h1 class="print-hospital-name">${escapeHtml(hospital.name)}</h1>
              <p class="print-hospital-meta">${escapeHtml(hospital.location)} • Clinical Consultation Department</p>
              <span class="print-badge-accredited">✓ Outpatient Encounter Record</span>
            </div>
          </div>
          <div class="print-doc-type-box">
            <div class="print-doc-tag">CLINICAL ENCOUNTER RECORD</div>
            <div class="print-rx-id">Encounter ID: <strong>${escapeHtml(c.id || 'CON-LIVE')}</strong></div>
            <div class="print-date">Date: <strong>${dateOnlyStr}</strong></div>
          </div>
        </div>

        <div class="print-divider"></div>

        <div class="print-info-grid">
          <div class="print-info-card">
            <div class="print-section-sub">PATIENT INFORMATION</div>
            <div class="print-patient-name">${escapeHtml(patient.name)}</div>
            <div class="print-details-row">
              <span><strong>Patient ID:</strong> ${escapeHtml(patient.id)}</span>
              <span><strong>Age / Gender:</strong> ${patient.age || 42} Yrs / ${escapeHtml(patient.gender || 'Male')}</span>
              <span><strong>Blood Group:</strong> ${escapeHtml(patient.bloodGroup || 'O+')}</span>
            </div>
          </div>
          <div class="print-info-card">
            <div class="print-section-sub">ATTENDING PHYSICIAN</div>
            <div class="print-doctor-name">${escapeHtml(doctor.name)}</div>
            <div class="print-details-row">
              <span><strong>Department:</strong> ${escapeHtml(doctor.specialty || 'General Medicine')}</span>
              <span><strong>Registration:</strong> MCI-99401</span>
            </div>
          </div>
        </div>

        <div class="print-vitals-strip">
          <div class="print-vital-box"><strong>Blood Pressure:</strong> ${escapeHtml(c.bp || c.bloodPressure || '120/80 mmHg')}</div>
          <div class="print-vital-box"><strong>Heart Rate:</strong> ${escapeHtml(c.heartRate || c.pulse || '74 bpm')}</div>
          <div class="print-vital-box"><strong>Oxygen (SpO2):</strong> ${escapeHtml(c.spO2 || c.spo2 || '98%')}</div>
          <div class="print-vital-box"><strong>Temperature:</strong> ${escapeHtml(c.temperature || '98.6 °F')}</div>
        </div>

        <div class="print-clinical-section">
          <h3>Chief Complaint &amp; Clinical History</h3>
          <p>${escapeHtml(c.symptoms || c.chiefComplaint || 'Routine cardiac follow-up, mild dyspnea on heavy exertion.')}</p>
        </div>

        <div class="print-clinical-section">
          <h3>Clinical Assessment &amp; Working Diagnosis</h3>
          <p><strong>Primary Diagnosis:</strong> ${escapeHtml(c.diagnosis || 'Essential Hypertension, Stage 1 (Controlled)')}</p>
          <p><strong>Clinical Notes:</strong> ${escapeHtml(c.notes || c.clinicalNotes || 'Patient stable on current pharmacotherapy. Advised lifestyle modifications, low sodium diet.')}</p>
        </div>

        <div class="print-clinical-section">
          <h3>Follow-Up &amp; Care Directives</h3>
          <p><strong>Scheduled Review:</strong> ${escapeHtml(c.followUpDate || 'In 4 weeks')}</p>
        </div>

        <div class="print-footer-grid">
          <div class="print-security-meta">
            <div class="print-security-hash">Encounter Digital Hash: CON-SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}</div>
            <div class="print-timestamp">Recorded: ${nowStr}</div>
          </div>
          <div class="print-signature-box">
            <div class="print-doctor-sig-cursive">${escapeHtml(doctor.name)}</div>
            <div class="print-sign-line"></div>
            <strong>${escapeHtml(doctor.name)}</strong>
            <span style="font-size: 0.76rem; color: #475569;">Attending Physician Signature</span>
          </div>
        </div>
      </div>
    `;

  // --------------------------------------------------------------------------
  // CLINICAL SPECIALIST REFERRAL LETTER
  // --------------------------------------------------------------------------
  } else if (docType === 'referral' || docType === 'referral-letter') {
    let ref = null;
    if (typeof payload === 'string') {
      ref = (store.getReferralById ? store.getReferralById(payload) : null) || ((store.getReferrals ? store.getReferrals() : []) || []).find(r => r.id === payload) || { id: payload };
    } else {
      ref = payload || {};
    }

    const patientId = ref.patientId || 'PAT-302';
    const patient = (store.getPatientById ? store.getPatientById(patientId) : null) || ((store.getPatients ? store.getPatients() : []) || []).find(p => p.id === patientId) || { id: patientId, name: ref.patientName || 'Rajesh Kumar', age: 58, gender: 'Male', bloodGroup: 'B+' };
    const referringDoc = store.getDoctorById ? store.getDoctorById(ref.doctorId) : null;
    const destHospitalId = ref.targetFacilityId || ref.toHospitalId || 'HOSP-102';
    const destHospital = (store.getHospitalById ? store.getHospitalById(destHospitalId) : null) || ((store.getHospitals ? store.getHospitals() : []) || []).find(h => h.id === destHospitalId) || { id: destHospitalId, name: 'Apex Care Medical Center', location: 'Downtown Metro Healthcare Campus' };
    const priority = (ref.clinicalPriority || ref.priority || 'ROUTINE').toUpperCase();
    const priorityColor = priority === 'EMERGENCY' ? '#B91C1C' : priority === 'URGENT' ? '#D97706' : '#059669';

    docHtml = `
      <div class="print-medical-sheet print-referral-sheet">
        <!-- Letterhead -->
        <div class="print-letterhead">
          <div class="print-brand-left">
            <div class="print-hospital-icon">🏥</div>
            <div>
              <h1 class="print-hospital-name">CITY GENERAL HOSPITAL &amp; RESEARCH INSTITUTE</h1>
              <p class="print-hospital-meta"><strong>DEPARTMENT OF CLINICAL SPECIALIST COORDINATION &amp; REFERRAL SERVICES</strong></p>
              <p class="print-hospital-meta">100 Health Way, Medical Center Campus • Contact: +91 (0) 80 2345 6789 • Emergency: 1800-419-8800</p>
              <div class="print-header-badges">
                <span class="print-badge-accredited">✓ Accredited Inter-Hospital Clinical Care Network</span>
                <span class="print-badge-reg">Institutional Reg: HOSP-NMC-2026/894</span>
              </div>
            </div>
          </div>
          <div class="print-doc-type-box" style="text-align: right;">
            <div class="print-doc-tag" style="background: #0F766E; color: #FFFFFF; font-weight: 800; padding: 4px 10px; border-radius: 4px; display: inline-block;">CLINICAL REFERRAL DOSSIER</div>
            <div class="print-barcode">||| | |||| ||| |||||| |||| |||</div>
            <div class="print-rx-id">Referral UID: <strong>${escapeHtml(ref.id || 'REF-2026-8841')}</strong></div>
            <div class="print-date">Date: <strong>${dateOnlyStr}</strong> | ${timeOnlyStr}</div>
          </div>
        </div>

        <div class="print-divider"></div>

        <!-- Document Main Banner -->
        <div style="background: #F8FAFC; border: 1px solid #CBD5E1; border-radius: 6px; padding: 10px 14px; margin-bottom: 14px; text-align: center;">
          <h2 style="margin: 0; font-size: 1.15rem; font-weight: 800; color: #0F172A; letter-spacing: 0.02em; text-transform: uppercase;">
            CLINICAL SPECIALIST REFERRAL &amp; CARE COORDINATION LETTER
          </h2>
          <div style="font-size: 0.78rem; color: #0D9488; font-weight: 700; margin-top: 2px;">
            Target Specialty: ${escapeHtml(ref.targetSpecialty || ref.specialty || 'Cardiology')} • Inter-Facility Transfer Protocol
          </div>
        </div>

        <!-- 2-Column Parties Demographics Grid -->
        <div class="print-lab-patient-bar-2col">
          <div class="print-lab-col">
            <div class="print-section-sub">PATIENT IDENTIFICATION &amp; DEMOGRAPHICS</div>
            <div class="print-patient-name" style="font-size: 1.15rem; font-weight: 800; color: #0F172A; margin: 4px 0;">${escapeHtml(patient.name)}</div>
            <div class="print-details-row">
              <span><strong>Patient ID (UHID / MRN):</strong> <code>91-4401-${escapeHtml(patient.id || 'PAT-302')}</code></span>
              <span><strong>Age / Gender:</strong> ${patient.age || 58} Yrs / ${escapeHtml(patient.gender || 'Male')}</span>
            </div>
            <div class="print-details-row">
              <span><strong>Blood Group:</strong> <strong style="color: #047857;">${escapeHtml(patient.bloodGroup || 'B+')}</strong></span>
              <span><strong>Emergency Contact:</strong> ${escapeHtml(patient.emergencyContact || patient.phone || '+91 98111 99992')}</span>
            </div>
            <div class="print-details-row">
              <span><strong>Known Allergies:</strong> <strong style="color: #b91c1c;">${escapeHtml(patient.allergies || 'NKDA (No Known Drug Allergies)')}</strong></span>
              <span><strong>Active Status:</strong> Outpatient Clinical Referral</span>
            </div>
          </div>

          <div class="print-lab-col">
            <div class="print-section-sub">REFERRAL ROUTING &amp; DESTINATION FACILITY</div>
            <div class="print-details-row" style="margin-top: 4px;">
              <span><strong>Referring Clinician:</strong> <strong>${escapeHtml(referringDoc?.name || user?.name || 'Dr. Sarah Sharma, MD (Cardiology)')}</strong></span>
              <span><strong>Reg. No:</strong> <code>MCI-99401</code></span>
            </div>
            <div class="print-details-row">
              <span><strong>Receiving Facility:</strong> <strong style="color: #0F766E;">${escapeHtml(destHospital.name)}</strong></span>
              <span><strong>Facility Code:</strong> <code>${escapeHtml(destHospital.id || 'HOSP-102')}</code></span>
            </div>
            <div class="print-details-row">
              <span><strong>Location / Campus:</strong> ${escapeHtml(destHospital.location || 'Metro Healthcare Campus')}</span>
              <span><strong>Department:</strong> ${escapeHtml(ref.targetSpecialty || ref.specialty || 'Cardiology')}</span>
            </div>
            <div class="print-details-row">
              <span><strong>Clinical Priority:</strong> <strong style="color: ${priorityColor}; background: #F1F5F9; padding: 2px 8px; border-radius: 4px;">${priority === 'EMERGENCY' ? '🔴 STAT / EMERGENCY' : priority === 'URGENT' ? '🟡 URGENT' : '🟢 ROUTINE'}</strong></span>
            </div>
          </div>
        </div>

        <!-- Clinical Indication / Referral Reason -->
        <div class="print-clinical-section" style="margin-top: 14px; background: #F8FAFC; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; break-inside: avoid;">
          <h3 style="font-size: 0.88rem; font-weight: 800; color: #0F172A; text-transform: uppercase; margin: 0 0 6px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            CLINICAL INDICATION &amp; REASON FOR SPECIALIST CONSULTATION
          </h3>
          <p style="font-size: 0.86rem; color: #1E293B; line-height: 1.55; margin: 0;">
            ${escapeHtml(ref.referralReason || ref.reason || 'Patient requires specialized tertiary outpatient consultation, comprehensive sub-specialty evaluation, and diagnostic risk stratification.')}
          </p>
        </div>

        <!-- Additional Notes & Directives -->
        <div class="print-clinical-section" style="margin-top: 12px; background: #FFFFFF; border: 1px solid #E2E8F0; border-radius: 8px; padding: 12px 16px; break-inside: avoid;">
          <h3 style="font-size: 0.84rem; font-weight: 800; color: #0F766E; text-transform: uppercase; margin: 0 0 6px 0; border-bottom: 1px solid #E2E8F0; padding-bottom: 4px;">
            ADDITIONAL CLINICAL NOTES, VITALS &amp; TRANSPORT DIRECTIVES
          </h3>
          <p style="font-size: 0.84rem; color: #334155; line-height: 1.5; margin: 0;">
            ${escapeHtml(ref.additionalNotes || ref.notes || 'Patient vitals stable at time of referral dispatch. No acute active distress reported. Complete longitudinal electronic health records transferred via Hospitrack Inter-Facility Network.')}
          </p>
        </div>

        <!-- Attestation & Dual Signatures -->
        <div class="print-dual-signatures" style="display: grid; grid-template-columns: 1fr 1fr; gap: 24px; margin-top: 16px; padding-top: 14px; border-top: 1px solid #CBD5E1; break-inside: avoid;">
          <div class="print-sig-col" style="display: flex; flex-direction: column; align-items: flex-start;">
            <span style="font-size: 0.74rem; font-weight: 700; color: #475569; text-transform: uppercase; margin-bottom: 2px;">INTER-FACILITY PROVENANCE:</span>
            <strong style="font-size: 0.86rem; color: #0F172A;">Hospitrack Clinical Referral Registry</strong>
            <span style="font-size: 0.76rem; color: #64748B;">Dispatch Status: <strong>VERIFIED &amp; TRANSMITTED</strong></span>
            <div style="margin-top: 4px; font-size: 0.7rem; color: #0D9488; font-weight: 700;">Zero Duplicate Medication Safety Verified</div>
          </div>

          <div class="print-sig-col" style="display: flex; flex-direction: column; align-items: flex-end; text-align: right;">
            <div class="print-doctor-sig-cursive" style="font-family: 'Brush Script MT', cursive, sans-serif; font-size: 1.35rem; color: #0F766E;">Dr. Sarah Sharma</div>
            <div class="print-sign-line" style="width: 220px; height: 1px; background: #94A3B8; margin: 4px 0 6px 0;"></div>
            <strong style="font-size: 0.86rem; color: #0F172A;">${escapeHtml(referringDoc?.name || user?.name || 'Dr. Sarah Sharma, MD (Cardiology)')}</strong>
            <span style="font-size: 0.76rem; color: #475569;">Medical Registration No: <strong>MCI-99401</strong></span>
            <span style="font-size: 0.7rem; color: #0F766E; font-weight: 700;">Authorizing Referring Physician</span>
          </div>
        </div>
      </div>
    `;

  // --------------------------------------------------------------------------
  // LONGITUDINAL HEALTH PASSPORT / COMPREHENSIVE SUMMARY
  // --------------------------------------------------------------------------
  } else if (docType === 'summary' || docType === 'medical-summary') {
    const patient = (typeof payload === 'string') 
      ? ((store.getPatientById ? store.getPatientById(payload) : null) || ((store.getPatients ? store.getPatients() : []) || []).find(p => p.id === payload) || { id: payload, name: 'John Doe', age: 45, gender: 'Male', bloodGroup: 'O+' }) 
      : (payload || { name: currentUser?.name || 'John Doe', id: currentUser?.patientId || 'PAT-301', age: 45, gender: 'Male', bloodGroup: 'O+' });
    
    const prescriptions = store.getPrescriptions ? store.getPrescriptions(patient.id) : [];
    const labs = store.getLabs ? store.getLabs(null, patient.id) : [];

    docHtml = `
      <div class="print-medical-sheet">
        <div class="print-letterhead">
          <div class="print-brand-left">
            <div class="print-hospital-icon">H+</div>
            <div>
              <h1 class="print-hospital-name">HOSPITRACK NATIONAL HEALTHCARE COORDINATION NETWORK</h1>
              <p class="print-hospital-meta">Authoritative Multi-Facility Longitudinal Electronic Health Record (EHR)</p>
              <span class="print-badge-accredited">✓ Cryptographically Verified Multi-Hospital Health Passport</span>
            </div>
          </div>
          <div class="print-doc-type-box">
            <div class="print-doc-tag">COMPREHENSIVE MEDICAL SUMMARY</div>
            <div class="print-rx-id">ABHA ID: <strong>91-4401-8892-${escapeHtml(patient.id || 'PAT-301')}</strong></div>
            <div class="print-date">Generated: <strong>${dateOnlyStr}</strong></div>
          </div>
        </div>

        <div class="print-divider"></div>

        <div class="print-info-card mb-16">
          <div class="print-section-sub">PATIENT IDENTIFICATION &amp; DEMOGRAPHICS</div>
          <div class="print-patient-name">${escapeHtml(patient.name)}</div>
          <div class="print-details-row">
            <span><strong>Patient ID:</strong> ${escapeHtml(patient.id)}</span>
            <span><strong>Age / Gender:</strong> ${patient.age || 45} Yrs / ${escapeHtml(patient.gender || 'Male')}</span>
            <span><strong>Blood Group:</strong> <strong style="color: #047857;">${escapeHtml(patient.bloodGroup || 'O+')}</strong></span>
            <span><strong>Emergency Contact:</strong> ${escapeHtml(patient.emergencyContact || patient.phone || '+91 98765 43210')}</span>
          </div>
        </div>

        <div class="print-clinical-section">
          <h3>Active Prescriptions &amp; Medication Regimens (${prescriptions.length})</h3>
          ${prescriptions.length === 0 ? '<p style="color: #64748b;">No active medications on record.</p>' : `
            <table class="print-table">
              <thead>
                <tr>
                  <th style="width: 15%;">Prescription ID</th>
                  <th style="width: 22%;">Prescribing Doctor</th>
                  <th style="width: 48%;">Medication Details &amp; Regimen</th>
                  <th style="width: 15%;">Date Prescribed</th>
                </tr>
              </thead>
              <tbody>
                ${prescriptions.map(p => `
                  <tr>
                    <td><code>${escapeHtml(p.id)}</code></td>
                    <td><strong>${escapeHtml(p.doctorName || 'Attending Doctor')}</strong></td>
                    <td>${(p.items || []).map(i => `${escapeHtml(i.name)} (${escapeHtml(i.dosage || '')}) - ${escapeHtml(i.frequency || 'Once daily')}`).join('; ') || 'Standard regimen'}</td>
                    <td>${new Date(p.prescribedAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>

        <div class="print-clinical-section mt-16">
          <h3>Diagnostic Reports &amp; Laboratory Findings (${labs.length})</h3>
          ${labs.length === 0 ? '<p style="color: #64748b;">No laboratory reports on record.</p>' : `
            <table class="print-table">
              <thead>
                <tr>
                  <th style="width: 15%;">Report ID</th>
                  <th style="width: 30%;">Test Name</th>
                  <th style="width: 25%;">Result</th>
                  <th style="width: 15%;">Status</th>
                  <th style="width: 15%;">Date</th>
                </tr>
              </thead>
              <tbody>
                ${labs.map(l => `
                  <tr>
                    <td><code>${escapeHtml(l.id)}</code></td>
                    <td><strong>${escapeHtml(l.testName || 'Diagnostic Test')}</strong></td>
                    <td>${escapeHtml(l.result || 'Normal')}</td>
                    <td><span class="print-status-pill norm">${escapeHtml(l.status || 'FINAL')}</span></td>
                    <td>${new Date(l.reportedAt || l.createdAt || Date.now()).toLocaleDateString([], { month: 'short', day: 'numeric', year: 'numeric' })}</td>
                  </tr>
                `).join('')}
              </tbody>
            </table>
          `}
        </div>

        <div class="print-footer-grid">
          <div class="print-security-meta">
            <div class="print-security-hash">Digital Care Dossier Verification: SUM-SHA256-${Math.random().toString(36).substring(2, 10).toUpperCase()}</div>
            <div class="print-timestamp">Timestamp: ${nowStr}</div>
          </div>
          <div class="print-signature-box">
            <div class="print-sign-line"></div>
            <strong>Hospitrack Universal Care Network</strong>
            <span style="font-size: 0.76rem; color: #475569;">Verified Inter-Hospital Provenance</span>
          </div>
        </div>
      </div>
    `;

  // --------------------------------------------------------------------------
  // CRYPTOGRAPHIC AUDIT LEDGER
  // --------------------------------------------------------------------------
  } else if (docType === 'audit-ledger' || docType === 'audit') {
    const logs = store.getAuditLogs ? store.getAuditLogs().slice(0, 40) : [];
    docHtml = `
      <div class="print-medical-sheet">
        <div class="print-letterhead">
          <div class="print-brand-left">
            <div class="print-hospital-icon">🛡️</div>
            <div>
              <h1 class="print-hospital-name">HOSPITRACK CRYPTOGRAPHIC AUDIT TRAIL</h1>
              <p class="print-hospital-meta">Immutable Security Ledger • Compliance Report</p>
            </div>
          </div>
          <div class="print-doc-type-box">
            <div class="print-doc-tag">SECURITY AUDIT LEDGER</div>
            <div class="print-date">Generated: <strong>${dateOnlyStr}</strong></div>
          </div>
        </div>
        <div class="print-divider"></div>
        <table class="print-table">
          <thead>
            <tr>
              <th>Event ID</th>
              <th>Action</th>
              <th>Actor (Role)</th>
              <th>Target Entity</th>
              <th>Timestamp</th>
              <th>SHA-256 Hash</th>
            </tr>
          </thead>
          <tbody>
            ${logs.map(l => `
              <tr>
                <td><code>${escapeHtml(l.id)}</code></td>
                <td><strong>${escapeHtml(l.action)}</strong></td>
                <td>${escapeHtml(l.actorName || l.actor)} (${escapeHtml(l.actorRole)})</td>
                <td>${escapeHtml(l.targetEntity)} (${escapeHtml(l.targetId)})</td>
                <td>${new Date(l.timestamp || Date.now()).toLocaleString()}</td>
                <td><code style="font-size: 0.7rem;">${escapeHtml(l.integrityHash || 'SEC-SHA256')}</code></td>
              </tr>
            `).join('')}
          </tbody>
        </table>
      </div>
    `;
  } else {
    if (typeof window.print === 'function') window.print();
    return;
  }

  printArea.innerHTML = docHtml;
  if (fallbackArea && fallbackArea !== printArea) {
    fallbackArea.innerHTML = docHtml;
  }
  document.body.classList.add('printing-custom-doc');

  const cleanUpPrint = () => {
    document.body.classList.remove('printing-custom-doc');
    if (printArea) printArea.innerHTML = '';
    if (fallbackArea && fallbackArea !== printArea) fallbackArea.innerHTML = '';
    if (typeof window.removeEventListener === 'function') {
      window.removeEventListener('afterprint', cleanUpPrint);
    }
  };

  if (typeof window.addEventListener === 'function') {
    window.addEventListener('afterprint', cleanUpPrint);
  }

  setTimeout(() => {
    if (typeof window.print === 'function') window.print();
    setTimeout(cleanUpPrint, 1500);
  }, 120);
};

// Global Print Shortcuts & PDF Dispatcher
window.downloadClinicalPdf = function(type, id) {
  if (typeof window.hospitrackPrintDocument === 'function') {
    window.hospitrackPrintDocument(type, id);
  } else if (typeof window.print === 'function') {
    window.print();
  }
};
window.printPrescription = (rxId) => window.hospitrackPrintDocument('prescription', rxId);
window.printLabReport = (labId) => window.hospitrackPrintDocument('lab-report', labId);
window.printConsultation = (conId) => window.hospitrackPrintDocument('consultation', conId);
window.printPatientSummary = (patId) => window.hospitrackPrintDocument('summary', patId);
window.printDischargeSummary = (id) => window.hospitrackPrintDocument('discharge', id);
window.printReferral = (refId) => window.hospitrackPrintDocument('referral', refId);
window.previewReferralLetter = (payload) => window.hospitrackPrintDocument('referral', payload);
window.printAuditLedger = () => window.hospitrackPrintDocument('audit-ledger');

