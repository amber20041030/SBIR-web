(() => {
  'use strict';

  const USERS_KEY = 'sbir_demo_users_v3';
  const SESSION_KEY = 'sbir_current_user';
  const RETURN_KEY = 'sbir_auth_return_to';
  const RESET_KEY = 'sbir_demo_reset_v4';
  const DEMO_CODE = '123456';
  const DEFAULT_USER = { name: '會員', email: 'demo@example.com', phone: '0912345678', password: '12345678', verified: true, welcomed: true, avatar: '', phoneVerified: true };
  if (!localStorage.getItem(RESET_KEY)) {
    ['sbir_demo_users', 'sbir_demo_users_v2', USERS_KEY].forEach(key => localStorage.removeItem(key));
    localStorage.removeItem(SESSION_KEY);
    localStorage.setItem(USERS_KEY, JSON.stringify([DEFAULT_USER]));
    localStorage.setItem(RESET_KEY, '1');
  }
  const $ = (selector, root = document) => root.querySelector(selector);
  const $$ = (selector, root = document) => [...root.querySelectorAll(selector)];
  const emailValid = value => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(value.trim());
  const normalizeEmail = value => value.trim().toLowerCase();
  const phoneValid = value => /^09\d{8}$/.test(value.trim());
  const passwordValid = value => value.length >= 8 && /[A-Za-z]/.test(value) && /\d/.test(value);

  function parseBirthday(value) {
    const digits = value.replace(/\D/g, '');
    if (!digits) return '';
    if (digits.length !== 8) return null;

    const year = Number(digits.slice(0, 4));
    const month = Number(digits.slice(4, 6));
    const day = Number(digits.slice(6, 8));
    const date = new Date(Date.UTC(year, month - 1, day));
    const isRealDate = year >= 1900
      && date.getUTCFullYear() === year
      && date.getUTCMonth() === month - 1
      && date.getUTCDate() === day;
    const today = new Date();
    const todayDigits = `${today.getFullYear()}${String(today.getMonth() + 1).padStart(2, '0')}${String(today.getDate()).padStart(2, '0')}`;

    if (!isRealDate || digits > todayDigits) return null;
    return `${digits.slice(0, 4)}-${digits.slice(4, 6)}-${digits.slice(6, 8)}`;
  }

  function getUsers() {
    try {
      const users = JSON.parse(localStorage.getItem(USERS_KEY) || '[]');
      return Array.isArray(users) ? users : [];
    } catch (_) {
      return [];
    }
  }

  const sessionEmail = localStorage.getItem(SESSION_KEY);
  let users = getUsers();
  let userIndex = users.findIndex(user => user.email?.toLowerCase() === sessionEmail?.toLowerCase());
  if (!sessionEmail || userIndex < 0) {
    sessionStorage.setItem(RETURN_KEY, 'member.html');
    location.replace('login.html#login');
    return;
  }

  let currentUser = users[userIndex];
  let draftAvatar = currentUser.avatar || '';
  let verifiedEmailDraft = currentUser.email;
  let verifiedPhoneDraft = currentUser.phone || '';
  let draftBindings = { apple: false, google: false, facebook: false, ...(currentUser.bindings || {}) };
  let emailCodeSentFor = '';
  let emailCountdown = null;
  let phoneCodeSentFor = '';
  let phoneCountdown = null;
  let couponFilter = 'available';
  let giftFilter = 'available';
  let orderFilter = 'experience';
  let pendingCouponId = '';
  let pendingCouponOnline = false;
  let pendingGiftId = '';

  function saveCurrentUser(patch) {
    currentUser = { ...currentUser, ...patch };
    users[userIndex] = currentUser;
    localStorage.setItem(USERS_KEY, JSON.stringify(users));
    return currentUser;
  }

  function toast(message) {
    if (message !== '儲存成功') return;
    const item = document.createElement('div');
    item.className = 'toast success';
    item.innerHTML = '<i class="fa-solid fa-circle-check"></i><span></span>';
    $('span', item).textContent = message;
    $('#toastRegion').replaceChildren(item);
    setTimeout(() => item.classList.add('is-leaving'), 2000);
    setTimeout(() => item.remove(), 2350);
  }

  function setFieldMessage(inputSelector, messageSelector, message = '') {
    const input = $(inputSelector);
    const output = $(messageSelector);
    input?.classList.toggle('has-error', Boolean(message));
    input?.setAttribute('aria-invalid', String(Boolean(message)));
    if (!output) return;
    output.textContent = message;
    output.className = `field-message${message ? ' error' : ''}`;
  }

  function clearValidationState(rootSelector) {
    const root = $(rootSelector);
    if (!root) return;
    $$('.has-error, [aria-invalid="true"]', root).forEach(input => {
      input.classList.remove('has-error');
      input.setAttribute('aria-invalid', 'false');
    });
    $$('.field-message.error, .form-error', root).forEach(message => {
      message.textContent = '';
      message.classList.remove('error');
    });
  }

  function setAvatar(image, fallback, avatar) {
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

  function couponUsageGuide(coupon) {
    if (coupon?.id === 'goods-member-90off') return { online: true, description: '此優惠券僅限在地好物線上購物使用。請前往商品頁選購，於線上結帳選擇此券；完成訂單後會自動移至已使用。' };
    if (coupon?.id === 'lalashan-peach-85off') return { online: false, description: '此優惠券適用指定水蜜桃商品，可於在地好物線上結帳使用，也可於合作店家現場出示；完成線上結帳後會自動移至已使用。' };
    return { online: false, description: coupon?.description || '請向合作店家出示此優惠券，確認使用後將移至已使用。' };
  }
  function renderRewardList(rootSelector, rewards, type) {
    const root = $(rootSelector);
    root.replaceChildren();
    if (!rewards.length) {
      const empty = document.createElement('div');
      const isGift = type === 'gift';
      const isUsedCoupons = type === 'coupon' && couponFilter === 'used';
      const isClaimedGifts = type === 'gift' && giftFilter === 'claimed';
      empty.className = 'empty-state';
      empty.innerHTML = `<i class="fa-solid ${isGift ? 'fa-gift' : 'fa-ticket'}"></i><h2>${isClaimedGifts ? '目前沒有已領取禮物' : isUsedCoupons ? '目前沒有已使用優惠券' : `目前沒有${isGift ? '未領取禮物' : '未使用優惠券'}`}</h2><p>${isGift ? isClaimedGifts ? '領取過的禮物會保留在這裡供你查看。' : '完成數位集章任務後，獲得的旅遊好禮會顯示在這裡。' : isUsedCoupons ? '使用過的優惠券會保留在這裡供你查看。' : '完成定位打卡後，獲得的電子折價券會顯示在這裡。'}</p>${(!isClaimedGifts && !isUsedCoupons) ? `<a class="primary-action link-action" href="${isGift ? '數位集章趣.html' : '定位打卡領好康.html'}">${isGift ? '前往數位集章' : '前往定位打卡'}</a>` : ''}`;
      root.append(empty);
      return;
    }

    [...rewards].reverse().forEach(reward => {
      const card = document.createElement('article');
      const isUsed = (type === 'coupon' && reward.status === 'used') || (type === 'gift' && reward.status === 'claimed');
      card.className = `reward-card ${type}${isUsed ? ' is-used' : ''}`;
      const icon = document.createElement('div');
      icon.className = 'reward-card-icon';
      icon.innerHTML = `<i class="fa-solid ${type === 'gift' ? 'fa-gift' : 'fa-ticket'}" aria-hidden="true"></i>`;
      const content = document.createElement('div');
      content.className = 'reward-card-content';
      const title = document.createElement('h2');
      const source = document.createElement('p');
      const description = document.createElement('span');
      const date = document.createElement('small');
      title.textContent = reward.title || (type === 'gift' ? '會員禮物' : '會員優惠券');
      source.textContent = type === 'gift' ? reward.source || '活動獎勵' : reward.merchant || '合作店家';
      description.textContent = type === 'coupon' ? couponUsageGuide(reward).description : (reward.description || '');
      const receivedDate = new Date(reward.receivedAt);
      date.textContent = Number.isNaN(receivedDate.getTime()) ? '' : `取得時間：${new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(receivedDate)}`;
      const completedAt = type === 'gift' ? reward.claimedAt : reward.usedAt;
      if (isUsed && completedAt) {
        const completedDate = new Date(completedAt);
        const completedLabel = type === 'gift' ? '領取時間' : '使用時間';
        if (!Number.isNaN(completedDate.getTime())) date.textContent += `　${completedLabel}：${new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(completedDate)}`;
      }
      content.append(title, source, description, date);
      const value = document.createElement('div');
      value.className = 'reward-card-value';
      const action = document.createElement('button');
      action.type = 'button';
      action.className = isUsed ? 'coupon-used-button' : 'coupon-use-button';
      action.textContent = isUsed ? (type === 'gift' ? '已領取' : '已使用') : (type === 'gift' ? '可領取' : '可使用');
      action.disabled = isUsed;
      if (!isUsed) {
        if (type === 'gift') action.dataset.giftUse = reward.id;
        else action.dataset.couponUse = reward.id;
      }
      value.append(action);
      card.append(icon, content, value);
      root.append(card);
    });
  }
  function renderRewards() {
    const gifts = Array.isArray(currentUser.gifts) ? currentUser.gifts : [];
    const coupons = Array.isArray(currentUser.coupons) ? currentUser.coupons : [];
    const availableGifts = gifts.filter(gift => gift.status !== 'claimed');
    const claimedGifts = gifts.filter(gift => gift.status === 'claimed');
    const availableCoupons = coupons.filter(coupon => coupon.status !== 'used');
    const usedCoupons = coupons.filter(coupon => coupon.status === 'used');
    $('#availableGiftCount').textContent = availableGifts.length;
    $('#claimedGiftCount').textContent = claimedGifts.length;
    $('#availableCouponCount').textContent = availableCoupons.length;
    $('#usedCouponCount').textContent = usedCoupons.length;
    $$('[data-coupon-filter]').forEach(button => {
      const active = button.dataset.couponFilter === couponFilter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    $$('[data-gift-filter]').forEach(button => {
      const active = button.dataset.giftFilter === giftFilter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    renderRewardList('#giftList', giftFilter === 'claimed' ? claimedGifts : availableGifts, 'gift');
    renderRewardList('#couponList', couponFilter === 'used' ? usedCoupons : availableCoupons, 'coupon');
  }

  function renderOrders() {
    const root = $('#memberOrderList');
    if (!root) return;
    let experienceOrders = [], goodsOrders = [];
    try { experienceOrders = JSON.parse(localStorage.getItem('experienceOrders') || '[]').map(order => ({ ...order, orderType: 'experience' })); } catch (_) { experienceOrders = []; }
    try { goodsOrders = JSON.parse(localStorage.getItem('goodsOrders') || '[]').map(order => ({ ...order, orderType: 'goods' })); } catch (_) { goodsOrders = []; }
    const owns = order => order.userEmail?.toLowerCase() === currentUser.email?.toLowerCase();
    experienceOrders = experienceOrders.filter(owns);
    goodsOrders = goodsOrders.filter(owns);
    $('#experienceOrderCount').textContent = experienceOrders.length;
    $('#goodsOrderCount').textContent = goodsOrders.length;
    $$('[data-order-filter]').forEach(button => {
      const active = button.dataset.orderFilter === orderFilter;
      button.classList.toggle('is-active', active);
      button.setAttribute('aria-selected', String(active));
    });
    const orders = orderFilter === 'goods' ? goodsOrders : experienceOrders;
    if (!orders.length) {
      const goods = orderFilter === 'goods';
      root.innerHTML = `<div class="empty-state order-empty"><i class="fa-solid ${goods ? 'fa-bag-shopping' : 'fa-calendar-check'}"></i><h2>目前沒有${goods ? '在地好物' : '體驗課程'}訂單</h2><p>完成${goods ? '商品結帳' : '體驗報名'}後，訂單會顯示在這裡。</p><a class="primary-action link-action" href="${goods ? '在地好物直送.html' : '體驗活動線上報名.html'}">${goods ? '前往選購' : '探索體驗活動'}</a></div>`;
      return;
    }
    root.innerHTML = [...orders].sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt)).map(order => {
      const created = new Date(order.createdAt);
      const date = Number.isNaN(created.getTime()) ? '' : new Intl.DateTimeFormat('zh-TW', { dateStyle: 'medium', timeStyle: 'short' }).format(created);
      const goods = order.orderType === 'goods';
      const count = (order.items || []).length;
      const units = (order.items || []).reduce((sum, item) => sum + Number(goods ? item.quantity : item.guests || 0), 0);
      const first = order.items?.[0] || {};
      const preview = first.image || first.img || '../imgs/水蜜桃.png';
      const summary = count ? `${first.title || first.name || '訂單品項'}${count > 1 ? ` 等 ${count} 項` : ''}` : '訂單內容';
      const method = goods ? (order.delivery?.method === 'store' ? `${order.delivery.storeChain || '超商'}取貨` : '宅配到府') : `${units} 人參加`;
      return `<article class="member-order-card is-collapsed"><header><div><small>${order.id}</small><h2>${goods ? '在地好物' : '體驗課程'}</h2><span>${date}</span></div><b>${order.status || '已付款'}</b></header><div class="member-order-compact"><img class="member-order-preview" src="${preview}" alt="${summary}" onerror="this.onerror=null;this.src='../imgs/水蜜桃.png'"><div><span>訂單內容</span><strong>${summary}</strong></div><div><span>${goods ? '配送方式' : '參加人數'}</span><strong>${method}</strong></div><div><span>訂單總額</span><strong>NT$ ${Number(order.total || 0).toLocaleString()}</strong></div></div><footer><a class="member-order-detail" href="訂單詳情.html?id=${encodeURIComponent(order.id)}&type=${goods ? 'goods' : 'experience'}">查看詳細訂單</a></footer></article>`;
    }).join('');
  }
  function renderUser() {
    $('#sidebarName').textContent = currentUser.nickname || currentUser.name || '會員';
    $('#sidebarEmail').textContent = currentUser.email;
    $('#profileName').value = currentUser.nickname || currentUser.name || '';
    $('#profileEmail').value = currentUser.email;
    $('#profilePhone').value = currentUser.phone || '';
    const birthdayLocked = Boolean(currentUser.birthday);
    $('#profileBirthday').value = currentUser.birthday ? currentUser.birthday.replace(/\D/g, '').slice(0, 8) : '';
    $('#profileBirthday').disabled = birthdayLocked;
    $('#birthdayStatus').textContent = birthdayLocked ? '不可修改' : '設定後不可修改';
    $('#profileGender').value = currentUser.gender || '';
    updateGenderDropdown($('#profileGender').value);
    $('#securityEmail').textContent = currentUser.email;
    $('#securityPhone').textContent = currentUser.phone || '尚未設定';
    $('#securityPhoneStatus').textContent = currentUser.phoneVerified || currentUser.phone ? '已驗證' : '未驗證';
    draftAvatar = currentUser.avatar || '';
    verifiedEmailDraft = currentUser.email;
    verifiedPhoneDraft = currentUser.phone || '';
    draftBindings = { apple: false, google: false, facebook: false, ...(currentUser.bindings || {}) };
    setAvatar($('#sidebarAvatar'), $('#sidebarAvatarFallback'), currentUser.avatar || '');
    setAvatar($('#profileAvatar'), $('#profileAvatarFallback'), draftAvatar);
    renderBindings();
    resetEmailEditor();
    resetPhoneEditor();
    renderAddresses();
    renderOrders();
    renderRewards();
    renderNotifications();
  }

  function showSection(name, updateHash = true) {
    const target = $(`[data-panel="${name}"]`) || $('[data-panel="profile"]');
    $$('.content-section').forEach(panel => {
      const active = panel === target;
      panel.hidden = !active;
      panel.classList.toggle('is-active', active);
    });
    $$('#memberNav [data-section]').forEach(button => button.classList.toggle('is-active', button.dataset.section === target.dataset.panel));
    if (updateHash) history.replaceState(null, '', `#${target.dataset.panel}`);
    document.title = `${$('h1', target).textContent}｜會員中心｜桃園偏鄉輕旅行`;
  }

  $('#memberNav').addEventListener('click', event => {
    const button = event.target.closest('[data-section]');
    if (button) showSection(button.dataset.section);
  });

  const genderLabels = { '': '不透露', female: '女性', male: '男性', nonbinary: '非二元／其他' };

  function closeGenderDropdown() {
    $('#genderSelectMenu').hidden = true;
    $('#genderSelectTrigger').setAttribute('aria-expanded', 'false');
  }

  function updateGenderDropdown(value) {
    $('#genderSelected').textContent = genderLabels[value] || genderLabels[''];
    $$('[data-gender-option]').forEach(option => option.setAttribute('aria-selected', String(option.dataset.genderOption === value)));
  }

  $('#genderSelectTrigger').addEventListener('click', event => {
    event.stopPropagation();
    const menu = $('#genderSelectMenu');
    const opening = menu.hidden;
    menu.hidden = !opening;
    event.currentTarget.setAttribute('aria-expanded', String(opening));
    if (opening) {
      const selected = $$('[data-gender-option]').find(option => option.dataset.genderOption === $('#profileGender').value);
      selected?.focus();
    }
  });

  $('#genderSelectMenu').addEventListener('click', event => {
    const option = event.target.closest('[data-gender-option]');
    if (!option) return;
    $('#profileGender').value = option.dataset.genderOption;
    updateGenderDropdown(option.dataset.genderOption);
    closeGenderDropdown();
    $('#genderSelectTrigger').focus();
  });

  document.addEventListener('click', event => {
    if (!$('#genderDropdown').contains(event.target)) closeGenderDropdown();
  });
  document.addEventListener('keydown', event => {
    if (event.key === 'Escape') closeGenderDropdown();
  });

  $('#profileBirthday').addEventListener('input', event => {
    event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 8);
  });

  $('#profileName').addEventListener('input', () => {
    $('#profileName').classList.remove('has-error');
    $('#profileNameError').textContent = '';
  });

  function renderBindings() {
    $$('[data-binding]').forEach(button => {
      const provider = button.dataset.binding;
      const bound = Boolean(draftBindings[provider]);
      button.textContent = bound ? '解除綁定' : '綁定';
      const status = $(`[data-binding-status="${provider}"]`);
      status.textContent = bound ? '已綁定' : '未綁定';
      status.classList.toggle('is-bound', bound);
    });
  }

  $$('[data-binding]').forEach(button => button.addEventListener('click', () => {
    const provider = button.dataset.binding;
    draftBindings = { ...draftBindings, [provider]: !draftBindings[provider] };
    renderBindings();
  }));

  function createAvatarData(file) {
    return new Promise((resolve, reject) => {
      const objectUrl = URL.createObjectURL(file);
      const image = new Image();
      image.onload = () => {
        const size = Math.min(image.naturalWidth, image.naturalHeight);
        const canvas = document.createElement('canvas');
        canvas.width = canvas.height = 360;
        const context = canvas.getContext('2d');
        const sx = (image.naturalWidth - size) / 2;
        const sy = (image.naturalHeight - size) / 2;
        context.drawImage(image, sx, sy, size, size, 0, 0, 360, 360);
        URL.revokeObjectURL(objectUrl);
        resolve(canvas.toDataURL('image/jpeg', .82));
      };
      image.onerror = () => { URL.revokeObjectURL(objectUrl); reject(new Error('invalid-image')); };
      image.src = objectUrl;
    });
  }

  $('#profileAvatarUpload').addEventListener('change', async event => {
    const input = event.currentTarget;
    const file = input.files?.[0];
    if (!file) return;
    if (!['image/jpeg', 'image/png', 'image/webp'].includes(file.type) || file.size > 8 * 1024 * 1024) {
      setFieldMessage('#profileAvatarUpload', '#avatarMessage', '請選擇 8MB 以內的 JPG、PNG 或 WebP 圖片');
      input.value = '';
      return;
    }
    try {
      draftAvatar = await createAvatarData(file);
      setAvatar($('#profileAvatar'), $('#profileAvatarFallback'), draftAvatar);
      setFieldMessage('#profileAvatarUpload', '#avatarMessage');
    } catch (_) {
      setFieldMessage('#profileAvatarUpload', '#avatarMessage', '大頭照處理失敗，請更換圖片');
    } finally { input.value = ''; }
  });

  function resetEmailEditor() {
    clearInterval(emailCountdown);
    emailCountdown = null;
    emailCodeSentFor = '';
    $('#profileEmailCode').value = '';
    $('#emailVerifyArea').hidden = true;
    $('#sendEmailCodeBtn').textContent = '發送驗證碼';
    updateEmailEditor();
  }

  function updateEmailEditor() {
    const input = $('#profileEmail');
    const value = normalizeEmail(input.value);
    const unchanged = value === currentUser.email.toLowerCase();
    const staged = !unchanged && value === verifiedEmailDraft;
    const valid = emailValid(value);
    const used = users.some((user, index) => index !== userIndex && user.email?.toLowerCase() === value);
    input.classList.toggle('has-error', Boolean(value) && (!valid || used));
    $('#sendEmailCodeBtn').disabled = unchanged || staged || !valid || used || Boolean(emailCountdown);
    const message = $('#emailMessage');
    message.textContent = used ? '此 Email 已被其他帳號使用' : value && !valid ? '請輸入有效的電子郵件地址' : '';
    message.className = `field-message${message.textContent ? ' error' : ''}`;
    $('#emailStatus').textContent = unchanged ? '已驗證' : staged ? '已驗證・待儲存' : '待驗證';
    $('#emailStatus').classList.toggle('pending', !unchanged && !staged);
  }

  $('#profileEmail').addEventListener('input', event => {
    const value = normalizeEmail(event.currentTarget.value);
    if (value !== verifiedEmailDraft && verifiedEmailDraft !== currentUser.email) verifiedEmailDraft = currentUser.email;
    if (emailCodeSentFor && emailCodeSentFor !== value) {
      clearInterval(emailCountdown); emailCountdown = null; emailCodeSentFor = '';
      $('#emailVerifyArea').hidden = true;
      $('#sendEmailCodeBtn').textContent = '發送驗證碼';
    }
    updateEmailEditor();
  });

  $('#sendEmailCodeBtn').addEventListener('click', () => {
    const email = normalizeEmail($('#profileEmail').value);
    if (!emailValid(email) || users.some((user, index) => index !== userIndex && user.email?.toLowerCase() === email)) return;
    emailCodeSentFor = email;
    $('#emailVerifyArea').hidden = false;
    $('#profileEmailCode').focus();
    $('#emailCodeMessage').textContent = `驗證碼為 ${DEMO_CODE}`;
    $('#emailCodeMessage').className = 'field-message';
    let seconds = 10;
    const button = $('#sendEmailCodeBtn');
    button.disabled = true;
    button.textContent = `${seconds} 秒後可重送`;
    emailCountdown = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) { clearInterval(emailCountdown); emailCountdown = null; button.textContent = '重新發送驗證碼'; updateEmailEditor(); }
      else button.textContent = `${seconds} 秒後可重送`;
    }, 1000);
  });

  $('#profileEmailCode').addEventListener('input', event => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 6); });
  $('#verifyEmailBtn').addEventListener('click', () => {
    const email = normalizeEmail($('#profileEmail').value);
    if (email !== emailCodeSentFor) return setFieldMessage('#profileEmailCode', '#emailCodeMessage', 'Email 已變更，請重新發送驗證碼');
    if ($('#profileEmailCode').value !== DEMO_CODE) return setFieldMessage('#profileEmailCode', '#emailCodeMessage', '驗證碼不正確');
    verifiedEmailDraft = email;
    resetEmailEditor();
  });

  function resetPhoneEditor() {
    clearInterval(phoneCountdown);
    phoneCountdown = null;
    phoneCodeSentFor = '';
    $('#profilePhoneCode').value = '';
    $('#phoneVerifyArea').hidden = true;
    $('#sendPhoneCodeBtn').textContent = '發送驗證碼';
    updatePhoneEditor();
  }

  function updatePhoneEditor() {
    const input = $('#profilePhone');
    const value = input.value.trim();
    const unchanged = value === (currentUser.phone || '');
    const staged = !unchanged && value === verifiedPhoneDraft;
    const valid = phoneValid(value);
    const used = users.some((user, index) => index !== userIndex && user.phone === value);
    input.classList.toggle('has-error', Boolean(value) && (!valid || used));
    $('#sendPhoneCodeBtn').disabled = unchanged || staged || !valid || used || Boolean(phoneCountdown);
    const message = $('#phoneMessage');
    message.textContent = used ? '此手機號碼已被其他帳號使用' : value && !valid ? '請輸入有效的台灣手機號碼' : '';
    message.className = `field-message${message.textContent ? ' error' : ''}`;
    $('#phoneStatus').textContent = unchanged ? '已驗證' : staged ? '已驗證・待儲存' : '待驗證';
    $('#phoneStatus').classList.toggle('pending', !unchanged && !staged);
  }

  $('#profilePhone').addEventListener('input', event => {
    event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 10);
    const value = event.currentTarget.value;
    if (value !== verifiedPhoneDraft && verifiedPhoneDraft !== (currentUser.phone || '')) verifiedPhoneDraft = currentUser.phone || '';
    if (phoneCodeSentFor && phoneCodeSentFor !== value) {
      clearInterval(phoneCountdown); phoneCountdown = null; phoneCodeSentFor = '';
      $('#phoneVerifyArea').hidden = true;
      $('#sendPhoneCodeBtn').textContent = '發送驗證碼';
    }
    updatePhoneEditor();
  });

  $('#sendPhoneCodeBtn').addEventListener('click', () => {
    const phone = $('#profilePhone').value.trim();
    if (!phoneValid(phone) || users.some((user, index) => index !== userIndex && user.phone === phone)) return;
    phoneCodeSentFor = phone;
    $('#phoneVerifyArea').hidden = false;
    $('#profilePhoneCode').focus();
    $('#phoneCodeMessage').textContent = `驗證碼為 ${DEMO_CODE}`;
    $('#phoneCodeMessage').className = 'field-message';
    let seconds = 10;
    const button = $('#sendPhoneCodeBtn');
    button.disabled = true;
    button.textContent = `${seconds} 秒後可重送`;
    phoneCountdown = setInterval(() => {
      seconds -= 1;
      if (seconds <= 0) { clearInterval(phoneCountdown); phoneCountdown = null; button.textContent = '重新發送驗證碼'; updatePhoneEditor(); }
      else button.textContent = `${seconds} 秒後可重送`;
    }, 1000);
  });

  $('#profilePhoneCode').addEventListener('input', event => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 6); });
  $('#verifyPhoneBtn').addEventListener('click', () => {
    const phone = $('#profilePhone').value.trim();
    if (phone !== phoneCodeSentFor) return setFieldMessage('#profilePhoneCode', '#phoneCodeMessage', '手機號碼已變更，請重新發送驗證碼');
    if ($('#profilePhoneCode').value !== DEMO_CODE) return setFieldMessage('#profilePhoneCode', '#phoneCodeMessage', '驗證碼不正確');
    verifiedPhoneDraft = phone;
    resetPhoneEditor();
  });

  $('#savePersonalDataBtn').addEventListener('click', () => {
    const name = $('#profileName').value.trim();
    const email = normalizeEmail($('#profileEmail').value);
    const phone = $('#profilePhone').value.trim();
    const birthdayInput = $('#profileBirthday').value;
    const birthday = currentUser.birthday || parseBirthday(birthdayInput);
    if (!currentUser.birthday && birthdayInput && birthday === null) {
      setFieldMessage('#profileBirthday', '#birthdayMessage', '請輸入有效的生日，格式為 YYYYMMDD');
      return;
    }
    if (!name) {
      $('#profileName').classList.add('has-error');
      $('#profileNameError').textContent = '請輸入姓名／暱稱';
      $('#profileNameError').className = 'field-message error';
      return;
    }
    if (!emailValid(email) || users.some((user, index) => index !== userIndex && user.email?.toLowerCase() === email)) return setFieldMessage('#profileEmail', '#emailMessage', '請確認 Email 格式與使用狀態');
    if (email !== currentUser.email.toLowerCase() && email !== verifiedEmailDraft) return setFieldMessage('#profileEmail', '#emailMessage', '請先完成 Email 驗證');
    if (!phoneValid(phone) || users.some((user, index) => index !== userIndex && user.phone === phone)) return setFieldMessage('#profilePhone', '#phoneMessage', '請確認手機號碼格式與使用狀態');
    if (phone !== (currentUser.phone || '') && phone !== verifiedPhoneDraft) return setFieldMessage('#profilePhone', '#phoneMessage', '請先完成手機號碼驗證');
    saveCurrentUser({ name, nickname: name, email, phone, verified: true, phoneVerified: true, birthday, gender: $('#profileGender').value, avatar: draftAvatar, bindings: { ...draftBindings } });
    localStorage.setItem(SESSION_KEY, email);
    $('#securityEmail').textContent = email;
    $('#securityPhone').textContent = phone;
    $('#securityPhoneStatus').textContent = '已驗證';
    renderUser();
    clearValidationState('.unified-profile-card');
    toast('儲存成功');
  });
  function renderAddresses() {
    const root = $('#addressList');
    const addresses = Array.isArray(currentUser.addresses) ? currentUser.addresses : [];
    root.replaceChildren();
    if (!addresses.length) {
      const empty = document.createElement('div');
      empty.className = 'empty-state address-empty';
      empty.innerHTML = '<i class="fa-solid fa-location-dot"></i><h2>尚未新增收貨地址</h2><p>新增常用地址，結帳時就能快速選取。</p>';
      root.append(empty);
      return;
    }
    addresses.forEach((address, index) => {
      const item = document.createElement('article');
      item.className = 'address-item';
      const content = document.createElement('div');
      const title = document.createElement('strong');
      const detail = document.createElement('p');
      title.textContent = `${address.recipient}　${address.phone}`;
      detail.textContent = address.address;
      content.append(title, detail);
      const remove = document.createElement('button');
      remove.type = 'button';
      remove.textContent = '刪除';
      remove.addEventListener('click', () => {
        const next = [...addresses];
        next.splice(index, 1);
        saveCurrentUser({ addresses: next });
        renderAddresses();
      });
      item.append(content, remove);
      root.append(item);
    });
  }

  $('#toggleAddressFormBtn').addEventListener('click', () => { $('#addressForm').hidden = false; $('#addressRecipient').focus(); });
  $('#cancelAddressBtn').addEventListener('click', () => { $('#addressForm').reset(); $('#addressForm').hidden = true; });
  $('#addressPhone').addEventListener('input', event => { event.currentTarget.value = event.currentTarget.value.replace(/\D/g, '').slice(0, 10); });
  $('#addressForm').addEventListener('submit', event => {
    event.preventDefault();
    const recipient = $('#addressRecipient').value.trim();
    const phone = $('#addressPhone').value.trim();
    const address = $('#addressText').value.trim();
    setFieldMessage('#addressRecipient', '#addressRecipientError', recipient ? '' : '請輸入收件人');
    setFieldMessage('#addressPhone', '#addressPhoneError', phoneValid(phone) ? '' : '請輸入有效的台灣手機號碼');
    setFieldMessage('#addressText', '#addressTextError', address ? '' : '請輸入收貨地址');
    if (!recipient || !phoneValid(phone) || !address) return;
    const addresses = [...(Array.isArray(currentUser.addresses) ? currentUser.addresses : []), { recipient, phone, address }];
    saveCurrentUser({ addresses });
    event.currentTarget.reset();
    event.currentTarget.hidden = true;
    renderAddresses();
  });

  $('#passwordForm').addEventListener('submit', event => {
    event.preventDefault();
    const current = $('#currentPassword').value;
    const next = $('#newPassword').value;
    const confirm = $('#newPasswordConfirm').value;
    setFieldMessage('#currentPassword', '#currentPasswordError', current !== currentUser.password ? '目前密碼不正確' : '');
    setFieldMessage('#newPassword', '#newPasswordError', !passwordValid(next) ? '新密碼至少 8 個字元，並包含英文字母與數字' : next === current ? '新密碼不可與目前密碼相同' : '');
    setFieldMessage('#newPasswordConfirm', '#newPasswordConfirmError', next !== confirm ? '兩次輸入的新密碼不一致' : '');
    if (current !== currentUser.password || !passwordValid(next) || next !== confirm || next === current) return;
    saveCurrentUser({ password: next });
    event.currentTarget.reset();
    $('#passwordError').textContent = '';
  });

  function renderNotifications() {
    const settings = { activities: true, orders: true, promotions: false, newsletter: false, ...(currentUser.notifications || {}) };
    $$('[data-notification]').forEach(input => { input.checked = Boolean(settings[input.dataset.notification]); });
  }


  $('#orderTabs').addEventListener('click', event => {
    const button = event.target.closest('[data-order-filter]');
    if (!button) return;
    orderFilter = button.dataset.orderFilter;
    renderOrders();
  });
  $('#giftTabs').addEventListener('click', event => {
    const button = event.target.closest('[data-gift-filter]');
    if (!button) return;
    giftFilter = button.dataset.giftFilter;
    renderRewards();
  });

  function closeGiftUseModal() {
    pendingGiftId = '';
    $('#giftUseBackdrop').hidden = true;
    document.body.style.overflow = '';
  }

  $('#giftList').addEventListener('click', event => {
    const button = event.target.closest('[data-gift-use]');
    if (!button) return;
    const gifts = Array.isArray(currentUser.gifts) ? currentUser.gifts : [];
    const gift = gifts.find(item => item.id === button.dataset.giftUse && item.status !== 'claimed');
    if (!gift) return;
    pendingGiftId = gift.id;
    $('#giftUseName').textContent = gift.title || '會員專屬禮物';
    $('#giftUseSource').textContent = gift.source || '活動獎勵';
    $('#giftUseBackdrop').hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => $('#giftUseConfirm').focus());
  });

  $('#giftUseConfirm').addEventListener('click', () => {
    if (!pendingGiftId) return;
    const gifts = (Array.isArray(currentUser.gifts) ? currentUser.gifts : []).map(gift => gift.id === pendingGiftId ? { ...gift, status: 'claimed', claimedAt: new Date().toISOString() } : gift);
    saveCurrentUser({ gifts });
    closeGiftUseModal();
    renderRewards();
  });
  $('#giftUseCancel').addEventListener('click', closeGiftUseModal);
  $('#giftUseClose').addEventListener('click', closeGiftUseModal);
  $('#giftUseBackdrop').addEventListener('click', event => { if (event.target === $('#giftUseBackdrop')) closeGiftUseModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#giftUseBackdrop').hidden) closeGiftUseModal(); });

  $('#couponTabs').addEventListener('click', event => {
    const button = event.target.closest('[data-coupon-filter]');
    if (!button) return;
    couponFilter = button.dataset.couponFilter;
    renderRewards();
  });

  function closeCouponUseModal() {
    pendingCouponId = '';
    pendingCouponOnline = false;
    $('#couponUseBackdrop').hidden = true;
    document.body.style.overflow = '';
  }

  $('#couponList').addEventListener('click', event => {
    const button = event.target.closest('[data-coupon-use]');
    if (!button) return;
    const coupons = Array.isArray(currentUser.coupons) ? currentUser.coupons : [];
    const coupon = coupons.find(item => item.id === button.dataset.couponUse && item.status !== 'used');
    if (!coupon) return;
    pendingCouponId = coupon.id;
    const guide = couponUsageGuide(coupon);
    pendingCouponOnline = guide.online;
    $('#couponUseTitle').textContent = guide.online ? '優惠券使用說明' : '使用優惠券';
    $('#couponUseDescription').textContent = guide.description;
    $('#couponUseName').textContent = coupon.title || '會員優惠券';
    $('#couponUseMerchant').textContent = coupon.merchant || '合作店家';
    $('#couponUseDiscount').textContent = coupon.discount || '優惠券';
    $('#couponUseConfirm').textContent = guide.online ? '前往選購' : '確定使用';
    $('.coupon-use-warning').textContent = guide.online ? '完成線上結帳使用後將無法恢復' : '確定使用後將無法恢復';
    $('#couponUseBackdrop').hidden = false;
    document.body.style.overflow = 'hidden';
    requestAnimationFrame(() => $('#couponUseConfirm').focus());
  });

  $('#couponUseConfirm').addEventListener('click', () => {
    if (!pendingCouponId) return;
    if (pendingCouponOnline) {
      closeCouponUseModal();
      location.href = '在地好物直送.html#productsSection';
      return;
    }
    const coupons = (Array.isArray(currentUser.coupons) ? currentUser.coupons : []).map(coupon => coupon.id === pendingCouponId ? { ...coupon, status: 'used', usedAt: new Date().toISOString() } : coupon);
    saveCurrentUser({ coupons });
    closeCouponUseModal();
    renderRewards();
  });
  $('#couponUseCancel').addEventListener('click', closeCouponUseModal);
  $('#couponUseClose').addEventListener('click', closeCouponUseModal);
  $('#couponUseBackdrop').addEventListener('click', event => { if (event.target === $('#couponUseBackdrop')) closeCouponUseModal(); });
  document.addEventListener('keydown', event => { if (event.key === 'Escape' && !$('#couponUseBackdrop').hidden) closeCouponUseModal(); });

  $('#memberLogoutBtn').addEventListener('click', () => {
    localStorage.removeItem(SESSION_KEY);
    sessionStorage.removeItem(RETURN_KEY);
    location.href = 'index.html';
  });

  $$('[data-notification]').forEach(input => input.addEventListener('change', () => {
    const notifications = {};
    $$('[data-notification]').forEach(item => { notifications[item.dataset.notification] = item.checked; });
    saveCurrentUser({ notifications });
  }));

  renderUser();
  const initialSection = location.hash.slice(1);
  showSection(['profile', 'orders', 'gifts', 'coupons', 'addresses', 'security', 'notifications'].includes(initialSection) ? initialSection : 'profile', false);
})();


