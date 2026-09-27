import React,{useEffect,useMemo,useState}from'react';
import{createRoot}from'react-dom/client';
import'./styles.css';

const seed=[{id:1,title:'The Extended Mind',authors:'Clark, A. & Chalmers, D.',year:1998,venue:'Analysis',tags:['具身认知','经典'],abstract:'本文提出心智延展论：当外部环境稳定地承担认知功能时，心智边界可以超越头脑与身体。',status:'阅读中',cite:'Clark, A. & Chalmers, D. (1998). The Extended Mind. Analysis.'},{id:2,title:'Situated Learning',authors:'Lave, J. & Wenger, E.',year:1991,venue:'Cambridge University Press',tags:['学习科学','社会'],abstract:'学习发生在真实情境的参与过程中，知识与共同体实践不可分割。',status:'待读',cite:'Lave, J. & Wenger, E. (1991). Situated Learning.'},{id:3,title:'Designing with Data',authors:'Miller, S.',year:2022,venue:'MIT Press',tags:['设计研究','方法'],abstract:'一套面向设计师的数据研究方法，讨论如何把定性洞察转化为可行动的设计决策。',status:'已读',cite:'Miller, S. (2022). Designing with Data.'}];

// 存档 / 专题数据 / 归属规则 / 当前专题：四个键分开承载，均留本机，不增加依赖
const K={lib:'research-library',topics:'research-library-topics',member:'research-library-membership',cur:'research-library-current-topic'};
const ALL='all';// “全部文献”存档视图，本身不是专题
const read=(k,f)=>{try{const v=JSON.parse(localStorage.getItem(k));return v==null?f:v}catch{return f}};
const write=(k,v)=>localStorage.setItem(k,JSON.stringify(v));

// 旧数据首次打开：全部归入“我的文献”专题
(function migrate(){if(read(K.topics,null))return;const items=read(K.lib,seed);const t={id:'t-'+Date.now(),name:'我的文献',closed:false};write(K.topics,[t]);write(K.member,{[t.id]:items.map(x=>x.id)});write(K.cur,t.id)})();

function App(){
const[items,setItems]=useState(()=>read(K.lib,seed));
const[topics,setTopics]=useState(()=>read(K.topics,[]));
const[member,setMember]=useState(()=>read(K.member,{}));
const[curTopic,setCurTopic]=useState(()=>read(K.cur,ALL));
const[selected,setSelected]=useState(null);
const[query,setQuery]=useState('');
const[tag,setTag]=useState('全部');
const[status,setStatus]=useState('全部');
const[show,setShow]=useState(false);
const[notice,setNotice]=useState('');
const[addingTopic,setAddingTopic]=useState(false);
const[newTopic,setNewTopic]=useState('');
const[form,setForm]=useState({title:'',authors:'',year:'2024',venue:'',abstract:'',tags:''});

useEffect(()=>write(K.lib,items),[items]);
useEffect(()=>write(K.topics,topics),[topics]);
useEffect(()=>write(K.member,member),[member]);
useEffect(()=>write(K.cur,curTopic),[curTopic]);

const isAll=!topics.some(t=>t.id===curTopic);
const viewName=isAll?'全部文献':topics.find(t=>t.id===curTopic).name;
// 当前专题的文献：搜索、标签与状态筛选都只作用于这个集合
const topicItems=useMemo(()=>isAll?items:items.filter(x=>(member[curTopic]||[]).includes(x.id)),[items,member,curTopic,isAll]);
const tags=['全部',...new Set(topicItems.flatMap(x=>x.tags))];
const filtered=useMemo(()=>topicItems.filter(x=>(status==='全部'||(status==='收藏'?x.fav:x.status===status))&&(tag==='全部'||x.tags.includes(tag))&&(`${x.title}${x.authors}${x.abstract}`.toLowerCase().includes(query.toLowerCase()))),[topicItems,status,tag,query]);
const cur=topicItems.find(x=>x.id===selected)||topicItems[0];

const update=(k,v)=>setItems(items.map(x=>x.id===cur.id?{...x,[k]:v}:x));
const switchTopic=id=>{const list=id===ALL?items:items.filter(x=>(member[id]||[]).includes(x.id));setCurTopic(id);setSelected(list[0]?list[0].id:null);setQuery('');setTag('全部');setStatus('全部')};
const addTopic=()=>{const name=newTopic.trim();if(!name)return;const t={id:'t-'+Date.now(),name,closed:false};setTopics([...topics,t]);setMember({...member,[t.id]:[]});setNewTopic('');setAddingTopic(false);switchTopic(t.id);setNotice(`专题「${name}」已创建`)};
// 关闭专题不丢文献：仅标记关闭，归属规则与存档全部保留，可随时重新打开
const closeTopic=(e,id)=>{e.stopPropagation();const t=topics.find(x=>x.id===id);setTopics(topics.map(x=>x.id===id?{...x,closed:true}:x));if(curTopic===id){const next=topics.find(x=>x.id!==id&&!x.closed);switchTopic(next?next.id:ALL)}setNotice(`专题「${t.name}」已关闭，文献与归属均保留`)};
const reopenTopic=id=>{const t=topics.find(x=>x.id===id);setTopics(topics.map(x=>x.id===id?{...x,closed:false}:x));switchTopic(id);setNotice(`专题「${t.name}」已重新打开`)};
// 从某个专题移走只影响这个专题：原文献与其他专题中的归属都保留
const toggleMember=tid=>{if(!cur)return;const list=member[tid]||[];const on=list.includes(cur.id);const t=topics.find(x=>x.id===tid);setMember({...member,[tid]:on?list.filter(x=>x!==cur.id):[...list,cur.id]});setNotice(on?`已从「${t.name}」移出，文献与其他专题归属保留`:`已归入「${t.name}」`)};
const add=()=>{if(!form.title)return;const p={...form,id:Date.now(),year:+form.year,tags:form.tags.split(',').map(x=>x.trim()).filter(Boolean),status:'待读',cite:`${form.authors} (${form.year}). ${form.title}. ${form.venue}.`};setItems([...items,p]);if(!isAll)setMember({...member,[curTopic]:[...(member[curTopic]||[]),p.id]});setSelected(p.id);setForm({title:'',authors:'',year:'2024',venue:'',abstract:'',tags:''});setShow(false);setNotice(isAll?'文献已加入研究库':'文献已加入本专题')};
const bib=()=>{navigator.clipboard?.writeText(cur.cite);setNotice('引用文本已复制')};
const toggleFav=()=>{update('fav',!cur.fav);setNotice(cur.fav?'已取消收藏':'已加入收藏')};
const download=()=>{const a=document.createElement('a');a.href=URL.createObjectURL(new Blob([topicItems.map(x=>x.cite).join('\n')],{type:'text/plain'}));a.download=`${viewName}-references.txt`;a.click();setNotice(isAll?'已导出全部文献引用':'已导出本专题引用')};

return(
<div className="app">
<aside>
  <div className="logo"><span>∴</span> LITERATURE</div>
  <div className="library-head"><span>我的研究库</span><strong>{items.length}<small> 篇文献</small></strong></div>
  <div className="topics">
    <small>专题书架</small>
    <button className={'topic'+(isAll?' active':'')} onClick={()=>switchTopic(ALL)}>▦ <span>全部文献</span><b>{items.length}</b></button>
    {topics.filter(t=>!t.closed).map(t=><button key={t.id} className={'topic'+(curTopic===t.id?' active':'')} onClick={()=>switchTopic(t.id)}>▤ <span>{t.name}</span><b>{(member[t.id]||[]).length}</b><i className="topic-x" title="关闭专题（文献保留）" onClick={e=>closeTopic(e,t.id)}>×</i></button>)}
    {addingTopic
      ?<div className="topic-new"><input autoFocus value={newTopic} placeholder="专题名称，回车创建" onChange={e=>setNewTopic(e.target.value)} onKeyDown={e=>{if(e.key==='Enter')addTopic();if(e.key==='Escape'){setAddingTopic(false);setNewTopic('')}}}/><button onClick={addTopic}>✓</button></div>
      :<button className="topic-add" onClick={()=>setAddingTopic(true)}>＋ 新建专题</button>}
    {topics.some(t=>t.closed)&&<div className="closed-topics"><small>已关闭 · 文献保留</small>{topics.filter(t=>t.closed).map(t=><button key={t.id} className="topic" onClick={()=>reopenTopic(t.id)}>↺ <span>{t.name}</span><b>{(member[t.id]||[]).length}</b></button>)}</div>}
  </div>
  <nav>
    <small className="nav-cap">本专题筛选</small>
    <button className={status==='全部'?'active':''} onClick={()=>setStatus('全部')}>▤ <span>所有文献</span><b>{topicItems.length}</b></button>
    <button className={status==='待读'?'active':''} onClick={()=>setStatus('待读')}>▥ <span>待读</span><b>{topicItems.filter(x=>x.status==='待读').length}</b></button>
    <button className={status==='阅读中'?'active':''} onClick={()=>setStatus('阅读中')}>◐ <span>阅读中</span><b>{topicItems.filter(x=>x.status==='阅读中').length}</b></button>
    <button className={status==='已读'?'active':''} onClick={()=>setStatus('已读')}>✓ <span>已读</span><b>{topicItems.filter(x=>x.status==='已读').length}</b></button>
    <button className={status==='收藏'?'active':''} onClick={()=>setStatus('收藏')}>☆ <span>收藏</span><b>{topicItems.filter(x=>x.fav).length}</b></button>
  </nav>
  <div className="side-tags"><small>标签</small>{tags.slice(1,5).map(t=><button onClick={()=>setTag(t)} key={t}># {t}</button>)}</div>
  <div className="side-foot"><button>⚙ 偏好设置</button><small>本地数据库 · 已同步</small></div>
</aside>
<main>
  <header>
    <div><span className="crumb">RESEARCH / {isAll?'ARCHIVE':'TOPIC'}</span><h1>{viewName}{!isAll&&topics.find(t=>t.id===curTopic).closed&&<small className="closed-badge">已关闭</small>}</h1></div>
    <div className="actions"><button className="outline" onClick={download}>↓ 导出引用</button><button className="primary" onClick={()=>setShow(true)}>＋ 添加文献</button></div>
  </header>
  <div className="toolbar">
    <div className="search">⌕<input placeholder="搜索本专题的标题、作者或摘要…" value={query} onChange={e=>setQuery(e.target.value)}/>{query&&<button onClick={()=>setQuery('')}>×</button>}</div>
    <div className="tag-filter">{tags.map(t=><button className={tag===t?'on':''} onClick={()=>setTag(t)} key={t}>{t}</button>)}</div>
  </div>
  <div className="body">
    <section className="paper-list">
      {filtered.map(p=><button className={'paper '+(selected===p.id?'selected':'')} onClick={()=>setSelected(p.id)} key={p.id}><div className="paper-year">{p.year}</div><div className="paper-copy"><h3>{p.title}</h3><p>{p.authors}</p><div>{p.tags.map(t=><span key={t}>#{t}</span>)}</div></div><small className={'status '+p.status}>{p.status}</small></button>)}
      {!filtered.length&&<div className="no-result">{query||tag!=='全部'||status!=='全部'?'没有找到匹配的文献':isAll?'文献库为空':'本专题还没有文献，点击右上角「添加文献」'}</div>}
    </section>
    <section className="detail">
      {cur&&<>
        <div className="detail-top"><span className="status reading">{cur.status}</span><button onClick={toggleFav}>{cur.fav?'★ 已收藏':'☆ 收藏'}</button></div>
        <h2>{cur.title}</h2>
        <p className="authors">{cur.authors}</p>
        <div className="cite-actions"><button onClick={bib}>▣ 复制引用</button><button onClick={()=>update('status',cur.status==='已读'?'待读':'已读')}>{cur.status==='已读'?'标记为待读':'标记为已读'}</button></div>
        <div className="detail-section"><h4>摘要 <span>ABSTRACT</span></h4><p>{cur.abstract}</p></div>
        <div className="detail-section"><h4>出版信息 <span>PUBLICATION</span></h4><div className="pub-grid"><div><small>出版物</small><strong>{cur.venue}</strong></div><div><small>年份</small><strong>{cur.year}</strong></div></div></div>
        <div className="detail-section"><h4>所属专题 <span>TOPICS · 点击切换归属</span></h4><div className="topic-chips">{topics.map(t=>{const on=(member[t.id]||[]).includes(cur.id);return<button key={t.id} disabled={t.closed} className={(on?'on':'')+(t.closed?' closed':'')} onClick={()=>toggleMember(t.id)}>{on?'✓':'＋'} {t.name}{t.closed?'（已关闭）':''}</button>})}{!topics.length&&<span className="hint">还没有专题，可在左侧「新建专题」</span>}</div></div>
        <div className="detail-section"><h4>引用文本 <span>BIBTEX / TEXT</span></h4><div className="cite-box">{cur.cite}<button onClick={bib}>复制</button></div></div>
        <div className="detail-section"><h4>我的笔记 <span>PRIVATE</span></h4><textarea className="notes" placeholder="记录你的阅读想法…" value={cur.notes||''} onChange={e=>update('notes',e.target.value)}/></div>
      </>}
    </section>
  </div>
</main>
{show&&<div className="modal-bg"><div className="modal"><button className="close" onClick={()=>setShow(false)}>×</button><span className="crumb">NEW REFERENCE</span><h2>添加一篇文献</h2><label>标题<input value={form.title} onChange={e=>setForm({...form,title:e.target.value})} placeholder="论文或书籍标题"/></label><label>作者<input value={form.authors} onChange={e=>setForm({...form,authors:e.target.value})}/></label><div className="two"><label>年份<input type="number" value={form.year} onChange={e=>setForm({...form,year:e.target.value})}/></label><label>出版物<input value={form.venue} onChange={e=>setForm({...form,venue:e.target.value})}/></label></div><label>关键词<input value={form.tags} onChange={e=>setForm({...form,tags:e.target.value})} placeholder="用逗号分隔"/></label><label>摘要<textarea rows="3" value={form.abstract} onChange={e=>setForm({...form,abstract:e.target.value})}/></label><button className="primary full" onClick={add}>保存文献</button></div></div>}
{notice&&<div className="toast">{notice}</div>}
</div>);
}
createRoot(document.getElementById('root')).render(<App/>);
