// 新規セーブか（スタート特典の判定に使う。既存セーブには配らない）
const NEW_SAVE=(()=>{try{return localStorage.getItem('kamigami-v1')===null}catch(e){return false}})();
if(NEW_SAVE)save.starterPending=true;
// ==== ホーム・パック開封・図鑑（第1弾「雷鳴の社」）====
// index.html の最後で読み込み、旧 home / pack / reveal / take / album / card を置き換える。
// 対戦ルール・カードの数値は arena.js / index.html の既存定義（gods・moves）をそのまま使う。

// 第1弾「雷鳴の社」：天象デッキ（ライガの対戦デッキ）を構成する6枚
// ---- 資源と報酬：パックチケット・神の欠片・通算勝利数（セーブに追加。既存の所持カード・図鑑はそのまま） ----
const UNLIMITED_PACKS=true;    // true にすると開封し放題のテスト用に戻る
// パックのレア度の出やすさ（%）。合計100。以前は N52・U30・R14・SR4
// パックの中身：1パック5枚＝主神1枚（確定）＋仲間・呪文4枚。4枚の枠はレアリティの出やすさ（%）で選び、その中からカードを選ぶ。
// レアリティはカードごとに固定（godcards.js の CARD_TABLE）。SRの段階は無い。
const RARITY_RATES={N:60,U:28,R:12};
function rollRank(t){let acc=0,sum=RARITY_RATES.N+RARITY_RATES.U+RARITY_RATES.R;for(const r of ['N','U','R']){acc+=RARITY_RATES[r]/sum;if(t<acc)return r}return 'R'}
const pickOne=a=>a[Math.floor(Math.random()*a.length)];
// 主神枠の形態の出やすさ（%）。引いたR・SRはコレクション専用（対戦は常にN形態から）
const HERO_FORM_RATES={N:80,R:15,SR:5},FORM_STAGE={N:0,R:1,SR:2};
function rollForm(t){let acc=0;for(const f of ['N','R','SR']){acc+=HERO_FORM_RATES[f]/100;if(t<acc)return f}return 'SR'}
const heroForm=x=>x[1]==='R'||x[1]==='SR'?x[1]:'N';   // 以前の '主神' はN形態
const ownForm=(id,f)=>save.cards.some(x=>x[0]===id&&heroForm(x)===f);
function rollPack(){let pool=[...SET_ALL.allies,...SET_ALL.spells],out=[[pickOne(SET_ALL.heroes),rollForm(Math.random())]];
 for(let i=0;i<4;i++){let r=rollRank(Math.random()),c=pool.filter(k=>cardRarity(k)===r);if(!c.length)c=pool;let k=pickOne(c);out.push([k,cardRarity(k)])}
 for(let i=out.length-1;i>0;i--){let j=Math.floor(Math.random()*(i+1));[out[i],out[j]]=[out[j],out[i]]}return out}
const REWARD={win:{tickets:1,wins:1},lose:{shards:1},firstTickets:3};
// 実験版：全カードを2枚ずつ（主神は1枚）持った状態から始める。足りない分だけ足す（セーブの形は同じ）
const EXPERIMENT_ALL_CARDS=true;
if(EXPERIMENT_ALL_CARDS){let add=0;for(const id of SET_ALL.cards){let need=SET_ALL.heroes.includes(id)?1:2,have=SET_ALL.heroes.includes(id)?(ownForm(id,'N')?1:0):save.cards.filter(x=>x[0]===id).length;for(;have<need;have++){save.cards.push([id,SET_ALL.heroes.includes(id)?'N':cardRarity(id)]);add++}}if(add)persist()}
if(typeof save.tickets!=='number'){save.tickets=REWARD.firstTickets;persist()}   // 初回起動・チケット未保存のデータは3枚から
if(typeof save.shards!=='number')save.shards=0;
if(typeof save.wins!=='number')save.wins=0;
const packsLeft=()=>UNLIMITED_PACKS?Infinity:save.tickets,packLabel=()=>UNLIMITED_PACKS?'∞':save.tickets;
let lastReward=null;
function grantReward(won){if(window.__storyBattle)return {won,story:true};let r=won?REWARD.win:REWARD.lose;for(const k in r)save[k]=(save[k]||0)+r[k];persist();return {won,...r}}
const TICKET='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 7h18v3a2 2 0 0 0 0 4v3H3v-3a2 2 0 0 0 0-4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M9 8v8" stroke="currentColor" stroke-width="1.4" stroke-dasharray="2 2"/></svg>';
const SHARD='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M12 2l6 8-6 12-6-12z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/><path d="M6 10h12M12 2v20" stroke="currentColor" stroke-width="1" opacity=".6"/></svg>';
const CROWN='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M3 18h18l1-11-5 4-5-7-5 7-5-4z" fill="none" stroke="currentColor" stroke-width="1.7" stroke-linejoin="round"/></svg>';
function wallet(){return '<div class="wallet"><span class="w-tk">'+TICKET+'<small>チケット</small><b>'+packLabel()+'</b></span><span class="w-sh">'+SHARD+'<small>神の欠片</small><b>'+save.shards+'</b></span><span class="w-wn">'+CROWN+'<small>通算勝利</small><b>'+save.wins+'</b></span></div>'}
// 対戦終了画面：勝敗ともらった報酬
function resultScreen(){if(window.__storyBattle&&typeof storyResult==='function'){storyResult();return}tag.textContent='';let r=lastReward||{won:ending==='勝利'},won=ending==='勝利';
 app.innerHTML='<div class="scene resultscreen '+(won?'win':'lose')+'"><div class="sc-bg dim"></div><div class="sc-rain"></div><div class="sc-frame"></div>'
 +'<div class="rs-in"><p class="rs-sub">'+titles[p.id]+' '+names[p.id]+' × '+titles[c.id]+' '+names[c.id]+'</p><h2 class="rs-title">'+(won?'勝利':'敗北')+'</h2><p class="rs-why">'+(won?'相手の本陣を突破しました。':r.surrender?'降参しました。':'神殿を突破されました。')+'</p>'
 +'<div class="rs-reward"><p>報酬</p>'+(won?'<span class="rw">'+TICKET+'パックチケット ×'+(r.tickets||0)+'</span><span class="rw">'+CROWN+'通算勝利 +'+(r.wins||0)+'</span>':(r.surrender?'<small>降参のため報酬はありません</small>':'<span class="rw">'+SHARD+'神の欠片 ×'+(r.shards||0)+'</span><small>神の欠片の使い道は近日追加予定です</small>'))+'</div>'
 +wallet()
 +'<div class="res-actions">'+(packsLeft()?'<button class="btn-gold-s" onclick="pack()">パックを開ける'+(UNLIMITED_PACKS?'':'（チケット'+save.tickets+'枚）')+'</button>':'')
 +'<button class="btn-navy" onclick="start('+p.id+')">もう一度戦う</button><button class="btn-navy" onclick="home()">ホーム</button></div></div></div>'}
function resetCollection(){if(!document.getElementById('rsok')){let b=document.getElementById('rsbtn');if(b){b.outerHTML='<span class="rs-ask">図鑑を空にしますか？ <button class="btn-navy" id="rsok" onclick="resetCollection()">空にする</button> <button class="btn-navy" onclick="album()">やめる</button></span>'}return}save.cards=[];save.pending=[];persist();album()}
const SET1=SET_ALL;
let chooseOpen=false,lastPack=[],zoom=null;

const isGod=id=>typeof id==='number';
function cardNo(id){let i=SET1.cards.indexOf(id);return i<0?'':'雷鳴-'+String(i+1).padStart(3,'0')}
function cardArt(id,r){return isGod(id)?(id===2&&r==='SR'&&portraits[12]?portraits[12]:portraits[id]):art(id)}
function cardName(id){return isGod(id)?titles[id]+' '+names[id]:spellName(id)}
function cardText(id){if(GOD_CARDS[id])return stageText(id,0);let t=CARD_TABLE[id]||{},full=cardFull(id),e=EXP_CARDS[id],g=isGod(id)?gods[id]:e&&e.kind==='ally'?[e.atk,e.hp]:null;
 return (g?'攻撃力'+g[0]+' / 体力'+g[1]+'。':'')+full+(t.later?'<br><small>（今の対戦デッキにはまだ入っていません）</small>':'')}
const BOLT='<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14 1 4 14h7l-2 9 11-14h-7z" fill="currentColor"/></svg>';

// カード（開封・図鑑共通）。レア度で枠が変わる：N通常／U銀／R金箔／SR虹箔
function card(x,cls=''){let id=x[0],hero=GOD_CARDS[id]&&SET_ALL.heroes.includes(id);return '<span class="cardbox '+cls+'">'+ucard(id,hero?{stage:FORM_STAGE[heroForm(x)]}:{rank:cardRarity(id)})+'</span>'}

// ---- ホーム ----
function home(){if(save.starterPending){starter();return}tag.textContent='';chooseOpen=false;zoom=null;
 app.innerHTML='<div class="scene home home3"><div class="sc-bg"></div><img class="home-art" src="art/home-gods.webp" alt=""><div class="home-shade"></div>'
 +'<header class="h3-head"><h1 class="logo3"><b>神々の一手</b><i></i><svg viewBox="-60 -60 120 120" aria-hidden="true"><circle r="56" fill="none" stroke="#e8c060" stroke-width="7"/><g fill="#e8c060">'+[0,120,240].map(r=>'<g transform="rotate('+r+')">'+TOMOE+'</g>').join('')+'</g></svg><span>雷鳴の社</span></h1>'
 +'<div class="res-chips"><span class="chip">'+TICKET+'<small>チケット</small><b>'+packLabel()+'</b></span><span class="chip sh">'+SHARD+'<small>神の欠片</small><b>'+save.shards+'</b></span></div></header>'
 +'<div class="home-main"><button class="btn-duel2" onclick="chooseGod()"><span class="duel-cards" aria-hidden="true">'+[0,1].map(k=>'<i class="mc'+k+'"><svg viewBox="-60 -60 120 120"><g fill="#e8c060">'+[0,120,240].map(r=>'<g transform="rotate('+r+')">'+TOMOE+'</g>').join('')+'</g></svg></i>').join('')+'</span>'
 +'<i class="wave l"></i><i class="wave r"></i><b>対戦する</b><span class="duel-wins">'+CROWN+'通算勝利 <em>'+save.wins+'</em></span></button>'
 +'<div class="home-subs"><button class="btn-howto" onclick="storyMenu()">ストーリー</button><button class="btn-howto" onclick="deckEdit()">デッキ編成</button><button class="btn-howto" onclick="howto()">遊び方</button></div>'+(warning?'<small class="warn">'+warning+'</small>':'')+'</div>'
 +'<nav class="tabbar3" aria-label="メニュー"><button class="tile on" aria-label="ホーム" aria-current="page" onclick="home()"><img src="art/tab-home.webp" alt=""></button>'
 +'<button class="tile" aria-label="パック開封" onclick="pack()"><img src="art/tab-pack.webp" alt="">'+(save.pending.length?'<em>開封中</em>':packsLeft()?'<em>'+packLabel()+'</em>':'')+'</button>'
 +'<button class="tile" aria-label="図鑑" onclick="album()"><img src="art/tab-album.webp" alt=""></button></nav>'
+'<div class="choose" id="choose" hidden><div class="ch-in"><h2>使う主神を選ぶ</h2>'+(typeof deckValid==='function'&&deckValid(save.deck)?'<button class="ch-my" onclick="window.__myDeckNext=true;start('+save.deck.hero+')"><b>マイデッキで対戦</b><small>'+GOD_CARDS[save.deck.hero].type+' '+GOD_CARDS[save.deck.hero].name+'・'+save.deck.cards.length+'枚</small></button><p class="ch-or">または、標準デッキで</p>':'')+'<div class="ch-list five">'
 +HERO_IDS.map(i=>[i,GOD_CARDS[i].type,stageOf(i,0).name+'（攻'+stageOf(i,0).atk+' / 体'+stageOf(i,0).hp+'）']).map(([i,t,h])=>'<button class="ch-god" onclick="start('+i+')">'+gcard(i,0,null,'mini')+'<span><small>'+t+'</small><em>'+({2:'雷撃で敵を撃つ',5:'芽吹きで味方を癒す',0:'火の拳で押し切る',3:'すぐ攻めに出られる',10:'狐火で敵を弱める'})[i]+'</em></span></button>').join('')
 +'</div><button class="btn-navy" onclick="chooseGod(false)">もどる</button></div></div></div>'}
function chooseGodFromPack(){home();chooseGod()}
function chooseGod(open=true){let c=document.getElementById('choose');if(c){c.hidden=!open;if(open)requestAnimationFrame(()=>fitCards(c))}}

// ---- パック開封 ----
const TOMOE='<path d="M0,-40 A40,40 0 0 1 39.4,6.9 Q26,-10 0,-9 A15.5,15.5 0 0 1 0,-40 Z"/>';
function packArt(){return '<svg class="pk-art" viewBox="0 0 300 440" aria-hidden="true"><defs>'
 +'<linearGradient id="pkg" x1="0" y1="0" x2="1" y2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".35" stop-color="#e2b54a"/><stop offset=".6" stop-color="#9c6a1c"/><stop offset="1" stop-color="#f3d27a"/></linearGradient></defs>'
 +'<g fill="none" stroke="url(#pkg)" stroke-width="2.4" stroke-linecap="round" opacity=".95">'
 +'<path d="M28 70c10-18 34-16 38 0 6-14 30-12 30 6 12-6 26 4 18 16H34c-14 0-16-16-6-22z"/><path d="M40 80c8 0 10-8 4-10M70 78c6-6 14-4 14 2"/>'
 +'<path d="M206 118c8-14 28-12 30 2 8-8 24-4 22 10 10 0 14 14 2 18h-48c-12 0-14-24-6-30z"/><path d="M220 126c6 0 8-6 2-8"/>'
 +'<path d="M20 360c20-10 40-6 54 4 18-14 44-14 62 0"/><path d="M180 368c18-14 46-14 70 2 12-6 24-6 32 0"/></g>'
 +'<g fill="url(#pkg)"><path d="M150 24 132 62h12l-10 30 26-40h-13l11-28z"/><path d="M262 214l-18 30h10l-8 24 22-32h-11l9-22z" opacity=".9"/><path d="M36 236l-14 22h8l-6 18 18-26h-9l7-14z" opacity=".85"/></g>'
 +'<g transform="translate(150 196)"><circle r="76" fill="#1b1648" stroke="url(#pkg)" stroke-width="7"/><circle r="64" fill="none" stroke="url(#pkg)" stroke-width="1.5"/>'
 +Array.from({length:20},(_,i)=>{let a=i/20*Math.PI*2;return '<circle cx="'+(70*Math.cos(a)).toFixed(1)+'" cy="'+(70*Math.sin(a)).toFixed(1)+'" r="3" fill="url(#pkg)"/>'}).join('')
 +'<g fill="url(#pkg)" transform="scale(1.15)">'+[0,120,240].map(r=>'<g transform="rotate('+r+')">'+TOMOE+'</g>').join('')+'</g></g>'
 +'<g fill="none" stroke="url(#pkg)" stroke-width="1.5"><path d="M60 318h50M190 318h50"/><path d="M150 334l6 5-6 5-6-5z" fill="url(#pkg)"/></g>'
 +'<g transform="translate(0 392)" fill="url(#pkg)">'
 +'<g transform="translate(62 0) scale(.22)">'+[0,120,240].map(r=>'<g transform="rotate('+r+')">'+TOMOE+'</g>').join('')+'</g>'
 +'<path transform="translate(106 0)" d="M-14 2c2-8 12-8 14-2 4-6 14-4 12 4h-26z"/>'
 +'<path transform="translate(150 0)" d="M3-14-7 2h6l-3 12 11-16h-6l4-12z"/>'
 +'<g transform="translate(194 0)">'+Array.from({length:12},(_,i)=>'<ellipse rx="3" ry="9" transform="rotate('+i*30+') translate(0 -7)"/>').join('')+'<circle r="4" fill="#1b1648"/></g>'
 +'<path transform="translate(238 0)" d="M0-14c6 6 10 12 0 24-10-12-6-18 0-24zM-12-4c6 0 10 6 12 14-8 0-12-6-12-14zM12-4c-6 0-10 6-12 14 8 0 12-6 12-14z"/></g></svg>'}
function pack(){tag.textContent='';zoom=null;if(save.pending.length){revealStep();return}
 let n=packsLeft();
 app.innerHTML='<div class="scene packscreen"><div class="sc-bg dim"></div><div class="sc-rain"></div><div class="sc-frame"></div>'
 +'<header class="sc-head"><button class="btn-back" onclick="home()">‹ ホーム</button><b>第1弾　雷鳴の社</b><span class="pk-count">'+TICKET+'チケット <em id="tkn">'+packLabel()+'</em></span></header>'
 +'<div class="pk-stage"><button class="tpack'+(n?'':' empty')+'" id="wrapper" aria-label="雷鳴の社のパック。上のギザギザを横になぞるか、タップして開封" '+(n?'':'disabled')+'>'
 +'<span class="crimp top"><i class="cut"></i></span><span class="pk-body">'+packArt()+'<span class="pk-title">雷鳴の社</span><span class="pk-sheen"></span></span><span class="crimp bottom"></span></button></div>'
 +'<p class="pk-hint">'+(n?'上のギザギザを横になぞって開封（タップでも開きます）'+(UNLIMITED_PACKS?'':'　チケット1枚を使います'):'チケットがありません。チケットは対戦に勝つともらえます')+'</p>'+(n?'':'<button class="btn-gold-s" onclick="chooseGodFromPack()">対戦する</button>')
 +'<p class="pk-note">全45種（主神5・仲間17・呪文23）から5枚。主神1枚確定（主神枠の形態 N'+HERO_FORM_RATES.N+'%・R'+HERO_FORM_RATES.R+'%・SR'+HERO_FORM_RATES.SR+'%。同じ形態の2枚目以降は神の欠片5個に）<br>ほかの4枚の出やすさ N'+RARITY_RATES.N+'%・U'+RARITY_RATES.U+'%・R'+RARITY_RATES.R+'%'+(UNLIMITED_PACKS?'<br><span class="test-tag">実験中：パック無制限</span>':'')+'</p></div>';
 if(!n)return;
 let w=document.getElementById('wrapper'),x0=null,done=false,cut=w.querySelector('.cut');
 let open=()=>{if(done)return;done=true;navigator.vibrate?.(25);if(!UNLIMITED_PACKS){save.tickets--;let t=document.getElementById('tkn');if(t){t.textContent=save.tickets;t.animate([{transform:'scale(1.8)',color:'#ff9c7a'},{transform:'none'}],{duration:600})}}
  save.pending=rollPack();
  lastPack=[];persist();w.classList.add('torn');setTimeout(revealStep,calm()?0:900)};
 w.onpointerdown=e=>{let r=w.getBoundingClientRect();if(e.clientY-r.top<r.height*.22){x0=e.clientX;w.setPointerCapture(e.pointerId)}};
 w.onpointermove=e=>{if(x0==null||done)return;let r=w.getBoundingClientRect(),k=Math.min(1,Math.abs(e.clientX-x0)/(r.width*.6));cut.style.width=k*100+'%';if(k>=1)open()};
 w.onpointerup=()=>{if(!done&&x0!=null&&parseFloat(cut.style.width||0)<8)open();x0=null;if(!done)cut.style.width='0'};
 w.onclick=()=>{if(x0==null)open()}}

// 1枚ずつ公開：裏 → めくれる（Rは金、SRは虹の前触れ）。タップか上スワイプで次へ
function revealStep(){let x=save.pending[0];if(!x){packResult();return}
 let idx=5-save.pending.length+1,id=x[0],r=isGod(id)&&HERO_IDS.includes(id)?(heroForm(x)==='SR'?'SR':'主神'):cardRarity(id);
 // 裏面の時点ではレアリティを匂わせない（光・震え・待ち時間はどのカードも同じ）
 app.innerHTML='<div class="scene revealscreen"><div class="sc-bg dim"></div><div class="sc-frame"></div>'
 +'<header class="sc-head"><span></span><b>雷鳴の社　'+idx+' / 5</b><span></span></header>'
 +'<div class="rv-stage"><i class="rv-aura"></i><div class="flipper"><div class="face back"><span class="cb-emblem"><svg viewBox="-60 -60 120 120"><g fill="#e8c060">'+[0,120,240].map(r=>'<g transform="rotate('+r+')">'+TOMOE+'</g>').join('')+'</g></svg></span></div><div class="face front">'+card(x)+'</div></div></div>'
 +'<p class="rv-tip" id="rvtip"></p><button class="btn-more" onclick="'+(GOD_CARDS[id]&&SET_ALL.heroes.includes(id)?'godDetail('+id+','+FORM_STAGE[heroForm(x)]+')':'cardInfo('+(typeof id==='number'?id:'\''+id+'\'')+')')+'">くわしく・用語</button>'
 +'<button class="btn-gold-s" id="next">'+(save.pending.length===1?'結果を見る':'次のカードへ')+'</button></div>';
 let st=app.querySelector('.rv-stage'),y=null;
 st.dataset.r=r;
 setTimeout(()=>flipCard(st),calm()?0:420);
 document.getElementById('next').onclick=take;
 st.onpointerdown=e=>{y=e.clientY;st.setPointerCapture(e.pointerId)};st.onpointerup=e=>{if(y!=null&&y-e.clientY>50)take();else if(y!=null)flipCard(st);y=null}}
// 表になった後だけ、主神は金枠＋「主神あらわる！」、Rは金枠まで
function afterFlip(st){let r=st.dataset.r,tip=document.getElementById('rvtip');
 let x=save.pending[0]||[],dup=x.length&&GOD_CARDS[x[0]]&&SET_ALL.heroes.includes(x[0])&&ownForm(x[0],heroForm(x)),conv=dup?'<br><small class="convtxt">この形態は所持済み → 神の欠片×5に変換</small>':'';
 if(r==='SR'){st.classList.add('hero','sr');if(tip)tip.innerHTML='<b class="srtxt">スーパーレア！</b>'+conv;sfx('summon')}
 else if(r==='主神'){st.classList.add('hero');if(tip)tip.innerHTML='<b class="herotxt">主神あらわる！</b>'+(heroForm(x)==='R'?'<small class="formtxt">R形態</small>':'')+conv;sfx('summon')}
 else{if(r==='R')st.classList.add('r');if(tip)tip.textContent=RANK_NAME(r)}}
// めくる：90度まで回して裏→表に差し替え、残り90度を戻す（端末を問わず確実に表が出る）
async function flipCard(st){if(st.classList.contains('flip'))return;st.classList.add('flip');let f=st.querySelector('.flipper'),bk=st.querySelector('.face.back'),fr=st.querySelector('.face.front');
 if(!calm())await f.animate([{transform:'perspective(1100px) rotateY(0)'},{transform:'perspective(1100px) rotateY(90deg)'}],{duration:220,easing:'ease-in',fill:'forwards'}).finished;
 bk.style.visibility='hidden';fr.style.visibility='visible';afterFlip(st);
 if(!calm())await f.animate([{transform:'perspective(1100px) rotateY(-90deg) scale(1.04)'},{transform:'perspective(1100px) rotateY(0) scale(1)'}],{duration:320,easing:'cubic-bezier(.2,.8,.3,1.2)',fill:'forwards'}).finished}
function RANK_NAME(r){return {N:'ノーマル',U:'アンコモン',R:'レア','主神':'主神'}[r]||r}
function take(){if(!save.pending.length)return;let x=save.pending.shift(),hero=GOD_CARDS[x[0]]&&SET_ALL.heroes.includes(x[0]),isNew=hero?!ownForm(x[0],heroForm(x)):!save.cards.some(c=>c[0]===x[0]);
 if(hero&&!isNew){save.shards=(save.shards||0)+5;lastPack.push([x,false,true])}else{save.cards.push(x);lastPack.push([x,isNew])}persist();if(save.pending.length)revealStep();else packResult()}
function packResult(){
 app.innerHTML='<div class="scene revealscreen"><div class="sc-bg dim"></div><div class="sc-frame"></div>'
 +'<header class="sc-head"><span></span><b>今回のパック</b><span></span></header>'
 +'<div class="res-grid">'+(lastPack.length?lastPack:save.cards.slice(-5).map(x=>[x,false])).map(([x,n,sh])=>'<button class="res-cell" onclick="'+(GOD_CARDS[x[0]]&&SET_ALL.heroes.includes(x[0])?'godDetail('+x[0]+','+FORM_STAGE[heroForm(x)]+')':'cardInfo('+(typeof x[0]==='number'?x[0]:'\''+x[0]+'\'')+')')+'">'+card(x,'mini')+(n?'<i class="new">NEW</i>':'')+(sh?'<i class="shardconv">欠片+5</i>':'')+'</button>').join('')+'</div>'
 +'<div class="res-actions">'+(packsLeft()?'<button class="btn-gold-s" onclick="pack()">もう1パック'+(UNLIMITED_PACKS?'':'（チケット'+packLabel()+'枚）')+'</button>':'')
 +(packsLeft()?'':'<p class="pk-hint">チケットがなくなりました。チケットは対戦に勝つともらえます</p>')+'<button class="btn-navy" onclick="album()">図鑑で見る</button><button class="btn-navy" onclick="home()">ホーム</button></div></div>'}

// ---- 図鑑 ----
let alColor='all',alSort='no';
function alList(list){let L=list.filter(id=>alColor==='all'||(alColor==='none'?!colorOf(id):colorOf(id)===alColor)),rk={N:0,U:1,R:2},ci=id=>{let i=COLORS.indexOf(colorOf(id));return i<0?9:i};
 if(alSort==='cost')L=[...L].sort((a,b)=>cardCost(a)-cardCost(b));else if(alSort==='rare')L=[...L].sort((a,b)=>(rk[cardRarity(b)]||0)-(rk[cardRarity(a)]||0));else if(alSort==='color')L=[...L].sort((a,b)=>ci(a)-ci(b));return L}
function alSet(k,v){let y=document.querySelector('.al-scroll')?.scrollTop||0;if(k==='c')alColor=v;else alSort=v;album();let sc=document.querySelector('.al-scroll');if(sc)sc.scrollTop=y}
function alControls(){return '<div class="al-ctl"><div class="al-chips" role="group" aria-label="色で絞り込み">'+[['all','すべて'],...COLORS.map(c=>[c,c]),['none','色なし']].map(([v,l])=>'<button class="'+(alColor===v?'on':'')+(COLORS.includes(v)?' c-'+(COLORS.indexOf(v)+1):'')+'" onclick="alSet(\'c\',\''+v+'\')">'+l+'</button>').join('')+'</div>'
 +'<label class="al-sort">並べ替え <select onchange="alSet(\'s\',this.value)">'+[['no','番号順'],['color','色順'],['cost','コスト順'],['rare','レア度順']].map(([v,l])=>'<option value="'+v+'"'+(alSort===v?' selected':'')+'>'+l+'</option>').join('')+'</select></label></div>'}
function album(){tag.textContent='';
 let cnt=id=>save.cards.filter(c=>c[0]===id).length,gotGods=HERO_IDS.filter(id=>cnt(id)).length,gotForms=HERO_IDS.reduce((a,i)=>a+['N','R','SR'].filter(f=>ownForm(i,f)).length,0),
  mates=[...SET_ALL.allies,...SET_ALL.spells],gotMates=mates.filter(id=>cnt(id)).length,
  cell=id=>{let n=cnt(id),q=JSON.stringify(id).replace(/"/g,"'");return n
   ?'<button class="al-cell" onclick="zoomCard('+q+')">'+card([id],'mini')+'<span class="al-meta"><i class="rr r-'+cardRarity(id)+'">'+cardRarity(id)+'</i>'+colorChip(id)+'<em>×'+n+'</em></span></button>'
   :'<div class="al-cell none"><div class="tcard mini unknown"><div class="tc-in"><span>'+cardNo(id)+'</span><b>？</b><small>未入手</small></div></div><span class="al-meta">'+colorChip(id)+'<em>×0</em></span></div>'};
 app.innerHTML='<div class="scene albumscreen"><div class="sc-bg dim"></div><div class="sc-frame"></div>'
 +'<header class="sc-head"><button class="btn-back" onclick="home()">‹ ホーム</button><b>神々の図鑑</b><span>'+gotForms+' / 15形態</span></header>'
 +'<div class="al-scroll"><h2 class="al-set"><small>主神</small>神々<span>'+gotForms+' / 15形態（5神×3形態）</span></h2><div class="al-gods">'
 +HERO_IDS.map(i=>{let k=['N','R','SR'].filter(f=>ownForm(i,f)).length;return '<p class="al-godrow">'+GOD_CARDS[i].type+'　'+GOD_CARDS[i].name+(k?'<em class="own">'+k+' / 3形態</em>':'<em class="no">未入手</em>')+'</p>'
  +['N','R','SR'].map((f,st)=>{let own=ownForm(i,f);return '<button class="'+(own?'':'locked')+'" onclick="godDetail('+i+','+st+')">'+gcard(i,st,null,'mini')+'<span>'+f+'　'+stageOf(i,st).name+'<b class="'+(own?'fown':'fno')+'">'+(own?'所持':'未所持')+'</b></span></button>'}).join('')}).join('')+'</div>'
 +alControls()+'<h2 class="al-set"><small>雷鳴の社</small>仲間<span>'+SET_ALL.allies.filter(id=>cnt(id)).length+' / '+SET_ALL.allies.length+'種</span></h2><div class="al-grid">'+(alList(SET_ALL.allies).map(cell).join('')||'<p class="al-empty">この色の仲間はいません</p>')+'</div>'
 +'<h2 class="al-set"><small>雷鳴の社</small>呪文<span>'+SET_ALL.spells.filter(id=>cnt(id)).length+' / '+SET_ALL.spells.length+'種</span></h2><div class="al-grid">'+(alList(SET_ALL.spells).map(cell).join('')||'<p class="al-empty">この色の呪文はありません</p>')+'</div>'
 +'<p class="al-foot">'+(UNLIMITED_PACKS?'<span class="test-tag">実証実験版</span>　'+save.cards.length+'枚所持　<button class="btn-back" id="rsbtn" onclick="resetCollection()">図鑑をリセット</button><br>':'')+'レアリティはカードごとに決まっています。主神は形態違いをまとめて1種と数えます。</p></div>'
 +(zoom?zoomHtml():'')+'</div>'}
function zoomCard(id){zoom={id};album()}
function zoomHtml(){let {id}=zoom,r=cardRarity(id);
 return '<div class="al-zoom" onclick="if(event.target===this){zoom=null;album()}">'+card([id],'big')+'<p class="zt"><b>'+cardName(id)+'</b>　<i class="rr r-'+r+'">'+RANK_NAME(r)+'</i>　'+colorChip(id)+(GOD_CARDS[id]?'':'<small class="zcost">コスト'+cardCost(id)+'</small>')+'<br><em>'+cardShort(id)+'</em><br>'+cardText(id)+'</p>'+termList(cardText(id)+(isGod(id)&&!GOD_CARDS[id]?'仲間':''))
 +'<button class="btn-navy" onclick="zoom=null;album()">閉じる</button></div>'}
home();

// ---- 遊び方・用語集（ホームの「遊び方」ボタンから） ----
function howto(){tag.textContent='';
 const sec=(h,body)=>'<section class="ht-sec"><h3>'+h+'</h3>'+body+'</section>';
 app.innerHTML='<div class="scene howto"><div class="sc-bg dim"></div><div class="sc-frame"></div>'
 +'<header class="sc-head"><button class="sc-back" onclick="home()" aria-label="ホームへ">‹</button><b>遊び方</b><span></span></header><div class="ht-body">'
 +sec('勝ち方','<p>相手の<b>神殿</b>（伏せたカード5枚）をすべて割り、そのあと相手にもう一撃当てると勝ち。自分の神殿を全部割られて一撃受けると負け。</p><p><b>壁</b>：相手の場に仲間がいる間、神殿と主神は攻撃できません。まず仲間を倒しましょう（すり抜けを持つカードは例外です）。</p><p><b>破殿解放</b>：神殿が割れたとき、そのカードをコストなしで使えます（破殿解放）。使わなければ手札に加わります。主神の身代わりで割れたときも同じ。</p><p><b>主神は倒れない。倒れる代わりに神殿が1枚割れる</b>（主神は最大体力まで回復する。神殿が0枚のときに倒れると負け）。</p>')
 +sec('神力','<p>カードを使うためのポイント。どのカードもコストぶんの神力を払って使う。</p><ul><li>手札を毎ターン1枚まで「神力に置く」と、神力の最大値が1増える。</li><li>自分のターンの始めに、最大値まで回復する。</li></ul>')
 +sec('ターンの流れ','<ol><li>ターン開始：神力が回復し、山札から1枚引く。</li><li>手札を1枚まで神力に置ける。</li><li>仲間を召喚したり、呪文を使ったりする。</li><li>自分の神で攻撃する（1体につき1回）。場に出たターンは攻撃できません（速攻を持つカードは例外です）。主神もおたがい1ターン目は攻撃できない。相手の神か、相手の神殿をねらう。神どうしは、おたがいに攻撃力ぶんのダメージを与える。</li><li>「ターン終了」を押すと相手の番。</li></ol>')
 +sec('進化と覚醒','<ul><li><b>進化</b>：主神が通常攻撃を当てるたびに進化ゲージが1増える。自分の神殿が割れたときも、進化ゲージが1増えます。'+ASCEND.evolve.gauge+'たまると、神力'+ASCEND.evolve.cost+'を払って進化できる。</li><li><b>覚醒</b>：進化した主神は、自分の神殿が1枚でも割られたあと（身代わりで割れた場合も含む）、神力'+ASCEND.awaken.cost+'を払って覚醒できる。</li><li>形が変わると攻撃力・体力が上がり、スキルも強くなる。</li></ul>')
 +sec('天候','<p>場全体の天気で、おたがい共通。対戦は「晴れ」から始まる。対戦中は、まん中の天候表示をタップすると説明が出る。</p><ul><li><b>☀ 晴れ</b>：陽神アカツキの攻撃力が+1される。</li><li><b>☂ 雨</b>：潮神ナギの攻撃力が+1される。呪文「招雷」が使えるようになる。</li><li>「雨乞い」で雨、「雲払い」で晴れに変わる。</li></ul>')
 +sec('用語集','<dl class="terms">'+TERMS.map(([w,d])=>'<dt>'+w+'</dt><dd>'+d.replace(/^天候「.+?」：/,'')+'</dd>').join('')+'</dl>')
 +'<button class="btn-navy" onclick="home()">ホームへもどる</button></div></div>'}

// ---- スタート特典：新規セーブのときだけ、好きな主神のSR形態を1種プレゼント ----
function starter(){tag.textContent='';
 app.innerHTML='<div class="scene starter"><div class="sc-bg dim"></div><div class="sc-frame"></div><header class="sc-head"><span></span><b>スタート特典</b><span></span></header>'
 +'<div class="st-body"><p class="st-lead">ようこそ。好きな主神の<b>SR形態</b>を1体えらんでください。<br><small>図鑑に登録されます（対戦はどの主神もN形態から始まります）</small></p>'
 +'<div class="st-list">'+HERO_IDS.map(i=>'<button class="st-god" onclick="starterPick('+i+')">'+gcard(i,2,null,'mini')+'<span><small>'+GOD_CARDS[i].type+'</small>'+stageOf(i,2).name+'</span></button>').join('')+'</div></div></div>'}
function starterPick(i){let o=document.createElement('div');o.className='handzoom confirm';o.setAttribute('role','dialog');
 o.innerHTML='<div class="hz-in"><div class="hz-card">'+gcard(i,2,null,'')+'</div><div class="hz-text"><h3>'+stageOf(i,2).name+'</h3><p class="hz-eff">この主神のSR形態を受け取りますか？</p></div><div class="hz-acts"><button class="hz-btn gold" data-a="ok">受け取る</button><button class="hz-btn ghost" data-a="no">えらびなおす</button></div></div>';
 o.querySelector('.hz-card').style.width='min(52vw,220px)';
 o.onclick=e=>{let b=e.target.closest('button');if(e.target===o||b&&b.dataset.a==='no'){o.remove();return}if(!b)return;o.remove();
  if(!ownForm(i,'SR'))save.cards.push([i,'SR']);delete save.starterPending;persist();
  save.pending=[];lastPack=[];let x=[i,'SR'];
  app.innerHTML='<div class="scene revealscreen"><div class="sc-bg dim"></div><div class="sc-frame"></div><header class="sc-head"><span></span><b>スタート特典</b><span></span></header>'
  +'<div class="rv-stage sr hero flip"><i class="rv-aura"></i><div class="flipper"><div class="face front" style="visibility:visible">'+card(x)+'</div></div></div><p class="rv-tip"><b class="srtxt">スーパーレア！</b><br>'+stageOf(i,2).name+'を受け取りました</p><button class="btn-gold-s" onclick="home()">はじめる</button></div>';
  sfx&&sfx('summon')};document.body.appendChild(o)}
