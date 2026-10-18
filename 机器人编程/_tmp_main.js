
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
