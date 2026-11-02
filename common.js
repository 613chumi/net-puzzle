/* 機房接線：每一頁都會用到的共用功能
   存檔、日期、排行榜連線、在線人數、底部導覽列 */
window.NP=(()=>{
  const $=id=>document.getElementById(id);
  const ls={
    get(k,d){try{const v=localStorage.getItem(k);return v===null?d:JSON.parse(v)}catch(e){return d}},
    set(k,v){try{localStorage.setItem(k,JSON.stringify(v))}catch(e){}}
  };
  const SIZES=[5,6,7,9];

  /* 台灣時間的日期；offset=-1 是昨天 */
  const today=(offset=0)=>new Intl.DateTimeFormat('en-CA',{timeZone:'Asia/Taipei',year:'numeric',month:'2-digit',day:'2-digit'})
    .format(new Date(Date.now()+offset*86400000));
  const fmt=s=>Math.floor(s/60)+':'+String(s%60).padStart(2,'0');
  const dailyKey=(day,n)=>'netDaily-'+day+'-'+n;
  const doneSizes=day=>SIZES.filter(n=>ls.get(dailyKey(day,n),null));

  /* 連續幾天有完成至少一題每日一題（今天還沒玩的話，從昨天開始算） */
  function streak(){
    let off=doneSizes(today()).length?0:-1, c=0;
    while(c<400&&doneSizes(today(off)).length){c++;off--}
    return c;
  }

  /* 固定種子的亂數：同一天同一個大小，大家拿到一樣的題目 */
  function hashStr(str){let h=1779033703^str.length;for(let k=0;k<str.length;k++){h=Math.imul(h^str.charCodeAt(k),3432918353);h=h<<13|h>>>19}return h>>>0}
  function mulberry32(a){return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}}

  /* 排行榜資料庫（Supabase 的網址和 publishable key 本來就是公開的） */
  const SB_URL='https://yqgxnlbplpekpeblhvep.supabase.co';
  const SB_KEY='sb_publishable_RjvCXltlsYT8GqV7YJQ_mA_MJQNrdKP';
  const sb=window.supabase?window.supabase.createClient(SB_URL,SB_KEY):null;

  /* 圖示 */
  const IC={
    home:'<path d="M5 15 16 6l11 9v11H19v-7h-6v7H5z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>',
    cal:'<rect x="5" y="7" width="22" height="20" rx="4" fill="none" stroke="currentColor" stroke-width="2.5"/><path d="M5 13h22M11 4v6M21 4v6" stroke="currentColor" stroke-width="2.5" stroke-linecap="round"/><rect x="10" y="17" width="5" height="5" rx="1" fill="currentColor"/>',
    tool:'<path d="M20 5a6 6 0 0 0-6 8L6 21a2.5 2.5 0 0 0 3.5 3.5l8-8a6 6 0 0 0 8-6l-4 1-3-3z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>',
    cup:'<path d="M10 6h12v6a6 6 0 0 1-12 0zM10 8H6a4 4 0 0 0 4 5M22 8h4a4 4 0 0 1-4 5M16 18v4M11 26h10" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linecap="round" stroke-linejoin="round"/>',
    book:'<path d="M5 7c4-2 8-2 11 1v18c-3-3-7-3-11-1zM27 7c-4-2-8-2-11 1v18c3-3 7-3 11-1z" fill="none" stroke="currentColor" stroke-width="2.5" stroke-linejoin="round"/>'
  };
  const icon=k=>`<svg viewBox="0 0 32 32" aria-hidden="true">${IC[k]}</svg>`;

  /* 底部導覽列 */
  function nav(){
    const items=[['index.html','home','首頁','var(--blue)','home'],['daily.html','cal','每日','var(--amber)','daily'],
      ['practice.html','tool','練習','var(--cyan)','practice'],['leaderboard.html','cup','排行','var(--pink)','board'],['howto.html','book','說明','var(--violet)','howto']];
    const page=document.body.dataset.page, el=document.createElement('nav');
    el.className='nav'; el.setAttribute('aria-label','頁面');
    el.innerHTML=items.map(([href,ic,t,c,p])=>`<a href="${href}" style="--n:${c}"${p===page?' aria-current="page"':''}>${icon(ic)}${t}</a>`).join('');
    document.body.appendChild(el);
  }

  /* 在線人數：每一頁都會回報「我在這裡」 */
  function online(){
    if(!sb)return;
    try{
      const me=Math.random().toString(36).slice(2);
      const ch=sb.channel('online-net-puzzle',{config:{presence:{key:me}}});
      ch.on('presence',{event:'sync'},()=>{
        const c=Object.keys(ch.presenceState()).length;
        document.querySelectorAll('[data-online]').forEach(e=>e.textContent=c);
        document.querySelectorAll('[data-online-wrap]').forEach(e=>e.hidden=c<1);
      }).subscribe(async st=>{if(st==='SUBSCRIBED')await ch.track({at:Date.now(),page:document.body.dataset.page})});
    }catch(e){}
  }

  /* 統計過關次數（GoatCounter） */
  function countEvent(path,title){try{window.goatcounter&&window.goatcounter.count&&window.goatcounter.count({path,title,event:true})}catch(e){}}

  nav(); online();
  return {$,ls,SIZES,today,fmt,dailyKey,doneSizes,streak,hashStr,mulberry32,sb,icon,countEvent};
})();
