const fields=[
  {title:"拉拉山水蜜桃",description:"位於桃園復興區的拉拉山，以高山水蜜桃與自然山林景觀聞名。<br>每到夏季水蜜桃成熟時節，旅客可以走進產地體驗採果，感受桃園山區特有的農村風光。",target:"field-1"},
  {title:"大溪老街",description:"大溪老街保存完整的老街屋與華麗牌樓立面，<br>沿途匯集豆干、糕餅、木藝與地方小吃，充滿歷史與生活感。",target:"field-2"},
  {title:"石門水庫",description:"遼闊水域、山林與水利工程景觀彼此交織，<br>呈現桃園水資源、生態與自然休憩兼具的代表性場域。",target:"field-3"},
  {title:"小烏來天空步道",description:"天空步道延伸至溪谷上方，可從高處欣賞瀑布與峽谷地形，<br>感受桃園山林富有冒險氣息的自然景觀。",target:"field-4"}
];
const hero=document.querySelector('.disc-hero'),stage=document.querySelector('.disc-stage'),panels=[...document.querySelectorAll('.disc-panel')],backdrops=[...document.querySelectorAll('.hero-backdrop-panel')],dots=[...document.querySelectorAll('.hero-dots button')],copy=document.querySelector('.hero-copy'),title=document.getElementById('heroTitle'),description=document.getElementById('heroDescription'),number=document.getElementById('heroNumber'),explore=document.getElementById('heroExplore');
let heroIndex=0,heroRotation=0,changing=false;
const preloadTasks=panels.map(panel=>new Promise(resolve=>{const match=panel.style.getPropertyValue('--photo').match(/url\(['"]?(.+?)['"]?\)/);if(!match){resolve();return}const image=new Image();image.decoding='async';image.onload=()=>{const decoded=image.decode?.();decoded?decoded.catch(()=>{}).finally(resolve):resolve()};image.onerror=resolve;image.src=match[1];if(image.complete)resolve()}));
function changeSlide(next,direction){
  if(changing)return;next=(next+fields.length)%fields.length;if(next===heroIndex)return;changing=true;
  const forward=(next-heroIndex+fields.length)%fields.length,backward=(heroIndex-next+fields.length)%fields.length,steps=direction<0?-backward:forward;
  heroRotation-=steps*90;stage.style.setProperty('--wheel-angle',`${heroRotation}deg`);backdrops.forEach((panel,i)=>panel.classList.toggle('is-active',i===next));copy.classList.add('is-changing');
  setTimeout(()=>{title.textContent=fields[next].title;description.innerHTML=fields[next].description;number.textContent=String(next+1).padStart(2,'0');explore.href='#'+fields[next].target;hero.className='disc-hero tone-'+next;dots.forEach((dot,i)=>{dot.classList.toggle('is-active',i===next);dot.setAttribute('aria-selected',String(i===next))});copy.classList.remove('is-changing')},420);
  setTimeout(()=>{heroIndex=next;changing=false},1120)
}
dots.forEach((dot,i)=>dot.addEventListener('click',()=>changeSlide(i,i<heroIndex?-1:1)));hero.addEventListener('keydown',e=>{if(e.key==='ArrowLeft')changeSlide(heroIndex-1,-1);if(e.key==='ArrowRight')changeSlide(heroIndex+1,1)});

const chapters=[...document.querySelectorAll('.chapter')],progressNav=document.querySelector('.progress-nav'),progressButtons=[...progressNav.querySelectorAll('button')],progressFill=document.getElementById('progressFill'),journey=document.querySelector('.field-journey');let furthest=-1;
progressButtons.forEach(button=>button.addEventListener('click',()=>document.getElementById(button.dataset.target).scrollIntoView({behavior:'smooth',block:'center'})));
const revealObserver=new IntersectionObserver(entries=>entries.forEach(entry=>{if(entry.isIntersecting){entry.target.querySelectorAll('.reveal-copy,.reveal-image').forEach(el=>el.classList.add('is-visible'));furthest=Math.max(furthest,Number(entry.target.dataset.index));progressButtons.forEach((button,i)=>button.classList.toggle('is-read',i<=furthest))}}),{rootMargin:'-25% 0px -35%',threshold:.05});chapters.forEach(chapter=>revealObserver.observe(chapter));
function updateProgress(){
  const first=chapters[0].getBoundingClientRect(),last=chapters.at(-1).getBoundingClientRect(),viewportMark=innerHeight*.52,total=(last.top+scrollY)-(first.top+scrollY),travel=Math.max(0,Math.min(total,(scrollY+viewportMark)-(first.top+scrollY))),ratio=total?travel/total:0;
  const reachedRatio=furthest<0?0:furthest/Math.max(1,chapters.length-1),visibleRatio=Math.max(ratio,reachedRatio);
  progressFill.style[innerWidth<=780?'width':'height']=(visibleRatio*100)+'%';
  if(innerWidth>780){const jr=journey.getBoundingClientRect(),railHeight=progressNav.offsetHeight,stickyTop=Math.max(96,(innerHeight-railHeight)/2),atStart=jr.top+248<=stickyTop,atEnd=jr.bottom-105<=stickyTop+railHeight;progressNav.classList.toggle('is-sticky',atStart&&!atEnd);progressNav.classList.toggle('is-end',atEnd)}else{progressNav.classList.remove('is-sticky','is-end')}
}
addEventListener('scroll',updateProgress,{passive:true});addEventListener('resize',updateProgress);updateProgress();
const nav=document.getElementById('siteNav'),toggle=document.getElementById('menuToggle'),mobileNav=document.getElementById('mobileMenu');addEventListener('scroll',()=>nav.classList.toggle('scrolled',scrollY>28),{passive:true});toggle.addEventListener('click',()=>{const open=toggle.getAttribute('aria-expanded')==='true';toggle.setAttribute('aria-expanded',String(!open));toggle.setAttribute('aria-label',open?'開啟選單':'關閉選單');mobileNav.classList.toggle('open',!open)});mobileNav.querySelectorAll('a').forEach(a=>a.addEventListener('click',()=>{toggle.setAttribute('aria-expanded','false');mobileNav.classList.remove('open')}));

// 模擬全部場域資料庫 (可擴展至 300+ 筆資料)
const allFieldsData = [
  { id: 1, name: "拉拉山巨木群步道", district: "復興", category: "山林", tags: ["步道", "避暑", "巨木"], img: "assets/fields/01.jpg?v=20260819-14", link: "場域詳情.html?id=1" },
  { id: 2, name: "大溪老茶廠", district: "大溪", category: "客庄", tags: ["茶文化", "歷史建築", "室內"], img: "assets/fields/02.jpg?v=20260819-14", link: "場域詳情.html?id=2" },
  { id: 3, name: "三坑老街與自然生態公園", district: "龍潭", category: "老街", tags: ["美食", "單車", "客庄"], img: "assets/fields/03.jpg?v=20260819-14", link: "場域詳情.html?id=3" },
  { id: 4, name: "宇內溪戲水區", district: "復興", category: "山林", tags: ["親水", "親子", "瀑布"], img: "assets/fields/04.jpg?v=20260819-14", link: "場域詳情.html?id=4" },
  { id: 5, name: "觀音永安漁港海螺館", district: "新屋", category: "海岸", tags: ["海景", "建築美學", "夕陽"], img: "assets/fields/01.jpg?v=20260819-14", link: "場域詳情.html?id=5" },
  { id: 6, name: "向陽農場", district: "觀音", category: "農村", tags: ["向日葵", "採花", "親子"], img: "assets/fields/02.jpg?v=20260819-14", link: "場域詳情.html?id=6" }
];

const PAGE_SIZE = 12; // 每次載入數量
let currentVisible = PAGE_SIZE;
let activeCategory = "all";
let activeDistrict = "all";
let keyword = "";

const grid = document.getElementById("fieldGrid");
const btnLoadMore = document.getElementById("btnLoadMore");
const remainCount = document.getElementById("remainCount");
const noResult = document.getElementById("noResult");

function getFilteredData() {
  return allFieldsData.filter(item => {
    const matchCat = activeCategory === "all" || item.category === activeCategory || item.tags.includes(activeCategory);
    const matchDistrict = activeDistrict === "all" || item.district === activeDistrict;
    const matchSearch = !keyword || item.name.includes(keyword) || item.tags.some(t => t.includes(keyword));
    return matchCat && matchDistrict && matchSearch;
  });
}

function renderCards() {
  const filtered = getFilteredData();
  const visibleItems = filtered.slice(0, currentVisible);

  if (filtered.length === 0) {
    grid.innerHTML = "";
    if (noResult) noResult.style.display = "block";
    if (btnLoadMore) btnLoadMore.style.display = "none";
    return;
  }

  if (noResult) noResult.style.display = "none";
  if (grid) {
      grid.innerHTML = visibleItems.map(item => `
        <a href="${item.link}" class="field-card">
          <div class="card-thumb">
            <span class="card-badge">${item.category}</span>
            <img src="${item.img}" alt="${item.name}" loading="lazy">
          </div>
          <div class="card-body">
            <span class="card-district"><i class="fa-solid fa-location-dot"></i> 桃園 · ${item.district}區</span>
            <h3 class="card-title">${item.name}</h3>
            <div class="card-tags">
              ${item.tags.map(t => `<span class="card-tag">#${t}</span>`).join("")}
            </div>
          </div>
        </a>
      `).join("");
  }

  const remain = filtered.length - visibleItems.length;
  if (btnLoadMore) {
      if (remain > 0) {
        btnLoadMore.style.display = "inline-block";
        if (remainCount) remainCount.textContent = remain;
      } else {
        btnLoadMore.style.display = "none";
      }
  }
}

// 點擊分類 Chip
document.querySelectorAll(".category-chips .chip").forEach(chip => {
  chip.addEventListener("click", () => {
    document.querySelectorAll(".category-chips .chip").forEach(c => { c.classList.remove("active"); c.setAttribute("aria-selected","false"); });
    chip.classList.add("active");
    chip.setAttribute("aria-selected","true");
    activeCategory = chip.dataset.cat;
    currentVisible = PAGE_SIZE;
    renderCards();
  });
});

// 自訂行政區玻璃下拉選單
const districtSelect = document.getElementById("districtSelect");
if (districtSelect) {
  const districtTrigger = districtSelect.querySelector(".custom-select-trigger");
  const districtMenu = districtSelect.querySelector(".custom-select-menu");
  const districtOptions = [...districtSelect.querySelectorAll(".custom-select-option")];
  const setDistrictOpen = open => {
    districtSelect.classList.toggle("open", open);
    districtTrigger.setAttribute("aria-expanded", String(open));
    districtMenu.setAttribute("aria-hidden", String(!open));
  };
  districtTrigger.addEventListener("click", () => setDistrictOpen(!districtSelect.classList.contains("open")));
  districtOptions.forEach(option => option.addEventListener("click", () => {
    activeDistrict = option.dataset.value;
    districtTrigger.querySelector("span").textContent = option.textContent;
    districtOptions.forEach(item => {
      const selected = item === option;
      item.classList.toggle("is-selected", selected);
      item.setAttribute("aria-selected", String(selected));
    });
    currentVisible = PAGE_SIZE;
    setDistrictOpen(false);
    renderCards();
  }));
  document.addEventListener("click", event => { if (!districtSelect.contains(event.target)) setDistrictOpen(false); });
  districtSelect.addEventListener("keydown", event => { if (event.key === "Escape") { setDistrictOpen(false); districtTrigger.focus(); } });
}
// 關鍵字搜尋
const fieldSearch = document.getElementById("fieldSearch");
if (fieldSearch) {
    fieldSearch.addEventListener("input", (e) => {
      keyword = e.target.value.trim();
      currentVisible = PAGE_SIZE;
      renderCards();
    });
}

// 載入更多按鈕
if (btnLoadMore) {
    btnLoadMore.addEventListener("click", () => {
      currentVisible += PAGE_SIZE;
      renderCards();
    });
}

// 初始化渲染
document.addEventListener('DOMContentLoaded', () => {
    renderCards();
});









/* Pointer swipe: touch on mobile and mouse drag on desktop. */
let swipeStartX=0,swipeStartY=0,swipeDeltaX=0,swipePointer=null;
const resetSwipe=()=>{swipePointer=null;swipeDeltaX=0;hero.classList.remove("is-swiping")};
hero.addEventListener("pointerdown",event=>{
  if(event.target.closest("a,button,input")||changing)return;
  swipePointer=event.pointerId;swipeStartX=event.clientX;swipeStartY=event.clientY;swipeDeltaX=0;
  hero.setPointerCapture?.(event.pointerId);
});
hero.addEventListener("pointermove",event=>{
  if(event.pointerId!==swipePointer)return;
  const deltaX=event.clientX-swipeStartX,deltaY=event.clientY-swipeStartY;
  if(Math.abs(deltaX)>Math.abs(deltaY)&&Math.abs(deltaX)>8){swipeDeltaX=deltaX;hero.classList.add("is-swiping")}
});
hero.addEventListener("pointerup",event=>{
  if(event.pointerId!==swipePointer)return;
  const threshold=Math.min(72,hero.clientWidth*.12),delta=swipeDeltaX;
  resetSwipe();
  if(Math.abs(delta)>=threshold)changeSlide(heroIndex+(delta<0?1:-1),delta<0?1:-1);
});
hero.addEventListener("pointercancel",resetSwipe);
hero.addEventListener("dragstart",event=>event.preventDefault());
/* Footer-aware back-to-top control. */
const fieldBackToTop=document.getElementById("backToTop"),fieldFooter=document.querySelector(".field-footer");
const updateFieldBackToTop=()=>{
  fieldBackToTop?.classList.toggle("show",scrollY>360);
  if(!fieldBackToTop||!fieldFooter)return;
  const lift=innerWidth<=780?Math.max(0,innerHeight-fieldFooter.getBoundingClientRect().top):0;
  fieldBackToTop.style.setProperty("--footer-lift",lift+"px");
};
addEventListener("scroll",updateFieldBackToTop,{passive:true});
addEventListener("resize",updateFieldBackToTop);
fieldBackToTop?.addEventListener("click",()=>scrollTo({top:0,behavior:"smooth"}));
updateFieldBackToTop();