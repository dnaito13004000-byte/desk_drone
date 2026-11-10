/* 国土地理院の地図データから、家のまわりの街並みを組み立てる(画面描画とは独立した処理)
   座標は基準点からのメートル。x: 東, y: 北 */
window.TownData = (function () {
  'use strict';
  var BASE = {
    fgd: 'https://cyberjapandata.gsi.go.jp/xyz/experimental_fgd/18/',      // 基盤地図情報(建物の外周線・道路縁・水涯線)
    rdcl: 'https://cyberjapandata.gsi.go.jp/xyz/experimental_rdcl/16/',    // 道路中心線
    addr: 'https://msearch.gsi.go.jp/address-search/AddressSearch?q='      // 住所検索
  };
  var ROAD_W = { '3m未満': 2.6, '3m-5.5m未満': 4.2, '5.5m-13m未満': 7.5, '13m-19.5m未満': 15, '19.5m以上': 22 };
  function setBase(o) { for (var k in o) BASE[k] = o[k]; }
  function tile(lat, lon, z) {
    var n = Math.pow(2, z), r = lat * Math.PI / 180;
    return [Math.floor((lon + 180) / 360 * n), Math.floor((1 - Math.log(Math.tan(r) + 1 / Math.cos(r)) / Math.PI) / 2 * n)];
  }
  function getJSON(url) { return fetch(url).then(function (r) { return r.ok ? r.json() : null; }).catch(function () { return null; }); }

  function geocode(q) {
    return fetch(BASE.addr + encodeURIComponent(q)).then(function (r) { if (!r.ok) throw new Error('search ' + r.status); return r.json(); }).then(function (j) {
      return (j || []).filter(function (f) { return f && f.geometry && f.geometry.coordinates; }).slice(0, 5).map(function (f) {
        return { title: String((f.properties || {}).title || q), lon: +f.geometry.coordinates[0], lat: +f.geometry.coordinates[1] };
      });
    });
  }

  function lines(g) {
    if (!g) return [];
    if (g.type === 'LineString') return [g.coordinates];
    if (g.type === 'MultiLineString' || g.type === 'Polygon') return g.coordinates;
    if (g.type === 'MultiPolygon') return [].concat.apply([], g.coordinates);
    return [];
  }
  function near(a, b, e) { return Math.abs(a[0] - b[0]) < e && Math.abs(a[1] - b[1]) < e; }

  // タイルの境目で切れた線をつないで、閉じた輪郭にする
  function rings(ls) {
    var open = [], out = [], e = 0.16, i, j, a, b, merged = true;
    ls.forEach(function (l) { if (l.length > 3 && near(l[0], l[l.length - 1], e)) out.push(l.slice(0, -1)); else if (l.length > 1) open.push(l.slice()); });
    while (merged) {
      merged = false;
      for (i = 0; i < open.length && !merged; i++) for (j = 0; j < open.length && !merged; j++) {
        if (i === j) continue; a = open[i]; b = open[j];
        if (near(a[a.length - 1], b[0], e)) { open[i] = a.concat(b.slice(1)); open.splice(j, 1); merged = true; }
        else if (near(a[a.length - 1], b[b.length - 1], e)) { open[i] = a.concat(b.slice(0, -1).reverse()); open.splice(j, 1); merged = true; }
        else if (near(a[0], b[0], e)) { open[i] = a.slice().reverse().concat(b.slice(1)); open.splice(j, 1); merged = true; }
      }
      for (i = open.length - 1; i >= 0; i--) { a = open[i]; if (a.length > 3 && near(a[0], a[a.length - 1], e)) { out.push(a.slice(0, -1)); open.splice(i, 1); merged = true; } }
    }
    return out;
  }
  function area(r) { var s = 0, i, n = r.length; for (i = 0; i < n; i++) s += r[i][0] * r[(i + 1) % n][1] - r[(i + 1) % n][0] * r[i][1]; return s / 2; }
  function clean(r) {
    var o = [], i;
    for (i = 0; i < r.length; i++) if (!o.length || Math.hypot(r[i][0] - o[o.length - 1][0], r[i][1] - o[o.length - 1][1]) > 0.15) o.push(r[i]);
    if (o.length > 1 && Math.hypot(o[0][0] - o[o.length - 1][0], o[0][1] - o[o.length - 1][1]) <= 0.15) o.pop();
    return area(o) > 0 ? o : o.reverse();                      // 反時計回りにそろえる
  }
  // 面積が最小になる向きの長方形
  function obb(r) {
    var best = null, i, n = r.length;
    for (i = 0; i < n; i++) {
      var dx = r[(i + 1) % n][0] - r[i][0], dy = r[(i + 1) % n][1] - r[i][1];
      if (Math.hypot(dx, dy) < 0.5) continue;
      var a = Math.atan2(dy, dx), c = Math.cos(a), s = Math.sin(a), u0 = 1e9, u1 = -1e9, v0 = 1e9, v1 = -1e9;
      r.forEach(function (q) { var u = q[0] * c + q[1] * s, v = -q[0] * s + q[1] * c; if (u < u0) u0 = u; if (u > u1) u1 = u; if (v < v0) v0 = v; if (v > v1) v1 = v; });
      var w = u1 - u0, d = v1 - v0;
      if (!best || w * d < best.area) best = { area: w * d, a: a, uc: (u0 + u1) / 2, vc: (v0 + v1) / 2, w: w, d: d };
    }
    return best;
  }
  function inRing(p, r) {
    var c = false, i, j, n = r.length;
    for (i = 0, j = n - 1; i < n; j = i++) if ((r[i][1] > p[1]) !== (r[j][1] > p[1]) && p[0] < (r[j][0] - r[i][0]) * (p[1] - r[i][1]) / (r[j][1] - r[i][1]) + r[i][0]) c = !c;
    return c;
  }

  // 基準点のまわり R メートルの建物・道路・水路を読み込む
  function load(lat, lon, R) {
    R = R || 100;
    var mx = 111320 * Math.cos(lat * Math.PI / 180), my = 110950, dLon = (R + 15) / mx, dLat = (R + 15) / my, jobs = [], x, y;
    var L = function (p) { return [(p[0] - lon) * mx, (p[1] - lat) * my]; };
    var keep = function (l) { return l.some(function (p) { return Math.abs(p[0]) <= R + 12 && Math.abs(p[1]) <= R + 12; }); };
    var a = tile(lat + dLat, lon - dLon, 18), b = tile(lat - dLat, lon + dLon, 18);
    for (x = a[0]; x <= b[0]; x++) for (y = a[1]; y <= b[1]; y++) jobs.push(getJSON(BASE.fgd + x + '/' + y + '.geojson'));
    var nF = jobs.length;
    a = tile(lat + dLat, lon - dLon, 16); b = tile(lat - dLat, lon + dLon, 16);
    for (x = a[0]; x <= b[0]; x++) for (y = a[1]; y <= b[1]; y++) jobs.push(getJSON(BASE.rdcl + x + '/' + y + '.geojson'));
    return Promise.all(jobs).then(function (res) {
      var bl = [], sl = [], edges = [], water = [], roads = [], seen = {}, got = 0;
      res.forEach(function (j, idx) {
        if (!j || !j.features) return; got++;
        j.features.forEach(function (f) {
          var p = f.properties || {}, cls = p['class'], typ = p.type || '';
          lines(f.geometry).forEach(function (raw) {
            var l = raw.map(L); if (!keep(l)) return;
            var key = cls + '|' + l.length + '|' + l[0][0].toFixed(1) + ',' + l[0][1].toFixed(1) + '|' + l[l.length - 1][0].toFixed(1) + ',' + l[l.length - 1][1].toFixed(1);
            if (seen[key]) return; seen[key] = 1;
            if (idx < nF) {
              if (cls === 'BldL') (typ.indexOf('無壁') >= 0 ? sl : bl).push(l);
              else if (cls === 'RdEdg') edges.push(l);
              else if (cls === 'WL') water.push(l);
            } else if (cls === 'RdCL') {
              if (p.motorway === 1 || /高速/.test(p.rdCtg || '') || /トンネル|雪覆い/.test(p.state || '')) return;
              roads.push({ w: ROAD_W[p.rnkWidth] || 4.2, main: /国道|都道府県道/.test(p.rdCtg || ''), pts: l });
            }
          });
        });
      });
      var B = [];
      rings(bl).forEach(function (r) { r = clean(r); var ar = area(r); if (r.length >= 3 && ar >= 14) B.push(mk('b', r, ar)); });
      rings(sl).forEach(function (r) { r = clean(r); var ar = area(r); if (r.length >= 3 && ar >= 4) B.push(mk('s', r, ar)); });
      return { lat: lat, lon: lon, R: R, mx: mx, my: my, tiles: got, buildings: B, edges: edges, water: water, roads: roads };
    });
  }
  function mk(t, r, ar) {
    var cx = 0, cy = 0, x0 = 1e9, x1 = -1e9, y0 = 1e9, y1 = -1e9;
    r.forEach(function (q) { cx += q[0] / r.length; cy += q[1] / r.length; if (q[0] < x0) x0 = q[0]; if (q[0] > x1) x1 = q[0]; if (q[1] < y0) y0 = q[1]; if (q[1] > y1) y1 = q[1]; });
    var floors = ar < 48 ? 1 : (ar <= 260 ? 2 : 3);              // 階数は面積からの仮定
    return { t: t, r: r, area: ar, cx: cx, cy: cy, bb: [x0, y0, x1, y1], floors: floors, eave: [0, 3.1, 5.9, 9.0][floors], obb: obb(r) };
  }

  // 道路面の判定: 道路縁の線で区切った領域のうち、道路中心線が通っていて建物がない領域を道路とする
  function roadMask(d, N, EXT) {
    N = N || 512; EXT = EXT || 90;
    var s = 2 * EXT / N, edge = new Uint8Array(N * N), lab = new Int32Array(N * N), i, k;
    var ix = function (x) { return Math.floor((x + EXT) / s); }, iy = function (y) { return Math.floor((EXT - y) / s); };
    var mark = function (x, y) { var a = ix(x), b = iy(y); if (a < 0 || b < 0 || a >= N || b >= N) return; edge[b * N + a] = 1; if (a + 1 < N) edge[b * N + a + 1] = 1; if (b + 1 < N) edge[(b + 1) * N + a] = 1; };
    var walk = function (l, step, fn) {
      for (var q = 0; q < l.length - 1; q++) { var a = l[q], b = l[q + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]), m = Math.max(1, Math.ceil(len / step)); for (var t = 0; t <= m; t++) fn(a[0] + (b[0] - a[0]) * t / m, a[1] + (b[1] - a[1]) * t / m, a, b); }
    };
    d.edges.forEach(function (l) { walk(l, s * 0.5, mark); });
    for (i = 0; i < N; i++) { edge[i] = edge[(N - 1) * N + i] = edge[i * N] = edge[i * N + N - 1] = 1; }
    var nl = 0, q = new Int32Array(N * N), head, tail, c, x, y;
    for (i = 0; i < N * N; i++) {
      if (edge[i] || lab[i]) continue;
      nl++; lab[i] = nl; head = 0; tail = 0; q[tail++] = i;
      while (head < tail) {
        c = q[head++]; x = c % N; y = (c - x) / N;
        if (x > 0 && !edge[c - 1] && !lab[c - 1]) { lab[c - 1] = nl; q[tail++] = c - 1; }
        if (x < N - 1 && !edge[c + 1] && !lab[c + 1]) { lab[c + 1] = nl; q[tail++] = c + 1; }
        if (y > 0 && !edge[c - N] && !lab[c - N]) { lab[c - N] = nl; q[tail++] = c - N; }
        if (y < N - 1 && !edge[c + N] && !lab[c + N]) { lab[c + N] = nl; q[tail++] = c + N; }
      }
    }
    var cl = new Int32Array(nl + 1), bd = new Int32Array(nl + 1), ws = new Float32Array(nl + 1), cells = new Int32Array(nl + 1);
    for (i = 0; i < N * N; i++) cells[lab[i]]++;
    var at = function (x, y) { var a = ix(x), b = iy(y); return (a < 0 || b < 0 || a >= N || b >= N) ? 0 : lab[b * N + a]; };
    d.roads.forEach(function (r) { walk(r.pts, 1.0, function (x, y) { var k2 = at(x, y); cl[k2]++; ws[k2] += r.w; }); });
    d.buildings.forEach(function (b) { if (b.t === 'b') bd[at(b.cx, b.cy)]++; });
    var road = new Uint8Array(N * N), isRoad = new Uint8Array(nl + 1), nRoad = 0;
    // 道路中心線の長さ×幅に比べて広すぎる領域は、道路縁のない田畑や空き地なので道路にしない
    for (k = 1; k <= nl; k++) if (cl[k] >= 3 && bd[k] === 0 && cells[k] * s * s <= 2.6 * ws[k] + 40) { isRoad[k] = 1; nRoad++; }
    for (i = 0; i < N * N; i++) if (isRoad[lab[i]]) road[i] = 1;
    // 道路縁が途切れていて領域で判定できなかった道路は、中心線に幅を付けて塗る
    var stamped = 0;
    d.roads.forEach(function (r) {
      var rad = Math.max(1, Math.round(r.w / 2 / s));
      walk(r.pts, s, function (x, y) {
        var a = ix(x), b = iy(y); if (a < 0 || b < 0 || a >= N || b >= N) return;
        var l = lab[b * N + a]; if (l && isRoad[l]) return;
        if (!edge[b * N + a] || !near8(road, a, b, N)) stamped++;
        for (var dy = -rad; dy <= rad; dy++) for (var dx = -rad; dx <= rad; dx++) { if (dx * dx + dy * dy > rad * rad) continue; var xx = a + dx, yy = b + dy; if (xx >= 0 && yy >= 0 && xx < N && yy < N) road[yy * N + xx] = 2; }
      });
    });
    for (i = 0; i < N * N; i++) if (edge[i] && !road[i] && near8(road, i % N, (i - i % N) / N, N)) road[i] = 3;   // 道路に接する縁
    var frac = 0; for (i = 0; i < N * N; i++) if (road[i]) frac++;
    return { N: N, EXT: EXT, s: s, road: road, regions: nl, roadRegions: nRoad, stamped: stamped, fraction: frac / (N * N),
      isRoadAt: function (x, y) { var a = ix(x), b = iy(y); return (a < 0 || b < 0 || a >= N || b >= N) ? 0 : road[b * N + a]; } };
  }
  function near8(road, a, b, N) {
    for (var dy = -1; dy <= 1; dy++) for (var dx = -1; dx <= 1; dx++) { var x = a + dx, y = b + dy; if (x >= 0 && y >= 0 && x < N && y < N && road[y * N + x] === 1) return true; }
    return false;
  }

  // 家の敷地(正面に9.4m、奥に5.4m、幅約11m)が建物や道路に重ならないか
  function lotFree(d, m, cx, cy, fx, fy) {
    var rx = -fy, ry = fx, u, v, k, near = [], lim = m.EXT - 6;      // f: 正面方向, r: 右方向
    d.buildings.forEach(function (b) { if (b.bb[0] < cx + 12 && b.bb[2] > cx - 12 && b.bb[1] < cy + 12 && b.bb[3] > cy - 12) near.push(b); });
    for (u = -5.9; u <= 5.91; u += 0.9833) for (v = -5.5; v <= 9.0; v += 0.9) {
      var x = cx + rx * u + fx * v, y = cy + ry * u + fy * v;
      if (Math.abs(x) > lim || Math.abs(y) > lim) return false;
      if (m.isRoadAt(x, y)) return false;
      for (k = 0; k < near.length; k++) if (inRing([x, y], near[k].r)) return false;
    }
    for (k = 0; k < near.length; k++) for (u = 0; u < near[k].r.length; u++) {
      var p = near[k].r[u], a = (p[0] - cx) * rx + (p[1] - cy) * ry, b = (p[0] - cx) * fx + (p[1] - cy) * fy;
      if (a > -6.1 && a < 6.1 && b > -5.7 && b < 9.2) return false;
    }
    return true;
  }
  // 基準点にいちばん近い「道路に面した空き」を探す。戻り値は家の中心と正面の方位(北から時計回り、度)
  function autoSite(d, m) {
    var best = null;
    d.roads.forEach(function (r) {
      if (r.w > 14) return;
      for (var q = 0; q < r.pts.length - 1; q++) {
        var a = r.pts[q], b = r.pts[q + 1], len = Math.hypot(b[0] - a[0], b[1] - a[1]); if (len < 0.5) continue;
        var tx = (b[0] - a[0]) / len, ty = (b[1] - a[1]) / len, steps = Math.max(1, Math.round(len / 2.5));
        for (var t = 0; t <= steps; t++) {
          var px = a[0] + (b[0] - a[0]) * t / steps, py = a[1] + (b[1] - a[1]) * t / steps;
          if (Math.hypot(px, py) > 80) continue;
          for (var side = -1; side <= 1; side += 2) {
            var nx = -ty * side, ny = tx * side, dist = 0;
            while (dist < 14 && m.isRoadAt(px + nx * dist, py + ny * dist)) dist += m.s;
            if (dist >= 14) continue;
            if (dist < 0.9) dist = r.w / 2;
            var cx = px + nx * (dist + 9.5), cy = py + ny * (dist + 9.5), sc = Math.hypot(cx, cy) + (r.main ? 25 : 0);
            if (best && sc >= best.score) continue;
            if (!lotFree(d, m, cx, cy, -nx, -ny)) continue;
            best = { x: cx, y: cy, bearing: (Math.atan2(-nx, -ny) * 180 / Math.PI + 360) % 360, score: sc };
          }
        }
      }
    });
    return best;
  }
  // 指定した点からいちばん近い道路の方位(家をそちらに向けるため)
  function faceRoad(d, x, y) {
    var best = null;
    d.roads.forEach(function (r) {
      for (var q = 0; q < r.pts.length - 1; q++) {
        var a = r.pts[q], b = r.pts[q + 1], vx = b[0] - a[0], vy = b[1] - a[1], l2 = vx * vx + vy * vy; if (l2 < 1e-6) continue;
        var t = Math.max(0, Math.min(1, ((x - a[0]) * vx + (y - a[1]) * vy) / l2)), px = a[0] + vx * t, py = a[1] + vy * t, dd = Math.hypot(px - x, py - y);
        if (!best || dd < best.dist) best = { dist: dd, x: px, y: py, bearing: (Math.atan2(px - x, py - y) * 180 / Math.PI + 360) % 360, road: r, seg: q };
      }
    });
    return best;
  }
  // 家の前の道路を、つながっている道路へたどって車の走行ルートにする
  function carPath(d, x, y, lim) {
    lim = lim || 88;
    var f = faceRoad(d, x, y); if (!f || f.dist > 45) return null;
    var used = [f.road], pts = f.road.pts.slice(), e = 0.7;
    function extend(atEnd) {
      for (var guard = 0; guard < 40; guard++) {
        var end = atEnd ? pts[pts.length - 1] : pts[0], prev = atEnd ? pts[pts.length - 2] : pts[1];
        if (Math.abs(end[0]) > lim || Math.abs(end[1]) > lim) return;
        var hx = end[0] - prev[0], hy = end[1] - prev[1], hl = Math.hypot(hx, hy) || 1, best = null;
        d.roads.forEach(function (r) {
          if (used.indexOf(r) >= 0 || r.pts.length < 2) return;
          var n = r.pts.length, cand = null;
          if (near(r.pts[0], end, e)) cand = r.pts; else if (near(r.pts[n - 1], end, e)) cand = r.pts.slice().reverse();
          if (!cand) return;
          var cx = cand[1][0] - cand[0][0], cy = cand[1][1] - cand[0][1], cl = Math.hypot(cx, cy) || 1, dot = (hx * cx + hy * cy) / (hl * cl);
          if (dot > 0.2 && (!best || dot > best.dot)) best = { dot: dot, r: r, pts: cand };
        });
        if (!best) return;
        used.push(best.r);
        if (atEnd) pts = pts.concat(best.pts.slice(1)); else pts = best.pts.slice(1).reverse().concat(pts);
      }
    }
    extend(true); extend(false);
    var out = pts.filter(function (p) { return Math.abs(p[0]) <= lim && Math.abs(p[1]) <= lim; });
    return out.length >= 2 ? out : null;
  }

  return { setBase: setBase, geocode: geocode, load: load, roadMask: roadMask, autoSite: autoSite, faceRoad: faceRoad, carPath: carPath, inRing: inRing };
})();
