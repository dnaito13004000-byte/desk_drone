/* 机上ドローンショー：形状サンプリング・タイムライン・USDZ書き出し（ブラウザ/Node共通） */
(function(root){
  'use strict';

  const PALETTE = [
    {id:'white',   name:'ホワイト', rgb:[1.00,0.96,0.88]},
    {id:'cyan',    name:'シアン',   rgb:[0.25,0.82,1.00]},
    {id:'pink',    name:'ピンク',   rgb:[1.00,0.32,0.68]},
    {id:'amber',   name:'アンバー', rgb:[1.00,0.68,0.18]},
    {id:'green',   name:'グリーン', rgb:[0.36,1.00,0.52]},
    {id:'red',     name:'レッド',   rgb:[1.00,0.22,0.16]},
  ];
  const SHAPES = {text:'文字', drone:'ドローン', heart:'ハート', star:'星', firework:'花火', sphere:'球体', image:'画像'};

  // ---- 乱数（毎回同じ並びにする） ----
  function rng(seed){ return function(){ seed|=0; seed=seed+0x6D2B79F5|0; let t=Math.imul(seed^seed>>>15,1|seed); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; }; }

  // ---- マスク（白黒画像）→ 点 ----
  function maskFromCanvas(mk, w, h, draw){
    const c = mk(w,h), ctx = c.getContext('2d');
    ctx.fillStyle='#000'; ctx.fillRect(0,0,w,h);
    ctx.fillStyle='#fff'; ctx.strokeStyle='#fff';
    draw(ctx,w,h);
    const d = ctx.getImageData(0,0,w,h).data, m = new Uint8Array(w*h);
    for(let i=0;i<w*h;i++) m[i] = d[i*4]>127 ? 1 : 0;
    return {w,h,data:m};
  }

  function sampleMask(mask, N, maxW, maxH){
    const {w,h,data} = mask;
    let x0=w,y0=h,x1=-1,y1=-1;
    for(let y=0;y<h;y++) for(let x=0;x<w;x++) if(data[y*w+x]){ if(x<x0)x0=x; if(x>x1)x1=x; if(y<y0)y0=y; if(y>y1)y1=y; }
    if(x1<0) return null;
    const bw=x1-x0+1, bh=y1-y0+1;
    const grid = s => {
      const pts=[];
      for(let gy=y0+s/2; gy<=y1; gy+=s) for(let gx=x0+s/2; gx<=x1; gx+=s){
        if(data[(gy|0)*w+(gx|0)]) pts.push([gx,gy]);
      }
      return pts;
    };
    let lo=0.5, hi=Math.max(bw,bh);
    for(let i=0;i<32;i++){ const mid=(lo+hi)/2; if(grid(mid).length>=N) lo=mid; else hi=mid; }
    let pts = grid(lo);
    if(pts.length<N){ const base=pts.slice(); let j=0; while(pts.length<N) pts.push(base[(j++)%base.length]); }
    const out=[], cnt=pts.length;
    for(let k=0;k<N;k++) out.push(pts[Math.floor(k*cnt/N)]);
    const scale = Math.min(maxW/bw, maxH/bh), cx = x0+bw/2;
    return out.map(([px,py]) => [(px-cx)*scale, (y1-py)*scale, 0]);
  }

  // ---- 各形状 ----
  function shapePoints(scene, N, mk){
    const t = scene.type;
    if(t==='sphere'){
      const pts=[], R=0.36, ga=Math.PI*(3-Math.sqrt(5));
      for(let i=0;i<N;i++){
        const y = 1-(i+0.5)/N*2, r=Math.sqrt(1-y*y), th=ga*i;
        pts.push([Math.cos(th)*r*R, 0.40+y*R, Math.sin(th)*r*R]);
      }
      return pts;
    }
    if(t==='firework'){
      const rays = Math.max(10, Math.min(24, Math.round(Math.sqrt(N)*1.3))), pts=[];
      const per = Math.ceil(N/rays);
      for(let i=0;i<N;i++){
        const ray=i%rays, k=Math.floor(i/rays), a=ray/rays*Math.PI*2 + (k%2)*0.04;
        const r = 0.07 + 0.36*Math.pow((k+1)/per, 0.85);
        pts.push([Math.cos(a)*r, 0.44+Math.sin(a)*r, 0]);
      }
      return pts;
    }
    let mask = null;
    if(t==='text'){
      const txt = (scene.text||'').trim() || 'LOOK UP';
      const fam = scene.font || '"Zen Kaku Gothic New","Hiragino Sans",sans-serif';
      mask = maskFromCanvas(mk, 1400, 340, (ctx,w,h)=>{
        let size=250; ctx.font=`900 ${size}px ${fam}`;
        const mw = ctx.measureText(txt).width;
        if(mw>w-60){ size = Math.floor(size*(w-60)/mw); ctx.font=`900 ${size}px ${fam}`; }
        ctx.textAlign='center'; ctx.textBaseline='middle';
        ctx.fillText(txt, w/2, h/2+size*0.04);
      });
      const len = [...txt].length;
      return sampleMask(mask, N, 1, len<=2 ? 0.62 : 0.5) || [];
    }
    if(t==='heart'){
      mask = maskFromCanvas(mk, 420, 400, ctx=>{
        ctx.beginPath(); ctx.moveTo(210,370);
        ctx.bezierCurveTo(40,250,10,140,60,80); ctx.bezierCurveTo(110,20,190,40,210,110);
        ctx.bezierCurveTo(230,40,310,20,360,80); ctx.bezierCurveTo(410,140,380,250,210,370);
        ctx.fill();
      });
      return sampleMask(mask, N, 0.8, 0.78) || [];
    }
    if(t==='star'){
      mask = maskFromCanvas(mk, 400, 400, ctx=>{
        ctx.beginPath();
        for(let i=0;i<10;i++){ const r=i%2?78:190, a=-Math.PI/2+i*Math.PI/5; ctx.lineTo(200+Math.cos(a)*r, 210+Math.sin(a)*r); }
        ctx.closePath(); ctx.fill();
      });
      return sampleMask(mask, N, 0.82, 0.8) || [];
    }
    if(t==='drone'){
      mask = maskFromCanvas(mk, 500, 500, ctx=>{
        const c=250, d=145;
        ctx.lineWidth=26; ctx.lineCap='round';
        ctx.beginPath(); ctx.moveTo(c-d,c-d); ctx.lineTo(c+d,c+d); ctx.moveTo(c+d,c-d); ctx.lineTo(c-d,c+d); ctx.stroke();
        ctx.lineWidth=20;
        for(const [sx,sy] of [[-1,-1],[1,-1],[-1,1],[1,1]]){ ctx.beginPath(); ctx.arc(c+sx*d,c+sy*d,82,0,Math.PI*2); ctx.stroke(); }
        ctx.beginPath(); ctx.roundRect ? ctx.roundRect(c-62,c-62,124,124,26) : ctx.rect(c-62,c-62,124,124); ctx.fill();
      });
      return sampleMask(mask, N, 0.8, 0.8) || [];
    }
    if(t==='image' && scene.mask){
      return sampleMask(scene.mask, N, 0.9, 0.8) || [];
    }
    return shapePoints({type:'heart'}, N, mk);
  }

  // ---- 割り当て（近いドローンから順に） ----
  function assign(from, targets, seed){
    const n=from.length, used=new Uint8Array(n), out=new Array(n), r=rng(seed);
    const order=[...Array(n).keys()];
    for(let i=n-1;i>0;i--){ const j=Math.floor(r()*(i+1)); [order[i],order[j]]=[order[j],order[i]]; }
    for(const i of order){
      const a=from[i]; let best=-1, bd=Infinity;
      for(let j=0;j<n;j++){ if(used[j]) continue; const b=targets[j];
        const d=(a[0]-b[0])**2+(a[1]-b[1])**2+(a[2]-b[2])**2; if(d<bd){bd=d;best=j;} }
      used[best]=1; out[i]=targets[best];
    }
    return out;
  }

  const ease = u => u<0.5 ? 4*u*u*u : 1-Math.pow(-2*u+2,3)/2;

  // ---- タイムライン ----
  // opts: n(機数), width(m), dot(m), hold(s), move(s)
  function build(scenes, opts, mk){
    const n=opts.n, W=opts.width, dot=opts.dot;
    const hold=opts.hold??3.5, move=opts.move??3, base=0.06*(W/0.3)+0.02;
    const cols=Math.ceil(Math.sqrt(n)), rows=Math.ceil(n/cols), sp=Math.min(0.025, W*0.75/cols);
    const groundY = dot*0.22;
    const slots=[];
    for(let i=0;i<n;i++){ const c=i%cols, r=Math.floor(i/cols);
      slots.push([(c-(cols-1)/2)*sp, groundY, (r-(rows-1)/2)*sp]); }
    const T=[], P=[], C=[];
    const key=(t,pos,col)=>{ T.push(+t.toFixed(3)); P.push(pos.map(p=>p.slice())); C.push(col); };
    const trans=(t0,a,b,c0,c1,dur,m,bulge)=>{
      for(let j=1;j<=m;j++){
        const u=j/m, e=ease(u), s=Math.sin(Math.PI*u);
        const pos=a.map((p,i)=>{ const q=b[i];
          const lane = bulge ? (((i*7)%5)-2)*0.011*(W/0.3)*s : 0;
          return [p[0]+(q[0]-p[0])*e, p[1]+(q[1]-p[1])*e, p[2]+(q[2]-p[2])*e+lane]; });
        key(t0+dur*u, pos, u<0.5?c0:c1);
      }
      return t0+dur;
    };
    const world = pts => pts.map(p=>[p[0]*W, base+p[1]*W, p[2]*W]);
    const list = scenes.length ? scenes : [{type:'heart',color:2}];
    const forms = list.map(s=>{ let pts=shapePoints(s,n,mk); if(!pts||pts.length<n) pts=shapePoints({type:'heart'},n,mk); return world(pts); });

    let t=0, cur=slots;
    const c0=list[0].color??0;
    key(0,cur,c0); key(1.6,cur,c0);                    // 地上で点灯したまま待機
    const lift=slots.map(p=>[p[0],base*0.75,p[2]]);
    t=trans(1.6,cur,lift,c0,c0,2.0,3,false); cur=lift;  // 垂直に離陸
    list.forEach((s,k)=>{
      const col=s.color??0, prev=k?(list[k-1].color??0):c0;
      const tgt=assign(cur, forms[k], 17+k);
      t=trans(t,cur,tgt,prev,col,k?move:3.2,8,true); cur=tgt;
      t+=hold; key(t,cur,col);
    });
    const last=list[list.length-1].color??0;
    // 自分の離陸地点の上へ戻る → 降下 → 消灯
    t=trans(t,cur,lift,last,last,3.2,8,true); cur=lift;
    t+=0.4; key(t,cur,last);
    t=trans(t,cur,slots,last,last,2.0,3,false); cur=slots;
    t+=0.5; key(t,cur,last); t+=0.6; key(t,cur,c0); t+=1.0; key(t,cur,c0);   // 最初の色に戻してループ
    return {T,P,C,n,dot,width:W,base,duration:t,slots,glow:opts.glow??0.75,
      height: Math.max(...forms.map(f=>Math.max(...f.map(p=>p[1])))) };
  }

  // 時刻 t での位置と色（プレビュー用、USDと同じ直線補間）
  function sample(tl, t, outPos, outScale){
    const T=tl.T; let k=0;
    while(k<T.length-2 && T[k+1]<=t) k++;
    const u = Math.min(1,Math.max(0,(t-T[k])/((T[k+1]-T[k])||1)));
    const A=tl.P[k], B=tl.P[k+1];
    for(let i=0;i<tl.n;i++){ outPos[i*3]=A[i][0]+(B[i][0]-A[i][0])*u; outPos[i*3+1]=A[i][1]+(B[i][1]-A[i][1])*u; outPos[i*3+2]=A[i][2]+(B[i][2]-A[i][2])*u; }
    const ca=tl.C[k], cb=tl.C[k+1];
    // 色ごとの光の大きさ（0〜1）
    for(let c=0;c<PALETTE.length;c++) outScale[c]=(ca===c?1-u:0)+(cb===c?u:0);
    return k;
  }

  // ---- USDA / USDZ ----
  function sphereMesh(seg, ring){
    const pts=[[0,0.5,0]];
    for(let r=1;r<ring;r++){ const ph=Math.PI*r/ring; for(let s=0;s<seg;s++){ const th=2*Math.PI*s/seg;
      pts.push([0.5*Math.sin(ph)*Math.cos(th),0.5*Math.cos(ph),0.5*Math.sin(ph)*Math.sin(th)]); } }
    pts.push([0,-0.5,0]);
    const cnt=[], idx=[], last=pts.length-1;
    for(let s=0;s<seg;s++){ cnt.push(3); idx.push(0,1+(s+1)%seg,1+s); }
    for(let r=0;r<ring-2;r++) for(let s=0;s<seg;s++){
      const a=1+r*seg+s, b=1+r*seg+(s+1)%seg, c=a+seg, d=b+seg; cnt.push(4); idx.push(a,b,d,c); }
    const off=1+(ring-2)*seg;
    for(let s=0;s<seg;s++){ cnt.push(3); idx.push(last,off+s,off+(s+1)%seg); }
    const f=v=>+v.toFixed(3);
    const P=pts.map(p=>`(${f(p[0])}, ${f(p[1])}, ${f(p[2])})`).join(', ');
    const N=pts.map(p=>`(${f(p[0]*2)}, ${f(p[1]*2)}, ${f(p[2]*2)})`).join(', ');
    return `int[] faceVertexCounts = [${cnt}]
        int[] faceVertexIndices = [${idx}]
        normal3f[] normals = [${N}] (interpolation = "vertex")
        point3f[] points = [${P}]
        uniform token subdivisionScheme = "none"`;
  }

  function toUSDA(tl){
    const fps=24, fr=t=>+(t*fps).toFixed(2), g=v=>+v.toFixed(4), d=tl.dot;
    const used=[...new Set(tl.C.filter(c=>c>=0))];
    const mesh=sphereMesh(6,4), haloMesh=sphereMesh(8,4);
    const gl=tl.glow??0.75, haloS=g(1.8+gl*2.2), haloA=g(0.10+gl*0.16);
    const off=1e-4;
    // 色ごとの拡大率アニメ（全機共通）
    const scaleSamples={};
    for(const c of used){
      const arr=[]; const on=k=>tl.C[k]===c;
      tl.T.forEach((t,k)=>{
        const prevOn = k>0 && on(k-1), nextOn = k<tl.T.length-1 && on(k+1);
        if(k===0||k===tl.T.length-1||on(k)!==prevOn||on(k)!==nextOn){
          const s=on(k)?d:d*off; arr.push(`${fr(t)}: (${g(s)}, ${g(s)}, ${g(s)})`);
        }
      });
      scaleSamples[c]=arr.join(', ');
    }
    const L=[];
    L.push(`#usda 1.0
(
    customLayerData = {
        string creator = "LOOK UP DRONE desk show"
    }
    defaultPrim = "Root"
    metersPerUnit = 1
    upAxis = "Y"
    startTimeCode = 0
    endTimeCode = ${fr(tl.duration)}
    timeCodesPerSecond = ${fps}
    framesPerSecond = ${fps}
)

def Xform "Root" (
    kind = "component"
)
{
    def Scope "Looks"
    {
        def Material "Body"
        {
            token outputs:surface.connect = </Root/Looks/Body/Surface.outputs:surface>
            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (0.12, 0.12, 0.13)
                float inputs:roughness = 0.5
                float inputs:metallic = 0.2
                token outputs:surface
            }
        }`);
    for(const c of used){ const p=PALETTE[c].rgb;
      L.push(`        def Material "Light${c}"
        {
            token outputs:surface.connect = </Root/Looks/Light${c}/Surface.outputs:surface>
            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (${p.join(', ')})
                color3f inputs:emissiveColor = (${p.map(v=>g(v+(1-v)*0.4)).join(', ')})
                float inputs:roughness = 0.9
                token outputs:surface
            }
        }
        def Material "Halo${c}"
        {
            token outputs:surface.connect = </Root/Looks/Halo${c}/Surface.outputs:surface>
            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (0, 0, 0)
                color3f inputs:emissiveColor = (${p.join(', ')})
                float inputs:opacity = ${haloA}
                float inputs:roughness = 1
                token outputs:surface
            }
        }`); }
    L.push(`    }

    def Xform "Show"
    {`);
    for(let i=0;i<tl.n;i++){
      const ts=tl.T.map((t,k)=>{ const p=tl.P[k][i]; return `${fr(t)}: (${g(p[0])}, ${g(p[1])}, ${g(p[2])})`; }).join(', ');
      L.push(`        def Xform "D${i}"
        {
            double3 xformOp:translate.timeSamples = { ${ts} }
            uniform token[] xformOpOrder = ["xformOp:translate"]`);
      for(const c of used){
        L.push(`
            def Xform "Light${c}"
            {
                float3 xformOp:scale.timeSamples = { ${scaleSamples[c]} }
                uniform token[] xformOpOrder = ["xformOp:scale"]

                def Mesh "Core" (
                    prepend apiSchemas = ["MaterialBindingAPI"]
                )
                {
        ${mesh}
                    rel material:binding = </Root/Looks/Light${c}>
                }
${gl<0.05?'':`
                def Mesh "Halo" (
                    prepend apiSchemas = ["MaterialBindingAPI"]
                )
                {
        ${haloMesh}
                    rel material:binding = </Root/Looks/Halo${c}>
                    float3 xformOp:scale = (${haloS}, ${haloS}, ${haloS})
                    uniform token[] xformOpOrder = ["xformOp:scale"]
                }
`}            }`);
      }
      L.push(`        }`);
    }
    L.push(`    }
}
`);
    return L.join('\n');
  }


  // ---- まとめ方式：色ごとに全機を1つの部品にし、骨組み（UsdSkel）で1機ずつ動かす ----
  function rawSphere(seg, ring){
    const pts=[[0,0.5,0]];
    for(let r=1;r<ring;r++){ const ph=Math.PI*r/ring; for(let s=0;s<seg;s++){ const th=2*Math.PI*s/seg;
      pts.push([0.5*Math.sin(ph)*Math.cos(th),0.5*Math.cos(ph),0.5*Math.sin(ph)*Math.sin(th)]); } }
    pts.push([0,-0.5,0]);
    const cnt=[], idx=[], last=pts.length-1;
    for(let s=0;s<seg;s++){ cnt.push(3); idx.push(0,1+(s+1)%seg,1+s); }
    for(let r=0;r<ring-2;r++) for(let s=0;s<seg;s++){
      const a=1+r*seg+s, b=1+r*seg+(s+1)%seg; cnt.push(4); idx.push(a,b,b+seg,a+seg); }
    const off=1+(ring-2)*seg;
    for(let s=0;s<seg;s++){ cnt.push(3); idx.push(last,off+s,off+(s+1)%seg); }
    return {pts,cnt,idx};
  }
  const CHUNK=60;
  function toUSDASkel(tl){
    const fps=24, fr=t=>+(t*fps).toFixed(2), g=v=>+v.toFixed(4), d=tl.dot;
    const used=[...new Set(tl.C.filter(c=>c>=0))];
    const gl=tl.glow??0.75, halo=gl>=0.05, haloS=1.8+gl*2.2, haloA=g(0.10+gl*0.16), OFF=0.01;
    const core=rawSphere(4,3), hs=rawSphere(5,3);
    const p0=tl.P[0];
    const chunks=[]; for(let s=0;s<tl.n;s+=CHUNK) chunks.push([s,Math.min(tl.n,s+CHUNK)]);
    const I='((1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0), (0, 0, 0, 1))';
    const tm=p=>`((1, 0, 0, 0), (0, 1, 0, 0), (0, 0, 1, 0), (${g(p[0])}, ${g(p[1])}, ${g(p[2])}, 1))`;
    let minY=Infinity,maxY=-Infinity,maxR=0;
    tl.P.forEach(fr_=>fr_.forEach(p=>{ minY=Math.min(minY,p[1]); maxY=Math.max(maxY,p[1]); maxR=Math.max(maxR,Math.abs(p[0]),Math.abs(p[2])); }));
    const pad=d*haloS;
    const ext=`[(${g(-maxR-pad)}, ${g(Math.max(0,minY-pad))}, ${g(-maxR-pad)}), (${g(maxR+pad)}, ${g(maxY+pad)}, ${g(maxR+pad)})]`;
    const L=[];
    L.push(`#usda 1.0
(
    customLayerData = {
        string creator = "LOOK UP DRONE desk show (skinned)"
    }
    defaultPrim = "Root"
    metersPerUnit = 1
    upAxis = "Y"
    startTimeCode = 0
    endTimeCode = ${fr(tl.duration)}
    timeCodesPerSecond = ${fps}
    framesPerSecond = ${fps}
)

def Xform "Root" (
    kind = "component"
)
{
    def Scope "Looks"
    {`);
    for(const c of used){ const p=PALETTE[c].rgb;
      L.push(`        def Material "Light${c}"
        {
            token outputs:surface.connect = </Root/Looks/Light${c}/Surface.outputs:surface>
            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (${p.join(', ')})
                color3f inputs:emissiveColor = (${p.map(v=>g(v+(1-v)*0.4)).join(', ')})
                float inputs:roughness = 0.9
                token outputs:surface
            }
        }
        def Material "Halo${c}"
        {
            token outputs:surface.connect = </Root/Looks/Halo${c}/Surface.outputs:surface>
            def Shader "Surface"
            {
                uniform token info:id = "UsdPreviewSurface"
                color3f inputs:diffuseColor = (0, 0, 0)
                color3f inputs:emissiveColor = (${p.join(', ')})
                float inputs:opacity = ${haloA}
                float inputs:roughness = 1
                token outputs:surface
            }
        }`); }
    L.push(`    }`);
    const nc=used.length, F=v=>+v.toFixed(4);
    chunks.forEach(([a,b],ci)=>{
      const m=b-a, names=[];
      // 骨の並び：機体の骨（位置）→ その子の色の骨（点灯）
      for(let i=a;i<b;i++){ names.push(`"d${i}"`); used.forEach(c=>names.push(`"d${i}/c${c}"`)); }
      const jn=names.join(', '), J=m*(1+nc);
      const tr=tl.T.map((t,k)=>{ const arr=[];
        for(let i=a;i<b;i++){ const p=tl.P[k][i]; arr.push(`(${F(p[0])},${F(p[1])},${F(p[2])})`); for(let x=0;x<nc;x++) arr.push('(0,0,0)'); }
        return `${fr(t)}: [${arr.join(',')}]`; }).join(',\n                ');
      const change=new Set();
      tl.T.forEach((t,k)=>{ if(k===0||k===tl.T.length-1) change.add(k);
        if(k>0&&tl.C[k]!==tl.C[k-1]){ change.add(k-1); change.add(k); } });
      const sc=[...change].sort((x,y)=>x-y).map(k=>{ const arr=[];
        const one=used.map(c=>tl.C[k]===c?'(1,1,1)':`(${OFF},${OFF},${OFF})`);
        for(let i=a;i<b;i++){ arr.push('(1,1,1)'); arr.push(...one); }
        return `${fr(tl.T[k])}: [${arr.join(',')}]`; }).join(',\n                ');
      const bind=[], rest=[];
      for(let i=a;i<b;i++){ bind.push(tm(p0[i])); rest.push(tm(p0[i])); used.forEach(()=>{ bind.push(tm(p0[i])); rest.push(I); }); }
      const rot=Array(J).fill('(1,0,0,0)').join(',');
      const meshText=(sph,radius,ui,c,kind)=>{
        const pts=[], nrm=[], cnt=[], idx=[], ji=[];
        for(let j=0;j<m;j++){ const p=p0[a+j], base=j*sph.pts.length, joint=j*(1+nc)+1+ui;
          sph.pts.forEach(v=>{ pts.push(`(${F(p[0]+v[0]*radius)},${F(p[1]+v[1]*radius)},${F(p[2]+v[2]*radius)})`); ji.push(joint); });
          cnt.push(...sph.cnt); sph.idx.forEach(x=>idx.push(x+base)); }
        return `
        def Mesh "${kind}${c}" (
            prepend apiSchemas = ["SkelBindingAPI", "MaterialBindingAPI"]
        )
        {
            float3[] extent = ${ext}
            int[] faceVertexCounts = [${cnt}]
            int[] faceVertexIndices = [${idx}]
            point3f[] points = [${pts.join(',')}]
            uniform token subdivisionScheme = "none"
            matrix4d primvars:skel:geomBindTransform = ${I}
            int[] primvars:skel:jointIndices = [${ji}] (
                elementSize = 1
                interpolation = "vertex"
            )
            float[] primvars:skel:jointWeights = [${ji.map(()=>1)}] (
                elementSize = 1
                interpolation = "vertex"
            )
            rel skel:skeleton = </Root/Show${ci}/Skel>
            rel material:binding = </Root/Looks/${kind==='Core'?'Light':'Halo'}${c}>
        }`;
      };
      L.push(`
    def SkelRoot "Show${ci}" (
        prepend apiSchemas = ["SkelBindingAPI"]
    )
    {
        float3[] extent = ${ext}

        def Skeleton "Skel" (
            prepend apiSchemas = ["SkelBindingAPI"]
        )
        {
            uniform token[] joints = [${jn}]
            uniform matrix4d[] bindTransforms = [${bind.join(', ')}]
            uniform matrix4d[] restTransforms = [${rest.join(', ')}]
            rel skel:animationSource = </Root/Show${ci}/Anim>
        }

        def SkelAnimation "Anim"
        {
            uniform token[] joints = [${jn}]
            float3[] translations.timeSamples = {
                ${tr}
            }
            quatf[] rotations = [${rot}]
            half3[] scales.timeSamples = {
                ${sc}
            }
        }`);
      used.forEach((c,ui)=>{ L.push(meshText(core,d,ui,c,'Core')); if(halo) L.push(meshText(hs,d*haloS,ui,c,'Halo')); });
      L.push(`    }`);
    });
    L.push(`}
`);
    return L.join('\n');
  }

  function toUSDZ(tl, fflate, mode){
    const files={'show.usda': fflate.strToU8(mode==='classic'?toUSDA(tl):toUSDASkel(tl))};
    let offset=0;
    for(const name in files){
      const file=files[name];
      offset += 34 + name.length;
      const mod=offset&63;
      if(mod!==4){ files[name]=[file,{extra:{12345:new Uint8Array(64-mod)}}]; }
      offset=file.length;
    }
    return fflate.zipSync(files,{level:0});
  }

  function arParts(tl,mode){ if(mode!=='classic') return Math.ceil(tl.n/CHUNK)*new Set(tl.C.filter(x=>x>=0)).size*((tl.glow??0.75)<0.05?1:2);
    return tl.n*new Set(tl.C.filter(x=>x>=0)).size*((tl.glow??0.75)<0.05?1:2); }
  const api={arParts,PALETTE,SHAPES,build,sample,toUSDA,toUSDASkel,toUSDZ,shapePoints};
  if(typeof module!=='undefined' && module.exports) module.exports=api; else root.DeskShow=api;
})(typeof self!=='undefined'?self:this);
