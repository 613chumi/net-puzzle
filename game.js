/* 機房接線：遊戲本體（每日一題、自由練習共用） */
(()=>{
const {$,ls,SIZES,today,fmt,dailyKey,hashStr,mulberry32,sb,countEvent,copyText,shareText,myRank}=window.NP;
const mode=document.body.dataset.page==='daily'?'daily':'free';
const N=1,E=2,S=4,W=8, DIRS=[[N,0,-1,S],[E,1,0,W],[S,0,1,N],[W,-1,0,E]];
const rot=m=>((m<<1)|(m>>3))&15;
const sizeKey=mode==='daily'?'netDailySize':'netPracticeSize';

let day=today(), rnd=Math.random;
let n, sol=[], cur=[], turns=[], locked=[], shown=[], moves=0, hints=0, solved=false, cx=0, cy=0;
let startT=null, timerId=0, started=true, focusI=0, lastWin=null, winSecs=0, winToken=0, autoTimer=0;

const firstUndone=()=>SIZES.find(s=>!ls.get(dailyKey(today(),s),null));
const qs=+new URLSearchParams(location.search).get('size');
n=SIZES.includes(qs)?qs:(mode==='daily'?(firstUndone()??ls.get(sizeKey,5)):ls.get(sizeKey,5));
if(!SIZES.includes(n))n=5;

/* ---------- 出題：從中間的交換器長出一棵隨機樹，葉子是伺服器 ---------- */
function generate(retry){
  if(!retry){day=today();rnd=mode==='daily'?mulberry32(hashStr('net-'+day+'-'+n)):Math.random}
  const T=n*n; sol=new Array(T).fill(0); cx=Math.floor(n/2); cy=Math.floor(n/2);
  const inT=new Array(T).fill(false), deg=new Array(T).fill(0); inT[cy*n+cx]=true;
  let fr=[], count=1;
  const add=i=>{const x=i%n,y=(i/n)|0;
    for(const [b,dx,dy,o] of DIRS){const nx=x+dx,ny=y+dy;if(nx<0||ny<0||nx>=n||ny>=n)continue;const j=ny*n+nx;if(!inT[j])fr.push([i,j,b,o])}};
  add(cy*n+cx);
  while(count<T){
    fr=fr.filter(f=>!inT[f[1]]);
    let cand=fr.filter(f=>deg[f[0]]<3); if(!cand.length)cand=fr;   // 盡量不要十字路口
    const [i,j,b,o]=cand[Math.floor(rnd()*cand.length)];
    sol[i]|=b; sol[j]|=o; deg[i]++; deg[j]++; inT[j]=true; count++; add(j);
  }
  cur=sol.slice(); turns=new Array(T).fill(0); locked=new Array(T).fill(false);
  for(let i=0;i<T;i++){
    let r=Math.floor(rnd()*4); if(sol[i]===5||sol[i]===10)r=r%2||1;   // 直線轉 180° 等於沒轉
    for(let k=0;k<r;k++)cur[i]=rot(cur[i]); turns[i]=r;
  }
  if(isSolved())return generate(true);
  moves=0;hints=0;solved=false;startT=null;clearInterval(timerId);$('sTime').textContent='0:00';
}
function powered(){
  const lit=new Array(n*n).fill(false), st=[cy*n+cx]; lit[st[0]]=true;
  while(st.length){const i=st.pop(),x=i%n,y=(i/n)|0;
    for(const [b,dx,dy,o] of DIRS){if(!(cur[i]&b))continue;const nx=x+dx,ny=y+dy;
      if(nx<0||ny<0||nx>=n||ny>=n)continue;const j=ny*n+nx;if((cur[j]&o)&&!lit[j]){lit[j]=true;st.push(j)}}}
  return lit;
}
function isSolved(){
  for(let i=0;i<n*n;i++){const x=i%n,y=(i/n)|0;
    for(const [b,dx,dy,o] of DIRS){if(!(cur[i]&b))continue;const nx=x+dx,ny=y+dy;
      if(nx<0||ny<0||nx>=n||ny>=n)return false;if(!(cur[ny*n+nx]&o))return false}}
  return powered().every(Boolean);
}

/* ---------- 畫格子 ---------- */
function svgFor(i){
  const m=sol[i], isSw=i===cy*n+cx, d=[N,E,S,W].filter(b=>m&b).length, leaf=d===1&&!isSw;
  const end={[N]:[50,0],[E]:[100,50],[S]:[50,100],[W]:[0,50]};
  let p='', icon='';
  for(const b of [N,E,S,W]) if(m&b) p+=`<line class="w" x1="50" y1="50" x2="${end[b][0]}" y2="${end[b][1]}"/>`;
  if(isSw) icon=`<rect class="sw" x="22" y="30" width="56" height="40" rx="6"/>`+[32,44,56,68].map(x=>`<rect class="swp" x="${x-4}" y="44" width="8" height="10" rx="1"/>`).join('');
  else if(leaf) icon=`<rect class="srv" x="27" y="27" width="46" height="46" rx="6"/><line class="w" x1="36" y1="43" x2="54" y2="43" style="stroke-width:5"/><line class="w" x1="36" y1="57" x2="54" y2="57" style="stroke-width:5"/><circle class="led" cx="63" cy="43" r="4"/>`;
  else if(d>=3) p+=`<circle class="hub" cx="50" cy="50" r="11"/>`;
  return `<svg viewBox="0 0 100 100" aria-hidden="true">${p}</svg>`+(icon?`<svg class="ic" viewBox="0 0 100 100" aria-hidden="true">${icon}</svg>`:'');
}
function sizeChips(){
  $('sizes').innerHTML=SIZES.map(s=>{
    const done=mode==='daily'&&ls.get(dailyKey(day,s),null);
    return `<button type="button" class="chip${done?' done':''}" data-n="${s}" aria-pressed="${s===n}">${s}×${s}${done?' ✓':''}</button>`}).join('');
}
const dailyRecord=()=>mode==='daily'?ls.get(dailyKey(day,n),null):null;

function build(){
  winToken++; clearInterval(autoTimer);
  if(lastWin&&!$('autoLine').hidden&&!$('renameBtn').hidden){const nm=ls.get('netName','');if(nm)doSubmit(nm)}
  const rec=dailyRecord();
  if(rec){cur=sol.slice();turns.fill(0);locked.fill(false);solved=true}
  started=!(mode==='daily'&&!rec);
  const b=$('board'), stage=b.parentElement;
  b.style.gridTemplateColumns=`repeat(${n},minmax(0,1fr))`; b.innerHTML=''; shown=[]; focusI=cy*n+cx;
  for(let i=0;i<n*n;i++){
    const t=document.createElement('button');t.type='button';t.className='tile';t.dataset.i=i;
    t.setAttribute('aria-label',`第 ${((i/n)|0)+1} 列第 ${i%n+1} 格`);
    t.innerHTML=svgFor(i); t.tabIndex=i===focusI?0:-1; b.appendChild(t);
    shown[i]=turns[i]*90; t.firstChild.style.transform=`rotate(${shown[i]}deg)`;
  }
  $('win').hidden=true; stage.classList.remove('done','anim');
  $('startCover').hidden=started; stage.classList.toggle('veil',!started);
  $('rackLbl').textContent=mode==='daily'?`今天的 ${n}×${n}`:`練習 ${n}×${n}`;
  sizeChips();
  if($('sBest'))$('sBest').textContent=ls.get('netBest'+n,null)??'—';
  $('hintBtn').disabled=!!rec;
  refresh();
  if(rec)showDone(rec);
  if(mode==='daily')loadMini();
}
function refresh(){
  const lit=powered(); let on=0,all=0;
  [...$('board').children].forEach((t,i)=>{
    t.classList.toggle('lit',lit[i]); t.classList.toggle('locked',locked[i]);
    if([N,E,S,W].filter(b=>sol[i]&b).length===1&&i!==cy*n+cx){all++;if(lit[i])on++}
  });
  $('sOn').textContent=on;$('sAll').textContent=all;$('sMoves').textContent=moves;$('sHints').textContent=hints;
  if(!solved&&isSolved())win();
}
function startTimer(){if(startT!==null)return;startT=Date.now();timerId=setInterval(()=>{$('sTime').textContent=fmt(elapsed())},1000)}
const elapsed=()=>startT===null?0:Math.round((Date.now()-startT)/1000);
function turn(i){
  if(!started||solved||locked[i])return;
  startTimer();
  cur[i]=rot(cur[i]); turns[i]=(turns[i]+1)%4; moves++;
  shown[i]+=90; $('board').children[i].firstChild.style.transform=`rotate(${shown[i]}deg)`;
  refresh();
}
function toggleLock(i){if(solved||!started)return;locked[i]=!locked[i];refresh()}
function hint(){
  if(solved||!started)return;
  const bad=[];for(let i=0;i<n*n;i++)if(cur[i]!==sol[i])bad.push(i);
  if(!bad.length)return;
  startTimer();
  const i=bad[Math.floor(Math.random()*bad.length)];
  while(cur[i]!==sol[i]){cur[i]=rot(cur[i]);turns[i]=(turns[i]+1)%4;shown[i]+=90}
  $('board').children[i].firstChild.style.transform=`rotate(${shown[i]}deg)`;
  locked[i]=true; hints++; refresh();
}

/* ---------- 過關 ---------- */
function win(){
  solved=true; clearInterval(timerId); winSecs=elapsed(); $('sTime').textContent=fmt(winSecs);   // 計時在這裡就停了
  const token=++winToken, delay=playPower();
  setTimeout(()=>{if(token===winToken)finishWin()},delay);
}
/* 電流從交換器一層一層亮到每台伺服器 */
function playPower(){
  if(matchMedia('(prefers-reduced-motion: reduce)').matches)return 0;
  const T=n*n, dist=new Array(T).fill(-1), q=[cy*n+cx]; dist[q[0]]=0;
  while(q.length){const i=q.shift(),x=i%n,y=(i/n)|0;
    for(const [b,dx,dy,o] of DIRS){if(!(cur[i]&b))continue;const nx=x+dx,ny=y+dy;
      if(nx<0||ny<0||nx>=n||ny>=n)continue;const j=ny*n+nx;if((cur[j]&o)&&dist[j]<0){dist[j]=dist[i]+1;q.push(j)}}}
  const max=Math.max(...dist), step=Math.min(90,1300/Math.max(1,max));
  const tiles=[...$('board').children], stage=$('board').parentElement;
  stage.classList.add('anim'); locked.fill(false); tiles.forEach(t=>t.classList.remove('locked'));
  tiles.forEach((t,i)=>{if(i!==cy*n+cx)t.classList.remove('lit')});
  tiles.forEach((t,i)=>{if(dist[i]<0)return;setTimeout(()=>{t.classList.add('lit');
    if(t.querySelector('.srv')){t.classList.remove('pop');void t.offsetWidth;t.classList.add('pop')}},dist[i]*step)});
  setTimeout(()=>{stage.classList.remove('anim');tiles.forEach(t=>t.classList.remove('pop'))},max*step+700);
  return max*step+550;
}
function finishWin(){
  $('board').parentElement.classList.add('done');
  const secs=winSecs, key='netBest'+n, best=ls.get(key,null);
  let msg=`${n}×${n} · 轉了 ${moves} 下 · ${fmt(secs)}`+(hints?` · 用了 ${hints} 次提示`:'');
  if(!hints&&(best===null||moves<best)){ls.set(key,moves);msg+=' · 個人新紀錄！';if($('sBest'))$('sBest').textContent=moves}
  countEvent('win-'+n+'x'+n,'過關 '+n+'×'+n);
  $('winTitle').textContent='全部連線 ✓';
  $('submitForm').hidden=true;$('submitMsg').textContent='';$('autoLine').hidden=true;
  if(mode==='daily'){
    const dk=dailyKey(day,n);
    ls.set(dk,{moves,seconds:secs,hints});
    sizeChips();
    if(hints)msg+=' · 用了提示，這次不能上排行榜';
    else if(sb){lastWin={moves,seconds:secs,dk,size:n,day};const saved=ls.get('netName','');
      if(saved)startAuto(saved);else{$('submitForm').hidden=false;$('nameIn').value=''}}
  }
  setWinButtons(); prepShare();
  $('winText').textContent=msg; $('win').hidden=false;
  if(!$('submitForm').hidden)$('nameIn').focus({preventScroll:true});
  else if(!$('autoLine').hidden)$('renameBtn').focus({preventScroll:true});
  else $('againBtn').focus({preventScroll:true});
}
/* 分享成績：先把名次查好，按下去時才能馬上複製 */
let shareInfo=null;
async function prepShare(){
  if(mode!=='daily')return;
  const d=day, size=n, rec=ls.get(dailyKey(d,size),null); if(!rec)return;
  shareInfo={day:d,size,moves:rec.moves,seconds:rec.seconds};
  const r=await myRank(d,size);
  if(r&&size===n&&d===day)shareInfo={day:d,size,...r};
}
function setWinButtons(){
  if($('shareBtn')){$('shareBtn').hidden=mode!=='daily';$('shareMsg').textContent=''}
  const lb=$('toLbBtn'); lb.href='leaderboard.html?size='+n; lb.hidden=mode!=='daily';
  if(mode==='daily'){const nx=firstUndone(); $('againBtn').textContent=nx?`接著玩 ${nx}×${nx}`:'去自由練習';}
  else $('againBtn').textContent='下一題';
}
/* 今天這題已經玩過：顯示答案、鎖住 */
function showDone(rec){
  $('board').parentElement.classList.add('done');
  moves=rec.moves;$('sMoves').textContent=rec.moves;$('sTime').textContent=fmt(rec.seconds||0);$('sHints').textContent=rec.hints||0;
  $('winTitle').textContent=`今天的 ${n}×${n} 已經完成 🔒`;
  $('winText').textContent=`轉了 ${rec.moves} 下 · ${fmt(rec.seconds||0)}`+(rec.hints?` · 用了 ${rec.hints} 次提示`:'')+' · 明天 00:00 換新題目';
  $('submitForm').hidden=true;$('autoLine').hidden=true;
  setWinButtons(); $('win').hidden=false; prepShare();
}

/* ---------- 上排行榜 ---------- */
let myIds=ls.get('netMyIds',[]);
async function doSubmit(name){
  if(!lastWin||!sb)return false;
  const w=lastWin;
  const {data,error}=await sb.from('scores').insert({day:w.day,size:w.size,name,moves:w.moves,seconds:w.seconds}).select('id').single();
  if(error)return false;
  ls.set('netName',name); myIds.push(data.id); myIds=myIds.slice(-80); ls.set('netMyIds',myIds);
  const st=ls.get(w.dk,{}); st.submitted=true; ls.set(w.dk,st); if(lastWin===w)lastWin=null;
  if(mode==='daily'){loadMini();prepShare()} return true;
}
function startAuto(name){
  let left=3; $('autoLine').hidden=false; $('renameBtn').hidden=false;
  const show=()=>{$('autoText').textContent=`${left} 秒後以「${name}」登上排行榜`};
  show(); clearInterval(autoTimer);
  autoTimer=setInterval(async()=>{
    left--; if(left>0){show();return}
    clearInterval(autoTimer); $('renameBtn').hidden=true; $('autoText').textContent='送出中…';
    if(await doSubmit(name))$('autoText').textContent=`已用「${name}」登上排行榜！`;
    else{$('autoLine').hidden=true;$('submitForm').hidden=false;$('nameIn').value=name;$('submitMsg').textContent='自動送出失敗，檢查網路後按送出再試一次。'}
  },1000);
}
$('renameBtn').addEventListener('click',()=>{clearInterval(autoTimer);$('autoLine').hidden=true;$('submitForm').hidden=false;$('nameIn').value=ls.get('netName','');$('nameIn').focus();$('nameIn').select()});
$('submitForm').addEventListener('submit',async e=>{
  e.preventDefault(); if(!lastWin||!sb)return;
  const name=$('nameIn').value.trim().slice(0,12);
  if(!name){$('submitMsg').textContent='請先輸入暱稱。';return}
  $('submitBtn').disabled=true; $('submitMsg').textContent='送出中…';
  const ok=await doSubmit(name); $('submitBtn').disabled=false;
  if(!ok){$('submitMsg').textContent='送出失敗，檢查網路後再按一次送出。';return}
  $('submitForm').hidden=true; $('winText').textContent+=' · 已登上排行榜！';
});

/* 每日一題下方的「今日前 3 名」 */
async function loadMini(){
  const box=$('mini'); if(!box)return;
  $('miniTitle').textContent=`今日 ${n}×${n} 前 3 名`; $('miniMore').href='leaderboard.html?size='+n;
  if(!sb){box.innerHTML='<p class="empty">排行榜暫時連不上。</p>';return}
  const size=n;
  const {data,error}=await sb.from('scores').select('id,name,moves,seconds').eq('day',today()).eq('size',size)
    .order('moves').order('seconds').order('created_at').limit(3);
  if(size!==n)return;
  if(error){box.innerHTML='<p class="empty">排行榜暫時讀不到。</p>';return}
  if(!data.length){box.innerHTML='<p class="empty">今天還沒有人上榜，搶第一！</p>';return}
  const medal=['🥇','🥈','🥉'], ol=document.createElement('ol'); ol.className='list';
  data.forEach((r,k)=>{const li=document.createElement('li');if(myIds.includes(r.id))li.className='me';
    li.innerHTML=`<span class="rk">${medal[k]}</span><span class="nm"></span><span class="sc">${r.moves} 下 · ${fmt(r.seconds)}</span>`;
    li.querySelector('.nm').textContent=r.name; ol.appendChild(li)});
  box.innerHTML=''; box.appendChild(ol);
}

/* ---------- 操作 ---------- */
const board=$('board'); let press=null, skipClick=false;
board.addEventListener('pointerdown',e=>{const t=e.target.closest('.tile');if(!t||e.button!==0)return;
  skipClick=false;press=setTimeout(()=>{skipClick=true;toggleLock(+t.dataset.i)},450)});
['pointerup','pointerleave','pointercancel'].forEach(ev=>board.addEventListener(ev,()=>clearTimeout(press)));
board.addEventListener('click',e=>{const t=e.target.closest('.tile');if(!t)return;if(skipClick){skipClick=false;return}turn(+t.dataset.i)});
board.addEventListener('contextmenu',e=>{const t=e.target.closest('.tile');if(!t)return;e.preventDefault();clearTimeout(press);toggleLock(+t.dataset.i)});
function focusTile(i){const tiles=board.children;if(!tiles[i])return;tiles[focusI]&&(tiles[focusI].tabIndex=-1);focusI=i;tiles[i].tabIndex=0;tiles[i].focus()}
const MOVES={ArrowUp:[0,-1],ArrowDown:[0,1],ArrowLeft:[-1,0],ArrowRight:[1,0]};
board.addEventListener('keydown',e=>{const t=e.target.closest('.tile');if(!t)return;const i=+t.dataset.i;
  if(e.key==='l'||e.key==='L'){e.preventDefault();toggleLock(i);return}
  const m=MOVES[e.key];if(!m)return;e.preventDefault();
  focusTile(Math.min(n-1,Math.max(0,((i/n)|0)+m[1]))*n+Math.min(n-1,Math.max(0,i%n+m[0])))});
board.addEventListener('focusin',e=>{const t=e.target.closest('.tile');if(t&&+t.dataset.i!==focusI)focusTile(+t.dataset.i)});
document.addEventListener('keydown',e=>{
  if(!MOVES[e.key]||e.target.closest?.('#board,input')||e.altKey||e.ctrlKey||e.metaKey||solved)return;
  e.preventDefault(); if(!started){$('startBtn').focus();return} focusTile(focusI)});

$('startBtn').addEventListener('click',()=>{started=true;$('startCover').hidden=true;board.parentElement.classList.remove('veil');startTimer();focusTile(focusI)});
$('sizes').addEventListener('click',e=>{const b=e.target.closest('.chip');if(!b)return;n=+b.dataset.n;ls.set(sizeKey,n);generate();build()});
$('hintBtn').addEventListener('click',hint);
$('shareBtn')?.addEventListener('click',()=>copyText(shareText(shareInfo||{}),$('shareMsg')));
$('newBtn')?.addEventListener('click',()=>{generate();build()});
$('againBtn').addEventListener('click',()=>{
  if(mode==='daily'){const nx=firstUndone();if(!nx){location.href='practice.html';return}n=nx;ls.set(sizeKey,n)}
  generate();build();
});
// 跨過午夜時，每日一題自動換新的一天
setInterval(()=>{if(mode==='daily'&&today()!==day&&startT===null){generate();build()}},60000);

generate();build();
})();
