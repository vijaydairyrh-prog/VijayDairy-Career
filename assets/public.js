/* Public pages: two brands (units) — Vijay Dairy Milk and Vijay Bhavan (food).
   Jobs come from the database now: HR adds them in HR > Job Openings with a from-date / to-date. */
const UNITS = {
  Dairy:  {name:'Vijay Dairy Milk', logo:'../assets/vijay-logo.png',        icon:'droplet-fill'},
  Bhavan: {name:'Vijay Bhavan',     logo:'../assets/bhavan-logo.png',   icon:'cup-hot-fill'}};
const curUnit = () => (new URLSearchParams(location.search).get('unit')||'').toLowerCase()==='bhavan' ? 'Bhavan' : 'Dairy';

async function loadJobs(unit) {
  try { return await api('/jobs/?unit=' + unit, {noauth:true}); } catch(e) { return []; }
}

async function loadJobRoles(unit) {
  try { return await api('/job-roles/?unit=' + unit, {noauth:true}); } catch(e) { return []; }
}

/* ===== Site details (edit here: used by the footer and the Contact & Location section) ===== */
const SITE = {
  email: 'hr@example.com',
  phone: '+91 997-657-8588',
  address: '127 Vijay Bhavan Group, Center Road, Salanar Gahsi Bohari Road, Bijay Man 27000',
  mapQuery: 'Vijay Bhavan Veg Restaurant'
};

function pubShell() {
  const hrIn = !!tok(), path = location.pathname;
  if (new URLSearchParams(location.search).get('embed')) { document.body.classList.add('embed'); return; }  // forms shown inside the home-page popup have no nav/footer
  const isHome = path == '/' || path.endsWith('/') || path.endsWith('/employee/index.html');
  $('#nav').innerHTML = `<nav class="navbar navbar-expand-lg bg-white shadow-sm sticky-top pnavbar"><div class="container">
    <a class="navbar-brand m-0" href="../employee/index.html#top"><img src="../assets/vijay-logo.png" height="75" alt="Vijay Group"></a>
    <button class="navbar-toggler border-0" type="button" data-bs-toggle="collapse" data-bs-target="#pmenu" aria-controls="pmenu" aria-expanded="false" aria-label="Menu"><span class="navbar-toggler-icon"></span></button>
    <div class="collapse navbar-collapse" id="pmenu">
      <ul class="navbar-nav mx-auto gap-lg-2 align-items-lg-center">
        <li class="nav-item"><a class="nav-link" href="../employee/index.html#top">Home</a></li></ul>
      <a class="btn btn-primary px-4 rounded-pill" id="hrLoginBtn" href="../employee/index.html?login=1"><i class="bi bi-person-lock me-1"></i>HR Login</a>
    </div></div></nav>`;
  // Logo / Home link click -> home page, fully refreshed (from any other page it simply opens the home page)
  const goHome = e => { e.preventDefault();
    if (isHome) { history.replaceState(null, '', location.pathname); location.reload(); } else location = '../employee/index.html'; };
  document.querySelector('.pnavbar .navbar-brand').addEventListener('click', goHome);
  document.querySelectorAll('#pmenu a.nav-link').forEach(a => a.addEventListener('click', goHome));
  // HR Login opens a small popup instead of a new page (href stays as a no-JS fallback)
  $('#hrLoginBtn').addEventListener('click', e => { e.preventDefault(); openHrLogin(); });
  // arriving with ?login=1 (e.g. session expired / opened a dashboard page without logging in) -> open the popup
  if (new URLSearchParams(location.search).get('login')) { history.replaceState(null, '', location.pathname + location.hash); openHrLogin(); }
  // smooth in-page anchors + close the mobile menu after a tap
  document.querySelectorAll('#pmenu a.nav-link').forEach(a => a.addEventListener('click', () => { const m = bootstrap.Collapse.getInstance($('#pmenu')); if (m) m.hide(); }));
  const gm = 'https://www.google.com/maps/search/?api=1&query=' + encodeURIComponent(SITE.mapQuery);
  $('#foot').innerHTML = siteFooter();
  if (isHome) document.querySelector('#pmenu a.nav-link')?.classList.add('active');   // only the Home link is in the nav
}

/* Resume form opens in a popup on top of the home page (links marked data-apply) */
function openApply(href) {
  let m = $('#applyModal');
  if (!m) {
    document.body.insertAdjacentHTML('beforeend', `<div class="modal fade" id="applyModal" tabindex="-1" aria-hidden="true"><div class="modal-dialog modal-xl modal-dialog-scrollable modal-fullscreen-lg-down"><div class="modal-content"><div class="modal-header py-2"><b><i class="bi bi-file-earmark-person me-2"></i>Submit Your Resume</b><button type="button" class="btn-close" data-bs-dismiss="modal" aria-label="Close"></button></div><div class="modal-body p-0"><iframe id="applyFrame" title="Resume form" style="width:100%;height:78vh;border:0;display:block"></iframe></div></div></div></div>`);
    m = $('#applyModal');
    addEventListener('message', e => { if (e.origin === location.origin && e.data === 'close-apply') bootstrap.Modal.getInstance(m)?.hide(); });
    m.addEventListener('hidden.bs.modal', () => { $('#applyFrame').src = 'about:blank'; });
  }
  $('#applyFrame').src = href + (href.includes('?') ? '&' : '?') + 'embed=1';
  bootstrap.Modal.getOrCreateInstance(m).show();
}
document.addEventListener('click', e => { const a = e.target.closest('a[data-apply]'); if (a) { e.preventDefault(); openApply(a.getAttribute('href')); } });

function jobCards(list, unit) {
  const cols = ['#2563eb','#06b6d4','#ef4444','#8b5cf6'], gb = ['#2f7d32','#7a1230','#c62828','#b8860b'];
  if (!list.length) return `<div class="col-12"><div class="alert alert-light border mb-0">No openings right now. You can still <a data-apply href="../employee/resume-register.html?unit=${unit}">submit a general resume</a>.</div></div>`;
  return list.map((j,i)=>{ const u = j._u || unit;   // j._u is set when jobs of both companies are shown together
    return `<div class="col-sm-6 col-lg-3"><div class="card jobcard h-100"><div class="card-body"><span class="ji mb-3" style="background:${u=='Bhavan'?'#c62828':'#2563eb'}"><i class="bi bi-${UNITS[u].icon}"></i></span>
    ${j._u ? `<div class="mb-1"><span class="badge ${u=='Bhavan'?'bg-success-subtle text-success':'bg-primary-subtle text-primary'}">${UNITS[u].name}</span></div>` : ''}<h6 class="fw-bold">${esc(j.title)}</h6>
    <div class="small text-muted mb-1"><i class="bi bi-geo-alt"></i> ${esc(j.location)}</div><div class="small text-muted mb-1"><i class="bi bi-clock"></i> ${esc(j.job_type)}</div>
    <div class="small text-muted mb-3"><i class="bi bi-calendar-event"></i> Apply by ${fd(j.end_date)}</div>
    <a class="btn btn-primary btn-sm w-100" href="../employee/resume-register.html?unit=${u}&role=${encodeURIComponent(j.title)}&loc=${encodeURIComponent(j.location)}">Apply Now</a></div></div></div>`; }).join('');
}


/* Current Openings on the home page: ONE row of cards. Next / Previous move ONE card at a time, endlessly in both directions
   (the cards are repeated 3 times; after every move the strip silently jumps back to the middle copy). Swipe works on phones. */
let jIdx = 0, jN = 0, jCan = false, jBusy = false, jOrig = '';
function jobSlider(list, unit) {
  if (!list.length) return `<div class="row g-3">${jobCards(list, unit)}</div>`;
  return `<div class="jsl"><button type="button" class="jbtn prev" aria-label="Previous openings" onclick="jslide(1)"><i class="bi bi-chevron-left"></i></button>
    <div class="jvp"><div class="jscroll" id="jscroll">${jobCards(list, unit)}</div></div>
    <button type="button" class="jbtn next" aria-label="Next openings" onclick="jslide(-1)"><i class="bi bi-chevron-right"></i></button></div>`;
}
const jStep = () => $('#jscroll').firstElementChild.offsetWidth + 16;            // card width + gap
function jPos(anim) { const t = $('#jscroll'); t.style.transition = anim ? 'transform .4s ease' : 'none'; t.style.transform = `translateX(${-jIdx * jStep()}px)`; }
function jBuild() {                                                              // (re)build the strip for the current screen size
  const t = $('#jscroll'); if (!t) return;
  t.innerHTML = jOrig; jN = t.children.length;
  const vis = Math.round(($('.jvp').clientWidth + 16) / jStep());               // cards visible at once (5 / 2 / 1)
  jCan = jN > vis;
  if (jCan) { t.innerHTML = jOrig + jOrig + jOrig; jIdx = jN; } else jIdx = 0;   // start on the middle copy
  jPos(false); jBusy = false;
  document.querySelectorAll('.jsl .jbtn').forEach(b => b.classList.toggle('d-none', !jCan));   // no buttons when every card already fits
}
function jslide(d) {
  if (!jCan || jBusy) return; jBusy = true;
  jIdx += d; jPos(true);                                                         // jslide(1): cards move right-to-left | jslide(-1): cards move left-to-right.  Next button = jslide(-1), Previous button = jslide(1)
  setTimeout(() => { if (jIdx >= 2 * jN) jIdx -= jN; else if (jIdx < jN) jIdx += jN;   // wrap around invisibly
    jPos(false); $('#jscroll').offsetWidth; jBusy = false; }, 420);
}
function jslideInit() {
  const t = $('#jscroll'); if (!t) return;
  jOrig = t.innerHTML; jBuild();
  let rt; addEventListener('resize', () => { clearTimeout(rt); rt = setTimeout(jBuild, 150); });
  let x0 = null; const vp = $('.jvp');
  vp.addEventListener('touchstart', e => { x0 = e.touches[0].clientX; }, {passive:true});
  vp.addEventListener('touchend', e => { if (x0 === null) return; const dx = e.changedTouches[0].clientX - x0; x0 = null; if (Math.abs(dx) > 40) jslide(dx < 0 ? 1 : -1); });
}


/* ===== HR Login popup (small modal on the home page; on success -> HR dashboard) ===== */
function openHrLogin() {
  if (tok()) { location = '../hr/dashboard.html'; return; }       // already signed in
  let m = $('#hrLoginModal');
  if (!m) {
    document.body.insertAdjacentHTML('beforeend', `<div class="modal fade" id="hrLoginModal" tabindex="-1" aria-labelledby="hrLoginTitle" aria-hidden="true"><div class="modal-dialog modal-dialog-centered" style="max-width:380px"><div class="modal-content border-0 shadow-lg rounded-4">
      <div class="modal-header border-0 pb-0"><button type="button" class="btn-close ms-auto" data-bs-dismiss="modal" aria-label="Close"></button></div>
      <div class="modal-body px-4 pb-4 pt-0"><div class="text-center mb-3"><img src="../assets/vijay-logo.png" height="52" alt="Vijay Group"></div>
        <h5 class="text-center mb-3" id="hrLoginTitle">HR Login</h5><div id="hlErr"></div>
        <form id="hlForm" novalidate>
          <input id="hlU" type="text" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username" class="form-control mb-3" placeholder="Email address" required>
          <div class="input-group mb-3"><input id="hlP" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="current-password" class="form-control" placeholder="Password" required><button type="button" class="btn btn-outline-secondary" id="hlEye" aria-label="Show password"><i class="bi bi-eye"></i></button></div>
          <button class="btn btn-primary w-100 rounded-pill" id="hlBtn">Login</button></form>
        <form id="hsForm" class="d-none" novalidate>
          <div class="small text-muted text-center mb-3">First time setup. Create your HR login.</div>
          <input id="hsU" type="text" inputmode="email" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="username" class="form-control mb-3" placeholder="Email address" required>
          <input id="hsP" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="new-password" class="form-control mb-3" placeholder="New password (min 8 characters)" required>
          <input id="hsC" type="password" autocapitalize="none" autocorrect="off" spellcheck="false" autocomplete="new-password" class="form-control mb-3" placeholder="Confirm password" required>
          <button class="btn btn-primary w-100 rounded-pill" id="hsBtn">Create HR account</button></form>
        <div id="hlG"><div class="text-center text-muted my-3 small">or</div><div id="hlGbtn" class="d-flex justify-content-center"></div></div>
      </div></div></div></div>`);
    m = $('#hrLoginModal');
    const done = d => { localStorage.setItem('access', d.access); localStorage.setItem('refresh', d.refresh); location = '../hr/dashboard.html'; };
    const showErr = x => { $('#hlErr').innerHTML = `<div class="alert alert-danger py-2 small">${fe(x)}</div>`; };
    $('#hlEye').onclick = () => { const p = $('#hlP'), show = p.type == 'password'; p.type = show ? 'text' : 'password'; $('#hlEye i').className = 'bi bi-eye' + (show ? '-slash' : ''); };
    $('#hlForm').onsubmit = async e => { e.preventDefault(); $('#hlErr').innerHTML = '';
      const b = $('#hlBtn'); b.disabled = true; b.textContent = 'Signing in...';
      try { done(await api('/auth/login/', {method:'POST', body:{username:$('#hlU').value.trim(), password:$('#hlP').value.trim()}, noauth:true})); }
      catch (x) { showErr(x); b.disabled = false; b.textContent = 'Login'; } };
    m.addEventListener('shown.bs.modal', () => $('#hlU').focus());
    m.addEventListener('hidden.bs.modal', () => { $('#hlErr').innerHTML = ''; $('#hlForm').reset(); });
    // first-time setup: only shown while the server has no HR user yet
    api('/auth/setup/', {noauth:true}).then(r => { if (!r.needed) return;
      $('#hlForm').classList.add('d-none'); $('#hlG')?.remove(); $('#hsForm').classList.remove('d-none'); $('#hrLoginTitle').textContent = 'Create HR Account';
      $('#hsForm').onsubmit = async e => { e.preventDefault(); $('#hlErr').innerHTML = '';
        const b = $('#hsBtn'); b.disabled = true; b.textContent = 'Creating...';
        try { done(await api('/auth/setup/', {method:'POST', body:{email:$('#hsU').value.trim(), password:$('#hsP').value, confirm:$('#hsC').value}, noauth:true})); }
        catch (x) { showErr(x); b.disabled = false; b.textContent = 'Create HR account'; } }; }).catch(() => {});
    // optional Google sign-in (only if the server has GOOGLE_CLIENT_ID)
    api('/auth/config/', {noauth:true}).catch(() => ({})).then(cfg => {
      if (!cfg.google_client_id) { $('#hlG').remove(); return; }
      const sc = document.createElement('script'); sc.src = 'https://accounts.google.com/gsi/client'; sc.async = true;
      sc.onload = () => { google.accounts.id.initialize({client_id: cfg.google_client_id, callback: async r => {
          try { done(await api('/auth/google/', {method:'POST', body:{credential:r.credential}, noauth:true})); } catch (x) { showErr(x); } }});
        google.accounts.id.renderButton($('#hlGbtn'), {theme:'outline', size:'large', text:'signin_with', width:280}); };
      document.head.append(sc); });
  }
  bootstrap.Modal.getOrCreateInstance(m).show();
}