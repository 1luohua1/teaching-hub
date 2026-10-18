# -*- coding: utf-8 -*-
"""
机器人编程 内容体系页构建脚本（v2：三级分类 + 大布局）
扫描 机器人编程 项目三大子目录的真实文件，生成自包含单文件 HTML。

数据模型（三级）：
  系列(MOD) -> 一级子模块(GROUP) -> 二级分组(SUB) -> 文件(ITEM)
首页按系列分区，把每个系列的一级子模块铺成卡片网格（一眼可见分类）；
点子模块卡 -> 弹窗内按二级目录分组列出真实文件（带 rbopen: 打开按钮）。

核心交互：文件链接走自定义协议 rbopen:<绝对路径>，由系统默认关联程序打开
（PPT->PowerPoint / PDF->阅读器 / 图片->查看器 / 视频->播放器），不下载。
协议与启动器见同目录 register_rbopen.ps1 / launch_file.ps1 。

产物：教学总站/机器人编程/index.html
"""
import os, re, json, urllib.parse, datetime

SRC = r"D:\小项目\合作实验区\项目一\机器人编程"
OUT_DIR = r"D:\小项目\合作实验区\项目一\教学总站\机器人编程"
OUT = os.path.join(OUT_DIR, "index.html")

CATS = [
    {"key": "base", "name": "机器人编程（基础体系）", "sub": "Robotics · 分阶课程",
     "icon": "\U0001F916", "dir": "机器人编程",
     "ac": "#4f6bff", "acSoft": "#eef1ff", "acDeep": "#2f3db0",
     "desc": "按学习阶段拆分：一阶入门、二阶进阶，以及对应的一阶 / 二阶作业。点开任意子模块看真实课件清单，一键用本机 PowerPoint 打开。"},
    {"key": "new", "name": "机器人编程（新）+ 智能编程（新）", "sub": "Robotics New · Smart Coding",
     "icon": "\U0001F9EC", "dir": "机器人编程（新）+智能编程(新)",
     "ac": "#16a085", "acSoft": "#e6f7f3", "acDeep": "#0e7c63",
     "desc": "新版机器人编程与智能编程融合课件，全部为 PPTX。智能编程、机器人编程一阶 / 二阶分模块归类。"},
    {"key": "wedo", "name": "WeDo 编程", "sub": "WeDo 2.0",
     "icon": "\U0001F527", "dir": "wedo编程",
     "ac": "#f5a623", "acSoft": "#fff4e0", "acDeep": "#b9791a",
     "desc": "WeDo 2.0 完整体系：标准课件、暑假主题课（8 节）、拓展主题课、课后反馈，含课件 / 教案 / 素材图 / 视频 / 工程文件。"},
]

TYPE_CN = {
    "ppt": "PPT", "pptx": "PPTX", "pdf": "PDF", "txt": "文本",
    "jpg": "图片", "jpeg": "图片", "png": "图片", "gif": "动图", "mp4": "视频",
    "docx": "Word", "doc": "Word", "xlsx": "表格", "xls": "表格",
    "url": "链接", "sb3": "Scratch", "io": "工程", "": "其他",
}

def natural_key(text):
    # 自然排序：把文件名里的数字段按数值比较，避免 "1,10,11,2" 乱序
    return [int(t) if t.isdigit() else t.lower() for t in re.split(r'(\d+)', text)]

def scan(catdir):
    files = []
    for root, _, fs in os.walk(catdir):
        for f in fs:
            full = os.path.join(root, f)
            rel = os.path.relpath(full, catdir)
            parts = rel.split(os.sep)
            top = parts[0] if len(parts) > 1 else "（根目录）"
            sub = parts[1] if len(parts) > 2 else None   # 二级目录名
            ext = f.rsplit(".", 1)[-1].lower() if "." in f else ""
            files.append({"name": f, "top": top, "sub": sub, "ext": ext, "full": full})
    return files

def open_uri(full):
    p = full.replace("\\", "/")
    return "rbopen:" + urllib.parse.quote(p, safe="")

def ext_chips(files):
    cnt = {}
    for it in files:
        cnt[it["ext"]] = cnt.get(it["ext"], 0) + 1
    return [{"label": TYPE_CN.get(e, e.upper()), "n": cnt[e]}
            for e in sorted(cnt, key=lambda e: -cnt[e])]

cats_data = []
all_total = 0
all_ppt = 0
all_other = 0
for c in CATS:
    catdir = os.path.join(SRC, c["dir"])
    files = scan(catdir)
    # 一级子模块聚合
    top_map = {}
    for it in files:
        top_map.setdefault(it["top"], []).append(it)
    OTHER_KW = ("作业", "反馈", "说明", "总览")
    groups = []
    for gname in sorted(top_map.keys(), key=lambda x: (x == "（根目录）", natural_key(x))):
        disp = "总览与说明" if gname == "（根目录）" else gname
        gfiles = top_map[gname]
        if not gfiles:
            continue  # 跳过空模块（如二阶作业 0 份）
        items = [{"name": it["name"], "ext": it["ext"], "sub": it["sub"], "open": open_uri(it["full"])}
                 for it in sorted(gfiles, key=lambda x: natural_key(x["name"]))]
        # 课程核心 vs 其他资料：作业/反馈/说明/总览，或文件数<=2 的少数派，归入「其他」收起
        kind = "other" if (any(k in disp for k in OTHER_KW) or len(gfiles) <= 2) else "course"
        groups.append({"name": disp, "total": len(gfiles), "kind": kind,
                       "chips": ext_chips(gfiles), "items": items})
    total = len(files)
    ppt_n = sum(1 for it in files if it["ext"] in ("ppt", "pptx"))
    all_total += total
    all_ppt += ppt_n
    all_other += total - ppt_n
    cats_data.append({
        "key": c["key"], "name": c["name"], "sub": c["sub"], "icon": c["icon"],
        "ac": c["ac"], "acSoft": c["acSoft"], "acDeep": c["acDeep"],
        "desc": c["desc"], "total": total, "chips": ext_chips(files), "groups": groups,
    })

DATE = datetime.date.today().strftime("%Y-%m-%d")
DATA_JSON = json.dumps(cats_data, ensure_ascii=False)

HTML = r"""<!DOCTYPE html>
<html lang="zh-CN">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>机器人编程 · 内容体系</title>
<style>
  :root{
    --wb:#4f6bff; --wb-deep:#2f3db0; --wb-soft:#eef1ff;
    --cream:#f5f7fe; --card:#ffffff; --ink:#222a44; --ink-soft:#717aa0;
    --line:#e7ebf7; --shadow-sm:0 8px 22px rgba(60,80,140,.07);
    --shadow-md:0 20px 48px rgba(60,80,140,.16);
    --r-lg:28px; --r-md:22px; --r-sm:15px;
  }
  *{box-sizing:border-box;margin:0;padding:0}
  html{scroll-behavior:smooth}
  body{font-family:"PingFang SC","Microsoft YaHei","Hiragino Sans GB",sans-serif;
    color:var(--ink);background:var(--cream);line-height:1.62;-webkit-font-smoothing:antialiased}
  .wrap{max-width:1280px;margin:0 auto;padding:0 28px}

  /* ===== Hero ===== */
  .hero{position:relative;overflow:hidden;padding:74px 0 80px;text-align:center;
    background:
      radial-gradient(880px 420px at 10% -12%, #e3e9ff 0%, rgba(227,233,255,0) 70%),
      radial-gradient(760px 380px at 90% 4%, #e1f6f0 0%, rgba(225,246,240,0) 68%),
      radial-gradient(760px 420px at 50% 130%, #f3eefe 0%, rgba(243,238,254,0) 70%),
      var(--cream);
    border-bottom-left-radius:52px;border-bottom-right-radius:52px}
  .hero .blob{position:absolute;border-radius:50%;opacity:.5;animation:float 7s ease-in-out infinite}
  .hero .b1{width:104px;height:104px;left:6%;top:18%;background:#bcd0ff}
  .hero .b2{width:64px;height:64px;left:47%;top:8%;background:#bfeede;animation-delay:1.2s}
  .hero .b3{width:84px;height:84px;right:8%;top:58%;background:#d9ccff;animation-delay:2.1s}
  .hero .b4{width:50px;height:50px;left:26%;bottom:10%;background:#ffe2b0;animation-delay:.6s}
  @keyframes float{0%,100%{transform:translateY(0)}50%{transform:translateY(-16px)}}
  .hero-tag{position:relative;z-index:2;display:inline-flex;align-items:center;gap:8px;
    padding:8px 18px;border-radius:999px;background:#fff;border:1px solid var(--line);
    box-shadow:var(--shadow-sm);font-size:14px;color:var(--ink-soft);letter-spacing:.5px}
  .hero-tag i{width:9px;height:9px;border-radius:50%;background:var(--wb);display:inline-block}
  .hero h1{position:relative;z-index:2;margin:20px 0 14px;font-size:clamp(34px,4.6vw,54px);
    line-height:1.24;font-weight:850;letter-spacing:.5px}
  .hero h1 .hl{position:relative;color:var(--wb-deep);white-space:nowrap}
  .hero h1 .hl::after{content:"";position:absolute;left:-3px;right:-3px;bottom:5px;height:14px;
    background:linear-gradient(90deg,#c9d6ff,#bfeede);border-radius:9px;z-index:-1;opacity:.9}
  .hero p.lead{position:relative;z-index:2;max-width:640px;margin:0 auto;font-size:16.5px;color:var(--ink-soft)}
  .hero-stats{position:relative;z-index:2;display:flex;flex-wrap:wrap;gap:18px;justify-content:center;margin-top:34px}
  .stat{background:#fff;border:1px solid var(--line);border-radius:var(--r-sm);
    box-shadow:var(--shadow-sm);padding:14px 26px;min-width:120px;transition:transform .25s,box-shadow .25s}
  .stat:hover{transform:translateY(-5px);box-shadow:var(--shadow-md)}
  .stat b{display:block;font-size:28px;line-height:1.15;color:var(--wb);font-weight:850}
  .stat span{font-size:13px;color:var(--ink-soft)}

  /* ===== Toolbar ===== */
  .toolbar{position:sticky;top:0;z-index:30;background:rgba(245,247,254,.9);
    backdrop-filter:blur(12px);border-bottom:1px solid var(--line);padding:16px 0;margin-top:-1px}
  .toolbar-in{max-width:1280px;margin:0 auto;padding:0 28px;display:flex;align-items:center;gap:18px;flex-wrap:wrap}
  .toolbar h2{font-size:20px;font-weight:850;white-space:nowrap}
  .toolbar .hint{font-size:13px;color:var(--ink-soft);margin-left:auto}
  .search{position:relative;flex:1;min-width:240px;max-width:460px}
  .search input{width:100%;padding:13px 18px 13px 44px;border:1px solid var(--line);border-radius:999px;
    background:#fff;font-size:15px;color:var(--ink);outline:none;transition:border-color .2s,box-shadow .2s}
  .search input:focus{border-color:var(--wb);box-shadow:0 0 0 4px rgba(79,107,255,.14)}
  .search .si{position:absolute;left:16px;top:50%;transform:translateY(-50%);color:var(--ink-soft);font-size:16px}

  /* ===== Series sections ===== */
  .series{margin:54px 0}
  .series-head{display:flex;align-items:center;gap:20px;padding:22px 26px;border-radius:var(--r-lg);
    background:#fff;border:1px solid var(--line);box-shadow:var(--shadow-sm);
    border-left:7px solid var(--ac);margin-bottom:26px;flex-wrap:wrap}
  .series-head .bigic{font-size:36px;width:68px;height:68px;border-radius:20px;flex:none;
    display:flex;align-items:center;justify-content:center;background:var(--acSoft);border:2px solid var(--ac)}
  .series-head .t{display:flex;flex-direction:column;gap:3px;min-width:220px}
  .series-head h2{font-size:24px;font-weight:850;line-height:1.3}
  .series-head .sub{font-size:12.5px;color:var(--acDeep);font-weight:700;letter-spacing:.4px}
  .series-head .meta{display:flex;gap:10px;flex-wrap:wrap;margin-left:auto;align-items:center}
  .mstat{background:var(--acSoft);color:var(--acDeep);border-radius:999px;padding:7px 15px;font-size:13.5px;font-weight:700}
  .mstat b{font-size:17px}

  /* ===== Sub-module card grid ===== */
  .sgrid{display:grid;grid-template-columns:repeat(3,1fr);gap:24px}
  @media(max-width:980px){.sgrid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:600px){.sgrid{grid-template-columns:1fr}}
  .scard{position:relative;overflow:hidden;cursor:pointer;background:var(--card);
    border:2px solid var(--line);border-radius:var(--r-lg);padding:22px 22px 18px;
    box-shadow:var(--shadow-sm);transition:transform .28s cubic-bezier(.34,1.56,.64,1),box-shadow .28s,border-color .28s;
    display:flex;flex-direction:column;min-height:148px}
  .scard:hover{transform:translateY(-7px);border-color:var(--ac);box-shadow:var(--shadow-md)}
  .scard::before{content:"";position:absolute;inset:0 0 auto 0;height:5px;background:var(--ac)}
  .scard .gname{font-size:19px;font-weight:850;line-height:1.4;margin-bottom:6px;padding-right:80px}
  .scard .gnum{position:absolute;top:20px;right:22px;font-size:13px;font-weight:800;color:var(--acDeep);
    background:var(--acSoft);border-radius:999px;padding:4px 12px}
  .scard .chips{display:flex;flex-wrap:wrap;gap:6px;margin-top:auto;padding-top:10px}
  .chip{font-size:12px;font-weight:700;padding:3px 11px;border-radius:999px;background:var(--acSoft);color:var(--acDeep)}
  .scard .open{margin-top:12px;display:inline-flex;align-items:center;gap:6px;font-size:13px;font-weight:800;color:var(--acDeep)}

  /* ===== 收起的其他资料 ===== */
  .collwrap{margin-top:24px;border-top:1px dashed var(--line);padding-top:18px}
  .collbtn{display:inline-flex;align-items:center;gap:9px;cursor:pointer;border:1.5px solid var(--line);
    background:#fafbff;color:var(--ink-soft);font-weight:800;font-size:14px;padding:9px 18px;border-radius:999px;
    transition:border-color .2s,color .2s,background .2s}
  .collbtn:hover{border-color:var(--ac);color:var(--acDeep);background:#fff}
  .collbtn .ar{transition:transform .25s;display:inline-block;font-size:11px}
  .collbtn.open .ar{transform:rotate(180deg)}
  .collgrid{margin-top:18px}
  @media(max-width:980px){.collgrid{grid-template-columns:repeat(2,1fr)}}
  @media(max-width:600px){.collgrid{grid-template-columns:1fr}}

  /* ===== Search results ===== */
  #results{display:none;padding:8px 0 40px}
  .res-head{font-size:15px;color:var(--ink-soft);margin:10px 0 16px;font-weight:800}
  .res-head b{color:var(--wb-deep)}
  ul.filelist{list-style:none}
  ul.filelist li{display:flex;align-items:center;gap:11px;padding:10px 14px;font-size:14px;
    background:#fff;border:1px solid var(--line);border-radius:var(--r-sm);margin-bottom:9px;
    box-shadow:var(--shadow-sm);transition:border-color .18s,transform .18s}
  ul.filelist li:hover{border-color:var(--wb);transform:translateX(3px)}
  .tag{font-size:11px;font-weight:800;padding:3px 9px;border-radius:8px;flex:none;border:1.5px solid;background:#fff}
  .modpill{font-size:11.5px;font-weight:700;padding:3px 11px;border-radius:999px;background:var(--wb-soft);
    color:var(--wb-deep);flex:none;max-width:260px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .gp{font-size:11.5px;font-weight:800;padding:3px 11px;border-radius:999px;background:#eef1f8;
    color:#566089;flex:none;max-width:200px;overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .fname{flex:1;color:var(--ink);overflow:hidden;text-overflow:ellipsis;white-space:nowrap}
  .open-btn{display:inline-flex;align-items:center;gap:5px;flex:none;padding:7px 15px;border-radius:999px;
    background:linear-gradient(135deg,var(--wb),#7a5cff);color:#fff;font-size:13px;font-weight:800;
    text-decoration:none;box-shadow:0 6px 14px rgba(79,107,255,.28);transition:transform .18s,box-shadow .18s}
  .open-btn:hover{transform:translateY(-2px);box-shadow:0 10px 20px rgba(79,107,255,.36)}

  /* ===== Modal ===== */
  .mask{position:fixed;inset:0;background:rgba(20,28,60,.55);display:none;align-items:center;
    justify-content:center;padding:22px;z-index:50}
  .mask.show{display:flex;animation:fade .2s ease}
  @keyframes fade{from{opacity:0}to{opacity:1}}
  .modal{background:#fff;border-radius:var(--r-lg);max-width:720px;width:100%;max-height:90vh;overflow-y:auto;
    box-shadow:0 24px 60px rgba(20,28,60,.3)}
  .modal-head{padding:26px 30px 20px;color:#fff;position:relative}
  .modal-head .ic{font-size:34px}
  .modal-head h3{font-size:22px;font-weight:850;margin-top:6px;line-height:1.4}
  .modal-head .sub{font-size:12.5px;opacity:.92;font-weight:700;letter-spacing:.4px;margin-top:4px}
  .modal-head .x{position:absolute;top:18px;right:20px;width:36px;height:36px;border-radius:50%;border:none;
    background:rgba(255,255,255,.22);color:#fff;font-size:18px;cursor:pointer}
  .modal-head .x:hover{background:rgba(255,255,255,.36)}
  .modal-body{padding:20px 30px 30px}
  .modal-body .lead{font-size:14.5px;color:var(--ink);line-height:1.8;margin-bottom:14px}
  .mfilter{width:100%;padding:11px 15px;border:1px solid var(--line);border-radius:var(--r-sm);
    font-size:14px;outline:none;margin:6px 0 16px;transition:border-color .2s,box-shadow .2s}
  .mfilter:focus{border-color:var(--wb);box-shadow:0 0 0 4px rgba(79,107,255,.14)}
  .grp{margin-bottom:18px}
  .grp h4{font-size:14px;font-weight:850;color:var(--wb-deep);margin-bottom:9px;
    border-left:4px solid var(--wb);padding-left:9px}
  .empty{color:var(--ink-soft);font-size:14px;padding:16px 0;text-align:center}

  footer{max-width:1280px;margin:0 auto;padding:18px 28px 60px}
  .note{background:#fff;border:2px dashed rgba(79,107,255,.4);border-radius:var(--r-md);padding:18px 24px;
    font-size:13px;line-height:2;color:var(--ink-soft)}
  .note b{color:var(--wb-deep)}
  .note code{background:var(--wb-soft);padding:1px 7px;border-radius:6px;color:var(--wb-deep);font-size:12.5px}

  /* ===== Toast ===== */
  .toast{position:fixed;left:50%;bottom:28px;z-index:90;max-width:min(580px,88vw);padding:12px 18px;
    border-radius:13px;background:#2f3542;color:#fff;font-size:13.5px;line-height:1.7;
    box-shadow:0 12px 30px rgba(20,26,40,.3);opacity:0;transform:translate(-50%,12px);pointer-events:none;
    transition:opacity .25s,transform .25s}
  .toast.show{opacity:1;transform:translate(-50%,0)}
</style>
</head>
<body>
<header class="hero">
  <span class="blob b1"></span><span class="blob b2"></span><span class="blob b3"></span><span class="blob b4"></span>
  <div class="hero-tag"><i></i>机器人编程 · 内容体系</div>
  <h1>我的<span class="hl">课程资料</span>体系</h1>
  <p class="lead">机器人编程教学 · 全部课件与素材，按系列与子模块分层浏览，点击即用本机对应软件打开（非下载）。</p>
  <div class="hero-stats">
    <div class="stat"><b>__NMOD__</b><span>内容系列</span></div>
    <div class="stat"><b>__NGRP__</b><span>子模块</span></div>
    <div class="stat"><b>__NTOTAL__</b><span>资料总数</span></div>
    <div class="stat"><b>__NPPT__</b><span>PPT 课件</span></div>
    <div class="stat"><b>__NOTHER__</b><span>其他素材</span></div>
  </div>
</header>

<div class="toolbar">
  <div class="toolbar-in">
    <h2>内容目录</h2>
    <div class="search"><span class="si">&#128269;</span>
      <input id="search" placeholder="搜文件名，跨全部系列与子模块…" autocomplete="off"></div>
    <span class="hint">点子模块卡看清单 · 点「打开 ▸」用本机工具打开</span>
  </div>
</div>

<main class="wrap" id="app"></main>

<footer>
  <div class="note">
    <b>关于本页</b>：仿 <b>Scratch 课程体系预览页</b> 思路做的自包含单文件网页（无外链、可双击离线打开），
    内容由脚本扫描 <code>项目一/机器人编程/</code> 三大系列的真实文件生成（__DATE__ 构建），非手工编造。
    本页挂在 <b>教学总站</b> 下，由本机 AI 助手 <b>WorkBuddy</b> 构建维护，其交互区驻地见 <code>交互区域/WorkBuddy/</code>。<br>
    <b>打开方式</b>：文件链接走自定义协议 <code>rbopen:</code>（由同目录 <code>register_rbopen.ps1</code> 注册、<code>launch_file.ps1</code> 启动），
    点击即用系统默认程序打开——PPT→PowerPoint、PDF→阅读器、图片→查看器、视频→播放器，<b>不会下载</b>。
    <b>本地版</b>直接可用；<b>在线版</b>未注册协议，仅能预览目录结构。
  </div>
</footer>

<div class="mask" id="mask"><div class="modal" id="modal">
  <div class="modal-head" id="mHead">
    <button class="x" id="closeBtn">&#10005;</button>
    <div class="ic" id="mIc"></div><h3 id="mTitle"></h3><div class="sub" id="mSub"></div>
  </div>
  <div class="modal-body">
    <p class="lead" id="mLead"></p>
    <input class="mfilter" id="mFilter" placeholder="筛选本子模块文件…" autocomplete="off">
    <div id="mGroups"></div>
  </div>
</div></div>

<div class="toast" id="toast"></div>

<script id="rbData" type="application/json">__DATA__</script>
<script>
  const MODS = JSON.parse(document.getElementById('rbData').textContent);
  const EXT_COLOR = {ppt:'#d9533b',pptx:'#d9533b',pdf:'#c0392b',docx:'#2b579a',doc:'#2b579a',
    xlsx:'#217346',xls:'#217346',jpg:'#e67e22',jpeg:'#e67e22',png:'#e67e22',gif:'#e67e22',
    mp4:'#8e44ad',txt:'#6b7390',url:'#4f6bff',sb3:'#f5a623',io:'#16a085','':'#6b7390'};
  const app = document.getElementById('app');
  const search = document.getElementById('search');
  const mask = document.getElementById('mask');

  function esc(s){return String(s).replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

  // 自然排序：数字段按数值比较（"2" 排在 "10" 前），中文回退 localeCompare
  function naturalCompare(a,b){
    const pa=a.split(/(\d+)/), pb=b.split(/(\d+)/);
    const n=Math.min(pa.length,pb.length);
    for(let i=0;i<n;i++){
      const xa=pa[i], xb=pb[i];
      const da=/\d+/.test(xa), db=/\d+/.test(xb);
      if(da&&db){const d=parseInt(xa,10)-parseInt(xb,10); if(d)return d;}
      else if(da!==db){return da?-1:1;}
      else{const c=xa.localeCompare(xb,'zh'); if(c)return c;}
    }
    return pa.length-pb.length;
  }

  let toastTimer;
  function toast(msg){const t=document.getElementById('toast');t.textContent=msg;t.classList.add('show');
    clearTimeout(toastTimer);toastTimer=setTimeout(()=>t.classList.remove('show'),2600);}

  // ---- render home: series sections + sub-module cards ----
  function makeCard(m,g){
    const card=document.createElement('div');card.className='scard';
    card.style.setProperty('--ac',m.ac);card.style.setProperty('--acSoft',m.acSoft);card.style.setProperty('--acDeep',m.acDeep);
    const chips=g.chips.slice(0,4).map(x=>'<span class="chip">'+esc(x.label)+' '+x.n+'</span>').join('');
    card.innerHTML='<div class="gnum">'+g.total+' 份</div>'
      +'<div class="gname">'+esc(g.name)+'</div>'
      +'<div class="chips">'+chips+'</div>'
      +'<div class="open">&#9654; 打开清单 &#9656;</div>';
    card.addEventListener('click',()=>openModal(m,g));
    return card;
  }
  MODS.forEach(m=>{
    const sec=document.createElement('section');sec.className='series';
    sec.style.setProperty('--ac',m.ac);sec.style.setProperty('--acSoft',m.acSoft);sec.style.setProperty('--acDeep',m.acDeep);
    const metaChips=m.chips.slice(0,4).map(x=>'<span class="mstat"><b>'+x.n+'</b> '+esc(x.label)+'</span>').join('');
    sec.innerHTML='<div class="series-head"><div class="bigic">'+m.icon+'</div>'
      +'<div class="t"><h2>'+esc(m.name)+'</h2><div class="sub">'+esc(m.sub)+'</div></div>'
      +'<div class="meta"><span class="mstat"><b>'+m.total+'</b> 份资料</span>'+metaChips+'</div></div>';
    app.appendChild(sec);
    const course=m.groups.filter(g=>g.kind!=='other');
    const other=m.groups.filter(g=>g.kind==='other');
    if(course.length){
      const grid=document.createElement('div');grid.className='sgrid';
      course.forEach(g=>grid.appendChild(makeCard(m,g)));
      sec.appendChild(grid);
    }
    if(other.length){
      const nOther=other.reduce((s,g)=>s+g.total,0);
      const wrap=document.createElement('div');wrap.className='collwrap';
      const btn=document.createElement('button');btn.className='collbtn';
      btn.innerHTML='其他资料（'+other.length+' 个 · '+nOther+' 份） <span class="ar">▾</span>';
      const cgrid=document.createElement('div');cgrid.className='sgrid collgrid';cgrid.style.display='none';
      other.forEach(g=>cgrid.appendChild(makeCard(m,g)));
      btn.addEventListener('click',()=>{
        const open=cgrid.style.display==='none';
        cgrid.style.display=open?'':'none';
        btn.classList.toggle('open',open);
      });
      wrap.appendChild(btn);wrap.appendChild(cgrid);sec.appendChild(wrap);
    }
  });

  function fileRow(it){
    const col=EXT_COLOR[it.ext]||'#6b7390';
    return '<li><span class="tag" style="color:'+col+';border-color:'+col+'">'+it.ext.toUpperCase()+'</span>'
      +'<span class="fname" title="'+esc(it.name)+'">'+esc(it.name)+'</span>'
      +'<a class="open-btn" data-name="'+esc(it.name)+'" href="'+it.open+'">打开 &#9656;</a></li>';
  }
  // render group items, grouped by SUB (二级目录)
  function renderSubs(g,q){
    q=(q||'').trim().toLowerCase();
    const map={};
    g.items.forEach(it=>{
      const k=it.sub||'（本目录）';(map[k]=map[k]||[]).push(it);
    });
    const keys=Object.keys(map).sort((a,b)=> (a==='（本目录）') - (b==='（本目录）') || naturalCompare(a,b));
    let h='';
    keys.forEach(k=>{
      let items=map[k];
      if(q)items=items.filter(it=>it.name.toLowerCase().includes(q));
      if(!items.length)return;
      h+='<div class="grp"><h4>'+esc(k==='（本目录）'?g.name:k)+'（'+items.length+'）</h4><ul class="filelist">';
      items.forEach(it=>h+=fileRow(it));
      h+='</ul></div>';
    });
    if(!h)h='<p class="empty">没有匹配的文件</p>';
    return h;
  }
  function openModal(m,g){
    mask._cur={m,g};
    document.getElementById('mIc').textContent=m.icon;
    document.getElementById('mTitle').textContent=m.name+' / '+g.name;
    document.getElementById('mSub').textContent='共 '+g.total+' 份 · '+g.chips.map(x=>x.label+' '+x.n).join(' · ');
    document.getElementById('mLead').textContent=m.desc;
    document.getElementById('mHead').style.background='linear-gradient(135deg,'+m.ac+','+m.acDeep+')';
    document.getElementById('mGroups').innerHTML=renderSubs(g,'');
    document.getElementById('mFilter').value='';
    mask.classList.add('show');
  }
  function closeModal(){mask.classList.remove('show');}
  document.getElementById('closeBtn').addEventListener('click',closeModal);
  mask.addEventListener('click',e=>{if(e.target===mask)closeModal();});
  document.addEventListener('keydown',e=>{if(e.key==='Escape')closeModal();});
  document.getElementById('mFilter').addEventListener('input',function(){
    const c=mask._cur; if(c)document.getElementById('mGroups').innerHTML=renderSubs(c.g,this.value);
  });

  // ---- global search ----
  const results=document.createElement('div');results.id='results';app.after(results);
  search.addEventListener('input',function(){
    const raw=this.value.trim(); const q=raw.toLowerCase();
    if(!q){results.style.display='none';results.innerHTML='';document.querySelectorAll('.series').forEach(s=>s.style.display='');return;}
    document.querySelectorAll('.series').forEach(s=>s.style.display='none');
    const matches=[];
    MODS.forEach(m=>m.groups.forEach(g=>g.items.forEach(it=>{
      if(it.name.toLowerCase().includes(q))matches.push({it,mod:m.name,grp:g.name});
    })));
    let h='<div class="res-head">搜索 “'+esc(raw)+'” 找到 <b>'+matches.length+'</b> 个文件</div><ul class="filelist">';
    matches.forEach(({it,mod,grp})=>{
      const col=EXT_COLOR[it.ext]||'#6b7390';
      h+='<li><span class="modpill" title="'+esc(mod)+'">'+esc(mod)+'</span>'
        +'<span class="gp" title="'+esc(grp)+'">'+esc(grp)+'</span>'
        +'<span class="tag" style="color:'+col+';border-color:'+col+'">'+it.ext.toUpperCase()+'</span>'
        +'<span class="fname" title="'+esc(it.name)+'">'+esc(it.name)+'</span>'
        +'<a class="open-btn" data-name="'+esc(it.name)+'" href="'+it.open+'">打开 &#9656;</a></li>';
    });
    h+='</ul>';
    if(!matches.length)h='<div class="res-head">没有匹配 “'+esc(raw)+'” 的文件</div>';
    results.innerHTML=h;results.style.display='';
  });

  // open toast (delegated)
  document.addEventListener('click',e=>{
    const b=e.target.closest('.open-btn');
    if(b)toast('已调用本机工具打开：'+b.dataset.name);
  });
</script>
</body>
</html>"""

ngroups = sum(len(c["groups"]) for c in cats_data)
HTML = (HTML.replace("__NMOD__", str(len(cats_data)))
             .replace("__NGRP__", str(ngroups))
             .replace("__NTOTAL__", str(all_total))
             .replace("__NPPT__", str(all_ppt))
             .replace("__NOTHER__", str(all_other))
             .replace("__DATE__", DATE)
             .replace("__DATA__", DATA_JSON))

os.makedirs(OUT_DIR, exist_ok=True)
with open(OUT, "w", encoding="utf-8") as f:
    f.write(HTML)
print("OK ->", OUT)
print("系列:", len(cats_data), "| 子模块:", ngroups, "| 总资料:", all_total, "| PPT:", all_ppt, "| 其他:", all_other)
for c in cats_data:
    print(" -", c["name"], "=", c["total"], "份,", len(c["groups"]), "子模块:", [g["name"] for g in c["groups"]])
