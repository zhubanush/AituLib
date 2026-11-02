/* AuraLib app: views and library rules. Accounts, loans, holds, rooms, reviews, the reading
   challenge and the book club live in Supabase (js/store.js). The catalog is sample data (js/catalog.js). */
(function(){
  var DAY=86400000, CAT=window.CATALOG, SUBJECTS=CAT.SUBJECTS, BOOKS=CAT.BOOKS, I18N=window.I18N;
  var $=function(id){return document.getElementById(id)};
  function esc(s){return String(s==null?'':s).replace(/[&<>"']/g,function(c){return{'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]})}
  function lsGet(k,d){try{var v=localStorage.getItem(k);return v==null?d:v}catch(e){return d}}
  function lsSet(k,v){try{localStorage.setItem(k,v)}catch(e){}}

  /* ---------- language ---------- */
  var LANGS={en:'EN',ru:'RU',kk:'KZ'}, LOCALE={en:'en-GB',ru:'ru-RU',kk:'kk-KZ'};
  var nav0=(navigator.language||'en').slice(0,2).toLowerCase();
  var LANG=lsGet('auralib.lang',null)||(nav0==='ru'?'ru':nav0==='kk'?'kk':'en');
  if(!LANGS[LANG])LANG='en';
  function T(k){
    var s=(I18N[LANG]||{})[k];if(s==null)s=I18N.en[k];if(s==null)return k;
    var a=arguments;return String(s).replace(/\{(\d)\}/g,function(m,i){var v=a[+i+1];return v==null?'':v});
  }
  function PL(k,n){
    var f=(I18N[LANG]||{})[k]||I18N.en[k];if(typeof f==='string')return f.replace('{0}',n);
    var i={one:0,few:1,many:2}[new Intl.PluralRules(LOCALE[LANG]).select(n)];if(i==null||i>=f.length)i=f.length-1;
    return f[i].replace('{0}',n);
  }
  function SN(s){return T('subj.'+s)}
  function applyStatic(){
    document.documentElement.lang=LANG==='kk'?'kk':LANG;
    document.querySelectorAll('[data-i18n]').forEach(function(el){el.textContent=T(el.dataset.i18n)});
    document.querySelectorAll('[data-i18n-ph]').forEach(function(el){el.placeholder=T(el.dataset.i18nPh)});
    document.querySelectorAll('[data-i18n-aria]').forEach(function(el){el.setAttribute('aria-label',T(el.dataset.i18nAria))});
    $('lang').value=LANG;
  }

  /* ---------- theme: auto -> light -> dark ---------- */
  var THEME=lsGet('auralib.theme','auto');
  function applyTheme(){
    if(THEME==='auto')document.documentElement.removeAttribute('data-theme');else document.documentElement.setAttribute('data-theme',THEME);
    var b=$('themeBtn');b.textContent=THEME==='dark'?'☾':THEME==='light'?'☀':'◐';b.title=T('theme.'+THEME);b.setAttribute('aria-label',T('theme.'+THEME));
    var dark=THEME==='dark'||(THEME==='auto'&&window.matchMedia&&matchMedia('(prefers-color-scheme: dark)').matches);
    document.querySelector('meta[name=theme-color]').setAttribute('content',dark?'#0F1720':'#1F3A5F');
  }

  /* ---------- dates ---------- */
  function addDays(n){var d=new Date();d.setHours(0,0,0,0);return new Date(d.getTime()+n*DAY)}
  function pad(n){return n<10?'0'+n:''+n}
  function iso(d){return d.getFullYear()+'-'+pad(d.getMonth()+1)+'-'+pad(d.getDate())}
  function fmt(d){return d.toLocaleDateString(LOCALE[LANG],{day:'numeric',month:'short'})}
  function fmtLong(d){return d.toLocaleDateString(LOCALE[LANG],{weekday:'short',day:'numeric',month:'short'})}
  function fmtTime(d){return fmt(d)+', '+pad(d.getHours())+':'+pad(d.getMinutes())}
  function fmtMonth(d){return d.toLocaleDateString(LOCALE[LANG],{month:'long',year:'numeric'})}
  function daysUntil(d){var a=new Date(d);a.setHours(0,0,0,0);return Math.round((a-addDays(0))/DAY)}
  function monthStart(off){var d=new Date();return new Date(d.getFullYear(),d.getMonth()+(off||0),1)}
  function weekOf(d){var x=new Date(d);x.setHours(0,0,0,0);return new Date(x.getTime()-((x.getDay()+6)%7)*DAY)}
  function weekStart(off){return new Date(weekOf(new Date()).getTime()+7*(off||0)*DAY)}
  function dayLabel(s){return s===iso(new Date())?T('w.today'):fmtLong(new Date(s+'T00:00:00'))}
  function hh(h){return pad(h)+':00'}

  /* ---------- catalog + live numbers ---------- */
  var BOOK={};
  BOOKS.forEach(function(b){BOOK[b.id]=b;b.base=b.left;b.baseDue=b.due;b.active=0;b.ready=0;b.waiting=0;b.loans90=0;b.rating=null;b.nrev=0;b.nextDue=null});
  function byId(id){return BOOK[id]}
  function applyStats(rows){
    var S={};(rows||[]).forEach(function(s){S[s.book_id]=s});
    BOOKS.forEach(function(b){
      var s=S[b.id];b.active=s?s.active:0;b.ready=s?s.ready:0;b.waiting=s?s.waiting:0;b.loans90=s?s.loans90:0;
      b.rating=s&&s.rating!=null?+s.rating:null;b.nrev=s?s.reviews:0;b.nextDue=s&&s.next_due?new Date(s.next_due):null;
      b.left=Math.max(0,b.base-b.active);
    });
  }
  function dueBack(b){return b.base>0&&b.nextDue?b.nextDue:addDays(b.baseDue||7)}
  function onShelf(b){return Math.max(0,b.left-b.ready)}
  function myLoan(id){return state.loans.filter(function(l){return l.book===id})[0]}
  function myHold(id){return state.holds.filter(function(h){return h.book===id})[0]}
  function hasRead(id){return !!myLoan(id)||state.past.some(function(l){return l.book===id})}
  function canBorrow(b){var h=myHold(b.id);return (h&&h.status==='ready')||onShelf(b)>0}
  function initials(t){var w=t.replace(/[^A-Za-z0-9 ]/g,'').split(/\s+/).filter(function(x){return x.length>2&&!/^(the|and|for)$/i.test(x)});return (w[0]||t).charAt(0)+(w[1]||'').charAt(0)}
  function cover(b){return '<span class="cover" aria-hidden="true" style="background:'+b.c+'"><b>'+esc(initials(b.t))+'</b><i>'+esc(b.s.slice(0,3).toUpperCase())+'</i></span>'}
  function stars(r){var n=Math.round(r||0);return '<span class="stars" role="img" aria-label="'+esc(T('rev.aria',r?(+r).toFixed(1):0))+'">'+'★★★★★'.slice(0,n)+'<span class="off">'+'★★★★★'.slice(n)+'</span></span>'}
  function status(b){
    if(myLoan(b.id))return '<span class="status ok">'+T('st.yours')+'</span>';
    var h=myHold(b.id);if(h&&h.status==='ready')return '<span class="status ok">'+T('st.ready')+'</span>';
    var n=onShelf(b);
    return n?'<span class="status ok">'+T('st.shelf',n,b.copies)+'</span>':'<span class="status out">'+T('st.due',fmt(dueBack(b)))+'</span>';
  }

  var state={view:'find',subject:'All',q:'',avail:false,aisle:0,limit:12,sel:1,floor:2,qr:false,
    day:0,pick:null,loans:[],past:[],holds:[],rooms:[],myReviews:{},notes:[],
    tray:[3,4,10],scanned:false,coNote:'',season:0};
  var me=null, online=false;

  function errMsg(e,a,b){var c=(e&&e.code)||'E_SERVER',s=T('err.'+c,a,b);return s==='err.'+c?T('err.E_SERVER'):s}
  function notice(t,kind){return '<div class="notice'+(kind?' '+kind:'')+'" role="'+(kind==='bad'||kind==='warn'?'alert':'status')+'">'+t+'</div>'}
  function signInPrompt(){return notice(esc(T('auth.need'))+' <button class="btn ghost sm" data-goto="profile">'+esc(T('nav.signin'))+'</button>','warn')}
  function offlineNote(){return notice(esc(T('off.note')),'warn')}
  function busyBtn(b,on){if(!b)return;b.disabled=on;b.classList.toggle('busy',on)}

  /* ---------- loading data ---------- */
  function loadMine(){
    if(!me){state.loans=[];state.past=[];state.holds=[];state.rooms=[];state.myReviews={};state.notes=[];return Promise.resolve()}
    return Promise.all([Store.myLoans(),Store.myHolds(),Store.myRooms(),Store.myReviews(),Store.notifications()]).then(function(r){
      state.loans=[];state.past=[];
      r[0].forEach(function(l){
        var x={id:l.id,book:l.book_id,subject:l.subject,borrowed:new Date(l.borrowed_at),due:new Date(l.due_at),renewed:l.renewed,returned:l.returned_at?new Date(l.returned_at):null};
        if(byId(x.book))(x.returned?state.past:state.loans).push(x)});
      state.holds=r[1].filter(function(h){return byId(h.book_id)}).map(function(h){return{id:h.id,book:h.book_id,status:h.status,pos:h.queue_position}});
      state.rooms=r[2].sort(function(a,b){return a.date===b.date?a.start-b.start:(a.date<b.date?-1:1)});
      state.myReviews={};r[3].forEach(function(v){state.myReviews[v.book_id]=v});
      state.notes=r[4];
    });
  }
  function loadStats(){return Store.bookStats().then(applyStats)}
  function refresh(){
    return Promise.all([loadMine(),loadStats(),Rooms.refresh()]).catch(function(e){toast(errMsg(e),'bad')}).then(function(){updateCount();render()});
  }

  /* ---------- toasts and notifications ---------- */
  function toast(t,kind){
    var el=document.createElement('div');el.className='toast'+(kind?' '+kind:'');el.setAttribute('role','status');el.textContent=t;
    $('toasts').appendChild(el);setTimeout(function(){el.classList.add('out')},4200);setTimeout(function(){el.remove()},4800);
  }
  function noteText(n){var b=byId(n.book_id);return n.kind==='hold_ready'&&b?T('note.ready',b.t):T('note.generic')}
  function dueAlerts(){
    return state.loans.map(function(l){return{l:l,d:daysUntil(l.due)}}).filter(function(x){return x.d<=2}).map(function(x){
      var t=byId(x.l.book).t;return x.d<0?T('note.overdue',t,-x.d,-x.d*100):x.d===0?T('note.today',t):T('note.soon',t,x.d)});
  }
  function systemNotify(text){
    if(!('Notification' in window)||Notification.permission!=='granted')return;
    var o={body:text,icon:'icons/icon-192.png',badge:'icons/icon-192.png',tag:'auralib'};
    if(navigator.serviceWorker&&navigator.serviceWorker.controller)navigator.serviceWorker.ready.then(function(r){r.showNotification('AuraLib',o)});
    else try{new Notification('AuraLib',o)}catch(e){}
  }
  function onNote(n){
    state.notes.unshift(n);var t=noteText(n);toast(t);if(document.hidden)systemNotify(t);
    loadMine().then(function(){updateCount();render()});
  }
  function renderBell(){
    var unread=state.notes.filter(function(n){return !n.read}).length+dueAlerts().length,c=$('bellCount');
    c.hidden=!unread;c.textContent=unread;
  }
  function renderNotes(){
    var p=$('notePanel'),h='<div class="pophead"><strong>'+esc(T('note.title'))+'</strong><button class="iconbtn" data-close aria-label="'+esc(T('w.close'))+'">×</button></div>';
    if(!me){p.innerHTML=h+'<p class="muted">'+esc(T('note.signin'))+'</p>';return}
    var due=dueAlerts(),list=state.notes.slice(0,15);
    if(!due.length&&!list.length)h+='<p class="muted">'+esc(T('note.empty'))+'</p>';
    h+=due.map(function(t){return '<div class="nitem warn">'+esc(t)+'</div>'}).join('');
    h+=list.map(function(n){return '<div class="nitem'+(n.read?'':' unread')+'">'+esc(noteText(n))+'<small>'+esc(fmtTime(new Date(n.created_at)))+'</small></div>'}).join('');
    h+='<div class="prow" style="margin:10px 0 0">';
    if(list.some(function(n){return !n.read}))h+='<button class="btn ghost sm" data-markread>'+esc(T('note.markread'))+'</button>';
    if('Notification' in window&&Notification.permission==='default')h+='<button class="btn sm" data-allow>'+esc(T('note.allow'))+'</button>';
    if('Notification' in window&&Notification.permission==='granted')h+='<span class="muted" style="font-size:13px">'+esc(T('note.allowed'))+'</span>';
    p.innerHTML=h+'</div>';
  }
  $('bell').addEventListener('click',function(){var p=$('notePanel');p.hidden=!p.hidden;if(!p.hidden)renderNotes()});
  $('notePanel').addEventListener('click',function(e){
    if(e.target.closest('[data-close]')){$('notePanel').hidden=true;return}
    if(e.target.closest('[data-markread]')){Store.markRead().then(function(){state.notes.forEach(function(n){n.read=true});renderNotes();renderBell()}).catch(function(x){toast(errMsg(x),'bad')});return}
    if(e.target.closest('[data-allow]')){Notification.requestPermission().then(function(){renderNotes()})}
  });
  document.addEventListener('click',function(e){var p=$('notePanel');if(!p.hidden&&!e.target.closest('#notePanel')&&!e.target.closest('#bell'))p.hidden=true});

  /* ---------- navigation ---------- */
  var VIEWS=['find','top','spaces','checkout','challenge','club','smart','insights','loans','profile'];
  function setView(v){
    if(VIEWS.indexOf(v)<0)v='find';
    if(state.view==='checkout'&&v!=='checkout')stopScan();
    state.view=v;
    document.querySelectorAll('[data-pane]').forEach(function(p){p.hidden=(p.id!=='v-'+v)});
    document.querySelectorAll('[data-view]').forEach(function(b){if(b.dataset.view===v)b.setAttribute('aria-current','page');else b.removeAttribute('aria-current')});
    try{history.replaceState(null,'','#'+v)}catch(e){}
    window.scrollTo(0,0);render();
    if(v==='spaces')Rooms.refresh().then(function(){if(state.view==='spaces')renderRooms()}).catch(function(){});
  }
  document.querySelector('header.top').addEventListener('click',function(e){var b=e.target.closest('[data-view]');if(b)setView(b.dataset.view)});
  document.querySelector('main').addEventListener('click',function(e){var g=e.target.closest('[data-goto]');if(g){e.preventDefault();setView(g.dataset.goto)}});
  function updateCount(){
    var n=state.loans.length+state.holds.length+state.rooms.length,el=$('loanCount');el.hidden=!n;el.textContent=n;
    $('navProfile').textContent=me?(me.nickname||me.name.split(' ')[0]):T('nav.signin');
    renderBell();
  }

  /* ================= FIND ================= */
  function filtered(){
    var q=state.q.trim().toLowerCase();
    return BOOKS.slice().sort(function(x,y){return x.t.localeCompare(y.t)}).filter(function(b){
      if(state.subject!=='All'&&b.s!==state.subject)return false;
      if(state.avail&&!onShelf(b))return false;
      if(state.aisle&&b.aisle!==state.aisle)return false;
      if(!q)return true;
      return (b.t+' '+b.a+' '+b.s+' '+SN(b.s)+' '+b.call+' #'+b.id).toLowerCase().indexOf(q)>-1});
  }
  function renderChips(){
    $('chips').innerHTML=SUBJECTS.map(function(s){return '<button class="chip" data-s="'+esc(s)+'" aria-pressed="'+(state.subject===s)+'">'+esc(SN(s))+'</button>'}).join('')+
      '<button class="chip" data-avail aria-pressed="'+state.avail+'">'+esc(T('find.avail'))+'</button>'+
      (state.aisle?'<button class="chip" data-noaisle aria-pressed="true">'+esc(T('find.aisle',state.aisle))+' ×</button>':'');
  }
  function renderResults(){
    var list=filtered(),total=list.length;
    $('resCount').textContent=PL('n.titles',total);
    if(!total){$('results').innerHTML='<div class="empty">'+esc(state.q?T('find.none',state.q):T('find.noneFilter'))+'</div>';return}
    list=list.slice(0,state.limit);
    $('results').innerHTML=list.map(function(b){
      return '<button class="entry" data-id="'+b.id+'" aria-selected="'+(state.sel===b.id)+'">'+cover(b)+
        '<span><h3>'+esc(b.t)+'</h3><div class="by">'+esc(b.a)+', '+b.y+(b.rating?' · '+stars(b.rating)+' <span class="muted">'+b.rating.toFixed(1)+'</span>':'')+'</div>'+
        '<div class="meta"><span class="tag" data-s="'+esc(b.s)+'">'+esc(SN(b.s))+'</span><span class="mono">'+esc(b.call)+'</span><span>'+esc(T('find.loc',b.floor,b.aisle))+'</span></div></span>'+
        '<span>'+status(b)+'</span></button>'}).join('')+
      (total>list.length?'<button class="btn ghost" data-more style="margin-top:16px;align-self:flex-start">'+esc(T('find.more',Math.min(12,total-list.length)))+'</button>':'');
  }
  function renderFloors(){$('floors').innerHTML=[1,2,3].map(function(f){return '<button data-f="'+f+'" aria-pressed="'+(state.floor===f)+'">'+esc(T('find.floor',f))+'</button>'}).join('')}
  var COLW=70,X0=50;
  function aisleBox(n){var i=(n-1)%12,row=i<6?0:1,col=i%6;return{x:X0+col*COLW,y:row?190:30,w:52,h:90,row:row,cx:X0+col*COLW+26}}
  function renderMap(){
    var b=byId(state.sel),f=state.floor,svg='<rect class="fixed" x="1" y="1" width="438" height="318" rx="4"/>';
    for(var k=1;k<=12;k++){
      var n=(f-1)*12+k,a=aisleBox(n),on=b&&b.floor===f&&b.aisle===n,pick=state.aisle===n;
      svg+='<g class="aisle" data-aisle="'+n+'" tabindex="0" role="button" aria-label="'+esc(T('find.aisleShow',n))+'"><rect class="sh'+(on?' on':'')+(pick?' pick':'')+'" x="'+a.x+'" y="'+a.y+'" width="'+a.w+'" height="'+a.h+'" rx="2"/><text x="'+a.cx+'" y="'+(a.y+a.h/2+4)+'">'+n+'</text></g>';
    }
    svg+='<text class="lbl" x="22" y="140" style="text-anchor:middle" transform="rotate(-90 22 140)">'+esc(T('find.entrance'))+'</text>';
    svg+='<path class="fixed" d="M404 130 h28 v60 h-28z"/><text class="lbl" x="418" y="164">'+esc(T('find.stairs'))+'</text>';
    if(b&&b.floor===f){var a2=aisleBox(b.aisle),ey=a2.row?190:120;svg+='<path class="route" d="M10 155 H'+a2.cx+' V'+(a2.row?ey+6:ey-6)+'"/>'}
    svg+='<circle class="you" cx="10" cy="155" r="5"/>';
    $('map').innerHTML=svg;
    $('mapHint').textContent=T('find.mapHint');
    renderWhere();
  }
  function renderWhere(){
    var b=byId(state.sel),w=$('where');
    if(!b){w.innerHTML='';$('planTitle').textContent=T('find.plan');return}
    $('planTitle').textContent=b.t;
    var here=b.floor===state.floor,ln=myLoan(b.id),hd=myHold(b.id),n=onShelf(b),act='';
    if(ln)act='<span class="status ok">'+esc(T('find.onLoan',fmt(ln.due)))+'</span>';
    else if(hd&&hd.status==='ready')act='<span class="status ok">'+esc(T('find.readyPick'))+'</span><button class="btn sm" data-tray="'+b.id+'">'+esc(T('find.toDesk'))+'</button>';
    else if(hd)act='<span class="muted">'+esc(T('find.held',hd.pos))+'</span>';
    else if(n)act='<span class="muted">'+esc(T('find.takeIt'))+'</span><button class="btn ghost sm" data-tray="'+b.id+'">'+esc(T('find.toDesk'))+'</button>';
    else act='<button class="btn" data-hold="'+b.id+'">'+esc(T('find.hold'))+'</button>';
    w.innerHTML='<dl><dt>'+esc(T('find.call'))+'</dt><dd class="mono">'+esc(b.call)+'</dd><dt>'+esc(T('find.location'))+'</dt><dd>'+esc(T('find.locFull',b.floor,b.aisle,b.shelf))+'</dd>'+
      '<dt>'+esc(T('find.availability'))+'</dt><dd>'+esc(n?T('find.copies',n,b.copies):T('find.allOut',fmt(dueBack(b))))+(b.waiting?' · '+esc(PL('n.queue',b.waiting)):'')+'</dd>'+
      '<dt>'+esc(T('find.id'))+'</dt><dd class="mono">'+b.id+'</dd></dl>'+
      (here?'':'<p class="muted" style="margin:10px 0 0">'+esc(T('find.otherFloor',b.floor))+' <button class="chip" data-f="'+b.floor+'">'+esc(T('find.showFloor',b.floor))+'</button></p>')+
      '<div class="prow" style="margin:14px 0 0;align-items:center">'+act+'<button class="btn ghost sm" data-qr aria-pressed="'+state.qr+'">'+esc(T('find.qr'))+'</button></div>'+
      '<div id="whereNote"></div>'+(state.qr?'<div class="qrbox" id="qrBox"></div><p class="muted" style="font-size:13px;margin:6px 0 0">'+esc(T('find.qrHint'))+'</p>':'')+
      '<div id="revBox" class="revbox"></div>';
    if(state.qr)drawQR(b);
    renderReviews(b);
  }
  function drawQR(b){
    loadScript('https://cdn.jsdelivr.net/npm/qrcode-generator@1.4.4/qrcode.js').then(function(){
      var box=$('qrBox');if(!box||state.sel!==b.id)return;
      var qr=window.qrcode(0,'M');qr.addData('AURALIB:'+b.id);qr.make();box.innerHTML=qr.createSvgTag(4,8);
    }).catch(function(){var box=$('qrBox');if(box)box.textContent=T('err.E_NETWORK')});
  }

  /* reviews in the book panel */
  var revCache={},revDraft=null;
  function renderReviews(b){
    var box=$('revBox');if(!box)return;
    var c=revCache[b.id];
    if(!c||Date.now()-c.at>60000){
      if(!c)box.innerHTML='<h3>'+esc(T('rev.title'))+'</h3><p class="muted">'+esc(T('w.loading'))+'</p>';
      if(!Store.ok()){box.innerHTML='';return}
      Store.reviews(b.id).then(function(rows){revCache[b.id]={at:Date.now(),rows:rows};if(state.sel===b.id&&$('revBox'))renderReviews(b)}).catch(function(){});
      if(!c)return;
    }
    var rows=c.rows,mine=me&&state.myReviews[b.id],h='<h3>'+esc(T('rev.title'))+'</h3>';
    h+=b.nrev?'<p style="margin:0 0 8px">'+stars(b.rating)+' <strong>'+b.rating.toFixed(1)+'</strong> <span class="muted">· '+esc(PL('n.reviews',b.nrev))+'</span></p>':'<p class="muted" style="margin:0 0 8px">'+esc(T('rev.none'))+'</p>';
    if(me&&hasRead(b.id)){
      if(!revDraft||revDraft.book!==b.id)revDraft={book:b.id,rating:mine?mine.rating:0,body:mine?mine.body:''};
      h+='<form class="revform" id="revForm"><div class="starpick" role="radiogroup" aria-label="'+esc(T('rev.your'))+'">'+[1,2,3,4,5].map(function(i){
          return '<button type="button" role="radio" aria-checked="'+(revDraft.rating===i)+'" data-star="'+i+'" class="'+(i<=revDraft.rating?'on':'')+'" aria-label="'+i+'">★</button>'}).join('')+'</div>'+
        '<textarea id="revBody" maxlength="1000" rows="3" placeholder="'+esc(T('rev.ph'))+'">'+esc(revDraft.body)+'</textarea>'+
        '<div class="prow" style="margin:8px 0 0"><button class="btn sm" type="submit">'+esc(T(mine?'rev.update':'rev.post'))+'</button>'+(mine?'<button class="btn ghost sm" type="button" data-delrev>'+esc(T('w.delete'))+'</button>':'')+'</div></form>';
    }else if(me)h+='<p class="muted" style="font-size:13px">'+esc(T('rev.onlyReaders'))+'</p>';
    else h+='<p class="muted" style="font-size:13px">'+esc(T('rev.signin'))+'</p>';
    h+=rows.slice(0,8).map(function(r){var p=r.profiles||{};return '<div class="rev"><div>'+stars(r.rating)+' <strong>'+esc(p.nickname||'?')+'</strong> <span class="muted">· '+esc(T('team.'+(p.team||'Other')))+' · '+esc(fmt(new Date(r.created_at)))+'</span></div>'+(r.body?'<p>'+esc(r.body)+'</p>':'')+'</div>'}).join('');
    box.innerHTML=h;
  }

  $('chips').addEventListener('click',function(e){
    if(e.target.closest('[data-avail]')){state.avail=!state.avail}
    else if(e.target.closest('[data-noaisle]')){state.aisle=0;renderMap()}
    else{var c=e.target.closest('[data-s]');if(!c)return;state.subject=c.dataset.s}
    state.limit=12;renderChips();renderResults();
  });
  $('q').addEventListener('input',function(e){state.q=e.target.value;state.limit=12;renderResults()});
  $('searchForm').addEventListener('submit',function(e){e.preventDefault()});
  $('results').addEventListener('click',function(e){
    if(e.target.closest('[data-more]')){state.limit+=12;renderResults();return}
    var r=e.target.closest('[data-id]');if(!r)return;
    state.sel=+r.dataset.id;state.floor=byId(state.sel).floor;state.qr=false;revDraft=null;renderResults();renderFloors();renderMap();
    if(window.innerWidth<=900)document.querySelector('aside.plan').scrollIntoView({behavior:'smooth',block:'start'});
  });
  $('floors').addEventListener('click',function(e){var f=e.target.closest('[data-f]');if(!f)return;state.floor=+f.dataset.f;renderFloors();renderMap()});
  function pickAisle(n){state.aisle=state.aisle===n?0:n;state.limit=12;renderChips();renderResults();renderMap()}
  $('map').addEventListener('click',function(e){var g=e.target.closest('[data-aisle]');if(g)pickAisle(+g.dataset.aisle)});
  $('map').addEventListener('keydown',function(e){var g=e.target.closest('[data-aisle]');if(g&&(e.key==='Enter'||e.key===' ')){e.preventDefault();pickAisle(+g.dataset.aisle)}});
  $('where').addEventListener('click',function(e){
    var f=e.target.closest('[data-f]');if(f){state.floor=+f.dataset.f;renderFloors();renderMap();return}
    if(e.target.closest('[data-qr]')){state.qr=!state.qr;renderWhere();return}
    var t=e.target.closest('[data-tray]');if(t){addToTray(+t.dataset.tray);setView('checkout');return}
    var st=e.target.closest('[data-star]');if(st){revDraft.rating=+st.dataset.star;revDraft.body=$('revBody').value;renderReviews(byId(state.sel));return}
    if(e.target.closest('[data-delrev]')){
      var bid=state.sel;Store.deleteReview(bid).then(function(){delete state.myReviews[bid];delete revCache[bid];revDraft=null;return loadStats()}).then(function(){toast(T('rev.deleted'));renderWhere();renderResults()}).catch(function(x){toast(errMsg(x),'bad')});return}
    var h=e.target.closest('[data-hold]');if(!h)return;
    if(!me){$('whereNote').innerHTML=signInPrompt();return}
    busyBtn(h,true);
    Store.placeHold(+h.dataset.hold).then(function(pos){toast(T('find.holdOk',pos));return refresh()}).catch(function(x){busyBtn(h,false);$('whereNote').innerHTML=notice(esc(errMsg(x)),'bad')});
  });
  $('where').addEventListener('submit',function(e){
    e.preventDefault();var bid=state.sel,body=$('revBody').value.trim();
    if(!revDraft||!revDraft.rating){toast(T('rev.pickStars'),'warn');return}
    var btn=e.target.querySelector('[type=submit]');busyBtn(btn,true);
    Store.saveReview(bid,revDraft.rating,body).then(function(){state.myReviews[bid]={book_id:bid,rating:revDraft.rating,body:body};delete revCache[bid];return loadStats()})
      .then(function(){toast(T('rev.saved'));renderWhere();renderResults()}).catch(function(x){busyBtn(btn,false);toast(errMsg(x),'bad')});
  });

  /* ================= STUDY ROOMS ================= */
  var ROOMS=[
    {id:'R1',n:'3.01',seats:4,eq:['wb'],f:3},{id:'R2',n:'3.02',seats:4,eq:['scr'],f:3},{id:'R3',n:'3.05',seats:8,eq:['scr','wb'],f:3},
    {id:'R4',n:'2.A',seats:1,eq:['sil'],f:2,pod:1},{id:'R5',n:'2.B',seats:1,eq:['sil'],f:2,pod:1}];
  var HOURS=[9,10,11,12,13,14,15,16,17,18,19];
  function roomName(r){return T(r.pod?'room.pod':'room.room',r.n)}
  function roomDesc(r){return PL('n.seats',r.seats)+', '+r.eq.map(function(k){return T('eq.'+k)}).join(', ')+', '+T('room.floor',r.f)}
  function roomById(id){return ROOMS.filter(function(x){return x.id===id})[0]}
  var Rooms=(function(){
    var OPEN=9,CLOSE=20,MAX=3,AHEAD=7,busy={},at=0;
    function k(r,d,h){return r+'|'+d+'|'+h}
    function refresh(){return Store.busy(iso(addDays(0)),iso(addDays(AHEAD))).then(function(rows){busy={};rows.forEach(function(x){busy[k(x.room,x.day,x.hour)]=x.mine?'me':'x'});at=Date.now()})}
    function isBusy(r,d,h){return !!busy[k(r,d,h)]}
    function isMine(r,d,h){return busy[k(r,d,h)]==='me'}
    function mineAt(d,h){return ROOMS.some(function(r){return isMine(r.id,d,h)})}
    function hoursOn(d){var n=0;for(var key in busy)if(busy[key]==='me'&&key.split('|')[1]===d)n++;return n}
    /* Client pre-check for instant feedback; book_room() in the database enforces the same rules. */
    function check(room,date,s,e){
      var dd=Math.round((new Date(date+'T00:00:00')-addDays(0))/DAY),h;
      if(!me)return 'E_AUTH';
      if(s<OPEN||e>CLOSE||e<=s)return 'E_HOURS';
      if(e-s>MAX)return 'E_DURATION';
      if(dd<0||(dd===0&&s<=new Date().getHours()))return 'E_PAST';
      if(dd>AHEAD)return 'E_AHEAD';
      for(h=s;h<e;h++){if(mineAt(date,h))return 'E_SELF';if(isBusy(room,date,h))return 'E_CONFLICT'}
      if(hoursOn(date)+(e-s)>MAX)return 'E_DAILY';
      return null;
    }
    return{refresh:refresh,isBusy:isBusy,isMine:isMine,mineAt:mineAt,hoursOn:hoursOn,check:check,updated:function(){return at},limits:{open:OPEN,close:CLOSE,maxHours:MAX,maxAhead:AHEAD}};
  })();
  function curDate(){return iso(addDays(state.day))}
  function renderDays(){var o='';for(var i=0;i<5;i++)o+='<button class="chip" data-day="'+i+'" aria-pressed="'+(state.day===i)+'">'+esc(i===0?T('w.today'):fmtLong(addDays(i)))+'</button>';$('days').innerHTML=o}
  function renderRooms(){
    var now=new Date().getHours(),d=curDate();
    $('liveRooms').innerHTML=online?'<span class="live">'+esc(T('spaces.live'))+'</span>':'';
    $('rooms').innerHTML=ROOMS.map(function(r){
      var s=HOURS.map(function(h){
        var past=state.day===0&&h<=now,mine=Rooms.isMine(r.id,d,h),busy=Rooms.isBusy(r.id,d,h)||past;
        var sel=state.pick&&state.pick.room===r.id&&state.pick.hours.indexOf(h)>-1;
        return '<button class="slot'+(mine?' mine':'')+'" data-room="'+r.id+'" data-h="'+h+'" '+(busy?'disabled ':'')+'aria-pressed="'+!!sel+'" title="'+esc(mine?T('spaces.yours'):busy?T('spaces.taken'):T('spaces.free'))+'">'+hh(h)+'</button>'}).join('');
      return '<div class="room"><div><h3>'+esc(roomName(r))+'</h3><p>'+esc(roomDesc(r))+'</p></div><div class="slots">'+s+'</div></div>'}).join('');
    var bar=$('spaceBar');
    if(state.pick&&state.pick.hours.length){
      var hs=state.pick.hours.slice().sort(function(a,b){return a-b});bar.hidden=false;
      $('spaceSummary').innerHTML=esc(T('spaces.summary',roomName(roomById(state.pick.room)),dayLabel(d),hh(hs[0]),hh(hs[hs.length-1]+1),hs.length))+
        '<span class="sub">'+esc(T('spaces.left',Rooms.limits.maxHours-Rooms.hoursOn(d)))+'</span>';
    }else bar.hidden=true;
  }
  $('days').addEventListener('click',function(e){var d=e.target.closest('[data-day]');if(!d)return;state.day=+d.dataset.day;state.pick=null;$('spaceNote').innerHTML='';renderDays();renderRooms()});
  $('rooms').addEventListener('click',function(e){
    var s=e.target.closest('.slot');if(!s||s.disabled)return;
    var room=s.dataset.room,h=+s.dataset.h,d=curDate();$('spaceNote').innerHTML='';
    if(!Store.ok()){$('spaceNote').innerHTML=offlineNote();return}
    if(!me){$('spaceNote').innerHTML=signInPrompt();return}
    if(Rooms.isMine(room,d,h))return;
    var left=Rooms.limits.maxHours-Rooms.hoursOn(d);
    if(left<=0){$('spaceNote').innerHTML=notice(esc(T('spaces.full',Rooms.limits.maxHours)),'warn');return}
    if(!state.pick||state.pick.room!==room)state.pick={room:room,hours:[h]};
    else{
      var hs=state.pick.hours,i=hs.indexOf(h);
      if(i>-1)hs.splice(i,1);
      else{
        var min=Math.min.apply(null,hs),max=Math.max.apply(null,hs);
        if(h===min-1||h===max+1){if(hs.length>=left)$('spaceNote').innerHTML=notice(esc(T('spaces.canHold',left,Rooms.limits.maxHours)),'warn');else hs.push(h)}
        else state.pick={room:room,hours:[h]};
      }
    }
    renderRooms();
  });
  $('confirmRoom').addEventListener('click',function(){
    var p=state.pick;if(!p||!p.hours.length)return;
    var hs=p.hours.slice().sort(function(a,b){return a-b}),d=curDate(),s=hs[0],e=hs[hs.length-1]+1,rm=roomById(p.room),btn=this;
    var pre=Rooms.check(p.room,d,s,e);
    if(pre){$('spaceNote').innerHTML=notice('<strong>'+esc(T('spaces.couldNot'))+'</strong> '+esc(errMsg({code:pre},Rooms.hoursOn(d),Rooms.limits.maxHours)),'bad');return}
    busyBtn(btn,true);
    Store.bookRoom(p.room,d,s,e).then(function(code){
      $('spaceNote').innerHTML=notice(esc(T('spaces.ok',roomName(rm),dayLabel(d),hh(s),hh(e)))+' <strong class="mono">'+esc(code)+'</strong>. <button class="btn ghost sm" data-goto="loans">'+esc(T('spaces.view'))+'</button>');
      state.pick=null;Store.pingRooms();
    },function(x){
      $('spaceNote').innerHTML=notice('<strong>'+esc(T('spaces.couldNot'))+'</strong> '+esc(errMsg(x,Rooms.hoursOn(d),Rooms.limits.maxHours)),'bad');
      if(x.code==='E_CONFLICT'||x.code==='E_PAST')state.pick=null;
    }).then(function(){busyBtn(btn,false);return refresh()});
  });

  /* ================= SELF-CHECKOUT ================= */
  function trayBooks(){return state.tray.filter(function(id){return !myLoan(id)}).map(byId).filter(Boolean)}
  function addToTray(id){if(state.tray.indexOf(id)<0)state.tray.push(id);state.scanned=false}
  function renderCheckout(){
    var t=trayBooks(),h='';
    $('deskState').textContent=t.length?T('co.onDesk',PL('n.books',t.length)):T('co.empty');
    $('deskStack').innerHTML=t.slice(0,6).map(function(b,i){return '<i style="height:'+(44+(i*7)%22)+'px;background:'+b.c+'"></i>'}).join('');
    $('scanBtn').disabled=!t.length;
    if(state.scanned&&t.length){
      var ok=t.filter(canBorrow);
      h='<div class="tablewrap"><table><thead><tr><th>'+esc(T('co.title'))+'</th><th>'+esc(T('co.tag'))+'</th><th>'+esc(T('co.due'))+'</th><th></th></tr></thead><tbody>'+
        t.map(function(b){var can=canBorrow(b);return '<tr><td><strong class="serif">'+esc(b.t)+'</strong><div class="muted" style="font-size:13px">'+esc(b.a)+'</div></td><td class="mono">E280 1160 '+(6000+b.id*137)+'</td><td class="num">'+(can?esc(fmt(addDays(21))):'<span class="status out">'+esc(T('co.noCopy'))+'</span>')+'</td><td><button class="btn ghost sm" data-untray="'+b.id+'" aria-label="'+esc(T('co.remove'))+'">×</button></td></tr>'}).join('')+
        '</tbody></table></div><div class="prow" style="margin-top:16px;align-items:center"><button class="btn" id="borrowBtn"'+(ok.length?'':' disabled')+'>'+esc(T('co.borrow',PL('n.books',ok.length)))+'</button><span class="muted">'+esc(T('co.period'))+'</span></div>';
    }else if(t.length){
      h='<div class="traylist">'+t.map(function(b){return '<span class="trayitem">'+esc(b.t)+' <button class="iconbtn" data-untray="'+b.id+'" aria-label="'+esc(T('co.remove'))+'">×</button></span>'}).join('')+'</div>';
    }
    $('scanOut').innerHTML=state.coNote+h;
  }
  $('scanBtn').addEventListener('click',function(){
    var b=$('scanBtn');b.disabled=true;b.textContent=T('co.reading');$('scanOut').innerHTML='';
    setTimeout(function(){b.textContent=T('co.read');state.scanned=true;state.coNote='';renderCheckout()},700);
  });
  $('v-checkout').addEventListener('click',function(e){
    var u=e.target.closest('[data-untray]');if(u){state.tray=state.tray.filter(function(x){return x!==+u.dataset.untray});renderCheckout();return}
    if(!e.target.closest('#borrowBtn'))return;
    if(!Store.ok()){state.coNote=offlineNote();renderCheckout();return}
    if(!me){state.coNote=signInPrompt();renderCheckout();return}
    var list=trayBooks().filter(canBorrow),done=[],failed=[];busyBtn($('borrowBtn'),true);
    list.reduce(function(p,b){return p.then(function(){return Store.borrow(b.id,b.s,onShelf(b)).then(function(){done.push(b)},function(x){failed.push(esc(b.t)+': '+esc(errMsg(x)))})})},Promise.resolve())
      .then(function(){
        state.tray=state.tray.filter(function(id){return !done.some(function(b){return b.id===id})});state.scanned=false;
        state.coNote=(done.length?notice(esc(T('co.done',PL('n.books',done.length),fmt(addDays(21))))+' <button class="btn ghost sm" data-goto="loans">'+esc(T('nav.loans'))+'</button>'):'')+(failed.length?notice(failed.join('<br>'),'bad'):'');
        return refresh();
      });
  });

  /* camera scanner: QR codes "AURALIB:<id>", plain book IDs or call numbers */
  var scanner=null,lastCode='',lastAt=0;
  function findCode(txt){
    var s=String(txt).trim(),m=s.match(/^AURALIB:(\d+)$/i)||s.match(/^#?(\d{1,4})$/);
    if(m&&byId(+m[1]))return byId(+m[1]);
    var low=s.toLowerCase();return BOOKS.filter(function(b){return b.call.toLowerCase()===low})[0]||null;
  }
  function gotCode(txt){
    var now=Date.now();if(txt===lastCode&&now-lastAt<2500)return;lastCode=txt;lastAt=now;
    var b=findCode(txt);
    if(!b){$('scanMsg').innerHTML=notice(esc(T('co.unknown',txt)),'warn');return}
    addToTray(b.id);if(navigator.vibrate)navigator.vibrate(60);
    $('scanMsg').innerHTML=notice(esc(T('co.added',b.t)));renderCheckout();
  }
  function startScan(){
    $('scanWrap').hidden=false;$('scanMsg').innerHTML=notice(esc(T('co.camStarting')));
    loadScript('https://cdn.jsdelivr.net/npm/html5-qrcode@2.3.8/html5-qrcode.min.js').then(function(){
      scanner=new window.Html5Qrcode('reader');
      return scanner.start({facingMode:'environment'},{fps:10,qrbox:{width:220,height:220}},gotCode,function(){});
    }).then(function(){$('scanMsg').innerHTML=notice(esc(T('co.camReady')))}).catch(function(x){
      scanner=null;$('scanMsg').innerHTML=notice(esc(T('co.camFail'))+(x&&x.name?' ('+esc(x.name)+')':''),'warn');
    });
  }
  function stopScan(){if(scanner){var s=scanner;scanner=null;s.stop().then(function(){s.clear()}).catch(function(){})}$('scanWrap').hidden=true}
  $('camBtn').addEventListener('click',function(){if(scanner||!$('scanWrap').hidden)stopScan();else startScan()});
  $('stopCam').addEventListener('click',stopScan);
  $('manualForm').addEventListener('submit',function(e){
    e.preventDefault();var v=$('manualCode').value.trim();if(!v)return;
    var b=findCode(v);
    if(!b){$('manualMsg').innerHTML=notice(esc(T('co.unknown',v)),'warn');return}
    addToTray(b.id);$('manualCode').value='';$('manualMsg').innerHTML=notice(esc(T('co.added',b.t)));renderCheckout();
  });

  /* ================= MY ACCOUNT ================= */
  var acNote='';
  function renderLoans(){
    var box=$('loansBox'),h=acNote;
    if(!Store.ok()){box.innerHTML=offlineNote();return}
    if(!me){box.innerHTML=signInPrompt();return}
    h='<p class="lede">'+esc(T('ac.signedAs',me.name,me.studentId))+'</p>'+h;
    var al=dueAlerts();if(al.length)h+=notice('<strong>'+esc(T('ac.headsUp'))+'</strong> '+esc(al.join(' · ')),'warn');
    h+='<h2>'+esc(T('ac.onLoan'))+'</h2>';
    h+=state.loans.length?'<div class="tablewrap" style="margin-bottom:32px"><table><thead><tr><th>'+esc(T('co.title'))+'</th><th>'+esc(T('co.due'))+'</th><th></th></tr></thead><tbody>'+state.loans.map(function(l){
      var b=byId(l.book),d=daysUntil(l.due);
      return '<tr><td><strong class="serif">'+esc(b.t)+'</strong><div class="mono muted">'+esc(b.call)+'</div></td>'+
        '<td class="num"><span class="'+(d<=5?'due-soon':'')+'">'+esc(fmt(l.due))+'</span><div class="muted" style="font-size:13px">'+esc(d<0?T('ac.overdue',-d):PL('n.daysLeft',d))+'</div></td>'+
        '<td><div class="prow" style="margin:0;gap:6px">'+(l.renewed>=2?'<span class="muted" style="font-size:13px">'+esc(T('ac.renewMax'))+'</span>':'<button class="btn ghost sm" data-renew="'+l.id+'">'+esc(T('ac.renew'))+'</button>')+
        '<button class="btn sm" data-return="'+l.id+'">'+esc(T('ac.return'))+'</button></div></td></tr>'}).join('')+'</tbody></table></div>'
      :'<div class="empty">'+esc(T('ac.noLoans'))+'</div>';
    h+='<h2>'+esc(T('ac.holdsRooms'))+'</h2>';
    var rr=state.holds.map(function(x){var b=byId(x.book);return '<tr><td><strong class="serif">'+esc(b.t)+'</strong></td><td>'+(x.status==='ready'?'<span class="status ok">'+esc(T('ac.holdReady'))+'</span>':esc(T('ac.holdPos',x.pos)))+'</td><td><div class="prow" style="margin:0;gap:6px">'+(x.status==='ready'?'<button class="btn sm" data-tray="'+x.book+'">'+esc(T('find.toDesk'))+'</button>':'')+'<button class="btn ghost sm" data-unhold="'+x.id+'">'+esc(T('ac.cancelHold'))+'</button></div></td></tr>'}).join('')+
      state.rooms.map(function(r){var rm=roomById(r.room);return '<tr><td><strong>'+esc(rm?roomName(rm):r.room)+'</strong><div class="mono muted">'+esc(r.code)+'</div></td><td class="num">'+esc(fmtLong(new Date(r.date+'T00:00:00'))+', '+hh(r.start)+'–'+hh(r.end))+'</td><td><button class="btn ghost sm" data-cancelroom="'+esc(r.code)+'">'+esc(T('w.cancel'))+'</button></td></tr>'}).join('');
    h+=rr?'<div class="tablewrap" style="margin-bottom:32px"><table><thead><tr><th>'+esc(T('ac.item'))+'</th><th>'+esc(T('ac.details'))+'</th><th></th></tr></thead><tbody>'+rr+'</tbody></table></div>':'<div class="empty">'+esc(T('ac.noHolds'))+'</div>';
    h+='<h2>'+esc(T('ac.history'))+'</h2>';
    h+=state.past.length?'<div class="tablewrap"><table><thead><tr><th>'+esc(T('co.title'))+'</th><th>'+esc(T('ac.read'))+'</th><th></th></tr></thead><tbody>'+state.past.slice(0,15).map(function(l){
      var b=byId(l.book),rv=state.myReviews[l.book];
      return '<tr><td><strong class="serif">'+esc(b.t)+'</strong><div class="muted" style="font-size:13px">'+esc(b.a)+'</div></td><td class="num">'+esc(fmt(l.borrowed)+' – '+fmt(l.returned))+'</td><td>'+(rv?stars(rv.rating):'<button class="btn ghost sm" data-rate="'+l.book+'">'+esc(T('ac.rate'))+'</button>')+'</td></tr>'}).join('')+'</tbody></table></div>'
      :'<div class="empty">'+esc(T('ac.noHistory'))+'</div>';
    box.innerHTML=h;
  }
  $('loansBox').addEventListener('click',function(e){
    var el,act=null;
    if((el=e.target.closest('[data-renew]')))act=Store.renew(+el.dataset.renew).then(function(d){acNote=notice(esc(T('ac.renewed',fmt(new Date(d)))))});
    else if((el=e.target.closest('[data-return]')))act=Store.returnLoan(+el.dataset.return).then(function(){acNote=notice(esc(T('ac.returned')))});
    else if((el=e.target.closest('[data-unhold]')))act=Store.cancelHold(+el.dataset.unhold).then(function(){acNote=notice(esc(T('ac.holdCancelled')))});
    else if((el=e.target.closest('[data-cancelroom]')))act=Store.cancelRoom(el.dataset.cancelroom).then(function(){acNote=notice(esc(T('ac.roomCancelled')));Store.pingRooms()});
    else if((el=e.target.closest('[data-tray]'))){addToTray(+el.dataset.tray);setView('checkout');return}
    else if((el=e.target.closest('[data-rate]'))){state.sel=+el.dataset.rate;state.floor=byId(state.sel).floor;revDraft=null;setView('find');return}
    if(!act)return;
    busyBtn(el,true);
    act.catch(function(x){acNote=notice(esc(errMsg(x)),'bad')}).then(refresh);
  });

  /* ================= PROFILE, SIGN-IN, READING STATS ================= */
  var TEAMS=['Software Engineering','Computer Science','Cybersecurity','Big Data Analysis','Media Technologies','IT Management','Smart Technologies','Other'];
  var authTab='login',fails=0,lockUntil=0,profNote='';
  function fld(id,label,type,extra,hint){return '<div class="fld"><label for="'+id+'">'+esc(label)+'</label><input id="'+id+'" name="'+id+'" type="'+type+'" '+(extra||'')+'>'+(hint?'<small>'+esc(hint)+'</small>':'')+'</div>'}
  function teamSelect(id,cur){return '<div class="fld"><label for="'+id+'">'+esc(T('pf.team'))+'</label><select id="'+id+'">'+TEAMS.map(function(t){return '<option value="'+esc(t)+'"'+(t===cur?' selected':'')+'>'+esc(T('team.'+t))+'</option>'}).join('')+'</select><small>'+esc(T('pf.teamHint'))+'</small></div>'}
  function checkName(n){return n.trim().length<2?T('v.name'):''}
  function checkNick(n){return (n.trim().length<2||n.trim().length>24)?T('v.nick'):''}
  function checkEmail(m){return /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/.test(m.trim())?'':T('v.email')}
  function checkPw(p){return (p.length<8||!/[A-Za-z]/.test(p)||!/\d/.test(p))?T('v.pw'):''}

  function semesterStart(){var d=new Date(),m=d.getMonth(),y=d.getFullYear();return m>=8?new Date(y,8,1):m===0?new Date(y-1,8,1):new Date(y,1,1)}
  /* The same counting rule as counted_reads() in the database: each book once a month, max 3 a day. */
  function countedIn(month){
    var from=month.getTime(),to=new Date(month.getFullYear(),month.getMonth()+1,1).getTime(),seen={},perDay={};
    return state.past.slice().sort(function(a,b){return a.returned-b.returned}).filter(function(l){
      var t=l.returned.getTime();if(t<from||t>=to||seen[l.book])return false;
      var d=iso(l.returned);if((perDay[d]||0)>=3)return false;seen[l.book]=1;perDay[d]=(perDay[d]||0)+1;return true});
  }
  function points(list){var s={};list.forEach(function(l){s[l.subject]=1});return list.length*10+Object.keys(s).length*5}
  function readingStats(){
    var r=state.past,books={},subj={},ca=0,classic=false,weeks={};
    r.forEach(function(l){var b=byId(l.book);books[l.book]=1;subj[l.subject]=(subj[l.subject]||0)+1;if(l.subject==='Central Asia')ca++;if(b&&b.y<1900)classic=true;weeks[weekOf(l.returned).getTime()]=1});
    var ws=Object.keys(weeks).map(Number).sort(function(a,b){return a-b}),best=0,cur=0,prev=null;
    ws.forEach(function(w){cur=(prev!==null&&Math.round((w-prev)/DAY)===7)?cur+1:1;best=Math.max(best,cur);prev=w});
    var sem=semesterStart();
    return{n:Object.keys(books).length,loans:r.length,subjects:Object.keys(subj).length,bySubj:subj,ca:ca,classic:classic,streak:best,
      reviews:Object.keys(state.myReviews).length,sem:r.filter(function(l){return l.returned>=sem}).length};
  }
  var BADGES=[
    ['first','📖',function(s){return s.n>=1}],['five','📚',function(s){return s.n>=5}],['ten','🏅',function(s){return s.n>=10}],['quarter','🏆',function(s){return s.n>=25}],
    ['explorer','🧭',function(s){return s.subjects>=5}],['steppe','🐎',function(s){return s.ca>=3}],['classic','🕯️',function(s){return s.classic}],
    ['streak','🔥',function(s){return s.streak>=4}],['critic','✍️',function(s){return s.reviews>=3}]];
  function badgesHtml(s){
    return '<div class="badges">'+BADGES.map(function(b){var on=b[2](s);return '<div class="bdg'+(on?' on':'')+'" title="'+esc(T('bdg.'+b[0]+'.d'))+'"><span class="bi" aria-hidden="true">'+b[1]+'</span><strong>'+esc(T('bdg.'+b[0]))+'</strong><small>'+esc(T('bdg.'+b[0]+'.d'))+'</small>'+(on?'':'<span class="lock">'+esc(T('bdg.locked'))+'</span>')+'</div>'}).join('')+'</div>';
  }
  function vbars(rows,label){
    var W=440,H=150,max=Math.max(1,Math.max.apply(null,rows.map(function(r){return r.v}))),bw=W/rows.length;
    var s='<svg class="chart" viewBox="0 0 '+W+' '+(H+34)+'" role="img" aria-label="'+esc(label)+'">';
    rows.forEach(function(r,i){var h=Math.round(r.v/max*H),x=i*bw+bw*.2,w=bw*.6;
      s+='<rect x="'+x+'" y="'+(H-h+10)+'" width="'+w+'" height="'+Math.max(h,1)+'" rx="2" style="fill:var(--accent)"/><text x="'+(x+w/2)+'" y="'+(H-h+4)+'" text-anchor="middle" font-size="12" style="fill:var(--ink)">'+r.v+'</text><text x="'+(x+w/2)+'" y="'+(H+28)+'" text-anchor="middle" font-size="11" style="fill:var(--muted)">'+esc(r.l)+'</text>'});
    return s+'</svg>';
  }
  function hbar(rows,color,label,unit){
    var H=rows.length*24+26,max=unit==='%'?100:Math.max(1,Math.max.apply(null,rows.map(function(r){return r.v}))),s='<svg class="chart" viewBox="0 0 460 '+H+'" style="max-width:600px" role="img" aria-label="'+esc(label)+'">';
    rows.forEach(function(r,i){var y=i*24+4,w=Math.round(r.v/max*240);
      s+='<text x="0" y="'+(y+14)+'" font-size="12" style="fill:var(--ink)">'+esc(r.l)+'</text><rect x="160" y="'+y+'" width="'+w+'" height="18" rx="2" fill="'+color+'"/><text x="'+(166+w)+'" y="'+(y+14)+'" font-size="12" style="fill:var(--ink)">'+r.v+(unit||'')+'</text>'});
    return s+'<text x="160" y="'+(H-4)+'" font-size="11" style="fill:var(--muted)">'+esc(label)+'</text></svg>';
  }
  function renderProfile(){
    var el=$('profileBox'),h='';
    if(!Store.ok()){el.innerHTML=offlineNote();return}
    if(!me){
      h='<div class="authtabs" role="group"><button class="chip" data-tab="login" aria-pressed="'+(authTab==='login')+'">'+esc(T('nav.signin'))+'</button><button class="chip" data-tab="reg" aria-pressed="'+(authTab==='reg')+'">'+esc(T('auth.register'))+'</button></div><div id="profNote">'+profNote+'</div>';
      if(authTab==='login')h+='<form class="authform" id="fLogin" novalidate>'+fld('lEmail',T('pf.email'),'email','autocomplete="username"')+fld('lPw',T('pf.pw'),'password','autocomplete="current-password"')+'<div class="prow"><button class="btn" type="submit">'+esc(T('nav.signin'))+'</button></div></form>';
      else h+='<form class="authform" id="fReg" novalidate>'+fld('rName',T('pf.name'),'text','autocomplete="name"')+fld('rEmail',T('pf.uniEmail'),'email','autocomplete="email"')+
        fld('rId',T('pf.sid'),'text','placeholder="24-1187" inputmode="numeric"',T('pf.sidHint'))+fld('rNick',T('pf.nick'),'text','maxlength="24" autocomplete="nickname"',T('pf.nickHint'))+teamSelect('rTeam','Other')+
        fld('rPw',T('pf.pw'),'password','autocomplete="new-password"',T('pf.pwHint'))+fld('rPw2',T('pf.pw2'),'password','autocomplete="new-password"')+'<button class="btn" type="submit">'+esc(T('auth.create'))+'</button></form>';
      el.innerHTML=h;return;
    }
    var s=readingStats(),goal=me.goal||10,pc=Math.min(100,Math.round(s.sem/goal*100)),today=iso(new Date());
    var months=[5,4,3,2,1,0].map(function(i){var m=monthStart(-i),n=state.past.filter(function(l){return l.returned>=m&&l.returned<monthStart(-i+1)}).length;return{l:m.toLocaleDateString(LOCALE[LANG],{month:'short'}),v:n}});
    var subj=Object.keys(s.bySubj).map(function(k){return{l:SN(k),v:s.bySubj[k]}}).sort(function(a,b){return b.v-a.v});
    h='<div id="profNote">'+profNote+'</div><h2>'+esc(me.name)+' <span class="muted" style="font-weight:400;font-size:16px">@'+esc(me.nickname)+'</span></h2><p class="muted" style="margin:4px 0 0">'+esc(T('pf.meta',me.studentId,me.email,T('team.'+me.team),fmt(me.created)))+'</p>'+
      '<div class="stats"><div class="stat"><b>'+state.loans.length+'</b><span>'+esc(T('pf.sLoans'))+'</span></div><div class="stat"><b>'+s.n+'</b><span>'+esc(T('pf.sRead'))+'</span></div><div class="stat"><b>'+state.holds.length+'</b><span>'+esc(T('pf.sHolds'))+'</span></div><div class="stat"><b>'+Rooms.hoursOn(today)+' / '+Rooms.limits.maxHours+'</b><span>'+esc(T('pf.sRoom'))+'</span></div></div>'+
      '<h2>'+esc(T('pf.myReading'))+'</h2><div class="goal"><div class="goalhead"><span>'+esc(T('pf.goal',s.sem,goal))+'</span><strong>'+pc+'%</strong></div><div class="pbar big"><i style="width:'+Math.max(2,pc)+'%"></i></div><small class="muted">'+esc(T('pf.goalHint',fmt(semesterStart())))+'</small></div>'+
      '<div class="twocol"><div><h3>'+esc(T('pf.byMonth'))+'</h3>'+vbars(months,T('pf.byMonth'))+'</div><div><h3>'+esc(T('pf.byGenre'))+'</h3>'+(subj.length?hbar(subj,'#2F6F73',T('pf.byGenreAx')):'<div class="empty">'+esc(T('pf.noReads'))+'</div>')+'</div></div>'+
      '<h3>'+esc(T('pf.badges'))+' <span class="muted" style="font-weight:400">'+BADGES.filter(function(b){return b[2](s)}).length+' / '+BADGES.length+'</span></h3>'+badgesHtml(s)+
      '<h2 style="margin-top:32px">'+esc(T('pf.edit'))+'</h2><form class="authform" id="fEdit" novalidate>'+fld('eName',T('pf.name'),'text','value="'+esc(me.name)+'"')+fld('eNick',T('pf.nick'),'text','maxlength="24" value="'+esc(me.nickname)+'"')+teamSelect('eTeam',me.team)+
        fld('eGoal',T('pf.goalField'),'number','min="1" max="200" value="'+goal+'"')+fld('eEmail',T('pf.email'),'email','value="'+esc(me.email)+'"')+
        '<label class="check"><input type="checkbox" id="ePublic"'+(me.public?' checked':'')+'> '+esc(T('pf.public'))+'</label><button class="btn" type="submit">'+esc(T('pf.save'))+'</button></form>'+
      '<h3>'+esc(T('pf.changePw'))+'</h3><form class="authform" id="fPw" novalidate>'+fld('pOld',T('pf.oldPw'),'password','autocomplete="current-password"')+fld('pNew',T('pf.newPw'),'password','autocomplete="new-password"',T('pf.pwHint'))+'<button class="btn" type="submit">'+esc(T('pf.updatePw'))+'</button></form>'+
      '<div class="prow" style="margin-top:20px"><button class="btn" data-logout>'+esc(T('pf.signout'))+'</button><button class="btn ghost" data-delacc>'+esc(T('pf.delete'))+'</button></div>';
    el.innerHTML=h;
  }
  $('profileBox').addEventListener('click',function(e){
    var t=e.target.closest('[data-tab]');if(t){authTab=t.dataset.tab;profNote='';renderProfile();return}
    if(e.target.closest('[data-logout]')){Store.signOut().then(function(){setMe(null);profNote=notice(esc(T('pf.signedOut')));authTab='login';renderProfile()});return}
    if(e.target.closest('[data-delacc]')){
      if(!confirm(T('pf.deleteConfirm')))return;
      Store.deleteAccount().then(function(){setMe(null);profNote=notice(esc(T('pf.deleted')));renderProfile()}).catch(function(x){profNote=notice(esc(errMsg(x)),'bad');renderProfile()});
    }
  });
  /* Errors keep what the user typed: only the wrong fields are cleared and marked, nothing is re-rendered. */
  var ERR_FIELDS={fLogin:{E_LOGIN:['lPw'],E_CONFIRM:[]},fReg:{E_EMAIL_TAKEN:['rEmail'],E_ID_TAKEN:['rId'],E_PW_WEAK:['rPw','rPw2']},fPw:{E_OLD_PW:['pOld'],E_PW_WEAK:['pNew']},fEdit:{E_EMAIL_TAKEN:['eEmail']}};
  function formErr(form,msg,ids){
    $('profNote').innerHTML=notice(esc(msg),'bad');
    form.querySelectorAll('[aria-invalid]').forEach(function(x){x.removeAttribute('aria-invalid')});
    (ids||[]).forEach(function(i,k){var f=$(i);if(!f)return;f.value='';f.setAttribute('aria-invalid','true');if(!k)f.focus()});
    busyBtn(form.querySelector('[type=submit]'),false);
    $('profNote').scrollIntoView({block:'nearest'});
  }
  /* checks: [[fieldIds, message or '']]; returns the first failing pair */
  function firstErr(checks){for(var i=0;i<checks.length;i++)if(checks[i][1])return checks[i];return null}
  $('profileBox').addEventListener('input',function(e){if(e.target.getAttribute('aria-invalid'))e.target.removeAttribute('aria-invalid')});
  $('profileBox').addEventListener('submit',function(e){
    e.preventDefault();var form=e.target,id=form.id,v=function(i){return $(i).value},er,btn=form.querySelector('[type=submit]');
    function done(msg){profNote=notice(esc(msg));renderProfile()}
    function fail(x){formErr(form,errMsg(x),(ERR_FIELDS[id]||{})[x&&x.code])}
    if(id==='fLogin'){
      if(Date.now()<lockUntil)return formErr(form,T('auth.locked',Math.ceil((lockUntil-Date.now())/1000)));
      er=firstErr([[['lEmail'],v('lEmail').trim()?'':T('auth.enter')],[['lPw'],v('lPw')?'':T('auth.enter')]]);
      if(er)return formErr(form,er[1],er[0]);
      busyBtn(btn,true);
      Store.signIn(v('lEmail').trim().toLowerCase(),v('lPw')).then(function(u){fails=0;setMe(u);done(T('auth.welcome',u.nickname||u.name))},
        function(x){fails++;if(fails>=5){lockUntil=Date.now()+30000;fails=0}fail(x)});
      return;
    }
    if(id==='fReg'){
      er=firstErr([[['rName'],checkName(v('rName'))],[['rEmail'],checkEmail(v('rEmail'))],[['rId'],/^\d{2}-\d{4}$/.test(v('rId').trim())?'':T('v.sid')],
        [['rNick'],checkNick(v('rNick'))],[['rPw','rPw2'],checkPw(v('rPw'))],[['rPw2'],v('rPw')!==v('rPw2')?T('v.match'):'']]);
      if(er)return formErr(form,er[1],er[0]);
      busyBtn(btn,true);
      Store.signUp({name:v('rName').trim(),email:v('rEmail').trim().toLowerCase(),studentId:v('rId').trim(),nickname:v('rNick').trim(),team:v('rTeam'),pw:v('rPw')}).then(function(r){
        if(r.confirm){authTab='login';done(T('auth.confirm'))}else{setMe(r.user);done(T('auth.created'))}
      },fail);
      return;
    }
    if(id==='fEdit'){
      var goal=parseInt(v('eGoal'),10);
      er=firstErr([[['eName'],checkName(v('eName'))],[['eNick'],checkNick(v('eNick'))],[['eGoal'],(goal>=1&&goal<=200)?'':T('v.goal')],[['eEmail'],checkEmail(v('eEmail'))]]);
      if(er)return formErr(form,er[1],er[0]);
      busyBtn(btn,true);
      Store.updateProfile({name:v('eName').trim(),nickname:v('eNick').trim(),team:v('eTeam'),goal:goal,public:$('ePublic').checked,email:v('eEmail').trim().toLowerCase()}).then(function(r){
        me=r.user;updateCount();done(r.emailPending?T('pf.savedMail'):T('pf.saved'))},fail);
      return;
    }
    if(id==='fPw'){
      er=firstErr([[['pOld'],v('pOld')?'':T('v.oldPw')],[['pNew'],checkPw(v('pNew'))]]);
      if(er)return formErr(form,er[1],er[0]);
      busyBtn(btn,true);
      Store.changePassword(v('pOld'),v('pNew')).then(function(){done(T('pf.pwUpdated'))},fail);
    }
  });

  /* ================= READING CHALLENGE ================= */
  var lb={key:null,rows:null,teams:null,err:null};
  function renderChallenge(){
    var box=$('chBox'),m=monthStart(state.season),key=iso(m);
    var h='<div class="hero"><h1>'+esc(T('ch.h1'))+'</h1></div><p class="lede">'+esc(T('ch.lede'))+'</p>';
    if(!Store.ok()){box.innerHTML=h+offlineNote();return}
    h+='<div class="chips" role="group" aria-label="'+esc(T('ch.season'))+'">'+[0,-1,-2].map(function(o){return '<button class="chip" data-season="'+o+'" aria-pressed="'+(state.season===o)+'">'+esc(fmtMonth(monthStart(o)))+'</button>'}).join('')+'</div>';
    if(me){
      var mine=countedIn(m),pts=points(mine),row=lb.key===key&&lb.rows?lb.rows.filter(function(r){return r.is_me})[0]:null;
      h+='<div class="stats"><div class="stat"><b>'+pts+'</b><span>'+esc(T('ch.yourPts'))+'</span></div><div class="stat"><b>'+mine.length+'</b><span>'+esc(T('ch.yourBooks'))+'</span></div><div class="stat"><b>'+(row?'#'+row.rank:'—')+'</b><span>'+esc(T('ch.yourRank'))+'</span></div><div class="stat"><b>'+esc(T('team.'+me.team))+'</b><span>'+esc(T('ch.yourTeam'))+'</span></div></div>';
      if(!me.public)h+=notice(esc(T('ch.hidden'))+' <button class="btn ghost sm" data-goto="profile">'+esc(T('nav.profile'))+'</button>','warn');
    }else h+=signInPrompt();
    h+='<details class="rules"><summary>'+esc(T('ch.rulesT'))+'</summary><ul><li>'+esc(T('ch.r1'))+'</li><li>'+esc(T('ch.r2'))+'</li><li>'+esc(T('ch.r3'))+'</li><li>'+esc(T('ch.r4'))+'</li><li>'+esc(T('ch.r5'))+'</li></ul></details>';
    if(lb.key!==key){
      box.innerHTML=h+'<p class="muted">'+esc(T('w.loading'))+'</p>';
      lb={key:key,rows:null,teams:null,err:null};
      Promise.all([Store.leaderboard(key),Store.teamBoard(key)]).then(function(r){lb.rows=r[0];lb.teams=r[1]},function(x){lb.err=x}).then(function(){if(state.view==='challenge'&&lb.key===key)renderChallenge()});
      return;
    }
    if(lb.err){box.innerHTML=h+notice(esc(errMsg(lb.err)),'bad');return}
    if(!lb.rows){box.innerHTML=h+'<p class="muted">'+esc(T('w.loading'))+'</p>';return}
    h+='<div class="twocol wide"><div><h2>'+esc(T('ch.readers'))+'</h2>';
    h+=lb.rows.length?'<div class="tablewrap"><table class="lb"><thead><tr><th>#</th><th>'+esc(T('ch.reader'))+'</th><th>'+esc(T('pf.team'))+'</th><th class="r">'+esc(T('ch.books'))+'</th><th class="r">'+esc(T('ch.points'))+'</th></tr></thead><tbody>'+lb.rows.map(function(r){
      return '<tr'+(r.is_me?' class="me"':'')+'><td class="num"><span class="rank'+(r.rank<=3?' top':'')+'">'+r.rank+'</span></td><td><strong>'+esc(r.nickname)+'</strong>'+(r.is_me?' <span class="muted">('+esc(T('ch.you'))+')</span>':'')+'</td><td>'+esc(T('team.'+r.team))+'</td><td class="num r">'+r.books+'</td><td class="num r"><strong>'+r.points+'</strong></td></tr>'}).join('')+'</tbody></table></div>'
      :'<div class="empty">'+esc(T('ch.empty'))+'</div>';
    h+='</div><div><h2>'+esc(T('ch.teams'))+'</h2>';
    h+=lb.teams.length?'<div class="tablewrap"><table class="lb"><thead><tr><th>'+esc(T('pf.team'))+'</th><th class="r">'+esc(T('ch.readersN'))+'</th><th class="r">'+esc(T('ch.points'))+'</th><th class="r">'+esc(T('ch.avg'))+'</th></tr></thead><tbody>'+lb.teams.map(function(t){
      return '<tr'+(me&&t.team===me.team?' class="me"':'')+'><td><strong>'+esc(T('team.'+t.team))+'</strong></td><td class="num r">'+t.readers+'</td><td class="num r"><strong>'+t.points+'</strong></td><td class="num r">'+Math.round(t.points/t.readers)+'</td></tr>'}).join('')+'</tbody></table></div>'
      :'<div class="empty">'+esc(T('ch.emptyTeams'))+'</div>';
    h+='</div></div>';
    if(me){var s=readingStats();h+='<h2 style="margin-top:28px">'+esc(T('pf.badges'))+'</h2>'+badgesHtml(s)}
    box.innerHTML=h;
  }
  $('chBox').addEventListener('click',function(e){var s=e.target.closest('[data-season]');if(s){state.season=+s.dataset.season;renderChallenge()}});

  /* ================= BOOK CLUB ================= */
  var club={key:null,votes:null,posts:null,err:null,q:'',note:''};
  function weekKey(off){return iso(weekStart(off))}
  function tally(week){var t={};(club.votes||[]).forEach(function(v){if(v.week===week)t[v.book_id]=(t[v.book_id]||0)+1});return Object.keys(t).map(function(k){return{b:byId(+k),n:t[k]}}).filter(function(x){return x.b}).sort(function(a,b){return b.n-a.n||a.b.id-b.b.id})}
  function clubPick(){
    var prev=tally(weekKey(-1));if(prev.length)return{b:prev[0].b,why:PL('n.votes',prev[0].n)};
    var rated=BOOKS.filter(function(b){return b.nrev>0}).sort(function(a,b){return b.rating-a.rating||b.nrev-a.nrev});
    if(rated.length)return{b:rated[0],why:T('club.byRating')};
    var pool=ranked(null).slice(0,20),wk=Math.floor(weekStart(0).getTime()/(7*DAY));
    return{b:pool[wk%pool.length].b,why:T('club.editors')};
  }
  function renderClub(){
    var box=$('clubBox'),wk=weekKey(0),h='<div class="hero"><h1>'+esc(T('club.h1'))+'</h1></div><p class="lede">'+esc(T('club.lede'))+'</p>'+club.note;
    if(!Store.ok()){box.innerHTML=h+offlineNote();return}
    if(club.key!==wk){
      box.innerHTML=h+'<p class="muted">'+esc(T('w.loading'))+'</p>';club.key=wk;club.votes=null;club.err=null;
      Store.clubVotes([weekKey(-1),wk]).then(function(v){club.votes=v;return Store.clubPosts(wk)}).then(function(p){club.posts=p},function(x){club.err=x}).then(function(){if(state.view==='club')renderClub()});
      return;
    }
    if(club.err){box.innerHTML=h+notice(esc(errMsg(club.err)),'bad');return}
    if(!club.votes||!club.posts){box.innerHTML=h+'<p class="muted">'+esc(T('w.loading'))+'</p>';return}
    var pk=clubPick(),b=pk.b,posts=club.posts.filter(function(p){return p.book_id===b.id});
    h+='<div class="clubpick">'+cover(b)+'<div><span class="muted mono" style="font-size:12px">'+esc(T('club.week',fmt(weekStart(0)),fmt(new Date(weekStart(1)-DAY))))+'</span><h2 class="serif" style="font-size:24px;margin:2px 0">'+esc(b.t)+'</h2><div class="muted">'+esc(b.a)+', '+b.y+' · '+esc(SN(b.s))+'</div>'+
      '<p style="margin:8px 0">'+(b.rating?stars(b.rating)+' '+b.rating.toFixed(1)+' · ':'')+status(b)+' <span class="muted">· '+esc(T('club.chosen',pk.why))+'</span></p>'+
      '<div class="prow" style="margin:0"><button class="btn ghost sm" data-find="'+b.id+'">'+esc(T('top.map'))+'</button></div></div></div>';
    h+='<div class="twocol wide"><div><h2>'+esc(T('club.discuss'))+' <span class="muted" style="font-weight:400;font-size:15px">'+posts.length+'</span></h2>';
    h+=posts.length?posts.map(function(p){var pr=p.profiles||{},mine=me&&p.user_id===me.id;return '<div class="post"><div><strong>'+esc(pr.nickname||'?')+'</strong> <span class="muted">· '+esc(T('team.'+(pr.team||'Other')))+' · '+esc(fmtTime(new Date(p.created_at)))+'</span>'+(mine?' <button class="linkbtn" data-delpost="'+p.id+'">'+esc(T('w.delete'))+'</button>':'')+'</div><p>'+esc(p.body)+'</p></div>'}).join(''):'<div class="empty">'+esc(T('club.noPosts'))+'</div>';
    h+=me?'<form id="postForm" class="revform"><textarea id="postBody" rows="3" maxlength="1000" placeholder="'+esc(T('club.ph'))+'"></textarea><div class="prow" style="margin:8px 0 0"><button class="btn sm" type="submit">'+esc(T('club.post'))+'</button></div></form>':signInPrompt();
    var votes=tally(wk),myVote=me&&club.votes.filter(function(v){return v.week===wk&&v.user_id===me.id})[0],max=votes.length?votes[0].n:1;
    h+='</div><div><h2>'+esc(T('club.next'))+'</h2><p class="muted" style="margin:0 0 10px">'+esc(T('club.nextLede'))+'</p>';
    h+=votes.length?'<div class="votes">'+votes.slice(0,6).map(function(x){return '<div class="vote'+(myVote&&myVote.book_id===x.b.id?' mine':'')+'"><div class="vt"><span class="serif">'+esc(x.b.t)+'</span><span class="num">'+esc(PL('n.votes',x.n))+'</span></div><div class="pbar"><i style="width:'+Math.round(x.n/max*100)+'%"></i></div></div>'}).join('')+'</div>':'<div class="empty" style="padding:12px 0">'+esc(T('club.noVotes'))+'</div>';
    if(myVote)h+='<p style="margin:10px 0">'+esc(T('club.yourVote',byId(myVote.book_id)?byId(myVote.book_id).t:'?'))+' <button class="linkbtn" data-unvote>'+esc(T('club.unvote'))+'</button></p>';
    if(me){
      h+='<div class="search" style="margin-top:12px"><input type="search" id="voteQ" placeholder="'+esc(T('club.searchPh'))+'" value="'+esc(club.q)+'" autocomplete="off"></div><div id="voteRes">'+voteResults()+'</div>';
    }
    h+='</div></div>';
    box.innerHTML=h;
  }
  function voteResults(){
    var q=club.q.trim().toLowerCase();if(q.length<2)return '';
    var list=BOOKS.filter(function(b){return (b.t+' '+b.a).toLowerCase().indexOf(q)>-1}).slice(0,6);
    if(!list.length)return '<div class="empty" style="padding:8px 0">'+esc(T('find.none',club.q))+'</div>';
    return list.map(function(b){return '<div class="gl" style="grid-template-columns:minmax(0,1fr) auto"><span><span class="t">'+esc(b.t)+'</span><div class="a">'+esc(b.a)+'</div></span><button class="btn ghost sm" data-vote="'+b.id+'">'+esc(T('club.vote'))+'</button></div>'}).join('');
  }
  $('clubBox').addEventListener('input',function(e){if(e.target.id==='voteQ'){club.q=e.target.value;$('voteRes').innerHTML=voteResults()}});
  $('clubBox').addEventListener('click',function(e){
    var el,act=null,wk=weekKey(0);
    if((el=e.target.closest('[data-find]'))){state.sel=+el.dataset.find;state.floor=byId(state.sel).floor;setView('find');return}
    if((el=e.target.closest('[data-vote]')))act=Store.vote(wk,+el.dataset.vote).then(function(){club.q='';toast(T('club.voted'))});
    else if((el=e.target.closest('[data-unvote]')))act=Store.unvote(wk);
    else if((el=e.target.closest('[data-delpost]')))act=Store.deletePost(+el.dataset.delpost);
    if(!act)return;
    busyBtn(el,true);
    act.then(function(){club.note='';club.key=null},function(x){club.note=notice(esc(errMsg(x)),'bad');club.key=null}).then(renderClub);
  });
  $('clubBox').addEventListener('submit',function(e){
    e.preventDefault();var body=$('postBody').value.trim();if(!body)return;
    var btn=e.target.querySelector('[type=submit]');busyBtn(btn,true);
    Store.post(weekKey(0),clubPick().b.id,body).then(function(){club.note='';club.key=null},function(x){club.note=notice(esc(errMsg(x)),'bad');club.key=null}).then(renderClub);
  });

  /* ================= SMART PLANNER ================= */
  var PARTS={any:[9,20],morning:[9,12],afternoon:[12,17],evening:[17,20]};
  var sp={n:2,dur:2,day:0,part:'any',need:[],msg:'',out:[]};
  /* INPUT: group size, hours, day, time of day, needs  ->  RULES + SCORE  ->  RESULT: top 3 slots or a warning */
  function recommend(p){
    var date=iso(addDays(p.day)),nowH=new Date().getHours(),list=[];
    var rest=Rooms.limits.maxHours-(me?Rooms.hoursOn(date):0);
    if(p.n>8)return{list:list,why:T('sm.tooBig')};
    if(p.dur>rest)return{list:list,why:T('sm.limit',rest)};
    ROOMS.forEach(function(r){
      if(r.seats<p.n)return;
      for(var s=9;s+p.dur<=20;s++){
        var ok=true,crowd=0,h;
        for(h=s;h<s+p.dur;h++){
          if(Rooms.isBusy(r.id,date,h)||(p.day===0&&h<=nowH)||Rooms.mineAt(date,h)){ok=false;break}
          crowd+=ROOMS.filter(function(x){return Rooms.isBusy(x.id,date,h)}).length;
        }
        if(!ok)continue;
        var sc=100-(r.seats-p.n)*5-crowd/p.dur*4,why=[],pr=PARTS[p.part];
        ['wb','scr','sil'].forEach(function(k){if(p.need.indexOf(k)>-1){if(r.eq.indexOf(k)>-1){sc+=15;why.push(T('eq.'+k).toLowerCase())}else sc-=20}});
        if(s>=pr[0]&&s+p.dur<=pr[1]){if(p.part!=='any'){sc+=10;why.push(T('sm.'+p.part).toLowerCase())}}else sc-=10;
        if(r.seats-p.n<=1)why.push(T('sm.rightSize'));
        if(crowd/p.dur<=1)why.push(T('sm.quiet'));
        list.push({room:r,s:s,e:s+p.dur,date:date,score:Math.round(sc),why:why});
      }
    });
    list.sort(function(a,b){return b.score-a.score});
    return{list:list.slice(0,3),why:list.length?'':T('sm.nothing')};
  }
  /* INPUT: your loans, reading history and holds  ->  count subjects  ->  RESULT: available titles in those subjects */
  function recBooks(){
    var cnt={},seen={};
    state.loans.concat(state.past).forEach(function(l){var b=byId(l.book);cnt[b.s]=(cnt[b.s]||0)+2;seen[l.book]=1});
    state.holds.forEach(function(x){var b=byId(x.book);cnt[b.s]=(cnt[b.s]||0)+1;seen[x.book]=1});
    var pers=Object.keys(cnt).length>0;
    var l=BOOKS.filter(function(b){return !seen[b.id]&&onShelf(b)>0}).map(function(b){
      return{b:b,sc:pers?(cnt[b.s]||0)*10+(b.y>=2010?2:0)+(b.rating||0):(b.copies-b.left)*10+b.copies+(b.rating||0)*3,why:pers?T('sm.because',SN(b.s)):T('sm.popular')}});
    if(pers)l=l.filter(function(x){return x.sc>=10});
    return{pers:pers,list:l.sort(function(a,b){return b.sc-a.sc}).slice(0,4)};
  }
  function chipset(k,opts,cur,multi){return opts.map(function(o){var on=multi?cur.indexOf(o[0])>-1:cur===o[0];return '<button class="chip" data-sp="'+k+'" data-v="'+o[0]+'" aria-pressed="'+on+'">'+esc(o[1])+'</button>'}).join('')}
  function dayOpts(){return[0,1,2,3,4].map(function(i){return[i,i===0?T('w.today'):fmtLong(addDays(i))]})}
  function renderSmart(){
    var R=recommend(sp);sp.out=R.list;
    var h='<div class="hero"><h1>'+esc(T('sm.h1'))+'</h1></div><p class="lede">'+esc(T('sm.lede'))+'</p>'+sp.msg+
      '<h2>'+esc(T('sm.best'))+'</h2><p style="margin:0 0 6px"><b>'+esc(T('sm.people'))+'</b></p><div class="chips">'+chipset('n',[[1,'1'],[2,'2'],[3,'3'],[4,'4'],[6,'5–6'],[8,'7–8']],sp.n)+'</div>'+
      '<p style="margin:0 0 6px"><b>'+esc(T('sm.length'))+'</b></p><div class="chips">'+chipset('dur',[[1,T('w.h',1)],[2,T('w.h',2)],[3,T('w.h',3)]],sp.dur)+'</div>'+
      '<p style="margin:0 0 6px"><b>'+esc(T('sm.day'))+'</b></p><div class="chips">'+chipset('day',dayOpts(),sp.day)+'</div>'+
      '<p style="margin:0 0 6px"><b>'+esc(T('sm.part'))+'</b></p><div class="chips">'+chipset('part',Object.keys(PARTS).map(function(k){return[k,T('sm.'+k)]}),sp.part)+'</div>'+
      '<p style="margin:0 0 6px"><b>'+esc(T('sm.must'))+'</b></p><div class="chips">'+chipset('need',['wb','scr','sil'].map(function(k){return[k,T('eq.'+k)]}),sp.need,true)+'</div>';
    h+=R.list.length?'<div class="tablewrap"><table><tbody>'+R.list.map(function(x,i){return '<tr><td><strong>'+esc(roomName(x.room))+'</strong>'+(i===0?' <span class="status ok">'+esc(T('sm.bestMatch'))+'</span>':'')+'<div class="muted" style="font-size:13px">'+esc(roomDesc(x.room))+'</div></td><td class="num">'+esc(dayLabel(x.date)+', '+hh(x.s)+'–'+hh(x.e))+'</td><td>'+esc(T('sm.score',x.score))+'<div class="muted" style="font-size:13px">'+esc(x.why.join(', '))+'</div></td><td><button class="btn sm" data-sbook="'+i+'">'+esc(T('sm.book'))+'</button></td></tr>'}).join('')+'</tbody></table></div>':notice(esc(R.why),'warn');
    var B=recBooks();
    h+='<h2 style="margin-top:32px">'+esc(T('sm.forYou'))+'</h2><p class="lede" style="margin-bottom:12px">'+esc(B.pers?T('sm.basedOn'):T('sm.signinPicks'))+'</p>'+
      (B.list.length?'<div class="tablewrap"><table><tbody>'+B.list.map(function(x){return '<tr><td><strong class="serif">'+esc(x.b.t)+'</strong><div class="muted" style="font-size:13px">'+esc(x.b.a)+'</div></td><td>'+esc(x.why)+'<div class="muted" style="font-size:13px">'+esc(T('find.loc',x.b.floor,x.b.aisle))+'</div></td><td><button class="btn ghost sm" data-find="'+x.b.id+'">'+esc(T('top.map'))+'</button></td></tr>'}).join('')+'</tbody></table></div>':'<div class="empty">'+esc(T('sm.noBooks'))+'</div>');
    $('smartBox').innerHTML=h;
  }
  $('smartBox').addEventListener('click',function(e){
    var c=e.target.closest('[data-sp]');
    if(c){var k=c.dataset.sp,v=c.dataset.v;if(k==='need'){var i=sp.need.indexOf(v);if(i>-1)sp.need.splice(i,1);else sp.need.push(v)}else if(k==='part')sp.part=v;else sp[k]=+v;sp.msg='';renderSmart();return}
    var f=e.target.closest('[data-find]');if(f){state.sel=+f.dataset.find;state.floor=byId(state.sel).floor;setView('find');return}
    var b=e.target.closest('[data-sbook]');if(!b)return;
    if(!Store.ok()){sp.msg=offlineNote();renderSmart();return}
    if(!me){sp.msg=signInPrompt();renderSmart();return}
    var x=sp.out[+b.dataset.sbook];busyBtn(b,true);
    Store.bookRoom(x.room.id,x.date,x.s,x.e).then(function(code){
      sp.msg=notice(esc(T('spaces.ok',roomName(x.room),dayLabel(x.date),hh(x.s),hh(x.e)))+' <strong class="mono">'+esc(code)+'</strong>.');Store.pingRooms();
    },function(err){sp.msg=notice('<strong>'+esc(T('spaces.couldNot'))+'</strong> '+esc(errMsg(err,Rooms.hoursOn(x.date),Rooms.limits.maxHours)),'bad')}).then(refresh);
  });

  /* ================= INSIGHTS ================= */
  var insDay=0;
  function pct(a,b){return b?Math.round(a/b*100):0}
  function analyse(){
    var tc=0,tl=0,none=0,by={},date=iso(addDays(insDay)),act=0,rated=0;
    BOOKS.forEach(function(b){tc+=b.copies;tl+=b.left;act+=b.active;if(b.nrev)rated++;if(!b.left)none++;var o=by[b.s]||(by[b.s]={c:0,l:0});o.c+=b.copies;o.l+=b.left});
    var subj=Object.keys(by).map(function(s){return{k:s,l:SN(s),v:pct(by[s].c-by[s].l,by[s].c)}}).sort(function(a,b){return b.v-a.v});
    var hrs=HOURS.map(function(h){return{l:hh(h),v:pct(ROOMS.filter(function(r){return Rooms.isBusy(r.id,date,h)}).length,ROOMS.length)}});
    return{n:BOOKS.length,tc:tc,out:tc-tl,none:none,act:act,rated:rated,subj:subj,hrs:hrs,avg:Math.round(hrs.reduce(function(n,x){return n+x.v},0)/hrs.length)};
  }
  function renderIns(){
    var I=analyse(),top=I.subj[0],low=I.subj[I.subj.length-1],srt=I.hrs.slice().sort(function(a,b){return b.v-a.v}),pk=srt[0],qt=srt[srt.length-1];
    var dec=(top.v>=50?T('ins.buy',top.l,I.none):T('ins.balanced'))+' '+(pk.v>=60?T('ins.tight',pk.l,qt.l):T('ins.enough'));
    var h='<div class="hero"><h1>'+esc(T('ins.h1'))+'</h1></div><p class="lede">'+esc(T('ins.lede'))+'</p>'+
      '<div class="stats"><div class="stat"><b>'+I.n+'</b><span>'+esc(T('ins.titles'))+'</span></div><div class="stat"><b>'+pct(I.out,I.tc)+'%</b><span>'+esc(T('ins.out',I.out,I.tc))+'</span></div><div class="stat"><b>'+I.act+'</b><span>'+esc(T('ins.live'))+'</span></div><div class="stat"><b>'+I.rated+'</b><span>'+esc(T('ins.rated'))+'</span></div><div class="stat"><b>'+I.avg+'%</b><span>'+esc(T('ins.avgRoom'))+'</span></div></div>'+
      '<h2>'+esc(T('ins.bySubj'))+'</h2>'+hbar(I.subj,'#2F6F73',T('ins.bySubjAx'),'%')+
      '<h2 style="margin-top:28px">'+esc(T('ins.byHour'))+'</h2><div class="chips">'+chipset('iday',dayOpts(),insDay)+'</div>'+hbar(I.hrs,'#B88A2A',T('ins.byHourAx'),'%')+
      '<h2 style="margin-top:28px">'+esc(T('ins.says'))+'</h2>'+notice('<strong>'+esc(T('ins.f1'))+'</strong> '+esc(T('ins.f1t',top.l,top.v,low.l,low.v)))+
      notice('<strong>'+esc(T('ins.f2'))+'</strong> '+esc(T('ins.f2t',pk.l,pk.v,qt.l,qt.v)))+notice('<strong>'+esc(T('ins.dec'))+'</strong> '+esc(dec),'warn')+
      '<h2 style="margin-top:32px">'+esc(T('sec.h'))+'</h2><div class="tablewrap"><table><thead><tr><th>'+esc(T('sec.area'))+'</th><th>'+esc(T('sec.now'))+'</th><th>'+esc(T('sec.left'))+'</th></tr></thead><tbody>'+
      [1,2,3,4].map(function(i){return '<tr><td><strong>'+esc(T('sec.r'+i))+'</strong></td><td>'+esc(T('sec.r'+i+'n'))+'</td><td>'+esc(T('sec.r'+i+'l'))+'</td></tr>'}).join('')+'</tbody></table></div>';
    $('insBox').innerHTML=h;
  }
  $('insBox').addEventListener('click',function(e){var c=e.target.closest('[data-sp]');if(c){insDay=+c.dataset.v;renderIns()}});

  /* ================= TOP BOOKS ================= */
  /* Popularity = loans in the last 90 days: simulated history (stable per title) + copies out now + real loans from the database. */
  var topG='All';
  function seedPop(b){var x=Math.imul(b.id+7,2654435761)>>>0,r=(x%1000)/1000;return 6+Math.round(r*r*54)}
  function loans90(b){return seedPop(b)+(b.copies-b.base)+b.loans90}
  function ranked(sub){return BOOKS.filter(function(b){return !sub||b.s===sub}).map(function(b){return{b:b,n:loans90(b)}}).sort(function(a,c){return c.n-a.n||a.b.t.localeCompare(c.b.t)})}
  function topRow(x,i,max,rated){
    var b=x.b;
    return '<div class="toprow"><span class="rank'+(i<3?' top':'')+' num" aria-label="'+esc(T('top.rank',i+1))+'">'+(i+1)+'</span>'+cover(b)+
      '<span><h3>'+esc(b.t)+'</h3><div class="by">'+esc(b.a)+', '+b.y+'</div>'+
      '<div class="meta" style="display:flex;gap:14px;flex-wrap:wrap;margin-top:6px"><span class="tag" data-s="'+esc(b.s)+'">'+esc(SN(b.s))+'</span><span>'+esc(T('find.loc',b.floor,b.aisle))+'</span></div>'+
      '<div class="pbar" aria-hidden="true"><i style="width:'+Math.max(4,Math.round(x.n/max*100))+'%"></i></div></span>'+
      '<span class="side"><span class="n num">'+(rated?stars(b.rating)+' '+b.rating.toFixed(1)+' <small>· '+esc(PL('n.reviews',b.nrev))+'</small>':'<small>'+esc(PL('n.loans',x.n))+'</small>')+'</span>'+status(b)+'<button class="btn ghost sm" data-find="'+b.id+'">'+esc(T('top.map'))+'</button></span></div>';
  }
  function renderTop(){
    var genres=SUBJECTS.slice(1).filter(function(g){return BOOKS.some(function(b){return b.s===g})});
    var all=ranked(null).slice(0,10),rated=BOOKS.filter(function(b){return b.nrev>0}).sort(function(a,b){return b.rating-a.rating||b.nrev-a.nrev}).slice(0,10);
    var h='<div class="hero"><h1>'+esc(T('top.h1'))+'</h1></div><p class="lede">'+esc(T('top.lede'))+'</p>'+
      '<h2>'+esc(T('top.overall'))+'</h2><div class="toplist" style="margin-bottom:36px">'+all.map(function(x,i){return topRow(x,i,all[0].n)}).join('')+'</div>'+
      '<h2>'+esc(T('top.rated'))+'</h2>'+(rated.length?'<div class="toplist" style="margin-bottom:36px">'+rated.map(function(b,i){return topRow({b:b,n:b.rating},i,5,true)}).join('')+'</div>':'<div class="empty">'+esc(T('top.noRated'))+'</div>')+
      '<h2>'+esc(T('top.byGenre'))+'</h2><div class="chips" role="group" style="margin-top:8px">'+
      [['All',T('top.allGenres')]].concat(genres.map(function(g){return[g,SN(g)]})).map(function(o){return '<button class="chip" data-tg="'+esc(o[0])+'" aria-pressed="'+(topG===o[0])+'">'+esc(o[1])+'</button>'}).join('')+'</div>';
    if(topG==='All'){
      h+='<div class="gengrid">'+genres.map(function(g){var r=ranked(g).slice(0,3);
        return '<div class="gencard"><h3><span class="tag" data-s="'+esc(g)+'">'+esc(SN(g))+'</span></h3>'+r.map(function(x,i){return '<div class="gl"><b>'+(i+1)+'</b><span><span class="t">'+esc(x.b.t)+'</span><div class="a">'+esc(x.b.a)+'</div></span><span class="n">'+esc(PL('n.loans',x.n))+'</span></div>'}).join('')+
          '<button class="btn ghost sm" data-tg="'+esc(g)+'">'+esc(T('top.see10'))+'</button></div>'}).join('')+'</div>';
    }else{var r=ranked(topG).slice(0,10);h+='<div class="count">'+esc(T('top.inGenre',r.length,SN(topG)))+'</div><div class="toplist">'+r.map(function(x,i){return topRow(x,i,r[0].n)}).join('')+'</div>'}
    $('topBox').innerHTML=h;
  }
  $('topBox').addEventListener('click',function(e){
    var g=e.target.closest('[data-tg]');if(g){topG=g.dataset.tg;renderTop();if(g.classList.contains('btn'))window.scrollTo(0,$('topBox').querySelector('.chips').offsetTop-80);return}
    var f=e.target.closest('[data-find]');if(f){state.sel=+f.dataset.find;state.floor=byId(state.sel).floor;setView('find')}
  });

  /* ================= app shell ================= */
  function render(){
    var v=state.view;
    if(v==='find'){renderChips();renderResults();renderFloors();renderMap()}
    if(v==='spaces'){renderDays();renderRooms()}
    if(v==='checkout')renderCheckout();
    if(v==='loans')renderLoans();
    if(v==='profile')renderProfile();
    if(v==='smart')renderSmart();
    if(v==='insights')renderIns();
    if(v==='top')renderTop();
    if(v==='challenge')renderChallenge();
    if(v==='club')renderClub();
    $('offline').hidden=navigator.onLine!==false;
  }
  function setMe(u){
    me=u;revDraft=null;lb.key=null;club.key=null;
    if(u)Store.onNotify(onNote);
    return refresh();
  }
  function loadScript(src){
    loadScript.p=loadScript.p||{};
    return loadScript.p[src]||(loadScript.p[src]=new Promise(function(ok,no){var s=document.createElement('script');s.src=src;s.onload=ok;s.onerror=function(){delete loadScript.p[src];no(new Error('load'))};document.head.appendChild(s)}));
  }

  $('lang').addEventListener('change',function(e){LANG=e.target.value;lsSet('auralib.lang',LANG);applyStatic();applyTheme();updateCount();render()});
  $('themeBtn').addEventListener('click',function(){THEME=THEME==='auto'?'light':THEME==='light'?'dark':'auto';lsSet('auralib.theme',THEME);applyTheme()});
  window.addEventListener('hashchange',function(){var v=(location.hash||'').replace('#','');if(VIEWS.indexOf(v)>-1&&v!==state.view)setView(v)});
  window.addEventListener('online',function(){render();refresh()});
  window.addEventListener('offline',render);
  document.addEventListener('visibilitychange',function(){if(!document.hidden&&me)refresh()});
  setInterval(function(){if(state.view==='spaces'&&!document.hidden)Rooms.refresh().then(function(){if(state.view==='spaces')renderRooms()}).catch(function(){})},60000);
  if('serviceWorker' in navigator&&location.protocol!=='file:')navigator.serviceWorker.register('sw.js').catch(function(){});

  applyStatic();applyTheme();
  var h0=(location.hash||'').replace('#','');
  state.view=VIEWS.indexOf(h0)>-1?h0:'find';
  setView(state.view);
  Store.init().then(function(u){
    online=Store.ok();
    if(online)Store.onRooms(function(){Rooms.refresh().then(function(){if(state.view==='spaces')renderRooms();if(state.view==='smart')renderSmart();if(state.view==='insights')renderIns()})});
    return setMe(u);
  });
})();
