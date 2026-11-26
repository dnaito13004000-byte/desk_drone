// ==== 主神カード15枚：データ定義と重ね表示 ====
// 数値はここだけで持つ。効果文の {名前} は fx の値で置き換えて表示するので、数値を変えると表示と対戦中の強さが一緒に変わる。
// 画像（dist/cards/<神>/0x-*.png）は加工せず、その上に攻撃力・体力・効果文・進化条件を重ねる。

// 進化・覚醒の条件（全主神共通）
const ASCEND={evolve:{gauge:3,cost:3},awaken:{cost:2}};
const STAGE_RULE=[
 '進化：ゲージ{gauge}＋神力{cost}',   // N形態に表示
 '覚醒：神殿が割れた後＋神力{cost}',  // R形態に表示
 '最終形態'];                        // SR形態に表示
// fx の意味：bolt=雷撃のダメージ（神力cost・敵1体）／heal=芽吹きの回復量（神力cost・味方1体）／fox=狐火で下げる攻撃力（神力cost・敵1体）
//  overflow=攻撃の余ったダメージが敵の主神へ／regen=自分のターンのはじめに味方全体を回復／extra=攻撃した相手への追加ダメージ
//  attacks=1ターンの攻撃回数／second=2回目の攻撃力の減少量／haste=出たターンから攻撃／pierce='hero'（主神と神殿へすり抜け）・'all'
//  shadow=影写し（自分への攻撃を1回ダメージ0）／shadowRevive=影写しが自分のターンのはじめに復活
const GOD_CARDS={
 2:{key:'raiga',name:'ライガ',type:'天象',stages:[
  {rank:'N',name:'幼神ライガ',atk:3,hp:8,skill:'雷撃',cost:1,fx:{bolt:2},text:'雷撃（神力{cost}）：敵1体に{bolt}ダメージ'},
  {rank:'R',name:'雷鼓解放ライガ',atk:4,hp:11,skill:'轟雷',cost:1,fx:{bolt:3,overflow:true},text:'轟雷：攻撃の余ったダメージは敵の主神に届く。雷撃は{bolt}ダメージ'},
  {rank:'SR',name:'天穿雷神ライガ',atk:6,hp:14,skill:'天穿',cost:1,fx:{bolt:4,overflow:true},text:'天穿：攻撃の余ったダメージは敵の主神に届く。雷撃は{bolt}ダメージ'}]},
 5:{key:'kodama',name:'コダマ',type:'大地',stages:[
  {rank:'N',name:'幼神コダマ',atk:2,hp:10,skill:'芽吹き',cost:1,fx:{heal:2},text:'芽吹き（神力{cost}）：味方1体の体力を{heal}回復'},
  {rank:'R',name:'樹脈解放コダマ',atk:3,hp:13,skill:'樹脈',fx:{regen:1},text:'樹脈：自分のターンのはじめに、味方全体の体力を{regen}回復'},
  {rank:'SR',name:'万象樹神コダマ',atk:4,hp:17,skill:'千樹',fx:{regen:2},text:'千樹：自分のターンのはじめに、味方全体の体力を{regen}回復'}]},
 0:{key:'kagura',name:'カグラ',type:'烈火',stages:[
  {rank:'N',name:'幼神カグラ',atk:4,hp:6,skill:'火の拳',fx:{extra:1},text:'火の拳：攻撃した相手に追加で{extra}ダメージ'},
  {rank:'R',name:'炎拳解放カグラ',atk:5,hp:8,skill:'烈火連撃',fx:{attacks:2,second:2},text:'烈火連撃：1ターンに{attacks}回攻撃できる（2回目は攻撃力−{second}）'},
  {rank:'SR',name:'熔獅神カグラ',atk:7,hp:10,skill:'獅子王',fx:{attacks:2,extra:2},text:'獅子王：1ターンに{attacks}回攻撃できる。攻撃した相手に追加で{extra}ダメージ'}]},
 3:{key:'hayate',name:'ハヤテ',type:'奔流',stages:[
  {rank:'N',name:'幼神ハヤテ',atk:3,hp:6,skill:'そよ風',fx:{haste:true},text:'そよ風：場に出たターンから攻撃できる'},
  {rank:'R',name:'風翼解放ハヤテ',atk:4,hp:8,skill:'風渡り',fx:{haste:true,pierce:'hero'},text:'風渡り：出たターンから攻撃できる。すり抜け（神殿を無視して主神を攻撃できる）'},
  {rank:'SR',name:'蒼翼神ハヤテ',atk:5,hp:11,skill:'天翔',fx:{haste:true,pierce:'all'},text:'天翔：出たターンから攻撃できる。すり抜け（神殿を無視して主神を攻撃できる）'}]},
 10:{key:'oboro',name:'オボロ',type:'神秘',stages:[
  {rank:'N',name:'幼神オボロ',atk:2,hp:7,skill:'狐火',cost:1,fx:{fox:1},text:'狐火（神力{cost}）：敵1体の攻撃力を、その敵が場を離れるまで−{fox}'},
  {rank:'R',name:'影紋解放オボロ',atk:3,hp:9,skill:'影写し',cost:1,fx:{fox:1,shadow:true},text:'影写し：自分への攻撃を1回だけ影に受けさせる（ダメージ0）'},
  {rank:'SR',name:'幽狐神オボロ',atk:4,hp:12,skill:'幽冥',cost:1,fx:{fox:2,shadow:true,shadowRevive:true},text:'幽冥：影写しが自分のターンのはじめに復活する。狐火は−{fox}'}]}
};
const HERO_IDS=[2,5,0,3,10];
const STAGE_FILES=['01-child-N.webp','02-awakened-R.webp','03-final-SR.webp'];
// layout.json と同じ内容（cards/layout.json が読めればそちらで上書きする）
let CARD_LAYOUT={canvasPx:[591,887],outerBoundsPx:{attack:[16.5,761.5,97,97],health:[477.5,761.5,97,97],effect:[118,744,355,113],evolution:[58,703,475,31]},safeTextBoundsPx:{attack:[37,788,56,44],health:[498,788,56,44],effect:[132,756,327,89],evolution:[78,708,435,21]}};
try{fetch('cards/layout.json').then(r=>r.ok?r.json():null).then(j=>{if(j&&j.safeTextBoundsPx){CARD_LAYOUT=j;document.querySelectorAll('.gc').forEach(placeBoxes);fitCards()}}).catch(()=>{})}catch(e){}

const tpl=(t,v)=>String(t).replace(/\{(\w+)\}/g,(m,k)=>v[k]!=null?v[k]:m);
function stageOf(id,st){return GOD_CARDS[id].stages[st]}
function stageText(id,st){let s=stageOf(id,st);return tpl(s.text,{...s.fx,cost:s.cost})}
function ruleText(st){return tpl(STAGE_RULE[st],st===0?ASCEND.evolve:ASCEND.awaken)}
function cardImg(id,st){return 'cards/'+GOD_CARDS[id].key+'/'+STAGE_FILES[st]}
function pct(b){let [W,H]=CARD_LAYOUT.canvasPx;return 'left:'+(b[0]/W*100)+'%;top:'+(b[1]/H*100)+'%;width:'+(b[2]/W*100)+'%;height:'+(b[3]/H*100)+'%'}
// 主神カード1枚。live＝対戦中の値（攻撃力・現在/最大体力）
function gcard(id,st,live,cls='',short=false){let s=stageOf(id,st),B=CARD_LAYOUT.safeTextBoundsPx,
  atk=live?live.atk:s.atk,hp=live?'<b class="cur">'+Math.max(0,live.hp)+'</b>':s.hp,weak=live&&live.weak;
 return '<span class="gc '+cls+'" data-id="'+id+'" data-st="'+st+'"><img src="'+cardImg(id,st)+'" alt="'+s.name+'" draggable="false" loading="lazy">'+rubyBand(s.name)
 +statIcon('atk',atk,weak)
 +statIcon('hp',live?Math.max(0,live.hp):s.hp,false,live?live.max:null)
 +'<span class="gb eff" data-k="effect" style="'+pct(B.effect)+'"><i class="fit ml">'+(short?s.skill+(s.cost&&(s.fx.bolt||s.fx.heal||s.fx.fox)&&st===0?'（神力'+s.cost+'）':''):stageText(id,st))+'</i></span>'
 +'<span class="gb evo" data-k="evolution" style="'+pct(B.evolution)+'"><i class="fit one" data-r=".9">'+ruleText(st)+'</i></span></span>'}
function placeBoxes(gc){let B=CARD_LAYOUT.safeTextBoundsPx;gc.querySelectorAll('.gb').forEach(b=>{if(B[b.dataset.k])b.setAttribute('style',pct(B[b.dataset.k]))})}
// 文字を安全範囲に収める：箱の高さから始めて、はみ出す間は小さくする
// ---- 効果文の改行：1〜3行のうち、枠をいちばん大きな文字で埋められる分け方を選ぶ ----
// 改行してよいのは「：、。」の後・「（」の前・助詞の後など意味の切れ目だけ（語の途中では切らない）
const BREAK_STRONG=/[：:、。，）)」』]/, OPEN_PAREN=/[（(「『]/,
 PARTICLE=/^(は|を|に|で|が|と|も|へ|から|まで|より|だけ|ずつ|して|たら|ると|ても|ば)$/;
let measureCtx=null;
function textW(t,font){measureCtx=measureCtx||document.createElement('canvas').getContext('2d');measureCtx.font=font;return measureCtx.measureText(t).width}
function breakPoints(t){let pts=[],seg=null;try{seg=new Intl.Segmenter('ja',{granularity:'word'})}catch(e){}
 for(let i=1;i<t.length;i++){let a=t[i-1],b=t[i];
  if(BREAK_STRONG.test(a)&&!BREAK_STRONG.test(b))pts.push({i,s:3});
  else if(OPEN_PAREN.test(b))pts.push({i,s:2})}
 if(seg){let pos=0;for(const w of seg.segment(t)){pos=w.index+w.segment.length;if(pos<t.length&&PARTICLE.test(w.segment)&&!BREAK_STRONG.test(t[pos])&&!pts.some(p=>p.i===pos))pts.push({i:pos,s:1})}}
 return pts.sort((x,y)=>x.i-y.i)}
function layoutLines(el){let t=el.dataset.t;if(t==null){t=el.textContent;el.dataset.t=t}
 let box=el.parentElement,[bw,bh]=boxSize(box),W=bw*.96,H=bh*.94;if(!W||!H)return;
 let cs=getComputedStyle(el),font=cs.fontWeight+' 100px '+cs.fontFamily,LH=1.22,pts=breakPoints(t),best=null;
 let tryCut=(cuts,pen)=>{let lines=[],p=0;for(const c of cuts){lines.push(t.slice(p,c));p=c}lines.push(t.slice(p));
  let wmax=Math.max(...lines.map(l=>textW(l,font)))/100,fs=Math.min(W/wmax,H/(lines.length*LH)),inner=lines.reduce((n,l)=>n+(l.slice(0,-1).match(/[：:。]/g)||[]).length,0),score=fs*pen*Math.pow(.9,lines.length>1?inner:0);
  if(!best||score>best.score)best={score,fs,lines}};
 const P=[0,.85,.95,1];tryCut([],1);
 for(const a of pts){tryCut([a.i],P[a.s]);
  for(const b of pts){if(b.i<=a.i+1)continue;tryCut([a.i,b.i],P[a.s]*P[b.s]*.98);
   for(const c of pts)if(c.i>b.i+1)tryCut([a.i,b.i,c.i],P[a.s]*P[b.s]*P[c.s]*.97)}}
 el.innerHTML=best.lines.map(l=>'<span class="ln">'+l.replace(/[&<>]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;'})[c])+'</span>').join('');
 el.style.lineHeight=LH;renderScaled(el,best.fs,1,box)}
// 端末の最小文字サイズに負けないよう、文字は10px以上で描いて縮小表示する。最後に実際の表示範囲で確認して、はみ出す間は縮める
const BASE_PX=10;
function renderScaled(el,fs,kx,box){let base=Math.max(fs,BASE_PX),s=fs/base,[bw,bh]=boxSize(box);el.style.fontSize=base+'px';
 let set=()=>el.style.transform='translate(-50%,-50%) scale('+(s*kx)+','+s+')';set();
 // 大きさの確認はレイアウト上の寸法で行う（演出の回転・拡大の途中でも正しく測れる）
 let w=el.offsetWidth,h=el.offsetHeight;for(let i=0;i<40&&(w*s*kx>bw+.3||h*s>bh+.3);i++){s*=.95;set()}}
// 箱の大きさ：transform の影響を受けないレイアウト上の寸法
function boxSize(box){let cs=getComputedStyle(box);return [parseFloat(cs.width)||box.clientWidth,parseFloat(cs.height)||box.clientHeight]}
function fitBox(el){if(el.classList.contains('ml')){layoutLines(el);return}let box=el.parentElement,[w,h]=boxSize(box);if(!w||!h)return;
 let fs=h*parseFloat(el.dataset.r||.5);
 if(el.classList.contains('one')){let cs=getComputedStyle(el),tw=textW(el.textContent,cs.fontWeight+' 100px '+cs.fontFamily)/100+(el.querySelector('svg')?.9:0),lim=w*.97,kx=1;
  fs=Math.min(fs,h/1.08);if(tw*fs>lim){kx=lim/(tw*fs);if(kx<.6){fs=fs*kx/.6;kx=.6}}
  renderScaled(el,fs,kx,box);return}
 el.style.transform='';el.style.fontSize=fs+'px';
 for(let i=0;i<40&&(el.scrollHeight>h+.5||el.scrollWidth>w+.5)&&fs>2;i++){fs*=.9;el.style.fontSize=fs+'px'}}
function fitCards(root=document){root.querySelectorAll('.gc .fit').forEach(fitBox)}
let fitQueued=false;const queueFit=()=>{if(fitQueued)return;fitQueued=true;requestAnimationFrame(()=>{fitQueued=false;fitCards()})};
new MutationObserver(m=>{if(m.some(r=>{let t=r.target.nodeType===1?r.target:r.target.parentElement;if(t&&t.classList&&t.classList.contains('ml'))return false;return r.addedNodes.length||r.type==='characterData'}))queueFit()}).observe(document.documentElement,{childList:true,subtree:true,characterData:true});
addEventListener('resize',queueFit);
if(document.fonts){document.fonts.ready.then(queueFit);document.fonts.addEventListener?.('loadingdone',queueFit)}

// 詳細：大きいカード＋効果文と進化条件を大きな文字で
function godDetail(id,st,live){closeGodDetail();let s=stageOf(id,st),d=document.createElement('div');d.className='gdetail';d.setAttribute('role','dialog');d.setAttribute('aria-label',s.name+'の詳細');
 d.innerHTML='<div class="gd-in">'+gcard(id,st,live,'big')+'<div class="gd-text"><p class="gd-rank">'+GOD_CARDS[id].type+' ／ '+s.rank+'</p>'+rubyP(s.name)+'<h3>'+s.name+'</h3>'
 +'<p class="gd-stat">⚔\uFE0E 攻撃力 '+(live?live.atk:s.atk)+'　♥ 体力 '+(live?Math.max(0,live.hp)+' / '+live.max:s.hp)+'</p>'
 +'<p class="gd-eff">'+stageText(id,st)+'</p><p class="gd-evo">'+ruleText(st)+'</p>'+termList(stageText(id,st)+(st<2?(st===0?'進化ゲージ 進化 ':'覚醒 神殿'):''))
 +(st<2?'<p class="gd-next">次の形態：'+stageOf(id,st+1).name+'（攻'+stageOf(id,st+1).atk+' / 体'+stageOf(id,st+1).hp+'）</p>':'')
 +'<button class="gd-close" onclick="closeGodDetail()">閉じる</button></div></div>';
 d.onclick=e=>{if(e.target===d)closeGodDetail()};document.body.appendChild(d)}
function closeGodDetail(){document.querySelectorAll('.gdetail').forEach(x=>x.remove())}

// ==== 全カード共通の表示（主神・仲間・奇跡）====
// 主神は器つき画像＋重ね表示。仲間と奇跡は、主神カードと同じ配置（layout.json の帯・プレート）で枠をコードが描く。
// 名前・数値・文はすべてここで描く（イラストの中に文字は入れない）。
const FRAME_PX={art:[14,14,563,586],badge:[18,18,70,70],nameBand:[10,598,571,94],nameText:[48,612,495,66],panel:[8,692,575,187]};
const RANK_STAGE={N:0,U:0,R:1,SR:2};   // パックの主神カードはレア度に合う形態の絵で出す
// 高画質版（AIで拡大した dist/art/hd/）。無ければ元の画像
function hdArt(k){let m=/^g(\d+)$/.exec(k);if(m)return +m[1]<12?'art/hd/p'+m[1]+'.webp':portraits[+m[1]];if(['rain','bolt','guard','draw'].includes(k))return 'art/hd/'+k+'.webp';if(SPELL_ART[k])return SPELL_ART[k];return art(k)}
function costBadge(o){return '<span class="uc-badge'+(o.cantPay?' nopay':'')+'" style="'+pct(FRAME_PX.badge)+'" title="コスト"><b>'+(o.cost!=null?o.cost:1)+'</b></span>'}
function cardKind(key){if(typeof key==='number')return GOD_CARDS[key]?'hero':'ally';let m=/^g(\d+)$/.exec(key);if(m)return GOD_CARDS[+m[1]]?'hero':'ally';return 'spell'}
function ucard(key,o={}){if(typeof EXP_CARDS!=='undefined'&&EXP_CARDS[key])return expCard(key,o);if(STARTER_ART[key])return starterCard(key,o);if(o.cost==null){try{o=Object.assign({},o,{cost:cardCost(typeof key==='string'&&/^g\d+$/.test(key)?+key.slice(1):key)})}catch(e){}}let kind=cardKind(key),id=typeof key==='number'?key:(/^g(\d+)$/.exec(key)||[])[1];id=id==null?null:+id;
 if(kind==='hero'){let st=o.stage!=null?o.stage:0,h=gcard(id,st,o.live||null,(o.cls||'')+(o.rank?' r-hero':''),o.short);return o.showCost?h.replace(/<\/span>$/,costBadge(o)+'</span>'):h}
 let O=CARD_LAYOUT.outerBoundsPx||{attack:[16.5,761.5,97,97],health:[477.5,761.5,97,97],effect:[118,744,355,113],evolution:[58,703,475,31]},S=CARD_LAYOUT.safeTextBoundsPx,
  r=cardRarity(kind==='ally'?id:key),name,img,band,eff,stats=null;
 if(kind==='ally'){let g=allyStats(id);name=titles[id]+' '+names[id];img=hdArt('g'+id);band='仲間 · '+types[id];
  eff=cardShort(id);
  stats=o.live?o.live:g?{atk:g[0],hp:g[1]}:null}// 数値が未確定の仲間は「?」を出さず、数値欄ごと出さない
 else{name=spellName(key);img=hdArt(key);band='呪文';eff=cardShort(key)}
 let hp=null;
 return '<span class="gc uc uc-'+kind+' r-'+r+' '+(o.cls||'')+'" data-k="'+key+'"><span class="uc-frame"></span>'
 +'<span class="uc-art" style="'+pct(FRAME_PX.art)+'"><img src="'+img+'" alt="" draggable="false" loading="lazy"></span>'
 +costBadge(o)
 +(o.rank?'<span class="uc-rk">'+r+'</span>':'')
 +'<span class="uc-nameband" style="'+pct(FRAME_PX.nameBand)+'"></span><span class="uc-panel" style="'+pct(FRAME_PX.panel)+'"></span>'
 +'<span class="uc-evo" style="'+pct(O.evolution)+'"></span><span class="uc-eff" style="'+pct(O.effect)+'"></span>'
 
 +(readingOf(name)?'<span class="gb ruby rb-in" style="'+pct([60,604,471,22])+'"><i class="fit one" data-r=".9">'+readingOf(name)+'</i></span><span class="gb name" data-k="nameText" style="'+pct([48,628,495,52])+'"><i class="fit one" data-r=".78">'+name+'</i></span>':'<span class="gb name" data-k="nameText" style="'+pct(FRAME_PX.nameText)+'"><i class="fit one" data-r=".78">'+name+'</i></span>')
 +'<span class="gb evo" data-k="evolution" style="'+pct(S.evolution)+'"><i class="fit one" data-r=".9">'+band+'</i></span>'
 +'<span class="gb eff" data-k="effect" style="'+pct(S.effect)+'"><i class="fit ml">'+eff+'</i></span>'
 +(stats?statIcon('atk',stats.atk,stats.weak)+statIcon('hp',o.live?Math.max(0,stats.hp):stats.hp,false,o.live?stats.max:null):'')
 +'</span>'}

// ==== 収録カード表（第1弾「雷鳴の社」既存20種。拡張25種はファイル末尾の EXP_CARDS で追加＝全45種）====
// レアリティはカードごとに固定。主神はレアリティではなく「主神」。
// ★印の行は指定表が手元に無いため仮の値（レアリティ・短い文）。指定表が届いたらここだけ直せば全画面に反映される。
const CARD_TABLE={
 // 主神（5）
 2:{r:'主神'},5:{r:'主神'},0:{r:'主神'},3:{r:'主神'},10:{r:'主神'},
 // 仲間（7）　※効果は正本の記載だけ（技名だけの旧案「返し潮」などは廃止）
 1:{r:'U',short:'召喚したターンから攻撃できる'},              // シズク＝U（指定）
 6:{r:'U',short:'特殊能力なし'},              // ★ガンザ
 4:{r:'U',short:'登場時 敵1体が次の相手ターン攻撃不可',full:'登場したとき、敵の仲間1体は次の相手のターンに攻撃できない。',later:true},                  // ★ユキネ
 7:{r:'U',short:'雨のとき攻撃力+1',full:'天候が「雨」のとき、攻撃力が+1される。'},       // ★ナギ
 8:{r:'R',short:'晴れのとき攻撃力+1',full:'天候が「晴れ」のとき、攻撃力が+1される。'},   // ★アカツキ
 9:{r:'R',short:'ターン終了時 一番減った味方を1回復',full:'自分のターンの終了時、体力が一番減っている味方1体を1回復する。'},                  // ★ツクヨ
 11:{r:'R',short:'登場時 山札から1枚引く',full:'登場したとき、山札から1枚引く。'},                 // ★スバル
 // 呪文（8）　short＝カードの帯、full＝詳細画面の全文
 rain:{r:'N',short:'天候を雨にする',full:'天候を「雨」にする。'},
 sun:{r:'N',short:'天候を晴れにする',full:'天候を「晴れ」にする。'},
 bolt:{r:'R',short:'雨のとき 敵1体に2ダメージ',full:'天候が「雨」のときだけ使える。敵1体に2ダメージ。'},
 guard:{r:'U',short:'味方の次のダメージを0',full:'味方1体を選ぶ。その味方が次に受けるダメージを0にする。'},
 draw:{r:'N',short:'山札から2枚引く',full:'山札からカードを2枚引く。'},
 seed:{r:'N',short:'神力を2回復',full:'神力を2回復する。'},
 mirror:{r:'R',name:'覚醒の神鏡',short:'主神の進化ゲージ+1',full:'自分の主神の進化ゲージを1増やす（最大3）。',later:true},
 scroll:{r:'R',name:'神位継承の巻',short:'仲間1体の攻撃力・体力+2',full:'味方の仲間1体を選ぶ。その仲間の攻撃力と体力を+2する。',later:true}
};
const SET_ALL={no:1,name:'雷鳴の社',heroes:[2,5,0,3,10],allies:[1,6,4,7,8,9,11],spells:['rain','sun','bolt','guard','draw','seed','mirror','scroll']};
SET_ALL.cards=[...SET_ALL.heroes,...SET_ALL.allies,...SET_ALL.spells];
const cardRarity=k=>(CARD_TABLE[k]||{}).r||'N';
function cardShort(k){let t=CARD_TABLE[k];if(t&&t.short)return t.short;if(typeof k==='number'&&GOD_CARDS[k])return stageOf(k,0).skill;return moves[k]?moves[k][2]:''}
function spellName(k){return (CARD_TABLE[k]&&CARD_TABLE[k].name)||(moves[k]?moves[k][0]:k)}
// 新しい呪文の絵（専用イラストが届くまでの仮）
const SPELL_ART={
 mirror:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><defs><radialGradient id="g" cx="50%" cy="45%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".45" stop-color="#9fd8ff"/><stop offset="1" stop-color="#16204a"/></radialGradient><linearGradient id="r" x1="0" x2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".5" stop-color="#c99a3a"/><stop offset="1" stop-color="#ffe6a0"/></linearGradient></defs><rect width="300" height="200" fill="#120d33"/><g stroke="#ffe08a" stroke-opacity=".35">'+Array.from({length:24},(_,i)=>'<line x1="150" y1="95" x2="'+(150+200*Math.cos(i/24*6.283)).toFixed(0)+'" y2="'+(95+200*Math.sin(i/24*6.283)).toFixed(0)+'"/>').join('')+'</g><circle cx="150" cy="95" r="62" fill="url(#g)" stroke="url(#r)" stroke-width="10"/><circle cx="150" cy="95" r="74" fill="none" stroke="url(#r)" stroke-width="3" stroke-dasharray="4 6"/><path d="M118 168h64l-8 22h-48z" fill="url(#r)"/><ellipse cx="135" cy="75" rx="16" ry="26" fill="#fff" opacity=".5"/></svg>'),
 scroll:'data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><defs><linearGradient id="p" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#f8efd6"/><stop offset="1" stop-color="#d9c79c"/></linearGradient><linearGradient id="r" x1="0" x2="1"><stop offset="0" stop-color="#fff2b8"/><stop offset=".5" stop-color="#a8741c"/><stop offset="1" stop-color="#ffe6a0"/></linearGradient></defs><rect width="300" height="200" fill="#1c1446"/><circle cx="150" cy="100" r="96" fill="#3a2f8a" opacity=".6"/><rect x="62" y="48" width="176" height="104" fill="url(#p)"/><g stroke="#5a4020" stroke-width="3" stroke-linecap="round" opacity=".8"><path d="M200 66v68M180 66v56M160 66v68M140 66v40M120 66v60M100 66v50"/></g><circle cx="110" cy="128" r="11" fill="#c8402e"/><rect x="40" y="40" width="22" height="120" rx="8" fill="url(#r)"/><rect x="238" y="40" width="22" height="120" rx="8" fill="url(#r)"/><rect x="34" y="34" width="34" height="10" rx="4" fill="#6b4a12"/><rect x="34" y="156" width="34" height="10" rx="4" fill="#6b4a12"/><rect x="232" y="34" width="34" height="10" rx="4" fill="#6b4a12"/><rect x="232" y="156" width="34" height="10" rx="4" fill="#6b4a12"/></svg>')
};

// カードの大きさが変わったら（召喚・演出・画面切り替えの後など）、そのカードの文字を詰め直す
const cardRO=('ResizeObserver' in window)?new ResizeObserver(es=>es.forEach(e=>{let gc=e.target;if(gc.isConnected&&e.contentRect.width>0)gc.querySelectorAll('.fit').forEach(fitBox)})):null;
new MutationObserver(m=>{if(!cardRO)return;for(const r of m)for(const n of r.addedNodes){if(n.nodeType!==1)continue;if(n.classList&&n.classList.contains('gc'))cardRO.observe(n);n.querySelectorAll&&n.querySelectorAll('.gc').forEach(x=>cardRO.observe(x))}}).observe(document.documentElement,{childList:true,subtree:true});
// 雲払い・種まき：以前は神の絵を借りていたので、専用の仮の絵に（専用イラストが届くまで）
SPELL_ART.sun='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><defs><radialGradient id="s" cx="50%" cy="42%" r="60%"><stop offset="0" stop-color="#fffbe0"/><stop offset=".25" stop-color="#ffd35a"/><stop offset=".6" stop-color="#ff9a4a"/><stop offset="1" stop-color="#3a6aa8"/></radialGradient></defs><rect width="300" height="200" fill="url(#s)"/><g stroke="#fff4c0" stroke-width="3" opacity=".7">'+Array.from({length:16},(_,i)=>'<line x1="150" y1="84" x2="'+(150+180*Math.cos(i/16*6.283)).toFixed(0)+'" y2="'+(84+180*Math.sin(i/16*6.283)).toFixed(0)+'"/>').join('')+'</g><circle cx="150" cy="84" r="30" fill="#fff8d0"/><g fill="#f4f6ff" opacity=".95"><path d="M-10 170c20-30 60-30 80-8 20-26 64-22 76 6 18-10 40-4 44 14H-10z" transform="translate(-30 8)"/><path d="M160 186c16-26 52-28 70-6 14-18 46-16 54 6 14-6 30 0 30 14H160z"/></g><g fill="#dfe6ff" opacity=".8"><path d="M20 70c10-14 32-14 40-2 10-10 30-6 30 8H20z"/><path d="M210 60c10-14 30-12 36 0 10-8 28-4 28 8h-64z"/></g></svg>');
SPELL_ART.seed='data:image/svg+xml,'+encodeURIComponent('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 300 200"><defs><linearGradient id="g" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#1d3a2a"/><stop offset=".6" stop-color="#2f5a2e"/><stop offset="1" stop-color="#4a3420"/></linearGradient><radialGradient id="l" cx="50%" cy="60%" r="40%"><stop offset="0" stop-color="#e8ffb0" stop-opacity=".9"/><stop offset="1" stop-color="#e8ffb0" stop-opacity="0"/></radialGradient></defs><rect width="300" height="200" fill="url(#g)"/><circle cx="150" cy="120" r="80" fill="url(#l)"/><path d="M60 170q90-30 180 0v30H60z" fill="#5a3e24"/><ellipse cx="150" cy="160" rx="14" ry="9" fill="#a8742c"/><path d="M150 156c0-30 4-50 0-70" stroke="#7fd86a" stroke-width="5" fill="none" stroke-linecap="round"/><path d="M150 112c-24-4-40-22-38-40 22 2 38 18 38 40z" fill="#8fe070"/><path d="M151 96c20-10 38-30 34-48-22 6-36 26-34 48z" fill="#a8f080"/><g fill="#fff8c0">'+Array.from({length:14},(_,i)=>'<circle cx="'+(40+i*17)+'" cy="'+(30+(i*37)%90)+'" r="'+(1.5+(i%3))+'" opacity=".7"/>').join('')+'</g></svg>');

// ==== 攻撃力・体力：剣とハートのアイコンの上に数字（枠や背景のパネルなし）====
// 位置は layout.json のプレートの外枠（outerBoundsPx）。数字は白＋濃い縁取り。
const ICON_SWORD='<svg class="sic" viewBox="0 0 64 64" aria-hidden="true"><g transform="rotate(-45 32 32)"><path d="M29 4h6l2 34h-10z" fill="#e9eef5" stroke="#1a1410" stroke-width="2.4" stroke-linejoin="round"/><path d="M32 6v30" stroke="#9aa6b4" stroke-width="1.6"/><path d="M18 38h28v5H18z" fill="#d9a536" stroke="#1a1410" stroke-width="2.4" stroke-linejoin="round"/><path d="M29 43h6v11h-6z" fill="#6b4a24" stroke="#1a1410" stroke-width="2.4"/><circle cx="32" cy="57" r="3.6" fill="#d9a536" stroke="#1a1410" stroke-width="2.2"/></g></svg>';
const ICON_HEART='<svg class="sic" viewBox="0 0 64 64" aria-hidden="true"><path d="M32 57C14 43 5 33 5 21A14 14 0 0 1 32 15a14 14 0 0 1 27 6c0 12-9 22-27 36z" fill="#e2445c" stroke="#1a1410" stroke-width="3" stroke-linejoin="round"/><path d="M15 18c3-5 9-6 12-3" stroke="#ffb3c0" stroke-width="3" fill="none" stroke-linecap="round"/></svg>';
function statIcon(kind,v,weak,max){let O=CARD_LAYOUT.outerBoundsPx||{attack:[16.5,761.5,97,97],health:[477.5,761.5,97,97]},box=kind==='atk'?O.attack:O.health,
  num=(v==null||v==='—')?'?':v,text=max!=null?'<b class="cur">'+num+'</b>':num;
 return '<span class="gstat '+kind+(weak?' weak':'')+'" style="'+pct(box)+'">'+(kind==='atk'?ICON_SWORD:ICON_HEART)
 +'<span class="gb '+kind+'" data-k="'+kind+'Num" style="left:6%;top:18%;width:88%;height:64%"><i class="fit one" data-r=".95">'+text+'</i></span></span>'}

// ==== 用語説明（パック・図鑑・対戦の詳細で共通）====
const TERMS=[
 ['天候','場全体の天気。「晴れ」か「雨」のどちらか。対戦は「晴れ」から始まり、呪文「雨乞い」「雲払い」で変わる。'],
 ['晴れ','天候「晴れ」：陽神アカツキの攻撃力が+1される。'],
 ['雨','天候「雨」：潮神ナギの攻撃力が+1される。呪文「招雷」が使えるようになる。'],
 ['神力','カードを使うためのポイント。手札を毎ターン1枚まで「神力に置く」と、最大値が1増える。自分のターンの始めに最大まで回復する。'],
 ['進化ゲージ','主神が通常攻撃を当てるたびに1増える。自分の神殿が割れたときも、進化ゲージが1増えます。'+ASCEND.evolve.gauge+'たまると、神力'+ASCEND.evolve.cost+'を払って進化できる。'],
 ['覚醒','進化した主神は、自分の神殿が1枚でも割られたあと（身代わりで割れた場合も含む）、神力'+ASCEND.awaken.cost+'を払って覚醒できる。'],
 ['神殿','おたがい5枚ずつ、場の中央に伏せて置くカード。攻撃されると1枚割れ、中のカードは守る側がコストなしで使うか（破殿解放）、手札に加える。神殿が残っている間は主神を攻撃できない。すべて割ると最終決戦。主神は倒れず、倒れるダメージを受けると代わりに神殿が1枚割れて全回復する。'],
 ['主神','デッキの中心になる神。最初から場の後方にいて、進化・覚醒で強くなる。倒れるダメージを受けても倒れず、代わりに神殿が1枚割れる。'],
 ['仲間','手札から召喚する神。場に出たターンは攻撃できず、次の自分のターンから攻撃できる（速攻を持つカードは例外）。場に出せるのは主神を含めて3体まで。'],
 ['ダメージ','体力が減ること。体力が0になった神は場から退く。神どうしで戦うと、おたがいに攻撃力ぶんのダメージを与える（反撃）。'],
 ['山札','まだ引いていないカードの束。自分のターンの始めに1枚引く。']
];
// 文中に出てくる用語だけを並べる（「雨乞い」の「雨」も天候の説明として出す）
function termsIn(text){let t=String(text||'').replace(/<[^>]+>/g,'');return TERMS.filter(([w])=>t.includes(w)||(w==='進化ゲージ'&&/進化/.test(t))||(w==='ダメージ'&&/反撃/.test(t)))}
function termList(text,extra){let list=termsIn(text+(extra||''));return list.length?'<dl class="terms"><dt class="th">用語</dt>'+list.map(([w,d])=>'<dt>'+w+'</dt><dd>'+d+'</dd>').join('')+'</dl>':''}
function cardFull(k){let t=CARD_TABLE[k]||{};if(t.full)return t.full;let id=typeof k==='number'?k:(/^g(\d+)$/.exec(k)||[])[1];
 if(id!=null&&+id===1)return '召喚したターンから攻撃できる（速攻）。';if(id!=null)return '特殊能力なし。';return moves[k]?moves[k][2]:''}
// どの画面からでも呼べる詳細：k は図鑑ID（数値／呪文名）でも対戦の手札キー（g2 など）でもよい
function cardInfo(k){let m=/^g(\d+)$/.exec(k);if(m)k=+m[1];if(typeof k==='number'&&GOD_CARDS[k]){godDetail(k,0);return}if(EXP_CARDS[k]){expInfo(k);return}
 closeGodDetail();let ally=typeof k==='number',t=CARD_TABLE[k]||{},g=ally?allyStats(k):null,full=cardFull(k),name=ally?titles[k]+' '+names[k]:spellName(k);
 let note=t.later?'<p class="gd-next">'+(ally?'この仲間は、今の対戦デッキにはまだ入っていません。':'この呪文は、今の対戦デッキにはまだ入っていません。')+'</p>':'';
 let d=document.createElement('div');d.className='gdetail tdetail';d.setAttribute('role','dialog');d.setAttribute('aria-label',name+'の詳細');
 d.innerHTML='<div class="gd-in">'+ucard(ally?k:k,{cls:'big'})+'<div class="gd-text"><p class="gd-rank">'+(ally?'仲間 ／ '+types[k]:'呪文 ／ コスト'+(moves[k]?moves[k][1]:1))+' ／ '+(t.r||'N')+'</p>'+rubyP(name)+'<h3>'+name+'</h3>'
 +(g?'<p class="gd-stat">⚔︎ 攻撃力 '+g[0]+'　♥ 体力 '+g[1]+'</p>':'')
 +'<p class="gd-eff">'+full+'</p>'+note+termList(full+(ally?'仲間':''))
 +'<button class="gd-close" onclick="closeGodDetail()">閉じる</button></div></div>';
 d.onclick=e=>{if(e.target===d)closeGodDetail()};document.body.appendChild(d)}
// 対戦中：天候表示をタップ → 今の天候の効果と、変わると何が起きるか
function weatherInfo(){closeGodDetail();let now=typeof weather!=='undefined'?weather:'晴れ',other=now==='雨'?'晴れ':'雨';
 let eff={'晴れ':['陽神アカツキの攻撃力が+1される。','呪文「招雷」は使えない。'],'雨':['潮神ナギの攻撃力が+1される。','呪文「招雷」が使える（敵1体に2ダメージ）。']};
 let d=document.createElement('div');d.className='gdetail wdetail';d.setAttribute('role','dialog');d.setAttribute('aria-label','天候の説明');
 d.innerHTML='<div class="gd-in"><div class="gd-text"><p class="gd-rank">天候（おたがい共通）</p><h3>'+(now==='雨'?'☂ いまは「雨」':'☀ いまは「晴れ」')+'</h3>'
 +'<ul class="wlist">'+eff[now].map(x=>'<li>'+x+'</li>').join('')+'</ul>'
 +'<p class="gd-evo">「'+other+'」に変わると</p><ul class="wlist">'+eff[other].map(x=>'<li>'+x+'</li>').join('')+'</ul>'
 +'<p class="gd-next">天候を変える呪文：「雨乞い」で雨、「雲払い」で晴れ。</p>'
 +'<button class="gd-close" onclick="closeGodDetail()">閉じる</button></div></div>';
 d.onclick=e=>{if(e.target===d)closeGodDetail()};document.body.appendChild(d)}

// ==== 拡張カード25枚（ZIP kamigami-expansion-25 の cards.json 控えから。正本 card_data.md の拡張カード節が届いたら照合する）====
// 画像は dist/cards/expansion/<ID>.webp（器・名前帯つきの完成カード絵。数値と効果文は layout.json の座標に重ねる）
const EXP_CARDS={
 'sky-1':{name:'雲紡ぎのアヤ',color:'天象',kind:'ally',r:'N',cost:1,atk:2,hp:3,text:'登場時、天候を晴れか雨に変えてもよい。'},
 'sky-2':{name:'霹靂を喰う天狗',color:'天象',kind:'ally',r:'U',cost:3,atk:3,hp:5,text:'自分のターンに天候が変わったとき、各ターン初回のみ、敵1体に2ダメージ。'},
 'sky-3':{name:'雨脚の矢',color:'天象',kind:'spell',r:'N',cost:1,atk:null,hp:null,text:'敵の仲間1体に1ダメージ。天候を雨にする。'},
 'sky-4':{name:'雲間の返照',color:'天象',kind:'spell',r:'U',cost:2,atk:null,hp:null,text:'雨のときだけ使える。天候を晴れにし、山札から1枚引く。'},
 'sky-5':{name:'天柱落とし',color:'天象',kind:'spell',r:'R',cost:3,atk:null,hp:null,text:'敵の仲間1体に3ダメージ。その体力を超えた分、敵の主神にダメージ。'},
 'earth-1':{name:'石臼の荒神',color:'大地',kind:'ally',r:'N',cost:2,atk:3,hp:5,text:'攻撃時、この仲間の体力が満タンなら、この攻撃中は自身の攻撃力を+1する。'},
 'earth-2':{name:'古根の角王',color:'大地',kind:'ally',r:'R',cost:3,atk:3,hp:6,text:'自分のターンに味方の体力が回復したとき、各ターン初回のみ、このターンこの仲間の攻撃力を+2する。'},
 'earth-3':{name:'岩盤返し',color:'大地',kind:'spell',r:'U',cost:2,atk:null,hp:null,text:'味方の仲間1体を選ぶ。このターン、その攻撃力を現在の体力と同じ値にする。'},
 'earth-4':{name:'実りの分け前',color:'大地',kind:'spell',r:'N',cost:1,atk:null,hp:null,text:'体力が満タンの味方の仲間がいるときだけ使える。山札から1枚引く。'},
 'earth-5':{name:'山門の進軍',color:'大地',kind:'spell',r:'U',cost:3,atk:null,hp:null,text:'現在の体力が5以上の味方の仲間すべては、このターン攻撃力が+2される。'},
 'fire-1':{name:'火走りのイタチ神',color:'烈火',kind:'ally',r:'N',cost:1,atk:2,hp:2,text:'出たターンから攻撃できる。攻撃後、この仲間に1ダメージ。'},
 'fire-2':{name:'双炉の鍛冶神',color:'烈火',kind:'ally',r:'U',cost:2,atk:2,hp:4,text:'同じ味方がそのターン2回目の攻撃を終えたとき、敵の主神に1ダメージ。'},
 'fire-3':{name:'火挟み',color:'烈火',kind:'spell',r:'N',cost:1,atk:null,hp:null,text:'敵1体に1ダメージ。このターン、その敵がすでに攻撃でダメージを受けていれば、代わりに2ダメージ。'},
 'fire-4':{name:'二の太刀',color:'烈火',kind:'spell',r:'U',cost:2,atk:null,hp:null,text:'このターンにちょうど1回攻撃した味方の仲間1体は、このターンもう1回攻撃できる。'},
 'fire-5':{name:'落日の火葬鐘',color:'烈火',kind:'spell',r:'R',cost:3,atk:null,hp:null,text:'このターンに味方が合計2回以上攻撃していれば使える。敵の主神に3ダメージ。'},
 'water-1':{name:'潮先の鷺神',color:'奔流',kind:'ally',r:'N',cost:1,atk:2,hp:3,text:'このターンに呪文を使っていれば、出たターンから攻撃できる。'},
 'water-2':{name:'瀬渡りのカワセミ神',color:'奔流',kind:'ally',r:'R',cost:2,atk:2,hp:4,text:'雨の間、この仲間はすり抜けを持つ（神殿を無視して敵の主神を攻撃できる）。'},
 'water-3':{name:'追い潮',color:'奔流',kind:'spell',r:'U',cost:1,atk:null,hp:null,text:'このターンに出した味方の仲間1体は、このターンから攻撃できる。'},
 'water-4':{name:'水面抜き',color:'奔流',kind:'spell',r:'N',cost:2,atk:null,hp:null,text:'味方の仲間1体は、このターン、すり抜けを得る（神殿を無視して敵の主神を攻撃できる）。'},
 'water-5':{name:'航跡を読む',color:'奔流',kind:'spell',r:'U',cost:1,atk:null,hp:null,text:'このターンに味方の仲間が敵の主神を攻撃していれば使える。山札から1枚引く。'},
 'mystic-1':{name:'面削りの童神',color:'神秘',kind:'ally',r:'N',cost:2,atk:2,hp:4,text:'登場時、敵1体の攻撃力を、その敵が場を離れるまで1下げる。'},
 'mystic-2':{name:'逆夢の獏神',color:'神秘',kind:'ally',r:'R',cost:3,atk:3,hp:5,text:'攻撃力が元の値より低い敵を攻撃したとき、攻撃後に、その敵の攻撃力が下がった分だけ敵の主神にダメージ。'},
 'mystic-3':{name:'影の縫い返し',color:'神秘',kind:'spell',r:'U',cost:1,atk:null,hp:null,text:'攻撃力が元の値より低い敵1体に2ダメージ。'},
 'mystic-4':{name:'空蝉の歩法',color:'神秘',kind:'spell',r:'N',cost:1,atk:null,hp:null,text:'味方の仲間1体は、次の相手ターン終了まで敵の仲間の攻撃対象にならない。'},
 'mystic-5':{name:'逆さ月の宣告',color:'神秘',kind:'spell',r:'R',cost:3,atk:null,hp:null,text:'攻撃力が元の値より低い敵1体に、元の値から下がった分だけダメージ。最大3ダメージ。'},
 // ---- 追加カード（2026-11-25決定）：R仲間5種。パック・図鑑・デッキ編成用。AIの標準デッキには入れない（R_ALLIES_AM）----
 'sky-6':{name:'嵐呼の雷獣',color:'天象',kind:'ally',r:'R',cost:5,atk:4,hp:7,text:'自分のターンに天候が変わったとき、敵の主神に1ダメージ。'},
 'earth-6':{name:'不動の山神',color:'大地',kind:'ally',r:'R',cost:5,atk:3,hp:9,text:'自分の神殿が割れたとき、この仲間を2回復する。'},
 'fire-6':{name:'爆炎の剣神',color:'烈火',kind:'ally',r:'R',cost:4,atk:5,hp:4,text:'この仲間が倒れたとき、敵1体に2ダメージ。'},
 'water-6':{name:'疾風の忍神',color:'奔流',kind:'ally',r:'R',cost:4,atk:3,hp:5,text:'この仲間は神殿を無視して、敵の主神を攻撃できる。'},
 'mystic-6':{name:'薄暮の呪い手',color:'神秘',kind:'ally',r:'R',cost:5,atk:3,hp:6,text:'登場したとき、敵全員の攻撃力を1下げる。この効果は、その敵が場を離れるまで続く。'}
};
const R_ALLIES_AM=['sky-6','earth-6','fire-6','water-6','mystic-6'];
Object.assign(EXP_CARDS,{
 // ---- 追加カード（2026-11-25決定）：N追加10種。AIの標準デッキには入れない（N_ADD_AN）----
 'sky-7':{name:'霙神',color:'天象',kind:'ally',r:'N',cost:3,atk:2,hp:5,text:'天候が変わったとき、この仲間を1回復する。'},
 'sky-8':{name:'稲光',color:'天象',kind:'spell',r:'N',cost:1,atk:null,hp:null,text:'敵の主神に1ダメージ。'},
 'earth-7':{name:'苗神',color:'大地',kind:'ally',r:'N',cost:3,atk:2,hp:4,text:'登場したとき、自分の主神を1回復する。'},
 'earth-8':{name:'大地の恵み',color:'大地',kind:'spell',r:'N',cost:1,atk:null,hp:null,text:'味方1体を2回復する。'},
 'fire-7':{name:'火達磨',color:'烈火',kind:'ally',r:'N',cost:3,atk:4,hp:2,text:'効果なし'},
 'fire-8':{name:'火付け',color:'烈火',kind:'spell',r:'N',cost:1,atk:null,hp:null,text:'味方の仲間1体の攻撃力を、このターン+2する。'},
 'water-7':{name:'飛沫神',color:'奔流',kind:'ally',r:'N',cost:3,atk:1,hp:3,text:'出たターンから攻撃できる。1ターンに2回まで攻撃できる。'},
 'water-8':{name:'引き潮',color:'奔流',kind:'spell',r:'N',cost:2,atk:null,hp:null,text:'敵の仲間1体を、持ち主の手札に戻す。'},
 'mystic-7':{name:'写し神',color:'神秘',kind:'ally',r:'N',cost:2,atk:0,hp:3,text:'登場したとき、敵の仲間1体を選ぶ。この仲間の攻撃力は、その敵の攻撃力と同じになる。'},
 'mystic-8':{name:'心読み',color:'神秘',kind:'spell',r:'N',cost:1,atk:null,hp:null,text:'相手の手札をすべて見る。山札から1枚引く。'}
});
const N_ADD_AN=['sky-7','sky-8','earth-7','earth-8','fire-7','fire-8','water-7','water-8','mystic-7','mystic-8'];
for(const [k,e] of Object.entries(EXP_CARDS)){CARD_TABLE[k]={r:e.r,name:e.name,short:e.text,full:e.text,exp:true};if(e.kind==='ally'){names[k]=e.name;titles[k]='';types[k]=e.color}}
// 対戦に入らないカード（数値未確定の仲間・今のルールでは効果が変化しない呪文）
['mirror','scroll'].forEach(k=>CARD_TABLE[k].later=false);
SET_ALL.allies.push(...Object.keys(EXP_CARDS).filter(k=>EXP_CARDS[k].kind==='ally'));
SET_ALL.spells.push(...Object.keys(EXP_CARDS).filter(k=>EXP_CARDS[k].kind==='spell'));
SET_ALL.cards=[...SET_ALL.heroes,...SET_ALL.allies,...SET_ALL.spells];
// ---- 色 ----
// 既存の仲間は GAME.md のタイプ表どおり。既存の呪文は正本の「既存カードの色」が届くまでの仮置き（★）。神託は色なし。
const COLORS=['烈火','奔流','天象','神秘','大地'];
const BASE_COLOR={rain:'天象',sun:'天象',bolt:'天象',seed:'大地',guard:'',draw:'',mirror:'',scroll:''};// ★rain/sun/bolt/seed は仮、guard/mirror/scroll は未定
function colorOf(k){if(EXP_CARDS[k])return EXP_CARDS[k].color;if(typeof k==='number')return GOD_CARDS[k]?GOD_CARDS[k].type:(types[k]||'');return BASE_COLOR[k]||''}
function colorChip(k){let c=colorOf(k);return '<i class="colchip c-'+(COLORS.indexOf(c)+1)+'">'+(c||'色なし')+'</i>'}
function cardCost(k){if(EXP_CARDS[k])return EXP_CARDS[k].cost;if(typeof k==='number')return (typeof ALLY_COST!=='undefined'&&ALLY_COST[k])||1;return moves[k]?moves[k][1]:1}
// 拡張カードの表示：完成カード絵＋剣・ハートの器に数字（仲間）＋効果帯に全文＋細帯にコスト
function expCard(k,o={}){let e=EXP_CARDS[k],B=CARD_LAYOUT.safeTextBoundsPx,ally=e.kind==='ally';
 return '<span class="gc uc uc-exp '+(ally?'uc-ally':'uc-spell')+' r-'+e.r+' '+(o.cls||'')+'" data-k="'+k+'"><img src="cards/expansion/'+k+'.webp" alt="'+e.name+'" draggable="false" loading="lazy">'+rubyBand(e.name)
 +(ally?(o.live?statIcon('atk',o.live.atk,o.live.weak)+statIcon('hp',Math.max(0,o.live.hp),false,o.live.max):statIcon('atk',e.atk)+statIcon('hp',e.hp)):'')
 +'<span class="gb evo" data-k="evolution" style="'+pct(B.evolution)+'"><i class="fit one" data-r=".9">コスト'+e.cost+'</i></span>'
 +'<span class="gb eff" data-k="effect" style="'+pct(B.effect)+'"><i class="fit ml">'+e.text+'</i></span>'
 +(o.showCost?costBadge(o):'')+'</span>'}
function expInfo(k){closeGodDetail();let e=EXP_CARDS[k],ally=e.kind==='ally';
 let d=document.createElement('div');d.className='gdetail tdetail';d.setAttribute('role','dialog');d.setAttribute('aria-label',e.name+'の詳細');
 d.innerHTML='<div class="gd-in">'+expCard(k,{cls:'big'})+'<div class="gd-text"><p class="gd-rank">'+(ally?'仲間':'呪文')+' ／ '+e.color+' ／ コスト'+e.cost+' ／ '+e.r+'</p>'+rubyP(e.name)+'<h3>'+e.name+'</h3>'
 +(ally?'<p class="gd-stat">⚔︎ 攻撃力 '+e.atk+'　♥ 体力 '+e.hp+'</p>':'')+'<p class="gd-eff">'+e.text+'</p>'
 +(CARD_TABLE[k].later?'<p class="gd-next">このカードは、今の対戦デッキにはまだ入っていません。</p>':'')+termList(e.text+(ally?'仲間':''))
 +'<button class="gd-close" onclick="closeGodDetail()">閉じる</button></div></div>';
 d.onclick=e2=>{if(e2.target===d)closeGodDetail()};document.body.appendChild(d)}
TERMS.push(['最終決戦','神殿がすべて割れた側は、主神が攻撃の対象になる。主神の体力を0にしたら勝ち。'],['すり抜け','神殿を無視して主神を攻撃できること。風翼解放ハヤテ・蒼翼神ハヤテ、雨の間の瀬渡りのカワセミ神、疾風の忍神、水面抜きの対象。'],['破殿解放','神殿が割れたとき、そのカードをコストなしで使えること。使わなければ手札に加わる。'],['召喚酔い','場に出たターンは攻撃できない状態。次の自分のターンから攻撃できる。主神もおたがい1ターン目は攻撃できない。'],['速攻','「出たターンから攻撃できる」効果。召喚酔いにならない。'],['登場時','その仲間を場に出したとき。'],['元の値','カードに書かれている攻撃力。弱める効果などで下がっていると「元の値より低い」状態になる。']);

// ---- 初期呪文8種：枠つき完成イラスト（2026-11-25差し替え）。名前帯はアート側、コスト・効果文は既存の重ね表示で載せる ----
const STARTER_ART={rain:'amagoi',sun:'kumobarai',bolt:'shourai',guard:'shugo',draw:'shintaku',seed:'tanemaki',mirror:'kakusei_kagami',scroll:'shini_keishou'};
function starterCard(k,o={}){let B=CARD_LAYOUT.safeTextBoundsPx,t=CARD_TABLE[k]||{},cost=o.cost!=null?o.cost:(typeof costOf==='function'?costOf(k):1);
 return '<span class="gc uc uc-exp uc-spell r-'+(t.r||'N')+' '+(o.cls||'')+'" data-k="'+k+'"><img src="cards/starter/'+STARTER_ART[k]+'.webp" alt="'+spellName(k)+'" draggable="false" loading="lazy">'+rubyBand(spellName(k))
 +'<span class="gb evo" data-k="evolution" style="'+pct(B.evolution)+'"><i class="fit one" data-r=".9">コスト'+cost+'</i></span>'
 +'<span class="gb eff" data-k="effect" style="'+pct(B.effect)+'"><i class="fit ml">'+(t.full||cardShort(k))+'</i></span>'
 +(o.showCost?costBadge(Object.assign({},o,{cost})):'')+'</span>'}

// ---- 仲間の数値（表示用）：対戦用の gods に無い仲間（まだ対戦デッキに入らない later 扱い）も、正本で確定した数値は図鑑・詳細に出す ----
// 対戦用の gods には入れない（入れると対戦デッキ・AIの標準デッキに入り、バランス測定の前提が変わるため）
const ALLY_SHOW={4:[2,5]};// 氷神ユキネ：正本 U／コスト3／攻2／体5
function allyStats(id){return (typeof gods!=='undefined'&&gods[id])||ALLY_SHOW[id]||null}

// ---- カード名の読み（図鑑・詳細モーダル用。対戦中の小さいカードには付けない）----
const READING={'幼神ライガ':'ヨウシンライガ','雷鼓解放ライガ':'ライコカイホウライガ','天穿雷神ライガ':'テンセンライジンライガ','幼神コダマ':'ヨウシンコダマ','樹脈解放コダマ':'ジュミャクカイホウコダマ','万象樹神コダマ':'バンショウジュシンコダマ','幼神カグラ':'ヨウシンカグラ','炎拳解放カグラ':'エンケンカイホウカグラ','熔獅神カグラ':'ヨウシシンカグラ','幼神ハヤテ':'ヨウシンハヤテ','風翼解放ハヤテ':'フウヨクカイホウハヤテ','蒼翼神ハヤテ':'ソウヨクシンハヤテ','幼神オボロ':'ヨウシンオボロ','影紋解放オボロ':'エイモンカイホウオボロ','幽狐神オボロ':'ユウコシンオボロ','雨神シズク':'アマガミシズク','岩神ガンザ':'イワガミガンザ','氷神ユキネ':'ヒョウシンユキネ','潮神ナギ':'ウシオガミナギ','陽神アカツキ':'ヨウシンアカツキ','月神ツクヨ':'ツキガミツクヨ','星神スバル':'ホシガミスバル','雲紡ぎのアヤ':'クモツムギノアヤ','霹靂を喰う天狗':'ヘキレキヲクウテング','石臼の荒神':'イシウスノアラガミ','古根の角王':'ココンノツノオウ','火走りのイタチ神':'ヒバシリノイタチガミ','双炉の鍛冶神':'ソウロノカジシン','潮先の鷺神':'シオサキノサギガミ','瀬渡りのカワセミ神':'セワタリノカワセミガミ','面削りの童神':'メンケズリノドウシン','逆夢の獏神':'サカユメノバクシン','嵐呼の雷獣':'アラシヨブノライジュウ','不動の山神':'フドウノヤマガミ','爆炎の剣神':'バクエンノケンシン','疾風の忍神':'シップウノニンシン','薄暮の呪い手':'ハクボノノロイテ','霙神':'ミゾレガミ','稲光':'イナビカリ','苗神':'ナエガミ','火達磨':'ヒダルマ','飛沫神':'シブキガミ','写し神':'ウツシガミ','雨乞い':'アマゴイ','雲払い':'クモバライ','招雷':'ショウライ','守護':'シュゴ','神託':'シンタク','種まき':'タネマキ','覚醒の神鏡':'カクセイノシンキョウ','神位継承の巻':'シンイケイショウノマキ','雨脚の矢':'アマアシノヤ','雲間の返照':'クモマノヘンショウ','天柱落とし':'テンチュウオトシ','岩盤返し':'ガンバンガエシ','実りの分け前':'ミノリノワケマエ','山門の進軍':'サンモンノシングン','火挟み':'ヒバサミ','二の太刀':'ニノタチ','落日の火葬鐘':'ラクジツノカソウショウ','追い潮':'オイシオ','水面抜き':'ミナモヌキ','航跡を読む':'コウセキヲヨム','大地の恵み':'ダイチノメグミ','火付け':'ヒツケ','引き潮':'ヒキシオ','心読み':'ココロヨミ','影の縫い返し':'カゲノヌイカエシ','空蝉の歩法':'ウツセミノホホウ','逆さ月の宣告':'サカサツキノセンコク'};
function readingOf(name){return READING[String(name||'').replace(/[\s　]/g,'')]||''}
function heroReading(name){let n=String(name||'').replace(/[\s　]/g,'');for(const id of Object.keys(GOD_CARDS)){let i=+id;if(typeof titles!=='undefined'&&titles[i]+names[i]===n){let st=0;try{if(typeof p!=='undefined'&&p&&p.id===i)st=p.stage;else if(typeof c!=='undefined'&&c&&c.id===i)st=c.stage}catch(e){}return readingOf(stageOf(i,st).name)}}return ''}
function rubyP(name){let r=readingOf(name)||heroReading(name);return r?'<p class="gd-ruby">'+r+'</p>':''}
function nameOfCard(id){if(typeof id==='number')return titles[id]+names[id];if(EXP_CARDS[id])return EXP_CARDS[id].name;return spellName(id)}

// 絵に名前が描かれたカード（主神・拡張・初期呪文）：名前帯のすぐ上に読みの帯を重ねる（2026-11-27）
function rubyBand(name){let r=readingOf(name);return r?'<span class="gb ruby" style="'+pct([96,566,399,30])+'"><i class="fit one" data-r=".92">'+r+'</i></span>':''}
