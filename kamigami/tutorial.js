// ==== チュートリアル：案内の巫女が1手ずつ教える練習バトル。新規セーブでは最初に自動で始まる ====
// 進め方：各ステップの「説明」を出し、wait があればその操作が済むまで待つ（なければ「次へ」）。
// 練習バトル：自分＝幼神ライガ（2ターン目の状態から）、相手＝幼神コダマ＋岩神ガンザ（体力2）、相手の神殿は2枚。
// 光らせる場所は「いま押すべき1か所」を毎回計算する（カードの拡大が開いていればその中のボタン、など）
const zoomKey=()=>{let z=document.querySelector('.handzoom:not(.confirm):not(.breach):not(.unitzoom)');return z&&sel>=0?p.hand[sel]:null};
function playTarget(k,then,btn){let zk=zoomKey();if(zk===k)return btn||'.handzoom .hz-btn.gold';if(zk||document.querySelector('.handzoom.unitzoom,.gdetail'))return '.handzoom [data-a=close],.gdetail .gd-close';if(skillMode&&skillMode.spell===k&&then)return then();return handSel(k)}
function attackTargetFor(getU){if(busy)return null;if(document.querySelector('.handzoom.unitzoom'))return '.handzoom [data-a=atk]:not([disabled]),.handzoom [data-a=close]';let u=getU();if(!u)return null;if(attacker===u.uid)return '#shrine'+c.id;if(attacker>=0||attackMode)return '#u'+u.uid;return '.atkbtn'}
const myHero=()=>heroOf(p),myGanza=()=>p.units.find(u=>u.id===6);
async function autoAttack(u){document.querySelectorAll('.handzoom').forEach(x=>x.remove());if(!u)return;attackMode=false;attacker=u.uid;u.used=false;await target(0)}
const TUT_STEPS=[
 {say:'ようこそ、『神々の一手』へ。わたしが戦い方を案内しますね。<br>勝ち方：<b>相手の神殿をすべて割り、最後に相手の本陣へ一撃</b>。この練習バトルで、実際に勝つところまでやってみましょう。'},
 {hl:()=>'#u'+myHero().uid,say:'これがあなたの<b>主神・幼神ライガ</b>。主神は手札から出すのではなく、<b>試合のはじめから場に召喚されています</b>。相手の主神（コダマ）も同じです。'},
 {hl:()=>'#shrine'+c.id,say:'これが相手の<b>神殿</b>（伏せたカード）。本番は5枚ですが、練習なので2枚にしてあります。'},
 {hl:()=>'.manazone.mine',say:'カードを使うには<b>神力</b>がいります。いまは3。毎ターン、最大まで回復します。'},
 {hl:()=>playTarget('draw',null,'.handzoom [data-a=charge]'),say:'神力の最大は、手札を<b>神力に置く</b>と増えます（1ターンに1枚）。光っている「神託」をタップして、「<b>神力に置く</b>」を押しましょう。',wait:()=>p.max>=4,
  auto:async()=>{closeHandZoom();let i=p.hand.indexOf('draw');if(i>=0)await chargeUI(p,i);else{p.max++;p.mp++}render()}},
 {hl:()=>playTarget('g6'),say:'神力が4になりました。次は仲間を呼びます。手札の<b>岩神ガンザ</b>をタップして「<b>召喚する</b>」！',wait:()=>!!myGanza(),
  auto:async()=>{closeHandZoom();let i=p.hand.indexOf('g6');if(i>=0)await doPlay(p,i)}},
 {hl:()=>'#u'+myGanza().uid,say:'出したばかりの仲間は<b>召喚酔い</b>。このターンは攻撃できず、次の自分のターンから戦えます。'},
 {hl:()=>playTarget('rain'),say:'まん中の<b>天候</b>はいま「晴れ」。手札の「<b>雨乞い</b>」を使って、雨にしましょう。',wait:()=>weather==='雨',
  auto:async()=>{closeHandZoom();let i=p.hand.indexOf('rain');if(i>=0)await doPlay(p,i);else sky('雨')}},
 {hl:()=>playTarget('bolt',()=>unitSel(c,6)),say:'相手の場にガンザがいる間は、神殿と主神を攻撃できません（<b>壁</b>）。<br>雨なら「<b>招雷</b>」が使えます。招雷を使い、相手のガンザをタップ！',wait:()=>!mates(c).length,
  auto:async()=>{closeHandZoom();skillMode=null;let i=p.hand.indexOf('bolt'),g=c.units.find(u=>u.id===6);if(i>=0&&g)await castSpell(p,i,g);else if(g){g.hp=0;settle(c,p);render()}}},
 {hl:()=>attackTargetFor(myHero),say:'壁がなくなりました。光っている所を順に：「<b>アタック</b>」→ 相手の<b>神殿</b>。ライガで攻撃します。',wait:()=>c.shrines.length<2&&!busy&&!document.querySelector('.handzoom'),
  auto:()=>autoAttack(myHero())},
 {hl:()=>'#u'+myHero().uid,say:'神殿を1枚割りました！ 割られた神殿のカードは、持ち主がコストなしで使えます（<b>破殿解放</b>）。<br>そしてライガの<b>進化ゲージ</b>がたまりました（攻撃を当てるたびに1増え、3で満タン）。'},
 {hl:()=>document.querySelector('.handzoom.confirm')?'.handzoom [data-a=end]':'.ends button.end',say:'このターンはここまで。「<b>ターン終了</b>」を押しましょう。',wait:()=>turn===c,
  auto:async()=>{document.querySelectorAll('.handzoom').forEach(x=>x.remove());if(turn===p&&!busy)enemyTurn()}},
 {hl:()=>document.querySelector('.handzoom.breach')?'.handzoom.breach .hz-btn.gold:not([disabled]),.handzoom.breach [data-a=hand]':null,say:'相手の番です……。あなたのガンザが壁になるので、相手は神殿や主神を攻撃できず、ガンザを狙ってきます。',wait:()=>turn===p&&!busy&&!document.querySelector('.handzoom'),noNext:true},
 {hl:()=>'button[onclick="ascendUI(p)"]',say:'あなたの番です。神力が回復しました。<br>進化ゲージが満タンなので、神力3で<b>主神を進化</b>できます。光っている「<b>進化</b>」を押しましょう！',wait:()=>p.stage>=1&&!busy,
  auto:async()=>{document.querySelectorAll('.handzoom').forEach(x=>x.remove());p.gauge=Math.max(p.gauge,ASCEND.evolve.gauge);p.mp=Math.max(p.mp,ASCEND.evolve.cost);await ascendUI(p)}},
 {hl:()=>'#u'+myHero().uid,say:'ライガが<b>解放形態</b>に進化しました！ 攻撃力と体力が上がり、スキルも強くなります。<br>さらに神殿が割られたあとなら、もう一段階「<b>覚醒</b>」もできます。'},
 {hl:()=>attackTargetFor(myGanza),say:'召喚酔いが解けたガンザで攻撃です。「<b>アタック</b>」→ <b>ガンザ</b> → 相手の<b>神殿</b>。これで最後の神殿です！',wait:()=>c.shrines.length===0&&!busy&&!document.querySelector('.handzoom'),
  auto:()=>autoAttack(myGanza())},
 {hl:()=>attackTargetFor(myHero),say:'相手の神殿はもうありません。進化したライガで、相手の<b>本陣</b>（神殿の場所）へ<b>とどめの一撃</b>！<br>「アタック」→ ライガ → 相手の本陣。',wait:()=>ending==='勝利',
  auto:()=>autoAttack(myHero())}
];
let TUT=null;
function handSel(k){let i=p.hand.indexOf(k);return i<0?null:'.handrail button:nth-of-type('+(i+1)+')'}
function unitSel(f,id){let u=f.units.find(x=>x.id===id);return u?'#u'+u.uid:null}
function tutorialStart(){if(typeof start!=='function')return;window.__tutorial=true;let ni=window.__noIntro;window.__noIntro=true;
 window.__storyFoe={id:5,stage:0,shrines:2,deck:['seed','seed','seed','seed','seed','seed','seed','seed']};
 start(2);window.__noIntro=ni;
 // 練習用に場を整える（2ターン目の状態。自分の主神はもう攻撃でき、進化ゲージは2/3）
 p.turns=2;round=2;p.max=p.mp=3;p.charged=false;p.hand=['draw','g6','rain','bolt'];p.gauge=2;weather='晴れ';c.shrines=['seed','seed'];c.hand=['seed'];
 let g=mk(c,6);g.hp=2;g.bornTurn=-5;c.units.push(g);c.turns=1;render();
 TUT={i:0,el:null,ring:null,timer:null,allow:null};tutGuardOn();tutDraw();TUT.timer=setInterval(tutTick,150)}
function tutDraw(){if(TUT)TUT.t=0;let s=TUT_STEPS[TUT.i];if(!TUT.el){TUT.el=document.createElement('div');TUT.el.className='tut-box';document.body.appendChild(TUT.el);TUT.ring=document.createElement('div');TUT.ring.className='tut-ring';document.body.appendChild(TUT.ring)}
  TUT.el.innerHTML='<img src="story/portraits/guide.webp" alt="" onerror="this.remove()"><div class="tut-txt"><b>案内の巫女</b><p>'+s.say+'</p><div class="tut-acts"><small>'+(TUT.i+1)+' / '+TUT_STEPS.length+'</small>'
 +(s.wait?(s.noNext?'':'<em>光っている所を押してね</em>')+(s.auto?'<button class="tut-help" onclick="tutAuto()" hidden>うまくいかない？ 代わりにやる</button>':''):'<button class="tut-next" onclick="tutNext()">'+(s.last?'はじめる':'次へ')+'</button>')+'<button class="tut-skip" onclick="if(this.dataset.ok){tutEnd(true)}else{this.dataset.ok=1;this.textContent=\'もう一度押すとスキップ\'}">スキップ</button></div></div>';tutRing()}
function tutRing(){if(!TUT)return;let s=TUT_STEPS[TUT.i],sel=s.hl&&s.hl(),el=sel&&[...document.querySelectorAll(sel)].find(e=>e.getClientRects().length);
 document.querySelectorAll('.tut-glow').forEach(e=>{if(e!==el)e.classList.remove('tut-glow')});TUT.allow=s.wait?el:null;if(el&&s.wait)el.classList.add('tut-glow');if(!el||!el.getClientRects().length){TUT.ring.style.display='none';tutPos(s,null);return}
 let r=el.getBoundingClientRect();TUT.ring.classList.toggle('below',r.top<90);TUT.ring.classList.toggle('info',!s.wait);Object.assign(TUT.ring.style,{display:'block',left:(r.left-6)+'px',top:(r.top-6)+'px',width:(r.width+12)+'px',height:(r.height+12)+'px'});
 // 説明の箱が光らせた場所に重ならないよう、上か下に寄せる
 let mid=(r.top+r.bottom)/2;tutPos(s,mid)}
function tutTick(){if(!TUT)return;if(ending){tutEnd(false);return}let s=TUT_STEPS[TUT.i];tutRing();TUT.t=(TUT.t||0)+1;if(TUT.t>45){let hb=TUT.el.querySelector('.tut-help');if(hb)hb.hidden=false}if(s.wait&&s.wait())tutNext()}
function tutNext(){if(!TUT)return;let s=TUT_STEPS[TUT.i];if(s.last){tutEnd(false);return}TUT.i++;
 // 先回りして済んでいる操作は飛ばす
 while(TUT_STEPS[TUT.i]&&TUT_STEPS[TUT.i].wait&&!TUT_STEPS[TUT.i].noNext&&TUT_STEPS[TUT.i].wait())TUT.i++;tutDraw()}
async function tutAuto(){if(!TUT||busy)return;let i0=TUT.i,s=TUT_STEPS[i0];if(!s.auto)return;try{busy=false;await s.auto()}catch(e){console.warn(e)}busy=false;render();if(!TUT||TUT.i!==i0)return;if(s.wait&&s.wait())tutNext();else{TUT.i++;tutDraw()}}
function tutEnd(skip){if(!TUT)return;clearInterval(TUT.timer);tutGuardOff();document.querySelectorAll('.tut-glow').forEach(e=>e.classList.remove('tut-glow'));TUT.el&&TUT.el.remove();TUT.ring&&TUT.ring.remove();TUT=null;save.tutorialDone=true;persist();
 if(skip&&!ending){latest='チュートリアルをスキップしました。このまま練習バトルを続けられます。';render()}}
function tutorialResult(){let won=ending==='勝利';if(TUT)tutEnd(false);save.tutorialDone=true;persist();tag.textContent='';
 app.innerHTML='<div class="scene resultscreen '+(won?'win':'lose')+'"><div class="sc-bg dim"></div><div class="sc-frame"></div><div class="rs-in"><p class="rs-sub">チュートリアル</p><h2 class="rs-title">'+(won?'勝利！':'おつかれさま')+'</h2>'
 +'<p class="rs-why">'+(won?'チュートリアル完了！ 神力・召喚・天候・壁・破殿解放・進化、これで基本はばっちりです。':'練習バトルはここまで。基本の流れはつかめましたか？')+'<br>次は「対戦する」で本番、「ストーリー」で神々との物語へ。</p>'
 +'<div class="rs-actions"><button class="btn-gold-s" onclick="window.__tutorial=false;ending=\'\';home()">ホームへ</button><button class="btn-navy" onclick="ending=\'\';tutorialStart()">もう一度</button></div></div></div>'}
function tutPos(s,mid){let p0=s.pos||(s.top?'low':mid==null?'top':mid<innerHeight*0.5?'low':'top');TUT.el.classList.toggle('low',p0==='low');TUT.el.classList.toggle('mid',p0==='mid')}

// ---- 指示以外は押せないようにする（説明の箱のボタンと、光っている所だけ反応） ----
function tutGuard(e){if(!TUT)return;let t=e.target;if(t.closest&&t.closest('.tut-box'))return;
 let st=TUT_STEPS[TUT.i],sel=st&&st.wait&&st.hl&&st.hl(),a=sel&&[...document.querySelectorAll(sel)].find(x=>x.getClientRects().length);if(a&&(a===t||a.contains(t)))return;
 e.preventDefault();e.stopPropagation();if(e.type==='click'){TUT.el&&TUT.el.classList.remove('nudge');void (TUT.el&&TUT.el.offsetWidth);TUT.el&&TUT.el.classList.add('nudge')}}
const TUT_EVENTS=['click','pointerdown','pointerup','mousedown','mouseup','touchstart','touchend','dragstart','dblclick','contextmenu'];
function tutGuardOn(){TUT_EVENTS.forEach(ev=>document.addEventListener(ev,tutGuard,{capture:true,passive:false}))}
function tutGuardOff(){TUT_EVENTS.forEach(ev=>document.removeEventListener(ev,tutGuard,{capture:true}))}
