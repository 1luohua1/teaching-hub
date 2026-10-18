# -*- coding: utf-8 -*-
"""
机器人编程 内容体系页构建脚本
扫描 机器人编程 项目三大子目录的真实文件，生成自包含单文件 HTML。
仿 Scratch 课程体系预览页思路：页头统计 + 分类卡片 + 详情弹窗（真实文件清单）。
产物：教学总站/机器人编程/index.html
"""
import os, json, urllib.parse, datetime

SRC = r"D:\小项目\合作实验区\项目一\机器人编程"
OUT_DIR = r"D:\小项目\合作实验区\项目一\教学总站\机器人编程"
OUT = os.path.join(OUT_DIR, "index.html")

CATS = [
    {"key": "base", "name": "机器人编程（基础体系）", "sub": "Robotics · 一阶 / 二阶",
     "icon": "\U0001F916", "dir": "机器人编程",
     "desc": "分阶课程：一阶、二阶及对应作业，配套 PPT 课件。点开看每一阶的真实课件清单。"},
    {"key": "new", "name": "机器人编程（新）+ 智能编程（新）", "sub": "Robotics New · Smart Coding",
     "icon": "\U0001F9EC", "dir": "机器人编程（新）+智能编程(新)",
     "desc": "新版机器人编程与智能编程融合课件，全部为 PPTX。点开看 88 份课件清单。"},
    {"key": "wedo", "name": "WeDo 编程", "sub": "WeDo 2.0",
     "icon": "\U0001F527", "dir": "wedo编程",
     "desc": "WeDo 2.0 体系：课件、教案、素材图、视频、工程文件等。点开看 169 份资料清单。"},
]

TYPE_CN = {
    "ppt": "PPT 课件", "pptx": "PPTX 课件", "pdf": "PDF 文档", "txt": "文本",
    "jpg": "图片", "jpeg": "图片", "png": "图片", "gif": "动图", "mp4": "视频",
    "docx": "Word", "url": "链接", "sb3": "Scratch 工程", "io": "工程文件",
    "": "其他",
}

def scan(catdir):
    files = []
    for root, _, fs in os.walk(catdir):
        for f in fs:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, catdir)
            parts = rel.split(os.sep)
            group = parts[0] if len(parts) > 1 else "（根目录）"
            ext = f.rsplit(".", 1)[-1].lower() if "." in f else ""
            files.append({"name": f, "group": group, "ext": ext, "full": full})
    return files

def href_for(full):
    # 相对 教学总站/机器人编程/index.html 指向 项目一/机器人编程/...
    rel = os.path.relpath(full, OUT_DIR)
    parts = rel.split(os.sep)
    ups = sum(1 for p in parts if p == "..")
    tail = "/".join(urllib.parse.quote(p) for p in parts[ups:])
    return ("../" * ups) + tail

cats_data = []
all_total = 0
all_ppt = 0
all_other = 0
for c in CATS:
    catdir = os.path.join(SRC, c["dir"])
    files = scan(catdir)
    # 按子目录分组
    groups_map = {}
    ext_count = {}
    for it in files:
        groups_map.setdefault(it["group"], []).append(it)
        ext_count[it["ext"]] = ext_count.get(it["ext"], 0) + 1
    groups = []
    for gname in sorted(groups_map.keys(), key=lambda x: (x == "（根目录）", x)):
        items = []
        for it in sorted(groups_map[gname], key=lambda x: x["name"]):
            items.append({"name": it["name"], "ext": it["ext"],
                          "href": href_for(it["full"])})
        groups.append({"name": gname, "items": items})
    total = len(files)
    ppt_n = ext_count.get("ppt", 0) + ext_count.get("pptx", 0)
    all_total += total
    all_ppt += ppt_n
    all_other += total - ppt_n
    chips = []
    for ext in sorted(ext_count, key=lambda e: -ext_count[e]):
        chips.append({"label": TYPE_CN.get(ext, ext.upper()), "n": ext_count[ext]})
    cats_data.append({
        "key": c["key"], "name": c["name"], "sub": c["sub"], "icon": c["icon"],
        "desc": c["desc"], "total": total, "chips": chips, "groups": groups,
    })

DATE = datetime.date.today().strftime("%Y-%m-%d")
DATA_JSON = json.dumps(cats_data, ensure_ascii=False)

HTML = """<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>机器人编程 · 内容体系</title>
<style>
  :root {
    --wb: #4f6bff; --wb-deep: #2f3db0; --wb-soft: #eef1ff;
    --ink: #28304a; --ink-soft: #6b7390; --card: #ffffff; --line: #e2e6f5;
  }
  * { margin: 0; padding: 0; box-sizing: border-box; }
  body { font-family: "Microsoft YaHei","PingFang SC",system-ui,sans-serif; color: var(--ink);
    background-color: #f6f8ff; background-image: radial-gradient(rgba(79,107,255,.10) 1.2px, transparent 1.2px);
    background-size: 22px 22px; min-height: 100vh; }
  .hero { position: relative; overflow: hidden; padding: 62px 24px 46px; text-align: center;
    background: radial-gradient(1200px 500px at 85% -10%, rgba(120,140,255,.45), transparent 60%),
      radial-gradient(900px 420px at -10% 110%, rgba(110,200,220,.30), transparent 55%),
      linear-gradient(135deg, #f3f6ff 0%, #e9edff 45%, #e1e7ff 100%); }
  .hero-tag { display: inline-flex; align-items: center; gap: 8px; background: #fff; border: 2px solid #c9d2ff;
    border-radius: 999px; padding: 7px 16px; font-size: 13.5px; font-weight: 700; color: var(--wb-deep);
    box-shadow: 0 4px 12px rgba(79,107,255,.14); }
  .hero-tag i { width: 8px; height: 8px; border-radius: 50%; background: var(--wb); box-shadow: 0 0 0 4px rgba(79,107,255,.15); }
  .hero h1 { margin: 18px 0 10px; font-size: clamp(30px,4.5vw,48px); font-weight: 800; letter-spacing: 1px; }
  .hero h1 .hl { background: linear-gradient(120deg, var(--wb), #7a5cff); -webkit-background-clip: text; background-clip: text; color: transparent; }
  .hero p { color: var(--ink-soft); font-size: 15px; }
  .hero-stats { display: flex; justify-content: center; gap: 14px; flex-wrap: wrap; margin-top: 24px; }
  .stat { background: #fff; border: 2px solid #d6ddff; border-radius: 16px; padding: 12px 22px; min-width: 110px;
    box-shadow: 0 6px 16px rgba(79,107,255,.08); transition: transform .25s ease, box-shadow .25s ease; }
  .stat:hover { transform: translateY(-4px) rotate(-1deg); box-shadow: 0 12px 22px rgba(79,107,255,.16); }
  .stat b { display: block; font-size: 24px; color: var(--wb); }
  .stat span { font-size: 12.5px; color: var(--ink-soft); }
  .wrap { max-width: 1000px; margin: 0 auto; padding: 44px 20px 30px; }
  .sec-title { text-align: center; margin-bottom: 26px; }
  .sec-title h2 { font-size: 24px; font-weight: 800; }
  .sec-title p { color: var(--ink-soft); font-size: 13.5px; margin-top: 6px; }
  .grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 20px; }
  @media (max-width: 860px) { .grid { grid-template-columns: repeat(2, 1fr); } }
  @media (max-width: 560px) { .grid { grid-template-columns: 1fr; } }
  .card { position: relative; overflow: hidden; cursor: pointer; background: var(--card); border: 2px solid var(--line);
    border-radius: 22px; padding: 24px 22px 20px; box-shadow: 0 8px 20px rgba(40,60,120,.06);
    transition: transform .28s cubic-bezier(.34,1.56,.64,1), box-shadow .28s ease, border-color .28s ease; display: flex; flex-direction: column; }
  .card:hover { transform: translateY(-6px); border-color: var(--wb); box-shadow: 0 18px 34px rgba(40,60,120,.14); }
  .card::before { content: ""; position: absolute; inset: 0 0 auto 0; height: 6px; background: var(--wb); }
  .card .logo { width: 56px; height: 56px; border-radius: 16px; display: flex; align-items: center; justify-content: center;
    font-size: 28px; margin-bottom: 12px; background: var(--wb-soft); border: 2px solid var(--wb); }
  .card h3 { font-size: 18px; font-weight: 800; margin-bottom: 3px; }
  .card .sub { font-size: 11.5px; color: var(--wb-deep); font-weight: 700; margin-bottom: 10px; letter-spacing: .3px; }
  .card p { font-size: 13px; line-height: 1.75; color: var(--ink-soft); flex: 1; }
  .card .chips { display: flex; flex-wrap: wrap; gap: 6px; margin: 12px 0 6px; }
  .chip { font-size: 11.5px; font-weight: 600; padding: 3px 10px; border-radius: 999px; background: var(--wb-soft); color: var(--wb-deep); }
  .card .more { margin-top: 8px; font-size: 12.5px; font-weight: 700; color: var(--wb); }
  footer { max-width: 1000px; margin: 0 auto; padding: 10px 20px 50px; }
  .note { background: #fff; border: 2px dashed rgba(79,107,255,.45); border-radius: 16px; padding: 16px 20px;
    font-size: 12.5px; line-height: 2; color: var(--ink-soft); }
  .note b { color: var(--wb-deep); }
  .note code { background: var(--wb-soft); padding: 1px 6px; border-radius: 6px; color: var(--wb-deep); font-size: 12px; }
  .mask { position: fixed; inset: 0; background: rgba(20,28,60,.55); display: none; align-items: center; justify-content: center;
    padding: 20px; z-index: 50; }
  .mask.show { display: flex; animation: fade .2s ease; }
  @keyframes fade { from { opacity: 0; } to { opacity: 1; } }
  .modal { background: #fff; border-radius: 22px; max-width: 620px; width: 100%; max-height: 88vh; overflow-y: auto;
    box-shadow: 0 24px 60px rgba(20,28,60,.30); }
  .modal-head { padding: 24px 26px 18px; background: linear-gradient(135deg, var(--wb), #7a5cff); color: #fff; position: relative; }
  .modal-head .ic { font-size: 32px; }
  .modal-head h3 { font-size: 21px; font-weight: 800; margin-top: 6px; }
  .modal-head .sub { font-size: 12px; opacity: .85; font-weight: 700; letter-spacing: .4px; }
  .modal-head .x { position: absolute; top: 16px; right: 18px; width: 34px; height: 34px; border-radius: 50%; border: none;
    background: rgba(255,255,255,.22); color: #fff; font-size: 18px; cursor: pointer; }
  .modal-head .x:hover { background: rgba(255,255,255,.34); }
  .modal-body { padding: 18px 26px 26px; }
  .modal-body .lead { font-size: 14px; color: var(--ink); line-height: 1.8; margin-bottom: 12px; }
  .chips-row { display: flex; flex-wrap: wrap; gap: 6px; margin-bottom: 14px; }
  .grp { margin-bottom: 16px; }
  .grp h4 { font-size: 13.5px; font-weight: 800; color: var(--wb-deep); margin-bottom: 8px;
    border-left: 4px solid var(--wb); padding-left: 8px; }
  .filelist { list-style: none; }
  .filelist li { display: flex; align-items: center; gap: 8px; padding: 5px 0; font-size: 13px; color: var(--ink-soft);
    border-bottom: 1px dashed var(--line); }
  .filelist li:last-child { border-bottom: none; }
  .filelist a { color: var(--ink); text-decoration: none; flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; }
  .filelist a:hover { color: var(--wb); text-decoration: underline; }
  .tag { font-size: 10.5px; font-weight: 700; padding: 2px 7px; border-radius: 6px; background: var(--wb-soft); color: var(--wb-deep); flex: none; }
</style>
</head>
<body>
<header class="hero">
  <div class="hero-tag"><i></i>机器人编程 · 内容体系</div>
  <h1>我的<span class="hl">课程资料</span>体系</h1>
  <p>机器人编程教学 · 全部课件与素材，从这里按模块浏览</p>
  <div class="hero-stats">
    <div class="stat"><b>__NMOD__</b><span>内容模块</span></div>
    <div class="stat"><b>__NTOTAL__</b><span>资料总数</span></div>
    <div class="stat"><b>__NPPT__</b><span>PPT 课件</span></div>
    <div class="stat"><b>__NOTHER__</b><span>其他素材</span></div>
  </div>
</header>
<main class="wrap">
  <div class="sec-title">
    <h2>三大内容模块</h2>
    <p>点任意卡片看该模块下的真实文件清单（课件可经本机相对路径直接打开）</p>
  </div>
  <div class="grid" id="grid"></div>
</main>
<footer>
  <div class="note">
    <b>关于本页</b>：这是仿 <b>Scratch 课程体系预览页</b> 思路做的自包含单文件网页（无外链、可双击离线打开），
    内容由脚本扫描 <code>项目一/机器人编程/</code> 三大子目录的真实文件生成（__DATE__ 构建），非手工编造。
    本页挂在 <b>教学总站</b> 下，由本机 AI 助手 <b>WorkBuddy</b> 构建维护，其交互区驻地见 <code>交互区域/WorkBuddy/</code>。
    课件链接在本机装有项目文件时可直接打开；在线版仅能预览目录结构。
  </div>
</footer>
<div class="mask" id="mask"><div class="modal" id="modal">
  <div class="modal-head"><button class="x" id="closeBtn">✕</button>
    <div class="ic" id="mIc"></div><h3 id="mTitle"></h3><div class="sub" id="mSub"></div></div>
  <div class="modal-body"><p class="lead" id="mLead"></p><div class="chips-row" id="mChips"></div><div id="mGroups"></div></div>
</div></div>
<script id="rbData" type="application/json">__DATA__</script>
<script>
  const cats = JSON.parse(document.getElementById('rbData').textContent);
  const grid = document.getElementById('grid');
  cats.forEach(c => {
    const card = document.createElement('div'); card.className = 'card';
    card.innerHTML = '<div class="logo">'+c.icon+'</div><h3>'+c.name+'</h3><div class="sub">'+c.sub+'</div>'
      + '<p>'+c.desc+'</p><div class="chips">'
      + c.chips.map(x => '<span class="chip">'+x.label+' '+x.n+'</span>').join('')
      + '</div><div class="more">▶ 查看 '+c.total+' 份资料清单</div>';
    card.addEventListener('click', () => openModal(c));
    grid.appendChild(card);
  });
  const mask = document.getElementById('mask');
  function openModal(c){
    document.getElementById('mIc').textContent = c.icon;
    document.getElementById('mTitle').textContent = c.name;
    document.getElementById('mSub').textContent = c.sub + ' · 共 ' + c.total + ' 份';
    document.getElementById('mLead').textContent = c.desc;
    document.getElementById('mChips').innerHTML = c.chips.map(x => '<span class="chip">'+x.label+' '+x.n+'</span>').join('');
    let h = '';
    c.groups.forEach(g => {
      h += '<div class="grp"><h4>'+g.name+'（'+g.items.length+'）</h4><ul class="filelist">';
      g.items.forEach(it => {
        h += '<li><a href="'+it.href+'" target="_blank" title="本机打开">'+it.name+'</a>'
           + '<span class="tag">'+it.ext.toUpperCase()+'</span></li>';
      });
      h += '</ul></div>';
    });
    document.getElementById('mGroups').innerHTML = h;
    mask.classList.add('show');
  }
  function closeModal(){ mask.classList.remove('show'); }
  document.getElementById('closeBtn').addEventListener('click', closeModal);
  mask.addEventListener('click', e => { if (e.target === mask) closeModal(); });
  document.addEventListener('keydown', e => { if (e.key === 'Escape') closeModal(); });
</script>
</body>
</html>"""

HTML = (HTML.replace("__NMOD__", str(len(cats_data)))
             .replace("__NTOTAL__", str(all_total))
             .replace("__NPPT__", str(all_ppt))
             .replace("__NOTHER__", str(all_other))
             .replace("__DATE__", DATE)
             .replace("__DATA__", DATA_JSON))

os.makedirs(OUT_DIR, exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(HTML)
print("OK ->", OUT)
print("模块数:", len(cats_data), "| 总资料:", all_total, "| PPT:", all_ppt, "| 其他:", all_other)
for c in cats_data:
    print(" -", c["name"], "=", c["total"], "份,", len(c["groups"]), "组")
