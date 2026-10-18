/* 工作区总控台 —— 纯原生 JS，无外部依赖（可离线） */
const $ = (s, r) => (r || document).querySelector(s);
const $$ = (s, r) => [...(r || document).querySelectorAll(s)];
const H = (o) => o == null ? '' : String(o).replace(/[&<>"]/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]));
const KB = (n) => n > 1048576 ? (n / 1048576).toFixed(2) + ' MB' : n > 1024 ? (n / 1024).toFixed(1) + ' KB' : n + ' B';

/* ---- 在线只读快照：GitHub Pages 等静态托管没有本机 API 时兜底 ---- */
let SNAP = null;
const ONLINE_BY_HOST = !/^(127\.0\.0\.1|localhost|\[::1\])$/.test(location.hostname);
async function loadSnapshot() {
  try { const r = await fetch('snapshot.json'); if (r.ok) { const j = await r.json(); if (j && j._snapshot) SNAP = j; } } catch (e) { }
}
function snapGet(path) {
  if (!SNAP) return undefined;
  const p = path.split('?')[0];
  const base = SNAP.apis[p];
  if (base === undefined) return undefined;
  if (p === '/api/blocks') { /* 带关键词的检索在快照全量里现筛 */
    const qs = new URLSearchParams(path.slice(p.length));
    const kw = (qs.get('q') || '').toLowerCase();
    const limit = parseInt(qs.get('limit') || '50', 10);
    let hits = base.hits || [];
    if (kw) hits = hits.filter(h => ((h.block || '') + ' ' + (h.desc || '') + ' ' + (h.file || '')).toLowerCase().includes(kw));
    return { total: hits.length, hits: limit > 0 ? hits.slice(0, limit) : hits.slice() };
  }
  return JSON.parse(JSON.stringify(base));
}
async function api(path, body) {
  if (body && (ONLINE_BY_HOST || SNAP && window.__fellBack)) throw new Error('在线版为只读预览，投喂/校验等操作请使用教室电脑上的本机版总控台');
  const opt = body ? { method: 'POST', headers: { 'Content-Type': 'application/json' }, body: JSON.stringify(body) } : {};
  try {
    const r = await fetch(path, opt);
    const j = await r.json().catch(() => ({ error: '非 JSON 响应' }));
    if (!r.ok || j.error) throw new Error(j.error || ('HTTP ' + r.status));
    return j;
  } catch (e) {
    if (!body) {
      const d = snapGet(path);
      if (d !== undefined) { window.__fellBack = true; return d; }
      if (window.__fellBack) throw new Error('在线快照仅含 总览/课程库/积木索引，该数据请在本机版查看');
    }
    throw e;
  }
}
let toastT;
function toast(msg, bad) {
  const t = $('#toast'); t.textContent = msg; t.className = 'toast show' + (bad ? ' bad' : '');
  clearTimeout(toastT); toastT = setTimeout(() => t.className = 'toast', 2600);
}
/* 未捕获的异步错误（如写操作被在线只读守卫拦截）兜底转成 toast，避免点了没反应 */
window.addEventListener('unhandledrejection', (e) => {
  const m = e.reason && (e.reason.message || String(e.reason));
  if (m) toast(m, true);
});

/* ---------------- 极简 markdown ---------------- */
function md(src) {
  const lines = String(src).replace(/\r/g, '').split('\n');
  let out = '', inCode = false, inTbl = false, inList = null;
  const closeList = () => { if (inList) { out += '</' + inList + '>'; inList = null; } };
  const closeTbl = () => { if (inTbl) { out += '</table>'; inTbl = false; } };
  const inline = (s) => H(s)
    .replace(/`([^`]+)`/g, '<code>$1</code>')
    .replace(/\*\*([^*]+)\*\*/g, '<b>$1</b>')
    .replace(/(^|[^!\[])https?:\/\/[^\s<]+/g, m => '<a href="' + m.trim() + '" target="_blank">' + m.trim() + '</a>');
  for (let raw of lines) {
    const l = raw;
    if (/^```/.test(l.trim())) {
      closeList(); closeTbl();
      if (!inCode) { out += '<pre>'; inCode = true; } else { out += '</pre>'; inCode = false; }
      continue;
    }
    if (inCode) { out += H(l) + '\n'; continue; }
    const t = l.trim();
    if (!t) { closeList(); closeTbl(); continue; }
    if (/^\|/.test(t)) {
      closeList();
      const cells = t.replace(/^\||\|$/g, '').split('|').map(c => c.trim());
      if (/^[-:\s|]+$/.test(t)) continue;
      if (!inTbl) { out += '<table><thead><tr>' + cells.map(c => '<th>' + inline(c) + '</th>').join('') + '</tr></thead><tbody>'; inTbl = 'b'; }
      else out += '<tr>' + cells.map(c => '<td>' + inline(c) + '</td>').join('') + '</tr>';
      continue;
    }
    closeTbl();
    let h;
    if ((h = t.match(/^(#{1,4})\s+(.*)$/))) { closeList(); out += '<h' + h[1].length + '>' + inline(h[2]) + '</h' + h[1].length + '>'; continue; }
    if ((h = t.match(/^>\s?(.*)$/))) { closeList(); out += '<blockquote>' + inline(h[1]) + '</blockquote>'; continue; }
    if ((h = t.match(/^[-*]\s+(.*)$/))) { if (inList !== 'ul') { closeList(); out += '<ul>'; inList = 'ul'; } out += '<li>' + inline(h[1]) + '</li>'; continue; }
    if ((h = t.match(/^\d+[.)]\s+(.*)$/))) { if (inList !== 'ol') { closeList(); out += '<ol>'; inList = 'ol'; } out += '<li>' + inline(h[1]) + '</li>'; continue; }
    if (/^(-{3,}|={3,})$/.test(t)) { closeList(); out += '<hr>'; continue; }
    closeList(); out += '<p>' + inline(t) + '</p>';
  }
  closeList(); closeTbl(); if (inCode) out += '</pre>';
  return out;
}

/* ---------------- 导航 ---------------- */
const NAV = [
  { g: '入口' },
  { k: 'console', t: '作业台', i: '☰' },
  { k: 'overview', t: '总览', i: '◎' },
  { g: 'Mixly 功能' },
  { k: 'conv', t: '功能① 代码转换', i: '⇄' },
  { k: 'req', t: '功能② 需求生成', i: '✦' },
  { k: 'pool', t: '需求池', i: '▤' },
  { k: 'blocks', t: '积木索引检索', i: '⌗' },
  { k: 'doctor', t: '.mix 结构体检', i: '✚' },
  { g: '资产库' },
  { k: 'blueprint', t: '蓝本参考库', i: '◈' },
  { k: 'projects', t: '项目成品库', i: '✓' },
  { k: 'latest', t: '最新生成（待验证）', i: '!' },
  { g: '抓取任务' },
  { k: 'courses', t: '课程知识库', i: '▦' },
  { k: 'scrape', t: '课程资料抓取', i: '↓' },
  { k: 'ppt', t: 'PPT 转本地', i: '▣' },
  { g: '参考' },
  { k: 'search', t: '全文搜索', i: '🔍' },
  { k: 'docs', t: '文档中心', i: '≡' },
  { k: 'files', t: '文件浏览器', i: '⌸' },
];
let state = { view: 'overview', data: {}, history: [] };

function renderNav() {
  $('#nav').innerHTML = NAV.map(n => n.g
    ? '<div class="grp">' + n.g + '</div>'
    : '<a data-k="' + n.k + '" class="' + (state.view === n.k ? 'on' : '') + '">' +
    '<span class="ic">' + n.i + '</span><span class="txt">' + n.t + '</span>' +
    '<span class="badge" id="badge_' + n.k + '"></span></a>').join('');
  $$('#nav a').forEach(a => a.onclick = () => go(a.dataset.k));
}
function setBadge(k, v) { const e = $('#badge_' + k); if (e) { e.textContent = v || ''; e.style.display = v ? '' : 'none'; } }

async function go(k, arg) {
  state.view = k; state.arg = arg;
  $('#viewTitle').textContent = (NAV.find(n => n.k === k) || {}).t || k;
  renderNav();
  const v = $('#view'); v.innerHTML = '<div class="empty">加载中…</div>';
  try { await VIEWS[k](v, arg); }
  catch (e) { v.innerHTML = '<div class="feed bad"><b>出错</b><br>' + H(e.message) + '</div>'; }
}

/* ---------------- 投喂 ---------------- */
async function feed(kind, fields, note) {
  const r = await api('/api/prompt', { kind, fields, to_clipboard: true });
  const box = $('#feedOut');
  if (box) {
    box.innerHTML = '<div class="feed ' + (r.copied ? '' : 'bad') + '">' +
      (r.copied
        ? '<b>已进剪贴板</b>（' + r.chars + ' 字）→ 切到对话窗口按 <span class="kbd">Ctrl+V</span> 回车，我就开始跑。'
        : '<b>剪贴板写入失败</b>：' + H(r.clipboard) + '，请手动复制下方文本。') +
      '</div><pre class="clip">' + H(r.prompt) + '</pre>' +
      '<div class="actions"><button class="mini" id="copyAgain">再次复制到剪贴板</button>' +
      '<button class="mini" id="copyManual">手动复制选中文本：Ctrl+C</button></div>';
    $('#copyAgain').onclick = () => api('/api/clipboard', { text: r.prompt }).then(() => toast('已复制到剪贴板'));
    if (note) toast(note); else toast('投喂包已进剪贴板 · 回对话 Ctrl+V');
  }
  return r;
}

/* ---------------- 上传区（可复用） ---------------- */
function dropZoneHTML(id, accept) {
  return '<div class="drop" id="' + id + '"><input type="file" id="' + id + '_f" accept="' + accept + '" hidden>' +
    '<div class="dropin"><b>点击选择</b> 或将文件拖到这里<small id="' + id + '_n">未选择文件</small></div></div>';
}
function wireDrop(id, onPick) {
  const drop = $('#' + id), fi = $('#' + id + '_f'), lbl = $('#' + id + '_n');
  const set = (f) => { lbl.textContent = f.name + ' (' + KB(f.size) + ')'; onPick(f); };
  drop.onclick = () => fi.click();
  fi.onchange = () => { if (fi.files[0]) set(fi.files[0]); };
  ['dragover', 'dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
    e.preventDefault();
    if (ev === 'dragover') drop.classList.add('over'); else drop.classList.remove('over');
    if (ev === 'drop' && e.dataTransfer.files[0]) { fi.files = e.dataTransfer.files; set(e.dataTransfer.files[0]); }
  }));
}
async function uploadFile(f) {
  const text = await f.text();
  return api('/api/upload', { name: f.name, text });
}

/* ---------------- 视图 ---------------- */
const VIEWS = {};

/* ===== 总览 ===== */
VIEWS.overview = async (v) => {
  const o = state.data.overview = await api('/api/overview');
  $('#wsPath').textContent = o.workspace;
  const poolTotal = Object.values(o.pool).reduce((a, b) => a + b, 0);
  const courseFiles = o.courses.reduce((a, c) => a + c.files, 0);
  const courseDirect = o.courses.reduce((a, c) => a + (c.files_direct || 0), 0);
  const courseLessons = o.courses.reduce((a, c) => a + c.lessons, 0);
  const blueMix = o.blueprints.reduce((a, b) => a + b.mix, 0);
  const projMix = o.projects.reduce((a, b) => a + b.mix, 0);
  const latFiles = o.latest.reduce((a, b) => a + b.files, 0);
  setBadge('pool', poolTotal); setBadge('blocks', o.blocks_total);
  setBadge('blueprint', blueMix); setBadge('projects', projMix);
  setBadge('latest', latFiles); setBadge('courses', courseFiles);

  v.innerHTML =
    '<div class="grid g4">' +
    stat(o.blocks_total, '积木可检索', 'Mixly积木索引.md · Arduino AVR') +
    stat(o.mix_total, '.mix 文件（Mixly转换器\\）', '蓝本+成品+待验证') +
    stat(blueMix, '权威蓝本', '蓝本参考\\课程素材 实测可开') +
    stat(projMix, '成品 .mix', '项目\\ 按硬件分类') +
    stat(o.courses.length + ' / ' + courseLessons, '课程 / 课时', '素材库\\课程知识库\\智慧生活') +
    stat(courseDirect + ' / ' + courseFiles, '资料 直下/含子目录', '智慧生活附件文件数（嵌套未解压夹使两数不同）') +
    stat(o.pool['待处理'] + ' / ' + o.pool['生成中'] + ' / ' + o.pool['已生成'], '需求池 待/中/已', '点左侧"需求池"管理') +
    stat(latFiles, '待验证产物', '最新生成\\ 未过 Mixly 勿当蓝本') +
    '</div>' +

    '<div class="card" style="margin-top:16px"><h3>一键开跑</h3>' +
    '<p class="sub">点了就把「记忆路径 + 结构化指令」写进剪贴板，回对话 Ctrl+V 即可，不用再手动拖文件。</p>' +
    '<div class="grid g3">' + quick('conv', '⇄ 代码 → 积木', '功能①', 'go') + quick('req', '✦ 需求 → 积木', '功能②两段式', 'go') +
    quick('doctor', '✚ 体检某个 .mix', '五类标签+良构', 'go') +
    quick('scrape', '↓ 抓课程资料', '浏览器采集+本机下载', 'go') +
    quick('ppt', '▣ PPT 转本地', 'v8 分层还原', 'go') +
    quick('docs', '≡ 读记忆/文档', 'MEMORY · 指南 · 引擎', 'go') +
    '</div><div id="feedOut"></div></div>' +

    '<div class="grid g2">' +
    '<div class="card"><h3>课程资料（智慧生活）</h3><p class="sub">' + o.courses.length + ' 门课 / ' + courseLessons + ' 课时 / ' + courseDirect + ' 个资料文件（另 ' + (courseFiles - courseDirect) + ' 个在嵌套子目录）</p>' +
    tbl(['课程', '课时', '直下', '含子目录'], o.courses.map(c => '<tr class="clickrow" data-c="' + H(c.rel) + '"><td>' + H(c.course) + '</td><td class="num">' + c.lessons + '</td><td class="num">' + (c.files_direct || 0) + '</td><td class="num">' + c.files + '</td></tr>')) +
    '</div>' +
    '<div class="card"><h3>任务与脚本目录</h3><p class="sub">两条抓取/转换流水线都各自成册</p>' +
    tbl(['任务', '状态'], o.tasks.map(t => '<tr><td>' + H(t.name) + '<br><span class="mono">' + H(t.rel) + '</span></td><td>' +
      (t.exists ? '<span class="tag ok">就绪</span>' : '<span class="tag bad">缺失</span>') + '</td></tr>')) +
    '<div class="actions"><button class="mini" id="startSvc2">启动资料接收服务</button>' +
    '<button class="mini" data-doc="' + H(o.tasks[0].doc) + '">看抓取流程</button></div>' +
    '</div>' +
    '</div>' +

    '<div class="card"><h3>记忆层（AI 的事实来源）</h3><p class="sub">这些文件我每次都会按路径自己去读，无需你拖进对话</p>' +
    '<div class="chips">' + Object.entries(o.memory).map(([k, s]) =>
      '<span class="chip b" data-doc="Mixly转换器/' + H(k) + '">' + H(k) + ' · ' + KB(s) + '</span>').join('') +
    '<span class="chip" data-doc="Mixly转换器/.trae/skills/mixly-converter/SKILL.md">SKILL.md</span></div>' +
    '<p class="note">生成时间：' + H(o.generated_at) + ' · 刷新按钮重算统计</p></div>';

  $$('#view [data-doc]').forEach(e => e.onclick = () => go('docs', e.dataset.doc));
  $$('#view .quickgo').forEach(e => e.onclick = () => go(e.dataset.go));
  $$('#view tr.clickrow').forEach(e => e.onclick = () => go('courses', e.dataset.c));
  $('#startSvc2').onclick = startSvc;

  function stat(n, t, hint) {
    return '<div class="stat"><b>' + H(n) + '</b><span>' + H(t) + '</span>' + (hint ? '<div class="hint">' + H(hint) + '</div>' : '') + '</div>';
  }
  function quick(k, t, s, d) {
    return '<div class="stat quickgo" data-go="' + k + '" style="cursor:pointer"><b style="font-size:16px">' + H(t) + '</b><span>' + H(s) + '</span></div>';
  }
  function tbl(heads, rows) {
    return '<table><thead><tr>' + heads.map((h, i) => '<th' + (i ? ' class="num"' : '') + '>' + H(h) + '</th>').join('') +
      '</tr></thead><tbody>' + (rows.join('') || '<tr><td colspan="9" class="empty">暂无</td></tr>') + '</tbody></table>';
  }
};

/* ===== 功能① 代码转换 ===== */
VIEWS.conv = async (v) => {
  let up = { items: [] };
  try { up = await api('/api/uploads'); } catch (e) { }
  v.innerHTML = '<div class="card"><h3>⇪ 上传代码文件 → 积木</h3>' +
    '<p class="sub">支持 <span class="mono">.ino / .c / .cpp / .h / .txt</span>。选中后点"上传"，源文件会存进 <span class="mono">工作区总控台\\上传\\</span>；生成投喂包时我只需按路径 Read 它，再长的代码也不怕。上传≠自动转，转化由我（对话 AI）完成。</p>' +
    '<div class="drop" id="drop"><input type="file" id="file" accept=".ino,.c,.cpp,.h,.txt" hidden>' +
    '<div class="dropin"><b>点击选择</b> 或将代码文件拖到这里<small id="fname">未选择文件</small></div></div>' +
    '<div class="row" style="margin-top:10px">' +
    '<button class="btn" id="doUp">⇪ 上传该文件</button>' +
    (up.items.length ? '<label class="f" style="flex:1;margin:0"><span>或直接用已上传过的</span><select id="prevUp"><option value="">— 选择 —</option>' +
      up.items.map(u => '<option value="' + H(u.abs) + '">' + H(u.name) + ' · ' + KB(u.size) + '</option>').join('') + '</select></label>' : '') +
    '</div><div id="upState" class="note"></div></div>' +

    '<div class="card"><h3>功能① · Arduino/C++ 代码 → Mixly 积木工程</h3>' +
    '<p class="sub">也可以直接粘贴代码。两种方式二选一：若上方已上传/选中文件，优先用文件；否则用这里粘贴的代码。</p>' +
    '<label class="f"><span>Arduino / C++ 代码（若已上传可留空）</span><textarea id="code" placeholder="#include &lt;Servo.h&gt;&#10;Servo servo_9;&#10;void setup(){ servo_9.attach(9); }&#10;void loop(){ servo_9.write(90); delay(1000); }"></textarea></label>' +
    '<div class="row">' +
    '<label class="f" style="flex:1"><span>板卡</span><select id="board">' +
    '<option>Arduino AVR@Arduino Nano</option><option>Arduino AVR@Arduino Uno</option>' +
    '<option>Arduino AVR@Nano w/ ATmega328P Old Bootloader</option></select></label>' +
    '<label class="f" style="flex:2"><span>补充约束（可空）</span><input id="extra" placeholder="如：舵机接 9 脚；不许用 delay()；加数码管显示角度"></label>' +
    '</div>' +
    '<div class="actions"><button class="btn" id="doConv">⤴ 生成投喂包并复制</button>' +
    '<button class="ghost btn mini" id="loadMem">只投"先读记忆"</button>' +
    '<span class="note">建议：先点"只投先读记忆"确认我读全了，再发代码。</span></div>' +
    '<div id="feedOut"></div></div>' +
    '<div class="card"><h3>常见坑速查</h3><div class="chips">' +
    ['block type 必须真实存在于 520 索引', '禁用 ElementTree 重序列化 XML', '替换要保住外层 <value> 包裹标签',
     '自检要 value/shadow/statement 逐类配对', '新产物只进 最新生成\\，验证后才归 项目\\', 'volatile 无法表达→转普通 int',
     'servo_move 与 servo_move1 名字相近易混', 'ir_recv 用新版 IRremote 库且强制输出日志']
      .map(x => '<span class="chip no">' + H(x) + '</span>').join('') + '</div></div>';

  let uploaded = null;
  const fi = $('#file'), drop = $('#drop'), ps = $('#prevUp');
  const setFileLabel = (f) => { $('#fname').textContent = f.name + ' (' + KB(f.size) + ')'; uploaded = null; $('#upState').textContent = ''; };
  if (drop) {
    drop.onclick = () => fi.click();
    fi.onchange = () => { if (fi.files[0]) setFileLabel(fi.files[0]); };
    ['dragover', 'dragleave', 'drop'].forEach(ev => drop.addEventListener(ev, e => {
      e.preventDefault();
      if (ev === 'dragover') drop.classList.add('over'); else drop.classList.remove('over');
      if (ev === 'drop' && e.dataTransfer.files[0]) { fi.files = e.dataTransfer.files; setFileLabel(e.dataTransfer.files[0]); }
    }));
  }
  $('#doUp').onclick = async () => {
    const f = fi.files && fi.files[0];
    if (!f) return toast('先选择文件', 1);
    $('#upState').textContent = '上传中…';
    try {
      const text = await f.text();
      const r = await api('/api/upload', { name: f.name, text });
      uploaded = { abs: r.abs, name: r.name, size: r.size };
      $('#upState').innerHTML = '✅ 已上传：<span class="mono">' + H(r.rel) + '</span> · ' + KB(r.size);
      toast('上传成功，可直接生成投喂包');
    } catch (e) { $('#upState').textContent = '上传失败：' + e.message; toast('上传失败', 1); }
  };
  if (ps) ps.onchange = () => {
    if (ps.value) { uploaded = { abs: ps.value, name: ps.selectedOptions[0].textContent };
      $('#upState').innerHTML = '已选历史上传：<span class="mono">' + H(ps.value) + '</span>'; }
  };
  $('#doConv').onclick = () => {
    const path = (ps && ps.value) || (uploaded && uploaded.abs) || '';
    if (path) return feed('conv_file', { path, board: $('#board').value, extra: $('#extra').value.trim() });
    const c = $('#code').value.trim();
    if (!c) return toast('上传文件 或 粘贴代码，二选一', 1);
    feed('conv_code', { code: c, board: $('#board').value, extra: $('#extra').value.trim() });
  };
  $('#loadMem').onclick = () => feed('load_memory', {});
};

/* ===== 功能② 需求生成 ===== */
VIEWS.req = async (v) => {
  const o = state.data.overview || { blueprints: [] };
  let up = { items: [] };
  try { up = await api('/api/uploads'); } catch (e) { }
  const docs = up.items.filter(u => /\.(md|txt)$/i.test(u.name));
  v.innerHTML = '<div class="card"><h3>⇪ 上传需求文档（.md / .txt）</h3>' +
    '<p class="sub">需求写成文件传上来，生成投喂包时我只需按路径 Read，长需求、带表格都不怕。</p>' +
    dropZoneHTML('rq', '.md,.txt') +
    '<div class="row" style="margin-top:10px"><button class="btn" id="rqUp">⇪ 上传该文档</button>' +
    (docs.length ? '<label class="f" style="flex:1;margin:0"><span>或用已上传的</span><select id="rqPrev"><option value="">— 选择 —</option>' +
      docs.map(u => '<option value="' + H(u.abs) + '">' + H(u.name) + ' · ' + KB(u.size) + '</option>').join('') + '</select></label>' : '') +
    '</div><div id="rqState" class="note"></div></div>' +

    '<div class="card"><h3>功能② · 自然语言需求 → 积木（两段式）</h3>' +
    '<p class="sub">第1段：需求 → 可直接编译的 C 代码；第2段：复用功能①，以蓝本字符串最小修改出 .mix。不手工拼 XML。若上方已传文档，这里可留空。</p>' +
    '<label class="f"><span>需求描述（若已上传可留空）</span><textarea id="req" style="min-height:130px" placeholder="例：光敏传感器光照≥100 时，板载 LED(5脚) 连续闪烁 5 次后熄灭"></textarea></label>' +
    '<div class="row"><label class="f" style="flex:1"><span>板卡</span><input id="board2" value="Arduino AVR@Arduino Nano"></label>' +
    '<label class="f" style="flex:1"><span>指定引脚 / 禁用硬件</span><input id="pins" placeholder="如：LED=5，光敏=A0；禁用 delay()"></label></div>' +
    '<div class="actions"><button class="btn" id="doReq">⤴ 生成投喂包并复制</button>' +
    '<button class="btn blue" id="poolNew">＋ 同时建需求池记录</button></div>' +
    '<div id="feedOut"></div></div>' +
    '<div class="card"><h3>蓝本候选（结构参照）</h3><p class="sub">点一个 → 复制"对照该蓝本训练/校验"的投喂包</p><div class="chips">' +
    (o.blueprints || []).map(b => '<span class="chip" data-b="' + H(b.name) + '">' + H(b.name) + ' · ' + b.mix + '</span>').join('') +
    '</div></div>';
  let rqUploaded = null;
  wireDrop('rq', () => { rqUploaded = null; $('#rqState').textContent = ''; });
  $('#rqUp').onclick = async () => {
    const fi = $('#rq_f'); const f = fi.files && fi.files[0]; if (!f) return toast('先选文档', 1);
    $('#rqState').textContent = '上传中…';
    try { const r = await uploadFile(f); rqUploaded = { abs: r.abs, name: r.name };
      $('#rqState').innerHTML = '✅ 已上传：<span class="mono">' + H(r.rel) + '</span> · ' + KB(r.size); toast('上传成功');
    } catch (e) { $('#rqState').textContent = '上传失败：' + e.message; toast('上传失败', 1); }
  };
  const rps = $('#rqPrev'); if (rps) rps.onchange = () => { if (rps.value) { rqUploaded = { abs: rps.value }; $('#rqState').innerHTML = '已选历史上传：<span class="mono">' + H(rps.value) + '</span>'; } };
  $('#doReq').onclick = () => {
    const path = (rps && rps.value) || (rqUploaded && rqUploaded.abs) || '';
    if (path) return feed('req_file', { path, board: $('#board2').value, pins: $('#pins').value.trim() });
    const r = $('#req').value.trim(); if (!r) return toast('上传文档 或 写需求，二选一', 1);
    feed('gen_req', { req: r, board: $('#board2').value, pins: $('#pins').value.trim() });
  };
  $('#poolNew').onclick = async () => {
    const r = $('#req').value.trim(); if (!r) return toast('需先写需求文本才能建池记录', 1);
    const title = prompt('需求简称（做文件名）', r.slice(0, 14).replace(/[<>:"/\\|?*\n]/g, ''));
    if (!title) return;
    const c = await api('/api/pool/create', { title, body: r + '\n\n- 板卡：' + $('#board2').value + '\n- 引脚约束：' + ($('#pins').value.trim() || '无') });
    toast('已建：' + c.file.split('/').pop());
    await feed('pool_new', { title, req: r });
  };
  $$('#view [data-b]').forEach(e => e.onclick = () => feed('train_blue', { course: e.dataset.b }));
};

/* ===== 需求池 ===== */
VIEWS.pool = async (v) => {
  const p = await api('/api/pool');
  const cols = ['待处理', '生成中', '已生成'];
  const color = { '待处理': 'warn', '生成中': 'b', '已生成': 'ok' };
  v.innerHTML = '<div class="card spread"><h3 style="margin:0">需求池看板</h3>' +
    '<div class="r"><button class="btn" id="newReq">＋ 新建需求</button></div></div>' +
    '<div class="kanban">' + cols.map(st =>
      '<div class="kcol"><h4><span class="tag ' + (color[st] === 'b' ? '' : color[st]) + '">' + st + '</span> 需求<span class="n">' + p[st].length + '</span></h4>' +
      (p[st].map(f =>
        '<div class="kitem"><b data-p="' + H(f.rel) + '">' + H(f.name.replace(/^需求_\d{8}_/, '').replace(/\.md$/, '')) + '</b>' +
        '<small>' + H(f.mtime) + ' · ' + KB(f.size) + '</small><div class="mt">' +
        cols.filter(x => x !== st).map(x => '<button class="mini" data-mv="' + H(f.rel) + '" data-to="' + x + '">→' + x + '</button>').join('') +
        '<button class="mini" data-view="' + H(f.rel) + '">查看</button></div></div>').join('') || '<div class="empty">空</div>') +
      '</div>').join('') + '</div>' +
    '<div id="poolView"></div>';
  $('#newReq').onclick = async () => {
    const title = prompt('需求简称'); if (!title) return;
    const body = prompt('需求原文（可稍后在对话补）') || '';
    const c = await api('/api/pool/create', { title, body });
    toast('已建：' + c.file.split('/').pop()); go('pool');
  };
  $$('#view [data-mv]').forEach(b => b.onclick = async () => {
    await api('/api/pool/move', { path: b.dataset.mv, state: b.dataset.to });
    toast('已移动到 ' + b.dataset.to); go('pool');
  });
  $$('#view [data-view]').forEach(b => b.onclick = async () => {
    const d = await api('/api/doc?path=' + encodeURIComponent(b.dataset.view));
    $('#poolView').innerHTML = '<div class="card"><h3>' + H(d.path.split('/').pop()) + '</h3>' +
      '<div class="actions"><button class="mini" id="pvToggle">编辑原文</button>' +
      '<button class="mini" id="pvDl">下载</button>' +
      '<button class="mini" id="pvDel">删除(入回收)</button></div>' +
      '<div class="md" id="pvView">' + md(d.text) + '</div>' +
      '<textarea id="pvEdit" style="display:none">' + H(d.text) + '</textarea>' +
      '<div class="actions" id="pvSaveRow" style="display:none"><button class="btn" id="pvSave">保存</button></div></div>';
    let editing = false;
    $('#pvToggle').onclick = () => { editing = !editing; $('#pvView').style.display = editing ? 'none' : '';
      $('#pvEdit').style.display = editing ? '' : 'none'; $('#pvSaveRow').style.display = editing ? '' : 'none'; $('#pvToggle').textContent = editing ? '收起编辑' : '编辑原文'; };
    $('#pvSave').onclick = async () => { await api('/api/file/save', { path: d.path, text: $('#pvEdit').value }); toast('已保存'); go('pool'); };
    $('#pvDl').onclick = () => { const a = document.createElement('a'); a.href = '/api/download?path=' + encodeURIComponent(d.path); a.download = ''; a.click(); };
    $('#pvDel').onclick = async () => { if (!confirm('将该需求文件移入回收站，确定？')) return;
      await api('/api/file/delete', { path: d.path }); toast('已移入回收'); go('pool'); };
  });
};

/* ===== 积木索引 ===== */
VIEWS.blocks = async (v, q) => {
  const kw = (q || $('#globalSearch').value || '').trim();
  const r = await api('/api/blocks?q=' + encodeURIComponent(kw));
  setBadge('blocks', r.total);
  const byFile = {};
  r.hits.forEach(h => { const k = h.file + ' — ' + h.desc; (byFile[k] = byFile[k] || []).push(h); });
  v.innerHTML = '<div class="card spread"><h3 style="margin:0">积木索引 · 共 ' + r.total + ' 个</h3>' +
    '<div class="r"><input id="bq" placeholder="搜积木名/类别，如 servo TM1637 ir_recv" value="' + H(kw) + '" style="width:320px">' +
    '<button class="btn mini" id="bgo">搜索</button></div></div>' +
    (r.hits.length ? Object.entries(byFile).map(([k, arr]) =>
      '<div class="card"><h3>' + H(k) + ' <span class="tag">' + arr.length + '</span></h3><div class="chips">' +
      arr.map(a => '<span class="chip ' + (a.gen ? 'ok' : 'no') + '" title="' + H(a.file) + (a.gen ? ' 有生成器' : ' 辅助/无独立生成器') + '">' + H(a.block) + '</span>').join('') +
      '</div></div>').join('')
      : '<div class="empty">没匹配到积木 —— 索引里没有就说明本机无此积木，别硬造</div>') +
    '<div class="note">绿色=有代码生成器（可直接用）；红色=辅助/无独立生成器（多为容器块）。需要确认字段结构时，投喂"体检/查库"指令让我去读对应 blocks/*.js。</div>';
  $('#bgo').onclick = () => go('blocks', $('#bq').value);
  $('#bq').onkeydown = (e) => { if (e.key === 'Enter') go('blocks', $('#bq').value); };
  $$('#view .chip').forEach(c => c.onclick = () => { navigator.clipboard && navigator.clipboard.writeText(c.textContent); toast('已复制积木名：' + c.textContent); });
};

/* ===== .mix 体检 ===== */
VIEWS.doctor = async (v, path) => {
  const mixes = (await api('/api/mixlist?path=11')).items;
  v.innerHTML = '<div class="card"><h3>.mix 结构体检</h3>' +
    '<p class="sub">本地即时校验（不等 AI）：五类标签开闭计数、minidom 良构、&lt;code&gt; base64 还原、积木 type 是否在 520 索引内；可选一份蓝本做 type 全集并排对比。</p>' +
    '<div class="row"><label class="f" style="flex:3"><span>选择 .mix</span><select id="msel">' +
    mixes.map(m => '<option value="' + H(m.rel) + '"' + (m.rel === path ? ' selected' : '') + '>' + H(m.rel) + '</option>').join('') +
    '</select></label>' +
    '<label class="f" style="flex:3"><span>对照蓝本（可选）</span><select id="bsel"><option value="">— 不对比 —</option>' +
    mixes.map(m => '<option value="' + H(m.rel) + '">' + H(m.rel) + '</option>').join('') + '</select></label>' +
    '<div style="flex:1;display:flex;align-items:flex-end"><button class="btn" id="runDoc">▶ 体检</button></div></div>' +
    '<div id="docOut"></div><div id="diffOut"></div></div>';
  $('#runDoc').onclick = () => runDoctor($('#msel').value);
  $('#bsel').onchange = () => { if ($('#bsel').value && window.__lastDoc) renderDiff(window.__lastDoc.types_raw, $('#bsel').value); };
  if (path) runDoctor(path); else if (mixes[0]) runDoctor(mixes[0].rel);
  async function runDoctor(p) {
    const d = await api('/api/mix?path=' + encodeURIComponent(p));
    window.__lastDoc = { types_raw: d.unique_types, d, p };
    const idx = await api('/api/blocks?q=&limit=0');
    const known = new Set(idx.hits.map(x => x.block));
    const unknown = d.unique_types.filter(t => !known.has(t));
    const ok = !d.issues.length && !unknown.length;
    $('#docOut').innerHTML =
      '<div class="feed ' + (ok ? '' : 'warn') + '"><b>' + (ok ? '结构体检通过' : '有 ' + (d.issues.length + unknown.length) + ' 项需注意') + '</b> · ' +
      H(d.board || '无板卡属性') + ' · ' + KB(d.size) + ' · block ' + d.block_total + ' 个 / 去重 ' + d.unique_types.length +
      ' <button class="mini" id="expRpt" style="margin-left:8px">⭳ 导出报告</button></div>' +
      '<div class="grid g4" style="margin-top:12px">' + Object.entries(d.counts).map(([t, c]) =>
        '<div class="stat"><b class="' + (c.balanced ? '' : 'x') + '" style="color:' + (c.balanced ? 'var(--ac)' : 'var(--red)') + '">' + c.open + ' / ' + c.close + '</b>' +
        '<span>&lt;' + t + '&gt; 开/闭' + (c.balanced ? '' : ' ⚠ 不平衡') + '</span></div>').join('') + '</div>' +
      (unknown.length ? '<div class="feed warn" style="margin-top:12px"><b>索引中查不到的 type</b>（可能是拼错或本机无此积木）：' +
        unknown.map(u => '<span class="chip no">' + H(u) + '</span>').join(' ') + '</div>' : '') +
      (d.issues.length ? '<div class="feed bad" style="margin-top:12px"><b>问题</b><br>' + d.issues.map(H).join('<br>') + '</div>' : '') +
      '<hr class="sep"><div class="spread"><h3 style="margin:0;font-size:14px">积木链（前 120 行）</h3>' +
      '<div class="r"><button class="mini" id="askFix">⤴ 投喂给 AI 修复</button></div></div>' +
      '<div class="tree">' + d.chain.slice(0, 120).map(c =>
        '<div class="lv" style="padding-left:' + (c.depth * 18) + 'px"><span class="ln">└</span>' +
        '<span class="bt' + (c.depth === 0 ? ' top' : '') + '">' + H(c.type) + '</span>' +
        (c.fields.length ? '<span class="fld">' + c.fields.map(f => H(f.name) + '=' + H(f.value)).join(' · ') + '</span>' : '') + '</div>').join('') + '</div>' +
      '<hr class="sep"><h3 style="font-size:14px">内嵌 C 源码（base64 已解出）</h3>' +
      (d.code ? '<pre>' + H(d.code) + '</pre>' : '<div class="empty">' + H(d.code_err || '无 <code> 段') + '</div>');
    $('#askFix').onclick = () => feed('validate', { path: p, blueprint: $('#bsel').value || '' }, '修复指令已进剪贴板');
    $('#expRpt').onclick = () => exportReport(d, unknown, p);
    if ($('#bsel').value) renderDiff(d.unique_types, $('#bsel').value);
  }
  async function renderDiff(targetTypes, bpPath) {
    const b = await api('/api/mix?path=' + encodeURIComponent(bpPath));
    const T = new Set(targetTypes), B = new Set(b.unique_types);
    const missing = [...B].filter(t => !T.has(t));   // 蓝本有、目标无 → 可能漏功能
    const extra = [...T].filter(t => !B.has(t));     // 目标有、蓝本无 → 可能冗余
    $('#diffOut').innerHTML = '<div class="card"><h3>与蓝本 type 对比</h3>' +
      '<p class="sub mono">目标 ' + H(window.__lastDoc.p) + ' ⇄ 蓝本 ' + H(bpPath) + '（' + b.block_total + ' block）</p>' +
      '<div class="grid g2">' +
      '<div><b class="tag warn">蓝本独有 / 目标缺（' + missing.length + '）</b><div class="chips">' + (missing.map(t => '<span class="chip no">' + H(t) + '</span>').join(' ') || '无') + '</div></div>' +
      '<div><b class="tag b">目标独有 / 蓝本无（' + extra.length + '）</b><div class="chips">' + (extra.map(t => '<span class="chip ok">' + H(t) + '</span>').join(' ') || '无') + '</div></div>' +
      '</div><p class="note">注：type 集合差异只反映“积木种类”，不反映个数/连线/字段；具体不等还要看积木链。</p></div>';
  }
  function exportReport(d, unknown, p) {
    let s = '# .mix 体检报告\n\n- 文件：' + p + '\n- 板卡：' + (d.board || '无') + '\n- 大小：' + d.size + ' 字节\n- block：' + d.block_total + ' / 去重 type：' + d.unique_types.length + '\n\n## 五类标签开闭\n';
    Object.entries(d.counts).forEach(([t, c]) => { s += '- <' + t + '> 开' + c.open + ' / 闭' + c.close + (c.balanced ? ' ✓' : ' ✗ 不平衡') + '\n'; });
    s += '\n## 索引查不到的 type\n' + (unknown.length ? unknown.map(u => '- ' + u).join('\n') : '- 无') + '\n';
    s += '\n## 问题\n' + (d.issues.length ? d.issues.map(i => '- ' + i).join('\n') : '- 无') + '\n';
    s += '\n## 内嵌 C 源码\n```c\n' + (d.code || d.code_err || '') + '\n```\n';
    const blob = new Blob([s], { type: 'text/markdown;charset=utf-8' });
    const a = document.createElement('a'); a.href = URL.createObjectURL(blob);
    a.download = '体检报告_' + (p.split('/').pop() || 'mix') + '.md'; a.click(); URL.revokeObjectURL(a.href);
    toast('报告已导出');
  }
};

/* ===== 资产库（蓝本/成品/最新生成） ===== */
function libView(title, sub, path, extra) {
  return async (v) => {
    const r = await api('/api/mixlist?path=' + encodeURIComponent(path));
    v.innerHTML = '<div class="card spread"><div><h3 style="margin:0">' + H(title) + '</h3><p class="sub" style="margin:4px 0 0">' + H(sub) + '</p></div>' +
      '<div class="r"><span class="tag">' + r.items.length + ' 个 .mix</span></div></div>' + (extra || '') +
      '<div class="card"><table><thead><tr><th>文件</th><th>所在目录</th><th class="num">大小</th><th>操作</th></tr></thead><tbody>' +
      (r.items.map(m => '<tr class="clickrow" data-p="' + H(m.rel) + '"><td>' + H(m.name) + '</td><td class="mono">' + H(m.dir) + '</td>' +
        '<td class="num">' + KB(m.size) + '</td><td><button class="mini" data-open="' + H(m.rel) + '">查看/体检</button></td></tr>').join('') ||
        '<tr><td colspan="4" class="empty">暂无</td></tr>') + '</tbody></table></div><div id="mixOut"></div>';
    const open = (p) => go('doctor', p);
    $$('#view tr.clickrow').forEach(t => t.onclick = () => open(t.dataset.p));
    $$('#view [data-open]').forEach(b => b.onclick = (e) => { e.stopPropagation(); open(b.dataset.open); });
  };
}
VIEWS.blueprint = libView('蓝本参考库 · 课程素材', '92+ 个官方真实 .mix，已实测可打开；生成时作结构参照，禁止覆盖', 'Mixly转换器/蓝本参考/课程素材');
VIEWS.projects = libView('项目成品库', '按硬件分类、已通过 Mixly 验证的可信成品', 'Mixly转换器/项目');
VIEWS.latest = libView('最新生成（待验证）', '⚠️ 未过 Mixly 打开验证，不要当蓝本参考', 'Mixly转换器/最新生成');

/* ===== 课程知识库 ===== */
VIEWS.courses = async (v, focus) => {
  const c = await api('/api/courses');
  const totalAll = c.reduce((a, x) => a + x.files_all, 0);
  const totalDirect = c.reduce((a, x) => a + x.files_direct, 0);
  const fileChip = (f) => '<span class="chip dl" data-dl="' + H(f.rel) + '" title="' + KB(f.size) + ' · 点击下载">' + H(f.name) + '</span>';
  v.innerHTML = '<div class="card spread"><div><h3 style="margin:0">课程知识库 · 智慧生活</h3>' +
    '<p class="sub" style="margin:4px 0 0">' + c.length + ' 门课 · ' + c.reduce((a, x) => a + x.lessons.length, 0) + ' 课时 · ' + totalDirect + ' 个资料文件' +
    (totalAll > totalDirect ? '（另 ' + (totalAll - totalDirect) + ' 个在嵌套子目录，共 ' + totalAll + '）' : '') + '· 点文件名可下载</p></div>' +
    '<div class="r"><button class="mini" id="toPreview" title="在新标签打开课程代码预览站 http://127.0.0.1:8890 ：看 .mix 还原的 C++ 源码/积木清单，并一键在米思齐打开对应工程。若打不开，请先运行 素材库/课程知识库/_网页/启动课程预览站.bat">🔍 代码预览 / 米思齐 →</button> <button class="mini" id="toScrape">→ 抓取投喂</button></div></div>' +
    c.map(x => '<div class="card" id="' + (x.rel === focus ? 'hl' : '') + '"><h3>' + H(x.course) + ' <span class="tag">' + x.lessons.length + ' 课时 / ' +
      x.files_direct + ' 文件' + (x.files_all > x.files_direct ? '（含嵌套 ' + x.files_all + '）' : '') + '</span></h3>' +
      (x.lessons.map(l => '<div style="margin-bottom:9px"><span class="chip b">' + H(l.lesson) + '</span> ' +
        (l.files.length ? l.files.map(fileChip).join(' ') : '<span class="tag warn">无课时直下资料</span>') +
        (l.nested && l.nested.length ? '<div class="note" style="margin-left:8px">↳ 嵌套子目录：' + l.nested.map(n => H(n.name) + '（' + n.files + ' 文件）').join('、') + '</div>' : '') +
        '</div>').join('')) +
      (x.loose.length ? '<hr class="sep"><div class="note">课时夹外的散文件：' + x.loose.map(fileChip).join(' ') + '</div>' : '') +
      '</div>').join('');
  $('#toPreview').onclick = () => window.open('http://127.0.0.1:8890', '_blank');
  $('#toScrape').onclick = () => go('scrape');
  $$('#view .chip.dl').forEach(ch => ch.onclick = () => {
    const a = document.createElement('a'); a.href = '/api/download?path=' + encodeURIComponent(ch.dataset.dl); a.download = ''; document.body.appendChild(a); a.click(); a.remove();
    toast('开始下载：' + ch.textContent);
  });
  const hl = $('#hl'); if (hl) hl.scrollIntoView();
};

/* ===== 课程资料抓取 ===== */
VIEWS.scrape = async (v) => {
  const c = await api('/api/courses');
  v.innerHTML = '<div class="card"><h3>课程资料抓取 · 投喂入口</h3>' +
    '<p class="sub">流程：确认已登录 → 注入 browser_toolkit → 起本机服务 → 逐课采集（强制导航 + 按 aggregate 附件 id 过滤，防串课）→ 本机按课时归位下载。全程无弹窗、无重名。</p>' +
    '<label class="f"><span>目标课程</span><select id="tcourse">' +
    '<option value="">全部剩余 / 新增课程</option>' + c.map(x => '<option>' + H(x.course) + '</option>').join('') + '</select></label>' +
    '<div class="actions"><button class="btn" id="scRun">⤴ 生成投喂包并复制</button>' +
    '<button class="btn blue" id="scSvc">▶ 启动本机接收服务</button>' +
    '<span class="note" id="scState"></span></div>' +
    '<div id="feedOut"></div></div>' +
    '<div class="card"><h3>抓取铁律</h3><div class="chips">' +
    ['手动 fetch download-url 恒 402，必须 UI 点击触发', '附件数以 aggregate.attachments 为准，勿读 DOM',
     '重写 a.click 吞掉 blob/download/OSS，杜绝弹窗重名', '每课强制 location.hash 导航，按附件 id 过滤防串课',
     '会话约 2-3 分钟过期会销毁上下文 → 逐课采完立即入库', '教学课件 coursewares 仅在线预览，不在此范围']
      .map(x => '<span class="chip no">' + H(x) + '</span>').join('') + '</div></div>' +
    '<div class="card"><h3>相关脚本</h3><div class="chips">' +
    ['_归档/课程资料采集/课程抓取/必要脚本/browser_toolkit.js', '_归档/课程资料采集/课程抓取/必要脚本/collect_server.py',
     '_归档/课程资料采集/课程抓取/必要脚本/make_course_dirs.py', '_归档/课程资料采集/课程抓取/数据/lessons.json',
     '_归档/课程资料采集/课程抓取/课程资料抓取_完整流程.md']
      .map(x => '<span class="chip" data-doc="' + H(x) + '">' + H(x.split('/').pop()) + '</span>').join('') + '</div></div>';
  $('#scRun').onclick = () => feed('scrape_course', { course: $('#tcourse').value });
  $('#scSvc').onclick = startSvc;
  $$('#view [data-doc]').forEach(e => e.onclick = () => go('docs', e.dataset.doc));
};

/* ===== PPT 转本地 ===== */
VIEWS.ppt = async (v) => {
  v.innerHTML = '<div class="card"><h3>PPT 转本地 · 投喂入口</h3>' +
    '<p class="sub">v8 流程：把在线只读预览（阿里云 Web Office / WPS 内核，跨域 iframe）逐页分层还原成本地可编辑 pptx —— 底图 / 原生形状 / 原生图片(含裁剪旋转) / 文本框。</p>' +
    '<label class="f"><span>课件名</span><input id="pName" placeholder="如：一触即发 / 串口与数据解析"></label>' +
    '<label class="f"><span>预览地址</span><input id="pUrl" placeholder="https://edu.jiqirendashi.com/#/document-preview?courseAttachmentId=…"></label>' +
    '<div class="actions"><button class="btn" id="pRun">⤴ 生成投喂包并复制</button></div><div id="feedOut"></div></div>' +
    '<div class="card"><h3>已验证适配点</h3><div class="chips">' +
    ['SVG 镜像矩阵 det&lt;0 需在 rebuild 补 flipV（否则图片颠倒）', '接收服务端口/落盘路径按本机适配',
     '5s 门控 + 多课件复用 + 慢页复核', 'check 校验：每页图片标签数 == 素材文件数']
      .map(x => '<span class="chip no">' + H(x) + '</span>').join('') + '</div>' +
    '<div class="chips" style="margin-top:10px">' +
    ['_归档/课程资料采集/PPT转本地/在线PPT转本地PPTX_完整流程.md', '_归档/课程资料采集/PPT转本地/必要脚本/v8_toolkit.js',
     '_归档/课程资料采集/PPT转本地/必要脚本/upload_server_v8.py', '_归档/课程资料采集/PPT转本地/必要脚本/rebuild_pptx8.py']
      .map(x => '<span class="chip" data-doc="' + H(x) + '">' + H(x.split('/').pop()) + '</span>').join('') + '</div></div>' +
    '<div class="card"><h3>已有产物</h3><div class="mono">_归档/课程资料采集/PPT转本地/一触即发_元素重建版.pptx</div></div>';
  $('#pRun').onclick = () => feed('ppt_convert', { name: $('#pName').value.trim(), url: $('#pUrl').value.trim() });
  $$('#view [data-doc]').forEach(e => e.onclick = () => go('docs', e.dataset.doc));
};

/* ===== 文档中心 ===== */
const DOCS = [
  ['Mixly转换器/MEMORY.md', '记忆铁律（唯一事实来源）'], ['Mixly转换器/Mixly积木索引.md', '520 积木查库地图'],
  ['Mixly转换器/用户操作指南.md', '使用说明'], ['Mixly转换器/README.md', '工作区结构总纲'],
  ['Mixly转换器/.trae/skills/mixly-converter/SKILL.md', 'mixly-converter 技能'],
  ['Mixly转换器/引擎/README.md', '共享引擎总览'], ['Mixly转换器/引擎/blocks定位.md', '引擎·blocks定位'],
  ['Mixly转换器/引擎/组装器.md', '引擎·组装器'], ['Mixly转换器/引擎/mix生成器.md', '引擎·mix生成器'],
  ['Mixly转换器/引擎/校验器.md', '引擎·校验器'], ['Mixly转换器/引擎/积木方案-schema.md', '引擎·数据契约'],
  ['Mixly转换器/功能①代码转换/README.md', '功能①说明'],
  ['Mixly转换器/功能②需求生成/README.md', '功能②说明'], ['Mixly转换器/功能②需求生成/推理接口.md', '推理接口契约'],
  ['Mixly转换器/功能②需求生成/需求解析流程.md', '需求解析流程'], ['Mixly转换器/功能②需求生成/需求提示词库.md', '需求提示词库'],
  ['Mixly转换器/蓝本参考/课程素材/README.md', '课程→硬件速查表'],
  ['_归档/课程资料采集/课程抓取/课程资料抓取_完整流程.md', '课程资料抓取流程'],
  ['_归档/课程资料采集/PPT转本地/在线PPT转本地PPTX_完整流程.md', 'PPT 转本地流程 v8'],
  ['工作区总控台/使用说明.md', '总控台使用说明'],
];
VIEWS.docs = async (v, pick) => {
  const cur = pick || DOCS[0][0];
  let d;
  try { d = await api('/api/doc?path=' + encodeURIComponent(cur)); } catch (e) { d = null; }
  v.innerHTML = '<div class="grid" style="grid-template-columns:260px 1fr;align-items:start">' +
    '<div class="card" style="padding:10px"><h3 style="padding:4px 6px 0;font-size:13px">文档</h3>' +
    DOCS.map(([p, t]) => '<a class="' + (p === cur ? 'on' : '') + '" data-d="' + H(p) + '" style="display:block;padding:6px 8px;border-radius:6px;cursor:pointer;color:var(--fg2);font-size:12.5px' +
      (p === cur ? ';background:var(--ac2);color:#fff' : '') + '">' + H(t) + '</a>').join('') + '</div>' +
    '<div class="card"><h3>' + H(cur.split('/').pop()) + '</h3><p class="sub mono">' + H(d ? d.path : cur) + (d ? ' · ' + KB(d.size) : '') + '</p>' +
    (d ? '<div class="md">' + md(d.text) + '</div>' : '<div class="empty">读不到该文档（路径可能已变）</div>') + '</div></div>';
  $$('#view [data-d]').forEach(a => a.onclick = () => go('docs', a.dataset.d));
};

/* ===== 文件浏览器 ===== */
VIEWS.files = async (v, rel) => {
  const t = await api('/api/tree?path=' + encodeURIComponent(rel || ''));
  const TXT = /\.(md|txt|json|js|py|yaml|yml|ino|c|cpp|h|csv|html|css|xml|bat)$/i;
  v.innerHTML = '<div class="card spread"><h3 style="margin:0">文件浏览器</h3>' +
    '<div class="mono">/ ' + H(t.rel) + '</div>' +
    '<div class="r">' + (rel ? '<button class="mini" id="up">↑ 上级</button>' : '') +
    '<button class="mini" id="rootBtn">工作区根</button></div></div>' +
    ((t.dirs.length || t.files.length) ?
      '<div class="card"><table><tbody>' +
      t.dirs.map(d => '<tr class="clickrow" data-p="' + H(d.rel) + '"><td>📁 ' + H(d.name) + '</td><td class="num">' + d.children + ' 项</td></tr>').join('') +
      t.files.map(f => '<tr><td>📄 <b data-f="' + H(f.rel) + '" class="flink">' + H(f.name) + '</b></td><td class="num">' + KB(f.size) + '</td>' +
        '<td class="mono">' + H(f.mtime) + '</td><td class="r">' +
        (TXT.test(f.name) ? '<button class="mini" data-edit="' + H(f.rel) + '">编辑</button>' : '') +
        '<button class="mini" data-dl="' + H(f.rel) + '">下载</button>' +
        '<button class="mini" data-del="' + H(f.rel) + '">删</button></td></tr>').join('') +
      '</tbody></table></div>' : '<div class="empty">空目录</div>') +
    '<div id="fileOut"></div>';
  if (rel) $('#up').onclick = () => go('files', rel.split('/').slice(0, -1).join('/'));
  $('#rootBtn').onclick = () => go('files', '');
  $$('#view [data-p]').forEach(r => r.onclick = () => go('files', r.dataset.p));
  const doDl = (p) => { const a = document.createElement('a'); a.href = '/api/download?path=' + encodeURIComponent(p); a.download = ''; a.click(); };
  $$('#view [data-dl]').forEach(b => b.onclick = (e) => { e.stopPropagation(); doDl(b.dataset.dl); });
  $$('#view [data-del]').forEach(b => b.onclick = async (e) => { e.stopPropagation();
    if (!confirm('移入回收站？' + b.dataset.del)) return;
    try { await api('/api/file/delete', { path: b.dataset.del }); toast('已入回收'); go('files', rel); } catch (er) { toast(er.message, 1); }
  });
  const openFile = async (p) => {
    if (/\.mix$/i.test(p)) return go('doctor', p);
    try {
      const d = await api('/api/doc?path=' + encodeURIComponent(p));
      const isTxt = TXT.test(p);
      $('#fileOut').innerHTML = '<div class="card"><h3>' + H(p.split('/').pop()) + ' <span class="tag">' + KB(d.size) + '</span></h3>' +
        (isTxt ? '<div class="actions"><button class="mini" id="foEdit">编辑</button><button class="mini" id="foDl">下载</button></div>' +
          '<div class="md" id="foView">' + (p.endsWith('.md') ? md(d.text) : '<pre>' + H(d.text) + '</pre>') + '</div>' +
          '<textarea id="foEditArea" style="display:none">' + H(d.text) + '</textarea>' +
          '<div class="actions" id="foSaveRow" style="display:none"><button class="btn" id="foSave">保存</button></div>'
          : '<div class="empty">该类型不做文本预览，可下载。</div>') + '</div>';
      if (isTxt) {
        $('#foDl').onclick = () => doDl(p);
        $('#foEdit').onclick = () => { $('#foView').style.display = 'none'; $('#foEditArea').style.display = ''; $('#foSaveRow').style.display = ''; $('#foEdit').style.display = 'none'; };
        $('#foSave').onclick = async () => { await api('/api/file/save', { path: p, text: $('#foEditArea').value }); toast('已保存'); go('files', rel); };
      }
    } catch (e) { $('#fileOut').innerHTML = '<div class="feed bad">' + H(e.message) + '</div>'; }
  };
  $$('#view [data-f]').forEach(r => r.onclick = () => openFile(r.dataset.f));
};

/* ===== 全文搜索 ===== */
VIEWS.search = async (v, q) => {
  const kw = (q || '').trim();
  let r = { hits: [], scanned: 0, truncated: false };
  if (kw) r = await api('/api/search?q=' + encodeURIComponent(kw));
  const groups = {};
  r.hits.forEach(h => (groups[h.path] = groups[h.path] || []).push(h));
  v.innerHTML = '<div class="card spread"><h3 style="margin:0">全文搜索</h3>' +
    '<div class="r"><input id="sq" placeholder="在工作区文本文件里搜关键词，如 servo_move / 蓝牙 / base64" value="' + H(kw) + '" style="width:420px">' +
    '<button class="btn mini" id="sgo">搜索</button></div></div>' +
    (kw ? '<div class="note">扫描 ' + r.scanned + ' 个文本文件 · 命中 ' + r.hits.length + ' 处' + (r.truncated ? '（已截断）' : '') + '</div>' : '<div class="empty">输入关键词开始搜索</div>') +
    (r.hits.length ? Object.entries(groups).map(([p, hs]) => '<div class="card"><h3>' + H(p.split('/').pop()) + ' <span class="tag mono">' + H(p) + '</span> <span class="tag">' + hs.length + '</span></h3>' +
      '<div class="tree">' + hs.map(h => '<div class="lv"><span class="ln">:' + h.line + '</span><span class="fld">' + H(h.text) + '</span> <button class="mini" data-open="' + H(p) + '">预览</button></div>').join('') + '</div></div>').join('') : (kw ? '<div class="empty">没找到匹配</div>' : '')) +
    '<div id="srOut"></div>';
  $('#sgo').onclick = () => go('search', $('#sq').value);
  $('#sq').onkeydown = (e) => { if (e.key === 'Enter') go('search', $('#sq').value); };
  $$('#view [data-open]').forEach(b => b.onclick = async () => {
    const p = b.dataset.open;
    if (/\.mix$/i.test(p)) return go('doctor', p);
    try { const d = await api('/api/doc?path=' + encodeURIComponent(p));
      $('#srOut').innerHTML = '<div class="card"><h3>' + H(p) + '</h3>' + (p.endsWith('.md') ? '<div class="md">' + md(d.text) + '</div>' : '<pre>' + H(d.text.slice(0, 20000)) + '</pre>') + '</div>';
      $('#srOut').scrollIntoView();
    } catch (e) { $('#srOut').innerHTML = '<div class="feed bad">' + H(e.message) + '</div>'; }
  });
};

/* ===== 作业台 ===== */
const KIND_LABEL = { load_memory: '只读记忆', conv_code: '代码转换(贴码)', conv_file: '代码转换(上传文件)', gen_req: '需求生成', req_file: '需求生成(文档)', validate: '体检修复', scrape_course: '课程抓取', ppt_convert: 'PPT转换', train_blue: '蓝本训练', pool_new: '新需求入池', custom: '自定义' };
VIEWS.console = async (v) => {
  const [o, pool, feeds] = await Promise.all([api('/api/overview'), api('/api/pool'), api('/api/feeds')]);
  const pend = pool['待处理'].concat(pool['生成中']);
  const latFiles = o.latest.reduce((a, b) => a + b.files, 0);
  const quickGo = (k, t, s) => '<div class="stat quickgo" data-go="' + k + '" style="cursor:pointer"><b style="font-size:15px">' + H(t) + '</b><span>' + H(s) + '</span></div>';
  v.innerHTML = '<div class="card"><h3>今天做什么</h3><p class="sub">把散在各处的事项收到这一屏：一键开跑、待处理需求、待验证产物、最近投喂（还没粘的）。</p>' +
    '<div class="grid g3">' + quickGo('conv', '⇄ 代码 → 积木', '上传/粘贴代码') + quickGo('req', '✦ 需求 → 积木', '两段式生成') +
    quickGo('doctor', '✚ 体检 .mix', '结构校验+蓝本对比') + quickGo('scrape', '↓ 抓课程资料', '浏览器采集+本机下载') +
    quickGo('ppt', '▣ PPT 转本地', 'v8 分层还原') + quickGo('search', '🔍 全文搜索', '跨文件找关键词') + '</div></div>' +

    '<div class="grid g2">' +
    '<div class="card"><h3>待处理需求 <span class="tag">' + pend.length + '</span></h3>' +
    (pend.length ? pend.map(f => '<div class="kitem"><b>' + H(f.name.replace(/^需求_\d{8}_/, '').replace(/\.md$/, '')) + '</b><small>' + H(f.mtime) + '</small></div>').join('') : '<div class="empty">没有排队的需求</div>') +
    '<div class="actions"><button class="mini" data-go="pool">→ 去需求池管理</button></div></div>' +

    '<div class="card"><h3>待验证产物 <span class="tag">' + latFiles + '</span></h3>' +
    (o.latest.length ? o.latest.map(l => '<div class="kitem"><b>' + H(l.name) + '</b><small>' + l.files + ' 文件 · Mixly转换器/最新生成</small></div>').join('') : '<div class="empty">最新生成目录为空</div>') +
    '<div class="actions"><button class="mini" data-go="latest">→ 去体检</button></div></div>' +
    '</div>' +

    '<div class="card"><h3>最近投喂（回对话 Ctrl+V）</h3>' +
    (feeds.items.length ? '<table><tbody>' + feeds.items.slice(0, 12).map(f => '<tr><td class="mono">' + H(f.t) + '</td><td>' + H(KIND_LABEL[f.kind] || f.kind) + '</td><td class="num">' + f.chars + ' 字</td><td>' + (f.copied ? '<span class="tag ok">已进剪贴板</span>' : '<span class="tag warn">未复制</span>') + '</td></tr>').join('') + '</tbody></table>' : '<div class="empty">还没有投喂记录（在功能页点“生成投喂包”后就会出现在这里）</div>') +
    '<p class="note">投喂=生成一段带记忆路径/绝对路径的指令进剪贴板；真正执行的是对话里的我。抓取/PPT 类必须我操控浏览器，不走网页执行。</p></div>';
  $$('#view [data-go]').forEach(b => b.onclick = () => go(b.dataset.go));
};

/* ---------------- 本地服务面板 ---------------- */
let SVC = [];
async function refreshSvc() {
  if (ONLINE_BY_HOST) { showSvcOnline(); return; }
  try { SVC = await api('/api/services'); renderSvc(); }
  catch (e) { $('#svcList').innerHTML = '<li><span class="dot off"></span> 服务状态未知</li>'; }
}
function renderSvc() {
  $('#svcList').innerHTML = SVC.map(s =>
    '<li><span class="dot ' + (s.open ? 'on' : 'off') + '"></span>' +
    H(s.name) + ' <span class="mono">:' + s.port + '</span>' +
    (s.hub ? ' <span class="mono" style="color:var(--fg3)">本体</span>' : '') + '</li>').join('');
}
function showSvcOnline() {
  $('#svcList').innerHTML = '<li><span class="dot"></span> 在线版为只读，无法启停本机服务</li>';
  $('#svcBtns').style.display = 'none';
  $('#svcOpenLocal').style.display = 'inline-block';
}
async function startSvc() {
  toast('正在启动本地服务…');
  try {
    const r = await api('/api/services/start', {});
    if (r.started && r.started.length) toast('已拉起：' + r.started.join('、'));
    else toast('服务均已在运行');
  } catch (e) { toast('启动失败：' + e.message, 1); }
  setTimeout(refreshSvc, 1200);
}
async function stopSvc() {
  if (!confirm('确定关闭本机全部服务？总控台自身也会退出，下次需双击 启动总控台.bat 重开。')) return;
  try {
    await api('/api/services/stop', { scope: 'all' });
    $('#svcList').innerHTML = '<li><span class="dot off"></span> 已关闭，页面即将失去连接…</li>';
    toast('本机服务已全部关闭');
  } catch (e) { toast('关闭失败：' + e.message, 1); }
}

/* ---------------- 启动 ---------------- */
$('#globalSearch').onkeydown = (e) => { if (e.key === 'Enter') go('search', e.target.value); };
$('#reloadBtn').onclick = () => go(state.view, state.view === 'overview' ? null : state.arg);
$('#svcStartAll').onclick = startSvc;
$('#svcStopAll').onclick = stopSvc;
(async function boot() {
  await loadSnapshot();
  renderNav();
  await go(ONLINE_BY_HOST && SNAP ? 'overview' : 'console');
  refreshSvc(); setInterval(refreshSvc, 15000);
})();
