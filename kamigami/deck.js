// ==== デッキ編成（主神1体＋20枚・同名2枚まで・所持数まで）。保存は save.deck={hero,cards}（cards は図鑑ID）====
const DECK_SIZE=20,DECK_MAX_SAME=2;
let deckDraft=null,dkColor='all',dkKind='all';
const dkOwn=id=>save.cards.filter(x=>x[0]===id).length;
const dkIn=id=>deckDraft.cards.filter(x=>x===id).length;
function dkPlayable(id){return typeof id==='number'?!!gods[id]&&!GOD_CARDS[id]:battleReady(id)}
function deckValid(d){if(!d||!GOD_CARDS[d.hero]||!Array.isArray(d.cards)||d.cards.length!==DECK_SIZE)return false;
 let cnt={};for(const id of d.cards){let k=String(id);cnt[k]=(cnt[k]||0)+1;if(cnt[k]>DECK_MAX_SAME||cnt[k]>dkOwn(id)||!dkPlayable(id))return false}return true}
function myDeckList(){return save.deck.cards.map(handKey)}
function dkWhy(){let w=[];if(deckDraft.hero==null)w.push('主神が未選択です');let n=deckDraft.cards.length;if(n<DECK_SIZE)w.push('あと'+(DECK_SIZE-n)+'枚必要です');if(n>DECK_SIZE)w.push((n-DECK_SIZE)+'枚多いです');return w.join('／')}
function deckEdit(){tag.textContent='';if(!deckDraft)deckDraft=save.deck?{hero:save.deck.hero,cards:[...save.deck.cards]}:{hero:null,cards:[]};deckRender()}
function dkAdd(id){if(deckDraft.cards.length>=DECK_SIZE||dkIn(id)>=Math.min(DECK_MAX_SAME,dkOwn(id))||!dkPlayable(id))return;deckDraft.cards.push(id);deckRender(true)}
function dkRemove(id){let i=deckDraft.cards.lastIndexOf(id);if(i>=0)deckDraft.cards.splice(i,1);deckRender(true)}
function dkHero(id){deckDraft.hero=id;deckRender(true)}
function dkAuto(){if(deckDraft.hero==null)return;deckDraft.cards=standardDeck(deckDraft.hero).map(k=>/^g\d+$/.test(k)?+k.slice(1):k);deckRender(true)}
function dkClear(){deckDraft.cards=[];deckRender(true)}
function dkSave(){if(dkWhy())return;save.deck={hero:deckDraft.hero,cards:[...deckDraft.cards]};persist();deckRender(true);let t=document.getElementById('dktoast');if(t){t.textContent='保存しました。対戦の主神選びで「マイデッキ」を選ぶと、このデッキで戦えます';t.classList.add('on')}}
function dkSet(k,v){if(k==='c')dkColor=v;else dkKind=v;deckRender(true)}
function deckRender(keep){let y=keep?document.querySelector('.dk-scroll')?.scrollTop||0:0,d=deckDraft,n=d.cards.length,why=dkWhy(),hc=d.hero!=null?GOD_CARDS[d.hero].type:null;
 let pool=[...SET_ALL.allies,...SET_ALL.spells].filter(id=>(dkColor==='all'||(dkColor==='none'?!colorOf(id):colorOf(id)===dkColor))&&(dkKind==='all'||(dkKind==='ally')===(typeof id==='number'||isSum(id))));
 pool=[...pool].sort((a,b)=>((colorOf(b)===hc)-(colorOf(a)===hc))||((dkPlayable(b)?1:0)-(dkPlayable(a)?1:0)));
 let groups={};d.cards.forEach(id=>{let k=String(id);groups[k]=groups[k]||{id,n:0};groups[k].n++});
 let deckRows=Object.values(groups).sort((a,b)=>costOf(handKey(a.id))-costOf(handKey(b.id))).map(g=>'<button class="dk-row" onclick="dkRemove('+JSON.stringify(g.id).replace(/"/g,"'")+')"><b class="dk-cost">'+costOf(handKey(g.id))+'</b>'+colorChip(g.id)+'<span>'+cardName(g.id)+'</span><em>×'+g.n+'</em><i aria-hidden="true">－</i></button>').join('');
 let cell=id=>{let own=dkOwn(id),inn=dkIn(id),ok=dkPlayable(id),can=ok&&own>0&&inn<Math.min(DECK_MAX_SAME,own)&&n<DECK_SIZE,q=JSON.stringify(id).replace(/"/g,"'");
  return '<button class="dk-cell'+(can?'':' off')+(own&&ok?'':' none')+'" onclick="dkAdd('+q+')" aria-label="'+cardName(id)+' デッキ'+inn+'枚 所持'+own+'枚">'+card([id],'mini')+'<span class="dk-meta"><b class="dk-in n'+inn+'">デッキ '+inn+'/2</b><small>所持 '+own+'</small>'+(ok?'':'<small class="dk-na">対戦未対応</small>')+'</span></button>'};
 app.innerHTML='<div class="scene deckscreen"><div class="sc-bg dim"></div><div class="sc-frame"></div>'
 +'<header class="sc-head"><button class="btn-back" onclick="deckDraft=null;home()">‹ ホーム</button><b>デッキ編成</b><span class="dk-count'+(n===DECK_SIZE?' full':'')+'"><em>'+n+'</em>／'+DECK_SIZE+'枚</span></header>'
 +'<div class="dk-scroll">'
 +'<h2 class="al-set"><small>1</small>主神を選ぶ<span>'+(d.hero!=null?'<b class="dk-ok">決定：'+GOD_CARDS[d.hero].type+' '+GOD_CARDS[d.hero].name+'</b>':'<b class="dk-ng">未選択</b>')+'</span></h2>'
 +'<div class="dk-heroes">'+SET_ALL.heroes.map(h=>'<button class="dk-hero'+(d.hero===h?' on':'')+'" onclick="dkHero('+h+')">'+gcard(h,0,null,'mini')+'<span>'+GOD_CARDS[h].type+'</span></button>').join('')+'</div>'
 +'<h2 class="al-set"><small>2</small>デッキ<span>'+n+' / '+DECK_SIZE+'枚 · タップで1枚外す</span></h2>'
 +'<div class="dk-deck">'+(deckRows||'<p class="al-empty">下のカード一覧からタップして入れてください（同じカードは2枚まで）</p>')+'</div>'
 +'<div class="dk-tools"><button class="btn-back" onclick="dkAuto()"'+(d.hero==null?' disabled':'')+'>おまかせで組む</button><button class="btn-back" onclick="dkClear()"'+(n?'':' disabled')+'>空にする</button></div>'
 +'<h2 class="al-set"><small>3</small>カード一覧<span>タップで1枚入れる'+(hc?' · '+hc+'のカードが先頭':'')+'</span></h2>'
 +'<div class="al-ctl"><div class="al-chips">'+[['all','すべて'],...COLORS.map(c=>[c,c]),['none','色なし']].map(([v,l])=>'<button class="'+(dkColor===v?'on':'')+(COLORS.includes(v)?' c-'+(COLORS.indexOf(v)+1):'')+'" onclick="dkSet(\'c\',\''+v+'\')">'+l+'</button>').join('')+'</div>'
 +'<div class="al-chips">'+[['all','仲間と呪文'],['ally','仲間'],['spell','呪文']].map(([v,l])=>'<button class="'+(dkKind===v?'on':'')+'" onclick="dkSet(\'k\',\''+v+'\')">'+l+'</button>').join('')+'</div></div>'
 +'<div class="al-grid dk-grid">'+(pool.map(cell).join('')||'<p class="al-empty">該当するカードがありません</p>')+'</div></div>'
 +'<footer class="dk-foot"><p class="dk-why">'+(why||(save.deck&&JSON.stringify(save.deck)===JSON.stringify(d)?'保存済みのデッキです':'保存できます'))+'</p><button class="btn-gold-s" onclick="dkSave()"'+(why?' disabled':'')+'>保存する</button><p class="dk-toast" id="dktoast"></p></footer></div>';
 if(keep){let sc=document.querySelector('.dk-scroll');if(sc)sc.scrollTop=y}}
if(document.querySelector('.home3,.home4'))home();

// 編成操作のたびに一番上へ戻らないよう、スクロール位置を保つ
deckRender=keepScroll(deckRender,'.dk-scroll');
deckRender=withImgReuse(deckRender);
deckRender=withLazy(deckRender);
