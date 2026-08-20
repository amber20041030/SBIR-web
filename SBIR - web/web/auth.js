(() => {
  'use strict';

  const USERS_KEY = 'sbir_demo_users_v3';
  const LEGACY_USERS_KEYS = ['sbir_demo_users_v2', 'sbir_demo_users'];
  const RESET_KEY = 'sbir_demo_reset_v4';
  const SESSION_KEY = 'sbir_current_user';
  const RETURN_KEY = 'sbir_auth_return_to';
  const DEMO_CODE = '123456';
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const delay = ms => new Promise(resolve => setTimeout(resolve, ms));
  const emailValid = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const phoneValid = value => /^09\d{8}$/.test(value.trim());
  const passwordChecks = value => ({ length: value.length >= 8, letter: /[A-Za-z]/.test(value), number: /\d/.test(value) });
  const passwordValid = value => Object.values(passwordChecks(value)).every(Boolean);
  const normalizeEmail = value => value.trim().toLowerCase();

  const defaults = [
    { name: '會員', email: 'demo@example.com', phone: '0912345678', password: '12345678', verified: true, welcomed: true, avatar: '', phoneVerified: true }
  ];

  if (!localStorage.getItem(RESET_KEY)) {
    LEGACY_USERS_KEYS.forEach(key => localStorage.removeItem(key));
    localStorage.removeItem(USERS_KEY);
    localStorage.removeItem(SESSION_KEY);
    localStorage.setItem(RESET_KEY, '1');
  }

  function getUsers() {
    let stored = [];
    try { stored = JSON.parse(localStorage.getItem(USERS_KEY) || '[]'); } catch (_) { stored = []; }
    const merged = [...stored];
    defaults.forEach(user => {
      if (!merged.some(item => item.email === user.email)) merged.push({ ...user });
    });
    localStorage.setItem(USERS_KEY, JSON.stringify(merged));
    return merged;
  }

  function saveUsers(users) { localStorage.setItem(USERS_KEY, JSON.stringify(users)); }
  function findUserByEmail(email) { return getUsers().find(user => user.email === normalizeEmail(email)); }
  function findUserByPhone(phone) { return getUsers().find(user => user.phone === phone.trim()); }
  function updateUser(email, changes) {
    const users = getUsers();
    const index = users.findIndex(user => user.email === normalizeEmail(email));
    if (index < 0) return null;
    users[index] = { ...users[index], ...changes };
    saveUsers(users);
    return users[index];
  }

  function safeReturnTarget(value) {
    if (!value) return 'index.html';
    try {
      const url = new URL(value, location.href);
      if (url.origin !== location.origin) return 'index.html';
      if (/\/(?:login|register)\.html$/i.test(url.pathname)) return 'index.html';
      return `${url.pathname.split('/').pop() || 'index.html'}${url.search}${url.hash}`;
    } catch (_) { return 'index.html'; }
  }

  const params = new URLSearchParams(location.search);
  const incomingReturn = params.get('returnTo');
  if (incomingReturn) sessionStorage.setItem(RETURN_KEY, safeReturnTarget(incomingReturn));
  const savedReturn = sessionStorage.getItem(RETURN_KEY);
  const state = {
    currentView: 'login',
    pendingEmail: '',
    phoneLoginCodeSent: false,
    registerCodeSent: false,
    returnTo: safeReturnTarget(savedReturn || incomingReturn || 'index.html'),
    shouldReturn: Boolean(savedReturn || incomingReturn),
    timers: new Set()
  };

  const backLink = $('#backLink');
  backLink.href = state.returnTo;

  function showView(name, options = {}) {
    const target = $(`[data-view="${name}"]`);
    if (!target) return;
    $$('.auth-view').forEach(view => {
      const active = view === target;
      view.hidden = !active;
      view.classList.toggle('is-active', active);
    });
    state.currentView = name;
    if (name === 'login' || name === 'register') history.replaceState(null, '', `${location.pathname}${location.search}#${name}`);
    if (!options.keepScroll) window.scrollTo({ top: 0, behavior: 'smooth' });
    const focusable = target.querySelector('input:not([disabled]),button:not([disabled])');
    if (options.focus && focusable) setTimeout(() => focusable.focus(), 220);
  }

  function toast() {
    // 登入與註冊流程不顯示浮動通知；狀態與錯誤皆顯示在流程或對應欄位內。
  }

  function setLoading(button, loading, loadingLabel) {
    if (!button) return;
    const span = button.querySelector('span');
    if (!button.dataset.originalLabel && span) button.dataset.originalLabel = span.textContent;
    button.disabled = loading;
    button.classList.toggle('is-loading', loading);
    if (span) span.textContent = loading ? loadingLabel : button.dataset.originalLabel;
  }

  function setAlert(element, kind, title, text, actions = '') {
    element.hidden = false;
    element.className = `status-panel ${kind}`;
    element.innerHTML = `<strong>${title}</strong><span>${text}</span>${actions ? `<div class="panel-actions">${actions}</div>` : ''}`;
  }

  function clearAlert(element) { element.hidden = true; element.innerHTML = ''; element.className = 'status-panel'; }
  function markField(input, messageElement, message = '') {
    input.setAttribute('aria-invalid', String(Boolean(message)));
    if (messageElement) messageElement.textContent = message;
  }

  function openModal(content, onReady) {
    $('#modalContent').innerHTML = content;
    $('#modalBackdrop').hidden = false;
    document.body.style.overflow = 'hidden';
    setTimeout(() => $('.glass-modal button:not(.modal-close), .glass-modal input')?.focus(), 30);
    if (onReady) onReady($('#modalContent'));
  }

  function closeModal() {
    $('#modalBackdrop').hidden = true;
    $('#modalContent').innerHTML = '';
    document.body.style.overflow = '';
  }

  $('#modalClose').addEventListener('click', closeModal);
  $('#modalBackdrop').addEventListener('click', event => { if (event.target === $('#modalBackdrop')) closeModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#modalBackdrop').hidden) closeModal(); });

  function startCountdown(button, baseLabel = '重新寄送', seconds = 10) {
    let remaining = seconds;
    button.dataset.counting = 'true';
    button.disabled = true;
    button.textContent = `${remaining} 秒後可重新寄送`;
    const timer = setInterval(() => {
      remaining -= 1;
      button.textContent = remaining > 0 ? `${remaining} 秒後可重新寄送` : baseLabel;
      if (remaining <= 0) {
        clearInterval(timer);
        state.timers.delete(timer);
        delete button.dataset.counting;
        if (button.id === 'loginSendCode') validatePhoneLogin();
        else if (button.id === 'registerSendCode') validateRegister();
        else button.disabled = false;
      }
    }, 1000);
    state.timers.add(timer);
  }

  function openAppleModal() {
    openModal(`<div class="modal-head"><i class="fa-brands fa-apple modal-brand"></i><h2 id="modalTitle">使用 Apple 登入</h2><p>使用 Apple ID 繼續登入此服務。</p></div><div class="modal-actions"><button class="primary-btn" id="appleContinue" type="button"><span>繼續</span></button><button class="secondary-btn full" id="appleCancel" type="button">取消</button></div>`, root => {
      $('#appleCancel', root).addEventListener('click', closeModal);
      $('#appleContinue', root).addEventListener('click', async event => {
        setLoading(event.currentTarget, true, '授權中...');
        await delay(700);
        closeModal();
        const user = findUserByEmail('demo@example.com');
        completeLogin(user);
      });
    });
  }

  function openLegal(type) {
    const title = type === 'terms' ? '服務條款' : '隱私權政策';
    openModal(`<div class="modal-head"><h2 id="modalTitle">${title}</h2><p>使用條款與隱私說明</p></div><div class="modal-body-copy"><p>使用本服務時，請以正確資料建立帳號並妥善保管登入資訊。</p><p>系統會儲存必要的帳號與操作資料，並依隱私權政策妥善處理。</p><p>正式服務上線前，應補充完整的資料蒐集目的、使用範圍、保存期間、使用者權利與聯絡方式。</p></div><div class="modal-actions single"><button class="primary-btn" id="legalClose" type="button">關閉</button></div>`, root => $('#legalClose', root).addEventListener('click', closeModal));
  }

  async function completeLogin(user, firstTime = false) {
    localStorage.setItem(SESSION_KEY, user.email);
    toast('登入成功', 'success');
    if (firstTime && !user.welcomed) {
      state.pendingEmail = user.email;
      renderWelcome(user);
      showView('welcome');
      return;
    }
    if (state.shouldReturn) {
      await delay(900);
      location.href = state.returnTo;
      return;
    }
    location.href = 'member.html';
  }

  function setAvatarPreview(image, fallback, avatar) {
    if (avatar) {
      image.src = avatar;
      image.hidden = false;
      fallback.hidden = true;
    } else {
      image.removeAttribute('src');
      image.hidden = true;
      fallback.hidden = false;
    }
  }

  function renderWelcome(user) {
    setAvatarPreview($('#welcomeAvatar'), $('#welcomeAvatarFallback'), user?.avatar || '');
    const hint = $('#avatarUploadHint');
    hint.textContent = user?.avatar ? '✓ 大頭照已儲存，可點擊按鈕重新選擇' : '支援 JPG、PNG 或 WebP，圖片會自動裁切';
    hint.className = `avatar-hint${user?.avatar ? ' success' : ''}`;
  }

  function renderDashboard(user) {
    $('#memberName').textContent = user.name || '會員';
    $('#memberEmail').textContent = user.email;
    $('#memberPhone').textContent = user.phone || '未設定';
    $('#phoneVerifiedBadge').hidden = !(user.phoneVerified || user.phone);
    $('#returnToSiteBtn').textContent = '開始使用';
    setAvatarPreview($('#dashboardAvatar'), $('#dashboardAvatarFallback'), user.avatar || '');
  }

  function createAvatarData(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        try {
          const size = Math.min(image.naturalWidth, image.naturalHeight);
          const sx = (image.naturalWidth - size) / 2;
          const sy = (image.naturalHeight - size) / 2;
          const canvas = document.createElement('canvas');
          canvas.width = 320;
          canvas.height = 320;
          const context = canvas.getContext('2d');
          context.fillStyle = '#d9ebe1';
          context.fillRect(0, 0, 320, 320);
          context.drawImage(image, sx, sy, size, size, 0, 0, 320, 320);
          resolve(canvas.toDataURL('image/jpeg', 0.82));
        } catch (error) { reject(error); }
        finally { URL.revokeObjectURL(objectUrl); }
      };
      image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('invalid-image')); };
      image.src = objectUrl;
    });
  }

  $('#avatarUpload').addEventListener('change', async event => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    const hint = $('#avatarUploadHint');
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      hint.textContent = '請選擇 8MB 以內的 JPG、PNG 或 WebP 圖片';
      hint.className = 'avatar-hint error';
      toast('大頭照格式或檔案大小不符合要求', 'error');
      input.value = '';
      return;
    }
    hint.textContent = '正在處理大頭照...';
    hint.className = 'avatar-hint';
    try {
      const avatar = await createAvatarData(file);
      const email = state.pendingEmail || localStorage.getItem(SESSION_KEY);
      const user = email && updateUser(email, { avatar });
      if (!user) throw new Error('user-not-found');
      renderWelcome(user);
      renderDashboard(user);
      toast('大頭照已儲存', 'success');
    } catch (_) {
      hint.textContent = '大頭照儲存失敗，請嘗試較小的圖片';
      hint.className = 'avatar-hint error';
      toast('大頭照儲存失敗', 'error');
    } finally { input.value = ''; }
  });

  function socialLogin(provider) {
    if (provider === 'apple') return openAppleModal();
    const user = findUserByEmail('demo@example.com');
    completeLogin(user);
  }

  $$('[data-social]').forEach(button => button.addEventListener('click', () => socialLogin(button.dataset.social)));
  $$('[data-legal]').forEach(button => button.addEventListener('click', () => openLegal(button.dataset.legal)));
  $$('[data-switch]').forEach(button => button.addEventListener('click', () => showView(button.dataset.switch, { focus: true })));
  $$('.password-toggle').forEach(button => button.addEventListener('click', () => {
    const input = document.getElementById(button.dataset.passwordTarget);
    const show = input.type === 'password';
    input.type = show ? 'text' : 'password';
    button.classList.toggle('is-visible', show);
    button.setAttribute('aria-label', show ? '隱藏密碼' : '顯示密碼');
    button.setAttribute('aria-pressed', String(show));
  }));

  $$('[data-login-tab]').forEach(button => button.addEventListener('click', () => {
    const tab = button.dataset.loginTab;
    $$('[data-login-tab]').forEach(item => {
      const active = item === button;
      item.classList.toggle('is-active', active);
      item.setAttribute('aria-selected', String(active));
    });
    $$('[data-login-panel]').forEach(panel => {
      const active = panel.dataset.loginPanel === tab;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
  }));

  $('#forgotPasswordBtn').addEventListener('click', () => {
    $('#forgotEmail').value = $('#loginEmail').value;
    showView('forgot', { focus: true });
  });

  $('#emailLoginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const emailInput = $('#loginEmail');
    const passwordInput = $('#loginPassword');
    const alert = $('#loginAlert');
    clearAlert(alert);
    const email = normalizeEmail(emailInput.value);
    if (!emailValid(email)) {
      markField(emailInput, $('#loginEmailError'), '請輸入有效的電子郵件地址');
      emailInput.focus();
      return;
    }
    markField(emailInput, $('#loginEmailError'));
    if (!passwordInput.value) {
      markField(passwordInput, $('#loginPasswordError'), '請輸入密碼');
      passwordInput.focus();
      return;
    }
    markField(passwordInput, $('#loginPasswordError'));
    const submit = $('#emailLoginSubmit');
    setLoading(submit, true, '登入中...');
    await delay(700);
    const user = findUserByEmail(email);
    setLoading(submit, false);
    if (!user) {
      markField(emailInput, $('#loginEmailError'), '找不到此帳號，請確認電子郵件是否正確');
      emailInput.focus();
      return;
    }
    if (user.password !== passwordInput.value) {
      markField(passwordInput, $('#loginPasswordError'), '密碼不正確，請重新輸入密碼');
      passwordInput.select();
      toast('密碼錯誤', 'error');
      return;
    }
    if (!user.verified) {
      showUnverifiedAlert(user, alert);
      toast('尚未完成 Email 驗證', 'warning');
      return;
    }
    completeLogin(user);
  });

  function showUnverifiedAlert(user, alert) {
    setAlert(alert, 'warning', '請先驗證電子郵件', `你的帳號尚未完成電子郵件驗證。驗證信已寄送至：${user.email}`, '<button class="text-link strong" type="button" data-alert-action="resend">重新寄送驗證信</button><button class="text-link" type="button" data-alert-action="change">更換帳號</button>');
    $('[data-alert-action="resend"]', alert).addEventListener('click', () => {
      state.pendingEmail = user.email;
      $('#verificationEmail').textContent = user.email;
      showView('verify');
      toast('驗證信已重新寄出', 'success');
      startCountdown($('#resendVerificationBtn'));
    });
    $('[data-alert-action="change"]', alert).addEventListener('click', () => {
      $('#loginEmail').value = '';
      $('#loginPassword').value = '';
      clearAlert(alert);
      $('#loginEmail').focus();
    });
  }

  const loginPhone = $('#loginPhone');
  const loginOtp = $('#loginOtp');
  function validatePhoneLogin() {
    $('#loginSendCode').disabled = !phoneValid(loginPhone.value) || $('#loginSendCode').dataset.counting === 'true';
    $('#phoneLoginSubmit').disabled = !(state.phoneLoginCodeSent && phoneValid(loginPhone.value) && /^\d{6}$/.test(loginOtp.value));
  }
  loginPhone.addEventListener('input', () => { state.phoneLoginCodeSent = false; validatePhoneLogin(); clearAlert($('#phoneLoginAlert')); });
  loginOtp.addEventListener('input', () => { loginOtp.value = loginOtp.value.replace(/\D/g, '').slice(0, 6); markField(loginOtp, $('#loginOtpError')); validatePhoneLogin(); });
  $('#loginSendCode').addEventListener('click', () => {
    if (!phoneValid(loginPhone.value)) return;
    state.phoneLoginCodeSent = true;
    validatePhoneLogin();
    toast(`驗證碼已發送（驗證碼：${DEMO_CODE}）`, 'success');
    startCountdown($('#loginSendCode'), '重新發送驗證碼');
    loginOtp.focus();
  });
  $('#phoneLoginForm').addEventListener('submit', async event => {
    event.preventDefault();
    const alert = $('#phoneLoginAlert');
    clearAlert(alert);
    if (loginOtp.value !== DEMO_CODE) {
      markField(loginOtp, $('#loginOtpError'), '驗證碼不正確');
      loginOtp.focus();
      return;
    }
    markField(loginOtp, $('#loginOtpError'));
    const submit = $('#phoneLoginSubmit');
    setLoading(submit, true, '登入中...');
    await delay(650);
    const user = findUserByPhone(loginPhone.value);
    setLoading(submit, false);
    if (!user) {
      markField(loginPhone, $('#loginPhoneError'), '此電話號碼尚未註冊');
      loginPhone.focus();
      return;
    }
    if (!user.verified) {
      showUnverifiedAlert(user, alert);
      return;
    }
    completeLogin(user);
  });

  const registerName = $('#registerName');
  const registerEmail = $('#registerEmail');
  const registerPhone = $('#registerPhone');
  const registerOtp = $('#registerOtp');
  const registerPassword = $('#registerPassword');
  const confirmPassword = $('#confirmPassword');
  const termsCheck = $('#termsCheck');

  function updatePasswordRules() {
    const checks = passwordChecks(registerPassword.value);
    Object.entries(checks).forEach(([rule, valid]) => $(`[data-rule="${rule}"]`).classList.toggle('is-valid', valid));
    return Object.values(checks).every(Boolean);
  }

  function validateConfirm(showMessage = true) {
    const mismatch = Boolean(confirmPassword.value) && confirmPassword.value !== registerPassword.value;
    markField(confirmPassword, $('#confirmPasswordError'), mismatch && showMessage ? '兩次輸入的密碼不一致' : '');
    return !mismatch && Boolean(confirmPassword.value);
  }

  function validateRegister() {
    const ready = Boolean(registerName.value.trim()) && emailValid(registerEmail.value) && phoneValid(registerPhone.value) && state.registerCodeSent && registerOtp.value === DEMO_CODE && passwordValid(registerPassword.value) && confirmPassword.value === registerPassword.value && Boolean(confirmPassword.value) && termsCheck.checked;
    $('#registerSendCode').disabled = !phoneValid(registerPhone.value) || $('#registerSendCode').dataset.counting === 'true';
    $('#registerSubmit').disabled = !ready;
    return ready;
  }

  const demoRegisterProfiles = [
    { name: '林小晴', slug: 'xiaoqing.lin' },
    { name: '陳宇森', slug: 'yusen.chen' },
    { name: '張庭安', slug: 'tingan.chang' },
    { name: '李若溪', slug: 'ruoxi.li' },
    { name: '王嘉禾', slug: 'jiahe.wang' }
  ];

  $('#registerLogo')?.addEventListener('click', () => {
    state.timers.forEach(timer => clearInterval(timer));
    state.timers.clear();

    const profile = demoRegisterProfiles[Math.floor(Math.random() * demoRegisterProfiles.length)];
    const suffix = `${Date.now().toString().slice(-5)}${Math.floor(Math.random() * 90 + 10)}`;
    let phone;
    do {
      phone = `09${String(Math.floor(Math.random() * 100000000)).padStart(8, '0')}`;
    } while (findUserByPhone(phone));

    registerName.value = profile.name;
    registerEmail.value = `${profile.slug}.${suffix}@example.com`;
    registerPhone.value = phone;
    registerOtp.value = DEMO_CODE;
    registerPassword.value = 'Travel2026';
    confirmPassword.value = 'Travel2026';
    termsCheck.checked = true;
    state.registerCodeSent = true;

    delete $('#registerSendCode').dataset.counting;
    $('#registerSendCode').textContent = '發送驗證碼';
    markField(registerEmail, $('#registerEmailError'));
    markField(registerOtp, $('#registerPhoneError'));
    markField(confirmPassword, $('#confirmPasswordError'));
    clearAlert($('#registerAlert'));
    $('#registerPhoneHint').textContent = '✓ 電話號碼驗證完成';
    $('#registerPhoneHint').className = 'field-hint success';
    updatePasswordRules();
    validateConfirm(true);
    validateRegister();
    toast('已隨機填入一組註冊資料，尚未建立帳號', 'success');
  });
  [registerName, termsCheck].forEach(input => input.addEventListener('input', validateRegister));
  registerEmail.addEventListener('input', () => { markField(registerEmail, $('#registerEmailError')); validateRegister(); });
  registerEmail.addEventListener('blur', () => {
    if (registerEmail.value && !emailValid(registerEmail.value)) markField(registerEmail, $('#registerEmailError'), '請輸入有效的電子郵件地址');
  });
  registerPhone.addEventListener('input', () => {
    registerPhone.value = registerPhone.value.replace(/\D/g, '').slice(0, 10);
    state.registerCodeSent = false;
    $('#registerPhoneHint').textContent = '輸入有效電話後即可發送；驗證碼為 123456';
    $('#registerPhoneHint').classList.remove('success');
    validateRegister();
  });
  registerOtp.addEventListener('input', () => {
    registerOtp.value = registerOtp.value.replace(/\D/g, '').slice(0, 6);
    if (registerOtp.value.length === 6) {
      const correct = state.registerCodeSent && registerOtp.value === DEMO_CODE;
      markField(registerOtp, $('#registerPhoneError'), correct ? '' : '驗證碼不正確');
      $('#registerPhoneHint').textContent = correct ? '✓ 電話號碼驗證完成' : '驗證碼為 123456';
      $('#registerPhoneHint').classList.toggle('success', correct);
    } else markField(registerOtp, $('#registerPhoneError'));
    validateRegister();
  });
  registerPassword.addEventListener('input', () => { updatePasswordRules(); validateConfirm(Boolean(confirmPassword.value)); validateRegister(); });
  confirmPassword.addEventListener('input', () => { validateConfirm(true); validateRegister(); });
  $('#registerSendCode').addEventListener('click', () => {
    if (!phoneValid(registerPhone.value)) return;
    state.registerCodeSent = true;
    validateRegister();
    toast(`簡訊驗證碼已發送（驗證碼：${DEMO_CODE}）`, 'success');
    startCountdown($('#registerSendCode'), '重新發送驗證碼');
    registerOtp.focus();
  });

  $('#registerForm').addEventListener('submit', async event => {
    event.preventDefault();
    if (!validateRegister()) return;
    const submit = $('#registerSubmit');
    clearAlert($('#registerAlert'));
    setLoading(submit, true, '建立中...');
    await delay(800);
    const email = normalizeEmail(registerEmail.value);
    if (findUserByEmail(email)) {
      setLoading(submit, false);
      openEmailExistsModal(email);
      return;
    }
    const users = getUsers();
    const user = { name: registerName.value.trim(), email, phone: registerPhone.value.trim(), password: registerPassword.value, verified: false, welcomed: false, avatar: '', phoneVerified: true };
    users.push(user); saveUsers(users);
    setLoading(submit, false);
    state.pendingEmail = email;
    $('#verificationEmail').textContent = email;
    toast('帳號建立成功，請完成 Email 驗證', 'success');
    showView('verify');
  });

  function openEmailExistsModal(email) {
    openModal(`<div class="modal-head"><span class="view-icon warning"><i class="fa-solid fa-envelope-circle-check"></i></span><h2 id="modalTitle">此電子郵件已被使用</h2><p>這個電子郵件已經註冊過帳號。可以直接登入，或使用忘記密碼功能。</p></div><div class="modal-actions"><button class="primary-btn" id="goLogin" type="button">前往登入</button><button class="secondary-btn full" id="goForgot" type="button">忘記密碼</button></div>`, root => {
      $('#goLogin', root).addEventListener('click', () => { closeModal(); $('#loginEmail').value = email; showView('login'); });
      $('#goForgot', root).addEventListener('click', () => { closeModal(); $('#forgotEmail').value = email; showView('forgot'); });
    });
  }

  $('#forgotForm').addEventListener('submit', async event => {
    event.preventDefault();
    const input = $('#forgotEmail');
    if (!emailValid(input.value)) {
      markField(input, $('#forgotEmailError'), '請輸入有效的電子郵件地址');
      input.focus(); return;
    }
    markField(input, $('#forgotEmailError'));
    setLoading($('#forgotSubmit'), true, '寄送中...');
    await delay(650);
    setLoading($('#forgotSubmit'), false);
    $('#forgotSentEmail').textContent = normalizeEmail(input.value);
    toast('密碼重設信已寄出', 'success');
    showView('forgot-sent');
  });
  $('#resendResetBtn').addEventListener('click', event => { toast('密碼重設信已重新寄出', 'success'); startCountdown(event.currentTarget); });

  function prepareVerification(email) {
    state.pendingEmail = normalizeEmail(email);
    $('#verificationEmail').textContent = state.pendingEmail;
    showView('verify');
  }

  $('#resendVerificationBtn').addEventListener('click', event => {
    toast('驗證信已重新寄出', 'success');
    startCountdown(event.currentTarget);
  });

  $('#simulateVerifyBtn').addEventListener('click', () => simulateVerification('success'));
  $$('[data-demo-verify]').forEach(button => button.addEventListener('click', () => simulateVerification(button.dataset.demoVerify)));

  async function simulateVerification(status) {
    if (!state.pendingEmail) state.pendingEmail = $('#verificationEmail').textContent || 'demo@example.com';
    showView('verify-loading');
    await delay(800);
    if (status === 'success') {
      const user = findUserByEmail(state.pendingEmail);
      if (user?.verified) return renderVerificationResult('verified');
      updateUser(state.pendingEmail, { verified: true });
      toast('電子郵件驗證成功', 'success');
    }
    renderVerificationResult(status);
  }

  function renderVerificationResult(status) {
    const configs = {
      success: { icon: 'fa-circle-check', cls: 'success', title: '電子郵件驗證成功', text: '你的帳號已完成驗證。現在可以開始使用所有會員功能。' },
      expired: { icon: 'fa-clock-rotate-left', cls: 'warning', title: '驗證連結已過期', text: '為了保護你的帳號安全，此驗證連結已經失效。' },
      invalid: { icon: 'fa-link-slash', cls: 'error', title: '無法驗證此連結', text: '這個驗證連結可能無效或已經被使用。' },
      verified: { icon: 'fa-circle-check', cls: 'success', title: '你的電子郵件已經完成驗證', text: '此帳號不需要再次驗證。' }
    };
    const config = configs[status] || configs.invalid;
    const icon = $('#verifyResultIcon');
    icon.className = `view-icon result ${config.cls}`;
    icon.innerHTML = `<i class="fa-solid ${config.icon}"></i>`;
    $('#verifyResultTitle').textContent = config.title;
    $('#verifyResultText').textContent = config.text;
    const actions = $('#verifyResultActions');
    if (status === 'success' || status === 'verified') {
      actions.innerHTML = '<button class="primary-btn" id="verificationStart" type="button">開始使用</button>';
      $('#verificationStart', actions).addEventListener('click', () => {
        const user = findUserByEmail(state.pendingEmail);
        if (!user) return showView('login');
        localStorage.setItem(SESSION_KEY, user.email);
        if (!user.welcomed) { renderWelcome(user); showView('welcome'); } else completeLogin(user);
      });
    } else {
      actions.innerHTML = '<button class="primary-btn" id="verificationResend" type="button">重新寄送驗證信</button><button class="secondary-btn full" id="verificationBack" type="button">返回登入</button>';
      $('#verificationResend', actions).addEventListener('click', () => { prepareVerification(state.pendingEmail); toast('驗證信已重新寄出', 'success'); startCountdown($('#resendVerificationBtn')); });
      $('#verificationBack', actions).addEventListener('click', () => showView('login'));
    }
    showView('verify-result');
  }

  $('#startExploreBtn').addEventListener('click', () => {
    const user = updateUser(state.pendingEmail, { welcomed: true }) || findUserByEmail(state.pendingEmail);
    if (!user) return showView('login');
    localStorage.setItem(SESSION_KEY, user.email);
    location.href = 'member.html';
  });
  $('#returnToSiteBtn').addEventListener('click', () => { sessionStorage.removeItem(RETURN_KEY); location.href = state.returnTo; });


  function init() {
    getUsers();
    updatePasswordRules();
    validateRegister();
    validatePhoneLogin();
    const hash = location.hash.replace('#', '');
    if (hash === 'register') showView('register');
    else if (hash === 'dashboard') {
      const email = localStorage.getItem(SESSION_KEY);
      const user = email && findUserByEmail(email);
      if (user) location.replace('member.html');
      else showView('login');
    } else showView('login');
  }

  init();
})();