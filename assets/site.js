"use strict";
(() => {
  const $ = id => document.getElementById(id);
  let data = [], dimensions = [], selected = null, visible = [];
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
  function render() {
    const query = $('search').value.trim().toLocaleLowerCase();
    visible = data.filter(c => (!$('advisor').value || c.advisor === $('advisor').value) && (!$('status').value || c.review_status === $('status').value) && (!query || [c.case_id,c.advisor,c.focus].join(' ').toLocaleLowerCase().includes(query)));
    if (!visible.some(c => c.case_id === selected)) selected = visible[0]?.case_id ?? null;
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
  fetch('examples/synthetic-cases.json').then(response=>{if(!response.ok)throw new Error('Data unavailable');return response.json();}).then(payload=>{
    if(payload.synthetic!==true || !Array.isArray(payload.cases) || payload.dimension_labels?.length!==6)throw new Error('Invalid demo data');
    data=payload.cases;dimensions=payload.dimension_labels;
    for(const advisor of [...new Set(data.map(c=>c.advisor))].sort()) {const o=document.createElement('option');o.value=advisor;o.textContent=advisor;$('advisor').append(o);}
    $('dashboard').setAttribute('aria-busy','false');render();
  }).catch(()=>{$('load-error').hidden=false;$('dashboard').hidden=true;});
})();
