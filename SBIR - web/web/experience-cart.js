(()=>{
const KEY="experienceCart";
const SESSION_KEY="sbir_current_user";
const RETURN_KEY="sbir_auth_return_to";
const read=()=>{try{return JSON.parse(localStorage.getItem(KEY)||"[]")}catch{return[]}};
const save=items=>{localStorage.setItem(KEY,JSON.stringify(items));render()};
const money=n=>"NT$ "+Number(n||0).toLocaleString();
function ensureUI(){
 if(document.getElementById("experienceCartDrawer"))return;
 const button='<button class="experience-cart-button" type="button" onclick="openExperienceCart(true)" aria-label="開啟購物車"><svg viewBox="0 0 24 24" fill="none" aria-hidden="true"><path d="M3 4h2l2.1 10.1a2 2 0 0 0 2 1.6h7.8a2 2 0 0 0 1.9-1.4L21 7H6.1M9.5 20a1 1 0 1 1-2 0 1 1 0 0 1 2 0Zm9 0a1 1 0 1 1-2 0 1 1 0 0 1 2 0Z" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round"/></svg><span>購物車</span><b class="experience-cart-count">0</b></button>';
 document.querySelectorAll(".g-actions,.g-mobile-actions,.auth").forEach(box=>box.insertAdjacentHTML("beforeend",button));
 document.body.insertAdjacentHTML("beforeend",'<div id="experienceCartOverlay" class="experience-cart-overlay" onclick="openExperienceCart(false)"></div><aside id="experienceCartDrawer" class="experience-cart-drawer" aria-label="購物車"><header><div><small>CART</small><h2>購物車</h2></div><button type="button" onclick="openExperienceCart(false)" aria-label="關閉">×</button></header><div id="experienceCartItems" class="experience-cart-items"></div><footer><div><span>總計金額</span><strong id="experienceCartTotal">NT$ 0</strong></div><button type="button" onclick="experienceCheckout()">前往結帳</button></footer></aside><div id="experienceCartToast" class="experience-cart-toast">已加入購物車</div>');
}
function render(){
 const cart=read(),count=cart.reduce((sum,item)=>sum+Number(item.guests||1),0);
 document.querySelectorAll(".experience-cart-count").forEach(b=>{b.textContent=count;b.classList.toggle("show",count>0)});
 const box=document.getElementById("experienceCartItems"),totalEl=document.getElementById("experienceCartTotal");if(!box||!totalEl)return;
 if(!cart.length){box.innerHTML='<div class="experience-cart-empty"><span>🧺</span><b>購物車目前是空的</b><p>選擇喜歡的體驗與日期後加入吧！</p></div>';totalEl.textContent="NT$ 0";return}
 let total=0;box.innerHTML=cart.map((item,index)=>{total+=item.price*item.guests;return '<article class="experience-cart-item"><img src="'+item.image+'" alt="" onerror="this.onerror=null;this.src=\'../imgs/水蜜桃.png\'"><div class="experience-cart-info"><h3>'+item.title+'</h3><p>'+item.date+'・'+item.guests+' 人</p><strong>'+money(item.price*item.guests)+'</strong></div><button class="experience-cart-remove" onclick="removeExperienceCartItem('+index+')" aria-label="刪除">×</button></article>'}).join("");totalEl.textContent=money(total);
}
window.addExperienceToCart=item=>{
 const cart=read(),key=String(item.id)+"|"+item.date,existing=cart.find(x=>x.key===key);
 if(existing)Object.assign(existing,item,{key,guests:Number(item.guests||1)});else cart.push({...item,key,guests:Number(item.guests||1)});
 save(cart);const toast=document.getElementById("experienceCartToast");if(toast){toast.textContent="「"+item.title+"」已加入購物車";toast.classList.add("show");clearTimeout(window.experienceCartToastTimer);window.experienceCartToastTimer=setTimeout(()=>toast.classList.remove("show"),2200)}
};
window.changeExperienceCartGuests=(index,delta)=>{const cart=read();if(!cart[index])return;cart[index].guests=Math.max(1,Math.min(8,cart[index].guests+delta));save(cart)};
window.removeExperienceCartItem=index=>{const cart=read();cart.splice(index,1);save(cart)};
window.openExperienceCart=open=>{document.getElementById("experienceCartDrawer")?.classList.toggle("open",open);document.getElementById("experienceCartOverlay")?.classList.toggle("open",open);document.body.classList.toggle("cart-open",open)};
window.showExperienceLoginGate=options=>{
 const settings=options||{},existing=document.getElementById("experienceLoginGate");if(existing)existing.remove();
 const returnTo=settings.returnTo||location.pathname.split("/").pop()+location.search;
 document.body.insertAdjacentHTML("beforeend",'<div id="experienceLoginGate" class="experience-login-gate" role="dialog" aria-modal="true" aria-labelledby="experienceLoginTitle"><div class="experience-login-card"><button class="experience-login-close" type="button" aria-label="關閉" onclick="document.getElementById(\'experienceLoginGate\').remove()">×</button><div class="experience-login-icon">♙</div><h2 id="experienceLoginTitle">請先登入</h2><p>'+(settings.message||"登入後即可繼續使用此功能。")+'</p><button class="experience-login-primary" type="button" id="experienceLoginButton">立即登入</button><button class="experience-login-secondary" type="button" onclick="document.getElementById(\'experienceLoginGate\').remove()">稍後再說</button></div></div>');
 document.getElementById("experienceLoginButton").onclick=()=>{sessionStorage.setItem(RETURN_KEY,returnTo);location.href="login.html#login"};
};
window.experienceCheckout=()=>{const cart=read();if(!cart.length){const toast=document.getElementById("experienceCartToast");if(toast){toast.textContent="購物車目前是空的";toast.classList.add("show")}return}location.href="購物車.html"};
document.addEventListener("DOMContentLoaded",()=>{ensureUI();render()});window.addEventListener("storage",render);
})();









