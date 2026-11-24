// ==== 開幕演出（見た目と音だけ）====
// start() で対戦の状態（手札・神殿・神力・手番）をいつもどおり作り終えてから、その盤面を隠して順に見せていく。
// 演出中は busy で操作を止めるだけで、ターンや神力の計算には触れない。画面をタップすると最終状態へ即座に移る。
let introRun=null;
const _startBattle=start;
start=function(id){_startBattle(id);playIntro()};

function playIntro(){
 if(introRun)introRun.finish();
 if(calm()||window.__noIntro){return}   // __noIntro：自動テスト用
 let run={done:false,anims:[],nodes:[],timers:[]};introRun=run;
 const arena=document.querySelector('.arena.duel');if(!arena)return;
 busy=true;render();
 const A=()=>document.querySelector('.arena.duel');A().classList.add('intro');
 const layer=document.createElement('div');layer.className='intro-layer';layer.setAttribute('role','dialog');layer.setAttribute('aria-label','開幕演出（タップでスキップ）');
 layer.innerHTML='<span class="intro-skip">タップでスキップ</span>';document.body.appendChild(layer);run.nodes.push(layer);
 const wait=ms=>new Promise(r=>{if(run.done)return r();let t=setTimeout(r,ms);run.timers.push(t);run.wake=r});
 const anim=(el,k,o)=>{let a=el.animate(k,o);run.anims.push(a);return a};
 const add=(cls,html,parent=fxLayer())=>{let e=document.createElement('div');e.className=cls;if(html)e.innerHTML=html;parent.appendChild(e);run.nodes.push(e);return e};
 const rect=el=>el.getBoundingClientRect();
 run.finish=()=>{if(run.done)return;run.done=true;run.anims.forEach(a=>{try{a.cancel()}catch(e){}});run.timers.forEach(clearTimeout);
  run.nodes.forEach(n=>n.remove());let a=A();if(a)a.classList.remove('intro');document.querySelectorAll('.intro-show').forEach(e=>e.classList.remove('intro-show'));
  if(introRun===run)introRun=null;busy=false;render();if(run.wake)run.wake()};
 layer.addEventListener('pointerdown',e=>{e.preventDefault();run.finish()});

 (async()=>{
  // 1. VS：両者の主神が向かい合う
  let vs=add('intro-vs','<div class="iv-card foe">'+gcard(c.id,c.stage,null,'')+'<small>相手</small></div><div class="iv-mark">VS</div><div class="iv-card me">'+gcard(p.id,p.stage,null,'')+'<small>あなた</small></div>',layer);
  anim(vs.querySelector('.foe'),[{transform:'translateX(-60vw) rotate(-8deg)'},{transform:'none'}],{duration:380,easing:'cubic-bezier(.2,.8,.3,1.1)'});
  anim(vs.querySelector('.me'),[{transform:'translateX(60vw) rotate(8deg)'},{transform:'none'}],{duration:380,easing:'cubic-bezier(.2,.8,.3,1.1)'});
  anim(vs.querySelector('.iv-mark'),[{transform:'scale(3)',opacity:0},{transform:'scale(1)',opacity:1}],{duration:300,delay:260,fill:'backwards',easing:'ease-out'});
  await wait(800);if(run.done)return;
  anim(vs,[{opacity:1},{opacity:0}],{duration:160,fill:'forwards'});await wait(160);if(run.done)return;vs.remove();

  // 2. シャッフル：両者の山札
  sfx('flip');
  let decks=[['foe',.24],['me',.70]].map(([s,y])=>{let d=add('intro-deck '+s,Array.from({length:6},(_,i)=>'<i style="--i:'+i+'"></i>').join(''),layer);d.style.top=(y*100)+'%';return d});
  decks.forEach(d=>[...d.children].forEach((card,i)=>anim(card,[{transform:'none'},{transform:'translateX('+(i%2?-46:46)+'px) rotate('+(i%2?-10:10)+'deg)'},{transform:'none'},{transform:'translateX('+(i%2?40:-40)+'px)'},{transform:'none'}],{duration:640,delay:i*12,easing:'ease-in-out'})));
  await wait(700);if(run.done)return;

  // 3. 神殿の設置：伏せカード5枚ずつ
  let shrines=[...document.querySelectorAll('.arena.duel .zone.foe .back'),...document.querySelectorAll('.arena.duel .zone.mine .back')];
  shrines.forEach((b,i)=>{b.classList.add('intro-show');anim(b,[{transform:'translateY(-30px) scale(1.4)',opacity:0},{transform:'none',opacity:1}],{duration:260,delay:i%5*60,fill:'backwards',easing:'cubic-bezier(.2,.8,.3,1.2)'})});
  await wait(500);if(run.done)return;

  // 4. 手札の配布：山札から1枚ずつ。自分は表向き、相手は裏向き（枚数だけ）
  let mine=[...document.querySelectorAll('.arena.duel .handrail .spell')],theirs=[...document.querySelectorAll('.arena.duel .opp .ohand i')],
   from={me:rect(decks[1]),foe:rect(decks[0])},order=[];
  for(let i=0;i<Math.max(mine.length,theirs.length);i++){if(i<theirs.length)order.push(['foe',theirs[i]]);if(i<mine.length)order.push(['me',mine[i]])}
  let step=Math.min(110,800/Math.max(1,order.length));
  order.forEach(([who,el],i)=>{let t=setTimeout(()=>{if(run.done)return;let f=from[who],to=rect(el),fly=add('intro-fly'+(who==='foe'?' foe':''));
    fly.style.cssText='left:'+(f.left+f.width/2-18)+'px;top:'+(f.top+f.height/2-26)+'px';
    anim(fly,[{transform:'none'},{transform:'translate('+(to.left+to.width/2-(f.left+f.width/2))+'px,'+(to.top+to.height/2-(f.top+f.height/2))+'px) scale('+Math.max(.4,to.width/36)+')'}],{duration:260,easing:'cubic-bezier(.3,.7,.4,1)',fill:'forwards'}).finished.then(()=>{if(run.done)return;fly.remove();el.classList.add('intro-show');
     if(who==='me')anim(el,[{transform:'perspective(500px) rotateY(90deg)'},{transform:'none'}],{duration:180,easing:'ease-out'})}).catch(()=>{})},i*step);run.timers.push(t)});
  await wait(order.length*step+280);if(run.done)return;
  decks.forEach(d=>anim(d,[{opacity:1},{opacity:0}],{duration:200,fill:'forwards'}));await wait(120);if(run.done)return;

  // 5. 主神の顕現：相手 → 自分の順に光の柱とともに
  for(const side of ['foe','mine']){let units=[...document.querySelectorAll('.arena.duel .zone.'+side+' .unit')];
   units.forEach(u=>{let r=rect(u),pillar=add('intro-pillar');pillar.style.cssText='left:'+(r.left+r.width/2)+'px;width:'+r.width*1.2+'px';
    anim(pillar,[{opacity:0,transform:'translateX(-50%) scaleX(.2)'},{opacity:1,transform:'translateX(-50%) scaleX(1)',offset:.35},{opacity:0,transform:'translateX(-50%) scaleX(.6)'}],{duration:620,easing:'ease-out',fill:'forwards'});
    u.classList.add('intro-show');anim(u,[{opacity:0,transform:'translateY(-24px) scale(1.15)',filter:'brightness(3)'},{opacity:1,transform:'none',filter:'brightness(1)'}],{duration:480,delay:140,fill:'backwards',easing:'cubic-bezier(.2,.8,.3,1)'})});
   if(units.length)sfx('summon');await wait(600);if(run.done)return}

  // 6. 開始の合図
  let sign=add('intro-sign','<b>対戦開始</b><span>先攻：'+(turn===p?'あなた':'相手')+'　／　天候：'+(weather==='雨'?'☂ 雨':'☀ 晴れ')+'</span>',layer);
  anim(sign,[{transform:'scale(1.6)',opacity:0},{transform:'scale(1)',opacity:1,offset:.25},{transform:'scale(1)',opacity:1,offset:.8},{transform:'scale(.96)',opacity:0}],{duration:900,easing:'ease-out',fill:'forwards'});
  await wait(900);run.finish()})();
}
