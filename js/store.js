/* AuraLib data layer: a thin wrapper over Supabase (auth, tables, RPC functions, realtime).
   Every call returns a Promise. Failures reject with {code:'E_…'}; app.js turns codes into text. */
window.Store=(function(){
  var cfg=window.AURALIB_CONFIG||{}, sb=null, user=null, roomsCh=null, notifCh=null;

  function codeOf(err){
    var m=(err&&(err.message||err.error_description||String(err)))||'', x=m.match(/E_[A-Z_]+/);
    if(x)return x[0];
    if(/invalid login credentials/i.test(m))return 'E_LOGIN';
    if(/already (registered|exists)/i.test(m))return 'E_EMAIL_TAKEN';
    if(/email not confirmed/i.test(m))return 'E_CONFIRM';
    if(/rate limit|too many/i.test(m))return 'E_RATE';
    if(/password/i.test(m)&&/(least|weak|short)/i.test(m))return 'E_PW_WEAK';
    if(/schema cache|does not exist/i.test(m))return 'E_SETUP';
    if(/failed to fetch|networkerror|load failed/i.test(m))return 'E_NETWORK';
    if(/row-level security|permission denied/i.test(m))return 'E_DENIED';
    if(/duplicate key|unique/i.test(m))return 'E_DUPLICATE';
    return 'E_SERVER';
  }
  function fail(err){var e={code:codeOf(err),raw:err&&err.message};if(window.console)console.warn('[AuraLib]',e.code,e.raw);throw e}
  function q(p){return p.then(function(r){if(r.error)fail(r.error);return r.data},fail)}
  function rpc(name,args){return q(sb.rpc(name,args||{}))}
  function need(){if(!sb)return Promise.reject({code:'E_OFFLINE'});if(!user)return Promise.reject({code:'E_AUTH'});return null}

  /* ---------- auth ---------- */
  function init(){
    if(!window.supabase||!cfg.supabaseUrl||!cfg.supabaseKey)return Promise.resolve(null);
    try{sb=window.supabase.createClient(cfg.supabaseUrl,cfg.supabaseKey,{auth:{persistSession:true,autoRefreshToken:true,detectSessionInUrl:true}})}
    catch(e){sb=null;return Promise.resolve(null)}
    return sb.auth.getSession().then(function(r){
      var s=r.data&&r.data.session;return s?loadUser(s.user):null}).catch(function(){return null});
  }
  function loadUser(u){
    return Promise.all([
      q(sb.from('profiles').select('nickname,team,public,created_at').eq('id',u.id).maybeSingle()),
      q(sb.from('profile_private').select('full_name,student_id,goal').eq('id',u.id).maybeSingle())
    ]).then(function(r){
      var p=r[0]||{},v=r[1]||{};
      user={id:u.id,email:u.email,nickname:p.nickname||'',team:p.team||'Other',public:p.public!==false,
        created:new Date(p.created_at||u.created_at),name:v.full_name||'',studentId:v.student_id||'',goal:v.goal||10};
      return user;
    });
  }
  function signUp(o){
    if(!sb)return Promise.reject({code:'E_OFFLINE'});
    return rpc('student_id_taken',{p_student_id:o.studentId}).then(function(taken){
      if(taken)throw{code:'E_ID_TAKEN'};
      return q(sb.auth.signUp({email:o.email,password:o.pw,options:{
        emailRedirectTo:location.href.split('#')[0],
        data:{full_name:o.name,student_id:o.studentId,nickname:o.nickname,team:o.team}}}));
    }).then(function(d){
      /* With e-mail confirmation on, Supabase answers an existing address with a user that has no identities. */
      if(d.user&&d.user.identities&&!d.user.identities.length)throw{code:'E_EMAIL_TAKEN'};
      if(!d.session)return{confirm:true};
      return loadUser(d.user).then(function(u){return{user:u}});
    });
  }
  function signIn(email,pw){
    if(!sb)return Promise.reject({code:'E_OFFLINE'});
    return q(sb.auth.signInWithPassword({email:email,password:pw})).then(function(d){return loadUser(d.user)});
  }
  function signOut(){unsubscribe();user=null;return sb?sb.auth.signOut().catch(function(){}):Promise.resolve()}
  function updateProfile(o){
    var n=need();if(n)return n;
    return Promise.all([
      q(sb.from('profiles').update({nickname:o.nickname,team:o.team,public:o.public}).eq('id',user.id)),
      q(sb.from('profile_private').update({full_name:o.name,goal:o.goal}).eq('id',user.id))
    ]).then(function(){
      var mail=o.email&&o.email!==user.email;
      return (mail?q(sb.auth.updateUser({email:o.email},{emailRedirectTo:location.href.split('#')[0]})):Promise.resolve())
        .then(function(){return loadUser({id:user.id,email:user.email,created_at:user.created})}).then(function(u){return{user:u,emailPending:mail}});
    });
  }
  function changePassword(oldPw,newPw){
    var n=need();if(n)return n;
    /* Re-check the current password before changing it. */
    return sb.auth.signInWithPassword({email:user.email,password:oldPw}).then(function(r){
      if(r.error)throw{code:'E_OLD_PW'};
      return q(sb.auth.updateUser({password:newPw}));
    });
  }
  function deleteAccount(){var n=need();if(n)return n;return rpc('delete_me').then(signOut)}

  /* ---------- my data ---------- */
  function myLoans(){var n=need();if(n)return n;return q(sb.from('loans').select('*').order('borrowed_at',{ascending:false}).limit(500))}
  function myHolds(){var n=need();if(n)return n;return rpc('my_holds')}
  function myReviews(){var n=need();if(n)return n;return q(sb.from('reviews').select('book_id,rating,body,created_at').eq('user_id',user.id))}
  function myRooms(){
    var n=need();if(n)return n;
    return q(sb.from('room_slots').select('code,room,day,hour').gte('day',new Date(Date.now()-86400000).toISOString().slice(0,10))).then(function(rows){
      var by={};rows.forEach(function(r){var x=by[r.code]||(by[r.code]={code:r.code,room:r.room,date:r.day,start:99,end:0});x.start=Math.min(x.start,r.hour);x.end=Math.max(x.end,r.hour+1)});
      return Object.keys(by).map(function(k){return by[k]});
    });
  }
  function borrow(book,subject,free){var n=need();if(n)return n;return rpc('borrow',{p_book:book,p_subject:subject,p_free:free})}
  function renew(id){var n=need();if(n)return n;return rpc('renew_loan',{p_loan:id})}
  function returnLoan(id){var n=need();if(n)return n;return rpc('return_loan',{p_loan:id})}
  function placeHold(book){var n=need();if(n)return n;return rpc('place_hold',{p_book:book})}
  function cancelHold(id){var n=need();if(n)return n;return rpc('cancel_hold',{p_hold:id})}

  /* ---------- rooms ---------- */
  function busy(from,to){if(!sb)return Promise.resolve([]);return rpc('busy_slots',{p_from:from,p_to:to})}
  function bookRoom(room,day,s,e){var n=need();if(n)return n;return rpc('book_room',{p_room:room,p_day:day,p_start:s,p_end:e})}
  function cancelRoom(code){var n=need();if(n)return n;return rpc('cancel_room',{p_code:code})}
  /* Rooms change for everyone: a broadcast tells other open pages to reload the grid. */
  function onRooms(cb){
    if(!sb||roomsCh)return;
    roomsCh=sb.channel('auralib-rooms').on('broadcast',{event:'changed'},function(){cb()}).subscribe();
  }
  function pingRooms(){if(roomsCh)roomsCh.send({type:'broadcast',event:'changed',payload:{at:Date.now()}})}

  /* ---------- books: stats and reviews ---------- */
  function bookStats(){if(!sb)return Promise.resolve([]);return rpc('book_stats')}
  function reviews(book){
    if(!sb)return Promise.resolve([]);
    return q(sb.from('reviews').select('id,book_id,rating,body,created_at,user_id,profiles(nickname,team)').eq('book_id',book).order('created_at',{ascending:false}).limit(30));
  }
  function saveReview(book,rating,body){var n=need();if(n)return n;return q(sb.from('reviews').upsert({user_id:user.id,book_id:book,rating:rating,body:body},{onConflict:'user_id,book_id'}))}
  function deleteReview(book){var n=need();if(n)return n;return q(sb.from('reviews').delete().eq('user_id',user.id).eq('book_id',book))}

  /* ---------- reading challenge ---------- */
  function leaderboard(month){if(!sb)return Promise.reject({code:'E_OFFLINE'});return rpc('leaderboard',{p_month:month})}
  function teamBoard(month){if(!sb)return Promise.reject({code:'E_OFFLINE'});return rpc('team_board',{p_month:month})}

  /* ---------- book club ---------- */
  function clubVotes(weeks){if(!sb)return Promise.reject({code:'E_OFFLINE'});return q(sb.from('club_votes').select('week,book_id,user_id').in('week',weeks))}
  function vote(week,book){var n=need();if(n)return n;return q(sb.from('club_votes').upsert({week:week,user_id:user.id,book_id:book},{onConflict:'week,user_id'}))}
  function unvote(week){var n=need();if(n)return n;return q(sb.from('club_votes').delete().eq('week',week).eq('user_id',user.id))}
  function clubPosts(week){if(!sb)return Promise.reject({code:'E_OFFLINE'});return q(sb.from('club_posts').select('id,week,book_id,body,created_at,user_id,profiles(nickname,team)').eq('week',week).order('created_at').limit(300))}
  function post(week,book,body){var n=need();if(n)return n;return q(sb.from('club_posts').insert({week:week,book_id:book,user_id:user.id,body:body}))}
  function deletePost(id){var n=need();if(n)return n;return q(sb.from('club_posts').delete().eq('id',id).eq('user_id',user.id))}

  /* ---------- notifications ---------- */
  function notifications(){var n=need();if(n)return n;return q(sb.from('notifications').select('*').order('created_at',{ascending:false}).limit(30))}
  function markRead(){var n=need();if(n)return n;return q(sb.from('notifications').update({read:true}).eq('user_id',user.id).eq('read',false))}
  function onNotify(cb){
    if(!sb||!user)return;unsubscribeNotes();
    notifCh=sb.channel('auralib-notes-'+user.id)
      .on('postgres_changes',{event:'INSERT',schema:'public',table:'notifications',filter:'user_id=eq.'+user.id},function(p){cb(p.new)})
      .subscribe();
  }
  function unsubscribeNotes(){if(notifCh&&sb){sb.removeChannel(notifCh);notifCh=null}}
  function unsubscribe(){unsubscribeNotes()}

  return{init:init,ok:function(){return !!sb},user:function(){return user},
    signUp:signUp,signIn:signIn,signOut:signOut,updateProfile:updateProfile,changePassword:changePassword,deleteAccount:deleteAccount,
    myLoans:myLoans,myHolds:myHolds,myReviews:myReviews,myRooms:myRooms,
    borrow:borrow,renew:renew,returnLoan:returnLoan,placeHold:placeHold,cancelHold:cancelHold,
    busy:busy,bookRoom:bookRoom,cancelRoom:cancelRoom,onRooms:onRooms,pingRooms:pingRooms,
    bookStats:bookStats,reviews:reviews,saveReview:saveReview,deleteReview:deleteReview,
    leaderboard:leaderboard,teamBoard:teamBoard,
    clubVotes:clubVotes,vote:vote,unvote:unvote,clubPosts:clubPosts,post:post,deletePost:deletePost,
    notifications:notifications,markRead:markRead,onNotify:onNotify};
})();
