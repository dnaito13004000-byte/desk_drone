const gods={2:[3,5],1:[2,4],5:[2,6],6:[2,7],7:[3,4],8:[4,6],9:[2,5],11:[3,6]};// 7ナギ・8アカツキ・9ツクヨ・11スバル＝正本（2026-11-26）
const support=id=>({2:1,5:6,0:6,3:1,10:1})[id]??1;
const THEME={2:['bolt','draw'],5:['seed','sun']};
let p,c,weather,turn,sel,history,ending,round,attacker=-1,busy=false,help=false,serial=0,arrived='',latest='';
function unit(id,st=0){let g=GOD_CARDS[id]?stageOf(id,st):null,a=g?g.atk:gods[id][0],h=g?g.hp:gods[id][1];return {id,hp:h,max:h,atk:a,used:false,att:0,uid:++serial}}
// 自陣の主神（主人公の神）。数値と形態は GOD_CARDS から
function mk(f,id){let u=unit(id,id===f.id?f.stage:0);if(id===f.id){u.hero=true;let fx=heroFx(f);if(fx.shadow)u.shadow=true}return u}
function heroOf(f){return f.units.find(u=>u.hero)}
// ---- 主神は倒れない：体力0以下になったら超過分は切り捨て、神殿が1枚身代わりに割れて最大体力まで回復。神殿0枚なら敗北 ----
let subLog=[];
function substitute(side){let h=heroOf(side);if(!h||h.hp>0||ending)return;
 if(side.shrines.length){let lost=side.shrines.splice(0,1);side.broken=(side.broken||[]).concat(lost);side.shrineBroken=true;h.hp=h.max;side.subs=(side.subs||0)+1;shrineLost(side);subLog.push({side,uid:h.uid});latest+='　神殿が身代わりになった！'}
 else{ending=side===p?'敗北':'勝利';lastReward=grantReward(side!==p);latest+='　神殿が尽きた…'}}
function settle(...sides){let all=new Set(sides);
 // 爆炎の剣神：倒れたとき、敵1体に2ダメージ（対象は霹靂を喰う天狗と同じ自動選択）。連鎖で倒れた分もここで処理
 for(let k=0;k<6&&!ending;k++){let any=false;for(const s of [...all])for(const u of s.units)if(u.id==='fire-6'&&u.hp<=0&&!u.boomed){u.boomed=true;any=true;let d=foeOf(s);all.add(d);
  let t=[...d.units].filter(x=>x.hp>0&&!x.ward).sort((a,b)=>(a.hero?1:0)-(b.hero?1:0)||(a.hp<=2?-1:0)-(b.hp<=2?-1:0)||a.hp-b.hp)[0]||d.units.find(x=>x.hp>0);
  if(t){let n=hurt(t,2);latest+='　爆炎の剣神が倒れ、'+names[t.id]+'に'+n+'ダメージ'}}if(!any)break}
 for(const x of all)substitute(x);for(const x of all){for(const y of x.units)if(y.hp<=0&&!y.hero){x.grave=x.grave||[];x.grave.push(handKey(y.id))}x.units=x.units.filter(y=>y.hp>0||(y.hero&&ending))}}
// 不動の山神：自分の神殿が割れたとき（身代わりを含む）、2回復（最大体力まで）
function shrineLost(side){for(const u of side.units)if(u.id==='earth-6'&&u.hp>0&&u.hp<u.max){let b=u.hp;u.hp=Math.min(u.max,u.hp+2);latest+='　不動の山神が'+(u.hp-b)+'回復';healed(side)}}
// 身代わりの演出：その陣営の神殿の伏せ札を1枚割り、「神殿が身代わりになった！」を出す
async function subFx(){let list=subLog;subLog=[];if(calm())return;
 for(const e of list){let row=document.getElementById('shrine'+e.side.id),cards=row?[...row.querySelectorAll('.back')].filter(x=>x.style.visibility!=='hidden'):[],card=cards[cards.length-1],hn=document.getElementById('u'+e.uid);
  if(card){crack(card);await pause(200);sfx('shrine');breakCard(card,e.side===c);let r=body(card,.5);pop('神殿が身代わりになった！',r.x,r.y+(e.side===p?-60:60),0,'shrine');let cn=row.querySelector('.cnt b');if(cn)cn.textContent=e.side.shrines.length}
  if(hn){let h=heroOf(e.side);if(h)drain(hn,h);let r=body(hn,.4);pop('全回復',r.x,r.y,1,'heal')}
  await pause(650)}}
function heroFx(f){return GOD_CARDS[f.id]?stageOf(f.id,f.stage).fx:{}}
function fxOf(f,u){return u&&u.hero?heroFx(f):{}}
const atkOf=u=>Math.max(0,(u.setAtk!=null?u.setAtk:u.atk+(u.tmpAtk||0)+(u.id===11?subaruBonus(u):0))-(u.weak||0));// 2026-11-28：ナギ・アカツキの天候ボーナスは廃止。星神スバル＝墓地の仲間の数（最大+3）
function maxAttacks(f,u){return (fxOf(f,u).attacks||(u&&u.id==='water-7'?2:1))+(u&&u.extraAtt||0)}
function canEvolve(f){let h=heroOf(f);return !!h&&f.stage===0&&f.gauge>=ASCEND.evolve.gauge&&f.mp>=ASCEND.evolve.cost}
function canAwaken(f){let h=heroOf(f);return !!h&&f.stage===1&&f.shrineBroken&&f.mp>=ASCEND.awaken.cost}
// 進化（N→R）・覚醒（R→SR）：最大体力が増えた分だけ現在体力も増える（全回復はしない）
function ascend(f){let h=heroOf(f),cost=f.stage===0?ASCEND.evolve.cost:ASCEND.awaken.cost;f.mp-=cost;f.stage++;let s=stageOf(f.id,f.stage),grow=s.hp-h.max;h.max=s.hp;h.hp+=grow;h.atk=s.atk;if(s.fx.shadow&&f.stage===1)h.shadow=true;
 latest=(f.stage===1?'進化！ ':'覚醒！ ')+s.name+'（攻'+s.atk+' / 体'+h.hp+'）'}
async function ascendUI(f){if(!(canEvolve(f)||canAwaken(f))||(f===p&&busy))return;ascend(f);busy=true;attacker=-1;skillMode=null;
 render();sfx('awaken');
 let played=await playAwakenVideo(f.id);render();
 let h=heroOf(f),el=h&&document.getElementById('u'+h.uid);
 if(el&&!calm()){el.classList.add('ascending');let lb=document.createElement('i');lb.className='lightburst';el.appendChild(lb);
  await el.animate([{filter:'brightness(3) saturate(.3)',transform:'scale(1.15)'},{transform:'perspective(600px) rotateY(90deg)',offset:.4},{transform:'perspective(600px) rotateY(-10deg)',offset:.6},{filter:'brightness(1)',transform:'none'}],{duration:played?600:1100,easing:'ease-out'}).finished}
 busy=f===c;render()}
// 主神の技（雷撃・芽吹き・冥火）：1ターンに1回、神力を払って対象を選ぶ
let skillMode=null;
function skillOf(f){let h=heroOf(f);if(!h)return null;let s=stageOf(f.id,f.stage),x=s.fx,name=x.bolt?'雷撃':x.heal?'芽吹き':x.fox?'冥火':null;
 if(!name)return null;return {name,kind:x.bolt?'bolt':x.heal?'heal':'fox',n:x.bolt||x.heal||x.fox,cost:s.cost||1,side:x.heal?'ally':'foe'}}
function canSkill(f){let k=skillOf(f);return !!k&&!f.skillUsed&&f.mp>=k.cost}
async function useSkill(f,v){let k=skillOf(f),d=f===p?c:p;if(!k||!canSkill(f)||!v)return;f.mp-=k.cost;f.skillUsed=true;skillMode=null;let wasBusy=busy;busy=true;
 let el=document.getElementById('u'+v.uid),r=el&&body(el,.45);
 if(k.kind==='bolt'){let nn=hurt(v,k.n),wasHero=v.hero;latest=k.name+'！ '+names[v.id]+'に'+nn+'ダメージ'+(nn?'':'（招雷で0）');if(r&&!calm()){sfx('hit');burst('bolt',r.x,r.y);struck(el);pop(nn?'−'+nn:'守護',r.x,body(el,.2).y,k.n);drain(el,v);if(v.hp<=0&&!(wasHero&&d.shrines.length))el.classList.add('ko');await pause(v.hp<=0?560:420)}settle(d);await subFx()}
 else if(k.kind==='heal'){let before=v.hp;v.hp=Math.min(v.max,v.hp+k.n);if(v.hp>before)healed(f);latest=k.name+'！ '+names[v.id]+'の体力を'+(v.hp-before)+'回復';if(r&&!calm()){burst('leaf',r.x,r.y);pop('+'+(v.hp-before),r.x,body(el,.2).y,1,'heal');drain(el,v);await pause(420)}}
 else{v.weak=k.n;v.weakBy=null;latest=k.name+'！ '+names[v.id]+'の攻撃力−'+k.n+'（場を離れるまで）';if(r&&!calm()){burst('water',r.x,r.y);pop('攻−'+k.n,r.x,body(el,.2).y,1,'guard');await pause(420)}}
 busy=wasBusy;render();await shrineReveal(f,null,d)}
// 自分のターンのはじめ：樹脈・千樹の回復、影分身の復活（冥火・面削りの攻撃力低下は、その敵が場を離れるまで残る）
function turnStart(f){let h=heroOf(f),x=heroFx(f),o=f===p?c:p,tag=f===p?'p':'c';f.skillUsed=false;
 o.units.forEach(u=>{if(u.weakBy===tag){u.weak=0;u.weakBy=null}});
 if(!h)return;if(x.regen){let up=false;f.units.forEach(u=>{let b=u.hp;u.hp=Math.min(u.max,u.hp+x.regen);if(u.hp>b)up=true});f.regenFx=x.regen;if(up)healed(f)}
 if(x.shadowRevive)h.shadow=true}
function fighter(id){
 const summon='g'+support(id), [theme,fourth]=THEME[id]||['sun','draw'];
 const deck=shuffle(Array.from({length:4},()=>[summon,'rain',theme,fourth,'guard','draw']).flat());
 let f={id,deck,hand:[summon,'rain',theme,'guard'],shrines:deck.splice(0,3),max:1,mp:1,charged:false,seed:0,ready:false,evolved:false,burst:false,stage:0,gauge:0,shrineBroken:false,skillUsed:false,units:[]};
 f.units=[mk(f,id)];return f
}
function start(id){if(SFX_ON)Object.keys(SFX).forEach(sfxLoad);p=fighter(id);let F=window.__storyFoe;window.__storyFoe=null;c=fighter(F?F.id:(id===2?5:2));if(F)applyStoryFoe(c,F);skillMode=null;round=1;weather='晴れ';ending='';help=false;busy=false;history=[];latest='手札から仲間を召喚するか、味方の神を選んで攻撃。';begin(p);render()}
function begin(f){turn=f;f.turns=(f.turns||0)+1;resetTurn(f);attackMode=false;f.charged=false;f.mp=f.max;f.units.forEach(u=>{u.used=false;u.att=0});turnStart(f);skillMode=null;if(f.deck.length)f.hand.push(f.deck.pop());if(!f.units.length&&!f.hand.some(k=>isSum(k)))f.hand.push('g'+f.id);sel=-1;attacker=-1}
function sky(value){weather=value}
function charge(f,i){if(f.charged||i<0||i>=f.hand.length)return;f.hand.splice(i,1);f.max++;f.mp++;f.charged=true;sel=-1;latest='神力を1増やした。'}
function info(k){if(isSum(k)){let id=+k.slice(1),g=GOD_CARDS[id]?stageOf(id,0):null;return [titles[id]+' '+names[id],'召喚 · 攻'+(g?g.atk:gods[id][0])+' / HP'+(g?g.hp:gods[id][1])]}return [moves[k][0],{rain:'天候を雨にする',bolt:'雨のとき敵1体に2ダメージ',seed:'神力を2回復',sun:'天候を晴れにする',guard:'味方の次のダメージを0',draw:'山札から2枚引く'}[k]]}
function legal(f,k){return k&&f.mp>=1&&(isSum(k)?f.units.length<3:(k!=='guard'||f.units.length>0)&&(k!=='bolt'||weather==='雨'&&(f===p?c:p).units.length>0)&&(k!=='draw'||f.deck.length))}
function play(f,i,t){let k=f.hand[i];if(!legal(f,k))return;if((k==='bolt'||k==='guard')&&!t)return;f.mp--;f.hand.splice(i,1);sel=-1;latest=names[f.id]+'：'+info(k)[0];if(isSum(k)){let u=mk(f,+k.slice(1));f.units.push(u);arrived=u.uid;sfx('summon');latest=names[u.id]+'を召喚！'}if(k==='rain')sky('雨');if(k==='sun')sky('晴れ');if(k==='seed'){let b=f.mp;f.mp=Math.min(f.max,f.mp+2);latest=names[f.id]+'：種まき（神力を'+(f.mp-b)+'回復）'}if((k==='bolt'||k==='guard')&&t)spellEffect(f,k,t);if(k==='draw')for(let j=0;j<2&&f.deck.length;j++)f.hand.push(f.deck.pop())}
// 守護：味方1体の「次に受けるダメージ」を0にする（u.ward）。招雷：雨のとき敵1体に2ダメージ
function hurt(v,n){if(n>0&&v.ward){v.ward=false;return 0}v.hp-=n;return n}
function spellEffect(f,k,t){let d=f===p?c:p;if(k==='bolt'){let n=hurt(t,2);latest='招雷！ '+names[t.id]+'に'+n+'ダメージ'+(n?'':'（招雷で0）');t.lastDmg=n;settle(d)}else{t.ward=true;latest='守護！ '+names[t.id]+'が次に受けるダメージは0'}}
function startSpell(i){let k=p.hand[i];if(!legal(p,k))return;skillMode={spell:k,i,name:moves[k][0],cost:costOf(k),side:k==='bolt'?'foe':'ally'};attacker=-1;sel=-1;render()}
async function castSpell(f,i,t){let k=f.hand[i],el=document.getElementById('u'+t.uid),r=el&&body(el,.45);skillMode=null;play(f,i,t);let d=f===p?c:p;
 if(r&&!calm()){if(k==='bolt'){let n=t.lastDmg||0;sfx('hit');burst('bolt',r.x,r.y);struck(el);pop(n?'−'+n:'守護',r.x,body(el,.2).y,Math.max(1,n),n?'':'guard');drain(el,t);if(t.hp<=0)el.classList.add('ko');await pause(t.hp<=0?560:420)}
  else{burst('guard',r.x,r.y);pop('守護',r.x,body(el,.2).y,1,'guard');await pause(420)}}
 await subFx();render();await shrineReveal(f,null,d)}
function selectedGod(uid){return p.units.find(x=>x.uid===uid)}
function pick(uid){if(skillMode&&skillMode.side==='ally'){let v=p.units.find(x=>x.uid===uid);if(v&&skillMode.spell){if(!busy)castSpell(p,skillMode.i,v)}else if(v)useSkill(p,v);return}
 if(!attackMode&&attacker<0){let v=p.units.find(x=>x.uid===uid);if(v){unitZoom(p,v);return}}if(turn!==p||busy||ending||selectedGod(uid)?.used)return;{let su=selectedGod(uid);if(su&&sickOf(p,su)){latest=names[su.id]+'は召喚酔い中（次の自分のターンから攻撃できる）';render();return}}attacker=attacker===uid?-1:uid;sel=-1;render()}
function cardPick(i){if(turn!==p||busy||ending||!p.hand[i])return;sel=i;attacker=-1;attackMode=false;skillMode=null;render();handZoom(i)}
// ---- 手札の拡大表示：開封時と同じ大きさのカード＋全文・用語＋その場で「召喚／使う」「神力に置く」 ----
let attackMode=false;
function whyNot(f,k){if(legal(f,k))return '';let need=costOf(k)-f.mp;if(need>0)return '神力があと'+need+'足りない';
 if(isSum(k))return '場がいっぱい（3体まで）';if(k==='bolt')return weather!=='雨'?'天候が「雨」のときだけ使える':'攻撃できる敵がいない';if(k==='guard')return '守る味方がいない';if(k==='draw')return '山札がない';return '今は使えない'}
function closeHandZoom(){document.querySelectorAll('.handzoom:not(.ask):not(.breach)').forEach(x=>x.remove());sel=-1;render()}
function handZoom(i){if(document.querySelector('.handzoom.ask,.handzoom.breach'))return;document.querySelectorAll('.handzoom').forEach(x=>x.remove());let k=p.hand[i];if(!k)return;
 let g=isSum(k),key=g?sumId(k):k,isHero=g&&typeof key==='number'&&!!GOD_CARDS[key],full=isHero?stageText(key,p.stage):g?cardFull(key):cardFull(k),why=whyNot(p,k),name=g?titles[key]+' '+names[key]:spellName(k);
 let o=document.createElement('div');o.className='handzoom';o.setAttribute('role','dialog');o.setAttribute('aria-label',name+'の拡大表示');
 o.innerHTML='<div class="hz-in"><div class="hz-card">'+ucard(k,{showCost:true,cost:costOf(k),cantPay:p.mp<costOf(k)})+'</div><div class="hz-text"><p class="hz-kind">'+(isHero?'主神':g?'仲間':'呪文')+' ／ '+(colorOf(key)||'色なし')+' ／ コスト'+(k==='scroll'?'X':costOf(k))+'　<small>いまの神力 '+p.mp+'</small></p><p class="hz-eff">'+full+'</p>'+(termList(full+(g?'仲間':''))?'<details class="hz-terms"><summary>用語の説明</summary>'+termList(full+(g?'仲間':''))+'</details>':'')+'</div>'
 +'<div class="hz-acts"><button class="hz-btn gold" data-a="use"'+(why?' disabled':'')+'>'+(g?'召喚する':'使う')+'</button>'+(why?'<small class="hz-why">'+why+'</small>':'')
 +'<button class="hz-btn" data-a="charge"'+(p.charged?' disabled':'')+'>'+(p.charged?'置いた（1ターン1枚）':'神力に置く')+'</button><button class="hz-btn ghost" data-a="close">閉じる</button></div></div>';
 o.onclick=e=>{if(e.target===o){closeHandZoom();return}let b=e.target.closest('button');if(!b||b.disabled)return;let a=b.dataset.a;o.remove();
  if(a==='use'){sel=-1;if(SP[k]&&SP[k].tgt)startSpell(i);else{busy=true;doPlay(p,i).then(()=>{busy=false;render()})}}
  else if(a==='charge'){sel=-1;chargeUI(p,i)}else closeHandZoom()};
 document.body.appendChild(o);fitHandZoom(o);o.querySelector('details')?.addEventListener('toggle',()=>fitHandZoom(o))}
// スクロールせずに1画面に収める：文字とボタンの高さを引いた残りでカードの大きさを決める
function fitHandZoom(o){let card=o.querySelector('.hz-card'),txt=o.querySelector('.hz-text'),acts=o.querySelector('.hz-acts');if(!card)return;let hd=o.querySelector('.breach-head'),H=Math.min(o.clientHeight||9999,window.visualViewport?visualViewport.height:innerHeight,innerHeight)-(hd&&!(innerWidth>innerHeight&&innerHeight<520)?hd.offsetHeight+10:0),W=innerWidth,land=W>innerHeight&&innerHeight<520,cs=getComputedStyle(o),pad=(parseFloat(cs.paddingTop)||14)+(parseFloat(cs.paddingBottom)||14)+16,gap=10;
 txt.style.maxHeight='';if(land){let w=Math.min(W*.36,(H-pad)*591/887);card.style.width=Math.max(110,w)+'px';txt.style.maxHeight=Math.max(60,innerHeight-pad-acts.offsetHeight-gap*2-(hd?hd.offsetHeight:0))+'px';return}
 let rest=H-pad-txt.offsetHeight-acts.offsetHeight-gap*2,w=Math.min(W*.66,300,rest*591/887);if(w<130){w=130;txt.style.maxHeight=Math.max(90,H-pad-acts.offsetHeight-gap*2-130*887/591)+'px'}card.style.width=w+'px'}
addEventListener('resize',()=>{let o=document.querySelector('.handzoom:not(.confirm)');if(o)fitHandZoom(o)});
function canAttackAny(){return turn===p&&!busy&&!ending&&p.units.some(u=>!u.used&&u.hp>0&&!sickOf(p,u))}
function attackBtn(){attackMode=!attackMode&&canAttackAny();if(!attackMode)attacker=-1;else{let r=p.units.filter(u=>!u.used&&u.hp>0&&!sickOf(p,u));if(r.length===1)attacker=r[0].uid}sel=-1;skillMode=null;render()}
function endTurnUI(){if(turn!==p||busy||ending)return;if(!canAttackAny()){enemyTurn();return}
 let o=document.createElement('div');o.className='handzoom confirm';o.setAttribute('role','dialog');
 o.innerHTML='<div class="hz-in"><div class="hz-text"><h3>まだ攻撃できる味方がいます。</h3><p class="hz-eff">ターン終了しますか？</p></div><div class="hz-acts"><button class="hz-btn" data-a="end">ターン終了する</button><button class="hz-btn gold" data-a="back">もどって攻撃する</button></div></div>';
 o.onclick=e=>{let b=e.target.closest('button');if(e.target!==o&&!b)return;o.remove();if(b&&b.dataset.a==='end')enemyTurn();else if(b){attackMode=true;render()}};document.body.appendChild(o)}
function resolveStrike(f,u,d,v){let x=fxOf(f,u),wasWeak=v&&weakened(v)?Math.min(v.weak,v.atk):0;u.att=(u.att||0)+1;u.used=u.att>=maxAttacks(f,u)||!v||!!v.hero;let bonus=f.burst?1:0;f.burst=false;f.overflowHit=null;let hit=false;
 let pow=atkOf(u)+bonus+(u.id==='earth-1'&&u.hp>=u.max?1:0)-(u.att===2&&x.second?x.second:0);pow=Math.max(0,pow);
 if(v){let dmg=pow+(x.extra||0),note='';
  if(v.shadow){v.shadow=false;dmg=0;note='（影分身で0）'}else if(v.ward&&dmg>0){v.ward=false;dmg=0;note='（招雷で0）'}
  let before=v.hp;v.hp-=dmg;hit=dmg>0;if(dmg>0)v.hitThisTurn=true;
  if(x.overflow&&v.hp<0&&!v.hero){let hh=heroOf(d);if(hh){let over=hurt(hh,-v.hp);f.overflowHit={uid:hh.uid,n:over};note+='　余り'+over+'が'+names[hh.id]+'へ'}}
  let ca=hurt(u,atkOf(v));if(!ca&&atkOf(v)>0)note+='（招雷で反撃0）';latest=names[u.id]+' → '+names[v.id]+'　'+dmg+'ダメージ・反撃 '+ca+note;f.hitInfo={v:dmg,u:ca};if(ca>0)u.hitThisTurn=true;settle(d,f)}
 else{if(d.shrines.length){let lost=d.shrines.splice(0,1+bonus);d.broken=lost;d.shrineBroken=true;hit=true;latest=names[u.id]+'が神殿を破壊！';shrineLost(d)}
 else{ending=f===p?'勝利':'敗北';hit=true;lastReward=grantReward(f===p)}}
 if(u.hero&&hit&&f.stage===0)f.gauge=Math.min(ASCEND.evolve.gauge,f.gauge+1);if(!ending)afterStrike(f,u,d,v,wasWeak);attacker=u.used||u.hp<=0?-1:attacker}
// ---- 壊れた神殿のカードは公開され、守る側の手札に加わる ----
function revealBox(k,head,note){let o=document.createElement('div');o.className='reveal';
 o.innerHTML='<div class="rv"><div class="rv-card"><img src="'+art(k)+'"><b>'+info(k)[0]+'</b><small>'+info(k)[1]+'</small></div><div class="rv-side"><p class="rv-head">'+head+'</p><p class="rv-note">'+note+'</p></div></div>';
 document.body.appendChild(o);return o}
// ---- 壊れた神殿のカードは公開され、守る側の手札に加わる ----
async function shrineReveal(f,u,d){let list=d.broken||[];d.broken=null;
 for(const k of list){let mine=d===p,o=revealBox(k,(mine?'自陣':'敵陣')+'の神殿から',mine?'手札に加わった。':'相手の手札に加わった。');
  await pause(calm()?0:900);o.remove();d.hand.push(k);render();await pause(calm()?0:250)}}
// ---- 効果音：dist/sfx/ に置いた音源（mp3、なければwav）を再生。ファイルを差し替えるだけで音が変わる ----
const SFX={flip:'card_flip',summon:'summon',attack:'attack',hit:'hit',shrine:'shrine-break',awaken:'awaken'},sfxCache={};let soundOpen=false;
function soundCfg(){if(!save.sound)save.sound={volume:.8,muted:false};return save.sound}
function sfxLoad(key){if(sfxCache[key])return sfxCache[key];let a=new Audio(),exts=['mp3','wav'],t=0;a.preload='auto';a.onerror=()=>{if(++t<exts.length)a.src='sfx/'+SFX[key]+'.'+exts[t];else a.dead=true};a.src='sfx/'+SFX[key]+'.'+exts[0];sfxCache[key]=a;return a}
const SFX_ON=true;    // dist/sfx/ に置いた音だけが鳴る（ファイルが無い場面は無音）。全部止めるときは false
function sfx(key){if(!SFX_ON)return;let s=soundCfg();if(s.muted||!(s.volume>0))return;let base=sfxLoad(key);if(base.dead)return;try{let a=base.cloneNode();a.volume=Math.min(1,s.volume);let pr=a.play();if(pr)pr.catch(()=>{})}catch(e){}}
function setVolume(v){let s=soundCfg();s.volume=Math.max(0,Math.min(1,v/100));if(s.volume>0)s.muted=false;persist();let lab=document.querySelector('.soundpanel output');if(lab)lab.textContent=Math.round(s.volume*100)}
function toggleMute(){let s=soundCfg();s.muted=!s.muted;persist();render();if(!s.muted)sfx('hit')}
function soundPanel(){let s=soundCfg(),v=Math.round(s.volume*100);return '<div class="soundpanel" role="dialog" aria-label="音の設定（BGM・効果音）"><b>音（BGM・効果音）</b><label>音量 <output>'+v+'</output><input type="range" min="0" max="100" step="5" value="'+v+'" oninput="setVolume(this.value)" onchange="sfx(\'hit\')"></label>'+btn(s.muted?'ミュート中（タップで解除）':'ミュートする','toggleMute()','',s.muted?'gold':'')+btn('閉じる','soundOpen=false;render()')+'</div>'}
// ---- 覚醒ムービー：dist/video/ に置いた神ごとの召喚エフェクト動画を全画面で再生。無い神は従来の覚醒演出 ----
const AWAKEN_VIDEO={2:'video/awaken-thunder.mp4',1:'video/awaken-water.mp4',5:'video/awaken-forest.mp4',6:'video/awaken-rock.mp4'};
function playAwakenVideo(id){let src=AWAKEN_VIDEO[id];if(!src||calm())return Promise.resolve(false);
 return new Promise(done=>{let o=document.createElement('div'),v=document.createElement('video'),s=soundCfg(),started=false,fin=false,timer;
  o.className='awakenvideo';o.setAttribute('role','dialog');o.setAttribute('aria-label',names[id]+'の覚醒ムービー（タップでスキップ）');
  v.src=src;v.playsInline=true;v.setAttribute('playsinline','');v.preload='auto';v.volume=Math.min(1,s.volume||0);v.muted=!!s.muted;
  o.appendChild(v);o.insertAdjacentHTML('beforeend','<span class="skip">タップでスキップ</span>');document.body.appendChild(o);
  let end=played=>{if(fin)return;fin=true;clearTimeout(timer);try{v.pause()}catch(e){}o.classList.add('out');setTimeout(()=>o.remove(),played?220:0);done(played)};
  o.onclick=()=>end(true);v.onended=()=>end(true);v.onerror=()=>end(started);
  v.onplaying=()=>{started=true;o.classList.add('on');clearTimeout(timer);timer=setTimeout(()=>end(true),Math.max(4,(v.duration||8)+1.5)*1000)};
  timer=setTimeout(()=>end(started),4000);// 読み込めない時は4秒で従来演出へ
  let pr=v.play();if(pr)pr.catch(()=>{v.muted=true;v.play().catch(()=>end(false))})})}
// 覚醒：ルールの処理（awaken）を先に済ませてから演出。スキップしても覚醒状態・神力は確定済み
async function awakenUI(f){if(!(f.ready&&!f.evolved&&f.mp>=2)||(f===p&&busy))return;awaken(f);busy=true;
 let say=document.querySelector('.duel .say');if(say)say.textContent=latest;
 let played=false;
 render();if(played){let h=f.units.find(u=>u.id===f.id),el=h&&document.getElementById('u'+h.uid);if(el)await el.animate([{filter:'brightness(2.6)',scale:1.12},{filter:'brightness(1)',scale:1}],{duration:520,easing:'ease-out'}).finished}else await pause(calm()?0:1300);busy=f===c;render()}
const pause=ms=>new Promise(r=>setTimeout(r,ms));
// ---- 攻撃演出：狙う → 当たる → 減る（反撃も同じ順） ----
const fxKind={2:'bolt',1:'water',5:'leaf',6:'rock'};
const calm=()=>matchMedia('(prefers-reduced-motion: reduce)').matches;
function fxLayer(){let l=document.getElementById('fx');if(!l){l=document.createElement('div');l.id='fx';document.body.appendChild(l)}return l}
function box(el){let im=el.querySelector('img'),r=(im||el).getBoundingClientRect();if(!im||!im.naturalWidth||getComputedStyle(im).objectFit!=='contain')return r;
 let k=Math.min(r.width/im.naturalWidth,r.height/im.naturalHeight),w=im.naturalWidth*k,h=im.naturalHeight*k;// object-fit:contain・下揃えで実際に描かれている範囲
 return {left:r.left+(r.width-w)/2,width:w,top:r.bottom-h,height:h,bottom:r.bottom}}
function feet(el){let r=box(el);return {x:r.left+r.width/2,y:r.bottom-4}}
function body(el,fy=.5){let r=box(el);return {x:r.left+r.width/2,y:r.top+r.height*fy}}
function aim(a,b,ally){let s=document.createElementNS('http://www.w3.org/2000/svg','svg'),col=ally?'#ffe08a':'#ff8f74',mx=(a.x+b.x)/2,my=Math.max(a.y,b.y)+Math.min(40,Math.abs(b.x-a.x)*.12),ang=Math.atan2(b.y-my,b.x-mx)*180/Math.PI;
 s.setAttribute('class','aim');s.setAttribute('width',innerWidth);s.setAttribute('height',innerHeight);
 s.innerHTML='<path d="M'+a.x+' '+a.y+'Q'+mx+' '+my+' '+b.x+' '+b.y+'" stroke="'+col+'" stroke-width="3.5" fill="none" stroke-linecap="round" pathLength="100" class="trail"/><path d="M-12 -7L0 0-12 7" transform="translate('+b.x+' '+b.y+') rotate('+ang+')" stroke="'+col+'" stroke-width="3.5" fill="none" stroke-linecap="round" stroke-linejoin="round" class="head"/>';
 fxLayer().appendChild(s);return s}
function burst(kind,x,y){let d=document.createElement('div');d.className='burst k-'+kind;d.style.left=x+'px';d.style.top=y+'px';
 let bits='';for(let i=0;i<8;i++)bits+='<span style="--a:'+(i*45+Math.random()*20)+'deg;--r:'+(42+Math.random()*30)+'px"></span>';
 d.innerHTML='<i class="glow"></i>'+(kind==='bolt'?'<svg class="zig" viewBox="-30 -170 60 180"><path d="M8-170-12-104 6-100-16-44 4-48-4 6" fill="none" stroke="#fffbd0" stroke-width="7" stroke-linejoin="round"/><path d="M8-170-12-104 6-100-16-44 4-48-4 6" fill="none" stroke="#b9a2ff" stroke-width="14" stroke-linejoin="round" opacity=".35"/></svg>':'')+(kind==='water'?'<b class="ripple"></b><b class="ripple r2"></b>':'')+(kind==='guard'?'<svg class="shield" viewBox="-30 -34 60 68"><path d="M0-30 26-18V4C26 20 12 28 0 32-12 28-26 20-26 4V-18z" fill="#9fd4ff55" stroke="#dff1ff" stroke-width="3"/></svg>':bits);
 fxLayer().appendChild(d);setTimeout(()=>d.remove(),950)}
function shatter(el,n){let backs=[...el.querySelectorAll('.back')].slice(-n);backs.forEach((bk,j)=>{let r=bk.getBoundingClientRect(),foe=el.closest('.opp');bk.style.visibility='hidden';
 for(let i=0;i<7;i++){let s=document.createElement('i');s.className='shard'+(foe?' foe':'');let a=i/7*Math.PI*2+Math.random()*.6,d=50+Math.random()*50;
  s.style.cssText='left:'+(r.left+r.width/2)+'px;top:'+(r.top+r.height/2)+'px;width:'+r.width*.5+'px;height:'+r.height*.45+'px;--tx:'+Math.cos(a)*d+'px;--ty:'+Math.sin(a)*d+'px;--rot:'+(Math.random()*240-120)+'deg;animation-delay:'+j*90+'ms;clip-path:polygon('+[0,1,2,3].map(()=>Math.round(Math.random()*100)+'% '+Math.round(Math.random()*100)+'%').join(',')+')';
  fxLayer().appendChild(s);setTimeout(()=>s.remove(),900)}})}
function num(text,x,y,cls){let n=document.createElement('div');n.className='dmg '+(cls||'');n.textContent=text;n.style.left=x+'px';n.style.top=y+'px';fxLayer().appendChild(n);setTimeout(()=>n.remove(),1100)}
function flash(el){el.querySelector('img')?.animate([{filter:'brightness(1)',translate:'0 0'},{filter:'brightness(2.8) saturate(.4)',translate:'6px 0'},{filter:'brightness(1.4)',translate:'-5px 0'},{filter:'brightness(1)',translate:'0 0'}],{duration:340})}
function drain(el,g){let i=el.querySelector('.hp:not(.gb)>i'),gh=el.querySelector('.hp:not(.gb)>.ghost'),w=Math.max(0,g.hp)/g.max*100+'%';if(i)i.style.width=w;if(gh)gh.style.width=w;let gs=el.querySelector('.gtag .gst');if(gs)gs.textContent='⚔'+atkOf(g)+' ♥'+Math.max(0,g.hp);let gv=el.querySelector('.gb.hp .fit');if(gv)gv.innerHTML='<b class="cur">'+Math.max(0,g.hp)+'</b>';let l=el.querySelector('label .st');if(l)l.innerHTML='<s>⚔'+g.atk+'</s><s>♥'+Math.max(0,g.hp)+'</s>'}
// ---- 攻撃：狙う → 少し引く → 加速して突っ込む → ヒットストップ → 揺れ・白フラッシュ・ダメージ数字 → 戻る ----
async function hitstop(ms){let run=document.getAnimations().filter(a=>a.playState==='running');run.forEach(a=>a.pause());document.body.classList.add('hitstop');await new Promise(r=>setTimeout(r,ms));document.body.classList.remove('hitstop');run.forEach(a=>{try{a.play()}catch(e){}})}
function shake(power){let arena=document.querySelector('.arena');if(!arena||calm())return;let A=Math.min(2+power*2.6,15),k=[];for(let i=0;i<7;i++){let f=1-i/7;k.push({transform:'translate('+((Math.random()*2-1)*A*f).toFixed(1)+'px,'+((Math.random()*2-1)*A*f).toFixed(1)+'px)'})}k.push({transform:'none'});arena.animate(k,{duration:240+power*20,easing:'linear'})}
function struck(el){if(!el)return;let w=document.createElement('i');w.className='whiteflash';el.appendChild(w);w.animate([{opacity:.95},{opacity:0}],{duration:260,easing:'ease-out'}).finished.then(()=>w.remove());
 el.animate([{translate:'0 0'},{translate:'-5px 1px'},{translate:'5px -1px'},{translate:'-4px 0'},{translate:'3px 1px'},{translate:'-1px 0'},{translate:'0 0'}],{duration:300})}
function pop(text,x,y,power,cls){let n=document.createElement('div');n.className='pop '+(cls||'');n.textContent=text;n.style.left=x+'px';n.style.top=y+'px';n.style.fontSize=Math.min(40+power*7,78)+'px';fxLayer().appendChild(n);setTimeout(()=>n.remove(),1150)}
function crack(card){if(!card)return;let c=document.createElement('i');c.className='crack';c.innerHTML='<svg viewBox="0 0 40 56" preserveAspectRatio="none"><path d="M21 0 18 14 24 21 15 31 20 40 16 56M18 14 8 18M24 21 34 19M15 31 5 36M20 40 30 47" fill="none" stroke="#fff" stroke-width="1.6" vector-effect="non-scaling-stroke"/></svg>';card.appendChild(c)}
function breakCard(card,foe){if(!card)return;let r=card.getBoundingClientRect(),cx=r.left+r.width/2,cy=r.top+r.height/2,L=fxLayer();card.style.visibility='hidden';
 let g=document.createElement('i');g.className='breaklight';g.style.left=cx+'px';g.style.top=cy+'px';L.appendChild(g);setTimeout(()=>g.remove(),700);
 for(let i=0;i<9;i++){let s=document.createElement('i');s.className='shard'+(foe?' foe':'');let a=i/9*Math.PI*2+Math.random()*.5,d=46+Math.random()*60;
  s.style.cssText='left:'+cx+'px;top:'+cy+'px;width:'+r.width*.48+'px;height:'+r.height*.42+'px;--tx:'+Math.cos(a)*d+'px;--ty:'+Math.sin(a)*d+'px;--rot:'+(Math.random()*300-150)+'deg;clip-path:polygon('+[0,1,2].map(()=>Math.round(Math.random()*100)+'% '+Math.round(Math.random()*100)+'%').join(',')+')';L.appendChild(s);setTimeout(()=>s.remove(),900)}
 for(let i=0;i<16;i++){let s=document.createElement('i');s.className='spark';let a=Math.random()*Math.PI*2,d=30+Math.random()*80;s.style.cssText='left:'+cx+'px;top:'+cy+'px;--tx:'+Math.cos(a)*d+'px;--ty:'+Math.sin(a)*d+'px';L.appendChild(s);setTimeout(()=>s.remove(),800)}}
async function strike(f,u,d,v){let node=document.getElementById('u'+u.uid),tgt=document.getElementById(v?'u'+v.uid:'shrine'+d.id),was={u:u.hp,v:v?.hp,sh:d.shrines.length};
 resolveStrike(f,u,d,v);
 if(!node||!tgt||calm()){subLog=[];render();await shrineReveal(f,u,d);await shrineReveal(d,u,f);return}
 let say=document.querySelector('.duel .say');if(say)say.textContent=latest;
 let lost=v?0:was.sh-d.shrines.length,cards=[...tgt.querySelectorAll('.back')],hitCards=v?[]:cards.slice(cards.length-lost),aimEl=v?tgt:(hitCards[hitCards.length-1]||tgt.querySelector('.keep')||tgt);
 let a=feet(node),b=v?feet(tgt):body(aimEl),line=aim(a,b,f===p,elemColor(u),node);tgt.classList.add('aimed');node.classList.add('attacking');await pause(380);
 let from=body(node,.5),to=v?body(tgt,.5):b,k=v?.62:.5,dx=(to.x-from.x)*k,dy=(to.y-from.y)*k,back='translate('+(-dx*.14)+'px,'+(-dy*.14)+'px) scale(.95)',hit='translate('+dx+'px,'+dy+'px) scale(1.08)';
 // 少し引く
 await node.animate([{transform:'none'},{transform:back}],{duration:170,easing:'cubic-bezier(.2,.7,.3,1)',fill:'forwards'}).finished;
 sfx('attack');
 // 加速して突っ込む
 await node.animate([{transform:back},{transform:hit}],{duration:150,easing:'cubic-bezier(.7,0,1,.55)',fill:'forwards'}).finished;line.remove();impactFx(b,elemColor(u));
 if(v){let dmg=f.hitInfo?f.hitInfo.v:was.v-v.hp;sfx('hit');burst(fxKind[u.id]||'bolt',to.x,to.y);await hitstop(80);
  shake(dmg);struck(tgt);pop(dmg?'−'+dmg:'影分身',to.x,body(tgt,.2).y,dmg,dmg?'':'guard');drain(tgt,v);
  if(f.overflowHit){let oe=document.getElementById('u'+f.overflowHit.uid),og=d.units.concat([]).find(z=>z.uid===f.overflowHit.uid)||{hp:0,max:1,id:d.id,atk:0};if(oe){let orr=body(oe,.45);await pause(120);burst('bolt',orr.x,orr.y);struck(oe);pop('−'+f.overflowHit.n,orr.x,body(oe,.2).y,f.overflowHit.n);drain(oe,heroOf(d)||og);if(!heroOf(d))oe.classList.add('ko')}}
  await pause(280);let cd0=f.hitInfo?f.hitInfo.u:was.u-u.hp;if(cd0>0){let cd=cd0,me=body(node,.5);sfx('hit');burst(fxKind[v.id]||'rock',me.x+dx,me.y+dy);shake(cd*.6);struck(node);pop('−'+cd,me.x+dx,body(node,.2).y+dy,cd*.8,'counter');drain(node,u)}}
 else if(lost>0){sfx('hit');hitCards.forEach(crack);burst(fxKind[u.id]||'bolt',b.x,b.y);await hitstop(90);shake(2+lost);
  await pause(230);sfx('shrine');hitCards.forEach(c=>breakCard(c,d===c_()));let cn=tgt.querySelector('.cnt b');if(cn)cn.textContent=d.shrines.length;pop('神殿 −'+lost,b.x,b.y+(d===p?-58:58),0,'shrine')}
 else if(ending){sfx('hit');burst(fxKind[u.id]||'bolt',b.x,b.y);await hitstop(100);shake(6);pop('決着！',b.x,b.y,4,'shrine')}
 else{sfx('hit');burst('guard',b.x,b.y);await hitstop(70);shake(1);pop('守護',b.x,b.y-6,2,'guard')}
 await pause(170);if(subLog.length){node.animate([{transform:hit},{transform:'none'}],{duration:260,fill:'forwards'});await subFx()}
 await node.animate([{transform:hit},{transform:'none'}],{duration:260,easing:'cubic-bezier(.2,.8,.3,1)',fill:'forwards'}).finished;
 let fallen=[v&&v.hp<=0&&tgt,u.hp<=0&&node].filter(Boolean);fallen.forEach(el=>el.classList.add('ko'));
 // 残った神殿カードの位置を覚えておき、描き直し後に詰めて並び直す
 let keep=lost>0?cards.slice(0,cards.length-lost).map(c=>c.getBoundingClientRect().left):null;
 await pause(fallen.length?520:200);render();
 if(keep){let now=[...document.querySelectorAll('#shrine'+d.id+' .back')];now.forEach((c,i)=>{if(keep[i]==null)return;let dx2=keep[i]-c.getBoundingClientRect().left;if(Math.abs(dx2)>.5)c.animate([{transform:'translateX('+dx2+'px)'},{transform:'none'}],{duration:340,easing:'cubic-bezier(.2,.8,.3,1)'})})}
 f.hitInfo=null;await shrineReveal(f,u,d);await shrineReveal(d,u,f)}
const c_=()=>c;
async function target(uid){let v0=c.units.find(x=>x.uid===uid);if(skillMode&&skillMode.side==='foe'&&v0&&turn===p&&!busy){if(skillMode.spell)await castSpell(p,skillMode.i,v0);else await useSkill(p,v0);return}if(attacker<0&&v0){inspect(c,v0);return}let u=selectedGod(attacker),v=c.units.find(x=>x.uid===uid);if(!u||u.used||sickOf(p,u)||turn!==p||busy||ending||(uid&&!v))return;if(!v&&!c.shrines.length){latest='相手の神殿はもうありません。相手の主神を攻撃しましょう（最終決戦）';render();return}if(v&&v.hero&&heroLocked(p,u,c)){latest='神殿が残っている間は、主神を攻撃できません';render();return}if((!v||v.hero)&&!firstHit(u)){latest='2回目の攻撃は、相手の仲間にしかできません';render();return}if(v&&v.dodge&&!u.hero){latest=names[v.id]+'は仲間の攻撃の対象にならない（空蝉の歩法）';render();return}busy=true;await strike(p,u,c,v);busy=false;if(!canAttackAny())attackMode=false;render()}
async function enemyTurn(){if(turn!==p||busy||ending)return;busy=true;begin(c);latest='相手の番';render();await pause(350);
 if(c.hand.length>1&&c.max<5){let i=c.hand.findIndex((x,i)=>c.hand.indexOf(x)<i);await chargeUI(c,i>=0?i:c.hand.length-1)}
 if(canAwaken(c)||canEvolve(c)){await ascendUI(c);await pause(250)}
 if(canSkill(c)){let k=skillOf(c),t=null;if(k.kind==='bolt')t=[...p.units].sort((a,b)=>(a.hp<=k.n?-100:0)+a.hp-((b.hp<=k.n?-100:0)+b.hp))[0];
  else if(k.kind==='heal')t=[...c.units].filter(u=>u.hp<u.max).sort((a,b)=>(a.hp-a.max)-(b.hp-b.max))[0];else t=[...p.units].sort((a,b)=>b.atk-a.atk)[0];
  if(t){await useSkill(c,t);await pause(200)}}
 if(ending){busy=false;render();return}
 for(let j=0;j<6;j++){
 let sums=c.hand.filter(k=>isSum(k));
 let choices=[...(sums.length&&c.mp===1&&c.mp<c.max?['seed']:[]),...sums, ...(c.id===2?[weather==='雨'?'bolt':'rain']:['seed']),'guard','draw'];let k=choices.find(k=>c.hand.includes(k)&&legal(c,k)&&(k!=='seed'||c.mp<c.max)&&(k!=='guard'||c.units.some(u=>!u.ward)));if(!k)break;
 let t=null;if(k==='bolt')t=[...p.units].sort((a,b)=>(a.hp<=2?-100:0)+a.hp-((b.hp<=2?-100:0)+b.hp))[0];if(k==='guard')t=[...c.units].filter(u=>!u.ward).sort((a,b)=>(b.hero?1:0)-(a.hero?1:0))[0];
 if(t)await castSpell(c,c.hand.indexOf(k),t);else play(c,c.hand.indexOf(k));render();if(ending)break;await pause(240)}
 for(let u of [...c.units]){for(let n=0;n<3&&!ending&&!u.used&&u.hp>0&&c.units.includes(u);n++){let victims=p.units.filter(v=>v.hp<=atkOf(u)&&!v.shadow&&!v.ward);let v=p.shrines.length&&victims.length?victims[0]:null;await strike(c,u,p,v)}}
 if(!ending){round++;begin(p)}busy=false;render()}
// 足元の印：攻撃できる＝点線の輪、選択中＝金の輪、攻撃先＝四隅の枠、行動済み＝薄く
const marks={ready:'<svg viewBox="0 0 100 24"><ellipse cx="50" cy="12" rx="46" ry="9" fill="#ffe7a61a" stroke="#ffe7a6" stroke-width="2.6" stroke-dasharray="6 4"/></svg>',
 picked:'<svg viewBox="0 0 100 24"><ellipse cx="50" cy="12" rx="47" ry="10" fill="#ffd76a33" stroke="#ffd76a" stroke-width="3.5"/><ellipse cx="50" cy="12" rx="36" ry="6.5" fill="none" stroke="#fff4c8" stroke-width="1.5"/></svg>',
 target:'<svg viewBox="0 0 100 100" preserveAspectRatio="none"><path d="M2 22V2h22M76 2h22v20M98 78v20H76M24 98H2V78" fill="none" stroke="#ffb08a" stroke-width="4" vector-effect="non-scaling-stroke" stroke-linecap="round" stroke-linejoin="round"/></svg>'};
function soldiers(f){return f.units.map(u=>{let ally=f===p,mine=turn===p&&!ending,hero=!!u.hero&&!!GOD_CARDS[u.id],awake=hero&&f.evolved,sk=skillMode&&mine&&!busy,
 st=sk?((skillMode.side==='ally')===ally?'target':''):ally?(attacker===u.uid?'picked':mine&&!u.used&&!busy&&sickOf(f,u)?'sick':mine&&!u.used&&!busy?(attackMode?'ready glow':'ready'):mine&&u.used?'used':''):(attacker>=0&&(!u.hero||(!heroLocked(p,selectedGod(attacker),c)&&firstHit(selectedGod(attacker))))?'target':attacker>=0?'walled':''),w=Math.max(0,u.hp)/u.max*100+'%',fresh=awake&&!f.awakeShown;if(fresh){f.awakeShown=true;setTimeout(()=>sfx('awaken'),0)}
 let face=hero?gcard(u.id,f.stage,{atk:atkOf(u),hp:u.hp,max:u.max,weak:u.weak},'',true).replace(/<\/span>$/,costBadge({cost:1})+'</span>')
  :ucard(u.id,{live:{atk:atkOf(u),hp:u.hp,max:u.max,weak:u.weak}});
 let tagline=hero?'<span class="gtag'+(f.gaugeFlash&&Date.now()-f.gaugeFlash<1600?' flash':'')+'">'+(f.stage===0?'進化 '+Array.from({length:ASCEND.evolve.gauge},(_,i)=>'<i class="'+(i<f.gauge?'on':'')+(f.gaugeFlash&&Date.now()-f.gaugeFlash<1600&&i===f.gauge-1?' new':'')+'"></i>').join(''):f.stage===1?'覚醒 <i class="'+(f.shrineBroken?'on':'')+'"></i>'+(f.shrineBroken?'可':'神殿待ち'):'最終')+'</span>':'';
 return '<button id="u'+u.uid+'" aria-label="'+(hero?stageOf(u.id,f.stage).name:titles[u.id]+' '+names[u.id])+' 攻撃'+atkOf(u)+' 体力'+u.hp+(st==='picked'?' 選択中':st==='target'?' 対象にする':st==='used'?' 行動済み':'')+'" class="unit '+st+' herocard'+(arrived===u.uid?' summon':'')+(awake?' awake':'')+(fresh?' awaking':'')+(hero&&f.burst?' charged':'')+(u.ward?' warded':'')+'" onclick="'+(ally?'pick':'target')+'('+u.uid+')"><span class="mark m-'+st+'">'+(st==='target'?marks.target:'')+'</span>'+face+(u.ward?'<em class="ribbon ward">招雷</em>':'')+(ally&&mine&&sickOf(f,u)&&!u.used?'<em class="sickmark">召喚酔い</em>':'')+(u.hero?'<span class="lives'+(f.shrines.length?'':' none')+'" title="命＝神殿の残り" aria-label="命（神殿）残り'+f.shrines.length+'">'+(f.shrines.length?Array.from({length:f.shrines.length},()=>'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M2 5c6 1.5 14 1.5 20 0v2.6c-1 .3-2 .5-3 .6V10h-2V8.4c-1.3.1-2.7.2-4 .2s-2.7-.1-4-.2V10H7V8.2c-1-.1-2-.3-3-.6zM4 10h16v2h-2.5v9h-2.2v-9H8.7v9H6.5v-9H4z" fill="currentColor"/></svg>').join(''):'命なし')+'</span>':'')+tagline+(fresh?'<i class="lightburst"></i>':'')+'</button>'}).join('')}
function costOf(k){return isSum(k)?1:(moves[k]?moves[k][1]:1)}
function heroActs(){if(turn!==p||busy||ending||!heroOf(p))return '';let o='',k=skillOf(p);
 if(k)o+=btn(p.skillUsed?k.name+'（使用済み）':k.name+' · 神力'+k.cost,'skillMode=skillOf(p);attacker=-1;render()',!canSkill(p));
 if(p.stage===0)o+=btn('進化 · 神力'+ASCEND.evolve.cost+'（ゲージ'+p.gauge+'/'+ASCEND.evolve.gauge+'）','ascendUI(p)',!canEvolve(p),canEvolve(p)?'gold':'');
 else if(p.stage===1)o+=btn('覚醒 · 神力'+ASCEND.awaken.cost+(p.shrineBroken?'':'（神殿が割れたら）'),'ascendUI(p)',!canAwaken(p),canAwaken(p)?'gold':'');
 return o}
function inspect(f,u){unitZoom(f,u)}
function shrine(f){let n=f.shrines.length,foe=f===c,aim=foe&&attacker>=0&&f.shrines.length>0&&firstHit(selectedGod(attacker));return '<button class="shrine'+(aim?' target':'')+'" id="shrine'+f.id+'" aria-label="'+(foe?'相手':'自分')+'の神殿 残り'+n+(aim?' 攻撃する':'')+'" '+(foe?'onclick="target(0)"':'')+'><span class="pile">'+(n?Array.from({length:n},(_,i)=>'<i class="back" style="--i:'+i+'"></i>').join(''):'<i class="keep">主神むき出し</i>')+'</span><span class="cnt"><small>神殿</small><b>'+n+'</b></span></button>'}
function backs(n){return '<span class="ohand" style="--n:'+Math.min(n,7)+'">'+Array.from({length:Math.min(n,7)},(_,i)=>'<i style="--i:'+i+'"></i>').join('')+'</span>'}
// 神力ゾーン：最初の1は神殿の灯（丸）、神力に置いたカードは裏向きのミニカード。使った分は暗くなる
let landing=null;
function mana(f){let n=f.max-1,side=f===p?'mine':'foe',slots='<i class="slot base'+(f.mp>0?'':' off')+'" title="はじめの神力"></i>';
 for(let j=1;j<=n;j++)slots+='<i class="slot card'+(j<f.mp?'':' off')+(landing===side&&j===n?' incoming':'')+'"></i>';
 return '<span class="manazone '+side+'" aria-label="神力 '+f.mp+'/'+f.max+'、神力に置いたカード'+n+'枚"><span class="slots'+(n>6?' tight':'')+'">'+slots+'</span><span class="mnum"><small>神力</small><b>'+f.mp+'</b><i>/'+f.max+'</i></span></span>'}
// 神力に置く：カードが手札から神力ゾーンへ飛び、着地で光って裏向きのミニカードになる
async function chargeUI(f,i){if(f.charged||i<0||i>=f.hand.length)return;
 let mine=f===p,src=mine?document.querySelector('.handrail .spell:nth-child('+(i+1)+')'):document.querySelector('.opp .ohand'),r=src&&src.getBoundingClientRect(),k=f.hand[i];
 charge(f,i);if(!f.charged)return;
 let side=mine?'mine':'foe';landing=r&&!calm()?side:null;render();if(!landing)return;
 let slot=document.querySelector('.manazone.'+side+' .slot.card:last-child');if(!slot){landing=null;render();return}
 let t=slot.getBoundingClientRect(),fly=document.createElement('div');fly.className='flycard'+(mine?'':' back');
 fly.innerHTML=mine?'<img src="'+art(k)+'" alt="">':'';fly.style.cssText='left:'+r.left+'px;top:'+r.top+'px;width:'+(mine?r.width:Math.min(r.width,26))+'px;height:'+(mine?r.height:36)+'px';
 fxLayer().appendChild(fly);let fr=fly.getBoundingClientRect(),dx=t.left+t.width/2-(fr.left+fr.width/2),dy=t.top+t.height/2-(fr.top+fr.height/2),sc=t.width/fr.width;
 await fly.animate([{transform:'none'},{transform:'translate('+dx*.5+'px,'+(dy*.5-40)+'px) scale('+((1+sc)/2)+') rotate(-8deg)',offset:.5},{transform:'translate('+dx+'px,'+dy+'px) scale('+sc+') rotateY(90deg)'}],{duration:520,easing:'cubic-bezier(.4,0,.6,1)',fill:'forwards'}).finished;
 fly.remove();landing=null;let live=document.querySelector('.manazone.'+side+' .slot.card:last-child');if(live){live.classList.remove('incoming');live.classList.add('land');burstMana(live)}
 await pause(260)}
function burstMana(el){let r=el.getBoundingClientRect(),g=document.createElement('i');g.className='managlow';g.style.left=r.left+r.width/2+'px';g.style.top=r.top+r.height/2+'px';fxLayer().appendChild(g);setTimeout(()=>g.remove(),600)}
function art(k){return isSum(k)?portraits[+k.slice(1)]:['sun','seed'].includes(k)?portraits[k==='sun'?8:5]:'art/'+k+'.webp'}
function render(){if(ending){resultScreen();return}
 let k=p.hand[sel],free=turn===p&&!busy,selected=selectedGod(attacker);
 let mineTurn=turn===p&&!ending,wait=turn===c||busy,dock;
 if(skillMode&&free)dock='<div class="detail"><p><b>'+skillMode.name+'</b>　<span>神力'+skillMode.cost+'</span></p><p class="long">'+(skillMode.prompt?skillMode.prompt:skillMode.spell==='guard'?'守る味方の神カードをタップ':skillMode.side==='ally'?'回復する味方の神カードをタップ':'対象の相手の神カードをタップ')+'</p><div class="acts">'+btn('やめる','skillMode=null;render()')+'</div></div>';
 else if(selected){let hs=selected.hero&&GOD_CARDS[selected.id],nm=hs?stageOf(selected.id,p.stage).name:titles[selected.id]+' '+names[selected.id],ma=maxAttacks(p,selected);
  dock='<div class="detail"><p><b>'+nm+'</b>　<span>⚔'+atkOf(selected)+' ♥'+selected.hp+(ma>1?'　攻撃 '+(selected.att||0)+'/'+ma:'')+'</span></p><p class="long">攻撃先をタップ：上の相手の神カード、または相手の神殿。'+(hs?'<br><em>'+stageText(selected.id,p.stage)+'</em>':'')+'</p><div class="acts">'+btn('やめる','attacker=-1;render()')+(hs?btn('くわしく','inspect(p,selectedGod('+selected.uid+'))'):'')+heroActs()+'</div></div>'}
 else dock='<div class="detail idle"><p class="long">'+(wait?'相手の番です…':attackMode?'光っている自分の神をタップ → 攻撃先（相手の神か神殿）をタップ':'手札をタップで大きく表示／アタックか自分の神をタップで攻撃／相手の神をタップで詳細')+'</p>'+(free?'<div class="acts">'+heroActs()+'</div>':'')+'</div>';
 app.innerHTML='<div class="arena duel'+(weather==='雨'?' rain':'')+(mineTurn&&!busy?' my-turn':' their-turn')+'">'
 +'<header class="opp"><span class="who">'+titles[c.id]+' '+names[c.id]+'</span>'+backs(c.hand.length)+'<span class="stat"><small>手札</small><b>'+c.hand.length+'</b></span>'+mana(c)+'</header>'
 +'<section class="zone foe'+(c.shrines.length?'':' final')+'"><div class="gods" style="--n:'+Math.max(1,c.units.length)+'">'+soldiers(c)+'</div><div class="shrinerow">'+shrine(c)+'</div></section>'
 +'<div class="mid"><span class="turnchip">'+(turn===p?'あなたの番':'相手の番')+'</span><button class="weather" onclick="weatherInfo()" aria-label="天候の説明">'+(weather==='雨'?'☂ 雨':'☀ 晴れ')+' <i>?</i></button><span class="round">'+round+'ターン目</span><p class="say">'+latest+'</p></div>'
 +'<section class="zone mine'+(p.shrines.length?'':' final')+'" id="dropzone">'+'<button class="atkbtn'+(canAttackAny()?' lit':'')+(attackMode?' on':'')+'" onclick="attackBtn()"'+(canAttackAny()?'':' disabled')+' aria-label="アタック"><svg viewBox="0 0 24 24" aria-hidden="true"><path d="M14.5 3 21 3 21 9.5 11 19.5 8.5 17zM5 15l4 4-2 2-1.5-1.5L4 21l-1-1 1.5-1.5L3 17z" fill="currentColor"/></svg><b>'+(attackMode?'攻撃先を選ぶ':'アタック')+'</b></button>'+'<div class="shrinerow">'+shrine(p)+'</div><div class="gods" style="--n:'+Math.max(1,p.units.length)+'">'+soldiers(p)+'</div></section>'
 +'<footer class="near"><div class="dock">'+mana(p)+dock+'<div class="ends">'+btn('ターン終了','endTurnUI()',!free,'end')+'<button class="surr" onclick="surrenderUI()" aria-label="降参する（バトルをやめる）">降参</button>'+btn(soundCfg().muted?'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM16 9l5 6M21 9l-5 6" fill="none" stroke="currentColor" stroke-width="2"/></svg>':'<svg viewBox="0 0 24 24" aria-hidden="true"><path d="M4 9h4l5-4v14l-5-4H4zM16 8.5a5 5 0 0 1 0 7M18.5 6a8.5 8.5 0 0 1 0 12" fill="none" stroke="currentColor" stroke-width="2"/></svg>','soundOpen=!soundOpen;render()','','helpbtn sndbtn')+btn('？','help=!help;render()','','helpbtn')+'</div></div>'
 +'<div class="handrail">'+p.hand.map((k,i)=>'<button draggable="true" ondragstart="event.dataTransfer.setData(\'text/plain\',\''+i+'\')" class="spell uspell'+(sel===i?' selected':'')+(free&&legal(p,k)?'':' cant')+'" onclick="cardPick('+i+')" aria-label="'+info(k)[0]+'">'+ucard(k,{stage:(isSum(k)&&+k.slice(1)===p.id)?p.stage:undefined,showCost:true,cost:costOf(k),cantPay:p.mp<costOf(k)})+'</button>').join('')+'</div></footer>'
 +(soundOpen?soundPanel():'')+(help?'<div class="notes"><b>遊び方</b><p>手札をタップ →「召喚する／使う」か「神力に置く」。自分の神カード → 上の相手の神カード（または相手の神殿）の順にタップして攻撃。神同士は同時にダメージを与えます。中央の神殿3枚をすべて割ったら最終決戦。相手の主神の体力を0にしたら勝ち。</p><p><b>攻撃できる相手</b>　攻撃できるのは、相手の仲間と、中央にある神殿だけです。神殿をすべて割ると、相手の主神を攻撃できます。主神の体力を0にしたら勝ちです。すり抜けを持つカードは、神殿を無視して主神を攻撃できます。</p><p><b>破殿解放</b>　神殿が割れたとき、そのカードをコストなしで使えます（破殿解放）。使わなければ手札に加わります。</p><p><b>召喚酔い</b>　場に出たターンは攻撃できません（速攻を持つカードは例外です）。主神もおたがい1ターン目は攻撃できません。</p><p><b>主神は倒れない</b>（神殿が残っている間）　倒れるダメージを受けると、代わりに神殿が1枚割れて主神は全回復します。神殿が0枚のときに倒れると負け。</p><p>手札は毎ターン1枚まで神力に置けます。呪文の効果は、手札をタップすると全文と用語の説明が見られます。</p><p>まん中の天候（☀晴れ／☂雨）をタップすると、いまの天候で何が起きるかが分かります。</p><p>くわしいルールはホームの「遊び方」へ。</p>'+btn('閉じる','help=false;render()')+'</div>':'')+'</div>';arrived='';
 let zone=document.getElementById('dropzone');zone.ondragover=e=>e.preventDefault();zone.ondrop=e=>{e.preventDefault();let raw=e.dataTransfer.getData('text/plain'),i=Number(raw);if(raw!==''&&free&&isSum(p.hand[i])){busy=true;doPlay(p,i).then(()=>{busy=false;render()})}}}

// ====================================================================
// 実験版：全カード所持＋色ごとの標準デッキ（主神1体＋20枚・同名2枚まで）
// 呪文はすべてこの表（SP）で動く。tgt: foe=敵1体 / foeMate=敵の仲間 / ally=味方1体 / allyMate=味方の仲間
// ====================================================================
function isSum(k){return typeof k==='string'&&(/^g\d+$/.test(k)||!!(typeof EXP_CARDS!=='undefined'&&EXP_CARDS[k]&&EXP_CARDS[k].kind==='ally'))}
function sumId(k){return /^g\d+$/.test(k)?+k.slice(1):k}
const foeOf=f=>f===p?c:p,mates=f=>f.units.filter(u=>!u.hero&&u.hp>0),weakened=u=>(u.weak||0)>0;
function dmgHero(d,n,why){let h=heroOf(d);if(!h||n<=0)return 0;let x=hurt(h,n);latest+='　'+why+'：'+names[h.id]+'に'+x+'ダメージ';return x}
function drawN(f,n){for(let j=0;j<n&&f.deck.length;j++)f.hand.push(f.deck.pop())}
const SP={
 rain:{can:f=>true,run:f=>sky('雨'),ai:f=>weather!=='雨'&&(f.id===2||f.hand.some(k=>['bolt','sky-4'].includes(k))||f.units.some(u=>u.id==='sky-2'&&!u.trig2))?'none':null},
 sun:{can:f=>true,run:f=>sky('晴れ'),ai:f=>weather==='雨'&&(f.id!==2||f.units.some(u=>u.id==='sky-2'&&!u.trig2))?'none':null},
 seed:{can:f=>true,run:f=>{let b=f.mp;f.mp=Math.min(f.max,f.mp+2);latest+='（神力を'+(f.mp-b)+'回復）'},ai:f=>f.mp<f.max&&f.hand.length>1?'none':null},
 draw:{can:f=>f.deck.length>0,run:f=>drawN(f,2),ai:f=>f.hand.length<5?'none':null},
 bolt:{tgt:'foe',can:f=>weather==='雨',run:(f,t)=>{let n=hurt(t,2);latest+='　'+names[t.id]+'に'+n+'ダメージ'},why:'天候が「雨」のときだけ使える'},
 guard:{tgt:'ally',run:(f,t)=>{t.ward=true;latest+='　'+names[t.id]+'が次に受けるダメージは0'},ok:(f,t)=>!t.ward,ai:f=>{let h=heroOf(f);return h&&!h.ward&&h.hp<=Math.ceil(h.max/2)?h:mates(f).filter(u=>!u.ward).sort((a,b)=>b.atk-a.atk)[0]||null}},
 mirror:{can:f=>f.stage===0&&f.gauge<ASCEND.evolve.gauge,run:f=>{f.gauge=Math.min(ASCEND.evolve.gauge,f.gauge+1);latest+='（進化ゲージ '+f.gauge+'/'+ASCEND.evolve.gauge+'）'},why:'進化前の主神で、ゲージが満タンでないときに使える'},
 scroll:{tgt:'allyMate',run:(f,t)=>{t.atk+=2;t.max+=2;t.hp+=2;latest+='　'+names[t.id]+'の攻撃力と体力+2'}},
 'sky-3':{tgt:'foeMate',run:(f,t)=>{let n=hurt(t,1);sky('雨');latest+='　'+names[t.id]+'に'+n+'ダメージ・雨になった'}},
 'sky-4':{can:f=>weather==='雨'&&f.deck.length>0,run:f=>{sky('晴れ');drawN(f,1)},why:'天候が「雨」のときだけ使える',ai:f=>f.hand.length<6?'none':null},
 'sky-5':{tgt:'foeMate',run:(f,t)=>{let d=foeOf(f),before=Math.max(0,t.hp),n=hurt(t,3);latest+='　'+names[t.id]+'に'+n+'ダメージ';let over=n-before;if(over>0)dmgHero(d,over,'超えた分')}},
 'earth-3':{tgt:'allyMate',run:(f,t)=>{t.setAtk=Math.max(0,t.hp);latest+='　'+names[t.id]+'の攻撃力がこのターン'+t.setAtk},ai:f=>mates(f).filter(u=>!u.used&&u.hp>atkOf(u)).sort((a,b)=>b.hp-a.hp)[0]||null},
 'earth-4':{can:f=>mates(f).some(u=>u.hp>=u.max)&&f.deck.length>0,run:f=>drawN(f,1),why:'体力が満タンの味方の仲間がいるときだけ使える'},
 'earth-5':{can:f=>mates(f).some(u=>u.hp>=5),run:f=>{let L=mates(f).filter(u=>u.hp>=5);L.forEach(u=>u.tmpAtk=(u.tmpAtk||0)+2);latest+='　'+L.length+'体の攻撃力+2'},why:'体力5以上の味方の仲間がいるときだけ使える',ai:f=>mates(f).some(u=>u.hp>=5&&!u.used)?'none':null},
 'fire-3':{tgt:'foe',run:(f,t)=>{let n=hurt(t,t.hitThisTurn?2:1);latest+='　'+names[t.id]+'に'+n+'ダメージ'}},
 'fire-4':{tgt:'allyMate',ok:(f,t)=>(t.att||0)===1,run:(f,t)=>{t.extraAtt=(t.extraAtt||0)+1;t.used=false;latest+='　'+names[t.id]+'はもう1回攻撃できる'},why:'このターンにちょうど1回攻撃した味方の仲間がいるときだけ使える',post:true},
 'fire-5':{can:f=>(f.atkCount||0)>=2,run:f=>{dmgHero(foeOf(f),3,'落日の火葬鐘')},why:'このターンに味方が合計2回以上攻撃していれば使える',post:true},
 'water-3':{tgt:'allyMate',ok:(f,t)=>t.bornTurn===f.turns&&!hasteOf(f,t),run:(f,t)=>{t.haste=true;latest+='　'+names[t.id]+'はこのターンから攻撃できる'},why:'このターンに出した味方の仲間がいるときだけ使える'},
 'water-4':{tgt:'allyMate',run:(f,t)=>{t.pierce=true;latest+='　'+names[t.id]+'はこのターン、神殿を無視して主神を攻撃できる'},ai:f=>foeOf(f).shrines.length?mates(f).filter(u=>!u.used&&!sickOf(f,u)&&!t_pierce(f,u)).sort((a,b)=>atkOf(b)-atkOf(a))[0]||null:null},
 'water-5':{can:f=>!!f.heroHit&&f.deck.length>0,run:f=>drawN(f,1),why:'このターンに味方の仲間が敵の主神を攻撃していれば使える',post:true},
 'sky-8':{run:(f)=>{dmgHero(foeOf(f),1,'稲光')},ai:f=>'none'},
 'earth-8':{tgt:'ally',ok:(f,t)=>t.hp<t.max,run:(f,t)=>{let b=t.hp;t.hp=Math.min(t.max,t.hp+2);latest+='　'+names[t.id]+'を'+(t.hp-b)+'回復';healed(f)},why:'体力が減っている味方がいるときだけ使える',ai:f=>[...f.units].filter(u=>u.hp>0&&u.hp<u.max).sort((a,b)=>(b.max-b.hp)-(a.max-a.hp))[0]||null},
 'fire-8':{tgt:'allyMate',run:(f,t)=>{t.tmpAtk=(t.tmpAtk||0)+2;latest+='　'+names[t.id]+'の攻撃力+2（このターン）'},ai:f=>mates(f).filter(u=>!u.used&&!sickOf(f,u)).sort((a,b)=>atkOf(b)-atkOf(a))[0]||null},
 'water-8':{tgt:'foeMate',run:(f,t)=>{bounce(foeOf(f),t)},ai:f=>mates(foeOf(f)).sort((a,b)=>atkOf(b)-atkOf(a))[0]||null},
 'mystic-8':{can:f=>true,run:(f)=>{let d=foeOf(f);if(f===p&&!window.__autoP)showFoeHand(d.hand.slice());drawN(f,1);latest+='　相手の手札を見て、1枚引いた'},ai:f=>f.deck.length?'none':null},
 'mystic-3':{tgt:'foe',ok:(f,t)=>weakened(t),run:(f,t)=>{let n=hurt(t,2);latest+='　'+names[t.id]+'に'+n+'ダメージ'},why:'攻撃力が下がっている敵がいるときだけ使える'},
 'mystic-4':{tgt:'allyMate',run:(f,t)=>{t.dodge=true;latest+='　'+names[t.id]+'は次の相手ターン終了まで敵の仲間に狙われない'},ai:f=>mates(f).filter(u=>!u.dodge).sort((a,b)=>a.hp-b.hp)[0]||null},
 'mystic-5':{tgt:'foe',ok:(f,t)=>weakened(t),run:(f,t)=>{let n=hurt(t,Math.min(3,t.weak||0));latest+='　'+names[t.id]+'に'+n+'ダメージ'},why:'攻撃力が下がっている敵がいるときだけ使える'}
};
function spTargets(f,k){let s=SP[k],d=foeOf(f),L=s.tgt==='foe'?d.units:s.tgt==='foeMate'?mates(d):s.tgt==='ally'?f.units:s.tgt==='allyMate'?mates(f):[];L=L.filter(u=>u.hp>0);return s.ok?L.filter(u=>s.ok(f,u)):L}
function costOf(k){if(typeof EXP_CARDS!=='undefined'&&EXP_CARDS[k])return EXP_CARDS[k].cost;return /^g\d+$/.test(k)?1:(moves[k]?moves[k][1]:1)}
function cardLabel(k){return isSum(k)?(titles[sumId(k)]?titles[sumId(k)]+' ':'')+names[sumId(k)]:spellName(k)}
function info(k){if(isSum(k)){let id=sumId(k);return [cardLabel(k),'召喚 · 攻'+gods[id][0]+' / HP'+gods[id][1]]}return [spellName(k),cardShort(k)]}
function art(k){if(typeof EXP_CARDS!=='undefined'&&EXP_CARDS[k])return 'cards/expansion/'+k+'.webp';return /^g\d+$/.test(k)?portraits[+k.slice(1)]:['sun','seed'].includes(k)?portraits[k==='sun'?8:5]:SPELL_ART[k]||'art/'+k+'.webp'}
function legal(f,k){if(!k||f.mp<costOf(k))return false;if(isSum(k))return f.units.length<3;let s=SP[k];if(!s)return false;if(s.can&&!s.can(f))return false;if(s.tgt&&!spTargets(f,k).length)return false;return true}
function whyNot(f,k){if(legal(f,k))return '';let need=costOf(k)-f.mp;if(need>0)return '神力があと'+need+'足りない';if(isSum(k))return '場がいっぱい（3体まで）';let s=SP[k]||{};if(s.can&&!s.can(f))return s.why||'今は使えない';if(s.tgt)return s.why||'使える対象がいない';return '今は使えない'}
// 登場時の効果
function onEnter(f,u){let d=foeOf(f);
 if(u.id==='sky-1'){if(f===p&&!window.__autoP)pendingAsk=new Promise(r=>setTimeout(()=>askWeather(r),0));else{let want=f.id===2||f.hand.includes('bolt')||f.units.some(x=>x.id==='sky-2'&&!x.trig2)?(weather==='雨'?'晴れ':'雨'):null;if(want){sky(want);latest+='　天候を'+want+'にした'}}}
 if(u.id===11){let n=f.hand.length;drawN(f,1);if(f.hand.length>n)latest+='　星神スバル：山札から1枚引いた'}
 if(u.id==='earth-7'){let h=heroOf(f);if(h&&h.hp>0&&h.hp<h.max){h.hp=Math.min(h.max,h.hp+1);latest+='　苗神：'+names[h.id]+'を1回復';healed(f)}}
 if(u.id==='mystic-7'){let L=mates(d);if(!L.length)latest+='　写し神：敵の仲間がいないので攻撃力0のまま';else if(f===p&&!window.__autoP)pendingAsk=new Promise(r=>setTimeout(()=>askCopy(u,r),0));else{let t=[...L].sort((a,b)=>atkOf(b)-atkOf(a))[0];copyAtk(u,t)}}
 if(u.id==='mystic-6'){let n=0;for(const t of d.units)if(t.hp>0){t.weak=Math.max(t.weak||0,1);t.weakBy=null;n++}if(n)latest+='　薄暮の呪い手：敵全員の攻撃力−1（場を離れるまで）'}
 if(u.id==='mystic-1'){let t=[...d.units].filter(x=>x.hp>0).sort((a,b)=>(weakened(a)?1:0)-(weakened(b)?1:0)||atkOf(b)-atkOf(a))[0];if(t){t.weak=Math.max(t.weak||0,1);t.weakBy=null;latest+='　'+names[t.id]+'の攻撃力−1（場を離れるまで）'}}}
function askWeather(res){let done=()=>{pendingAsk=null;if(res)res()};if(ending){done();return}let o=document.createElement('div');o.className='handzoom confirm ask';o.setAttribute('role','dialog');
 o.innerHTML='<div class="hz-in"><div class="hz-text"><h3>雲紡ぎのアヤ（登場時）</h3><p class="hz-eff">天候を変えますか？　いまは「'+weather+'」</p></div><div class="hz-acts two"><button class="hz-btn gold" data-w="晴れ">☀ 晴れにする</button><button class="hz-btn gold" data-w="雨">☂ 雨にする</button><button class="hz-btn ghost" data-w="">変えない</button></div></div>';
 o.onclick=e=>{let b=e.target.closest('button');if(!b)return;o.remove();if(b.dataset.w){let before=snap();try{sky(b.dataset.w)}catch(er){console.error(er)}latest='天候を'+b.dataset.w+'にした'+latest.replace(/^[^　]*/,'');diffFx(before).catch(()=>{}).then(()=>{render();done();if(turn===p&&!busy)shrineReveal(p,null,c)})}else{render();done()}};document.body.appendChild(o)}
function play(f,i,t){let k=f.hand[i];if(!legal(f,k))return false;let s=SP[k];if(s&&s.tgt&&(!t||!spTargets(f,k).includes(t)))return false;
 f.mp-=costOf(k);f.hand.splice(i,1);sel=-1;latest=names[f.id]+'：'+cardLabel(k);
 if(isSum(k)){let u=mk(f,sumId(k));u.summonedTurn=round;u.bornTurn=f.turns;u.side=f.id;f.units.push(u);arrived=u.uid;sfx('summon');latest=cardLabel(k)+'を召喚！';onEnter(f,u)}
 else{s.run(f,t);f.spells=(f.spells||0)+1}
 settle(foeOf(f),f);return true}
// 演出：効果の前後で体力を比べ、減った・増えた分を出す
function snap(){let m={};for(const f of [p,c])for(const u of f.units)m[u.uid]=u.hp;return m}
async function diffFx(before){if(calm()){subLog=[];return}for(const f of [p,c])for(const u of f.units){let b=before[u.uid];if(b==null||b===u.hp)continue;let el=document.getElementById('u'+u.uid);if(!el)continue;let r=body(el,.45),n=u.hp-b;if(subLog.some(e=>e.uid===u.uid))continue;
  if(n<0){sfx('hit');burst('bolt',r.x,r.y);struck(el);pop('−'+(-n),r.x,body(el,.2).y,-n)}else pop('+'+n,r.x,body(el,.2).y,1,'heal');drain(el,u)}
 for(const id in before){if(![...p.units,...c.units].some(u=>u.uid==+id)){let el=document.getElementById('u'+id);if(el){let r=body(el,.45);burst('bolt',r.x,r.y);pop('退場',r.x,body(el,.2).y,1);el.classList.add('ko')}}}
 await pause(420);await subFx()}
function startSpell(i){let k=p.hand[i];if(!legal(p,k))return;let s=SP[k];if(!s||!s.tgt){doPlay(p,i);return}
 skillMode={spell:k,i,name:spellName(k),cost:costOf(k),side:s.tgt.startsWith('foe')?'foe':'ally',prompt:{foe:'対象の敵をタップ',foeMate:'対象の敵の仲間をタップ',ally:'対象の味方をタップ',allyMate:'対象の味方の仲間をタップ'}[s.tgt]};attacker=-1;sel=-1;render()}
async function doPlay(f,i,t){let before=snap();if(!play(f,i,t)){if(f===p){latest='その対象には使えません';render()}return false}render();await diffFx(before);render();await shrineReveal(f,null,foeOf(f));await shrineReveal(foeOf(f),null,f);return true}
async function castSpell(f,i,t){let k=f.hand[i];if(SP[k]&&SP[k].tgt&&!spTargets(f,k).includes(t)){if(f===p){latest='その対象には使えません（'+(SP[k].why||'条件を満たしていない')+'）';render()}return}skillMode=null;let wb=busy;busy=true;await doPlay(f,i,t);busy=wb;render()}
// ---- 標準デッキ：その色の仲間 → その色の呪文 → 色なし → 足りなければ他の色の仲間（低コスト順）。同名2枚まで、20枚 ----
function battleReady(k){if(isSum('g'+k)||typeof k==='number')return !!gods[k]&&!GOD_CARDS[k];if(isSum(k))return true;return !!SP[k]&&!SP[k].noDeck}
function handKey(k){return typeof k==='number'?'g'+k:k}
function standardDeck(id){let col=GOD_CARDS[id].type,pool=[...SET_ALL.allies,...SET_ALL.spells].filter(battleReady).filter(k=>!R_ALLIES_AM.includes(k)&&!N_ADD_AN.includes(k)&&!LATE_BASE.includes(handKey(k))),own=k=>save.cards.filter(x=>x[0]===k).length;
 pool=pool.filter(k=>own(k)>0);let ally=k=>typeof k==='number'||isSum(k);
 let order=[...pool.filter(k=>colorOf(k)===col&&ally(k)),...pool.filter(k=>colorOf(k)===col&&!ally(k)),...pool.filter(k=>!colorOf(k)),...pool.filter(k=>colorOf(k)&&colorOf(k)!==col&&ally(k)).sort((a,b)=>costOf(handKey(a))-costOf(handKey(b)))];
 let deck=[];for(const k of order){for(let n=0;n<Math.min(2,own(k))&&deck.length<20;n++)deck.push(handKey(k));if(deck.length>=20)break}return deck}
function fighter(id){let mine=!!window.__myDeckNext&&typeof deckValid==='function'&&deckValid(save.deck)&&save.deck.hero===id;window.__myDeckNext=false;let list=mine?myDeckList():standardDeck(id),deck=shuffle([...list]);
 let f={id,deckList:list,deck,hand:[],shrines:deck.splice(0,SHRINES),turns:0,max:1,mp:1,charged:false,seed:0,ready:false,evolved:false,burst:false,stage:0,gauge:0,shrineBroken:false,skillUsed:false,units:[]};
 f.hand=deck.splice(-4);let h=mk(f,id);h.bornTurn=1;f.units=[h];return f}
// ターンの始めにリセットする一時的な状態
function resetTurn(f){for(const s of [p,c])for(const u of s.units){u.hitThisTurn=false;u.tmpAtk=0;u.setAtk=null;u.extraAtt=0;u.pierce=false}
 f.atkCount=0;f.heroHit=false;f.spells=0;f.units.forEach(u=>{u.trig2=false;u.trig3=false;u.dodge=false})}
function healed(f){if(turn!==f)return;for(const u of f.units)if(u.id==='earth-2'&&!u.trig3&&u.hp>0){u.trig3=true;u.tmpAtk=(u.tmpAtk||0)+2;latest+='　古根の角王の攻撃力+2（このターン）'}}
function sky(value){let changed=value!==weather;weather=value;if(!changed||!turn||ending)return;let f=turn,d=foeOf(f);
 for(const s2 of [f,d])for(const u of s2.units)if(u.id==='sky-7'&&u.hp>0&&u.hp<u.max){u.hp=Math.min(u.max,u.hp+1);latest+='　霙神が1回復';healed(s2)}
 for(const u of f.units)if(u.id==='sky-2'&&!u.trig2&&u.hp>0){u.trig2=true;let t=[...d.units].filter(x=>x.hp>0&&!x.ward).sort((a,b)=>(a.hero?1:0)-(b.hero?1:0)||(a.hp<=2?-1:0)-(b.hp<=2?-1:0)||a.hp-b.hp)[0]||d.units[0];if(t){let n=hurt(t,2);latest+='　霹靂を喰う天狗が'+names[t.id]+'に'+n+'ダメージ'}}
 for(const u of f.units)if(u.id==='sky-6'&&u.hp>0)dmgHero(d,1,'嵐呼の雷獣');settle(d,f)}
// 攻撃のあとに起きる効果（resolveStrike の最後で呼ぶ）
function afterStrike(f,u,d,v,wasWeak){f.atkCount=(f.atkCount||0)+1;if(v&&v.hero&&!u.hero)f.heroHit=true;
 if(u.id==='mystic-2'&&v&&wasWeak>0)dmgHero(d,wasWeak,'逆夢の獏神');
 if(u.att===2)for(const x of f.units)if(x.id==='fire-2'&&x.hp>0)dmgHero(d,1,'双炉の鍛冶神');
 if(u.id==='fire-1'&&u.hp>0){hurt(u,1);latest+='　火走りのイタチ神は自分に1ダメージ'}
 settle(d,f)}
// ---- 相手（AI）：出せる仲間 → 役に立つ呪文の順。攻撃のあとにもう一度（二の太刀・火葬鐘・航跡を読む用）----
function aiTarget(f,k){let s=SP[k];if(s.ai)return s.ai(f);if(!s.tgt)return 'none';let L=spTargets(f,k);if(!L.length)return null;
 if(s.tgt==='foe'||s.tgt==='foeMate'){let n=k==='sky-5'?3:k==='fire-3'?2:k==='mystic-5'?3:2;return L.sort((a,b)=>((a.hp<=n&&!a.hero)?-100:0)+a.hp-(((b.hp<=n&&!b.hero)?-100:0)+b.hp))[0]}
 return L.sort((a,b)=>b.atk-a.atk)[0]}
async function aiPlay(f,post){for(let j=0;j<8&&!ending;j++){let best=null;
  let sums=f.hand.map((k,i)=>[k,i]).filter(([k])=>isSum(k)&&legal(f,k)).sort((a,b)=>costOf(b[0])-costOf(a[0]));
  if(!post&&sums.length)best=[sums[0][1],null];
  if(!best)for(let i=0;i<f.hand.length;i++){let k=f.hand[i];if(isSum(k)||!legal(f,k))continue;if(!!SP[k].post!==!!post&&SP[k].post)continue;let t=aiTarget(f,k);if(t==null)continue;best=[i,t==='none'?null:t];break}
  if(!best)break;await castSpell(f,best[0],best[1]||undefined);render();await pause(calm()?0:240)}}
async function aiAttack(f){let d=foeOf(f);for(let u of [...f.units]){for(let n=0;n<4&&!ending&&!u.used&&u.hp>0&&!sickOf(f,u)&&f.units.includes(u);n++){let ok=v=>!(v.dodge&&!u.hero),v;
  let h=heroOf(d),kill=mates(d).filter(x=>ok(x)&&x.hp<=atkOf(u)&&!x.shadow&&!x.ward);
  if(!d.shrines.length)v=h;else if(!heroLocked(f,u,d)&&h&&h.hp<=atkOf(u)&&!h.ward&&!h.shadow)v=h;else v=kill[0]||null
  if((!v||v.hero)&&!firstHit(u)){v=kill[0]||null;if(!v)break}
  await strike(f,u,d,v)}}}
async function enemyTurn(){if(turn!==p||busy||ending)return;busy=true;begin(c);latest='相手の番';render();await pause(calm()?0:350);
 if(c.hand.length>1&&c.max<5){let i=c.hand.findIndex((x,i)=>c.hand.indexOf(x)<i);await chargeUI(c,i>=0?i:c.hand.length-1)}
 if(canAwaken(c)||canEvolve(c)){await ascendUI(c);await pause(calm()?0:250)}
 if(canSkill(c)){let k=skillOf(c),t=null;if(k.kind==='bolt')t=[...p.units].sort((a,b)=>(a.hp<=k.n?-100:0)+a.hp-((b.hp<=k.n?-100:0)+b.hp))[0];
  else if(k.kind==='heal')t=[...c.units].filter(u=>u.hp<u.max).sort((a,b)=>(a.hp-a.max)-(b.hp-b.max))[0];else t=[...p.units].sort((a,b)=>b.atk-a.atk)[0];
  if(t){await useSkill(c,t);await pause(calm()?0:200)}}
 if(!ending)await aiPlay(c,false);if(!ending)await aiAttack(c);if(!ending){await aiPlay(c,true);await aiAttack(c)}
 if(!ending){round++;begin(p)}busy=false;render()}

// 拡張の仲間の数値（gods は arena.js で定義されるので、ここで登録）
for(const [k,e] of Object.entries(EXP_CARDS))if(e.kind==='ally')gods[k]=[e.atk,e.hp];

// ---- 召喚酔い：場に出たターン（主神は自分の1ターン目）は攻撃できない。速攻＝シズク・ハヤテ全形態・火走りのイタチ神・条件を満たした潮先の鷺神・追い潮の対象 ----
const SHRINES=3;// 2026-11-27 神殿は3枚（以前は5枚）
function hasteOf(f,u){if(u.haste)return true;if(u.hero)return !!heroFx(f).haste;if(u.id===1||u.id==='fire-1'||u.id==='water-7')return true;if(u.id==='water-1')return (f.spells||0)>0;return false}
function sickOf(f,u){return u.bornTurn!=null&&u.bornTurn>=(f.turns||0)&&!hasteOf(f,u)}

// ==== 破殿解放：神殿が割れたら、そのカードをコストなしで使うか、手札に加えるかを選ぶ（AIは使えるなら使う）====
function freeLegal(f,k){f.mp+=costOf(k);let ok=legal(f,k);f.mp-=costOf(k);return ok}
function freeWhy(f,k){f.mp+=costOf(k);let w=whyNot(f,k);f.mp-=costOf(k);return w}
async function freeUse(f,k,t){let before=snap();f.hand.push(k);let i=f.hand.length-1;f.mp+=costOf(k);let ok=play(f,i,t);
 if(!ok){f.mp-=costOf(k);return false}latest='破殿解放！ '+latest;render();await diffFx(before);render();return true}
function breachBox(f,k){let o=document.createElement('div');o.className='handzoom breach';o.setAttribute('role','dialog');o.setAttribute('aria-label','破殿解放 '+cardLabel(k));
 let mine=f===p,full=isSum(k)?cardFull(sumId(k)):cardFull(k);
 o.innerHTML='<div class="hz-in"><p class="breach-head"><b>破殿解放</b><small>'+(mine?'自分':'相手')+'の神殿が割れた</small></p><div class="hz-card">'+ucard(k,{})+'<i class="curtain" aria-hidden="true"></i></div><div class="hz-text"><p class="hz-kind">'+(isSum(k)?'仲間':'呪文')+' ／ '+(colorOf(isSum(k)?sumId(k):k)||'色なし')+' ／ コスト'+(k==='scroll'?'X':costOf(k))+'</p><p class="hz-eff">'+full+'</p></div><div class="hz-acts"></div></div>';
 document.body.appendChild(o);return o}
async function breachOne(f,k){await gaugeUp(f);let mine=f===p&&!window.__autoP,can=freeLegal(f,k);
 if(!mine){let t;if(can&&SP[k]&&SP[k].tgt){t=aiTarget(f,k);if(!t||t==='none')t=spTargets(f,k)[0]}
  let o=calm()?null:breachBox(f,k);if(o){o.querySelector('.hz-acts').innerHTML='<p class="breach-ai">'+(can?'相手は「使う」を選んだ':'相手の手札に加わった')+'</p>';fitHandZoom(o);await breachAck(o)}
  if(!(can&&await freeUse(f,k,t)))f.hand.push(k);render();return}
 let o=breachBox(f,k),acts=o.querySelector('.hz-acts');
 let choice=await new Promise(res=>{
  let main=()=>{let why=can?'':freeWhy(f,k);acts.innerHTML='<button class="hz-btn gold" data-a="use"'+(can?'':' disabled')+'>使う（コストなし）</button><button class="hz-btn" data-a="hand">手札に加える</button>'+(why?'<small class="hz-why">'+why+'</small>':'');fitHandZoom(o)};
  let pickT=()=>{let L=spTargets(f,k);acts.innerHTML='<p class="breach-q">'+(SP[k].tgt.startsWith('foe')?'対象の敵を選ぶ':'対象の味方を選ぶ')+'</p>'+L.map((u,j)=>'<button class="hz-btn tgt" data-t="'+j+'">'+(titles[u.id]&&u.hero?'':'')+names[u.id]+'　<small>攻'+atkOf(u)+' / 体'+Math.max(0,u.hp)+'</small></button>').join('')+'<button class="hz-btn ghost" data-a="back">もどる</button>';acts._L=L;fitHandZoom(o)};
  main();
  let wd=setInterval(()=>{if(!o.isConnected){clearInterval(wd);res(['hand'])}},400);let res0=res;res=v=>{clearInterval(wd);res0(v)};
  acts.onclick=e=>{let b=e.target.closest('button');if(!b||b.disabled)return;if(b.dataset.a==='hand')res(['hand']);else if(b.dataset.a==='back')main();else if(b.dataset.a==='use'){if(SP[k]&&SP[k].tgt)pickT();else res(['use'])}else if(b.dataset.t!=null)res(['use',acts._L[+b.dataset.t]])}});
 o.remove();
 if(choice[0]==='use'&&await freeUse(f,k,choice[1])){await waitAsk()}else{f.hand.push(k);latest=cardLabel(k)+'を手札に加えた';render()}}
let breaching=false;
async function shrineReveal(){if(breaching)return;breaching=true;
 try{for(let guard=0;guard<20&&!ending;guard++){let side=[p,c].find(s=>s&&s.broken&&s.broken.length);if(!side)break;let k=side.broken.shift();if(!side.broken.length)side.broken=null;await breachOne(side,k)}}
 finally{breaching=false}if(!ending){for(const s of [p,c])if(s)s.broken=null}render()}

// ---- 神殿が割れたら、割れた側の主神の進化ゲージ+1（進化前のみ・最大3）----
async function gaugeUp(f){let h=heroOf(f);if(!h||f.stage!==0||f.gauge>=ASCEND.evolve.gauge)return;f.gauge++;f.gaugeFlash=Date.now();latest+='　'+names[f.id]+'の進化ゲージ+1（'+f.gauge+'/'+ASCEND.evolve.gauge+'）';render();
 if(calm())return;let el=document.getElementById('u'+h.uid);if(el){let r=body(el,.15);pop('進化ゲージ+1',r.x,r.y,1,'heal')}await pause(500)}

// ---- 壁ルール：相手の場に仲間がいる間、神殿・主神・本陣は攻撃できない（攻撃のみ。スキル・呪文のダメージは対象外）----
// すり抜け＝ハヤテ全形態・瀬渡りのカワセミ神（雨の間）・水面抜きの対象
// すり抜け：神殿を無視して主神を攻撃できる＝風翼解放ハヤテ・蒼翼神ハヤテ（進化後）・雨の間の瀬渡りのカワセミ神・水面抜きの対象
function t_pierce(f,u){return !!u&&((u.hero&&f.id===3&&f.stage>=1)||(u.id==='water-2'&&weather==='雨')||u.id==='water-6'||!!u.pierce)}
// 相手の神殿が残っている間は、主神を通常攻撃の対象にできない（攻撃できるのは相手の仲間と神殿）
function heroLocked(f,u,d){return !!u&&d.shrines.length>0&&!t_pierce(f,u)}
function walled(f,u,d){return heroLocked(f,u,d)}

// ---- 場のカードの拡大表示：タップで大きく。今の攻撃力・体力・状態・効果の全文・用語。自分の神なら「この神で攻撃する」 ----
function unitStatus(f,u){let t=[],mine=f===p;if(u.hero&&f.stage===0)t.push('進化ゲージ '+f.gauge+'/'+ASCEND.evolve.gauge);
 if(sickOf(f,u)&&turn===f)t.push('召喚酔い（次の自分のターンから攻撃できる）');if(u.used&&turn===f)t.push('このターンは攻撃済み');
 if(u.ward)t.push('招雷：次に受けるダメージは0');if(u.shadow)t.push('影分身：次に受けるダメージは0');if(weakened(u))t.push('攻撃力−'+u.weak+'（弱っている）');
 if(u.dodge)t.push('空蝉：敵の仲間の攻撃対象にならない');if(t_pierce(f,u))t.push('すり抜け：仲間を無視して主神・神殿を攻撃できる');
 if((u.tmpAtk||0)>0)t.push('このターン攻撃力+'+u.tmpAtk);if(u.setAtk!=null)t.push('このターン攻撃力は'+u.setAtk);if((u.extraAtt||0)>0)t.push('このターンもう1回攻撃できる');
 if(u.hero)t.push('命（神殿）残り'+f.shrines.length);return t}
function unitZoom(f,u){if(document.querySelector('.handzoom.ask,.handzoom.breach'))return;document.querySelectorAll('.handzoom').forEach(x=>x.remove());let hero=u.hero&&GOD_CARDS[u.id],live={atk:atkOf(u),hp:u.hp,max:u.max,weak:u.weak};
 let name=hero?stageOf(u.id,f.stage).name:cardLabel(handKey(u.id)),full=hero?stageText(u.id,f.stage)+'<br><small>'+ruleText(f.stage)+'</small>':cardFull(u.id),st=unitStatus(f,u);
 let face=hero?gcard(u.id,f.stage,live,''):ucard(typeof u.id==='number'?u.id:u.id,{live});
 let can=f===p&&turn===p&&!busy&&!ending&&!u.used&&u.hp>0&&!sickOf(p,u);
 let o=document.createElement('div');o.className='handzoom unitzoom';o.setAttribute('role','dialog');o.setAttribute('aria-label',name+'の詳細');
 o.innerHTML='<div class="hz-in"><div class="hz-card">'+face+'</div><div class="hz-text"><p class="hz-kind">'+(f===p?'自分':'相手')+'の'+(hero?'主神':'仲間')+' ／ '+(hero?GOD_CARDS[u.id].type:colorOf(u.id)||'色なし')+(hero?'':' ／ コスト'+cardCost(typeof u.id==='number'?u.id:u.id))+'</p>'
 +(st.length?'<ul class="uz-st">'+st.map(x=>'<li>'+x+'</li>').join('')+'</ul>':'')+'<p class="hz-eff">'+full+'</p>'
 +(termList(full+(hero?'':'仲間'))?'<details class="hz-terms"><summary>用語の説明</summary>'+termList(full+(hero?'':'仲間'))+'</details>':'')+'</div>'
 +'<div class="hz-acts">'+(f===p?'<button class="hz-btn gold" data-a="atk"'+(can?'':' disabled')+'>この神で攻撃する</button>':'')+'<button class="hz-btn'+(f===p?'':' gold')+'" data-a="close">閉じる</button>'
 +(f===p&&!can&&turn===p&&!ending?'<small class="hz-why">'+(u.used?'このターンは攻撃済み':sickOf(p,u)?'召喚酔い中（次の自分のターンから攻撃できる）':'今は攻撃できない')+'</small>':'')+'</div></div>';
 o.onclick=e=>{let b=e.target.closest('button');if(e.target===o||b&&b.dataset.a==='close'){o.remove();return}if(b&&b.dataset.a==='atk'&&!b.disabled){o.remove();attacker=u.uid;sel=-1;render()}};
 document.body.appendChild(o);fitHandZoom(o);o.querySelector('details')?.addEventListener('toggle',()=>fitHandZoom(o))}

// ---- 降参（バトルをやめる）：確認のうえ敗北で終了。報酬はなし ----
function surrenderUI(){if(ending)return;document.querySelectorAll('.handzoom').forEach(x=>x.remove());let o=document.createElement('div');o.className='handzoom confirm';o.setAttribute('role','dialog');
 o.innerHTML='<div class="hz-in"><div class="hz-text"><h3>降参しますか？</h3><p class="hz-eff">バトルをやめて、この試合は負けになります（報酬はありません）。</p></div><div class="hz-acts"><button class="hz-btn danger" data-a="yes">降参する</button><button class="hz-btn gold" data-a="no">バトルを続ける</button></div></div>';
 o.onclick=e=>{let b=e.target.closest('button');if(e.target!==o&&!b)return;o.remove();if(b&&b.dataset.a==='yes')surrender()};document.body.appendChild(o)}
function surrender(){if(ending)return;skillMode=null;attacker=-1;attackMode=false;document.querySelectorAll('.handzoom,.reveal').forEach(x=>x.remove());ending='敗北';lastReward={won:false,surrender:true};render()}

// ==== 最終決戦：神殿がすべて割れた側は、主神が攻撃対象になる。主神の体力が0になった側の負け ====
function finalCheck(){for(const s of [p,c]){if(!s||ending||s.shrines.length||s.finalShown)continue;s.finalShown=true;let b=document.createElement('div');b.className='finalbanner';
 b.innerHTML='<b>最終決戦！</b><small>'+(s===c?'相手の神殿がすべて割れた。相手の主神をねらえ！':'自分の神殿がすべて割れた。主神を守りきれ！')+'</small>';document.body.appendChild(b);setTimeout(()=>b.remove(),2200)}}
// 仲間のコスト（正本 2026-11-25）。呪文は変更なし
const ALLY_COST={1:3,6:3,4:3,7:3,8:4,9:3,11:4,'sky-1':2,'sky-2':4,'earth-1':3,'earth-2':4,'fire-1':2,'fire-2':3,'water-1':2,'water-2':3,'mystic-1':3,'mystic-2':5};
for(const [k,v] of Object.entries(ALLY_COST))if(typeof EXP_CARDS!=='undefined'&&EXP_CARDS[k])EXP_CARDS[k].cost=v;
function costOf(k){if(typeof EXP_CARDS!=='undefined'&&EXP_CARDS[k])return EXP_CARDS[k].cost;if(/^g\d+$/.test(k))return ALLY_COST[+k.slice(1)]||1;return moves[k]?moves[k][1]:1}

(function(){const r0=render;render=function(){r0.apply(this,arguments);try{finalCheck()}catch(e){}}})();

// ==== N追加10種の補助 ====
// 写し神：選んだ敵の「その時点の攻撃力」を自分の元の攻撃力として固定（以後の相手の変化には追随しない）
function copyAtk(u,t){let v=atkOf(t);u.atk=v;u.copyOf=t.id;latest+='　写し神：'+names[t.id]+'の攻撃力'+v+'を写した'}
function askCopy(u,res){let done=()=>{pendingAsk=null;if(res)res()};let L=mates(c);if(ending||!L.length||u.hp<=0){done();return}let o=document.createElement('div');o.className='handzoom confirm ask';o.setAttribute('role','dialog');
 o.innerHTML='<div class="hz-in"><div class="hz-text"><h3>写し神（登場時）</h3><p class="hz-eff">攻撃力を写す敵の仲間を選んでください</p></div><div class="hz-acts copypick">'+L.map(t=>'<button class="hz-btn gold" data-u="'+t.uid+'">'+names[t.id]+'（攻撃力'+atkOf(t)+'）</button>').join('')+'</div></div>';
 o.onclick=e=>{let b=e.target.closest('button');if(!b)return;let t=c.units.find(x=>x.uid==+b.dataset.u);if(!t)return;o.remove();copyAtk(u,t);render();done()};document.body.appendChild(o)}
// 引き潮：場から外して持ち主の手札へ。ダメージ・攻撃力低下・一時効果は消える（手札上限のルールはないのでそのまま加える）
function bounce(d,t){d.units=d.units.filter(x=>x!==t);d.hand.push(handKey(t.id));latest+='　'+names[t.id]+'は持ち主の手札に戻った'}
// 心読み：相手の手札を一覧表示（閉じるまで）
function showFoeHand(list){let o=document.createElement('div');o.className='handzoom confirm foehand';o.setAttribute('role','dialog');o.setAttribute('aria-label','相手の手札');
 o.innerHTML='<div class="hz-in"><div class="hz-text"><h3>心読み：相手の手札（'+list.length+'枚）</h3></div><div class="fh-list">'+(list.length?list.map(k=>'<div class="fh-card">'+ucard(typeof k==='string'&&/^g\d+$/.test(k)?+k.slice(1):k,{})+'<b>'+(cardLabel?cardLabel(k):k)+'</b></div>').join(''):'<p class="hz-eff">相手の手札はありません</p>')+'</div><div class="hz-acts"><button class="hz-btn gold">閉じる</button></div></div>';
 o.onclick=e=>{if(e.target.closest('button'))o.remove()};document.body.appendChild(o)}

// ==== フリーズ対策（2026-11-26）====
// 登場時の選択（雲紡ぎのアヤの天候・写し神の写す相手）は、答えが出るまで次の処理を待つ
let pendingAsk=null;
function waitAsk(){if(!pendingAsk)return Promise.resolve();let pa=pendingAsk;
 // 答え待ちの画面が答えないまま閉じられた場合も、止まらずに先へ進む
 return new Promise(res=>{let fin=()=>{clearInterval(t);res()};pa.then(fin);let t0=Date.now(),t=setInterval(()=>{if(Date.now()-t0>600&&!document.querySelector('.handzoom.ask')){pendingAsk=null;fin()}},300)})}
// 相手の番の途中で想定外のエラーが起きても、止まらずにあなたの番へ戻す
{const core=enemyTurn;enemyTurn=async function(){try{return await core()}catch(e){console.error('enemyTurn',e);
 document.querySelectorAll('.handzoom.breach').forEach(x=>x.remove());breaching=false;pendingAsk=null;
 for(const s of [p,c])if(s){s.units=s.units.filter(y=>y.hp>0||y.hero)}
 if(!ending&&turn===c){round++;begin(p)}busy=false;skillMode=null;attacker=-1;attackMode=false;render()}}}

// ==== プロンプトAV：相手の破殿解放はOKで閉じる・対戦ログ・山札の残り枚数 ====
function breachAck(o){if(window.__autoP)return pause(1100).then(()=>o.remove());
 return new Promise(res=>{let a=o.querySelector('.hz-acts');a.insertAdjacentHTML('beforeend','<button class="hz-btn gold" data-a="ok">OK</button>');fitHandZoom(o);
  let done=()=>{if(!o.isConnected)return;o.remove();res()};o.onclick=done;if(typeof TUT!=='undefined'&&TUT)setTimeout(done,6000)})}
let BLOG=[],blogLast='';
{const s0=start;start=function(){BLOG=[];blogLast='';return s0.apply(this,arguments)}}
function blogNote(){let t=String(latest||'').trim();if(!t||t===blogLast||/^手札から仲間を召喚するか/.test(t))return;
 let who=turn===p?'あなたの番':'相手の番';
 if(blogLast&&t.startsWith(blogLast)&&BLOG.length)BLOG[BLOG.length-1].t=t;else BLOG.push({r:round,who,t});blogLast=t;if(BLOG.length>300)BLOG.shift()}
function showLog(){document.querySelectorAll('.logpanel').forEach(x=>x.remove());let o=document.createElement('div');o.className='logpanel';o.setAttribute('role','dialog');o.setAttribute('aria-label','対戦ログ');
 o.innerHTML='<div class="lp-in"><h3>対戦ログ</h3><ol class="lp-list">'+(BLOG.length?[...BLOG].reverse().map(e=>'<li><small>'+e.r+'ターン目・'+e.who+'</small>'+e.t+'</li>').join(''):'<li>まだ記録はありません</li>')+'</ol><button class="hz-btn gold">閉じる</button></div>';
 o.onclick=e=>{if(e.target===o||e.target.closest('button'))o.remove()};document.body.appendChild(o)}
function deckIcon(){return '<svg viewBox="0 0 24 24" aria-hidden="true"><rect x="7" y="3" width="12" height="16" rx="2" fill="none" stroke="currentColor" stroke-width="1.6"/><rect x="4" y="5" width="12" height="16" rx="2" fill="currentColor" opacity=".85"/></svg>'}
{const r1=render;render=function(){r1.apply(this,arguments);try{if(ending||typeof p==='undefined'||!p)return;blogNote();
 let ar=document.querySelector('.arena.duel');if(!ar)return;
 let mid=ar.querySelector('.mid');if(mid&&!mid.querySelector('.logbtn'))mid.querySelector('.round').insertAdjacentHTML('afterend','<button class="logbtn" onclick="showLog()" aria-label="対戦ログを見る">ログ</button>')}catch(e){}}}

// ==== 正本合わせ（2026-11-26）：ツクヨのターン終了時回復。AIの標準デッキには、まだ4枚を入れない（LATE_BASE） ====
const LATE_BASE=['g7','g8','g9','g11'];
function turnEndFx(f){if(!f||ending)return;for(const u of f.units)if(u.id===9&&u.hp>0){let t=[...f.units].filter(x=>x.hp>0&&x.hp<x.max).sort((a,b)=>(b.max-b.hp)-(a.max-a.hp))[0];
 if(t){t.hp=Math.min(t.max,t.hp+1);let m='月神ツクヨ（ターン終了時）：'+names[t.id]+'を1回復';latest+='　'+m;try{BLOG.push({r:round,who:f===p?'あなたの番':'相手の番',t:m});let el=document.getElementById('u'+t.uid);if(el&&!calm()){let r=body(el,.45);pop('+1',r.x,r.y,1,'heal')}}catch(e){}healed(f)}}}
{const b0=begin;begin=function(f){try{if(turn&&turn!==f)turnEndFx(turn)}catch(e){console.error(e)}return b0.apply(this,arguments)}}

// ==== 手札・山札・墓地の配置（ポケポケ式の置き場所。2026-11-26）====
// 墓地：使った呪文と倒れた仲間が表向きで積まれる（対戦中だけの記録。セーブには残さない）
{const s1=start;start=function(){let r=s1.apply(this,arguments);for(const f of [p,c])if(f)f.grave=[];return r}}
{const p1=play;play=function(f,i,t){let k=f.hand[i],r=p1.apply(this,arguments);if(r!==false&&r!==undefined&&!isSum(k)){f.grave=f.grave||[];f.grave.push(k)}return r}}
function pileHtml(f){let mine=f===p,n=f.deck.length,g=f.grave||[],top=g[g.length-1];
 let deck='<div class="pile-deck '+(mine?'mine':'foe')+'" aria-label="'+(mine?'自分':'相手')+'の山札 残り'+n+'枚">'+(n?[0,1,2].slice(0,Math.min(3,n)).map(j=>'<i style="--k:'+j+'"></i>').join(''):'<i class="empty"></i>')+'<b class="pc">'+n+'</b></div>';
 let grave='<button class="pile-grave '+(mine?'mine':'foe')+'" onclick="showGrave(\''+(mine?'p':'c')+'\')" aria-label="'+(mine?'自分':'相手')+'の墓地 '+g.length+'枚（タップで一覧）">'+(top!=null?ucard(top,{}):'<span class="gv-empty">墓地</span>')+(g.length?'<b class="gc-n">'+g.length+'</b>':'')+'</button>';
 return mine?deck+grave:grave+deck}
function showGrave(w){let f=w==='p'?p:c,g=f.grave||[];document.querySelectorAll('.logpanel').forEach(x=>x.remove());let o=document.createElement('div');o.className='logpanel gravepanel';o.setAttribute('role','dialog');o.setAttribute('aria-label',(f===p?'自分':'相手')+'の墓地');
 o.innerHTML='<div class="lp-in"><h3>'+(f===p?'自分':'相手')+'の墓地（'+g.length+'枚）</h3>'+(g.length?'<div class="gv-list">'+[...g].reverse().map(k=>'<div class="gv-card">'+ucard(k,{})+'</div>').join('')+'</div>':'<p>まだ墓地にカードはありません</p>')+'<button class="hz-btn gold">閉じる</button></div>';
 o.onclick=e=>{if(e.target===o||e.target.closest('button'))o.remove()};document.body.appendChild(o)}
function fanHand(){let rail=document.querySelector('.arena.duel .handrail');if(!rail)return;let bs=[...rail.querySelectorAll(':scope > .spell')],n=bs.length;rail.classList.add('fan');
 let W=rail.clientWidth||innerWidth,hv=Math.max(80,Math.min(innerHeight*.15,140)),w=Math.max(50,Math.min(innerWidth*.2,96,hv*591/887)),h=w*887/591;rail.style.setProperty('--hw',w+'px');rail.style.height=(h+20)+'px';
 let step=n>1?Math.min(w*.8,(W-w-10)/(n-1)):0,ang=n>1?Math.min(5,26/(n-1)):0;
 bs.forEach((b,i)=>{let d=i-(n-1)/2;b.style.left=(W/2+d*step-w/2)+'px';b.style.setProperty('--rot',(d*ang)+'deg');b.style.setProperty('--dy',(Math.min(14,d*d*1.4))+'px');b.style.zIndex=b.classList.contains('selected')?60:10+i})}
addEventListener('resize',()=>{try{fanHand()}catch(e){}});
{const r2=render;render=function(){r2.apply(this,arguments);try{if(ending||typeof p==='undefined'||!p)return;let ar=document.querySelector('.arena.duel');if(!ar)return;
 let zf=ar.querySelector('.zone.foe'),zm=ar.querySelector('.zone.mine');
 if(zf&&!zf.querySelector('.piles'))zf.insertAdjacentHTML('beforeend','<div class="piles foe">'+pileHtml(c)+'</div>');
 if(zm&&!zm.querySelector('.piles'))zm.insertAdjacentHTML('beforeend','<div class="piles mine">'+pileHtml(p)+'</div>');
 fanHand()}catch(e){console.error(e)}}}

// 拡大表示：表示後にフォント・画像が読み込まれて高さが変わっても収まるよう、もう一度合わせ直す（2026-11-27）
{const f0=fitHandZoom;fitHandZoom=function(o){f0(o);if(o&&!o.__refit){o.__refit=1;let again=()=>{if(o.isConnected)f0(o)};requestAnimationFrame(again);setTimeout(again,250);try{document.fonts&&document.fonts.ready.then(again)}catch(e){}o.querySelectorAll('img').forEach(im=>{if(!im.complete)im.addEventListener('load',again,{once:true})})}}}
addEventListener('resize',()=>{document.querySelectorAll('.handzoom').forEach(o=>{try{fitHandZoom(o)}catch(e){}})});
if(window.visualViewport)visualViewport.addEventListener('resize',()=>{document.querySelectorAll('.handzoom').forEach(o=>{try{fitHandZoom(o)}catch(e){}})});

// ==== 拡大表示のカードサイズ：種別（呪文・仲間・主神）に関係なく同じ計算に統一（2026-11-27）====
// 見えている高さ（visualViewport／dvh）から、上端の札・ボタン・説明欄の最低限を引いてカードの高さを決め、縦横比で幅を出す。
// 説明文の長さではカードの大きさを変えない（長いときは説明欄だけスクロール）
fitHandZoom=function(o){let card=o&&o.querySelector('.hz-card');if(!card)return;let txt=o.querySelector('.hz-text'),acts=o.querySelector('.hz-acts'),hd=o.querySelector('.breach-head');
 let VH=Math.min(window.visualViewport?visualViewport.height:innerHeight,innerHeight,o.clientHeight||9999),VW=Math.min(window.visualViewport?visualViewport.width:innerWidth,innerWidth);
 let cs=getComputedStyle(o),padY=(parseFloat(cs.paddingTop)||12)+(parseFloat(cs.paddingBottom)||12),TAB=14,GAP=10,land=VW>VH&&VH<520;
 let actsH=Math.max(acts?acts.offsetHeight:0,land?0:150),headH=hd&&!land?hd.offsetHeight+GAP:0,PANEL_MIN=land?0:96;
 let avail=VH-padY-TAB-headH;
 let cardH=land?avail:Math.min(avail-actsH-PANEL_MIN-GAP*2,avail*.64);
 let w=Math.max(96,Math.min(cardH*591/887,land?VW*.36:VW*.66,300));card.style.width=w+'px';card.style.paddingTop=TAB+'px';
 if(txt){let left=land?(VH-padY-actsH-GAP*2-(hd?hd.offsetHeight:0)):(avail-w*887/591-actsH-GAP*2);txt.style.maxHeight=Math.max(64,left)+'px';txt.style.overflowY='auto'}};
{const f1=fitHandZoom;fitHandZoom=function(o){f1(o);if(o&&!o.__refit2){o.__refit2=1;let again=()=>{if(o.isConnected)f1(o)};requestAnimationFrame(again);setTimeout(again,250);try{document.fonts&&document.fonts.ready.then(again)}catch(e){}o.querySelectorAll('img').forEach(im=>{if(!im.complete)im.addEventListener('load',again,{once:true})})}}}

// ==== 正本合わせ（2026-11-27 夜間点検）：覚醒の神鏡＝コスト2、神位継承の巻＝コスト3（コスト表に無く1扱いになっていた）====
moves.mirror=['覚醒の神鏡',2,'自分の主神の進化ゲージを+1する。'];moves.scroll=['神位継承の巻',3,'味方の仲間1体の攻撃力と体力を+2する。'];

// ==== ルール（2026-11-27）====
// 2回攻撃できる効果も、2回目は相手の仲間にしか攻撃できない。神殿・主神を攻撃したら、そのターンの攻撃はそれで終わり（resolveStrike）
function firstHit(u){return !u||!(u.att>0)}
// 後攻は進化ゲージを1つ持って始める（必要数3は変えない）。対戦はいつもあなたが先攻なので、後攻＝相手
{const s3=start;start=function(){let r=s3.apply(this,arguments);try{if(c&&!window.__tutorial)c.gauge=Math.max(c.gauge||0,1)}catch(e){}return r}}

// ==== 対戦の演出（2026-11-28）：攻撃のエネルギー軌跡／カードが黒くなる・点滅するのを防ぐ ====
const ELEM_COL={'天象':'#9fd4ff','烈火':'#ff6a2a','奔流':'#3fd6ff','大地':'#4fd46a','神秘':'#b46bff'};
function elemColor(u){try{let t=u.hero?GOD_CARDS[u.id].type:(colorOf(u.id)||'');return ELEM_COL[t]||'#ffd76a'}catch(e){return '#ffd76a'}}
// 攻撃の軌跡：白い芯→属性色の光の帯が弧を描いて伸び、粒が対象へ流れ、先端は光の槍。重ね表示（#fx）だけで描くのでレイアウト計算は走らない
let _aimN=0;
function aim(a,b,ally,col,node){col=col||(ally?'#ffd76a':'#ff8f74');let s=document.createElementNS('http://www.w3.org/2000/svg','svg'),id='am'+(++_aimN);
 let dx=b.x-a.x,dy=b.y-a.y,len=Math.hypot(dx,dy)||1,nx=-dy/len,ny=dx/len,bend=Math.min(90,len*.28)*(dx>=0?1:-1),mx=(a.x+b.x)/2+nx*bend,my=(a.y+b.y)/2+ny*bend,ang=Math.atan2(b.y-my,b.x-mx)*180/Math.PI;
 let d='M'+a.x+' '+a.y+'Q'+mx+' '+my+' '+b.x+' '+b.y,dots='';
 for(let i=0;i<7;i++)dots+='<circle r="'+(i%3?2.2:3.2)+'" fill="#fff" opacity=".95"><animateMotion dur=".55s" begin="'+(i*.08)+'s" repeatCount="indefinite" path="'+d+'"/></circle>';
 s.setAttribute('class','aim energy');s.setAttribute('width',innerWidth);s.setAttribute('height',innerHeight);s.style.setProperty('--ec',col);
 s.innerHTML='<defs><filter id="'+id+'f" x="-20%" y="-20%" width="140%" height="140%"><feGaussianBlur stdDeviation="5"/></filter>'
  +'<radialGradient id="'+id+'h"><stop offset="0" stop-color="#fff"/><stop offset=".45" stop-color="'+col+'"/><stop offset="1" stop-color="'+col+'" stop-opacity="0"/></radialGradient></defs>'
  +'<path d="'+d+'" stroke="'+col+'" stroke-width="16" fill="none" stroke-linecap="round" pathLength="100" class="trail band" opacity=".55" filter="url(#'+id+'f)"/>'
  +'<path d="'+d+'" stroke="'+col+'" stroke-width="8" fill="none" stroke-linecap="round" pathLength="100" class="trail mid"/>'
  +'<path d="'+d+'" stroke="#fff" stroke-width="2.6" fill="none" stroke-linecap="round" pathLength="100" class="trail core"/>'
  +'<g class="dots">'+dots+'</g>'
  +'<g class="head" transform="translate('+b.x+' '+b.y+') rotate('+ang+')"><circle r="16" fill="url(#'+id+'h)" opacity=".9"/><path d="M6 0L-26 -7L-18 0L-26 7Z" fill="#fff" stroke="'+col+'" stroke-width="2" stroke-linejoin="round"/><path d="M-26 -7L-44 0L-26 7" fill="none" stroke="'+col+'" stroke-width="2.5" stroke-linecap="round" opacity=".8"/></g>';
 fxLayer().appendChild(s);
 if(node&&!calm()){let r=body(node,.5),g=document.createElement('i');g.className='atkflare';g.style.cssText='left:'+r.x+'px;top:'+r.y+'px;--ec:'+col;fxLayer().appendChild(g);setTimeout(()=>g.remove(),520)}
 return s}
// 着弾：衝撃のリングと火花
function impactFx(pt,col){if(calm())return;let w=document.createElement('div');w.className='impact';w.style.cssText='left:'+pt.x+'px;top:'+pt.y+'px;--ec:'+col;
 let h='<i class="ring"></i><i class="ring r2"></i><i class="core"></i>';for(let i=0;i<12;i++)h+='<b style="--a:'+(i*30+((i*37)%17))+'deg;--d:'+(36+(i*13)%30)+'px"></b>';w.innerHTML=h;fxLayer().appendChild(w);setTimeout(()=>w.remove(),700)}
// カード絵の先読み：対戦開始時に、両デッキ・手札・神殿・主神の全形態の絵を読み込んで解凍しておく
const _preImgs=new Map();
function preloadBattleArt(){try{let keys=new Set();for(const f of [p,c])if(f){[...f.deck,...f.hand,...f.shrines].forEach(k=>keys.add(k))}
 let html=[...keys].map(k=>{try{return ucard(isSum(k)?(typeof sumId(k)==='number'?sumId(k):sumId(k)):k,{})}catch(e){return ''}}).join('');
 for(const f of [p,c])if(f)for(const st of [0,1,2])try{html+=gcard(f.id,st)}catch(e){}
 let srcs=new Set([...html.matchAll(/src="([^"]+)"/g)].map(m=>m[1]));srcs.add('cards/card_back.webp');
 for(const src of srcs){if(_preImgs.has(src))continue;let im=new Image();im.decoding='async';im.src=src;_preImgs.set(src,im);if(im.decode)im.decode().catch(()=>{})}}catch(e){}}
{const s4=start;start=function(){let r=s4.apply(this,arguments);preloadBattleArt();return r}}
// 描き直しても、読み込み済みのカード絵（<img>）はそのまま使い回す → 黒くなったり点滅したりしない
{const rImg=render;render=function(){let old=new Map(),ar=document.querySelector('.arena.duel');
 if(ar)for(const im of ar.querySelectorAll('img')){if(!im.complete||!im.naturalWidth)continue;let k=im.getAttribute('src');if(!old.has(k))old.set(k,[]);old.get(k).push(im)}
 let r=rImg.apply(this,arguments);
 let nar=document.querySelector('.arena.duel');
 if(nar){if(old.size)for(const im of nar.querySelectorAll('img')){let k=im.getAttribute('src'),L=old.get(k);if(L&&L.length){let o=L.shift();if(o!==im){for(const at of im.attributes)if(at.name!=='src'&&o.getAttribute(at.name)!==at.value)o.setAttribute(at.name,at.value);im.replaceWith(o)}}}
  // 暗くする表現は、カード絵を変えずに上から半透明の幕を重ねる
  for(const g of nar.querySelectorAll('.unit .gc,.handrail .spell .gc'))if(!g.querySelector(':scope>.veil'))g.insertAdjacentHTML('beforeend','<i class="veil" aria-hidden="true"></i>')}
 return r}}
// 読み込みが終わっていない絵だけ、読み込み完了まで隠しておく（裏面が見える）
{const rLd=render;render=function(){let r=rLd.apply(this,arguments);let ar=document.querySelector('.arena.duel');if(ar)for(const im of ar.querySelectorAll('.gc>img')){if(!im.complete||!im.naturalWidth){im.classList.add('ld');im.addEventListener('load',()=>im.classList.remove('ld'),{once:true});im.addEventListener('error',()=>im.classList.remove('ld'),{once:true})}}return r}}

// ==== BGM（2026-11-28）：通常バトルBGM → 最終決戦BGM ====
// 音源は dist/sfx/ の bgm-battle.mp3（通常バトル）と bgm-final.mp3（最終決戦）。音量・ミュートは効果音と共通の設定（save.sound）に従う
// 最終決戦BGMは曲頭の一拍を落とさないよう、対戦開始時にデコードまで済ませておき、切替の瞬間に0秒から鳴らす（フェードなし）
const BGM_FILES={battle:'sfx/bgm-battle.mp3',final:'sfx/bgm-final.mp3'};
const bgm={ctx:null,gain:null,el:null,elNode:null,elOk:false,buf:null,loading:null,src:null,mode:'',want:'',finalDone:false};
function bgmLevel(){let s=soundCfg();return s.muted?0:Math.max(0,Math.min(1,s.volume))}
function bgmCtx(){if(!bgm.ctx){let AC=window.AudioContext||window.webkitAudioContext;if(!AC)return null;try{bgm.ctx=new AC();bgm.gain=bgm.ctx.createGain();bgm.gain.gain.value=bgmLevel();bgm.gain.connect(bgm.ctx.destination)}catch(e){bgm.ctx=null;return null}}
 if(bgm.ctx.state!=='running'&&!document.hidden)bgm.ctx.resume().catch(()=>{});return bgm.ctx}
function bgmApply(){if(bgm.gain)bgm.gain.gain.value=bgmLevel();if(bgm.el&&!bgm.elNode)bgm.el.volume=bgmLevel()}
// 通常バトルBGM（長い曲なのでストリーミング再生。音量はWeb Audio経由でかける＝iPhoneでも音量設定が効く）
function bgmElement(){if(bgm.el)return bgm.el;let a=new Audio();a.preload='auto';a.loop=true;a.src=BGM_FILES.battle;a.setAttribute('playsinline','');bgm.el=a;
 let ctx=bgmCtx();if(ctx){try{bgm.elNode=ctx.createMediaElementSource(a);bgm.elNode.connect(bgm.gain)}catch(e){bgm.elNode=null}}bgmApply();return a}
// 最終決戦BGM（曲頭を確実に鳴らすため、デコード済みの音で鳴らす）
function bgmPreloadFinal(){let ctx=bgmCtx();if(!ctx||bgm.buf||bgm.loading)return bgm.loading;
 bgm.loading=fetch(BGM_FILES.final).then(r=>{if(!r.ok)throw new Error('bgm '+r.status);return r.arrayBuffer()}).then(ab=>new Promise((res,rej)=>ctx.decodeAudioData(ab,res,rej))).then(b=>{bgm.buf=b;return b}).catch(e=>{bgm.loading=null;console.warn('最終決戦BGMを読み込めませんでした',e);return null});return bgm.loading}
function bgmStopFinal(){if(bgm.src){try{bgm.src.onended=null;bgm.src.stop()}catch(e){}try{bgm.src.disconnect()}catch(e){}bgm.src=null}}
function bgmPlayBattle(){let a=bgmElement();if(document.hidden)return;let pr=a.play();if(pr)pr.then(()=>{bgm.elOk=true}).catch(()=>{})}
// 対戦開始：通常バトルBGMを曲頭から。最終決戦BGMはここで先読み・デコード
function bgmBattleStart(){bgmStopFinal();bgm.finalDone=false;bgm.mode='battle';bgm.want='battle';let a=bgmElement();try{a.pause();a.currentTime=0}catch(e){}bgmPlayBattle();bgmPreloadFinal()}
// 最終決戦へ：1試合1回。通常BGMを止めるのと同じ瞬間に、最終決戦BGMを0秒から現在の音量で鳴らす
function bgmFinal(){if(bgm.finalDone||bgm.mode!=='battle'||ending)return;bgm.finalDone=true;
 let go=b=>{if(bgm.mode!=='battle'||!bgm.finalDone||ending)return;let ctx=bgmCtx();if(!ctx||!b)return;bgmStopFinal();
  let s=ctx.createBufferSource();s.buffer=b;s.loop=true;s.connect(bgm.gain);bgmApply();
  if(bgm.el)bgm.el.pause();s.start(ctx.currentTime,0);bgm.src=s;bgm.mode='final';bgm.want='final'};
 if(bgm.buf){go(bgm.buf);return}
 // まだ読み込み中なら、無音を作らないよう通常BGMを流したまま待ち、届いた瞬間に切り替える
 let w=bgmPreloadFinal();if(w)w.then(go)}
// 決着・ホームへ戻るとき：止める
function bgmStop(){bgmStopFinal();if(bgm.el){try{bgm.el.pause();bgm.el.currentTime=0}catch(e){}}bgm.mode='';bgm.want=''}
// スマホ：最初のタップで音声を有効にし、通常BGMの再生も許可しておく（無音で一瞬再生して止める）
function bgmUnlock(){let ctx=bgmCtx();if(!ctx)return;let a=bgmElement();
 if(!bgm.elOk&&a.paused&&bgm.want!=='battle'){a.muted=true;let pr=a.play();if(pr)pr.then(()=>{if(bgm.want!=='battle'){a.pause();try{a.currentTime=0}catch(e){}}a.muted=false;bgm.elOk=true}).catch(()=>{a.muted=false})}
 if(bgm.want==='battle'&&a.paused&&!ending)bgmPlayBattle()}
['pointerdown','touchend','click','keydown'].forEach(t=>document.addEventListener(t,bgmUnlock,{capture:true,passive:true}));
// 画面が裏に回ったら一時停止、戻ったら続きから
document.addEventListener('visibilitychange',()=>{if(!bgm.ctx)return;if(document.hidden){bgm.ctx.suspend().catch(()=>{});if(bgm.el)bgm.el.pause()}else{bgm.ctx.resume().catch(()=>{});if(bgm.mode==='battle')bgmPlayBattle()}});
{const s0=start;start=function(){let r=s0.apply(this,arguments);try{bgmBattleStart()}catch(e){console.warn(e)}return r}}
{const v0=setVolume;setVolume=function(){let r=v0.apply(this,arguments);bgmApply();return r}}
{const m0=toggleMute;toggleMute=function(){let r=m0.apply(this,arguments);bgmApply();return r}}
// home() は後から読み込まれる home.js で定義されるので、読み込み完了後に包む
document.addEventListener('DOMContentLoaded',()=>{if(typeof home==='function'&&!home.__bgm){const h0=home;home=function(){bgmStop();return h0.apply(this,arguments)};home.__bgm=true}});
// 決着したら止めて、既存のリザルト演出へ
{const rb=render;render=function(){if(ending&&bgm.mode)bgmStop();return rb.apply(this,arguments)}}
// 切替のタイミング：神殿が割れて「残り0枚」になったことが画面で分かる瞬間（割れる演出）
{const bc=breakCard;breakCard=function(card,foe){let r=bc.apply(this,arguments);try{if(!ending&&p&&c&&(!p.shrines.length||!c.shrines.length))bgmFinal()}catch(e){}return r}}
// 既存の最終決戦判定（finalCheck）：身代わりで割れる演出がこれから出る場合は、その演出まで待つ（バナーとBGMをそろえる）
{const fc=finalCheck;let wait=null;finalCheck=function(force){if(!force&&!calm()&&subLog.length&&!ending&&[p,c].some(s=>s&&!s.shrines.length&&!s.finalShown)){if(!wait)wait=setTimeout(()=>{wait=null;finalCheck(true)},1600);return}
 let before=[p,c].map(s=>s&&s.finalShown);fc();if(!ending&&[p,c].some((s,i)=>s&&s.finalShown&&!before[i]))bgmFinal()}}
{const sf=subFx;subFx=async function(){let r=await sf.apply(this,arguments);try{if(!ending&&!document.querySelector('.resultscreen'))finalCheck()}catch(e){}return r}}

// ==== 主神の新しい効果（2026-11-28）：天象＝守り／烈火＝バトル／奔流＝場のコントロール／大地＝神力ブースト／神秘＝墓地 ====
// 数値は godcards.js の GOD_CARDS（fx）だけで持つ。ここは仕組みだけ
const ownerOf=v=>[p,c].find(s=>s&&s.units&&s.units.includes(v));
// ダメージ軽減：ライガの常時軽減（雷壁・天守）＋結界（その味方1体、張った側の次のターン開始まで）
function dmgCut(v){let s=ownerOf(v);if(!s)return 0;return (heroFx(s).wall||0)+(v.barrierN||0)}
function cutName(v){let s=ownerOf(v),x=s?heroFx(s):{};return v.barrierN&&!x.wall?'結界':x.shrineWall?'天守':x.wall?(v.barrierN?'結界・雷壁':'雷壁'):'結界'}
let zeroWhy='';
{const h0=hurt;hurt=function(v,n){if(n>0){let cut=dmgCut(v);if(cut){let b=n;n=Math.max(0,n-cut);if(n===0){zeroWhy=cutName(v);return 0}}}return h0.call(this,v,n)}}
// 攻撃の解決（軽減・天守・獅子王を入れた版。それ以外は元の処理と同じ）
resolveStrike=function(f,u,d,v){let x=fxOf(f,u),wasWeak=v&&weakened(v)?Math.min(v.weak,v.atk):0;u.att=(u.att||0)+1;u.used=u.att>=maxAttacks(f,u)||!v||!!v.hero;let bonus=f.burst?1:0;f.burst=false;f.overflowHit=null;let hit=false;
 let pow=atkOf(u)+bonus+(u.exileBonus||0)-(u.att===2&&x.second?x.second:0);pow=Math.max(0,pow);u.exileBonus=0;
 // 獅子王：2回目の攻撃では、相手の『攻撃されたとき』に発動する効果を受けない（今のカードに該当する効果はない。追加されたら pure の間は発動させない）
 const pure=!!(x.pureSecond&&u.att===2);f.pureHit=pure;
 if(v){let dmg=pow+(x.extra||0),note='';zeroWhy='';
  let cut=dmg>0?dmgCut(v):0;if(cut){let b=dmg;dmg=Math.max(0,dmg-cut);note='（軽減で−'+(b-dmg)+'）';if(!dmg)zeroWhy='軽減';useShield(v,b-dmg)}
  if(v.shadow&&dmg>0){v.shadow=false;dmg=0;note='（影分身で0）'}else if(v.ward&&dmg>0){v.ward=false;dmg=0;note='（招雷で0）';zeroWhy='招雷'}
  v.hp-=dmg;hit=dmg>0;if(dmg>0)v.hitThisTurn=true;
  let ca=hurt(u,atkOf(v));if(!ca&&atkOf(v)>0)note+=dmgCut(u)>=atkOf(v)?'（'+cutName(u)+'で反撃0）':'（招雷で反撃0）';latest=names[u.id]+' → '+names[v.id]+'　'+dmg+'ダメージ・反撃 '+ca+note;f.hitInfo={v:dmg,u:ca};if(ca>0)u.hitThisTurn=true;settle(d,f)}
 else{if(d.shrines.length){let sw=Math.min(shrineCut(d),pow);if(sw){d.shrineSh[0]=0;if(window.__onShield)__onShield(d,sw)}
   if(sw&&pow-sw<=0){zeroWhy='軽減';latest='軽減！ '+names[u.id]+'の攻撃（'+pow+'）を、神殿が受け止めた（−'+sw+'・軽減は消えた）'}
   else{let lost=d.shrines.splice(0,1+bonus);if(d.shrineSh)d.shrineSh.splice(0,lost.length);d.broken=lost;d.shrineBroken=true;hit=true;latest=names[u.id]+'が神殿を破壊！'+(sw?'（軽減−'+sw+'は消えた）':'');shrineLost(d)}}
  else{ending=f===p?'勝利':'敗北';hit=true;lastReward=grantReward(f===p)}}
 if(u.hero&&hit&&f.stage===0)f.gauge=Math.min(ASCEND.evolve.gauge,f.gauge+1);if(!ending)afterStrike(f,u,d,v,wasWeak);attacker=u.used||u.hp<=0?-1:attacker}
// 0ダメージの吹き出し：理由（結界・雷壁・天守・守護）を出す
{const pp=pop;pop=function(t){if((t==='影分身'||t==='守護')&&zeroWhy){arguments[0]=zeroWhy;zeroWhy=''}return pp.apply(this,arguments)}}
// すり抜け：主神ハヤテは持たなくなった（仲間カードのすり抜けは残す）
t_pierce=function(f,u){return !!u&&((u.id==='water-2'&&weather==='雨')||u.id==='water-6'||!!u.pierce)};

// ---- 主神の技（1ターンに1回、神力を払う）----
skillOf=function(f){let h=heroOf(f);if(!h||!GOD_CARDS[f.id])return null;let s=stageOf(f.id,f.stage),x=s.fx,cost=s.cost||1;
 if(x.barrier)return {kind:'barrier',name:'結界',n:x.barrier,cost,side:'ally'};
 if(x.bind)return {kind:'bind',name:s.skill,cost,side:'foe'};
 if(x.grow)return {kind:'grow',name:s.skill,n:x.grow,heal:x.selfHeal||0,cost,side:'self'};
 if(x.sac)return {kind:'sac',name:s.skill,n:x.sac,cost,side:'ally'};
 if(x.doom)return {kind:'doom',name:s.skill,cost,side:'foe'};
 return null};
canSkill=function(f){let k=skillOf(f);if(!k||f.skillUsed||f.mp<k.cost)return false;let d=foeOf(f);
 if(k.kind==='sac')return mates(f).length>0&&d.units.length>0;if(k.kind==='doom')return mates(d).length>0;return true};
const isAI=f=>f!==p||!!window.__autoP;
let aiPhase='pre';
useSkill=async function(f,v){let k=skillOf(f),d=foeOf(f);if(!k||!canSkill(f))return;
 if(isAI(f)){let plan=aiSkillPlan(f,k,aiPhase);if(plan)await runSkill(f,k,plan);return}
 if(k.kind==='grow')return runSkill(f,k,{});
 if(k.kind==='sac'){if(!skillMode||!skillMode.sacUid){if(!v||v.hero||!f.units.includes(v)){latest='生贄にする自分の仲間を選んでください';render();return}
   skillMode={...k,side:'foe',sacUid:v.uid,step:2};latest=names[v.id]+'を生贄に。ダメージを与える相手のカードを選んでください';render();return}
  let mate=f.units.find(u=>u.uid===skillMode.sacUid);if(!mate||!v||!d.units.includes(v)){skillMode=null;render();return}return runSkill(f,k,{mate,t:v})}
 if(k.kind==='doom'){if(!v||v.hero||!d.units.includes(v)){latest='破壊する相手の仲間を選んでください';render();return}return runSkill(f,k,{t:v})}
 if(k.kind==='barrier'){if(!v||!f.units.includes(v))return;return runSkill(f,k,{t:v})}
 if(k.kind==='bind'){if(!v||!d.units.includes(v))return;return runSkill(f,k,{t:v})}};
// 墓地の仲間から手札に戻す1枚（コストの高い順→攻撃力の高い順）
function graveBest(f){let L=(f.grave||[]).filter(k=>isSum(k));if(!L.length)return null;return L.sort((a,b)=>cardCost(sumKeyId(b))-cardCost(sumKeyId(a))||(gods[sumKeyId(b)]||[0])[0]-(gods[sumKeyId(a)]||[0])[0])[0]}
function sumKeyId(k){let m=/^g(\d+)$/.exec(k);return m?+m[1]:k}
async function skillFx(el,kind,label,cls,n){if(!el||calm())return;let r=body(el,.45);burst(kind,r.x,r.y);if(label)pop(label,r.x,body(el,.2).y,n||1,cls||'');await pause(420)}
async function runSkill(f,k,P){let d=foeOf(f);f.mp-=k.cost;f.skillUsed=true;skillMode=null;let wasBusy=busy;busy=true;render();
 const el=u=>u&&document.getElementById('u'+u.uid);
 if(k.kind==='barrier'){let t=P.t;addBarrier(t,'raiga',k.n);latest='結界！ '+names[t.id]+'は次の相手のターンまで、受けるダメージ−'+k.n;sfx('summon');await skillFx(el(t),'guard','結界 −'+k.n,'guard')}
 else if(k.kind==='bind'){let t=P.t;bindFoe(f,t);latest=k.name+'！ '+names[t.id]+'は次の相手のターンに攻撃できない';await skillFx(el(t),'water','水縛り','guard')}
 else if(k.kind==='grow'){let h=heroOf(f);f.max+=k.n;f.mp+=k.n;let b=h.hp;if(k.heal)h.hp=Math.min(h.max,h.hp+k.heal);let up=h.hp-b;if(up>0)healed(f);
  latest=k.name+'！ 神力の最大値+'+k.n+'（'+f.max+'）'+(up>0?'　'+names[h.id]+'の体力を'+up+'回復':'');sfx('summon');await skillFx(el(h),'leaf','神力 +'+k.n,'heal');if(up>0&&!calm()){let r=body(el(h),.3);pop('+'+up,r.x,r.y,1,'heal');drain(el(h),h);await pause(300)}}
 else if(k.kind==='sac'){let m=P.mate,t=P.t,e1=el(m),e2=el(t);let n1=hurt(m,k.n),w1=zeroWhy;zeroWhy='';let n2=hurt(t,k.n),w2=zeroWhy;zeroWhy='';
  latest=k.name+'！ '+names[m.id]+'に'+n1+'、'+names[t.id]+'に'+n2+'ダメージ';
  if(!calm()){sfx('hit');for(const [e,n,u,w] of [[e1,n1,m,w1],[e2,n2,t,w2]])if(e){let r=body(e,.45);burst('bolt',r.x,r.y);struck(e);pop(n?'−'+n:(w||'招雷'),r.x,body(e,.2).y,Math.max(1,n),n?'':'guard');drain(e,u);if(u.hp<=0&&!(u.hero&&ownerOf(u)&&ownerOf(u).shrines.length))e.classList.add('ko')}await pause(560)}
  settle(f,d);await subFx()}
 else if(k.kind==='doom'){let t=P.t,e=el(t);t.ward=false;t.hp=0;let back=graveBest(f);
  if(!calm()&&e){sfx('hit');let r=body(e,.45);burst('water',r.x,r.y);struck(e);pop('破壊',r.x,body(e,.2).y,3);e.classList.add('ko');await pause(560)}
  settle(d);latest=k.name+'！ '+names[t.id]+'を破壊';
  if(back){let i=f.grave.lastIndexOf(back);f.grave.splice(i,1);f.hand.push(back);latest+='。墓地の'+cardLabel(back)+'を手札に戻した'}else latest+='（墓地に仲間がいないので、手札に戻すカードはなし）'}
 busy=wasBusy;render();await shrineReveal(f,null,d)}
// AIの使い方：pre＝ターンのはじめ（召喚前）、post＝攻撃の直前（召喚後）
function aiSkillPlan(f,k,ph){let d=foeOf(f),foeAtk=d.units.some(u=>atkOf(u)>0);
 if(k.kind==='grow')return f.max<9?{}:null;
 if(k.kind==='doom'){let L=mates(d).sort((a,b)=>(atkOf(b)*2+b.hp)-(atkOf(a)*2+a.hp));return L.length?{t:L[0]}:null}
 if(ph==='pre')return null;
 if(k.kind==='barrier'){if(!foeAtk)return null;let h=heroOf(f),L=[...f.units].sort((a,b)=>(b.hero?1:0)-(a.hero?1:0)||atkOf(b)-atkOf(a));
  let t=(!f.shrines.length||h.hp<=Math.max(...d.units.map(atkOf))+2)?h:(L.find(u=>!u.hero&&u.hp<=Math.max(...d.units.map(atkOf)))||h);return {t}}
 if(k.kind==='bind'){let t=[...d.units].filter(u=>!u.bindNext&&atkOf(u)>=2).sort((a,b)=>atkOf(b)-atkOf(a))[0];return t?{t}:null}
 if(k.kind==='sac'){let n=k.n,kill=mates(d).filter(u=>!u.ward&&u.hp<=n+0-dmgCut(u)+0&&n>dmgCut(u)).sort((a,b)=>atkOf(b)-atkOf(a));
  let t=kill[0]||(!d.shrines.length&&!heroOf(d).ward?heroOf(d):null);if(!t)return null;
  let my=mates(f).sort((a,b)=>((b.hp>n)?1:0)-((a.hp>n)?1:0)||atkOf(a)-atkOf(b));let m=my[0];if(!m)return null;
  if(m.hp<=n&&!t.hero&&atkOf(m)>atkOf(t))return null;return {mate:m,t}}
 return null}
// 召喚のあと、攻撃の直前にもう一度だけ技を考える
{const aa=aiAttack;aiAttack=async function(f){if(!ending&&canSkill(f)){aiPhase='post';try{await useSkill(f,null)}finally{aiPhase='pre'}}if(ending)return;return aa.apply(this,arguments)}}
// 技のボタン：芽吹き系は対象を選ばずにすぐ使う
{const ha=heroActs;heroActs=function(){let o=ha.apply(this,arguments),k=skillOf(p);if(k&&k.kind==='grow')o=o.replace("skillMode=skillOf(p);attacker=-1;render()","useSkill(p,heroOf(p))");
 if(k&&k.kind==='sac'&&canSkill(p))o=o.replace(k.name+' · 神力'+k.cost,k.name+' · 神力'+k.cost+'（自分の仲間→相手を選ぶ）');return o}}
// ---- ターン開始：渦巻・天潮（ハヤテ）／結界と水縛りの期限 ----
function threat(u){return atkOf(u)*2+u.hp+(cardCost(typeof u.id==='number'?u.id:u.id)||0)}
let startNotes=[];
{const ts=turnStart;turnStart=function(f){let r=ts.apply(this,arguments),x=heroFx(f),o=foeOf(f);if(!heroOf(f)||!o)return r;
 if(x.swirl){let t=mates(o).filter(u=>!u.bindNext).sort((a,b)=>atkOf(b)-atkOf(a))[0];if(t){bindFoe(f,t);startNotes.push({uid:t.uid,label:'渦巻',text:'渦巻：'+names[t.id]+'は次の相手のターンに攻撃できない'})}}
 if(x.tide){let t=mates(o).sort((a,b)=>threat(b)-threat(a))[0];if(t){o.units=o.units.filter(u=>u!==t);o.hand.push(handKey(t.id));f.ctrl=(f.ctrl||0)+1;startNotes.push({side:o,label:'手札へ',text:'天潮：'+names[t.id]+'を'+(o===p?'あなた':'相手')+'の手札に戻した'})}}
 return r}}
{const b2=begin;begin=function(f){if(f&&f.units)for(const u of f.units){u.barrierN=0;u.bar=null}if(f)f.shrineBar=0;let o=foeOf(f);if(o)for(const u of o.units)u.bound=false;
 let r=b2.apply(this,arguments);for(const u of f.units)if(u.bindNext){u.bindNext=false;u.used=true;u.bound=true}
 if(startNotes.length){let N=startNotes;startNotes=[];queueMicrotask(()=>{latest+=(latest?'　':'')+N.map(n=>n.text).join('　')});
  if(!calm())setTimeout(()=>{for(const n of N){let e=n.uid?document.getElementById('u'+n.uid):document.getElementById('shrine'+(n.side&&n.side.id));if(e){let r=body(e,.4);pop(n.label,r.x,r.y,1,'guard')}}},120)}
 return r}}
// 状態の表示：結界・水縛り（場のカードの帯と、詳細の状態欄）
{const us=unitStatus;unitStatus=function(f,u){let t=us.apply(this,arguments),cut=dmgCut(u);
 if(u.barrierN)t.unshift('結界：受けるダメージ−'+u.barrierN+'（次の相手のターンまで）');if(heroFx(f).wall)t.unshift((heroFx(f).shrineWall?'天守':'雷壁')+'：受けるダメージ−'+heroFx(f).wall);
 if(u.bound)t.unshift('水縛り：このターンは攻撃できない');if(u.bindNext)t.unshift('水縛り：次のターンは攻撃できない');return t}}
{const rr=render;render=function(){let r=rr.apply(this,arguments);try{for(const s of [p,c]){if(!s)continue;for(const u of s.units){let e=document.getElementById('u'+u.uid);if(!e)continue;
  let tags=[];if(u.barrierN)tags.push('<em class="ribbon barrier">結界−'+u.barrierN+'</em>');if(u.bound||u.bindNext)tags.push('<em class="ribbon bind">水縛り</em>');if(tags.length&&!e.querySelector('.ribbon.barrier,.ribbon.bind'))e.insertAdjacentHTML('beforeend','<span class="ribbons2">'+tags.join('')+'</span>')}}
  // 対象にできない主神は「対象」表示を外す（生贄の冥火の1体目・幽冥）
  if(skillMode&&!skillMode.spell&&(skillMode.kind==='doom'||(skillMode.kind==='sac'&&!skillMode.sacUid))){let side=skillMode.kind==='doom'?c:p,h=heroOf(side),e=h&&document.getElementById('u'+h.uid);if(e){e.classList.remove('target');let m=e.querySelector('.mark');if(m)m.innerHTML=''}}
 }catch(e){console.warn(e)}return r}}

// ==== 仲間27種・呪文28種の新しい効果（2026-11-28）：仕組み ====
// 天象＝守り／烈火＝バトル（変更なし）／奔流＝場のコントロール／大地＝神力ブースト／神秘＝墓地
const graveAllies=f=>(f&&f.grave||[]).filter(k=>isSum(k));
function subaruBonus(u){let s=ownerOf(u);return s?Math.min(3,graveAllies(s).length):0}
const baseOf=k=>{let id=sumId(k);return gods[id]||[0,1]};
// 軽減（結界）：出どころごとに記録。違うカードの軽減は足し合わせ、同じカードの軽減は大きい方だけ（重ねがけで増え続けないように）
function addBarrier(u,src,n){u.bar=u.bar||{};u.bar[src]=Math.max(u.bar[src]||0,n);u.barrierN=Object.values(u.bar).reduce((a,b)=>a+b,0)}
// 神殿の軽減：天守（主神ライガSR）＋陽神アカツキ（晴れの間）＋天柱落とし
function shrineCut(d){if(!d)return 0;let n=heroFx(d).shrineWall||0;if(weather==='晴れ'&&d.units.some(u=>u.id===8&&u.hp>0))n+=1;return n+(d.shrineBar||0)}
function shrineCutName(d){let L=[];if(heroFx(d).shrineWall)L.push('天守');if(weather==='晴れ'&&d.units.some(u=>u.id===8&&u.hp>0))L.push('陽神アカツキ');if(d.shrineBar)L.push('天柱落とし');return L.join('・')||'軽減'}
// 攻撃できなくする（次の相手のターン）：奔流の「場のコントロール」。航跡を読むの条件にも使う
function bindFoe(f,t){if(!t)return;t.bindNext=true;f.ctrl=(f.ctrl||0)+1}
// 神力の回復（そのターンだけ。供給量＝最大値は増えない）。古根の角王・実りの分け前の「神力が増えた」もここで記録
function manaUpHook(f){f.manaUp=true;if(turn!==f)return;for(const u of f.units)if(u.id==='earth-2'&&u.hp>0&&!u.trig3){u.trig3=true;u.tmpAtk=(u.tmpAtk||0)+2;latest+='　古根の角王の攻撃力+2（このターン）'}}
function gainMana(f,n,src){if(n<=0||!f)return;f.mp+=n;latest+='　'+src+'：神力を'+n+'回復';manaUpHook(f)}
{const ch=charge;charge=function(f,i){let b=f.max,r=ch.apply(this,arguments);if(f.max>b)manaUpHook(f);return r}}
{const rs2=runSkill;runSkill=async function(f,k){let r=rs2.apply(this,arguments);if(k&&k.kind==='grow')manaUpHook(f);return r}}
{const rt=resetTurn;resetTurn=function(f){let r=rt.apply(this,arguments);f.manaUp=false;f.ctrl=0;return r}}
healed=function(){};// 古根の角王は「体力の回復」ではなく「神力が増えた」で発動するようになった
// 蘇生（墓地→場）：体力の指定があればその値。出たターンは召喚と同じく攻撃できない。登場時の効果は起きない
function revive(f,key,hp){let i=(f.grave||[]).lastIndexOf(key);if(i<0||f.units.length>=3)return null;f.grave.splice(i,1);let u=mk(f,sumId(key));if(hp!=null){u.hp=Math.max(1,Math.min(u.max,hp))}u.bornTurn=f.turns;u.summonedTurn=round;u.side=f.id;f.units.push(u);arrived=u.uid;return u}
// 除外（墓地→ゲームの外）
function exile(f,key){let i=(f.grave||[]).lastIndexOf(key);if(i<0)return false;f.grave.splice(i,1);f.exiled=(f.exiled||[]).concat(key);return true}
// 生贄・墓地に送る：その仲間を倒す（守護がついていれば手札へ）
function sacrifice(m){if(!m)return;m.ward=false;m.hp=0}
// 倒れた仲間の行き先：守護（次に場を離れるとき手札に戻る）がついていれば手札、それ以外は墓地
settle=function(...sides){let all=new Set(sides);
 for(let k=0;k<6&&!ending;k++){let any=false;for(const s of [...all])for(const u of s.units)if(u.id==='fire-6'&&u.hp<=0&&!u.boomed){u.boomed=true;any=true;let d=foeOf(s);all.add(d);
  let t=[...d.units].filter(x=>x.hp>0&&!x.ward).sort((a,b)=>(a.hero?1:0)-(b.hero?1:0)||(a.hp<=2?-1:0)-(b.hp<=2?-1:0)||a.hp-b.hp)[0]||d.units.find(x=>x.hp>0);
  if(t){let n=hurt(t,2);latest+='　爆炎の剣神が倒れ、'+names[t.id]+'に'+n+'ダメージ'}}if(!any)break}
 for(const x of all)substitute(x);
 for(const x of all){for(const y of x.units)if(y.hp<=0&&!y.hero){if(y.saveToHand){x.hand.push(handKey(y.id));latest+='　守護：'+names[y.id]+'は手札に戻った'}else{x.grave=x.grave||[];x.grave.push(handKey(y.id))}}x.units=x.units.filter(y=>y.hp>0||(y.hero&&ending))}};
// 手札に戻す（追い潮・引き潮・天潮）
bounce=function(d,t){d.units=d.units.filter(x=>x!==t);d.hand.push(handKey(t.id));latest+='　'+names[t.id]+'は持ち主の手札に戻った'};
// 速攻・攻撃回数・すり抜け
hasteOf=function(f,u){if(u.haste)return true;if(u.hero)return !!heroFx(f).haste;return u.id==='fire-1'||u.id==='water-7'};
maxAttacks=function(f,u){return (fxOf(f,u).attacks||1)+(u&&u.extraAtt||0)};
t_pierce=function(f,u){return !!u&&((u.id==='water-2'&&weather==='雨')||u.id==='water-6'||(u.id==='water-1'&&(f.spells||0)>0)||!!u.pierce)};
// 自分の神殿が割れたとき：不動の山神＝神力3回復
shrineLost=function(side){for(const u of side.units)if(u.id==='earth-6'&&u.hp>0)gainMana(side,3,'不動の山神')};
// 攻撃のあと：雨神シズク・飛沫神＝攻撃した敵は次の相手のターンに攻撃できない／石臼の荒神＝神力1回復（双炉・イタチは変更なし）
afterStrike=function(f,u,d,v){f.atkCount=(f.atkCount||0)+1;if(v&&v.hero&&!u.hero)f.heroHit=true;
 if((u.id===1||u.id==='water-7')&&v&&v.hp>0&&d.units.includes(v)){bindFoe(f,v);latest+='　'+names[v.id]+'は次の相手のターンに攻撃できない'}
 if(u.id==='earth-1')gainMana(f,1,'石臼の荒神');
 if(u.att===2)for(const x of f.units)if(x.id==='fire-2'&&x.hp>0)dmgHero(d,1,'双炉の鍛冶神');
 if(u.id==='fire-1'&&u.hp>0){hurt(u,1);latest+='　火走りのイタチ神は自分に1ダメージ'}
 settle(d,f)};
// 自分のターンの終了時：潮神ナギ（攻撃しなかったら、敵の仲間1体を次の相手のターン攻撃不可に）
turnEndFx=function(f){if(!f||ending)return;let o=foeOf(f);for(const u of f.units)if(u.id===7&&u.hp>0&&!(u.att>0)){let t=mates(o).filter(x=>!x.bindNext).sort((a,b)=>atkOf(b)-atkOf(a))[0];if(t){bindFoe(f,t);latest+='　潮神ナギ：'+names[t.id]+'は次の相手のターンに攻撃できない'}}};
// 自分のターン開始時：岩神ガンザ（神力1回復）／空蝉の歩法で墓地に送った仲間が戻る
{const ts2=turnStart;turnStart=function(f){let r=ts2.apply(this,arguments);if(!f||ending)return r;
 for(const u of f.units)if(u.id===6&&u.hp>0)gainMana(f,1,'岩神ガンザ');
 if(f.utsusemi&&f.utsusemi.length){let L=f.utsusemi;f.utsusemi=[];for(const k of L){let u=revive(f,k);if(u)startNotes.push({uid:u.uid,label:'空蝉',text:'空蝉の歩法：'+names[u.id]+'が場に戻った'})}}
 return r}}

// ---- 選ぶ画面（あなたの番だけ。AIは自動で選ぶ）----
const autoSide=f=>f!==p||!!window.__autoP;
function askChoice(title,msg,opts,skip){return new Promise(res=>{if(ending||!opts.length){res(null);return}let o=document.createElement('div');o.className='handzoom confirm ask';o.setAttribute('role','dialog');o.setAttribute('aria-label',title);
 o.innerHTML='<div class="hz-in"><div class="hz-text"><h3>'+title+'</h3><p class="hz-eff">'+msg+'</p></div><div class="hz-acts">'+opts.map((x,i)=>'<button class="hz-btn gold tgt" data-i="'+i+'">'+x.label+'</button>').join('')+(skip?'<button class="hz-btn ghost" data-i="-1">'+skip+'</button>':'')+'</div></div>';
 o.onclick=e=>{let b=e.target.closest('button');if(!b)return;o.remove();let i=+b.dataset.i;res(i>=0?opts[i].value:null)};document.body.appendChild(o);try{fitHandZoom(o)}catch(er){}})}
const unitOpt=u=>({label:names[u.id]+'　<small>攻'+atkOf(u)+' / 体'+Math.max(0,u.hp)+'</small>',value:u});
const keyOpt=k=>({label:cardLabel(k)+(isSum(k)?'　<small>攻'+baseOf(k)[0]+' / 体'+baseOf(k)[1]+'</small>':'　<small>呪文</small>'),value:k});
const uniq=L=>[...new Set(L)];
// 墓地から選ぶ（AI用）：コストの高い仲間 → 攻撃力の高い仲間
function graveRank(f,L){return [...L].sort((a,b)=>(isSum(b)?1:0)-(isSum(a)?1:0)||costOf(b)-costOf(a)||baseOf(b)[0]-baseOf(a)[0])}
function threatenedUnit(f){let d=foeOf(f),mx=Math.max(0,...d.units.map(u=>atkOf(u))),h=heroOf(f);if(!f.shrines.length&&h)return h;let L=mates(f).filter(u=>u.hp<=mx).sort((a,b)=>threat(b)-threat(a));return L[0]||mates(f).sort((a,b)=>threat(b)-threat(a))[0]||h}
async function runAsk(fn){pendingAsk=new Promise(r=>setTimeout(async()=>{try{await fn()}catch(e){console.error(e)}pendingAsk=null;render();r()},0))}

// ==== 仲間27種・呪文28種の新しい効果：登場時・呪文・AI ====
// 登場時の効果（書き換えたカードのみ。登場時の効果がなくなったカードはここに無い）
onEnter=function(f,u){let d=foeOf(f),auto=autoSide(f);
 // 雲紡ぎのアヤ：天候を変えてもよい。変えたら、味方1体の受けるダメージ−1（次の相手のターンまで）
 if(u.id==='sky-1'){const after=(w,t)=>{if(!w)return;sky(w);latest+='　天候を'+w+'にした';t=t||threatenedUnit(f);if(t){addBarrier(t,'sky-1',1);latest+='　'+names[t.id]+'は受けるダメージ−1'}};
  if(auto){let want=weatherWant(f);after(want)}
  else runAsk(async()=>{let w=await askChoice('雲紡ぎのアヤ（登場時）','天候を変えますか？　いまは「'+weather+'」<br><small>変えたら、味方1体は次の相手のターンまで受けるダメージ−1</small>',[{label:'☀ 晴れにする',value:'晴れ'},{label:'☂ 雨にする',value:'雨'}].filter(x=>x.value!==weather),'変えない');if(!w)return;
   let t=await askChoice('雲紡ぎのアヤ','受けるダメージを1減らす味方を選ぶ',f.units.filter(x=>x.hp>0).map(unitOpt));after(w,t)})}
 // 月神ツクヨ：自分の墓地の仲間1体を手札に戻す
 if(u.id===9){let L=uniq(graveAllies(f));if(!L.length)latest+='　月神ツクヨ：墓地に仲間がいない';
  else{const go=k=>{let i=f.grave.lastIndexOf(k);if(i<0)return;f.grave.splice(i,1);f.hand.push(k);latest+='　月神ツクヨ：墓地の'+cardLabel(k)+'を手札に戻した'};
   if(auto||L.length===1)go(auto?graveRank(f,L)[0]:L[0]);else runAsk(async()=>{let k=await askChoice('月神ツクヨ（登場時）','手札に戻す墓地の仲間を選ぶ',L.map(keyOpt));go(k||graveRank(f,L)[0])})}}
 // 苗神：神力を2回復
 if(u.id==='earth-7')gainMana(f,2,'苗神');
 // 面削りの童神：自分の他の仲間1体を生贄にしてもよい。したら敵の仲間1体に3ダメージ
 if(u.id==='mystic-1'){let own=mates(f).filter(x=>x!==u),foes=mates(d);
  if(own.length&&foes.length){const go=(m,t)=>{if(!m||!t)return;sacrifice(m);let n=hurt(t,3);latest+='　面削りの童神：'+names[m.id]+'を生贄に、'+names[t.id]+'に'+n+'ダメージ';settle(f,d)};
   if(auto){let t=foes.filter(x=>!x.ward&&x.hp<=3-dmgCut(x)).sort((a,b)=>threat(b)-threat(a))[0],m=[...own].sort((a,b)=>threat(a)-threat(b))[0];if(t&&m&&threat(t)>=threat(m))go(m,t)}
   else runAsk(async()=>{let m=await askChoice('面削りの童神（登場時）','生贄にする自分の仲間を選ぶ（しなくてもよい）',own.map(unitOpt),'生贄にしない');if(!m)return;let t=await askChoice('面削りの童神','3ダメージを与える敵の仲間を選ぶ',mates(d).map(unitOpt));if(t){let before=snap();go(m,t);render();await diffFx(before)}})}}
 // 薄暮の呪い手：自分の墓地の仲間1体を、体力半分（切り上げ）で場に戻す
 if(u.id==='mystic-6'){let L=uniq(graveAllies(f));if(!L.length)latest+='　薄暮の呪い手：墓地に仲間がいない';else if(f.units.length>=3)latest+='　薄暮の呪い手：場がいっぱいで戻せない';
  else{const go=k=>{let r=revive(f,k,Math.ceil(baseOf(k)[1]/2));if(r)latest+='　薄暮の呪い手：'+names[r.id]+'を体力'+r.hp+'で場に戻した'};
   if(auto||L.length===1)go(auto?graveRank(f,L)[0]:L[0]);else runAsk(async()=>{let k=await askChoice('薄暮の呪い手（登場時）','場に戻す墓地の仲間を選ぶ（体力は半分）',L.map(keyOpt));go(k||L[0])})}}
 // 写し神：自分の墓地の仲間1体を選び、その攻撃力と体力になる
 if(u.id==='mystic-7'){let L=uniq(graveAllies(f));if(!L.length)latest+='　写し神：墓地に仲間がいないので、攻撃力0・体力3のまま';
  else{const go=k=>{let [a,h]=baseOf(k);u.atk=a;u.max=h;u.hp=h;u.copyOf=sumId(k);latest+='　写し神：'+cardLabel(k)+'を写した（攻'+a+' / 体'+h+'）'};
   if(auto||L.length===1)go(auto?[...L].sort((a,b)=>(baseOf(b)[0]*2+baseOf(b)[1])-(baseOf(a)[0]*2+baseOf(a)[1]))[0]:L[0]);else runAsk(async()=>{let k=await askChoice('写し神（登場時）','写す墓地の仲間を選ぶ（攻撃力と体力が同じになる）',L.map(keyOpt));go(k||L[0])})}}};
// 天候を変えたいか（AI）：天候で守りが働く仲間がいる／招雷・雲間の返照を持っているとき
function weatherWant(f){let trig=f.units.some(u=>(u.id==='sky-2'&&!u.trig2)||(u.id==='sky-6'&&!u.trigS6)||u.id==='sky-7');
 if(weather!=='雨'&&(f.hand.includes('bolt')||f.hand.includes('sky-4')||f.hand.includes('sky-8')))return '雨';
 if(weather==='雨'&&f.units.some(u=>u.id===8))return '晴れ';
 return trig?(weather==='雨'?'晴れ':'雨'):null}
// 天候が変わったとき：霹靂を喰う天狗（味方すべて−1・各ターン初回）／嵐呼の雷獣（主神−2・各ターン初回）／霙神（自身−2）
sky=function(value){let changed=value!==weather;weather=value;if(!changed||!turn||ending)return;
 for(const s2 of [p,c]){if(!s2)continue;for(const u of s2.units){if(u.hp<=0)continue;
  if(u.id==='sky-7'){addBarrier(u,'sky-7',2);latest+='　霙神は受けるダメージ−2'}
  if(u.id==='sky-2'&&!u.trig2){u.trig2=true;s2.units.forEach(x=>addBarrier(x,'sky-2',1));latest+='　霹靂を喰う天狗：味方すべて受けるダメージ−1'}
  if(u.id==='sky-6'&&!u.trigS6){u.trigS6=true;let h=heroOf(s2);if(h){addBarrier(h,'sky-6',2);latest+='　嵐呼の雷獣：'+names[h.id]+'は受けるダメージ−2'}}}}};
{const rt2=resetTurn;resetTurn=function(f){let r=rt2.apply(this,arguments);for(const s of [p,c])if(s)for(const u of s.units){u.trig2=false;u.trigS6=false}return r}}

// ---- 呪文 ----
moves.scroll[1]=1;// 神位継承の巻：表示はX。使うには神力1以上、使うと残りもすべて消費
const best=(L,fn)=>[...L].sort((a,b)=>fn(b)-fn(a))[0]||null;
Object.assign(SP,{
 // 天象：守り（直接ダメージはなし）
 bolt:{tgt:'ally',can:f=>weather==='雨',ok:(f,t)=>!t.ward,run:(f,t)=>{t.ward=true;latest+='　'+names[t.id]+'が次に受けるダメージは0'},why:'天候が「雨」のときだけ使える',ai:f=>{let t=threatenedUnit(f);return t&&!t.ward&&foeOf(f).units.some(u=>atkOf(u)>0)?t:null}},
 'sky-3':{tgt:'ally',run:(f,t)=>{sky('雨');addBarrier(t,'sky-3',1);latest+='　雨になった・'+names[t.id]+'は受けるダメージ−1'},ai:f=>foeOf(f).units.some(u=>atkOf(u)>0)||weatherWant(f)==='雨'?threatenedUnit(f):null},
 'sky-8':{tgt:'ally',run:(f,t)=>{let n=weather==='雨'?2:1;addBarrier(t,'sky-8',n);latest+='　'+names[t.id]+'は受けるダメージ−'+n},ai:f=>foeOf(f).units.some(u=>atkOf(u)>0)?threatenedUnit(f):null},
 'sky-4':{can:f=>weather==='雨',run:f=>{sky('晴れ');f.units.forEach(u=>addBarrier(u,'sky-4',1));latest+='　晴れになった・味方すべて受けるダメージ−1'},why:'天候が「雨」のときだけ使える',ai:f=>foeOf(f).units.some(u=>atkOf(u)>0)?'none':null},
 'sky-5':{can:f=>f.shrines.length>0,run:f=>{f.shrineBar=2;latest+='　自分の神殿は次の相手のターンまで受けるダメージ−2'},why:'神殿が残っているときだけ使える',ai:f=>f.shrines.length&&foeOf(f).units.some(u=>atkOf(u)>0&&atkOf(u)<=2+shrineCut(f))?'none':null},
 rain:{can:f=>true,run:f=>sky('雨'),ai:f=>weatherWant(f)==='雨'?'none':null},
 sun:{can:f=>true,run:f=>sky('晴れ'),ai:f=>weatherWant(f)==='晴れ'?'none':null},
 // 大地：神力ブースト
 'earth-3':{tgt:'allyMate',run:(f,t)=>{t.tmpAtk=(t.tmpAtk||0)+f.max;latest+='　'+names[t.id]+'の攻撃力+'+f.max+'（このターン）'},ai:f=>best(mates(f).filter(u=>!u.used&&!sickOf(f,u)),u=>atkOf(u))},
 'earth-4':{can:f=>!!f.manaUp&&f.deck.length>0,run:f=>drawN(f,1),why:'このターンに自分の神力が増えていれば使える'},
 'earth-5':{can:f=>f.max>=5&&mates(f).length>0,run:f=>{let L=mates(f);L.forEach(u=>u.tmpAtk=(u.tmpAtk||0)+2);latest+='　'+L.length+'体の攻撃力+2（このターン）'},why:'神力の供給量（最大値）が5以上のときだけ使える',ai:f=>mates(f).some(u=>!u.used&&!sickOf(f,u))?'none':null},
 scroll:{tgt:'allyMate',run:(f,t)=>{let n=1+f.mp;f.mp=0;t.atk+=n;t.max+=n;t.hp+=n;latest+='　神力を'+n+'消費し、'+names[t.id]+'の攻撃力と体力+'+n},post:true,ai:f=>f.mp>=3?best(mates(f),u=>threat(u)):null},
 // 奔流：場のコントロール
 'water-3':{tgt:'allyMate',run:(f,t)=>{bounce(f,t)},ai:f=>{let left=f.mp-1;let L=mates(f).filter(u=>left>=costOf(handKey(u.id)));
   let reuse=L.filter(u=>ENTER_VALUE(f,u)>0).sort((a,b)=>ENTER_VALUE(f,b)-ENTER_VALUE(f,a))[0];if(reuse)return reuse;
   let mx=Math.max(0,...foeOf(f).units.map(atkOf));return L.filter(u=>u.hp<u.max&&u.hp<=mx&&u.max>mx).sort((a,b)=>threat(b)-threat(a))[0]||null}},
 'water-5':{can:f=>(f.ctrl||0)>0&&f.deck.length>0,run:f=>drawN(f,2),why:'このターンに、敵の仲間が手札に戻るか攻撃できなくなっていれば使える',post:true},
 'water-8':{tgt:'foeMate',run:(f,t)=>{bounce(foeOf(f),t);f.ctrl=(f.ctrl||0)+1},ai:f=>best(mates(foeOf(f)),u=>threat(u))},
 // 神秘：墓地
 guard:{tgt:'allyMate',ok:(f,t)=>!t.saveToHand,run:(f,t)=>{t.saveToHand=true;latest+='　'+names[t.id]+'は次に場を離れるとき手札に戻る'},ai:f=>{let mx=Math.max(0,...foeOf(f).units.map(atkOf));return best(mates(f).filter(u=>!u.saveToHand&&(u.hp<=mx||ENTER_VALUE(f,u)>0)),u=>threat(u)+ENTER_VALUE(f,u)*3)}},
 'mystic-3':{tgt:'allyMate',can:f=>mates(foeOf(f)).length>0,run:(f,t)=>{let d=foeOf(f),n0=atkOf(t),tg=f.pick2&&d.units.includes(f.pick2)?f.pick2:best(mates(d).filter(x=>x.hp<=n0-dmgCut(x)),x=>threat(x))||best(mates(d),x=>atkOf(x));f.pick2=null;sacrifice(t);settle(f);let n=tg?hurt(tg,n0):0;latest+='　'+names[t.id]+'を墓地に送り、'+(tg?names[tg.id]+'に'+n+'ダメージ':'')},why:'敵の仲間がいるときだけ使える',
   ai:f=>{let d=foeOf(f);let pick=null;for(const m of [...mates(f)].sort((a,b)=>threat(a)-threat(b))){let n=atkOf(m),t=best(mates(d).filter(x=>!x.ward&&x.hp<=n-dmgCut(x)),x=>threat(x));if(t&&threat(t)>threat(m)){pick=m;break}}return pick}},
 'mystic-4':{tgt:'allyMate',run:(f,t)=>{let k=handKey(t.id);sacrifice(t);settle(f);if((f.grave||[]).includes(k)){f.utsusemi=(f.utsusemi||[]).concat(k);latest+='　'+names[t.id]+'を墓地に送った（次の自分のターン開始時に戻る）'}},
   ai:f=>{let mx=Math.max(0,...foeOf(f).units.map(atkOf));return best(mates(f).filter(u=>u.hp<=Math.ceil(u.max/2)&&u.hp<=mx),u=>threat(u))}},
 'mystic-8':{can:f=>(f.grave||[]).length>0,run:f=>{let L=f.grave||[],k=f.pick2&&L.includes(f.pick2)?f.pick2:graveRank(f,L)[0];f.pick2=null;let i=L.lastIndexOf(k);if(i>=0){L.splice(i,1);f.hand.push(k);latest+='　墓地の'+cardLabel(k)+'を手札に戻した'}},why:'墓地にカードがあるときだけ使える',ai:f=>graveAllies(f).length?'none':null},
 'mystic-5':{tgt:'foeMate',can:f=>graveAllies(f).length>0,run:(f,t)=>{let n=hurt(t,Math.min(5,graveAllies(f).length));latest+='　'+names[t.id]+'に'+n+'ダメージ'},why:'墓地に仲間がいるときだけ使える',ai:f=>{let n=Math.min(5,graveAllies(f).length);return best(mates(foeOf(f)),u=>(u.hp<=n-dmgCut(u)?100:0)+threat(u))}}
});
{const sd=SP.seed.run;SP.seed.run=function(f){let b=f.mp;sd.apply(this,arguments);if(f.mp>b)manaUpHook(f)}}
// もう一度出すと得をする登場時の効果（追い潮・守護のAI判断用）
function ENTER_VALUE(f,u){let d=foeOf(f);if(u.id===9)return graveAllies(f).length?3:0;if(u.id==='mystic-6')return graveAllies(f).length?4:0;if(u.id==='mystic-1')return mates(d).some(x=>x.hp<=3)&&mates(f).length>1?3:0;
 if(u.id==='mystic-7')return graveAllies(f).some(k=>baseOf(k)[0]>atkOf(u))?2:0;if(u.id==='earth-7')return 1;if(u.id==='sky-1')return 1;return 0}
// 2つ目の対象を選ぶ呪文（影の縫い返しの敵・心読みの墓地のカード）：あなたの番だけ、使う前に選ぶ
{const cs=castSpell;castSpell=async function(f,i,t){let k=f.hand[i];
 if(!autoSide(f)&&k==='mystic-3'){let L=mates(foeOf(f));if(L.length>1){let t2=await askChoice('影の縫い返し','ダメージを与える敵の仲間を選ぶ（'+names[t.id]+'の攻撃力'+atkOf(t)+'）',L.map(unitOpt),'やめる');if(!t2){skillMode=null;render();return}f.pick2=t2}else f.pick2=L[0]}
 return cs.apply(this,arguments)}}
{const dp=doPlay;doPlay=async function(f,i,t){let k=f.hand[i];
 if(!autoSide(f)&&k==='mystic-8'){let L=uniq(f.grave||[]);if(L.length>1){let k2=await askChoice('心読み','手札に戻す墓地のカードを選ぶ',L.map(keyOpt),'やめる');if(!k2)return false;f.pick2=k2}}
 return dp.apply(this,arguments)}}
// 逆夢の獏神：攻撃するとき、墓地の仲間1体を取り除いてもよい（その攻撃力だけダメージが増える）
{const sk=strike;strike=async function(f,u,d,v){if(false&&u&&u.id==='mystic-2'&&v&&graveAllies(f).length&&!ending)/* 2026-11-28 BP：獏神の除外は廃止（断末魔に作り替え） */{let L=uniq(graveAllies(f)),k=null;
  if(autoSide(f)){let top=[...L].sort((a,b)=>baseOf(b)[0]-baseOf(a)[0])[0],n=atkOf(u)-dmgCut(v);if(v.hero||(v.hp>n&&v.hp<=n+baseOf(top)[0]))k=top}
  else k=await askChoice('逆夢の獏神','墓地の仲間1体をゲームから取り除きますか？<br><small>取り除いた仲間の攻撃力だけ、この攻撃のダメージが増える</small>',L.map(keyOpt),'取り除かない');
  if(k&&exile(f,k)){u.exileBonus=baseOf(k)[0];latest='逆夢の獏神：'+cardLabel(k)+'を取り除いた（ダメージ+'+u.exileBonus+'）';render()}}
 return sk.apply(this,arguments)}}

// ---- AIの標準デッキ：その色の全カードを1枚ずつ → 仲間から2枚目 → 呪文の2枚目（20枚）。足りなければ色なし → 他の色の安い仲間 ----
standardDeck=function(id){let col=GOD_CARDS[id].type,own=k=>save.cards.filter(x=>x[0]===k).length,ally=k=>typeof k==='number'||isSum(k);
 let pool=[...SET_ALL.allies,...SET_ALL.spells].filter(battleReady).filter(k=>own(k)>0),mine=pool.filter(k=>colorOf(k)===col),order=[...mine.filter(ally),...mine.filter(k=>!ally(k))];
 let deck=[],cnt=k=>deck.filter(x=>x===handKey(k)).length,add=k=>{if(deck.length<20&&cnt(k)<Math.min(2,own(k)))deck.push(handKey(k))};
 order.forEach(add);order.forEach(add);pool.filter(k=>!colorOf(k)).forEach(k=>{add(k);add(k)});pool.filter(k=>colorOf(k)&&colorOf(k)!==col&&ally(k)).sort((a,b)=>costOf(handKey(a))-costOf(handKey(b))).forEach(k=>{add(k);add(k)});return deck};

// ---- 状態の表示：守護（手札に戻る）・神殿の軽減 ----
{const us2=unitStatus;unitStatus=function(f,u){let t=us2.apply(this,arguments);if(u.saveToHand)t.unshift('守護：次に場を離れるとき、墓地に行かず手札に戻る');if(u.id===11)t.push('墓地の仲間'+graveAllies(f).length+'体：攻撃力+'+subaruBonus(u));return t}}
{const rr2=render;render=function(){let r=rr2.apply(this,arguments);try{for(const s of [p,c]){if(!s)continue;
  for(const u of s.units)if(u.saveToHand){let e=document.getElementById('u'+u.uid);if(e&&!e.querySelector('.ribbon.keep')){let box=e.querySelector('.ribbons2');if(!box){e.insertAdjacentHTML('beforeend','<span class="ribbons2"></span>');box=e.querySelector('.ribbons2')}box.insertAdjacentHTML('beforeend','<em class="ribbon keep">守護</em>')}}
  let n=shrineCut(s),row=document.getElementById('shrine'+s.id);if(row&&n>0&&!row.querySelector('.shrinecut'))row.insertAdjacentHTML('beforeend','<em class="shrinecut" title="'+shrineCutName(s)+'">神殿 −'+n+'</em>')}}catch(e){console.warn(e)}return r}}

// ==== 調整（2026-11-28 BJ計測後）：変えるのは次の3点だけ ====
// 1. 軽減は「その対象に効いている軽減の中で最も大きい値」だけを適用（足し算しない）。仲間・主神・神殿すべて同じ
addBarrier=function(u,src,n){u.bar=u.bar||{};u.bar[src]=Math.max(u.bar[src]||0,n);u.barrierN=Math.max(0,...Object.values(u.bar))};
dmgCut=function(v){let s=ownerOf(v);if(!s)return 0;return Math.max(heroFx(s).wall||0,v.barrierN||0)};
cutName=function(v){let s=ownerOf(v),x=s?heroFx(s):{},w=x.wall||0,b=v.barrierN||0;if(b>w){let src=Object.entries(v.bar||{}).sort((a,c)=>c[1]-a[1])[0];return src?({raiga:'結界','sky-1':'雲紡ぎのアヤ','sky-2':'霹靂を喰う天狗','sky-6':'嵐呼の雷獣','sky-7':'霙神','sky-3':'雨脚の矢','sky-8':'稲光','sky-4':'雲間の返照'}[src[0]]||'結界'):'結界'}return x.shrineWall?'天守':'雷壁'};
shrineCut=function(d){if(!d)return 0;return Math.max(heroFx(d).shrineWall||0,(weather==='晴れ'&&d.units.some(u=>u.id===8&&u.hp>0))?1:0,d.shrineBar||0)};
shrineCutName=function(d){let a=heroFx(d).shrineWall||0,b=(weather==='晴れ'&&d.units.some(u=>u.id===8&&u.hp>0))?1:0,c2=d.shrineBar||0,m=Math.max(a,b,c2);return m===a&&a?'天守':m===c2&&c2?'天柱落とし':m===b&&b?'陽神アカツキ':'軽減'};
// 2. 星神スバル・逆さ月の宣告：墓地の「カード」の数（呪文も数える）。墓地の仲間を対象に取る効果は変えない
const graveCount=f=>(f&&f.grave||[]).length;
subaruBonus=function(u){let s=ownerOf(u);return s?Math.min(3,graveCount(s)):0};
Object.assign(SP['mystic-5'],{can:f=>graveCount(f)>0,run:(f,t)=>{let n=hurt(t,Math.min(5,graveCount(f)));latest+='　'+names[t.id]+'に'+n+'ダメージ'},why:'墓地にカードがあるときだけ使える',
 ai:f=>{let n=Math.min(5,graveCount(f));return best(mates(foeOf(f)),u=>(u.hp<=n-dmgCut(u)?100:0)+threat(u))}});
{const us3=unitStatus;unitStatus=function(f,u){let t=us3.apply(this,arguments);if(u.id===11)t=t.map(x=>/^墓地の仲間\d+体：攻撃力/.test(x)?'墓地のカード'+graveCount(f)+'枚：攻撃力+'+subaruBonus(u):x);return t}}
// 3. 氷神ユキネ（奔流／U／コスト3／攻2／体5）：登場したとき、敵の仲間1体は次の相手のターンに攻撃できない
gods[4]=[2,5];ALLY_COST[4]=3;
{const oe2=onEnter;onEnter=function(f,u){let r=oe2.apply(this,arguments);if(u.id===4){let d=foeOf(f),L=mates(d).filter(x=>!x.bindNext);
  const go=t=>{if(t){bindFoe(f,t);latest+='　氷神ユキネ：'+names[t.id]+'は次の相手のターンに攻撃できない'}};
  if(!L.length)latest+='　氷神ユキネ：敵の仲間がいない';else if(autoSide(f)||L.length===1)go(best(L,x=>atkOf(x)));else runAsk(async()=>{let t=await askChoice('氷神ユキネ（登場時）','次の相手のターンに攻撃できなくする敵の仲間を選ぶ',L.map(unitOpt));go(t||best(L,x=>atkOf(x)))})}return r}}
// 大地の神力回復は、供給量（最大値）まで（種まきと同じ。2026-11-28 確定）
gainMana=function(f,n,src){if(n<=0||!f)return;let b=f.mp;f.mp=Math.min(f.max,f.mp+n);let up=f.mp-b;if(up>0){latest+='　'+src+'：神力を'+up+'回復';manaUpHook(f)}};

// ==== 軽減の統一ルール（2026-11-28 BL）：軽減は「盾」＝次に受けるダメージ1回分だけ引いて、消える ====
// ・対象ごとに1つだけ。別の軽減が付いたら大きい方に置き換える（小さい方では上書きしない）
// ・通常攻撃・効果ダメージ・呪文すべてで消費。ダメージを受けるまでは、ターンが終わっても残る
// ・常駐型（雷壁・天守・陽神アカツキ）は「自分のターン開始時に付け直す」
// ・前回の「効いている間ずっと、最も大きい値だけ適用」はこの形に置き換え
addBarrier=function(u,src,n){if(!u||!(n>0))return;u.shield=Math.max(u.shield||0,n)};
function useShield(v,amount){let s=ownerOf(v);v.shield=0;if(window.__onShield&&s&&amount>0)__onShield(s,amount)}
dmgCut=function(v){return v&&v.shield||0};
cutName=function(){return '軽減'};
function addShrineShield(d,n){if(!d)return;d.shrineSh=d.shrines.map((_,i)=>Math.max((d.shrineSh&&d.shrineSh[i])||0,n))}
shrineCut=function(d){return d&&d.shrineSh&&d.shrineSh[0]||0};
shrineCutName=function(){return '軽減'};
// 効果・呪文のダメージ：盾を先に使う（残りがあれば、そのあと招雷の「次のダメージ0」）
{const h1=hurt;hurt=function(v,n){if(n>0&&v&&v.shield>0){let cut=Math.min(v.shield,n);n-=cut;useShield(v,cut);if(n===0){zeroWhy='軽減';return 0}}
 let w=v.barrierN;v.barrierN=0;try{return h1.call(this,v,n)}finally{v.barrierN=w}}}
// 古い「ずっと効く」軽減の値は使わない（盾だけで判定する）
{const b4=begin;begin=function(f){let r=b4.apply(this,arguments);for(const s of [p,c])if(s)for(const u of s.units)u.barrierN=0;return r}}
// 身代わりで神殿が割れたら、神殿の盾もずらす
{const sb=substitute;substitute=function(side){let n=side&&side.shrines?side.shrines.length:0,r=sb.apply(this,arguments);if(side&&side.shrineSh&&side.shrines.length<n)side.shrineSh.splice(0,n-side.shrines.length);return r}}
// 自分のターン開始時の付け直し：雷壁（味方全員−1）／天守（味方全員と神殿すべて−2）／陽神アカツキ（晴れの間、神殿すべて−1）
{const ts3=turnStart;turnStart=function(f){let r=ts3.apply(this,arguments);if(!f||ending)return r;let x=heroFx(f);
 if(x.wall){f.units.forEach(u=>addBarrier(u,'wall',x.wall))}if(x.shrineWall)addShrineShield(f,x.shrineWall);
 if(weather==='晴れ'&&f.units.some(u=>u.id===8&&u.hp>0))addShrineShield(f,1);return r}}
// 天柱落とし：自分の神殿すべてに −2
SP['sky-5'].run=f=>{addShrineShield(f,2);latest+='　自分の神殿すべてに「次に受けるダメージ−2」'};
SP['sky-5'].ai=f=>f.shrines.length&&shrineCut(f)<2&&foeOf(f).units.some(u=>atkOf(u)>0)?'none':null;
// 軽減を付ける呪文のAI：すでに同じか大きい軽減がある味方には付けない（付け直しても増えないため）
for(const [k,n] of [['sky-3',1],['sky-8',1]]){const a0=SP[k].ai;SP[k].ai=f=>{let t=a0(f);if(!t||t==='none')return t;let need=k==='sky-8'&&weather==='雨'?2:n;if((t.shield||0)>=need){let L=f.units.filter(u=>u.hp>0&&(u.shield||0)<need);return L.length?threatenedUnit({...f,units:L,shrines:f.shrines})||L[0]:null}return t}}
{const ap=aiSkillPlan;aiSkillPlan=function(f,k,ph){let pl=ap.apply(this,arguments);if(pl&&k.kind==='barrier'&&pl.t&&(pl.t.shield||0)>=k.n){let L=f.units.filter(u=>u.hp>0&&(u.shield||0)<k.n).sort((a,b)=>(b.hero?1:0)-(a.hero?1:0)||threat(b)-threat(a));pl=L.length?{t:L[0]}:null}return pl}}
// AIの攻撃：軽減は1回で消える前提。相手に盾があれば、攻撃力の低い味方から先に当てて盾を外し、強い味方で倒す
{const prevAttack=aiAttack;aiAttack=async function(f){let d=foeOf(f);
 if(!ending&&canSkill(f)){aiPhase='post';try{await useSkill(f,null)}finally{aiPhase='pre'}}if(ending)return;
 const shielded=()=>d.units.some(u=>u.shield>0)||shrineCut(d)>0;
 let order=shielded()?[...f.units].sort((a,b)=>atkOf(a)-atkOf(b)):[...f.units];
 for(let u of order){for(let n=0;n<4&&!ending&&!u.used&&u.hp>0&&!sickOf(f,u)&&f.units.includes(u);n++){let ok=v=>!(v.dodge&&!u.hero),eff=v=>Math.max(0,atkOf(u)+(fxOf(f,u).extra||0)-(v.shield||0)),v;
  let h=heroOf(d),kill=mates(d).filter(x=>ok(x)&&x.hp<=eff(x)&&!x.ward).sort((a,b)=>threat(b)-threat(a));
  if(!d.shrines.length)v=h;else if(!heroLocked(f,u,d)&&h&&h.hp<=eff(h)&&!h.ward)v=h;else v=kill[0]||null;
  // 倒せる相手がいなくて、盾つきの仲間を後ろの味方が倒せるなら、この攻撃で盾を外す
  if(!v&&d.shrines.length){let strong=f.units.filter(x=>x!==u&&!x.used&&x.hp>0&&!sickOf(f,x)),pop=mates(d).filter(x=>ok(x)&&x.shield>0&&!x.ward&&strong.some(s=>atkOf(s)>=x.hp)).sort((a,b)=>threat(b)-threat(a))[0];if(pop&&shrineCut(d)<atkOf(u))v=pop}
  if((!v||v.hero)&&!firstHit(u)){v=kill[0]||null;if(!v)break}
  await strike(f,u,d,v)}}}}
// 表示：軽減の印（盾マーク＋数字）。受けて消えたら印も消える
const SHIELD_SVG='<svg viewBox="0 0 16 18" width="10" height="11" aria-hidden="true"><path d="M8 1 15 3.6v5c0 4.3-3 7.2-7 8.4C4 15.8 1 12.9 1 8.6v-5Z" fill="currentColor"/></svg>';
{const us4=unitStatus;unitStatus=function(f,u){let t=us4.apply(this,arguments).filter(x=>!/^(結界|雷壁|天守)：/.test(x));if(u.shield)t.unshift('軽減：次に受けるダメージ−'+u.shield+'（受けたら消える）');return t}}
{const rr3=render;render=function(){let r=rr3.apply(this,arguments);try{for(const s of [p,c]){if(!s)continue;
  for(const u of s.units){let e=document.getElementById('u'+u.uid);if(!e)continue;e.querySelectorAll('.ribbon.barrier').forEach(x=>x.remove());if(u.shield>0&&!e.querySelector('.shieldmark'))e.insertAdjacentHTML('beforeend','<em class="shieldmark" title="次に受けるダメージ−'+u.shield+'" aria-label="軽減 −'+u.shield+'">'+SHIELD_SVG+'−'+u.shield+'</em>')}
  let row=document.getElementById('shrine'+s.id),b=row&&row.querySelector('.shrinecut');if(b){let n=shrineCut(s),k=(s.shrineSh||[]).filter(x=>x>0).length;b.innerHTML=SHIELD_SVG+'−'+n+(k>1?' ×'+k:'');b.title='神殿の軽減（次に受けるダメージ−'+n+'）'}}}catch(e){console.warn(e)}return r}}

// ==== 調整（2026-11-28 BM）：神位継承の巻の上げ幅は最大+4（神力の消費は今までどおり全額）====
SP.scroll.run=(f,t)=>{let n=1+f.mp,up=Math.min(4,n);f.mp=0;t.atk+=up;t.max+=up;t.hp+=up;latest+='　神力を'+n+'消費し、'+names[t.id]+'の攻撃力と体力+'+up+(n>up?'（最大+4）':'')};

// ==== 調整（2026-11-28 BN）：先攻の1ターン目は、大地の神力ブースト（増やす・回復する）が使えない ====
// 先攻＝対戦開始時に最初に行動する側（この対戦ではいつも自分）。手札を神力に置く基本ルールは対象外
let firstSide=null;
{const s5=start;start=function(){let r=s5.apply(this,arguments);firstSide=p;return r}}
const firstTurn=f=>!!f&&f===firstSide&&(f.turns||0)<=1&&round===1;
const EARTH_BAN='先攻の1ターン目は、大地の神力ブーストは使えない';
{const gm2=gainMana;gainMana=function(f,n,src){if(firstTurn(f)){latest+='　'+src+'：'+EARTH_BAN;return}return gm2.apply(this,arguments)}}
{const sc0=SP.seed.can;SP.seed.can=f=>!firstTurn(f)&&(sc0?sc0(f):true);SP.seed.why=EARTH_BAN}
{const cs2=canSkill;canSkill=function(f){if(firstTurn(f)){let k=skillOf(f);if(k&&k.kind==='grow')return false}return cs2.apply(this,arguments)}}
{const ha2=heroActs;heroActs=function(){let o=ha2.apply(this,arguments),k=skillOf(p);if(k&&k.kind==='grow'&&firstTurn(p))o=o.replace(k.name+' · 神力'+k.cost,k.name+'（先攻1ターン目は使えない）');return o}}

// ==== 神秘の立て直し（2026-11-28 BP）：断末魔／月神ツクヨ・逆夢の獏神・写し神 ====
ALLY_COST[9]=2;ALLY_COST['mystic-2']=2;EXP_CARDS['mystic-2'].cost=2;EXP_CARDS['mystic-7'].cost=1;
// 断末魔：仲間が墓地に送られたときに発動（守護で手札に戻るとき・手札に戻す効果・ゲームから取り除くときは発動しない）
const LAST_WORDS={
 // 月神ツクヨ：自分の墓地の仲間1体を手札に戻す（いま墓地に送られたこのツクヨ自身は除く）
 9:(s,u,k)=>{let L=[...(s.grave||[])];let self=L.lastIndexOf(k);if(self>=0)L.splice(self,1);L=L.filter(x=>isSum(x));if(!L.length){latest+='　断末魔（月神ツクヨ）：墓地に仲間がいない';return}
   let pick=graveRank(s,L)[0],i=s.grave.lastIndexOf(pick);if(i===self)i=s.grave.lastIndexOf(pick,i-1);if(i<0)return;s.grave.splice(i,1);s.hand.push(pick);latest+='　断末魔（月神ツクヨ）：墓地の'+cardLabel(pick)+'を手札に戻した'},
 // 逆夢の獏神：敵の仲間1体に3ダメージ（倒せる相手を優先）
 'mystic-2':(s,u)=>{let d=foeOf(s),L=mates(d);if(!L.length){latest+='　断末魔（逆夢の獏神）：敵の仲間がいない';return}
   let t=best(L.filter(x=>!x.ward&&x.hp<=3-dmgCut(x)),x=>threat(x))||best(L,x=>threat(x));let n=hurt(t,3);latest+='　断末魔（逆夢の獏神）：'+names[t.id]+'に'+n+'ダメージ'},
 // 写し神：自分の主神を2回復する
 'mystic-7':(s,u)=>{let h=heroOf(s);if(!h)return;let b=h.hp;h.hp=Math.min(h.max,h.hp+2);latest+='　断末魔（写し神）：'+names[h.id]+'を'+(h.hp-b)+'回復';if(window.__onLastWords)__onLastWords(s,u)}};
let lwDepth=0;
settle=function(...sides){let all=new Set(sides),lw=[];
 for(let k=0;k<6&&!ending;k++){let any=false;for(const s of [...all])for(const u of s.units)if(u.id==='fire-6'&&u.hp<=0&&!u.boomed){u.boomed=true;any=true;let d=foeOf(s);all.add(d);
  let t=[...d.units].filter(x=>x.hp>0&&!x.ward).sort((a,b)=>(a.hero?1:0)-(b.hero?1:0)||(a.hp<=2?-1:0)-(b.hp<=2?-1:0)||a.hp-b.hp)[0]||d.units.find(x=>x.hp>0);
  if(t){let n=hurt(t,2);latest+='　爆炎の剣神が倒れ、'+names[t.id]+'に'+n+'ダメージ'}}if(!any)break}
 for(const x of all)substitute(x);
 for(const x of all){for(const y of x.units)if(y.hp<=0&&!y.hero){if(y.saveToHand){x.hand.push(handKey(y.id));latest+='　守護：'+names[y.id]+'は手札に戻った'}else{let k=handKey(y.id);x.grave=x.grave||[];x.grave.push(k);if(LAST_WORDS[y.id])lw.push([x,y,k])}}x.units=x.units.filter(y=>y.hp>0||(y.hero&&ending))}
 // 断末魔の効果。ダメージで次の仲間が倒れたら、もう一度片付ける（連鎖は6段まで）
 if(lw.length&&!ending&&lwDepth<6){lwDepth++;try{let touched=new Set();for(const [s,u,k] of lw){if(ending)break;LAST_WORDS[u.id](s,u,k);touched.add(s);touched.add(foeOf(s))}if(!ending)settle(...touched)}finally{lwDepth--}}};
// 月神ツクヨ・写し神：登場時の効果はなくなった
{const oe3=onEnter;onEnter=function(f,u){if(u&&(u.id===9||u.id==='mystic-7'))return;return oe3.apply(this,arguments)}}
// ---- AI ----
// 生贄の材料：写し神（最優先）→ ツクヨ（墓地に仲間がいれば連れ戻せる）→ 獏神（断末魔3ダメージ）
const FODDER={'mystic-7':6,9:4,'mystic-2':3};
const fodder=u=>threat(u)-((u.id===9&&!graveAllies(ownerOf(u)).length)?1:(FODDER[u.id]||0))*3;
// 面削りの童神（AI）：生贄は材料から
{const oe4=onEnter;onEnter=function(f,u){if(u&&u.id==='mystic-1'&&autoSide(f)){let d=foeOf(f),own=mates(f).filter(x=>x!==u),foes=mates(d);
   if(own.length&&foes.length){let m=[...own].sort((a,b)=>fodder(a)-fodder(b))[0],t=best(foes.filter(x=>!x.ward&&x.hp<=3-dmgCut(x)),x=>threat(x));
    if(m&&t&&(FODDER[m.id]||threat(t)>=threat(m))){sacrifice(m);let n=hurt(t,3);latest+='　面削りの童神：'+names[m.id]+'を生贄に、'+names[t.id]+'に'+n+'ダメージ';settle(f,d)}}return}
  return oe4.apply(this,arguments)}}
// 生贄の冥火（AI）：材料がいれば、倒せなくても当てる（断末魔で取り返せるため）
{const ap2=aiSkillPlan;aiSkillPlan=function(f,k,ph){if(k.kind==='sac'&&ph!=='pre'){let d=foeOf(f),n=k.n,m=[...mates(f)].sort((a,b)=>fodder(a)-fodder(b))[0];if(!m)return null;
   let kill=best(mates(d).filter(u=>!u.ward&&u.hp<=n-dmgCut(u)),u=>threat(u)),t=kill||(!d.shrines.length&&!heroOf(d).ward?heroOf(d):null);
   if(!t&&FODDER[m.id])t=best(mates(d),u=>threat(u))||heroOf(d);if(!t)return null;if(!FODDER[m.id]&&m.hp<=n&&!t.hero&&atkOf(m)>atkOf(t))return null;return {mate:m,t}}
  return ap2.apply(this,arguments)}}
// 影の縫い返し（AI）：材料から送る／空蝉の歩法（AI）：断末魔持ちを送って、断末魔を使ってから次のターンに戻す
SP['mystic-3'].ai=f=>{let d=foeOf(f);for(const m of [...mates(f)].sort((a,b)=>fodder(a)-fodder(b))){let n=atkOf(m),t=best(mates(d).filter(x=>!x.ward&&x.hp<=n-dmgCut(x)),x=>threat(x));if(t&&(FODDER[m.id]||threat(t)>threat(m)))return m;if(FODDER[m.id]&&m.id!=='mystic-7'&&mates(d).length)return m}return null};
{const a4=SP['mystic-4'].ai;SP['mystic-4'].ai=f=>{let L=mates(f).filter(u=>(u.id==='mystic-2'&&mates(foeOf(f)).length)||(u.id===9&&graveAllies(f).length)||u.id==='mystic-7');return L[0]||a4(f)}}
// 獏神・ツクヨ（AI）：断末魔まで含めて攻撃先を選ぶ。反撃で倒れても得をするなら相打ちを狙う
{const aa3=aiAttack;aiAttack=async function(f){let d=foeOf(f);for(const u of f.units.filter(x=>(x.id==='mystic-2'||x.id===9)&&!x.used&&x.hp>0&&!sickOf(f,x))){if(ending)break;
   let foes=mates(d);if(!foes.length||!firstHit(u))continue;let eff=v=>Math.max(0,atkOf(u)-(v.shield||0));
   if(foes.some(v=>v.hp<=eff(v)&&!v.ward))continue;// 普通に倒せる相手がいれば通常の判断に任せる
   let ok=v=>!v.dodge&&atkOf(v)>=u.hp,gain=u.id==='mystic-2'?(v=>foes.some(o=>o!==v&&o.hp<=3-dmgCut(o)&&!o.ward)||v.hp-eff(v)<=3-0):(()=>graveAllies(f).length>0);
   let trade=best(foes.filter(v=>ok(v)&&gain(v)),v=>threat(v));if(trade)await strike(f,u,d,trade)}
  return aa3.apply(this,arguments)}}
