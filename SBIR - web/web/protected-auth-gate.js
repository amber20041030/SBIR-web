(() => {
  const SESSION_KEY = 'sbir_current_user';
  const RETURN_KEY = 'sbir_auth_return_to';
  if (localStorage.getItem(SESSION_KEY)) return;

  const style = document.createElement('style');
  style.textContent = `
    .auth-gate-backdrop{position:fixed;z-index:300;inset:0;padding:20px;display:grid;place-items:center;background:rgba(2,8,5,.66);backdrop-filter:blur(18px) saturate(125%);-webkit-backdrop-filter:blur(18px) saturate(125%);animation:authGateFadeIn .22s ease both}
    .auth-gate-dialog{width:min(440px,100%);padding:34px 30px 30px;border:1px solid rgba(255,255,255,.18);border-radius:30px;background:linear-gradient(145deg,rgba(226,245,235,.14),rgba(7,19,12,.72) 48%),rgba(8,21,13,.82);box-shadow:0 30px 90px rgba(0,0,0,.55),inset 0 1px rgba(255,255,255,.14);color:#fff;text-align:center;backdrop-filter:blur(36px) saturate(155%);-webkit-backdrop-filter:blur(36px) saturate(155%);animation:authGateIn .26s ease both}
    .auth-gate-icon{width:66px;height:66px;margin:0 auto 20px;display:grid;place-items:center;border-radius:50%;background:rgba(184,214,198,.13);color:#d9ebe1;box-shadow:inset 0 1px rgba(255,255,255,.16)}
    .auth-gate-icon svg{width:29px;height:29px;fill:none;stroke:currentColor;stroke-width:1.7;stroke-linecap:round;stroke-linejoin:round}
    .auth-gate-dialog h2{margin:0;font:700 clamp(25px,6vw,31px)/1.25 "Noto Sans TC","Microsoft JhengHei",sans-serif;letter-spacing:-.03em}
    .auth-gate-dialog p{margin:12px auto 25px;max-width:330px;color:rgba(255,255,255,.62);font:500 13px/1.75 "Noto Sans TC","Microsoft JhengHei",sans-serif}
    .auth-gate-actions{display:grid;gap:10px}.auth-gate-actions button{width:100%;min-height:50px;border-radius:15px;font:800 12px "Noto Sans TC","Microsoft JhengHei",sans-serif;cursor:pointer;transition:.2s}
    .auth-gate-login{border:1px solid rgba(255,255,255,.48);background:linear-gradient(110deg,#d9ebe1,#a9cdbb);color:#26382f;box-shadow:inset 0 1px rgba(255,255,255,.8)}.auth-gate-login:hover{background:linear-gradient(110deg,#edf6f1,#b8d6c6);transform:translateY(-1px)}
    .auth-gate-home{border:1px solid rgba(255,255,255,.14);background:rgba(255,255,255,.055);color:rgba(255,255,255,.82)}.auth-gate-home:hover{background:rgba(255,255,255,.1);color:#fff}
    @keyframes authGateFadeIn{from{opacity:0}}@keyframes authGateIn{from{opacity:0;transform:translateY(12px) scale(.98);filter:blur(4px)}}
    @media(max-width:520px){.auth-gate-backdrop{padding:12px}.auth-gate-dialog{padding:28px 18px 20px;border-radius:24px}}
    @media(prefers-reduced-motion:reduce){.auth-gate-backdrop,.auth-gate-dialog{animation-duration:.01ms!important}}
  `;
  document.head.append(style);

  const backdrop = document.createElement('div');
  backdrop.className = 'auth-gate-backdrop';
  backdrop.innerHTML = `
    <section class="auth-gate-dialog" role="dialog" aria-modal="true" aria-labelledby="authGateTitle" aria-describedby="authGateDescription">
      <span class="auth-gate-icon" aria-hidden="true"><svg viewBox="0 0 24 24"><path d="M7 10V7a5 5 0 0 1 10 0v3M5 10h14v11H5zM12 15v2"/></svg></span>
      <h2 id="authGateTitle">請先登入</h2>
      <p id="authGateDescription">登入會員帳號後，即可使用此功能並保存你的活動紀錄。</p>
      <div class="auth-gate-actions"><button class="auth-gate-login" type="button">立即登入</button><button class="auth-gate-home" type="button">返回首頁</button></div>
    </section>`;
  document.body.append(backdrop);
  document.body.style.overflow = 'hidden';

  const loginButton = backdrop.querySelector('.auth-gate-login');
  loginButton.addEventListener('click', () => {
    const currentPage = `${location.pathname.split('/').pop() || 'index.html'}${location.search}${location.hash}`;
    sessionStorage.setItem(RETURN_KEY, currentPage);
    location.href = 'login.html#login';
  });
  backdrop.querySelector('.auth-gate-home').addEventListener('click', () => { location.href = 'index.html'; });
  requestAnimationFrame(() => loginButton.focus());
})();