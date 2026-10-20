"use strict";
(() => {
  const $ = id => document.getElementById(id);
  let data = [], dimensions = [], selected = null, visible = [], activeTopic = null;
  const esc = value => String(value).replace(/[&<>"']/g, char => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[char]));
  const completed = item => item.review_status === '複核完成';
  const badge = status => `<span class="badge${status === '待複核' ? ' pending' : ''}">${esc(status)}</span>`;
  const average = (list, field) => list.length ? (list.reduce((sum, item) => sum + item[field], 0) / list.length).toFixed(1) : '—';
  function renderDetail() {
    const c = visible.find(item => item.case_id === selected);
    document.querySelectorAll('.case-button').forEach(button => {
      const active = button.dataset.case === selected;
      button.setAttribute('aria-pressed', String(active));
      button.closest('tr').classList.toggle('selected', active);
    });
    renderExplorer(c);
    if (!c) {
      $('detail-heading').textContent = '案例洞察';
      $('detail-status').replaceChildren();
      $('detail-content').innerHTML = '<p class="empty">沒有可顯示的案例，請調整篩選條件。</p>';
      $('radar').innerHTML = '<p class="empty">沒有可顯示的服務面向。</p>';
      $('radar-label').textContent = '選取案例後顯示';
      return;
    }
    $('detail-heading').textContent = c.case_id;
    $('detail-status').innerHTML = badge(c.review_status);
    $('detail-content').innerHTML = `<div class="detail-body"><div class="detail-meta"><span>${esc(c.advisor)}</span><span>虛構案例</span></div><h4>${esc(c.focus)}</h4><div class="detail-scores"><span>品質指標<strong>${c.illustrative_quality_score}</strong></span><span>意向指標<strong>${c.illustrative_intent_score}</strong></span></div><p class="quote-label">虛構顧客原話</p><blockquote>「${esc(c.fictional_customer_quote)}」</blockquote><h5>跟進方向示意</h5><p>${esc(c.illustrative_follow_up)}</p><h5>狀態解讀</h5><p>${completed(c) ? '此案例示意已完成複核，會計入目前篩選的平均與顧問比較。' : '此案例示意仍待人工確認，分數不計入平均與顧問比較。'}</p></div>`;
    $('radar-label').textContent = `${c.case_id} · ${c.advisor} · ${c.review_status}`;
    const point = (i, radius) => { const a = i * Math.PI / 3 - Math.PI / 2; return [205 + Math.cos(a) * radius, 140 + Math.sin(a) * radius]; };
    const polygon = radius => dimensions.map((_,i) => point(i,radius).join(',')).join(' ');
    const values = c.illustrative_dimensions;
    const grid = [20,40,60,80,100].map(v => `<polygon points="${polygon(v)}" fill="none" stroke="#dce5ea"/><text class="tick" x="209" y="${138-v}">${v}</text>`).join('');
    const axes = dimensions.map((label,i) => { const [x,y] = point(i,100), [tx,ty] = point(i,124); return `<line x1="205" y1="140" x2="${x}" y2="${y}" stroke="#e2e9ed"/><text x="${tx}" y="${ty+4}" text-anchor="${i===0||i===3?'middle':i<3?'start':'end'}">${esc(label)}</text>`; }).join('');
    const scores = values.map((v,i) => point(i,v).join(',')).join(' ');
    $('radar').innerHTML = `<svg class="radar-chart" viewBox="0 0 410 280" role="img" aria-label="${esc(c.case_id+' 示意服務面向：'+dimensions.map((label,i)=>label+' '+values[i]).join('、'))}"><title>${esc(c.case_id)} 虛構服務面向</title>${grid}${axes}<polygon points="${scores}" fill="#0c9175" fill-opacity="0.14" stroke="#0c9175" stroke-width="2"/>${values.map((v,i)=>{const [x,y]=point(i,v);return `<circle cx="${x}" cy="${y}" r="3" fill="#0c9175"/>`;}).join('')}</svg>`;
  }
  const currentCase = () => visible.find(c => c.case_id === selected);
  const proof = (c, ids, customerOnly = false) => ids.map(id => c.illustrative_dialogue.find(turn => turn.id === id)).filter(turn => turn && (!customerOnly || turn.speaker === '顧客'));
  const quoteMarkup = turn => `<blockquote class="evidence-quote"><span>${esc(turn.id)} · ${esc(turn.speaker)} · 虛構對話</span><p>${esc(turn.text)}</p></blockquote>`;
  const checkBadge = status => `<span class="badge ${status === '待確認' ? 'pending' : status === '未示範' ? 'not-shown' : ''}">${esc(status)}</span>`;
  function renderChecklist() {
    const c = currentCase();
    if (!c) { $('check-count').textContent = '0 項'; $('checklist-content').innerHTML = '<p class="empty">目前沒有案例，請調整上方篩選條件。</p>'; return; }
    const items = c.illustrative_checklist.filter(item => !$('check-status').value || item.status === $('check-status').value);
    $('check-count').textContent = `${c.case_id} · 顯示 ${items.length} / ${c.illustrative_checklist.length} 項示範題目`;
    $('checklist-content').innerHTML = items.length ? [...new Set(items.map(item=>item.category))].map(category => `<section class="check-group"><h4>${esc(category)}</h4>${items.filter(item=>item.category===category).map(item => `<details class="check-item"><summary><span class="check-facet">${esc(item.facet)}</span><span class="check-title">${esc(item.title)}</span>${checkBadge(item.status)}</summary><div class="check-body"><h5>示意判讀</h5><p>${esc(item.reason)}</p><h5>對話證據與脈絡</h5>${proof(c,item.evidence).map(quoteMarkup).join('')}</div></details>`).join('')}</section>`).join('') : '<p class="empty">此案例沒有符合這個判定狀態的題目。</p>';
  }
  function renderTopics() {
    const c=currentCase();
    if(!c){['topic-nav','pain-cloud','preference-cloud'].forEach(id=>$(id).replaceChildren());$('topic-evidence').innerHTML='<p class="empty">目前沒有案例，請調整上方篩選條件。</p>';return;}
    const topics=c.illustrative_topics;
    if(!topics.some(t=>t.id===activeTopic))activeTopic=topics[0]?.id;
    const button=(t,cloud=false)=>`<button type="button" class="${cloud?'cloud-word':'topic-button'} ${t.kind==='痛點'?'pain-word':''} ${cloud&&t.evidence.length>1?'word-large':''}" data-topic="${esc(t.id)}" aria-pressed="${t.id===activeTopic}"><span>${esc(t.label)}</span><small>${cloud?t.evidence.length+' 段':esc(t.kind)+' · '+t.evidence.length+' 段原話'}</small></button>`;
    $('topic-nav').innerHTML=topics.map(t=>button(t)).join('');
    $('pain-cloud').innerHTML=topics.filter(t=>t.kind==='痛點').map(t=>button(t,true)).join('')||'<p class="empty">此示例未整理出明確痛點；不代表沒有疑慮。</p>';
    $('preference-cloud').innerHTML=topics.filter(t=>t.kind==='需求與偏好').map(t=>button(t,true)).join('')||'<p class="empty">此示例沒有可顯示的明確偏好。</p>';
    const topic=topics.find(t=>t.id===activeTopic);
    $('topic-evidence').innerHTML=topic?`<p class="eyebrow">CUSTOMER EVIDENCE / 顧客原話</p><h4>${esc(topic.label)}</h4><p class="evidence-meta">${esc(c.case_id)} · ${esc(topic.kind)} · ${topic.evidence.length} 段支持發言</p><p class="topic-summary">${esc(topic.summary)}</p>${proof(c,topic.evidence,true).map(quoteMarkup).join('')}<div class="follow-up"><h5>跟進方向示意</h5><p>${esc(c.illustrative_follow_up)}</p></div>`:'<p class="empty">請選擇主題。</p>';
  }
  function renderExplorer(c) {
    $('explorer-case').textContent=c?`${c.case_id} · ${c.advisor} · ${c.review_status} · 虛構案例`:'目前沒有符合篩選的案例';
    $('explorer-select').replaceChildren(...visible.map(item=>{const option=document.createElement('option');option.value=item.case_id;option.textContent=`${item.case_id} · ${item.focus}`;return option;}));
    $('explorer-select').value=c?.case_id??'';
    ['explorer-select','check-status','expand-checks','collapse-checks'].forEach(id=>$(id).disabled=!c);
    $('check-status').value='';activeTopic=null;
    renderChecklist();renderTopics();
  }
  $('check-status').addEventListener('change',renderChecklist);
  $('expand-checks').addEventListener('click',()=>document.querySelectorAll('.check-item').forEach(el=>el.open=true));
  $('collapse-checks').addEventListener('click',()=>document.querySelectorAll('.check-item').forEach(el=>el.open=false));
  $('explorer-select').addEventListener('change',()=>{selected=$('explorer-select').value;renderDetail();});
  $('insights-panel').addEventListener('click',event=>{
    const button=event.target.closest('[data-topic]');
    if(button){const container=button.parentElement.id;activeTopic=button.dataset.topic;renderTopics();document.querySelector(`#${container} [data-topic="${activeTopic}"]`)?.focus({preventScroll:true});}
  });
  function render() {
    const query = $('search').value.trim().toLocaleLowerCase();
    visible = data.filter(c => (!$('advisor').value || c.advisor === $('advisor').value) && (!$('status').value || c.review_status === $('status').value) && (!query || [c.case_id,c.advisor,c.focus].join(' ').toLocaleLowerCase().includes(query)));
    if (!visible.some(c => c.case_id === selected)) selected = visible[0]?.case_id ?? null;
    document.querySelector('.filter-drawer > summary').textContent = `篩選案例 · ${visible.length} / ${data.length} 筆${$('advisor').value || $('status').value || query ? ' · 已套用條件' : ''}`;
    const reviewed = visible.filter(completed);
    $('count').textContent = visible.length;
    $('count-note').textContent = `全部 ${data.length} 筆虛構案例`;
    $('reviewed').textContent = reviewed.length;
    $('quality').textContent = average(reviewed,'illustrative_quality_score');
    $('intent').textContent = average(reviewed,'illustrative_intent_score');
    $('result-count').textContent = `顯示 ${visible.length} 筆 · ${visible.length-reviewed.length} 筆待複核`;
    $('case-rows').innerHTML = visible.map(c => `<tr><td><button class="case-button" type="button" data-case="${esc(c.case_id)}" aria-label="查看 ${esc(c.case_id)}：${esc(c.focus)}" aria-pressed="false"><strong>${esc(c.case_id)}</strong><small>${esc(c.focus)}</small></button></td><td>${esc(c.advisor.replace('示範',''))}</td><td>${badge(c.review_status)}</td><td>${c.illustrative_quality_score}</td><td>${c.illustrative_intent_score}</td></tr>`).join('');
    $('empty').hidden = visible.length !== 0;
    $('download').disabled = visible.length === 0;
    $('download-status').textContent = '';
    const advisors = [...new Set(reviewed.map(c=>c.advisor))].sort();
    $('bars').innerHTML = advisors.length ? advisors.map(advisor => {
      const items = reviewed.filter(c=>c.advisor===advisor), score=average(items,'illustrative_quality_score');
      return `<div class="bar-item"><div class="bar-label"><span>${esc(advisor)} <small>· ${items.length} 筆</small></span><strong>${score}</strong></div><svg class="bar-chart" viewBox="0 0 100 4" preserveAspectRatio="none" role="img" aria-label="${esc(advisor)}，${score} 分，共 ${items.length} 筆複核完成案例"><rect width="100" height="4" rx="1" fill="#ecf2f5"/><rect width="${score}" height="4" rx="1" fill="#168b74"/></svg></div>`;
    }).join('')+'<div class="bar-scale"><span>0</span><span>50</span><span>100</span></div>' : '<p class="empty">目前篩選沒有複核完成的案例，暫不顯示比較。</p>';
    renderDetail();
  }
  $('case-rows').addEventListener('click', event => { const b=event.target.closest('[data-case]'); if(b){selected=b.dataset.case;renderDetail();} });
  ['advisor','status'].forEach(id => $(id).addEventListener('change',render));
  $('search').addEventListener('input',render);
  $('reset').addEventListener('click',()=>{['advisor','status','search'].forEach(id=>$(id).value='');selected=null;render();});
  $('download').addEventListener('click',()=>{
    if(!visible.length)return;
    const result={synthetic:true,purpose:'SQES 公開展示用虛構資料，非真實客戶或評分結果',filters:{advisor:$('advisor').value,status:$('status').value,search:$('search').value},dimension_labels:dimensions,cases:visible};
    const url=URL.createObjectURL(new Blob([JSON.stringify(result,null,2)+'\n'],{type:'application/json;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='SQES_Synthetic_Demo.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    $('download-status').textContent=`已準備 ${visible.length} 筆虛構資料下載（JSON）。`;
  });
  // Standalone fictional settings; never connected to the private scoring engine.
  const demoDefaults=[20,20,20,20,20], demoLabels=['展示維度 A','展示維度 B','展示維度 C','展示維度 D','展示維度 E'];
  let draftWeights=[...demoDefaults], appliedWeights=[...demoDefaults];
  const tuningVersions=[], tuningLog=[];
  const validWeights=w=>Array.isArray(w)&&w.length===5&&w.every(v=>Number.isInteger(v)&&v>=0&&v<=100)&&w.reduce((a,b)=>a+b,0)===100;
  const tuningMessage=text=>{$('tuning-message').textContent=text;};
  function setTuningTab(key,focus=false) {
    document.querySelectorAll('[data-tune-tab]').forEach(b=>{const active=b.dataset.tuneTab===key;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$('tune-'+b.dataset.tuneTab).hidden=!active;});
    if(focus)$('tune-tab-'+key).focus({preventScroll:true});
  }
  document.querySelectorAll('[data-tune-tab]').forEach(b=>b.addEventListener('click',()=>setTuningTab(b.dataset.tuneTab)));
  function logTuning(action) {
    tuningLog.unshift({time:new Date().toLocaleTimeString('zh-TW',{hour12:false}),action});
    $('tuning-log').innerHTML=tuningLog.map(entry=>`<li><time>${esc(entry.time)}</time><span>${esc(entry.action)}</span></li>`).join('');
  }
  $('tuning-inputs').innerHTML=demoLabels.map((label,i)=>`<div class="weight-row"><label for="weight-${i}">${label}</label><input id="weight-slider-${i}" type="range" min="0" max="100" step="1" value="20" aria-label="${label} 配分滑桿" data-weight="${i}"/><input id="weight-${i}" type="number" min="0" max="100" step="1" value="20" aria-describedby="tuning-total" data-weight="${i}"/></div>`).join('');
  function renderTuning(syncInputs=false) {
    const valid=validWeights(draftWeights),total=draftWeights.reduce((sum,v)=>sum+(Number.isFinite(v)?v:0),0);
    $('tuning-total').textContent=valid?'配分合計 100 / 100 · 可以套用':`配分合計 ${Number(total.toFixed(2))} / 100 · 請填入 0–100 整數，合計須為 100`;
    $('tuning-total').classList.toggle('invalid',!valid);
    ['tuning-save','tuning-export'].forEach(id=>$(id).disabled=!valid);
    draftWeights.forEach((v,i)=>{const field=$('weight-'+i);field.setAttribute('aria-invalid',String(!Number.isInteger(v)||v<0||v>100));if(syncInputs)field.value=Number.isFinite(v)?v:'';if(Number.isFinite(v))$('weight-slider-'+i).value=v;});
    $('tuning-comparison').innerHTML=demoLabels.map((label,i)=>{const v=draftWeights[i],delta=Number.isFinite(v)?Number((v-appliedWeights[i]).toFixed(2)):null;return `<tr><th scope="row">${label}</th><td>${appliedWeights[i]}</td><td>${Number.isFinite(v)?v:'—'}</td><td class="${delta!==null&&delta!==0?'tuning-priority':''}">${delta===null?'—':delta>0?'+'+delta:delta===0?'持平':delta}</td></tr>`;}).join('');
  }
  $('tuning-inputs').addEventListener('input',event=>{const input=event.target;if(!input.matches('[data-weight]'))return;const i=Number(input.dataset.weight);draftWeights[i]=input.valueAsNumber;if(input.type==='range')$('weight-'+i).value=input.value;renderTuning();tuningMessage('草稿已修改，請確認比較後套用。');});
  function loadDraft(weights,message) {draftWeights=[...weights];$('tuning-name').value='';renderTuning(true);setTuningTab('config',true);tuningMessage(message);}
  $('tuning-reset').addEventListener('click',()=>{loadDraft(demoDefaults,'預設配分已載入草稿，確認後可套用；存檔仍保留。');logTuning('恢復示範預設至草稿');});
  $('tuning-save').addEventListener('click',()=>{
    if(!validWeights(draftWeights))return;
    const index=tuningVersions.length,name=$('tuning-name').value.trim()||`展示版本 ${index+1}`,version={name,weights:[...draftWeights]};
    tuningVersions.push(version);appliedWeights=[...version.weights];
    $('tuning-active').textContent='已套用：'+name;$('tuning-version-count').textContent=tuningVersions.length;
    $('tuning-versions').innerHTML=tuningVersions.map((v,i)=>`<article class="tuning-version"><div><h5>${esc(v.name)}</h5><p>版本 ${i+1} · 展示維度 A–E：${v.weights.join(' / ')}</p></div><button class="secondary" type="button" data-restore="${i}" aria-label="載入版本 ${i+1} 至草稿">載入至草稿</button></article>`).reverse().join('');
    renderTuning();logTuning(`套用並保存：${name}`);tuningMessage(`已套用並保存「${name}」。可至權重存檔庫載入；案例分數不變。`);
  });
  $('tuning-versions').addEventListener('click',event=>{const button=event.target.closest('[data-restore]');if(!button)return;const v=tuningVersions[Number(button.dataset.restore)];if(!v)return;loadDraft(v.weights,`已載入「${v.name}」至草稿，確認後再套用。`);logTuning(`載入版本至草稿：${v.name}`);});
  $('tuning-suggest').addEventListener('click',()=>{$('tuning-suggestion').hidden=false;tuningMessage('已展開固定示範建議，可檢視後載入草稿。');});
  $('tuning-use-suggestion').addEventListener('click',()=>{loadDraft([25,15,20,25,15],'固定示範建議已載入草稿；尚未套用。');logTuning('載入固定示範建議至草稿');});
  $('tuning-export').addEventListener('click',()=>{
    if(!validWeights(draftWeights))return;
    const payload={format:'sqes-public-tuning-v1',synthetic:true,weights:[...draftWeights]};
    const url=URL.createObjectURL(new Blob([JSON.stringify(payload,null,2)+'\n'],{type:'application/json;charset=utf-8'}));
    const a=document.createElement('a');a.href=url;a.download='SQES_Demo_Weights.json';document.body.append(a);a.click();a.remove();setTimeout(()=>URL.revokeObjectURL(url),10000);
    logTuning('匯出展示草稿 JSON');tuningMessage('已準備展示草稿 JSON 下載；可由權重存檔庫匯入。');
  });
  $('tuning-import').addEventListener('change',async event=>{
    const input=event.target,file=input.files[0];if(!file)return;
    try {
      if(file.size>10000)throw new Error('size');
      const payload=JSON.parse(await file.text());
      if(!payload||payload.format!=='sqes-public-tuning-v1'||payload.synthetic!==true||Object.keys(payload).sort().join(',')!=='format,synthetic,weights'||!validWeights(payload.weights))throw new Error('format');
      loadDraft(payload.weights,'展示設定已匯入草稿，確認後再套用。');logTuning('匯入公開展示設定至草稿');
    } catch {tuningMessage('無法匯入：請使用本頁匯出的展示 JSON，五項整數配分須合計 100，檔案需小於 10 KB。');}
    finally {input.value='';}
  });
  renderTuning(true);
  const viewNames = ['overview','charts','checklist','insights','tuning'];
  const aliases = {demo:'overview','case-explorer':'checklist','checklist-panel':'checklist','insights-panel':'insights',home:'about',approach:'about'};
  let currentView='overview';
  function activateRoute(scroll=false) {
    const hash=location.hash.slice(1), route=aliases[hash]||hash||'overview';
    const page=route==='about'||route==='validation'?route:'workspace';
    if(viewNames.includes(route))currentView=route;
    document.querySelectorAll('[data-page]').forEach(el=>el.hidden=el.dataset.page!==page);
    document.querySelectorAll('[data-view]').forEach(button=>{const active=button.dataset.view===currentView;button.setAttribute('aria-selected',String(active));button.tabIndex=active?0:-1;});
    viewNames.forEach(name=>$(name).hidden=name!==currentView);
    document.querySelector('.workspace-selector').hidden=currentView==='tuning';
    document.querySelector('.filter-drawer').hidden=currentView==='tuning';
    document.querySelectorAll('header nav a').forEach(a=>{
      const active=(page==='workspace'&&a.hash==='#overview')||a.hash==='#'+page;
      if(active)a.setAttribute('aria-current','page');else a.removeAttribute('aria-current');
    });
    if(scroll)window.scrollTo({top:0,behavior:'instant'});
  }
  function setRoute(route) {
    if(location.hash!=='#'+route)history.pushState(null,'','#'+route);
    activateRoute(true);
  }
  document.querySelectorAll('[data-view]').forEach(b=>b.addEventListener('click',()=>setRoute(b.dataset.view)));
  document.querySelectorAll('a[href^="#"]').forEach(a=>a.addEventListener('click',event=>{
    const key=a.hash.slice(1);
    if(viewNames.includes(key)||aliases[key]||key==='about'||key==='validation'){
      event.preventDefault();setRoute(aliases[key]||key);
      if(a.classList.contains('skip'))$(currentView).focus({preventScroll:true});
      if(key==='approach')$('approach').scrollIntoView({behavior:'instant'});
    }
  }));
  window.addEventListener('popstate',()=>activateRoute(true));
  window.addEventListener('hashchange',()=>activateRoute(true));
  function setInsightMode(key) {
    document.querySelectorAll('[data-insight-mode]').forEach(b=>{const active=b.dataset.insightMode===key;b.setAttribute('aria-selected',String(active));b.tabIndex=active?0:-1;$('mode-'+b.dataset.insightMode).hidden=!active;});
  }
  document.querySelectorAll('[data-insight-mode]').forEach(b=>b.addEventListener('click',()=>setInsightMode(b.dataset.insightMode)));
  document.querySelectorAll('[role="tablist"]').forEach(list=>list.addEventListener('keydown',event=>{
    const buttons=[...list.querySelectorAll('[role="tab"]')], index=buttons.indexOf(document.activeElement);
    if(index<0||!['ArrowRight','ArrowLeft','Home','End'].includes(event.key))return;
    event.preventDefault();const next=event.key==='Home'?0:event.key==='End'?buttons.length-1:(index+(event.key==='ArrowRight'?1:-1)+buttons.length)%buttons.length;
    buttons[next].focus();buttons[next].click();
  }));
  activateRoute();
  fetch('examples/synthetic-cases.json').then(response=>{if(!response.ok)throw new Error('Data unavailable');return response.json();}).then(payload=>{
    if(payload.synthetic!==true || !Array.isArray(payload.cases) || payload.dimension_labels?.length!==6)throw new Error('Invalid demo data');
    data=payload.cases;dimensions=payload.dimension_labels;
    for(const advisor of [...new Set(data.map(c=>c.advisor))].sort()) {const o=document.createElement('option');o.value=advisor;o.textContent=advisor;$('advisor').append(o);}
    $('dashboard').setAttribute('aria-busy','false');render();
  }).catch(()=>{$('load-error').hidden=false;$('dashboard').hidden=true;});
})();
