/* 防災ドローンポートAR：ジオラマ・アニメーション・タップ付きUSDZ書き出し（ブラウザ/Node共通） */
(function(root){
  'use strict';

  // ---------- 基本 ----------
  const SEA0 = 0.032, BASE = 0.02;
  const rng = s => () => { s|=0; s=s+0x6D2B79F5|0; let t=Math.imul(s^s>>>15,1|s); t=t+Math.imul(t^t>>>7,61|t)^t; return ((t^t>>>14)>>>0)/4294967296; };
  const sm = (a,b,x) => { const t=Math.min(1,Math.max(0,(x-a)/(b-a))); return t*t*(3-2*t); };
  const lerp = (a,b,t) => a+(b-a)*t;
  const ease = u => u<0.5 ? 4*u*u*u : 1-Math.pow(-2*u+2,3)/2;

  // 地形の高さ（m）：左が高台、中央が低地の町、右が海
  function H(x,z){
    let y = 0.036 + 0.0015*Math.sin(x*40+z*23);
    const hill = sm(-0.095,-0.18,x);
    y += hill*(0.098 + 0.010*Math.sin(z*17+1.3) + 0.006*Math.cos(z*31));
    const g = sm(0.10,0.175,x);
    y = lerp(y, 0.0245, g);
    return y;
  }
  function slope(x,z){ const e=0.002; const dx=(H(x+e,z)-H(x-e,z))/(2*e), dz=(H(x,z+e)-H(x,z-e))/(2*e); return {dx,dz,s:Math.hypot(dx,dz)}; }
  function nrm(x,z){ const {dx,dz}=slope(x,z); const l=Math.hypot(dx,1,dz); return [-dx/l,1/l,-dz/l]; }

  // ---------- メッシュ ----------
  const M = () => ({p:[],n:[],uv:[],i:[]});
  const sub=(a,b)=>[a[0]-b[0],a[1]-b[1],a[2]-b[2]], cross=(a,b)=>[a[1]*b[2]-a[2]*b[1],a[2]*b[0]-a[0]*b[2],a[0]*b[1]-a[1]*b[0]], dot=(a,b)=>a[0]*b[0]+a[1]*b[1]+a[2]*b[2];
  const unit=v=>{const l=Math.hypot(...v)||1; return [v[0]/l,v[1]/l,v[2]/l];};
  function quad(m,a,b,c,d,out,uvs){
    let n=unit(cross(sub(b,a),sub(c,a)));
    if(out && dot(n,out)<0){ [b,d]=[d,b]; if(uvs) uvs=[uvs[0],uvs[3],uvs[2],uvs[1]]; n=[-n[0],-n[1],-n[2]]; }
    const k=m.p.length/3;
    [a,b,c,d].forEach((v,j)=>{ m.p.push(...v); m.n.push(...n); m.uv.push(...(uvs?uvs[j]:[0,0])); });
    m.i.push(k,k+1,k+2,k,k+2,k+3);
  }
  function tri(m,a,b,c,out){
    let n=unit(cross(sub(b,a),sub(c,a)));
    if(out && dot(n,out)<0){ [b,c]=[c,b]; n=[-n[0],-n[1],-n[2]]; }
    const k=m.p.length/3;
    [a,b,c].forEach(v=>{ m.p.push(...v); m.n.push(...n); m.uv.push(0,0); });
    m.i.push(k,k+1,k+2);
  }
  function box(m,x0,y0,z0,x1,y1,z1){
    const P=(x,y,z)=>[x,y,z];
    quad(m,P(x1,y0,z0),P(x1,y1,z0),P(x1,y1,z1),P(x1,y0,z1),[1,0,0]);
    quad(m,P(x0,y0,z0),P(x0,y0,z1),P(x0,y1,z1),P(x0,y1,z0),[-1,0,0]);
    quad(m,P(x0,y1,z0),P(x0,y1,z1),P(x1,y1,z1),P(x1,y1,z0),[0,1,0]);
    quad(m,P(x0,y0,z0),P(x1,y0,z0),P(x1,y0,z1),P(x0,y0,z1),[0,-1,0]);
    quad(m,P(x0,y0,z1),P(x1,y0,z1),P(x1,y1,z1),P(x0,y1,z1),[0,0,1]);
    quad(m,P(x0,y0,z0),P(x0,y1,z0),P(x1,y1,z0),P(x1,y0,z0),[0,0,-1]);
  }
  function rbox(m,cx,cy,cz,w,h,d,ry){ // 回転した箱（Y軸）
    const c=Math.cos(ry), s=Math.sin(ry), T=(x,y,z)=>[cx+x*c+z*s, cy+y, cz-x*s+z*c];
    const t=new Float64Array(0); void t;
    const k=m.p.length; box(m,-w/2,0,-d/2,w/2,h,d/2);
    for(let j=k;j<m.p.length;j+=3){ const v=T(m.p[j],m.p[j+1],m.p[j+2]); m.p[j]=v[0]; m.p[j+1]=v[1]; m.p[j+2]=v[2];
      const nx=m.n[j], nz=m.n[j+2]; m.n[j]=nx*c+nz*s; m.n[j+2]=-nx*s+nz*c; }
  }
  function roof(m,cx,cy,cz,w,d,h,ry){ // 切妻屋根（棟はX方向）
    const c=Math.cos(ry), s=Math.sin(ry), T=v=>[cx+v[0]*c+v[2]*s, cy+v[1], cz-v[0]*s+v[2]*c];
    const o=0.002, a=T([-w/2-o,0,-d/2-o]), b=T([w/2+o,0,-d/2-o]), e=T([w/2+o,0,d/2+o]), f=T([-w/2-o,0,d/2+o]), r0=T([-w/2-o,h,0]), r1=T([w/2+o,h,0]);
    const C=T([0,h/2,0]);
    quad(m,a,b,r1,r0,sub(unit(sub(T([0,0,-d]),T([0,0,0]))),[0,-1,0]));
    quad(m,f,r0,r1,e,sub(unit(sub(T([0,0,d]),T([0,0,0]))),[0,-1,0]));
    tri(m,a,r0,f,sub(a,C)); tri(m,b,e,r1,sub(b,C));
    quad(m,a,f,e,b,[0,-1,0]);
  }
  function cyl(m,cx,cy,cz,r,h,seg=12){
    for(let k=0;k<seg;k++){
      const a0=k/seg*Math.PI*2, a1=(k+1)/seg*Math.PI*2;
      const p0=[cx+Math.cos(a0)*r,cy,cz+Math.sin(a0)*r], p1=[cx+Math.cos(a1)*r,cy,cz+Math.sin(a1)*r];
      const q0=[p0[0],cy+h,p0[2]], q1=[p1[0],cy+h,p1[2]];
      const kk=m.p.length/3, n0=[Math.cos(a0),0,Math.sin(a0)], n1=[Math.cos(a1),0,Math.sin(a1)];
      [[p0,n0],[p1,n1],[q1,n1],[q0,n0]].forEach(([v,n])=>{ m.p.push(...v); m.n.push(...n); m.uv.push(0,0); });
      m.i.push(kk,kk+2,kk+1,kk,kk+3,kk+2);
      tri(m,[cx,cy+h,cz],q0,q1,[0,1,0]); tri(m,[cx,cy,cz],p1,p0,[0,-1,0]);
    }
  }
  function cone(m,cx,cy,cz,r,h,seg=12,open=false){ // 頂点が上
    for(let k=0;k<seg;k++){
      const a0=k/seg*Math.PI*2, a1=(k+1)/seg*Math.PI*2, am=(a0+a1)/2;
      const p0=[cx+Math.cos(a0)*r,cy,cz+Math.sin(a0)*r], p1=[cx+Math.cos(a1)*r,cy,cz+Math.sin(a1)*r], t=[cx,cy+h,cz];
      tri(m,p0,p1,t,[Math.cos(am),r/h,Math.sin(am)]);
      if(open) tri(m,p0,p1,t,[-Math.cos(am),-r/h,-Math.sin(am)]);
      else tri(m,[cx,cy,cz],p0,p1,[0,-1,0]);
    }
  }
  function dome(m,rx,ry,rz,seg=12,ring=5){ // 底が原点
    const pt=(r,s)=>{ const ph=(Math.PI/2)*r/ring, th=2*Math.PI*s/seg; return [Math.cos(th)*Math.sin(ph)*rx, Math.cos(ph)*ry, Math.sin(th)*Math.sin(ph)*rz]; };
    for(let r=0;r<ring;r++) for(let s=0;s<seg;s++){
      const a=pt(r,s), b=pt(r,s+1), c=pt(r+1,s+1), d=pt(r+1,s);
      const mid=[(a[0]+c[0])/2,(a[1]+c[1])/2,(a[2]+c[2])/2];
      if(r===0) tri(m,a,c,d,mid); else quad(m,a,b,c,d,mid);
    }
  }
  // 地形に沿わせた帯や面
  function drape(m,x0,x1,z0,z1,nx,nz,off,keep){
    const P=(i,j)=>{ const x=lerp(x0,x1,i/nx), z=lerp(z0,z1,j/nz); return [x,H(x,z)+off,z]; };
    for(let i=0;i<nx;i++) for(let j=0;j<nz;j++){
      if(keep && !keep(lerp(x0,x1,(i+0.5)/nx), lerp(z0,z1,(j+0.5)/nz))) continue;
      quad(m,P(i,j),P(i,j+1),P(i+1,j+1),P(i+1,j),[0,1,0]);
    }
  }
  function shift(m,dx,dy,dz){ for(let j=0;j<m.p.length;j+=3){ m.p[j]-=dx; m.p[j+1]-=dy; m.p[j+2]-=dz; } return m; }

  // ---------- 材質 ----------
  const MAT = {
    base:{c:[0.17,0.12,0.09],r:0.8}, soilSide:{c:[0.42,0.30,0.20],r:0.95},
    grass:{c:[0.42,0.62,0.30],r:0.9}, hill:{c:[0.25,0.45,0.22],r:0.9}, cliff:{c:[0.50,0.44,0.35],r:0.95}, sand:{c:[0.86,0.78,0.58],r:0.95},
    road:{c:[0.28,0.28,0.30],r:0.85}, sea:{c:[0.10,0.42,0.72],r:0.15,o:0.82}, flood:{c:[0.42,0.38,0.26],r:0.2,o:0.80}, wave:{c:[0.80,0.92,0.98],r:0.2,o:0.92},
    wall:{c:[0.93,0.91,0.86],r:0.8}, roofR:{c:[0.62,0.20,0.16],r:0.7}, roofB:{c:[0.22,0.30,0.44],r:0.7}, roofG:{c:[0.32,0.34,0.32],r:0.7},
    trunk:{c:[0.36,0.25,0.16],r:0.9}, leaf:{c:[0.16,0.38,0.18],r:0.9},
    scar:{c:[0.48,0.33,0.20],r:1}, debris:{c:[0.45,0.31,0.19],r:1}, rock:{c:[0.40,0.38,0.35],r:0.9},
    pad:{c:[0.62,0.62,0.60],r:0.9}, dock:{c:[0.88,0.89,0.90],r:0.45,m:0.1}, dockDark:{c:[0.18,0.19,0.21],r:0.5},
    lampG:{c:[0.1,0.9,0.35],e:[0.15,1.0,0.4]}, lampR:{c:[1,0.1,0.08],e:[1.0,0.12,0.08]}, bat:{c:[0.2,0.9,0.4],e:[0.25,1.0,0.45]},
    drone:{c:[0.16,0.17,0.19],r:0.4,m:0.3}, rotor:{c:[0.55,0.58,0.62],r:0.4,o:0.45}, led:{c:[1,0.6,0.1],e:[1,0.65,0.15]},
    beam:{c:[1,0.92,0.55],e:[1,0.88,0.45],o:0.28},
    btnSlide:{c:[1,1,1],tex:'slide'}, btnTsunami:{c:[1,1,1],tex:'tsunami'}, btnGo:{c:[1,1,1],tex:'go'}, plate:{c:[1,1,1],tex:'plate'},
    pedestal:{c:[0.20,0.21,0.24],r:0.5},
  };

  // ---------- ラベル画像 ----------
  const LABELS = {
    slide:{w:512,h:208,bg:'#7a4a24',fg:'#fff6e8',title:'崖崩れ発生',sub:'タップで災害を起こす'},
    tsunami:{w:512,h:208,bg:'#145a96',fg:'#eef7ff',title:'津波発生',sub:'タップで災害を起こす'},
    go:{w:640,h:208,bg:'#d42a1e',fg:'#ffffff',title:'ドローン出動',sub:'タップでポートが開きます'},
    plate:{w:1024,h:96,bg:'#1d1612',fg:'#f2e6d2',title:'防災ドローンポート',sub:'ルックアップドローン'},
  };
  function drawLabel(ctx,L,font){
    const {w,h}=L; ctx.fillStyle=L.bg; ctx.fillRect(0,0,w,h);
    ctx.strokeStyle='rgba(255,255,255,.35)'; ctx.lineWidth=6; ctx.strokeRect(10,10,w-20,h-20);
    ctx.fillStyle=L.fg; ctx.textAlign='center'; ctx.textBaseline='middle';
    if(h<120){ ctx.font=`900 52px ${font}`; ctx.textAlign='left'; ctx.fillText(L.title,40,h/2+2);
      ctx.font=`700 34px ${font}`; ctx.textAlign='right'; ctx.globalAlpha=.8; ctx.fillText(L.sub,w-40,h/2+2); ctx.globalAlpha=1; return; }
    ctx.font=`900 ${Math.round(h*0.38)}px ${font}`; ctx.fillText(L.title,w/2,h*0.42);
    ctx.font=`700 ${Math.round(h*0.14)}px ${font}`; ctx.globalAlpha=.85; ctx.fillText(L.sub,w/2,h*0.78); ctx.globalAlpha=1;
  }

  // ---------- 時間割（秒） ----------
  // R:初期状態 / S:崖崩れ / SM:崖崩れ出動 / T:津波 / TM:津波出動
  const CLIPS = {R:{start:0,dur:0.3}, S:{start:1,dur:4.6}, SM:{start:6,dur:24}, T:{start:30.5,dur:6}, TM:{start:37,dur:25.5}};
  const END = 63;
  const ENTRY = {R:null,S:null,SM:'S',T:null,TM:'T'};

  // ---------- シーン ----------
  function build(){
    const nodes=[], byName={};
    const node=(name,parent,o={})=>{ const n={name,parent,mesh:o.mesh||null,mat:o.mat||null,t:o.t||[0,0,0],r:o.r||[0,0,0],s:o.s||[1,1,1],keys:{},tap:!!o.tap}; nodes.push(n); byName[name]=n; return n; };
    node('Root',null); node('Diorama','Root'); node('Buttons','Root');

    // 台座と断面
    let m=M(); box(m,-0.3,0,-0.2,0.3,BASE,0.2); node('Base','Diorama',{mesh:m,mat:'base'});
    m=M(); const N=60;
    for(let k=0;k<N;k++){ // 4辺の土の断面
      const a=k/N, b=(k+1)/N;
      for(const [z,out] of [[0.2,[0,0,1]],[-0.2,[0,0,-1]]]){ const x0=lerp(-0.3,0.3,a), x1=lerp(-0.3,0.3,b);
        quad(m,[x0,BASE,z],[x1,BASE,z],[x1,H(x1,z),z],[x0,H(x0,z),z],out); }
      for(const [x,out] of [[-0.3,[-1,0,0]],[0.3,[1,0,0]]]){ const z0=lerp(-0.2,0.2,a), z1=lerp(-0.2,0.2,b);
        quad(m,[x,BASE,z0],[x,BASE,z1],[x,H(x,z1),z1],[x,H(x,z0),z0],out); }
    }
    node('Skirt','Diorama',{mesh:m,mat:'soilSide'});

    // 地形（材質ごとに分割）
    const TM={grass:M(),hill:M(),cliff:M(),sand:M()}, NX=72, NZ=48;
    const V=(i,j)=>{ const x=lerp(-0.3,0.3,i/NX), z=lerp(-0.2,0.2,j/NZ); return {p:[x,H(x,z),z],n:nrm(x,z)}; };
    for(let i=0;i<NX;i++) for(let j=0;j<NZ;j++){
      const cx=lerp(-0.3,0.3,(i+0.5)/NX), cz=lerp(-0.2,0.2,(j+0.5)/NZ), h=H(cx,cz), s=slope(cx,cz).s;
      const key = cx>0.11 ? 'sand' : s>0.9 ? 'cliff' : h>0.07 ? 'hill' : 'grass';
      const t=TM[key], k=t.p.length/3;
      [V(i,j),V(i,j+1),V(i+1,j+1),V(i+1,j)].forEach(v=>{ t.p.push(...v.p); t.n.push(...v.n); t.uv.push(0,0); });
      t.i.push(k,k+1,k+2,k,k+2,k+3);
    }
    for(const k in TM) node('Ground_'+k,'Diorama',{mesh:TM[k],mat:k});

    // 道路
    m=M(); drape(m,-0.093,-0.077,-0.2,0.2,2,40,0.0012); drape(m,-0.077,0.125,0.053,0.067,28,2,0.0012);
    node('Road','Diorama',{mesh:m,mat:'road'});

    // 家（まとめて1つずつ）
    const R=rng(7), walls=M(), roofs={roofR:M(),roofB:M(),roofG:M()}, houses=[];
    for(let tries=0; houses.length<16 && tries<400; tries++){
      const x=lerp(-0.058,0.105,R()), z=lerp(-0.175,0.175,R());
      if(Math.abs(z-0.06)<0.022) continue;
      if(houses.some(h=>Math.hypot(h[0]-x,h[1]-z)<0.036)) continue;
      houses.push([x,z]);
    }
    houses.forEach(([x,z],k)=>{ const ry=(k%3===0)?Math.PI/2:0, w=0.020+R()*0.006, d=0.016+R()*0.004, h=0.013+R()*0.006, y=H(x,z)-0.002;
      rbox(walls,x,y,z,w,h,d,ry); roof(roofs[['roofR','roofB','roofG'][k%3]],x,y+h,z,w,d,0.008,ry); });
    node('Houses','Diorama',{mesh:walls,mat:'wall'});
    for(const k in roofs) node('Roofs_'+k,'Diorama',{mesh:roofs[k],mat:k});

    // 木（高台）
    const trunk=M(), leaf=M(), RT=rng(21);
    for(let k=0,c=0;k<200 && c<26;k++){
      const x=lerp(-0.295,-0.12,RT()), z=lerp(-0.19,0.19,RT());
      if(Math.hypot(x+0.235,z+0.07)<0.06) continue;             // ポート周り
      if(x>-0.185 && z>-0.005 && z<0.085) continue;              // 崖崩れの斜面
      if(slope(x,z).s>1.1) continue;
      const y=H(x,z)-0.001, s=0.8+RT()*0.5; cyl(trunk,x,y,z,0.0018*s,0.008*s,6); cone(leaf,x,y+0.006*s,z,0.008*s,0.022*s,7); c++;
    }
    node('Trunks','Diorama',{mesh:trunk,mat:'trunk'}); node('Trees','Diorama',{mesh:leaf,mat:'leaf'});

    // 海（高さを伸縮）・浸水・津波
    m=M(); box(m,0.085,0,-0.2,0.3,1,0.2); const sea=node('Sea','Diorama',{mesh:m,mat:'sea',t:[0,BASE,0],s:[1,SEA0-BASE,1]});
    m=M(); box(m,-0.098,0,-0.199,0.17,1,0.199); const flood=node('Flood','Diorama',{mesh:m,mat:'flood',t:[0,0.022,0],s:[1,0.002,1]});
    m=M(); const prof=[[0.034,0],[-0.010,0],[-0.016,0.010],[-0.010,0.024],[0.004,0.032],[0.020,0.024]];
    for(let k=0;k<prof.length;k++){ const a=prof[k], b=prof[(k+1)%prof.length];
      quad(m,[a[0],a[1],-0.198],[b[0],b[1],-0.198],[b[0],b[1],0.198],[a[0],a[1],0.198],[(a[0]+b[0])/2-0.006,(a[1]+b[1])/2-0.014,0]); }
    for(const [z,out] of [[0.198,[0,0,1]],[-0.198,[0,0,-1]]]) for(let k=1;k<prof.length-1;k++) tri(m,[prof[0][0],prof[0][1],z],[prof[k][0],prof[k][1],z],[prof[k+1][0],prof[k+1][1],z],out);
    const wave=node('Wave','Diorama',{mesh:m,mat:'wave',t:[0.31,0.028,0],s:[1,0.001,1]});

    // 崖崩れ
    const SITE={x:-0.135,z:0.04};
    m=M(); drape(m,-0.178,-0.094,0.006,0.074,18,14,0.0016,(x,z)=>((x+0.136)/0.044)**2+((z-0.04)/0.034)**2<1);
    const scarY=H(SITE.x,SITE.z); shift(m,SITE.x,scarY,SITE.z);
    const scar=node('Scar','Diorama',{mesh:m,mat:'scar',t:[SITE.x,scarY,SITE.z],s:[0.001,0.001,0.001]});
    m=M(); dome(m,0.03,0.012,0.028); const topX=-0.172, footX=-0.066;
    const debris=node('Debris','Diorama',{mesh:m,mat:'debris',t:[topX,H(topX,SITE.z)-0.004,SITE.z],s:[0.001,0.001,0.001]});
    const rocks=[]; const RR=rng(5);
    for(let k=0;k<8;k++){ m=M(); const sz=0.005+RR()*0.005; box(m,-sz/2,0,-sz/2,sz/2,sz*0.8,sz/2);
      const x0=topX+RR()*0.01, z0=SITE.z+(RR()-0.5)*0.03, x1=footX-0.002+RR()*0.05, z1=SITE.z+(RR()-0.5)*0.07;
      const r=node('Rock'+k,'Diorama',{mesh:m,mat:'rock',t:[x0,H(x0,z0),z0],s:[0.001,0.001,0.001]}); r.path=[x0,z0,x1,z1,RR()*360,RR()*360,RR()*360]; rocks.push(r); }

    // ドローンポート（オリジナルデザイン）
    const DX=-0.235, DZ=-0.07, DY=Math.max(H(DX-0.03,DZ-0.03),H(DX+0.03,DZ+0.03),H(DX,DZ))+0.002;
    node('Port','Diorama',{t:[DX,DY,DZ]});
    m=M(); box(m,-0.045,-0.006,-0.04,0.045,0.003,0.04); node('Pad','Port',{mesh:m,mat:'pad'});
    const HW=0.026, BH=0.026, HD=0.027;
    m=M(); box(m,-HW,0.003,-HD,HW,BH,HD); node('Body','Port',{mesh:m,mat:'dock'});
    m=M(); box(m,-HW+0.003,BH,-HD+0.003,HW-0.003,BH+0.0008,HD-0.003); node('Landing','Port',{mesh:m,mat:'dockDark'});
    m=M(); cyl(m,HW-0.004,BH,-HD+0.004,0.0012,0.032,6); box(m,HW-0.012,BH+0.03,-HD+0.003,HW+0.004,BH+0.032,-HD+0.005); node('Mast','Port',{mesh:m,mat:'dockDark'});
    const lid=(name,side)=>{ const piv=node(name,'Port',{t:[side*HW,BH,0]}); const L=M(), CH=0.014;
      // 屋根板＋外側の側板＋両端板（ヒンジから内側へ）
      box(L,side>0?-HW:0,CH-0.002,-HD,side>0?0:HW,CH,HD); box(L,side>0?-0.0018:0,0,-HD,side>0?0:0.0018,CH,HD);
      box(L,side>0?-HW:0,0,-HD,side>0?0:HW,CH,-HD+0.0018); box(L,side>0?-HW:0,0,HD-0.0018,side>0?0:HW,CH,HD);
      node(name+'Shell',name,{mesh:L,mat:'dock'}); return piv; };
    const lidL=lid('LidL',-1), lidR=lid('LidR',1);
    m=M(); box(m,-0.016,0.004,HD,0.016,0.012,HD+0.0008); node('Panel','Port',{mesh:m,mat:'dockDark'});
    const bats=[]; for(let k=0;k<5;k++){ m=M(); const x=-0.013+k*0.0057; box(m,x,0.0055,HD+0.0008,x+0.004,0.0105,HD+0.0016); bats.push(node('Bat'+k,'Port',{mesh:m,mat:'bat'})); }
    const lampPos=[HW-0.004,BH+0.032,-HD+0.004];
    m=M(); cyl(m,0,0,0,0.0035,0.005,10); const lampG=node('LampG','Port',{mesh:m,mat:'lampG',t:[...lampPos]});
    m=M(); cyl(m,0,0,0,0.0036,0.0052,10); const lampR=node('LampR','Port',{mesh:m,mat:'lampR',t:[...lampPos],s:[0.001,0.001,0.001]});

    // ドローン
    const P0=[DX,DY+BH+0.0008,DZ];
    const drone=node('Drone','Diorama',{t:[...P0]});
    m=M(); box(m,-0.008,0.002,-0.006,0.008,0.008,0.006);
    for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]){ rbox(m,sx*0.007,0.004,sz*0.007,0.012,0.002,0.0025,sx*sz>0?-Math.PI/4:Math.PI/4); cyl(m,sx*0.012,0.002,sz*0.012,0.0012,0.004,6); }
    box(m,-0.007,0,-0.0045,-0.006,0.002,0.0045); box(m,0.006,0,-0.0045,0.007,0.002,0.0045);
    node('DroneBody','Drone',{mesh:m,mat:'drone'});
    m=M(); for(const [sx,sz] of [[1,1],[1,-1],[-1,1],[-1,-1]]) cyl(m,sx*0.012,0.0062,sz*0.012,0.0075,0.0006,14); node('Rotors','Drone',{mesh:m,mat:'rotor'});
    m=M(); box(m,0.0075,0.004,-0.0015,0.0085,0.006,0.0015); node('DroneLED','Drone',{mesh:m,mat:'led'});
    m=M(); cone(m,0,-0.11,0,0.032,0.11,16,true); const beam=node('Beam','Drone',{mesh:m,mat:'beam',s:[0.001,0.001,0.001]});

    // ボタン（台座の手前）
    const button=(name,mat,x,w,hidden)=>{ const b=node(name,'Buttons',{t:[x,0,0.232],tap:true}); b.hidden=hidden;
      let p=M(); box(p,-w/2-0.004,0,-0.02,w/2+0.004,0.01,0.02); node(name+'Base',name,{mesh:p,mat:'pedestal'});
      p=M(); const hh=w*208/(mat==='btnGo'?640:512), a=-Math.PI/6, cy=0.012+hh/2*Math.cos(a), cz=-0.004;
      const Y=v=>cy+v*Math.cos(a), Z=v=>cz+v*Math.sin(a);
      quad(p,[-w/2,Y(-hh/2),Z(-hh/2)],[w/2,Y(-hh/2),Z(-hh/2)],[w/2,Y(hh/2),Z(hh/2)],[-w/2,Y(hh/2),Z(hh/2)],[0,Math.sin(-a),Math.cos(a)],[[0,0],[1,0],[1,1],[0,1]]);
      // 裏面
      quad(p,[-w/2,Y(-hh/2),Z(-hh/2)-0.0006],[w/2,Y(-hh/2),Z(-hh/2)-0.0006],[w/2,Y(hh/2),Z(hh/2)-0.0006],[-w/2,Y(hh/2),Z(hh/2)-0.0006],[0,-Math.sin(-a),-Math.cos(a)]);
      node(name+'Label',name,{mesh:p,mat});
      return b; };
    button('BtnSlide','btnSlide',-0.085,0.085,false);
    button('BtnTsunami','btnTsunami',0.085,0.085,false);
    button('BtnGoSlide','btnGo',0,0.11,true);
    button('BtnGoTsunami','btnGo',0,0.11,true);
    m=M(); quad(m,[-0.2,0.003,0.2005],[0.2,0.003,0.2005],[0.2,0.0175,0.2005],[-0.2,0.0175,0.2005],[0,0,1],[[0,0],[1,0],[1,1],[0,1]]);
    node('Plate','Diorama',{mesh:m,mat:'plate'});

    // ---------- 動き ----------
    const K=(n,attr,clip,t,v)=>{ ((n.keys[attr]=n.keys[attr]||{})[clip]=n.keys[attr][clip]||[]).push([t,v.slice()]); };
    const step=(n,attr,clip,t,a,b)=>{ K(n,attr,clip,t,a); K(n,attr,clip,t+0.02,b); };
    const OFF=[0.001,0.001,0.001], ON=[1,1,1];
    const blink=(clip,t0,t1,endOn)=>{ let on=false; K(lampG,'s',clip,t0,ON); K(lampG,'s',clip,t0+0.02,OFF);
      for(let t=t0;t<t1;t+=0.22){ step(lampR,'s',clip,t,on?ON:OFF,on?OFF:ON); on=!on; }
      if(on!==endOn) step(lampR,'s',clip,t1,on?ON:OFF,endOn?ON:OFF); K(lampR,'s',clip,CLIPS[clip].dur,endOn?ON:OFF); };

    // 崖崩れ S
    K(scar,'s','S',0.2,OFF); K(scar,'s','S',1.3,ON);
    const dy=-0.004, dPts=[];
    for(let k=0;k<=10;k++){ const u=k/10, x=lerp(topX,footX,u), t=0.7+ease(u)*2.2; dPts.push([t,[x,H(x,SITE.z)+dy,SITE.z]]); }
    K(debris,'s','S',0.2,OFF); K(debris,'s','S',0.6,[1,1,1]); K(debris,'t','S',0,debris.t); dPts.forEach(([t,v])=>K(debris,'t','S',t,v));
    K(debris,'s','S',2.9,[1.7,0.9,1.25]);
    rocks.forEach((r,k)=>{ const [x0,z0,x1,z1,a,b,c]=r.path, d=0.1*k;
      K(r,'s','S',0.4+d,OFF); K(r,'s','S',0.6+d,ON);
      for(let j=0;j<=8;j++){ const u=j/8, x=lerp(x0,x1,u), z=lerp(z0,z1,u), hop=Math.abs(Math.sin(u*Math.PI*3))*0.006*(1-u);
        K(r,'t','S',0.6+d+ease(u)*2.6,[x,H(x,z)+hop,z]); K(r,'r','S',0.6+d+ease(u)*2.6,[a*u,b*u*2,c*u]); } });
    blink('S',0.3,CLIPS.S.dur-0.05,true);

    // 出動の共通部分
    function mission(clip,site,radius,y,loop){
      const c=CLIPS[clip], keyStep=0.1, lift=0.255;
      const tOpen=[0.3,1.5], tLift=[1.5,3.5], tGo=[3.5,6.6], tLoop=[6.6,6.6+loop], tBack=[tLoop[1],tLoop[1]+3.2], tDown=[tBack[1],tBack[1]+2.2], tClose=[tDown[1]+0.2,tDown[1]+1.4], tCharge=[tClose[1]+0.3,tClose[1]+3.6];
      K(lidL,'r',clip,tOpen[0],[0,0,0]); K(lidL,'r',clip,tOpen[1],[0,0,118]); K(lidR,'r',clip,tOpen[0],[0,0,0]); K(lidR,'r',clip,tOpen[1],[0,0,-118]);
      K(lidL,'r',clip,tClose[0],[0,0,118]); K(lidL,'r',clip,tClose[1],[0,0,0]); K(lidR,'r',clip,tClose[0],[0,0,-118]); K(lidR,'r',clip,tClose[1],[0,0,0]);
      const up=[P0[0],lift,P0[2]], A=[site.x+radius,y,site.z];
      const pos=t=>{
        const seg=(a,b,t0,t1,f=ease)=>{ const u=f(Math.min(1,Math.max(0,(t-t0)/(t1-t0)))); return [lerp(a[0],b[0],u),lerp(a[1],b[1],u),lerp(a[2],b[2],u)]; };
        if(t<=tLift[0]) return P0.slice();
        if(t<=tLift[1]) return seg(P0,up,...tLift);
        if(t<=tGo[1]) return seg(up,A,...tGo);
        if(t<=tLoop[1]){ const u=(t-tLoop[0])/loop, a=u*Math.PI*2; return [site.x+Math.cos(a)*radius, y+Math.sin(a*2)*0.006, site.z+Math.sin(a)*radius]; }
        if(t<=tBack[1]) return seg(A,up,...tBack);
        if(t<=tDown[1]) return seg(up,P0,...tDown,u=>1-Math.pow(1-u,2.2));
        return P0.slice();
      };
      let yaw=0, prev=pos(0);
      for(let t=0;t<=c.dur+1e-6;t+=keyStep){
        const p=pos(t), d=[p[0]-prev[0],p[2]-prev[2]];
        if(t>tGo[0] && t<tDown[0] && Math.hypot(...d)>1e-5){ let target=Math.atan2(-d[1],d[0])*180/Math.PI; while(target-yaw>180) target-=360; while(target-yaw<-180) target+=360; yaw=lerp(yaw,target,0.35); }
        else if(t>=tDown[0]) yaw=lerp(yaw,Math.round(yaw/360)*360,0.25);
        K(drone,'t',clip,+t.toFixed(3),p); K(drone,'r',clip,+t.toFixed(3),[0,yaw,0]); prev=p;
      }
      // 最後は向きを0°にそろえる
      const lr=drone.keys.r[clip]; lr[lr.length-1][1]=[0,0,0];
      K(beam,'s',clip,tLoop[0]-0.4,OFF); K(beam,'s',clip,tLoop[0],ON); K(beam,'s',clip,tLoop[1]-0.3,ON); K(beam,'s',clip,tLoop[1],OFF);
      // バッテリー
      const drain=[tGo[1],tLoop[0]+loop*0.6,tBack[1]];
      [4,3,2].forEach((b,k)=>step(bats[b],'s',clip,drain[k],ON,OFF));
      [2,3,4].forEach((b,k)=>{ const t=tCharge[0]+k*1.0; step(bats[b],'s',clip,t,OFF,ON); step(bats[b],'s',clip,t+0.35,ON,OFF); step(bats[b],'s',clip,t+0.6,OFF,ON); });
      // ランプ：運用中は赤点灯、充電完了で緑
      K(lampR,'s',clip,0,ON); step(lampR,'s',clip,tCharge[1],ON,OFF); K(lampG,'s',clip,0,OFF); step(lampG,'s',clip,tCharge[1],OFF,ON);
      return {tClose,tCharge};
    }

    // 崖崩れの出動 SM
    let mt=mission('SM',SITE,0.05,0.165,6.4);
    const r0=mt.tClose[0], r1=mt.tCharge[1]-0.4;
    const footT=dPts[dPts.length-1][1];
    K(debris,'t','SM',0,footT); K(debris,'s','SM',0,[1.7,0.9,1.25]); K(debris,'s','SM',r0,[1.7,0.9,1.25]); K(debris,'s','SM',r1,[1.7,0.001,1.25]);
    step(debris,'s','SM',r1+0.05,[1.7,0.001,1.25],OFF); step(debris,'t','SM',r1+0.1,footT,debris.t);
    K(scar,'s','SM',r0,ON); K(scar,'s','SM',r1,OFF);
    rocks.forEach(r=>{ const end=r.keys.t.S[r.keys.t.S.length-1][1], rot=r.keys.r.S[r.keys.r.S.length-1][1];
      K(r,'s','SM',r0,ON); K(r,'s','SM',r1,OFF); K(r,'t','SM',0,end); step(r,'t','SM',r1+0.1,end,r.t); K(r,'r','SM',0,rot); step(r,'r','SM',r1+0.1,rot,[0,0,0]); });

    // 津波 T
    const lvl=v=>[1,v-BASE,1];
    K(sea,'s','T',0,lvl(SEA0)); K(sea,'s','T',0.9,lvl(0.027)); K(sea,'s','T',2.6,lvl(0.045));
    K(wave,'t','T',0.6,[0.29,0.028,0]); K(wave,'s','T',0.6,OFF); K(wave,'s','T',1.0,[1,1,1]);
    K(wave,'t','T',3.4,[-0.065,0.03,0]); K(wave,'s','T',3.0,[1,0.85,1]); K(wave,'s','T',3.9,[1,0.001,1]);
    step(wave,'s','T',3.95,[1,0.001,1],OFF); step(wave,'t','T',4.0,[-0.065,0.03,0],wave.t);
    K(flood,'s','T',1.9,[1,0.002,1]); K(flood,'s','T',4.6,[1,0.025,1]);
    blink('T',0.3,CLIPS.T.dur-0.05,true);

    // 津波の出動 TM
    mt=mission('TM',{x:0.035,z:-0.01},0.085,0.15,7.6);
    const f0=mt.tClose[0], f1=mt.tCharge[1]-0.3;
    K(flood,'s','TM',f0,[1,0.025,1]); K(flood,'s','TM',f1,[1,0.002,1]);
    K(sea,'s','TM',f0,lvl(0.045)); K(sea,'s','TM',f1,lvl(SEA0));

    // ---------- 各区間を自己完結にする（区間の始めと終わりに値を置く） ----------
    const ATTR={t:'t',r:'r',s:'s'};
    const animated=nodes.filter(n=>Object.keys(n.keys).length);
    const endVal=(n,a,clip)=>{ const k=n.keys[a]&&n.keys[a][clip]; if(k&&k.length) return k.slice().sort((p,q)=>p[0]-q[0]).slice(-1)[0][1]; const e=ENTRY[clip]; return e?endVal(n,a,e):n[ATTR[a]]; };
    for(const n of animated) for(const a of ['t','r','s']){
      if(!n.keys[a]) continue;
      for(const clip in CLIPS){
        const k=(n.keys[a][clip]=n.keys[a][clip]||[]); k.sort((p,q)=>p[0]-q[0]);
        const entry=ENTRY[clip]?endVal(n,a,ENTRY[clip]):n[ATTR[a]];
        if(!k.length||k[0][0]>0) k.unshift([0,entry]);
        const last=k[k.length-1][1]; if(k[k.length-1][0]<CLIPS[clip].dur) k.push([CLIPS[clip].dur,last]);
      }
      // グローバル時間へ
      const g=[]; for(const clip in CLIPS) for(const [t,v] of n.keys[a][clip]) g.push([+(CLIPS[clip].start+Math.min(t,CLIPS[clip].dur)).toFixed(3),v]);
      g.sort((p,q)=>p[0]-q[0]);
      const out=[]; for(const e of g){ if(out.length && Math.abs(out[out.length-1][0]-e[0])<1e-4) out[out.length-1]=e; else out.push(e); }
      n.track=n.track||{}; n.track[a]=out;
    }
    return {nodes,byName,CLIPS,END};
  }

  // 時刻 t の値
  function at(track,t){
    if(!track||!track.length) return null;
    if(t<=track[0][0]) return track[0][1];
    let lo=0, hi=track.length-1;
    if(t>=track[hi][0]) return track[hi][1];
    while(hi-lo>1){ const mid=(lo+hi)>>1; if(track[mid][0]<=t) lo=mid; else hi=mid; }
    const [t0,a]=track[lo], [t1,b]=track[hi], u=(t-t0)/(t1-t0);
    return [a[0]+(b[0]-a[0])*u, a[1]+(b[1]-a[1])*u, a[2]+(b[2]-a[2])*u];
  }

  // ---------- USDA ----------
  const FPS=60;
  function pathOf(scene,n){ const parts=[]; let c=n; while(c){ parts.unshift(c.name); c=c.parent?scene.byName[c.parent]:null; } return '/StageRoot/Scenes/Scene/'+parts.join('/'); }
  function toUSDA(scene, opt={}){
    const lin=x=>x<=0.04045?x/12.92:Math.pow((x+0.055)/1.055,2.4), L3=a=>a.map(lin);
    const f=v=>{ const s=(+v).toFixed(5); return s.replace(/\.?0+$/,'')||'0'; }, v3=v=>`(${f(v[0])}, ${f(v[1])}, ${f(v[2])})`;
    const scale=opt.scale||1;
    const used=new Set(scene.nodes.filter(n=>n.mat).map(n=>n.mat));
    const L=[];
    L.push(`#usda 1.0
(
    customLayerData = {
        string creator = "LOOK UP DRONE disaster drone port"
    }
    defaultPrim = "StageRoot"
    metersPerUnit = 1
    upAxis = "Y"
    startTimeCode = 0
    endTimeCode = ${scene.END*FPS}
    timeCodesPerSecond = ${FPS}
    framesPerSecond = ${FPS}
)

def Xform "StageRoot" (
    kind = "assembly"
)
{
    def Scope "Materials"
    {`);
    for(const k of used){ const m=MAT[k], P=`/StageRoot/Materials/${k}`;
      L.push(`        def Material "${k}"
        {
            token outputs:surface.connect = <${P}/PS.outputs:surface>
            def Shader "PS"
            {
                uniform token info:id = "UsdPreviewSurface"`);
      if(m.tex){ L.push(`                color3f inputs:diffuseColor = (0, 0, 0)
                color3f inputs:emissiveColor.connect = <${P}/Tex.outputs:rgb>`); }
      else L.push(`                color3f inputs:diffuseColor = ${v3(L3(m.c))}`);
      if(m.e) L.push(`                color3f inputs:emissiveColor = ${v3(L3(m.e))}`);
      L.push(`                float inputs:roughness = ${f(m.r??0.6)}
                float inputs:metallic = ${f(m.m??0)}`);
      if(m.o!=null) L.push(`                float inputs:opacity = ${f(m.o)}`);
      L.push(`                token outputs:surface
            }`);
      if(m.tex) L.push(`            def Shader "Tex"
            {
                uniform token info:id = "UsdUVTexture"
                asset inputs:file = @textures/${m.tex}.png@
                float2 inputs:st.connect = <${P}/St.outputs:result>
                token inputs:wrapS = "clamp"
                token inputs:wrapT = "clamp"
                float3 outputs:rgb
            }
            def Shader "St"
            {
                uniform token info:id = "UsdPrimvarReader_float2"
                string inputs:varname = "st"
                float2 outputs:result
            }`);
      L.push(`        }`);
    }
    L.push(`    }

    def Scope "Scenes" (
        kind = "sceneLibrary"
    )
    {
        def Xform "Scene" (
            prepend apiSchemas = ["Preliminary_AnchoringAPI"]
            customData = {
                bool preliminary_collidesWithEnvironment = 0
                string sceneName = "Scene"
            }
            sceneName = "Scene"
        )
        {
            token preliminary:anchoring:type = "plane"
            token preliminary:planeAnchoring:alignment = "horizontal"
`);
    const kids=p=>scene.nodes.filter(n=>n.parent===p);
    const ind=d=>'    '.repeat(d);
    const write=(n,d)=>{
      const I=ind(d), ops=[];
      const lines=[];
      const attr=(a,op,typ,rest,conv)=>{
        const tr=n.track&&n.track[a];
        if(tr){ ops.push(op); lines.push(`${I}    ${typ} ${op}.timeSamples = {\n${tr.map(([t,v])=>`${I}        ${f(t*FPS)}: ${v3(conv?conv(v):v)},`).join('\n')}\n${I}    }`); }
        else if(rest.some((x,j)=>x!==(a==='s'?1:0))){ ops.push(op); lines.push(`${I}    ${typ} ${op} = ${v3(conv?conv(rest):rest)}`); }
      };
      const tt = n.name==='Root' ? [0,0,0] : n.t;
      attr('t','xformOp:translate','double3',tt);
      attr('r','xformOp:rotateXYZ','float3',n.r);
      attr('s','xformOp:scale','float3',n.name==='Root'?[scale,scale,scale]:n.s);
      L.push(`${I}def Xform "${n.name}"\n${I}{`);
      L.push(...lines);
      if(ops.length) L.push(`${I}    uniform token[] xformOpOrder = [${ops.map(o=>`"${o}"`).join(', ')}]`);
      if(n.mesh){ const m=n.mesh, fc=m.i.length/3;
        L.push(`
${I}    def Mesh "Geom" (
${I}        prepend apiSchemas = ["MaterialBindingAPI"]
${I}    )
${I}    {
${I}        int[] faceVertexCounts = [${new Array(fc).fill(3).join(',')}]
${I}        int[] faceVertexIndices = [${m.i.join(',')}]
${I}        normal3f[] normals = [${chunk3(m.n,f)}] (
${I}            interpolation = "vertex"
${I}        )
${I}        point3f[] points = [${chunk3(m.p,f)}]`);
        if(MAT[n.mat].tex) L.push(`${I}        texCoord2f[] primvars:st = [${chunk2(m.uv,f)}] (
${I}            interpolation = "vertex"
${I}        )`);
        L.push(`${I}        uniform token subdivisionScheme = "none"
${I}        uniform bool doubleSided = 0
${I}        rel material:binding = </StageRoot/Materials/${n.mat}>
${I}    }`);
      }
      for(const c of kids(n.name)) { L.push(''); write(c,d+1); }
      L.push(`${I}}`);
    };
    write(scene.byName.Root,3);

    // ---------- タップの動作 ----------
    const P=name=>pathOf(scene,scene.byName[name]);
    const DIO=P('Diorama');
    let id=0;
    const vis=(targets,show)=>({kind:'act',body:[`rel affectedObjects = [ ${targets.map(t=>`<${P(t)}>`).join(', ')} ]`,`double duration = 0`,`token easeType = "none"`,`token info:id = "Visibility"`,`token motionType = "none"`,`double moveDistance = 0`,`token style = "basic"`,`token type = "${show?'show':'hide'}"`]});
    const anim=clip=>({kind:'act',body:[`rel affectedObjects = <${DIO}>`,`double duration = ${f(CLIPS[clip].dur)}`,`token info:id = "StartAnimation"`,`double start = ${f(CLIPS[clip].start)}`,`double animationSpeed = 1.00`,`bool reversed = 0`,`bool reverses = 0`,`token multiplePerformOperation = "allow"`]});
    const group=(type,...acts)=>({kind:'group',type,acts});
    const actLines=(a,d)=>{ const I=ind(d), name=(a.kind==='group'?'Group_':'Action_')+(id++);
      if(a.kind==='act') return {name,lines:[`${I}def Preliminary_Action "${name}"`,`${I}{`,...a.body.map(b=>`${I}    ${b}`),`${I}}`]};
      const kids=a.acts.map(x=>actLines(x,d+1));
      return {name,lines:[`${I}def Preliminary_Action "${name}"`,`${I}{`,
        `${I}    rel actions = [ ${kids.map(k=>`<${k.name}>`).join(', ')} ]`,`${I}    token info:id = "Group"`,`${I}    bool loops = 0`,
        `${I}    int performCount = 1`,`${I}    token type = "${a.type}"`,`${I}    token multiplePerformOperation = "ignore"`,'',
        ...kids.flatMap(k=>[...k.lines,'']),`${I}}`]}; };
    const behaviors=[
      {name:'Start', trig:{id:'SceneTransition',type:'enter'}, act:group('parallel', vis(['BtnGoSlide','BtnGoTsunami'],false), anim('R'))},
      {name:'Landslide', trig:{tap:'BtnSlide'}, act:group('serial', vis(['BtnSlide','BtnTsunami'],false), anim('S'), vis(['BtnGoSlide'],true))},
      {name:'GoLandslide', trig:{tap:'BtnGoSlide'}, act:group('serial', vis(['BtnGoSlide'],false), anim('SM'), vis(['BtnSlide','BtnTsunami'],true))},
      {name:'Tsunami', trig:{tap:'BtnTsunami'}, act:group('serial', vis(['BtnSlide','BtnTsunami'],false), anim('T'), vis(['BtnGoTsunami'],true))},
      {name:'GoTsunami', trig:{tap:'BtnGoTsunami'}, act:group('serial', vis(['BtnGoTsunami'],false), anim('TM'), vis(['BtnSlide','BtnTsunami'],true))},
    ];
    L.push(`
            def Scope "Behaviors"
            {`);
    for(const b of behaviors){
      const I=ind(4);
      L.push(`${I}def Preliminary_Behavior "${b.name}"\n${I}{`);
      const at=L.length; L.push(null);
      L.push(`${I}    def Preliminary_Trigger "Trigger"\n${I}    {`);
      if(b.trig.tap) L.push(`${I}        rel affectedObjects = <${P(b.trig.tap)}>\n${I}        token info:id = "TapGesture"`);
      else L.push(`${I}        token info:id = "${b.trig.id}"\n${I}        token type = "${b.trig.type}"`);
      L.push(`${I}    }\n`);
      const top=actLines(b.act,5); L.push(...top.lines);
      L[at]=`${I}    rel triggers = <Trigger>\n${I}    rel actions = <${top.name}>\n${I}    uniform bool exclusive = 0\n`;
      L.push(`${I}}`);
    }
    L.push(`            }
        }
    }
}
`);
    return L.join('\n');
  }
  function chunk3(a,f){ const o=[]; for(let j=0;j<a.length;j+=3) o.push(`(${f(a[j])}, ${f(a[j+1])}, ${f(a[j+2])})`); return o.join(', '); }
  function chunk2(a,f){ const o=[]; for(let j=0;j<a.length;j+=2) o.push(`(${f(a[j])}, ${f(a[j+1])})`); return o.join(', '); }

  // ---------- USDZ（64バイト境界にそろえた無圧縮zip） ----------
  function toUSDZ(scene, fflate, textures, opt){
    const files={'scene.usda':fflate.strToU8(toUSDA(scene,opt))};
    for(const k in textures) files['textures/'+k+'.png']=textures[k];
    const out={}; let offset=0;
    for(const name in files){
      const data=files[name], n=fflate.strToU8(name).length;
      const pad=(64-((offset+30+n+4)%64))%64;
      out[name]=[data,{level:0,extra:{0x3412:new Uint8Array(pad)}}];
      offset+=30+n+4+pad+data.length;
    }
    return fflate.zipSync(out,{level:0});
  }

  const api={build,at,toUSDA,toUSDZ,MAT,LABELS,drawLabel,H,CLIPS,END,SEA0};
  if(typeof module!=='undefined'&&module.exports) module.exports=api; else root.DockPort=api;
})(typeof self!=='undefined'?self:this);
