import React,{useEffect,useMemo,useState} from 'react';import{createRoot}from'react-dom/client';import'./styles.css';

// 文献本体、专题、归属、存档、当前专题分键承载，互不耦合，且不引入新依赖
const PAPERS_KEY='research-library';
const TOPICS_KEY='research-library-topics';
const LINKS_KEY='research-library-memberships';
const ARCHIVE_KEY='research-library-archive';
const CURRENT_KEY='research-library-current-topic';
const MY_LIBRARY='my-library';
const ALL='all';
const STATUSES=['全部','待读','阅读中','已读'];

const seed=[{id:1,title:'The Extended Mind',authors:'Clark, A. & Chalmers, D.',year:1998,venue:'Analysis',tags:['具身认知','经典'],abstract:'本文提出心智延展论：当外部环境稳定地承担认知功能时，心智边界可以超越头脑与身体。',status:'阅读中',cite:'Clark, A. & Chalmers, D. (1998). The Extended Mind. Analysis.'},{id:2,title:'Situated Learning',authors:'Lave, J. & Wenger, E.',year:1991,venue:'Cambridge University Press',tags:['学习科学','社会'],abstract:'学习发生在真实情境的参与过程中，知识与共同体实践不可分割。',status:'待读',cite:'Lave, J. & Wenger, E. (1991). Situated Learning.'},{id:3,title:'Designing with Data',authors:'Miller, S.',year:2022,venue:'MIT Press',tags:['设计研究','方法'],abstract:'一套面向设计师的数据研究方法，讨论如何把定性洞察转化为可行动的设计决策。',status:'已读',cite:'Miller, S. (2022). Designing with Data.'}];

const readPapers=()=>{try{return JSON.parse(localStorage.getItem(PAPERS_KEY))||seed}catch{return seed}};
const parse=(key,fallback)=>{try{const raw=localStorage.getItem(key);return raw===null?fallback:JSON.parse(raw)}catch{return fallback}};

// 首次打开（含旧数据）：所有文献归入“我的文献”，专题列表与当前专题落本机
function bootstrap(){
  const items=readPapers();
  if(localStorage.getItem(TOPICS_KEY)===null){
    const topics=[{id:MY_LIBRARY,name:'我的文献',createdAt:Date.now()}];
    const links={};
    items.forEach(p=>{links[String(p.id)]=[MY_LIBRARY]});
    const archive=[];
    localStorage.setItem(TOPICS_KEY,JSON.stringify(topics));
    localStorage.setItem(LINKS_KEY,JSON.stringify(links));
    localStorage.setItem(ARCHIVE_KEY,JSON.stringify(archive));
    localStorage.setItem(CURRENT_KEY,MY_LIBRARY);
    return {items,topics,links,archive,current:MY_LIBRARY};
  }
  const topics=parse(TOPICS_KEY,[]);
  const links=parse(LINKS_KEY,{});
  const archive=parse(ARCHIVE_KEY,[]);
  let current=localStorage.getItem(CURRENT_KEY);
  if(!current||(current!==ALL&&!topics.some(t=>t.id===current))) current=topics[0]?.id||ALL;
  return {items,topics,links,archive,current};
}

function App(){
  const initial=useMemo(bootstrap,[]);
  const[items,setItems]=useState(initial.items);
  const[topics,setTopics]=useState(initial.topics);
  const[links,setLinks]=useState(initial.links);
  const[archive,setArchive]=useState(initial.archive);
  const[current,setCurrent]=useState(initial.current);
  const[selected,setSelected]=useState(initial.items[0]?.id??null);
  const[query,setQuery]=useState('');
  const[status,setStatus]=useState('全部');
  const[show,setShow]=useState(false);
  const[topicShow,setTopicShow]=useState(false);
  const[archiveShow,setArchiveShow]=useState(false);
  const[topicName,setTopicName]=useState('');
  const[notice,setNotice]=useState('');
  const[form,setForm]=useState({title:'',authors:'',year:'2024',venue:'',abstract:'',tags:''});

  // 五类数据各自持久化
  useEffect(()=>localStorage.setItem(PAPERS_KEY,JSON.stringify(items)),[items]);
  useEffect(()=>localStorage.setItem(TOPICS_KEY,JSON.stringify(topics)),[topics]);
  useEffect(()=>localStorage.setItem(LINKS_KEY,JSON.stringify(links)),[links]);
  useEffect(()=>localStorage.setItem(ARCHIVE_KEY,JSON.stringify(archive)),[archive]);
  useEffect(()=>localStorage.setItem(CURRENT_KEY,current),[current]);
  useEffect(()=>{if(!notice)return;const t=setTimeout(()=>setNotice(''),2200);return()=>clearTimeout(t)},[notice]);

  // 切换专题后，搜索与状态筛选只在该专题范围内生效
  const{scoped,filtered}=useMemo(()=>{
    const scoped=current===ALL?items:items.filter(p=>(links[String(p.id)]||[]).includes(current));
    const q=query.trim().toLowerCase();
    const filtered=scoped.filter(p=>(status==='全部'||p.status===status)&&(!q||`${p.title}${p.authors}${p.abstract}`.toLowerCase().includes(q)));
    return{scoped,filtered};
  },[items,links,current,query,status]);

  useEffect(()=>{
    if(!filtered.some(p=>p.id===selected)) setSelected(filtered[0]?.id??null);
  },[filtered,selected]);

  const cur=items.find(x=>x.id===selected)||null;
  const curTopic=topics.find(t=>t.id===current)||null;
  const shelvesOf=p=>links[String(p.id)]||[];
  const countOf=t=>items.reduce((n,p)=>n+(shelvesOf(p).includes(t.id)?1:0),0);

  const switchTopic=id=>{setCurrent(id);setQuery('');setStatus('全部')};

  const update=(k,v)=>setItems(items.map(x=>x.id===cur.id?{...x,[k]:v}:x));

  // 归属增删：只动归属表，文献本体与其他专题的归属都保留
  const toggleShelf=(paperId,topicId)=>{
    const t=topics.find(x=>x.id===topicId);
    const had=shelvesOf({id:paperId}).includes(topicId);
    setLinks({...links,[String(paperId)]:had
      ?shelvesOf({id:paperId}).filter(x=>x!==topicId)
      :[...shelvesOf({id:paperId}),topicId]});
    if(had) setNotice(`已从「${t.name}」移走，文献及其在其他专题中的归属均保留`);
    else setNotice(`已加入「${t.name}」`);
  };

  const createTopic=()=>{
    const name=topicName.trim();
    if(!name)return;
    const t={id:'shelf-'+Date.now(),name,createdAt:Date.now()};
    setTopics([...topics,t]);
    switchTopic(t.id);
    setTopicName('');setTopicShow(false);
    setNotice(`专题「${name}」已创建`);
  };

  // 关闭=归档：专题移入存档，文献本体与归属关系原样保留，重开即恢复
  const closeTopic=id=>{
    const t=topics.find(x=>x.id===id);
    if(!t)return;
    setTopics(topics.filter(x=>x.id!==id));
    setArchive([...archive,{...t,closedAt:Date.now()}]);
    if(current===id) setCurrent(ALL);
    setNotice(`专题「${t.name}」已归档，其中文献均保留`);
  };

  const reopenTopic=id=>{
    const t=archive.find(x=>x.id===id);
    if(!t)return;
    setArchive(archive.filter(x=>x.id!==id));
    setTopics([...topics,{id:t.id,name:t.name,createdAt:t.createdAt}]);
    switchTopic(id);
    setArchiveShow(false);
    setNotice(`专题「${t.name}」已重新开启`);
  };

  const add=()=>{
    if(!form.title.trim())return;
    const p={...form,id:Date.now(),year:+form.year,tags:form.tags.split(',').map(x=>x.trim()).filter(Boolean),status:'待读',cite:`${form.authors} (${form.year}). ${form.title}. ${form.venue}.`};
    const target=current!==ALL?current:(topics.find(t=>t.id===MY_LIBRARY)?.id||topics[0]?.id||null);
    setItems([...items,p]);
    if(target) setLinks({...links,[String(p.id)]:[target]});
    setSelected(p.id);
    setForm({title:'',authors:'',year:'2024',venue:'',abstract:'',tags:''});
    setShow(false);
    setNotice('文献已加入研究库');
  };

  const bib=()=>{navigator.clipboard?.writeText(cur.cite);setNotice('引用文本已复制')};
  const download=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([items.map(x=>x.cite).join('\n')],{type:'text/plain'}));a.download='references.txt';a.click();setNotice('引用列表已导出')};

  return <div className="app"><aside><div className="logo"><span>∴</span> LITERATURE</div>
    <div className="library-head"><span>我的研究库</span><strong>{items.length}<small> 篇文献</small></strong></div>
    <nav><button className={current===ALL?'active':''} onClick={()=>switchTopic(ALL)}>▤ <span>所有文献</span><b>{items.length}</b></button></nav>
    <div className="shelf-head"><small>专题书架</small><button title="新建专题" onClick={()=>{setTopicName('');setTopicShow(true)}}>＋</button></div>
    <div className="shelves">
      {topics.map(t=><div className={'shelf-row '+(current===t.id?'active':'')} key={t.id} onClick={()=>switchTopic(t.id)}>
        <span className="shelf-ico">✦</span><span className="shelf-name">{t.name}</span><b>{countOf(t)}</b>
        <button className="shelf-close" title="归档专题（不删除文献）" onClick={e=>{e.stopPropagation();closeTopic(t.id)}}>⌫</button>
      </div>)}
      {!topics.length&&<small className="shelf-empty">暂无开启的专题</small>}
    </div>
    <div className="side-foot">
      <button onClick={()=>setArchiveShow(true)}>◳ <span>归档专题</span>{!!archive.length&&<b>{archive.length}</b>}</button>
      <small>专题数据仅保存在本机</small>
    </div>
  </aside>
  <main><header><div><span className="crumb">RESEARCH / {curTopic?curTopic.name:'LIBRARY'}</span><h1>{curTopic?curTopic.name:'所有文献'}</h1></div>
    <div className="actions"><button className="outline" onClick={download}>↓ 导出引用</button><button className="primary" onClick={()=>setShow(true)}>＋ 添加文献</button></div>
  </header>
  <div className="toolbar"><div className="search">⌕<input placeholder={curTopic?`在「${curTopic.name}」中搜索…`:'搜索标题、作者或摘要…'} value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')}>×</button>}</div>
    <div className="tag-filter">{STATUSES.map(s=>{const n=s==='全部'?scoped.length:scoped.filter(p=>p.status===s).length;
      return <button className={status===s?'on':''} onClick={()=>setStatus(s)} key={s}>{s}<small>{n}</small></button>})}</div>
  </div>
  <div className="body"><section className="paper-list">
    {filtered.map(p=><button className={'paper '+(selected===p.id?'selected':'')} onClick={()=>setSelected(p.id)} key={p.id}>
      <div className="paper-year">{p.year}</div>
      <div className="paper-copy"><h3>{p.title}</h3><p>{p.authors}</p>
        <div>{p.tags.map(t=><span key={t}>#{t}</span>)}{shelvesOf(p).length>1&&<em className="in-shelves">✦ {shelvesOf(p).length} 个专题</em>}</div>
      </div>
      <small className={'status '+p.status}>{p.status}</small>
    </button>)}
    {!filtered.length&&<div className="no-result">{scoped.length===0&&curTopic?`「${curTopic.name}」里还没有文献，可在文献详情的“归属专题”中添加`:'没有找到匹配的文献'}</div>}
  </section>
  <section className="detail">
    {cur?<><div className="detail-top"><span className={'status '+cur.status}>{cur.status}</span><button onClick={()=>setNotice('已加入收藏')}>☆ 收藏</button></div>
      <h2>{cur.title}</h2><p className="authors">{cur.authors}</p>
      <div className="cite-actions"><button onClick={bib}>▣ 复制引用</button><button onClick={()=>update('status',cur.status==='已读'?'待读':'已读')}>{cur.status==='已读'?'标记为待读':'标记为已读'}</button></div>
      <div className="detail-section"><h4>摘要 <span>ABSTRACT</span></h4><p>{cur.abstract}</p></div>
      <div className="detail-section"><h4>出版信息 <span>PUBLICATION</span></h4><div className="pub-grid"><div><small>出版物</small><strong>{cur.venue}</strong></div><div><small>年份</small><strong>{cur.year}</strong></div></div></div>
      <div className="detail-section"><h4>归属专题 <span>BOOKSHELVES</span></h4>
        <div className="shelf-pick">{topics.length?topics.map(t=>{const on=shelvesOf(cur).includes(t.id);
          return <button className={'pick '+(on?'on':'')} key={t.id} onClick={()=>toggleShelf(cur.id,t.id)}>{on?'✓ 已归入':'＋ 归入'} {t.name}</button>})
          :<p className="muted">暂无开启的专题，可在左侧新建专题书架。</p>}
          {!shelvesOf(cur).length&&!!topics.length&&<p className="muted hint">该文献目前不属于任何专题，只在“所有文献”中可见。</p>}
        </div>
      </div>
      <div className="detail-section"><h4>引用文本 <span>BIBTEX / TEXT</span></h4><div className="cite-box">{cur.cite}<button onClick={bib}>复制</button></div></div>
      <div className="detail-section"><h4>我的笔记 <span>PRIVATE</span></h4><textarea className="notes" placeholder="记录你的阅读想法…" value={cur.notes||''} onChange={e=>update('notes',e.target.value)}/></div>
    </>:<div className="empty-detail">选择一篇文献查看详情</div>}
  </section></div></main>

  {show&&<div className="modal-bg"><div className="modal"><button className="close" onClick={()=>setShow(false)}>×</button><span className="crumb">NEW REFERENCE</span><h2>添加一篇文献</h2>
    <label>标题<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="论文或书籍标题"/></label>
    <label>作者<input value={form.authors} onChange={e=>setForm({...form,authors:e.target.value})}/></label>
    <div className="two"><label>年份<input type="number" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></label><label>出版物<input value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}/></label></div>
    <label>关键词<input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="用逗号分隔"/></label>
    <label>摘要<textarea rows="3" value={form.abstract} onChange={e=>setForm({...form,abstract:e.target.value})}/></label>
    <button className="primary full" onClick={add}>保存文献</button>
  </div></div>}

  {topicShow&&<div className="modal-bg"><div className="modal"><button className="close" onClick={()=>setTopicShow(false)}>×</button><span className="crumb">NEW SHELF</span><h2>新建专题书架</h2>
    <label>专题名称<input autoFocus value={topicName} onChange={e=>setTopicName(e.target.value)} onKeyDown={e=>e.key==='Enter'&&createTopic()} placeholder="例如：具身认知课题"/></label>
    <button className="primary full" onClick={createTopic}>创建并进入</button>
  </div></div>}

  {archiveShow&&<div className="modal-bg"><div className="modal"><button className="close" onClick={()=>setArchiveShow(false)}>×</button><span className="crumb">ARCHIVE</span><h2>已归档专题</h2>
    <div className="arch-list">{archive.map(t=><div className="arch-row" key={t.id}>
      <div><strong>{t.name}</strong><small>{countOf(t)} 篇文献 · 归档于 {new Date(t.closedAt).toLocaleDateString('zh-CN')}</small></div>
      <button className="outline" onClick={()=>reopenTopic(t.id)}>重新开启</button>
    </div>)}
    {!archive.length&&<p className="muted">还没有归档的专题。归档只收起书架，文献和归属都会保留，可随时重新开启。</p>}</div>
  </div></div>}

  {notice&&<div className="toast">{notice}</div>}</div>;
}
createRoot(document.getElementById('root')).render(<App/>);
