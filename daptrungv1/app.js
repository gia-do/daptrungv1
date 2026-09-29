/* Đập Trứng — GitHub Pages / Supabase-ready client shell. */
(() => {
  const C = window.DAT_TRUNG_CONFIG || {};
  const $ = id => document.getElementById(id);
  const screens = ["home","lobby","reveal","playing","finished"];
  const AVATARS = ["🐯","🦁","🐼","🐨","🐸","🐵","🦊","🐰","🐻","🐼","🐯","🐙","🦄","🐲","🐧","🦉","🐱","🐶","🐹","🦋","🐝","🐢","🐳","🦖"];

  const state = {
    mode: C.USE_SUPABASE ? "supabase" : "local",
    room: null,
    localPlayerId: null,
    phase: "HOME",
    revealStep: 0,
    revealTimer: null,
    players: [],
    game: null,
    pendingAction: null
  };

  function showScreen(name){screens.forEach(s => $(s).classList.toggle("hidden", s !== name));}
  function setStatus(t){$("status").textContent=t;}
  function uid(){return crypto.randomUUID ? crypto.randomUUID() : `${Date.now()}-${Math.random().toString(36).slice(2)}`;}
  function esc(s){return String(s).replace(/[&<>'"]/g,c=>({"&":"&amp;","<":"&lt;",">":"&gt;","'":"&#39;",'"':"&quot;"}[c]));}
  function normalizeName(s){return s.normalize("NFC").trim().toLocaleLowerCase();}
  function randomInt(a,b){return Math.floor(Math.random()*(b-a+1))+a;}
  function randomRate(){return randomInt(5,20);}
  function uniqueRoomCode(host){let chars=host==="host1"?"ABCDEFGHIJKLMNOPQRSTUVWXYZ":"0123456789";let x="";for(let i=0;i<4;i++)x+=chars[randomInt(0,chars.length-1)];return x;}
  function pickAvatars(){return [...AVATARS].sort(()=>Math.random()-.5).slice(0,24);}

  function eggStatus(hp){return hp>5?0:hp>3?1:hp>1?2:hp===1?3:4;}
  function eggAsset(status){return `assets/eggs/egg_${status}.png`;}
  function generatedOdds(){
    let miss=randomRate(), critical=randomRate();
    while(miss+critical>40){critical=randomRate();}
    const beer=randomRate();
    return {beer,hammer:100-beer,miss,critical,hit:100-miss-critical};
  }
  function newGame(players){
    const odds=generatedOdds();
    const shuffled=[...players].sort(()=>Math.random()-.5).map(p=>p.id);
    return {gameId:uid(),phase:"REVEAL",odds,turnOrder:shuffled,currentIndex:0,turnNumber:0,records:[],winnerId:null,startedAt:Date.now(),stats:{attempts:0,miss:0,critical:0,beer:0,hammer:0}};
  }
  function initPlayers(players){return players.map(p=>({...p,eggHp:randomInt(5,10),eliminated:false}));}

  function actualRate(kind){
    const a=state.game?.stats; if(!a||!a.attempts)return 0;
    return (a[kind]/a.attempts)*100;
  }
  function allowedEvent(kind){
    const g=state.game, attempts=g.stats.attempts, count=g.stats[kind];
    if(attempts===0)return true;
    const ceiling=g.odds[kind]*3;
    return ((count+1)/attempts*100)<=ceiling;
  }
  function outcome(){
    const g=state.game, r=Math.random()*100;
    const missOK=allowedEvent("miss"), critOK=allowedEvent("critical");
    let missP=missOK?g.odds.miss:0;
    let critP=critOK?g.odds.critical:0;
    if(r<missP)return "MISS";
    if(r<missP+critP)return "CRITICAL";
    return "HIT";
  }
  function action(){return Math.random()*100 < state.game.odds.beer ? "BEER" : "HAMMER";}

  function renderHome(){
    setStatus(state.mode === "supabase" ? "SUPABASE READY" : "LOCAL TEST MODE");
    $("rooms").innerHTML=`<div class="room-card"><strong>Chế độ hiện tại</strong><small>${state.mode === "supabase" ? "Shared Room / Realtime" : "Local prototype — Supabase chưa bật"}</small></div>`;
  }
  function renderLobby(){
    $("lobbyCode").textContent=state.room?.code||"";
    $("hostLabel").textContent=state.room?.host||"";
    $("roomBadge").textContent=state.room?.code||"";
    $("roomBadge").classList.toggle("hidden",!state.room);
    $("players").innerHTML=state.players.map((p,i)=>`<div class="player"><span class="slot">#${p.slot||i+1}</span><span class="avatar">${p.avatar||"🙂"}</span><span class="name">${esc(p.name)}</span><span class="ready">✓</span></div>`).join("");
  }
  function renderBoard(target="board"){
    const table=$(target); if(!state.game)return;
    const turns=state.game.records;
    const head=`<thead><tr><th>Name</th><th>Egg</th>${turns.map(r=>`<th>${r.turnNumber}</th>`).join("")}</tr></thead>`;
    const body=state.players.map(p=>{
      const current=state.game.turnOrder[state.game.currentIndex]===p.id && !p.eliminated;
      const cells=turns.map(r=>r.playerId===p.id?`<td>${r.action==="HAMMER"?"🔨":"🍺"}${r.outcome==="HIT"?"✅":r.outcome==="MISS"?"❌":"⚡"}</td>`:`<td></td>`).join("");
      const status=p.eliminated?" ELIMINATED":"";
      return `<tr class="${current?"current-row":""}"><td>${p.avatar||"🙂"} ${esc(p.name)}${status}</td><td>${p.eggHp}</td>${cells}</tr>`;
    }).join("");
    table.innerHTML=head+`<tbody>${body}</tbody>`;
  }
  function renderRates(){
    const g=state.game; if(!g)return;
    const fmt=k=>`${Math.round(actualRate(k))}/${g.odds[k]}%`;
    $("rates").textContent=`🔨 ${fmt("hammer")} | 🍺 ${fmt("beer")} | ❌ ${fmt("miss")} | ⚡ ${fmt("critical")}`;
  }
  function renderPersonal(){
    const me=state.players.find(p=>p.id===state.localPlayerId) || state.players[0];
    if(!me)return;
    const status=eggStatus(me.eggHp);
    $("egg").innerHTML=`<img src="${eggAsset(status)}" alt="Egg status ${status}" onerror="this.replaceWith(document.createTextNode('${status===4?"💥":"🥚"}'))">`;
    $("personalInfo").innerHTML=`<strong>${esc(me.name)}</strong><br><span class="muted">Egg HP: ${me.eggHp}${me.eliminated?" · ELIMINATED":""}</span>`;
    const current=state.game?.turnOrder[state.game.currentIndex]===me.id && !me.eliminated && state.game.phase==="PLAYING";
    $("play").disabled=!current;
    $("play").textContent=state.pendingAction?"TIẾP":"🔨 ĐẬP!";
  }
  function renderPlaying(){showScreen("playing");setStatus("PLAYING");renderRates();renderBoard();renderPersonal();}

  function startReveal(){
    state.game.phase="REVEAL"; state.revealStep=0; showScreen("reveal");
    const steps=[
      ["ACTION ODDS",()=>{const o=state.game.odds;return `<div class="reveal-value">🔨 ${o.hammer}% &nbsp; 🍺 ${o.beer}%</div><div class="bar"><span class="hammer" style="width:${o.hammer}%"></span><span class="beer" style="width:${o.beer}%"></span></div>`;}],
      ["OUTCOME ODDS",()=>{const o=state.game.odds;return `<div class="reveal-value">❌ ${o.miss}% &nbsp; ✅ ${o.hit}% &nbsp; ⚡ ${o.critical}%</div><div class="bar"><span class="miss" style="width:${o.miss}%"></span><span class="hit" style="width:${o.hit}%"></span><span class="critical" style="width:${o.critical}%"></span></div>`;}],
      ["TURN ORDER",()=>`<div class="reveal-value">${state.game.turnOrder.map((id,i)=>`${i+1}. ${esc(state.players.find(p=>p.id===id)?.name||"")}`).join("<br>")}</div>`],
      ["INITIAL EGG HP",()=>`<div class="reveal-value">${state.players.map(p=>`${esc(p.name)}: ${p.eggHp}`).join("<br>")}</div>`],
      ["GAME START",()=>`<div class="reveal-value">🎮 LET'S GO!</div>`]
    ];
    clearInterval(state.revealTimer); let i=0;
    const run=()=>{if(i>=steps.length){clearInterval(state.revealTimer);state.game.phase="PLAYING";state.game.currentIndex=0;renderPlaying();return;}$("revealTitle").textContent=steps[i][0];$("revealContent").innerHTML=steps[i][1]();i++;};
    run();state.revealTimer=setInterval(run,1000);
  }

  function nextActiveIndex(){
    const order=state.game.turnOrder;
    for(let n=1;n<=order.length;n++){const idx=(state.game.currentIndex+n)%order.length;const p=state.players.find(x=>x.id===order[idx]);if(p&&!p.eliminated)return idx;}
    return state.game.currentIndex;
  }
  function finishIfNeeded(){
    const active=state.players.filter(p=>!p.eliminated);
    if(active.length<=1){
      state.game.winnerId=active[0]?.id || state.game.turnOrder[state.game.currentIndex];
      state.game.phase="FINISHED";
      const winner=state.players.find(p=>p.id===state.game.winnerId);
      $("winner").textContent=winner?.name||"";
      showScreen("finished");renderBoard("finalBoard");setStatus("FINISHED");
      return true;
    }
    return false;
  }
  function completeTurn(out){
    const g=state.game,p=state.players.find(x=>x.id===g.turnOrder[g.currentIndex]);
    const before=p.eggHp; let effect=0;
    if(state.pendingAction==="HAMMER"&&out==="HIT"){p.eggHp-=1;effect=-1}
    if(state.pendingAction==="HAMMER"&&out==="CRITICAL"){p.eggHp-=2;effect=-2}
    if(p.eggHp<=0)p.eliminated=true;
    g.stats.attempts++; if(state.pendingAction==="HAMMER")g.stats.hammer++;else g.stats.beer++;
    if(out==="MISS")g.stats.miss++;if(out==="CRITICAL")g.stats.critical++;
    g.records.push({turnNumber:++g.turnNumber,playerId:p.id,action:state.pendingAction,outcome:out,effect,eggBefore:before,eggAfter:p.eggHp,timestamp:Date.now()});
    state.pendingAction=null;
    if(finishIfNeeded())return;
    g.currentIndex=nextActiveIndex();renderPlaying();
  }
  function pressPlay(){
    if(!state.game||state.game.phase!=="PLAYING")return;
    const me=state.players.find(p=>p.id===state.localPlayerId);if(!me)return;
    if(state.game.turnOrder[state.game.currentIndex]!==me.id||me.eliminated)return;
    if(!state.pendingAction){state.pendingAction=action();$("play").textContent=state.pendingAction==="HAMMER"?"🔨 HAMMER":"🍺 BEER";setTimeout(()=>{$("play").textContent="TIẾP"},650);return;}
    const out=outcome();$("play").textContent=out==="HIT"?"✅ HIT":out==="MISS"?"❌ MISS":"⚡ CRITICAL";setTimeout(()=>completeTurn(out),700);
  }

  function createLocalRoom(){
    const host="host1", player={id:uid(),slot:1,name:"HOST",avatar:"🐯",host:true};
    state.room={code:uniqueRoomCode(host),host};state.localPlayerId=player.id;state.players=[player];
    renderLobby();showScreen("lobby");setStatus("LOBBY");
  }
  function joinLocalRoom(){
    const code=$("joinCode").value.trim().toUpperCase(),name=$("joinName").value.trim();
    if(code.length!==4||!name){$("joinMessage").textContent="Nhập Room Code và nghệ danh.";return;}
    if(state.players.length>=16){$("joinMessage").textContent="Room đã đủ 16 người.";return;}
    const base=normalizeName(name);let final=name;let n=2;while(state.players.some(p=>normalizeName(p.name)===normalizeName(final))){final=`${name}${n++}`;}
    const player={id:uid(),slot:state.players.length+1,name:final,avatar:pickAvatars()[0],host:false};state.players.push(player);state.localPlayerId=player.id;renderLobby();showScreen("lobby");setStatus("LOBBY");
  }

  $("refreshRooms").onclick=renderHome;
  $("joinRoom").onclick=joinLocalRoom;
  $("startGame").onclick=()=>{if(state.players.length<2){alert("Cần ít nhất 2 người chơi.");return;}state.players=initPlayers(state.players);state.game=newGame(state.players);startReveal();};
  $("play").onclick=pressPlay;
  $("playAgain").onclick=()=>{state.players=initPlayers(state.players.map(p=>({...p,eliminated:false})));state.game=newGame(state.players);let n=3;showScreen("reveal");$("revealTitle").textContent=n;$("revealContent").innerHTML="";const t=setInterval(()=>{n--;$("revealTitle").textContent=n;if(n<=0){clearInterval(t);startReveal();}},1000);};
  $("newGame").onclick=()=>{state.room=null;state.game=null;state.players=[];state.localPlayerId=null;renderHome();showScreen("home");};
  $("endLobby").onclick=()=>{state.room=null;state.game=null;state.players=[];state.localPlayerId=null;renderHome();showScreen("home");};
  $("hostControls").onclick=()=>{showModal("Host controls",`<p>Trong bản production, Host chỉ có quyền END GAME ở đây.</p><button id="modalEnd" class="danger">END GAME</button>`);$("modalEnd").onclick=()=>{$("closeModal").click();$("endLobby").click();};};
  $("closeModal").onclick=()=>$("modal").classList.add("hidden");
  function showModal(title,body){$("modalTitle").textContent=title;$("modalBody").innerHTML=body;$("modal").classList.remove("hidden");}

  // Supabase integration point. No dependency is loaded until the user supplies credentials.
  if(C.USE_SUPABASE){
    console.info("Supabase mode requested. Add the Supabase browser client and wire repository methods here.");
    setStatus("SUPABASE CONFIGURED — INTEGRATION NEXT");
  }
  renderHome();
})();
