document.addEventListener('DOMContentLoaded', () => {
  const newsChips = document.querySelectorAll('.category-chips .chip');
  const grid = document.getElementById('newsGrid');
  let newsCards = Array.from(document.querySelectorAll('.news-card'));
  
  const btnLoadMore = document.getElementById('btnLoadMore');
  const totalCountSpan = document.getElementById('totalCount');
  const sortSelect = document.getElementById('sortSelect');
  const searchInput = document.getElementById('newsSearch');
  const noResultMessage = document.getElementById('noResultMessage');
  const btnAdvanced = document.getElementById('btnAdvanced');
  const advancedPanel = document.getElementById('advancedPanel');
  const advancedClose = document.getElementById('advancedClose');
  const advancedClear = document.getElementById('advancedClear');
  const advancedSubmit = document.getElementById('advancedSubmit');
  const advancedCount = document.getElementById('advancedCount');
  const advancedOptions = document.querySelectorAll('.advanced-option');
  const backToTop = document.getElementById('backToTop');

  let currentCategory = 'all';
  let visibleCount = 6; // 初始顯示數量
  const step = 6;       // 每次點擊載入增加數量

  function renderCards() {
    // 1. 取得搜尋關鍵字
    const keyword = searchInput.value.trim().toLowerCase();

    // 2. 進行篩選 (分類 + 關鍵字)
    let filteredCards = newsCards.filter(card => {
      const matchCat = currentCategory === 'all' || card.dataset.category === currentCategory;
      // 搜尋範圍：標題與內文
      const matchText = card.innerText.toLowerCase().includes(keyword);
      return matchCat && matchText;
    });

    // 3. 進行排序 (依據 data-date)
    const sortVal = sortSelect.value;
    filteredCards.sort((a, b) => {
      const timeA = new Date(a.dataset.date).getTime();
      const timeB = new Date(b.dataset.date).getTime();
      // newest: 由大到小 (B - A), oldest: 由小到大 (A - B)
      return sortVal === 'newest' ? timeB - timeA : timeA - timeB;
    });

    // 4. 更新總筆數 UI
    totalCountSpan.textContent = filteredCards.length;
    advancedCount.textContent = filteredCards.length;

    // 5. 重新將排序後的 DOM 附加回 Grid，確保 CSS Grid 順序正確
    grid.innerHTML = '';
    filteredCards.forEach(card => grid.appendChild(card));

    // 6. 先將所有卡片設為隱藏狀態
    newsCards.forEach(card => {
      card.style.display = 'none';
      card.style.opacity = '0';
      card.style.transform = 'translateY(15px)';
    });

    // 7. 判斷是否有結果
    if (filteredCards.length === 0) {
      noResultMessage.style.display = 'block';
    } else {
      noResultMessage.style.display = 'none';
    }

    // 8. 顯示範圍內的卡片 (加入交錯動畫)
    const cardsToShow = filteredCards.slice(0, visibleCount);
    cardsToShow.forEach((card, index) => {
      card.style.display = 'flex';
      setTimeout(() => {
        card.style.opacity = '1';
        card.style.transform = 'translateY(0)';
      }, 50 + (index % step) * 40); 
    });

    // 9. 更新「載入更多」按鈕顯示狀態
    if (btnLoadMore) {
      btnLoadMore.style.display = visibleCount >= filteredCards.length ? 'none' : 'inline-block';
    }
  }

  // 事件綁定：分類 Chips
  newsChips.forEach(chip => {
    chip.addEventListener('click', () => {
      newsChips.forEach(c => {
        c.classList.remove('active');
        c.setAttribute('aria-selected', 'false');
      });
      chip.classList.add('active');
      chip.setAttribute('aria-selected', 'true');
      
      currentCategory = chip.dataset.cat;
      advancedOptions.forEach(option => option.classList.toggle('active', option.dataset.cat === currentCategory));
      visibleCount = step; // 切換分類時重置可見數量
      renderCards();
    });
  });

  function setAdvancedPanel(open) {
    document.querySelector('.advanced-search-shell').classList.toggle('is-open', open);
    advancedPanel.classList.toggle('open', open);
    advancedPanel.setAttribute('aria-hidden', String(!open));
    btnAdvanced.setAttribute('aria-expanded', String(open));
  }

  btnAdvanced.addEventListener('click', () => setAdvancedPanel(!advancedPanel.classList.contains('open')));
  advancedClose.addEventListener('click', () => setAdvancedPanel(false));
  advancedSubmit.addEventListener('click', () => setAdvancedPanel(false));

  advancedOptions.forEach(option => {
    option.addEventListener('click', () => {
      currentCategory = option.dataset.cat;
      visibleCount = step;
      advancedOptions.forEach(item => item.classList.toggle('active', item === option));
      newsChips.forEach(chip => {
        const selected = chip.dataset.cat === currentCategory;
        chip.classList.toggle('active', selected);
        chip.setAttribute('aria-selected', String(selected));
      });
      renderCards();
    });
  });

  advancedClear.addEventListener('click', () => {
    searchInput.value = '';
    currentCategory = 'all';
    visibleCount = step;
    advancedOptions.forEach(option => option.classList.toggle('active', option.dataset.cat === 'all'));
    newsChips.forEach(chip => {
      const selected = chip.dataset.cat === 'all';
      chip.classList.toggle('active', selected);
      chip.setAttribute('aria-selected', String(selected));
    });
    renderCards();
  });

  // 事件綁定：載入更多
  if (btnLoadMore) {
    btnLoadMore.addEventListener('click', () => {
      visibleCount += step;
      renderCards();
    });
  }

  // 事件綁定：排序下拉選單
  if (sortSelect) {
    sortSelect.addEventListener('change', () => {
      visibleCount = step; // 切換排序時重置可見數量，讓使用者從頭看
      renderCards();
    });
  }

  // 事件綁定：搜尋框輸入
  if (searchInput) {
    searchInput.addEventListener('input', () => {
      visibleCount = step; // 重新搜尋時重置數量
      renderCards();
    });
  }

  // 初始載入渲染
  renderCards();

  // 向下捲動後顯示右下角置頂按鈕
  const updateBackToTop = () => backToTop.classList.toggle('show', window.scrollY > 360);
  window.addEventListener('scroll', updateBackToTop, { passive: true });
  backToTop.addEventListener('click', () => window.scrollTo({ top: 0, behavior: 'smooth' }));
  updateBackToTop();
});

/* Shared mobile navigation behavior. */
document.addEventListener("DOMContentLoaded",()=>{const nav=document.getElementById("siteNav"),toggle=document.getElementById("menuToggle"),menu=document.getElementById("mobileMenu");const updateNav=()=>nav?.classList.toggle("scrolled",scrollY>28);addEventListener("scroll",updateNav,{passive:true});updateNav();if(toggle&&menu){toggle.addEventListener("click",()=>{const open=toggle.getAttribute("aria-expanded")==="true";toggle.setAttribute("aria-expanded",String(!open));toggle.setAttribute("aria-label",open?"開啟選單":"關閉選單");menu.classList.toggle("open",!open)});menu.querySelectorAll("a").forEach(a=>a.addEventListener("click",()=>{toggle.setAttribute("aria-expanded","false");menu.classList.remove("open")}))}});
/* Custom sort dropdown backed by the existing sort select. */
document.addEventListener("DOMContentLoaded",()=>{
  const root=document.getElementById("newsSort"),trigger=document.getElementById("sortTrigger"),menu=document.getElementById("sortMenu"),label=document.getElementById("sortLabel"),select=document.getElementById("sortSelect");
  if(!root||!trigger||!menu||!label||!select)return;
  const options=[...menu.querySelectorAll(".sort-option")];
  const setOpen=open=>{root.classList.toggle("open",open);trigger.setAttribute("aria-expanded",String(open));menu.setAttribute("aria-hidden",String(!open))};
  trigger.addEventListener("click",()=>setOpen(!root.classList.contains("open")));
  options.forEach(option=>option.addEventListener("click",()=>{select.value=option.dataset.value;label.textContent="排序："+option.querySelector("span").textContent;options.forEach(item=>{const selected=item===option;item.classList.toggle("is-selected",selected);item.setAttribute("aria-selected",String(selected))});setOpen(false);select.dispatchEvent(new Event("change",{bubbles:true}));trigger.focus()}));
  document.addEventListener("click",event=>{if(!root.contains(event.target))setOpen(false)});
  root.addEventListener("keydown",event=>{if(event.key==="Escape"){setOpen(false);trigger.focus()}});
});
/* Keep the mobile back-to-top button above the visible footer. */
document.addEventListener("DOMContentLoaded",()=>{
  const button=document.getElementById("backToTop"),footer=document.querySelector(".field-footer");
  if(!button||!footer)return;
  const updateFooterLift=()=>{
    const lift=innerWidth<=780?Math.max(0,innerHeight-footer.getBoundingClientRect().top):0;
    button.style.setProperty("--footer-lift",lift+"px");
  };
  addEventListener("scroll",updateFooterLift,{passive:true});
  addEventListener("resize",updateFooterLift);
  updateFooterLift();
});