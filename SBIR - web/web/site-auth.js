(() => {
  const RETURN_KEY = 'sbir_auth_return_to';
  const SESSION_KEY = 'sbir_current_user';
  const USERS_KEY = 'sbir_demo_users_v3';
  const RESET_KEY = 'sbir_demo_reset_v4';
  const DEFAULT_USER = { name: '會員', email: 'demo@example.com', phone: '0912345678', password: '12345678', verified: true, welcomed: true, avatar: '', phoneVerified: true };
  if (!localStorage.getItem(RESET_KEY)) {
    ['sbir_demo_users', 'sbir_demo_users_v2', USERS_KEY].forEach(key => localStorage.removeItem(key));
    localStorage.removeItem(SESSION_KEY);
    localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_USER]));
    localStorage.setItem(RESET_KEY, '1');
  }
  const here = `${location.pathname.split('/').pop() || 'index.html'}${location.search}${location.hash}`;
  const currentEmail = localStorage.getItem(SESSION_KEY);
  const loginControls = [...document.querySelectorAll('.login-btn,.g-login')];
  const signupControls = [...document.querySelectorAll('.signup-btn,.g-signup')];

  const getCurrentUser = () => {
    if (!currentEmail) return null;
    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      return Array.isArray(users) ? users.find(user => user.email?.toLowerCase() === currentEmail.toLowerCase()) || null : null;
    } catch (_) {
      return null;
    }
  };

  const addMemberStyles = () => {
    if (document.getElementById('siteMemberStyles')) return;
    const style = document.createElement('style');
    style.id = 'siteMemberStyles';
    style.textContent = `
      .site-member-link{display:inline-flex!important;align-items:center!important;justify-content:center!important;gap:8px!important;padding-left:7px!important}
      .site-member-avatar{width:28px;height:28px;flex:0 0 28px;display:grid;place-items:center;overflow:hidden;border-radius:50%;background:linear-gradient(145deg,rgba(184,214,198,.3),rgba(83,126,102,.24));color:#d9ebe1;box-shadow:inset 0 1px rgba(255,255,255,.24),0 3px 10px rgba(0,0,0,.2)}
      .site-member-avatar img{width:100%;height:100%;display:block;object-fit:cover}
      .site-member-avatar svg{width:14px;height:14px;fill:currentColor}
      .signup-btn[hidden],.g-signup[hidden]{display:none!important}
    `;
    document.head.append(style);
  };

  const renderMemberControl = (control, user) => {
    control.textContent = '';
    control.classList.add('site-member-link');
    control.setAttribute('aria-label', '前往會員中心');

    const avatar = document.createElement('span');
    avatar.className = 'site-member-avatar';
    avatar.setAttribute('aria-hidden', 'true');
    if (user?.avatar) {
      const image = document.createElement('img');
      image.src = user.avatar;
      image.alt = '';
      avatar.append(image);
    } else {
      avatar.innerHTML = '<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 12a5 5 0 1 0 0-10 5 5 0 0 0 0 10Zm0 2c-5 0-9 2.5-9 5.5V22h18v-2.5C21 16.5 17 14 12 14Z"/></svg>';
    }

    const label = document.createElement('span');
    label.textContent = '會員中心';
    control.append(avatar, label);
  };

  const goAuth = view => {
    sessionStorage.setItem(RETURN_KEY, here);
    location.href = `login.html#${view}`;
  };

  const currentUser = getCurrentUser();
  if (currentEmail) addMemberStyles();

  loginControls.forEach(control => {
    if (currentEmail) renderMemberControl(control, currentUser);
    else control.textContent = '登入';
    if (control.tagName === 'A') control.href = currentEmail ? 'member.html' : 'login.html#login';
    control.addEventListener('click', event => {
      event.preventDefault();
      if (currentEmail) location.href = 'member.html';
      else goAuth('login');
    });
  });

  signupControls.forEach(control => {
    if (currentEmail) {
      control.hidden = true;
      control.setAttribute('aria-hidden', 'true');
      return;
    }
    control.textContent = '註冊';
    if (control.tagName === 'A') control.href = 'login.html#register';
    control.addEventListener('click', event => {
      event.preventDefault();
      goAuth('register');
    });
  });
})();