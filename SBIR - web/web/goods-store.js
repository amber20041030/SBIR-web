(()=>{
 const CART_KEY="goodsCart";
 const products=[
  {id:1,name:"拉拉山水蜜桃",desc:"產地直送，果香濃郁",price:850,category:"新鮮蔬果",district:"復興區",feature:"農場直送",promo:"會員優惠",sales:500,date:"2026-08-01",unit:"禮盒／6 入",stock:24,img:"https://images.unsplash.com/photo-1622398925373-3f91b1e2714a?auto=format&fit=crop&w=1200&q=85",summary:"由拉拉山果農清晨採收，依成熟度人工挑選，保留水蜜桃細緻香氣與多汁口感。",details:["產地：桃園市復興區拉拉山","內容：精選水蜜桃 6 入","保存：收到後冷藏，建議 3 日內享用"],highlights:["當日採收分級","小農產地直送","低溫防撞包裝"]},
  {id:2,name:"有機白米",desc:"純淨無污染的在地好米",price:320,category:"米・雜糧",district:"桃園區",feature:"有機認證",promo:"滿額免運",sales:1200,date:"2026-07-15",unit:"包／2 公斤",stock:56,img:"https://images.unsplash.com/photo-1586201375761-83865001e31c?auto=format&fit=crop&w=1200&q=85",summary:"選用桃園在地友善田區稻米，低溫碾製保留米香，口感飽滿、冷飯也香甜。",details:["產地：桃園市桃園區","內容：白米 2 公斤","保存：密封置於陰涼乾燥處"],highlights:["有機栽培管理","低溫新鮮碾製","產地批次包裝"]},
  {id:3,name:"在地茶葉禮盒",desc:"精選高山烏龍茶",price:1200,category:"茶葉",district:"龍潭區",feature:"產銷履歷",promo:"禮盒",sales:300,date:"2026-08-10",unit:"盒／2 罐",stock:18,img:"https://images.unsplash.com/photo-1544787219-7f47ccb76574?auto=format&fit=crop&w=1200&q=85",summary:"龍潭茶園精選烏龍茶，茶湯清亮、花香細緻，以雙罐禮盒呈現桃園茶鄉風味。",details:["產地：桃園市龍潭區","內容：烏龍茶 75g × 2 罐","保存：避免高溫、日照與潮濕"],highlights:["產銷履歷茶園","職人小批焙製","質感雙罐禮盒"]},
  {id:4,name:"手作純蜂蜜",desc:"天然無添加，蜜香四溢",price:450,category:"蜂蜜",district:"大溪區",feature:"小農自產",promo:"限時優惠",sales:800,date:"2026-06-20",unit:"瓶／420g",stock:32,img:"https://images.unsplash.com/photo-1587049352846-4a222e784d38?auto=format&fit=crop&w=1200&q=85",summary:"大溪小農採集季節花蜜，低溫過濾、不添加香料與糖漿，保留自然花香。",details:["產地：桃園市大溪區","內容：純蜂蜜 420g","保存：常溫陰涼處，結晶屬自然現象"],highlights:["單純天然蜂蜜","小農自行採收","低溫過濾裝瓶"]},
  {id:5,name:"手工果醬",desc:"酸甜滋味，無人工添加物",price:280,category:"加工食品",district:"中壢區",feature:"無添加",promo:"體驗後續購優惠",sales:450,date:"2026-08-12",unit:"罐／220g",stock:40,img:"https://images.unsplash.com/photo-1606744824163-985d376605aa?auto=format&fit=crop&w=1200&q=85",summary:"使用桃園當季水果小鍋熬煮，減糖配方保留果肉口感，適合搭配吐司與優格。",details:["產地：桃園市中壢區","內容：季節果醬 220g","保存：未開封常溫，開封後冷藏"],highlights:["當季水果製作","減糖小鍋熬煮","無人工香料色素"]}
 ];
 const readCart=()=>{try{const value=JSON.parse(localStorage.getItem(CART_KEY)||"[]");return Array.isArray(value)?value:[]}catch{return[]}};
 const saveCart=items=>{localStorage.setItem(CART_KEY,JSON.stringify(items));window.dispatchEvent(new CustomEvent("goods-cart-change",{detail:items}));return items};
 const getProduct=id=>products.find(product=>product.id===Number(id));
 const add=(id,quantity=1)=>{const product=getProduct(id);if(!product)return readCart();const cart=readCart(),item=cart.find(entry=>entry.id===product.id),amount=Math.max(1,Number(quantity)||1);if(item)item.quantity=Math.min(product.stock,item.quantity+amount);else cart.push({id:product.id,name:product.name,price:product.price,img:product.img,unit:product.unit,stock:product.stock,quantity:Math.min(product.stock,amount)});return saveCart(cart)};
 const update=(id,delta)=>{const cart=readCart(),item=cart.find(entry=>entry.id===Number(id));if(!item)return cart;item.quantity=Math.max(0,Math.min(item.stock||99,item.quantity+Number(delta||0)));return saveCart(cart.filter(entry=>entry.quantity>0))};
 const remove=id=>saveCart(readCart().filter(entry=>entry.id!==Number(id)));
 const count=cart=>(cart||readCart()).reduce((sum,item)=>sum+Number(item.quantity||0),0);
 const total=cart=>(cart||readCart()).reduce((sum,item)=>sum+Number(item.price||0)*Number(item.quantity||0),0);
 window.GoodsStore={CART_KEY,products,getProduct,readCart,saveCart,add,update,remove,count,total};
})();
