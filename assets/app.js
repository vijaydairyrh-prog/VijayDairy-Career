const $ = s => document.querySelector(s);
const tok = () => localStorage.getItem('access');
const STATUSES = ['New','Online','Offline','Shortlisted','Interview Finished','Selected','Rejected','Hold'];
const COLORS = {New:'info',Online:'primary',Offline:'secondary',Shortlisted:'success','Interview Finished':'dark',Selected:'success',Rejected:'danger',Hold:'warning text-dark'};
const badge = s => `<span class="badge bg-${COLORS[s]||'secondary'}">${s}</span>`;
const fd = d => d ? new Date(d).toLocaleString('en-IN',{day:'2-digit',month:'short',year:'numeric',...(String(d).length>10?{hour:'2-digit',minute:'2-digit'}:{})}) : '-';
const esc = s => String(s??'').replace(/[&<>"]/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;'}[c]));
const telA = v => v ? `<a href="tel:${esc(String(v).replace(/[^\d+]/g,''))}">${esc(v)}</a>` : '-';   // tap number -> phone dialer
const mailA = v => v ? `<a href="mailto:${esc(v)}">${esc(v)}</a>` : '-';   // tap email -> mail app compose
const fe = e => typeof e=='string'?e:Object.entries(e||{}).map(([k,v])=>(k=='detail'?'':k+': ')+(Array.isArray(v)?v.join(', '):typeof v=='object'?fe(v):v)).join('<br>');

const hrUnit = () => localStorage.getItem('unit') || '';
/* ===== API adapter: every call goes to the Google Apps Script web app (assets/config.js -> API_URL) =====
   POST + text/plain body = "simple request" (no CORS preflight). The script always answers HTTP 200 with {status, data}. */
async function fileToObj(f) {
  const u8 = new Uint8Array(await f.arrayBuffer()); let bin = '';
  for (let i = 0; i < u8.length; i += 0x8000) bin += String.fromCharCode.apply(null, u8.subarray(i, i + 0x8000));
  return {name: f.name, type: f.type, size: f.size, data: btoa(bin)};
}
async function formToObj(fd) {
  const o = {};
  for (const [k, v] of fd.entries()) { if (typeof v === 'string') o[k] = v; else if (v && v.size) o[k] = await fileToObj(v); }
  return o;
}
async function api(path, opt={}) {
  if (hrUnit() && !opt.method && /^\/(dashboard|interviews)\/|^\/resumes\/(\?|$)/.test(path)) path += (path.includes('?') ? '&' : '?') + 'unit=' + hrUnit();
  const url = (window.HR_CONFIG || {}).API_URL || '';
  if (!/^https:\/\/script\.google(usercontent)?\.com\//.test(url)) throw {detail: 'API_URL is not set. Open assets/config.js and paste your Google Apps Script Web App URL.'};
  const [route, qs] = path.split('?');
  let body = opt.body; if (body instanceof FormData) body = await formToObj(body);
  const payload = {route, method: opt.method || 'GET', query: Object.fromEntries(new URLSearchParams(qs || '')), body: body || {}, token: (tok() && !opt.noauth) ? tok() : ''};
  let r; try { r = await fetch(url, {method: 'POST', body: JSON.stringify(payload), redirect: 'follow'}); }
  catch (e) { throw {detail: 'Cannot reach the server. Check your internet connection.'}; }
  const d = await r.json().catch(() => null);
  if (!d || typeof d.status !== 'number') throw {detail: 'Server returned an unexpected response. Check that the Web App is deployed with access "Anyone".'};
  if (d.status === 401 && tok() && !opt.noauth) { localStorage.clear(); location = '../employee/index.html?login=1'; throw {detail:'Session expired'}; }
  if (d.status >= 400) throw d.data || {detail: 'Request failed (' + d.status + ')'};
  return d.data;
}
function toast(msg, type='success') {
  let box = $('#toasts'); if (!box) { box = document.createElement('div'); box.id='toasts'; box.style='position:fixed;top:12px;right:12px;z-index:2000;max-width:360px'; document.body.append(box); }
  const t = document.createElement('div'); t.className = `alert alert-${type} shadow`; t.innerHTML = msg; box.append(t); setTimeout(()=>t.remove(), 4000);
}
function table(cols, rows) {
  // data-label lets the mobile CSS show every row as a card (no sideways scroll)
  const lab = c => String(c ?? '').replace(/<[^>]*>/g, '').replace(/"/g, '&quot;').trim();
  return `<table class="table table-hover align-middle mb-0 m-stack"><thead class="table-light"><tr>${cols.map(c=>`<th>${c}</th>`).join('')}</tr></thead><tbody>${
    rows.length ? rows.map(r=>`<tr>${r.map((c,i)=>`<td data-label="${lab(cols[i])}">${c??''}</td>`).join('')}</tr>`).join('') : `<tr><td colspan="${cols.length}" class="text-center text-muted py-4 m-empty">No records found</td></tr>`}</tbody></table>`;
}
function pager(d, cb) {
  window._pg = cb; const el = $('#pg'); if (!el) return;
  const cur = d.next ? +new URL(d.next).searchParams.get('page')-1 : (d.previous ? (+(new URL(d.previous).searchParams.get('page')||1))+1 : 1);
  el.innerHTML = `<div class="d-flex justify-content-between align-items-center mt-3"><small class="text-muted">${d.count} records</small><div>
    <button class="btn btn-sm btn-outline-secondary" ${d.previous?'':'disabled'} onclick="_pg(${cur-1})">Prev</button>
    <span class="mx-2">Page ${cur}</span><button class="btn btn-sm btn-outline-secondary" ${d.next?'':'disabled'} onclick="_pg(${cur+1})">Next</button></div></div>`;
}
async function blobUrl(id, inline) {
  const d = await api(`/resumes/${id}/download/`);
  const bin = atob(d.data), u8 = new Uint8Array(bin.length); for (let i = 0; i < bin.length; i++) u8[i] = bin.charCodeAt(i);
  return URL.createObjectURL(new Blob([u8], {type: d.mime || 'application/pdf'}));
}
const viewPdf = async id => { try { window.open(await blobUrl(id, true), '_blank'); } catch(e){ toast(fe(e),'danger'); } };
const dlPdf = async (id, name) => { try { const a = document.createElement('a'); a.href = await blobUrl(id); a.download = name + '.pdf'; a.click(); } catch(e){ toast(fe(e),'danger'); } };
async function logout() {
  try { await api('/auth/logout/', {method:'POST', body:{refresh:localStorage.getItem('refresh')}}); } catch(e){}
  localStorage.clear(); location = '../employee/index.html';   // logout -> home page
}
const theme = () => localStorage.getItem('hrTheme') || 'light';   // default = light (new key, so an old saved 'dark' choice is ignored)
function applyTheme() {
  const t = theme();
  document.documentElement.setAttribute('data-bs-theme', t);
  document.body.classList.toggle('light', t == 'light');
  const b = $('#tg');
  if (b) b.innerHTML = t == 'dark' ? '<i class="bi bi-moon-stars-fill"></i>' : '<i class="bi bi-sun-fill"></i>';
}
function toggleTheme() { localStorage.setItem('hrTheme', theme() == 'dark' ? 'light' : 'dark'); applyTheme(); }
/* Resumes sub-menu: grouped by the 3 hiring steps */
const SUB_GROUPS = [
  [' Review',    [['New'], , ['Shortlisted']]],
  ['Interview', [['Interview'], ['Finished', 'Interview Finished']]],
  [' Decision',  [['Selected'], ['Hold'], ['Rejected']]]
];
function resumeSubnav() {
  const cur = new URLSearchParams(location.search).get('status'), onList = location.pathname.endsWith('/resumes.html');
  const on = v => onList && cur === v ? ' class="active"' : '';
  const onIv = location.pathname.endsWith('/interviews.html');
  const link = (l, v) => v === 'Interview' ? `<a href="../hr/interviews.html"${onIv ? ' class="active"' : ''}>${l}</a>` : `<a href="../hr/resumes.html?status=${encodeURIComponent(v)}"${on(v)}>${l}</a>`;
  return `<a href="../hr/resumes.html"${onList && !cur ? ' class="active"' : ''}>All Resumes</a>`
    + SUB_GROUPS.map(([h, items]) => `<div class="small text-muted text-uppercase fw-semibold mt-2 mb-1 px-3" style="font-size:.68rem;letter-spacing:.04em">${h}</div>${items.map(([l, v]) => link(l, v || l)).join('')}`).join('');
}
/* mobile: sidebar is a slide-in drawer (same menu as desktop) */
function toggleSidebar(force) { document.body.classList.toggle('sb-open', typeof force == 'boolean' ? force : undefined); }
document.addEventListener('keydown', e => { if (e.key == 'Escape') toggleSidebar(false); });
window.addEventListener('resize', () => { if (innerWidth > 768) toggleSidebar(false); });
function layout(active) {
  localStorage.removeItem('unit');   // company filter removed
  if (!tok()) { location = '../employee/index.html?login=1'; return; }
  if (!$('#bi')) { const l = document.createElement('link'); l.id='bi'; l.rel='stylesheet'; l.href='https://cdn.jsdelivr.net/npm/bootstrap-icons@1.11.3/font/bootstrap-icons.min.css'; document.head.append(l); }
  const act = (active == 'resume-detail' || active == 'interviews') ? 'resumes' : active;
  const it = (k, i, t, x='') => `<a href="../hr/${k}.html" class="${act==k?'active':''}"><i class="bi bi-${i}"></i>${t}${x}</a>`;
  document.body.className = 'hr';
  document.body.innerHTML = `<div class="d-flex app"><aside class="sidebar p-3"><div class="logo-box ${hrUnit()=='Bhavan'?'':'clean'}"><img src="${hrUnit()=='Bhavan'?'../assets/bhavan-logo.png':'../assets/vijay-logo-hr.png'}" class="w-100" alt="Vijay">${hrUnit()=='Bhavan'?'':'<div class="logo-tag">Good Health • Happy Family</div>'}</div>
  ${it('dashboard','house-door-fill','Dashboard')}
  <a href="#rsub" data-bs-toggle="collapse" class="${act=='resumes'?'active':''}"><i class="bi bi-file-earmark-text-fill"></i>Resumes<i class="bi bi-chevron-down ms-auto small"></i></a>
  <div class="collapse ${act=='resumes'?'show':''}" id="rsub"><div class="subnav">${resumeSubnav()}</div></div>
  ${it('jobs','briefcase-fill','Job Openings')}${it('job-roles','person-vcard-fill','Job Roles')}${it('email-history','envelope','Email History')}
  ${it('notifications','bell-fill','Notifications','<span id="nc2" class="badge rounded-pill bg-danger ms-auto"></span>')}${it('settings','person-circle','Profile')}
  <a href="#" onclick="logout()" class="mt-4"><i class="bi bi-box-arrow-left"></i>Logout</a></aside>
  <div class="flex-grow-1 d-flex flex-column" style="min-width:0">${hrUnit()=='Bhavan'?`<div class="bh-bar"><span class="bg-white rounded-2 p-1 d-flex"><img src="../assets/vijay-logo.png" height="40" alt="Vijay"></span><div><h4>HR Dashboard</h4><div class="small opacity-75">Vijay Bhavan Veg Restaurant</div></div><button class="btn-lo" onclick="logout()">Logout</button></div>`:''}<nav class="topbar d-flex align-items-center gap-3 px-3 py-2 border-bottom">
    <button type="button" class="btn btn-sm anl menu-btn" onclick="toggleSidebar()" aria-label="Menu"><i class="bi bi-list fs-5"></i></button>
    <a href="../hr/reports.html" class="btn btn-sm anl d-none d-lg-inline-flex"><i class="bi bi-bar-chart-line me-1"></i>Analytics Insights</a>
    <form class="flex-grow-1" style="max-width:480px" onsubmit="location='../hr/resumes.html?q='+encodeURIComponent(this.q.value);return false"><div class="input-group"><span class="input-group-text"><i class="bi bi-search"></i></span><input name="q" class="form-control border-start-0" placeholder="Search by name, email, mobile or resume ID..."></div></form>
    <button type="button" id="tg" class="btn btn-sm anl ms-auto" onclick="toggleTheme()" title="Switch dark / light theme"></button>
    <a href="../hr/notifications.html" class="position-relative text-light fs-5"><i class="bi bi-bell"></i><span id="nc" class="badge rounded-pill bg-danger position-absolute top-0 start-100 translate-middle" style="font-size:.6rem"></span></a>
    <div class="dropdown"><a href="#" class="d-flex align-items-center gap-2 text-decoration-none text-light" data-bs-toggle="dropdown"><span class="avatar" id="av">H</span><span class="lh-sm d-none d-md-block"><b id="un">HR</b><br><small class="text-muted">HR Manager</small></span><i class="bi bi-chevron-down small"></i></a>
    <ul class="dropdown-menu dropdown-menu-end"><li><a class="dropdown-item" href="../hr/settings.html">Profile</a></li><li><a class="dropdown-item" href="#" onclick="logout()">Logout</a></li></ul></div></nav>
  <main id="content" class="p-3 flex-grow-1"></main>${siteFooter(true)}</div></div><div class="sb-backdrop" onclick="toggleSidebar(false)"></div>`;
  applyTheme();
  api('/notifications/').then(d => { if (d.unread) { $('#nc').textContent = d.unread; $('#nc2').textContent = d.unread; } }).catch(()=>{});
  api('/auth/me/').then(u => { const n = u.name || (u.username||'HR').split('@')[0]; $('#un').textContent = n; $('#av').textContent = n[0].toUpperCase(); }).catch(()=>{});
}

/* ===== Common footer (home page + HR pages): about on the left, contact on the right (all clickable), copyright centred at the bottom ===== */
const FOOT = {
  logo: '../assets/vijay-logo.png',
  about: 'Vijay Dairy & Farm Products (P) Ltd has a committed vision to procure quality milk from the farmers and produce milk and milk products through superior technology and process and makes it available to customers at competitive price.',
  address: 'Trichy Thuraiyur main road, Peramangalam, Trichy. Tamil Nadu 621006',
  web: 'www.vijaymilk.com', phone: '+91 8870053444', email: 'connecthr@vijaymilk.in',
  copy: '\u00a9 2018. All Rights Reserved By Vijay Dairy & Farm Products (P) Ltd', dev: 'Scoto.in'
};
function siteFooter(barOnly = false) {     // barOnly = true -> only the copyright line (used in the HR dashboard)
  const bar = `<div class="sf-bot"><span>${FOOT.copy}</span><span>Design &amp; Developed by <b>${FOOT.dev}</b></span></div>`;
  if (barOnly) return `<footer class="sfoot sf-mini"><div class="sf-wrap">${bar}</div></footer>`;
  const map = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(FOOT.address);
  return `<footer id="contact" class="sfoot"><div class="sf-wrap">
    <div class="sf-row">
      <div class="sf-l"><img src="${FOOT.logo}" alt="Vijay" class="sf-logo"><p>${FOOT.about}</p></div>
      <ul class="sf-r">
        <li><i class="bi bi-send-fill"></i><a href="${map}" target="_blank" rel="noopener">${FOOT.address}</a></li>
        <li><i class="bi bi-globe2"></i><a href="https://${FOOT.web}" target="_blank" rel="noopener">${FOOT.web}</a></li>
        <li><i class="bi bi-telephone-fill"></i><a href="tel:${FOOT.phone.replace(/[^\d+]/g,'')}">${FOOT.phone}</a></li>
        <li><i class="bi bi-envelope"></i><a href="mailto:${FOOT.email}">${FOOT.email}</a></li>
      </ul>
    </div>
    <div class="sf-bot"><span>${FOOT.copy}</span><span>Design &amp; Developed by <b>${FOOT.dev}</b></span></div>
  </div></footer>`;
}