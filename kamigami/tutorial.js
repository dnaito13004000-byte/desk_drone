// ==== チュートリアル：案内の巫女が1手ずつ教える練習バトル。新規セーブでは最初に自動で始まる ====
// 進め方：各ステップの「説明」を出し、wait があればその操作が済むまで待つ（なければ「次へ」）。
// 練習バトル：自分＝幼神ライガ（2ターン目の状態から）、相手＝幼神コダマ＋岩神ガンザ（体力2）、相手の神殿は2枚。
const TUT_STEPS=[
 {say:'ようこそ、『神々の一手』へ。わたしが戦い方を案内しますね。<br>勝ち方はかんたん：<b>相手の神殿をすべて割り、最後にもう一撃</b>で勝ちです。'},
 {hl:()=>'#shrine'+c.id,say:'これが相手の<b>神殿</b>（伏せたカード）。本番は5枚ですが、練習なので2枚にしてあります。'},
 {hl:()=>'.manazone.mine,.manazone.p,.zone.mine .manazone',say:'カードを使うには<b>神力</b>がいります。いまの神力は3。毎ターン最大まで回復します。'},
 {hl:()=>handSel('g6'),say:'手札の<b>岩神ガンザ</b>をタップして、大きく表示してみましょう。',wait:()=>!!document.querySelector('.handzoom:not(.confirm)')},
 {hl:()=>'.handzoom .hz-btn.gold',say:'「<b>召喚する</b>」を押すと、場に出せます。',wait:()=>p.units.some(u=>u.id===6),top:true},
 {hl:()=>unitSel(p,6),say:'出したばかりの仲間は<b>召喚酔い</b>。このターンは攻撃できず、次の自分のターンから戦えます。'},
 {pos:'top',hl:()=>'button.weather',say:'まん中は<b>天候</b>。いまは晴れです。手札の「<b>雨乞い</b>」を使って、雨にしてみましょう。',wait:()=>weather==='雨'},
 {pos:'mid',hl:()=>unitSel(c,6),say:'相手の場にガンザがいる間は、神殿と主神を攻撃できません（<b>壁</b>）。<br>雨の今なら「<b>招雷</b>」が使えます。手札の招雷で、ガンザに2ダメージ！',wait:()=>!mates(c).length},
 {hl:()=>'.atkbtn',say:'壁がなくなりました。「<b>アタック</b>」を押して、光った<b>ライガ</b>で相手の神殿をタップ！',wait:()=>c.shrines.length<2&&!busy&&!document.querySelector('.handzoom')},
 {say:'神殿を1枚割りました！<br>割られた神殿のカードは、持ち主がコストなしで使えます（<b>破殿解放</b>）。逆転の一手になることも。<br>さらに、割られた側の主神は<b>進化ゲージ</b>が1たまります。'},
 {hl:()=>'.ends button.end',say:'このターンにできることは終わりです。「<b>ターン終了</b>」を押しましょう。',wait:()=>turn===c},
 {say:'相手の番です。様子を見ていてください……',wait:()=>turn===p&&!busy&&!document.querySelector('.handzoom'),noNext:true},
 {say:'あなたの番が戻りました。<br>主神は倒れません。倒れるダメージを受けると、かわりに<b>神殿が1枚割れて</b>主神は全回復します。神殿が尽きたら負けです。'},
 {say:'あとは自由に戦ってみてください！<br>カードや天候をタップすると、いつでも説明が見られます。相手の神殿をすべて割って、最後の一撃を。',last:true}
];
let TUT=null;
function handSel(k){let i=p.hand.indexOf(k);return i<0?null:'.handrail button:nth-of-type('+(i+1)+')'}
function unitSel(f,id){let u=f.units.find(x=>x.id===id);return u?'#u'+u.uid:null}
function tutorialStart(){if(typeof start!=='function')return;window.__tutorial=true;let ni=window.__noIntro;window.__noIntro=true;
 window.__storyFoe={id:5,stage:0,shrines:2,deck:['g6','g6','seed','seed','guard','draw','draw','earth-4','g1','g1','rain','sun','earth-1','earth-1','earth-4','guard','seed','draw','g6','earth-1']};
 start(2);window.__noIntro=ni;
 // 練習用に場を整える（2ターン目の状態。自分の主神はもう攻撃できる）
 p.turns=2;round=2;p.max=p.mp=3;p.hand=['g6','rain','bolt','draw'];weather='晴れ';c.shrines=['g1','seed'];
 let g=mk(c,6);g.hp=2;g.bornTurn=-5;c.units.push(g);c.turns=1;render();
 TUT={i:0,el:null,ring:null,timer:null};tutDraw();TUT.timer=setInterval(tutTick,250)}
function tutDraw(){let s=TUT_STEPS[TUT.i];if(!TUT.el){TUT.el=document.createElement('div');TUT.el.className='tut-box';document.body.appendChild(TUT.el);TUT.ring=document.createElement('div');TUT.ring.className='tut-ring';document.body.appendChild(TUT.ring)}
  TUT.el.innerHTML='<img src="story/portraits/guide.webp" alt="" onerror="this.remove()"><div class="tut-txt"><b>案内の巫女</b><p>'+s.say+'</p><div class="tut-acts"><small>'+(TUT.i+1)+' / '+TUT_STEPS.length+'</small>'
 +(s.wait?(s.noNext?'':'<em>操作してみましょう</em>'):'<button class="tut-next" onclick="tutNext()">'+(s.last?'はじめる':'次へ')+'</button>')+'<button class="tut-skip" onclick="tutEnd(true)">スキップ</button></div></div>';tutRing()}
function tutRing(){if(!TUT)return;let s=TUT_STEPS[TUT.i],sel=s.hl&&s.hl(),el=sel&&document.querySelector(sel);if(!el||!el.getClientRects().length){TUT.ring.style.display='none';tutPos(s,null);return}
 let r=el.getBoundingClientRect();Object.assign(TUT.ring.style,{display:'block',left:(r.left-6)+'px',top:(r.top-6)+'px',width:(r.width+12)+'px',height:(r.height+12)+'px'});
 // 説明の箱が光らせた場所に重ならないよう、上か下に寄せる
 let mid=(r.top+r.bottom)/2;tutPos(s,mid)}
function tutTick(){if(!TUT)return;if(ending){tutEnd(false);return}let s=TUT_STEPS[TUT.i];tutRing();if(s.wait&&s.wait())tutNext()}
function tutNext(){if(!TUT)return;let s=TUT_STEPS[TUT.i];if(s.last){tutEnd(false);return}TUT.i++;
 // 先回りして済んでいる操作は飛ばす
 while(TUT_STEPS[TUT.i]&&TUT_STEPS[TUT.i].wait&&!TUT_STEPS[TUT.i].noNext&&TUT_STEPS[TUT.i].wait())TUT.i++;tutDraw()}
function tutEnd(skip){if(!TUT)return;clearInterval(TUT.timer);TUT.el&&TUT.el.remove();TUT.ring&&TUT.ring.remove();TUT=null;save.tutorialDone=true;persist();
 if(skip&&!ending){latest='チュートリアルをスキップしました。このまま練習バトルを続けられます。';render()}}
function tutorialResult(){let won=ending==='勝利';window.__tutorial=false;if(TUT)tutEnd(false);save.tutorialDone=true;persist();tag.textContent='';
 app.innerHTML='<div class="scene resultscreen '+(won?'win':'lose')+'"><div class="sc-bg dim"></div><div class="sc-frame"></div><div class="rs-in"><p class="rs-sub">チュートリアル</p><h2 class="rs-title">'+(won?'勝利':'おつかれさま')+'</h2>'
 +'<p class="rs-why">'+(won?'これで基本はばっちりです。':'練習バトルはここまで。基本の流れはつかめましたか？')+'<br>次は「対戦する」で本番、「ストーリー」で神々との物語へ。</p>'
 +'<div class="rs-actions"><button class="btn-gold-s" onclick="ending=\'\';home()">ホームへ</button><button class="btn-navy" onclick="ending=\'\';tutorialStart()">もう一度</button></div></div></div>'}
function tutPos(s,mid){let p0=s.pos||(s.top?'low':mid==null?'top':mid<innerHeight*0.5?'low':'top');TUT.el.classList.toggle('low',p0==='low');TUT.el.classList.toggle('mid',p0==='mid')}
