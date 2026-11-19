// Artanova Cafe demo app. Customer orders and owner KPIs share the same local data store.
const PRODUCTS = [
  {id:'coffee',name:'Classic Coffee',category:'Beverages',price:120,emoji:'☕',desc:'Smooth, comforting house coffee',recipe:{'Coffee beans':18,'Milk':120}},
  {id:'cappuccino',name:'Portrait Cappuccino',category:'Beverages',price:160,emoji:'🥛',desc:'Velvety milk with a rich espresso base',recipe:{'Coffee beans':18,'Milk':160}},
  {id:'mocha',name:'Masterpiece Mocha',category:'Beverages',price:190,emoji:'🍫',desc:'Chocolate, espresso and a little art',recipe:{'Coffee beans':18,'Milk':140,'Chocolate':25}},
  {id:'croissant',name:'Butter Croissant',category:'Pastries',price:120,emoji:'🥐',desc:'Flaky, golden and freshly baked',recipe:{'Pastries':1}},
  {id:'brownie',name:'Chocolate Brownie',category:'Pastries',price:140,emoji:'🍰',desc:'A rich little chocolate treat',recipe:{'Pastries':1,'Chocolate':20}},
  {id:'tea',name:'Masala Chai',category:'Beverages',price:90,emoji:'🫖',desc:'Warming spices and brewed tea',recipe:{'Tea leaves':8,'Milk':100}}
];
const EXPERIENCES = {
  'Studio pass · 30 min':{id:'studio30',price:199,category:'Studio Passes',recipe:{'Studio supplies':1}},
  'Studio pass · 60 min':{id:'studio60',price:349,category:'Studio Passes',recipe:{'Studio supplies':1}},
  'Studio pass · 120 min':{id:'studio120',price:599,category:'Studio Passes',recipe:{'Studio supplies':2}},
  'Space Adventure':{id:'space',price:299,category:'VR Games',recipe:{'VR slot capacity':1}},
  'VR Racing':{id:'racing',price:249,category:'VR Games',recipe:{'VR slot capacity':1}},
  'Zombie Survival':{id:'zombie',price:349,category:'VR Games',recipe:{'VR slot capacity':1}}
};
const INITIAL_INVENTORY = [
  {name:'Milk',unit:'ml',stock:12000,reorder:3000,capacity:15000},
  {name:'Coffee beans',unit:'g',stock:1800,reorder:500,capacity:2500},
  {name:'Pastries',unit:'pcs',stock:22,reorder:8,capacity:40},
  {name:'Chocolate',unit:'g',stock:900,reorder:250,capacity:1500},
  {name:'Tea leaves',unit:'g',stock:650,reorder:180,capacity:1000},
  {name:'Studio supplies',unit:'sets',stock:18,reorder:5,capacity:25},
  {name:'VR slot capacity',unit:'slots today',stock:10,reorder:2,capacity:10}
];
const STORE_KEY='artanovaCafeDemo_v1';
let state = loadState();
let cart = [];
let selectedPass = null;
let revenueChart = null, categoryChart = null;
let period = 'month';

function loadState(){
  try{
    const saved=JSON.parse(localStorage.getItem(STORE_KEY));
    if(saved && Array.isArray(saved.orders) && Array.isArray(saved.inventory)) return saved;
  }catch(e){}
  // Seed demo history across the current month so monthly KPI charts have meaningful sample values.
  const inventory=structuredClone(INITIAL_INVENTORY);
  const now=new Date();
  const demoOrders=[];
  const sampleNames=['Mira','Arjun','Riya','Kabir','Ananya','Dev','Ishita','Aarav'];
  const sampleProducts=[['coffee',1,'croissant',1],['cappuccino',1,'brownie',1],['mocha',1],['tea',2,'croissant',1],['coffee',2],['brownie',1,'tea',1]];
  for(let i=0;i<12;i++){
    const date=new Date(now.getFullYear(),now.getMonth(),Math.max(1,now.getDate()-i),10+(i%8),15);
    const items=sampleProducts[i%sampleProducts.length];
    const lines=[];
    for(let j=0;j<items.length;j+=2){const p=PRODUCTS.find(x=>x.id===items[j]);lines.push({id:p.id,name:p.name,category:p.category,price:p.price,qty:items[j+1]});}
    const subtotal=lines.reduce((s,x)=>s+x.price*x.qty,0);
    demoOrders.push({id:'DEMO-'+String(1001+i),name:sampleNames[i%sampleNames.length],type:i%2?'Takeaway':'Dine-in',items:lines,subtotal,tax:Math.round(subtotal*.05),total:subtotal+Math.round(subtotal*.05),date:date.toISOString(),status:'Completed',demo:true});
  }
  return {orders:demoOrders,inventory,bookings:[],createdAt:now.toISOString()};
}
function save(){localStorage.setItem(STORE_KEY,JSON.stringify(state));}
function money(n){return '₹'+Math.round(n||0).toLocaleString('en-IN');}
function escapeHTML(s){return String(s).replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));}
function showToast(message){const t=document.getElementById('toast');t.textContent=message;t.classList.add('show');clearTimeout(showToast.timer);showToast.timer=setTimeout(()=>t.classList.remove('show'),2600);}

function renderMenu(){
  document.getElementById('menuGrid').innerHTML=PRODUCTS.map(p=>`
    <article class="menu-card"><div class="menu-art">${p.emoji}</div><div class="menu-info">
      <h3>${p.name}</h3><p>${p.desc}</p><div class="menu-bottom"><strong>${money(p.price)}</strong>
      <button class="add-btn" data-add="${p.id}">Add to cart +</button></div></div></article>`).join('');
}
function addCart(item){const found=cart.find(x=>x.id===item.id);if(found)found.qty++;else cart.push({...item,qty:1});renderCart();showToast(`${item.name} added to your cart`);}
function addProduct(id){const p=PRODUCTS.find(x=>x.id===id);addCart({...p});}
function changeQty(id,delta){const line=cart.find(x=>x.id===id);if(!line)return;line.qty+=delta;if(line.qty<=0)cart=cart.filter(x=>x.id!==id);renderCart();}
function cartTotals(){const subtotal=cart.reduce((s,x)=>s+x.price*x.qty,0),tax=Math.round(subtotal*.05);return {subtotal,tax,total:subtotal+tax};}
function renderCart(){
  const el=document.getElementById('cartItems'),tot=cartTotals(),count=cart.reduce((s,x)=>s+x.qty,0);
  document.getElementById('cartCount').textContent=count;
  document.getElementById('cartSubtotal').textContent=money(tot.subtotal);
  document.getElementById('cartTax').textContent=money(tot.tax);
  document.getElementById('cartTotal').textContent=money(tot.total);
  document.getElementById('checkoutBtn').textContent=`Place order · ${money(tot.total)}`;
  el.innerHTML=cart.length?cart.map(x=>`<div class="cart-line"><div><b>${escapeHTML(x.name)}</b><small>${money(x.price)} each</small></div><div class="qty-controls"><button data-qty="${x.id}" data-delta="-1" aria-label="Decrease">−</button><b>${x.qty}</b><button data-qty="${x.id}" data-delta="1" aria-label="Increase">+</button></div></div>`).join(''):'<div class="empty-cart">Your cart is waiting for something lovely.</div>';
}
function addExperience(name,price,category,recipe){
  addCart({id:'exp-'+name.toLowerCase().replace(/[^a-z0-9]/g,''),name,price,category,recipe});
}
function placeOrder(){
  if(!cart.length){showToast('Add an item before placing your order.');return;}
  const name=document.getElementById('customerName').value.trim();
  if(!name){showToast('Please enter your name to continue.');document.getElementById('customerName').focus();return;}
  const totals=cartTotals();
  const order={id:'ART-'+Date.now().toString().slice(-7),name,type:document.getElementById('orderType').value,
    items:cart.map(x=>({id:x.id,name:x.name,category:x.category,price:x.price,qty:x.qty,recipe:x.recipe||{}})),
    subtotal:totals.subtotal,tax:totals.tax,total:totals.total,date:new Date().toISOString(),status:'Received',demo:false};
  state.orders.unshift(order);
  // Deduct recipe quantities only for real customer orders, not seeded historical demo records.
  order.items.forEach(item=>{
    const product=PRODUCTS.find(p=>p.id===item.id);
    const recipe=item.recipe || (product&&product.recipe) || {};
    Object.entries(recipe).forEach(([ingredient,amount])=>{
      const stock=state.inventory.find(x=>x.name.toLowerCase()===ingredient.toLowerCase());
      if(stock && stock.name!=='VR slot capacity') stock.stock=Math.max(0,stock.stock-amount*item.qty);
      if(stock && stock.name==='VR slot capacity') stock.stock=Math.max(0,stock.stock-item.qty);
    });
  });
  const hasStudio=order.items.some(x=>x.category==='Studio Passes');
  const hasVR=order.items.some(x=>x.category==='VR Games');
  if(hasStudio||hasVR)state.bookings.push({date:order.date,studio:hasStudio,vr:hasVR,name});
  save();cart=[];renderCart();renderOwner();showToast(`Thank you, ${name}! Order ${order.id} has been received.`);
  document.getElementById('customerName').value='';
}
function setView(view){
  document.querySelectorAll('.view').forEach(x=>x.classList.remove('active'));
  document.getElementById(view+'View').classList.add('active');
  document.querySelectorAll('.nav-btn').forEach(x=>x.classList.toggle('active',x.dataset.view===view));
  if(view==='owner')renderOwner();
  window.scrollTo({top:0,behavior:'smooth'});
}
function filteredOrders(){
  const now=new Date();
  return state.orders.filter(o=>{
    const d=new Date(o.date);
    if(period==='today')return d.toDateString()===now.toDateString();
    if(period==='month')return d.getMonth()===now.getMonth()&&d.getFullYear()===now.getFullYear();
    return true;
  });
}
function renderKpis(orders){
  const revenue=orders.reduce((s,o)=>s+o.total,0),items=orders.reduce((s,o)=>s+o.items.reduce((a,x)=>a+x.qty,0),0);
  const customers=new Set(orders.map(o=>o.name.trim().toLowerCase())).size;
  document.getElementById('kpiRevenue').textContent=money(revenue);
  document.getElementById('revenueOrders').textContent=`${orders.length} orders`;
  document.getElementById('kpiOrders').textContent=orders.length;
  document.getElementById('kpiCustomers').textContent=customers;
  document.getElementById('kpiAov').textContent=money(orders.length?revenue/orders.length:0);
  document.getElementById('kpiItems').textContent=items;
  const low=state.inventory.filter(x=>x.name!=='VR slot capacity'&&x.stock<=x.reorder).length;
  document.getElementById('kpiLowStock').textContent=low;
  document.getElementById('stockFoot').textContent=low?`${low} item(s) need attention`:'Stock levels look healthy';
  document.getElementById('ordersFoot').textContent=`${items} items sold in this period`;
  document.getElementById('revenueContext').textContent=period==='today'?'Gross sales · today':period==='month'?'Gross sales · this month':'Gross sales · all time';
}
function renderRevenueChart(){
  const now=new Date(),labels=[],values=[];
  if(period==='today'){
    for(let h=8;h<=21;h++){labels.push((h%12||12)+(h<12?' AM':' PM'));values.push(0);}
    state.orders.forEach(o=>{const d=new Date(o.date);if(d.toDateString()===now.toDateString()){const idx=d.getHours()-8;if(idx>=0&&idx<values.length)values[idx]+=o.total;}});
  }else{
    const count=period==='month'?now.getDate():6;
    for(let i=0;i<count;i++){
      let d;
      if(period==='month')d=new Date(now.getFullYear(),now.getMonth(),i+1);
      else d=new Date(now.getFullYear(),now.getMonth(),now.getDate()-5+i);
      labels.push(d.toLocaleDateString('en-IN',{day:'numeric',month:'short'}));values.push(0);
    }
    state.orders.forEach(o=>{const d=new Date(o.date);let idx;
      if(period==='month')idx=d.getDate()-1;
      else idx=Math.round((new Date(d.getFullYear(),d.getMonth(),d.getDate())-new Date(now.getFullYear(),now.getMonth(),now.getDate()-5))/86400000);
      if(idx>=0&&idx<values.length)values[idx]+=o.total;
    });
  }
  const ctx=document.getElementById('monthlyRevenueChart');
  if(revenueChart)revenueChart.destroy();
  revenueChart=new Chart(ctx,{type:'line',data:{labels,datasets:[{label:'Revenue',data:values,borderColor:'#b96b3d',backgroundColor:'rgba(185,107,61,.12)',fill:true,tension:.35,pointRadius:2,pointHoverRadius:5,borderWidth:2}]},
    options:{responsive:true,maintainAspectRatio:false,plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>money(c.raw)}}},
      scales:{x:{grid:{display:false},ticks:{maxTicksLimit:period==='month'?9:8,color:'#9a8571',font:{size:9}}},y:{beginAtZero:true,grid:{color:'#f0e8de'},ticks:{color:'#9a8571',font:{size:9},callback:v=>'₹'+v.toLocaleString('en-IN')}}}}});
}
function renderCategoryChart(orders){
  const cats=['Beverages','Studio Passes','VR Games','Pastries'],vals=cats.map(c=>orders.reduce((s,o)=>s+o.items.filter(x=>x.category===c).reduce((a,x)=>a+x.price*x.qty,0),0));
  const colors=['#b87953','#79523d','#91a45d','#7294b6'];
  const ctx=document.getElementById('categoryChart');if(categoryChart)categoryChart.destroy();
  categoryChart=new Chart(ctx,{type:'doughnut',data:{labels:cats,datasets:[{data:vals,backgroundColor:colors,borderColor:'#fffdf8',borderWidth:3}]},options:{responsive:true,maintainAspectRatio:false,cutout:'66%',plugins:{legend:{display:false},tooltip:{callbacks:{label:c=>`${c.label}: ${money(c.raw)}`}}}}});
  document.getElementById('categoryLegend').innerHTML=cats.map((c,i)=>`<span class="legend-entry"><i class="legend-swatch" style="background:${colors[i]}"></i>${c} <b>${money(vals[i])}</b></span>`).join('');
}
function renderInventory(){
  document.getElementById('inventoryList').innerHTML=state.inventory.map((x,i)=>{
    const pct=Math.max(0,Math.min(100,x.stock/x.capacity*100)),low=x.stock<=x.reorder,critical=x.stock<=x.reorder*.5;
    return `<div class="stock-row"><span class="stock-name">${x.name}</span><div class="stock-track"><div class="stock-fill ${critical?'critical':low?'low':''}" style="width:${pct}%"></div></div><span class="stock-meta">${Math.round(x.stock).toLocaleString('en-IN')} ${x.unit}</span><div class="stock-actions"><span class="${low?'stock-alert':''}">${low?'LOW STOCK':'Healthy'} · reorder at ${x.reorder}</span><button data-restock="${i}" data-amount="500">+500</button><button data-restock="${i}" data-amount="2000">+2,000</button></div></div>`;
  }).join('');
}
function renderExperiences(){
  const today=new Date().toDateString(),todayBookings=state.bookings.filter(b=>new Date(b.date).toDateString()===today);
  const studio=todayBookings.filter(b=>b.studio).length,vr=todayBookings.filter(b=>b.vr).length;
  document.getElementById('studioBookings').textContent=studio;
  document.getElementById('vrBookings').textContent=vr;
  const booked=Math.min(10,studio+vr);
  document.getElementById('occupancyFill').style.width=(booked/10*100)+'%';
  document.getElementById('occupancyText').textContent=`${booked} / 10 slots booked`;
  document.getElementById('todayBookings').textContent=todayBookings.length;
  const counts={};state.orders.forEach(o=>o.items.forEach(x=>{if(x.category==='VR Games'||x.category==='Studio Passes')counts[x.name]=(counts[x.name]||0)+x.qty;}));
  const popular=Object.entries(counts).sort((a,b)=>b[1]-a[1])[0];
  document.getElementById('popularExperience').textContent=popular?popular[0]:'—';
}
function renderOrders(){
  const orders=state.orders.slice(0,8);
  document.getElementById('orderCountLabel').textContent=`${state.orders.length} TOTAL`;
  document.getElementById('ordersTable').innerHTML=orders.length?orders.map(o=>`<tr><td><b>${o.id}</b></td><td>${escapeHTML(o.name)}</td><td>${o.items.reduce((s,x)=>s+x.qty,0)} items</td><td>${o.type}</td><td><b>${money(o.total)}</b></td><td><span class="status-pill">${o.status}</span></td></tr>`).join(''):'<tr><td colspan="6" class="empty-table">No orders yet. Place a test order from the customer page.</td></tr>';
}
function renderOwner(){
  const orders=filteredOrders();
  document.getElementById('todayLabel').textContent=new Date().toLocaleDateString('en-IN',{weekday:'short',day:'numeric',month:'short',year:'numeric'});
  renderKpis(orders);renderRevenueChart();renderCategoryChart(orders);renderInventory();renderExperiences();renderOrders();
}
function exportCSV(){
  const rows=[['Order ID','Date','Customer','Order Type','Items','Subtotal','Tax','Total','Status']];
  state.orders.forEach(o=>rows.push([o.id,new Date(o.date).toLocaleString('en-IN'),o.name,o.type,o.items.map(x=>`${x.name} x${x.qty}`).join('; '),o.subtotal,o.tax,o.total,o.status]));
  const csv=rows.map(r=>r.map(v=>'"'+String(v).replace(/"/g,'""')+'"').join(',')).join('\n');
  const blob=new Blob([csv],{type:'text/csv;charset=utf-8;'}),url=URL.createObjectURL(blob),a=document.createElement('a');
  a.href=url;a.download='artanova-orders.csv';a.click();URL.revokeObjectURL(url);
}

// Events
document.querySelectorAll('.nav-btn').forEach(b=>b.addEventListener('click',()=>setView(b.dataset.view)));
document.getElementById('menuGrid').addEventListener('click',e=>{const b=e.target.closest('[data-add]');if(b)addProduct(b.dataset.add);});
document.getElementById('cartItems').addEventListener('click',e=>{const b=e.target.closest('[data-qty]');if(b)changeQty(b.dataset.qty,Number(b.dataset.delta));});
document.getElementById('checkoutBtn').addEventListener('click',placeOrder);
document.querySelectorAll('.pass-card').forEach(b=>b.addEventListener('click',()=>{
  document.querySelectorAll('.pass-card').forEach(x=>x.classList.remove('selected'));b.classList.add('selected');selectedPass=b.dataset.pass;
}));
document.getElementById('bookStudioBtn').addEventListener('click',()=>{
  if(!selectedPass){showToast('Choose an art studio pass first.');return;}
  const key=`Studio pass · ${selectedPass} min`,x=EXPERIENCES[key];
  const date=document.getElementById('bookingDate').value;
  if(!date){showToast('Choose a session date first.');return;}
  addCart({id:x.id,name:key,category:x.category,price:x.price,recipe:x.recipe,sessionDate:date,sessionTime:document.getElementById('bookingTime').value});
  showToast('Studio pass added to your cart. Complete checkout to confirm.');
});
document.querySelectorAll('.add-vr').forEach(b=>b.addEventListener('click',()=>{const x=EXPERIENCES[b.dataset.game];addCart({id:x.id,name:b.dataset.game,category:x.category,price:x.price,recipe:x.recipe});}));
document.querySelectorAll('.filter-btn').forEach(b=>b.addEventListener('click',()=>{period=b.dataset.period;document.querySelectorAll('.filter-btn').forEach(x=>x.classList.toggle('active',x===b));renderOwner();}));
document.getElementById('inventoryList').addEventListener('click',e=>{const b=e.target.closest('[data-restock]');if(!b)return;const item=state.inventory[Number(b.dataset.restock)];item.stock=Math.min(item.capacity,item.stock+Number(b.dataset.amount));save();renderOwner();showToast(`${item.name} restocked.`);});
document.getElementById('restockAllBtn').addEventListener('click',()=>{state.inventory.forEach(x=>x.stock=x.capacity);save();renderOwner();showToast('All inventory has been restocked to capacity.');});
document.getElementById('exportBtn').addEventListener('click',exportCSV);

// Set a convenient default booking date and initial UI.
const dateInput=document.getElementById('bookingDate');dateInput.min=new Date().toISOString().slice(0,10);dateInput.value=dateInput.min;
renderMenu();renderCart();renderOwner();
