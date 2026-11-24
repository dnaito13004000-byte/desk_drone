// ==== ストーリーモード：自分以外の4神の編。導入→バトル1（幼神）→中間→バトル2（解放形態）→締め ====
// 編を増やすときは STORY_CHAPTERS に台本（STORY_SCRIPTS）とバトル設定を足すだけ。台本が無い編は「準備中」になる。
const STORY_ORDER=[5,0,3,10,2];                       // コダマ→カグラ→ハヤテ→オボロ→ライガ（自分の主神は除く）
const STORY_SLUG={2:'raiga',5:'kodama',0:'kagura',3:'hayate',10:'oboro'};
const STORY_BG={tenza:'story/backgrounds/tenza.webp',kodama:'story/backgrounds/kodama.webp',kagura:'story/backgrounds/kagura.webp',hayate:'story/backgrounds/hayate.webp',oboro:'story/backgrounds/oboro.webp',raiga:'story/backgrounds/raiga.webp'};
const STORY_NAMES={guide:'案内の巫女'};
// 台本の書式：「@命令 …」が演出、「話し手: セリフ」がセリフ。
//   @bg 背景 / @in left|right 立ち絵 / @out left|right / @shake left|right / @zoom left|right / @battle 1|2 / @end
//   話し手・立ち絵のキー：guide＝案内役、hero＝主人公（選んだ主神）、kodama-child・kodama-awakened など
const STORY_SCRIPTS={
5:`@bg tenza
@in left guide
guide: ようこそ、天座へ。神々が力を競う、はじまりの社です。
@in right hero
hero: ここが……天座。空気が澄んでいる。
guide: あなたの力はまだ幼い。四柱の神と手合わせをして、主神の座をめざしてください。
@shake right
hero: 四柱の神と……。わかった、やってみる！
guide: 最初のお相手は、森をあずかる大地の神。どうか、お気をつけて。
@bg kodama
@out left
@in left kodama-child
kodama-child: ……だれ？　森の奥まで来るなんて、めずらしいね。
hero: 天座から来た。手合わせをお願いしたいんだ。
kodama-child: ふうん……。この森の木々は、ぼくが守ってる。かんたんには通さないよ。
@zoom left
kodama-child: 根っこは深く、枝は高く。――いくよ！
@battle 1
@in left kodama-child
@shake left
kodama-child: うそ……ぼくの森が、押し負けるなんて。
hero: まだ立っていられるのは、きみが粘り強いからだ。
kodama-child: ……そうだよ。だって、森はここからが本番なんだ。
@out left
@in left kodama-awakened
@zoom left
kodama-awakened: 樹脈よ、目を覚ませ。――これが、大地の解き放たれた姿！
@shake right
hero: 姿が変わった……！　でも、こっちも負けない！
@battle 2
@in left kodama-awakened
kodama-awakened: ……まいったよ。きみの一手は、まっすぐで気持ちがいい。
hero: きみの森、すごく強かった。何度も押し返されそうになった。
kodama-awakened: また来てよ。次はもっと深い根を張って待ってるから。
@out left
@bg tenza
@in left guide
guide: 大地の神に認められましたね。次の社への道が開きました。
hero: うん。次の神にも、会いに行こう。
@end`
};
const STORY_CHAPTERS={
 5:{bg:'kodama',battles:[
  {stage:0,shrines:3,deck:['g6','g6','earth-1','earth-1','earth-2','seed','seed','earth-4','earth-4','guard','guard','draw','draw','rain','sun','g1','g1','earth-3','earth-3','mirror']},
  {stage:1,shrines:4,deck:['g6','g6','earth-1','earth-1','earth-2','earth-2','earth-3','earth-3','earth-5','earth-5','seed','seed','earth-4','guard','guard','draw','draw','mirror','scroll','scroll']}]},
 0:{bg:'kagura'},3:{bg:'hayate'},10:{bg:'oboro'},2:{bg:'raiga'}
};
function chTitle(id){return GOD_CARDS[id].type+'の章　'+GOD_CARDS[id].name}
function storySave(){if(!save.story)save.story={hero:null,cleared:[],resume:null};return save.story}
function storyChapters(){let s=storySave();return STORY_ORDER.filter(id=>id!==s.hero)}
function chapterState(id){let s=storySave(),L=storyChapters(),i=L.indexOf(id);if(s.cleared.includes(id))return 'clear';if(!STORY_SCRIPTS[id]||!STORY_CHAPTERS[id].battles)return 'soon';if(i===0||s.cleared.includes(L[i-1]))return 'open';return 'lock'}
function storyMenu(){tag.textContent='';let s=storySave();
 if(s.hero==null){app.innerHTML='<div class="scene storymenu"><div class="sc-bg dim"></div><div class="sc-frame"></div><header class="sc-head"><button class="btn-back" onclick="home()">‹ ホーム</button><b>ストーリー</b><span></span></header>'
  +'<div class="sm-body"><p class="st-lead">主人公になる<b>主神</b>をえらんでください。<br><small>ほかの4柱の神と、順番に手合わせしていきます</small></p><div class="st-list">'
  +STORY_ORDER.map(i=>'<button class="st-god" onclick="storySetHero('+i+')">'+gcard(i,0,null,'mini')+'<span><small>'+GOD_CARDS[i].type+'</small>'+GOD_CARDS[i].name+'</span></button>').join('')+'</div></div></div>';return}
 let L=storyChapters();
 app.innerHTML='<div class="scene storymenu"><div class="sc-bg dim"></div><div class="sc-frame"></div><header class="sc-head"><button class="btn-back" onclick="home()">‹ ホーム</button><b>ストーリー</b><span>'+s.cleared.filter(x=>L.includes(x)).length+' / '+L.length+'編</span></header>'
 +'<div class="sm-body"><div class="sm-hero">'+gcard(s.hero,0,null,'mini')+'<div><small>主人公</small><b>'+GOD_CARDS[s.hero].type+'　'+GOD_CARDS[s.hero].name+'</b><button class="btn-back" onclick="storySetHero(null)">主神を変える</button></div></div>'
 +L.map((id,i)=>{let st=chapterState(id),ch=STORY_CHAPTERS[id],res=s.resume&&s.resume.ch===id;
  return '<button class="sm-ch '+st+'" '+(st==='open'||st==='clear'?'onclick="storyOpen('+id+')"':'disabled')+' style="background-image:linear-gradient(90deg,#05070fe6 30%,#05070f66),url('+STORY_BG[ch.bg]+')"><small>第'+(i+1)+'編</small><b>'+chTitle(id)+'</b><em>'+({clear:'クリア済み',open:res?'続きから':'挑戦できる',lock:'前の編をクリアすると開く',soon:'準備中'}[st])+'</em></button>'}).join('')
 +'<p class="sm-note">報酬：編をクリアするたびにパックチケット+1。初めてのクリアでは、その編の神（幼神）のカードがもらえます。</p></div></div>'}
function storySetHero(id){let s=storySave();s.hero=id;s.resume=null;persist();storyMenu()}
function storyOpen(id){let s=storySave();if(s.resume&&s.resume.ch===id){let o=document.createElement('div');o.className='handzoom confirm';o.innerHTML='<div class="hz-in"><div class="hz-text"><h3>'+chTitle(id)+'</h3><p class="hz-eff">途中から続けますか？</p></div><div class="hz-acts"><button class="hz-btn gold" data-a="c">続きから</button><button class="hz-btn" data-a="r">最初から</button></div></div>';
  o.onclick=e=>{let b=e.target.closest('button');if(e.target===o){o.remove();return}if(!b)return;o.remove();storyPlay(id,b.dataset.a==='c'?s.resume.line:0)};document.body.appendChild(o);return}
 storyPlay(id,0)}
// ---- 会話の再生 ----
let SP_STATE=null;
function storyLines(id){return STORY_SCRIPTS[id].split('\n').map(x=>x.trim()).filter(x=>x)}
function portraitKey(k){let s=storySave();return k==='hero'?STORY_SLUG[s.hero]+'-child':k}
function speakerName(k){let s=storySave();if(k==='hero')return GOD_CARDS[s.hero].name;if(STORY_NAMES[k])return STORY_NAMES[k];let id=Object.keys(STORY_SLUG).find(i=>k.startsWith(STORY_SLUG[i]));return id!=null?GOD_CARDS[id].name:k}
function portraitHtml(k){let key=portraitKey(k),hue=[...key].reduce((a,c)=>a+c.charCodeAt(0),0)%360;
 return '<img src="story/portraits/'+key+'.webp" alt="" onerror="this.outerHTML=\'<div class=&quot;pt-dummy&quot; style=&quot;--h:'+hue+'&quot;><b>'+speakerName(k)+'</b><small>仮の立ち絵</small></div>\'">'}
function storyPlay(id,from){tag.textContent='';let s=storySave();
 SP_STATE={id,lines:storyLines(id),i:from||0,slot:{left:null,right:null},zoom:null,typing:null,auto:false,busy:false,cleared:s.cleared.includes(id)};
 app.innerHTML='<div class="scene storyplay" id="spl"><div class="sp-bg" id="spbgA"></div><div class="sp-bg" id="spbgB"></div><div class="sp-pt left" id="spL"></div><div class="sp-pt right" id="spR"></div>'
 +'<div class="sp-top"><button class="sp-tb" onclick="storyQuit()">中断</button>'+(SP_STATE.cleared?'<button class="sp-tb" id="spff" onclick="storyFF()">早送り</button>':'')+'<button class="sp-tb" onclick="storySkip()">スキップ</button></div>'
 +'<div class="sp-win" id="spwin" onclick="storyTap()"><b class="sp-name" id="spname"></b><p class="sp-text" id="sptext"></p><i class="sp-next">▼</i></div></div>';
 document.getElementById('spl').addEventListener('click',e=>{if(!e.target.closest('.sp-top,.sp-win'))storyTap()});
 // 途中再開：直前までの背景と立ち絵をすぐに整える
 let L=SP_STATE.lines,bg=STORY_CHAPTERS[id].bg,sl={left:null,right:null};for(let j=0;j<SP_STATE.i;j++){let m=/^@(\w+)\s*(\S*)\s*(\S*)/.exec(L[j]);if(!m)continue;if(m[1]==='bg')bg=m[2];if(m[1]==='in')sl[m[2]]=m[3];if(m[1]==='out')sl[m[2]]=null;if(m[1]==='battle'){sl={left:null,right:null}}}
 setBg(bg,true);for(const side of ['left','right'])if(sl[side])ptIn(side,sl[side],true);storyStep()}
const spWait=ms=>new Promise(r=>setTimeout(r,SP_STATE&&SP_STATE.fast?Math.min(ms,60):ms));
function setBg(key,now){let a=document.getElementById('spbgA'),b=document.getElementById('spbgB');if(!a)return;let url=STORY_BG[key]?'url('+STORY_BG[key]+')':'linear-gradient(#2a3a5a,#0a1024)';
 // 下の層(A)に今の背景、上の層(B)に新しい背景を重ねてフェードイン
 b.style.transition='none';b.style.opacity=0;b.style.backgroundImage=url;b.offsetWidth;
 if(now){a.style.backgroundImage=url;b.style.opacity=1;return}b.style.transition='opacity .6s';b.style.opacity=1;clearTimeout(setBg.t);setBg.t=setTimeout(()=>{a.style.backgroundImage=url},650)}
function ptEl(side){return document.getElementById(side==='left'?'spL':'spR')}
function ptIn(side,k,now){let el=ptEl(side);SP_STATE.slot[side]=k;el.innerHTML=portraitHtml(k);el.className='sp-pt '+side+(now?' on':'');el.dataset.k=k;if(!now){el.offsetWidth;el.classList.add('on')}}
function ptOut(side){let el=ptEl(side);SP_STATE.slot[side]=null;el.classList.remove('on','zoom','talk','dim')}
function unzoom(){document.querySelectorAll('.sp-pt.zoom').forEach(e=>e.classList.remove('zoom'));SP_STATE.zoom=null}
async function storyStep(){let S=SP_STATE;if(!S||S.busy)return;S.busy=true;
 try{while(S.i<S.lines.length){let line=S.lines[S.i++],m=/^@(\w+)\s*(\S*)\s*(\S*)/.exec(line);
  if(m){let [_,cmd,a,b]=m;if(cmd!=='zoom')unzoom();
   if(cmd==='bg'){setBg(a);await spWait(500)}
   else if(cmd==='in'){ptIn(a,b);await spWait(380)}
   else if(cmd==='out'){ptOut(a);await spWait(320)}
   else if(cmd==='shake'){let el=ptEl(a);el.classList.remove('shake');el.offsetWidth;el.classList.add('shake');await spWait(120)}
   else if(cmd==='zoom'){unzoom();ptEl(a).classList.add('zoom');S.zoom=a;await spWait(250)}
   else if(cmd==='battle'){unzoom();S.busy=false;storyBattle(S.id,+a,S.i);return}
   else if(cmd==='end'){unzoom();S.busy=false;storyClear(S.id);return}
   continue}
  let k=line.slice(0,line.indexOf(':')).trim(),text=line.slice(line.indexOf(':')+1).trim();
  for(const side of ['left','right']){let el=ptEl(side),on=S.slot[side]&&(S.slot[side]===k||(k==='hero'&&S.slot[side]==='hero'));el.classList.toggle('talk',!!on);el.classList.toggle('dim',!!S.slot[side]&&!on)}
  document.getElementById('spname').textContent=speakerName(k);await typeText(text);S.busy=false;
  if(S.auto){S.autoT=setTimeout(()=>{if(SP_STATE===S&&S.auto)storyStep()},650)}return}
  unzoom();S.busy=false;storyClear(S.id)}finally{if(SP_STATE===S)S.busy=false}}
function typeText(t){let el=document.getElementById('sptext'),S=SP_STATE;el.textContent='';return new Promise(res=>{let i=0;S.typing={finish:()=>{clearInterval(iv);el.textContent=t;S.typing=null;res()}};
 let iv=setInterval(()=>{i+=S.auto?3:1;el.textContent=t.slice(0,i);if(i>=t.length){clearInterval(iv);S.typing=null;res()}},28)})}
function storyTap(){let S=SP_STATE;if(!S)return;if(S.typing){S.typing.finish();return}if(!S.busy)storyStep()}
function storyFF(){let S=SP_STATE;S.auto=!S.auto;document.getElementById('spff')?.classList.toggle('on',S.auto);if(S.auto&&!S.busy&&!S.typing)storyStep()}
function storySkip(){let S=SP_STATE;if(!S)return;if(S.typing)S.typing.finish();clearTimeout(S.autoT);S.fast=true;
 // 次のバトルか終わりまで、演出だけ反映して飛ばす
 while(S.i<S.lines.length){let line=S.lines[S.i],m=/^@(\w+)\s*(\S*)\s*(\S*)/.exec(line);if(m&&(m[1]==='battle'||m[1]==='end'))break;S.i++;if(!m)continue;if(m[1]==='bg')setBg(m[2],true);if(m[1]==='in')ptIn(m[2],m[3],true);if(m[1]==='out')ptOut(m[2])}
 S.fast=false;S.busy=false;storyStep()}
function storyQuit(){let S=SP_STATE;if(S)clearTimeout(S.autoT);SP_STATE=null;storyMenu()}
// ---- バトル接続 ----
function storyBattle(id,n,resumeLine){let s=storySave(),B=STORY_CHAPTERS[id].battles[n-1];s.resume={ch:id,line:resumeLine-1};persist();
 window.__storyBattle={ch:id,n,resume:resumeLine};window.__storyFoe={id,stage:B.stage,shrines:B.shrines,deck:B.deck};
 window.__myDeckNext=typeof deckValid==='function'&&deckValid(save.deck)&&save.deck.hero===s.hero;SP_STATE=null;start(s.hero)}
function applyStoryFoe(f,F){f.stage=F.stage||0;let deck=shuffle([...F.deck]);f.deckList=[...F.deck];f.shrines=deck.splice(0,F.shrines);f.hand=deck.splice(-4);f.deck=deck;let h=mk(f,f.id);h.bornTurn=1;f.units=[h]}
function storyResult(){let sb=window.__storyBattle,won=ending==='勝利',id=sb.ch;tag.textContent='';
 app.innerHTML='<div class="scene resultscreen '+(won?'win':'lose')+'"><div class="sc-bg dim"></div><div class="sc-frame"></div><div class="rs-in"><p class="rs-sub">'+chTitle(id)+'　バトル'+sb.n+'</p><h2 class="rs-title">'+(won?'勝利':'敗北')+'</h2>'
 +'<p class="rs-why">'+(won?'物語が先へ進みます。':'もう一度挑戦できます（ペナルティはありません）。')+'</p><div class="rs-actions">'
 +(won?'<button class="btn-gold-s" onclick="storyAfterWin()">つづきへ</button>':'<button class="btn-gold-s" onclick="storyRetry()">再戦する</button><button class="btn-navy" onclick="window.__storyBattle=null;ending=\'\';storyMenu()">ストーリーへ戻る</button>')+'</div></div></div>'}
function storyAfterWin(){let sb=window.__storyBattle;window.__storyBattle=null;ending='';let s=storySave();s.resume={ch:sb.ch,line:sb.resume};persist();storyPlay(sb.ch,sb.resume)}
function storyRetry(){let sb=window.__storyBattle;ending='';storyBattle(sb.ch,sb.n,sb.resume)}
function storyClear(id){let s=storySave(),first=!s.cleared.includes(id),gift='';s.resume=null;save.tickets=(save.tickets||0)+1;
 if(first){s.cleared.push(id);if(save.cards.some(x=>x[0]===id&&(x[1]==='N'||x[1]==='主神'))){save.shards=(save.shards||0)+5;gift='<span class="rw">'+SHARD+'神の欠片 ×5<small>（'+stageOf(id,0).name+'は所持済み）</small></span>'}else{save.cards.push([id,'N']);gift='<span class="rw">'+stageOf(id,0).name+'のカード</span>'}}
 persist();SP_STATE=null;tag.textContent='';
 app.innerHTML='<div class="scene resultscreen win"><div class="sc-bg dim"></div><div class="sc-frame"></div><div class="rs-in"><p class="rs-sub">'+chTitle(id)+'</p><h2 class="rs-title">編クリア</h2>'
 +'<div class="rs-reward"><p>報酬</p><span class="rw">'+TICKET+'パックチケット ×1</span>'+gift+'</div>'
 +(first?'<div class="sm-gift">'+gcard(id,0,null,'mini')+'</div>':'')+'<div class="rs-actions"><button class="btn-gold-s" onclick="storyMenu()">ストーリーへ</button><button class="btn-navy" onclick="home()">ホーム</button></div></div></div>'}
