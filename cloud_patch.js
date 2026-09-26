(function(){
  const C = window.NPS_KING_CONFIG || {};
  if (!window.supabase || !C.SUPABASE_URL || !C.SUPABASE_ANON_KEY) return;
  const db = window.supabase.createClient(C.SUPABASE_URL, C.SUPABASE_ANON_KEY);
  window.npsDb = db;
  const adminEmail = C.ADMIN_EMAIL;
  const originalInit = window.initApp;

  function safeId(){ return Date.now() + Math.floor(Math.random()*1000); }
  function normalizeLead(r){ return { id:r.id, date:r.lead_date || new Date(r.created_at).toLocaleDateString('gu-IN'), name:r.name||'', phone:r.phone||'', email:r.email||'', city:r.city||'', state:r.state||'', budget:r.budget||'', source:r.source||'Website Direct', keyword:r.keyword||'Direct Visit', campaign:r.campaign||'', campaignId:r.campaign_id||'', adGroup:r.ad_group||'', gclid:r.gclid||'' }; }

  async function loadCloud(){
    try {
      const [s,c,l,k] = await Promise.all([
        db.from('site_settings').select('data').eq('id','main').maybeSingle(),
        db.from('customers').select('*').order('updated_at',{ascending:false}),
        db.from('leads').select('*').order('created_at',{ascending:false}),
        db.from('google_keywords').select('*').order('created_at',{ascending:false})
      ]);
      // IMPORTANT: never replace working local/default data with an empty cloud table.
      // This prevents the website from appearing blank when Supabase has not been seeded yet.
      if (s.data?.data && Object.keys(s.data.data).length) {
        siteData = {...siteData,...s.data.data};
      }
      if (Array.isArray(c.data) && c.data.length) {
        siteData.customers=c.data.map(x=>({id:x.id,name:x.name,phone:x.phone,pran:x.pran,city:x.city,corpus:x.corpus,status:x.status,planType:x.plan_type,notes:x.notes,date:x.date}));
      } else if (!Array.isArray(siteData.customers)) {
        siteData.customers=[];
      }
      if (Array.isArray(l.data) && l.data.length) leadInquiries=l.data.map(normalizeLead);
      else if (!Array.isArray(leadInquiries)) leadInquiries=[];
      window.npsKeywords=Array.isArray(k.data)?k.data:[];
    } catch(e){ console.warn('Cloud load failed',e); }
  }

  window.initApp = async function(){
    // First restore the site's existing local/default data, then overlay Supabase data.
    // This is essential when the Supabase tables are empty or not yet seeded.
    try { if (typeof originalInit === 'function') originalInit(); } catch(e){ console.warn('Local init failed',e); }
    try { await loadCloud(); } catch(e){}
    if (typeof detectGoogleVisitor==='function') detectGoogleVisitor();
    if (typeof renderDynamicContent==='function') renderDynamicContent();
    if (typeof updateCustomerStatistics==='function') updateCustomerStatistics();
    if (typeof calculatePension==='function') calculatePension();
    if (isAdminLoggedIn) renderKeywordManager();
  };

  window.processAdminLogin = async function(){
    const pass=document.getElementById('admin-pass-input')?.value||'';
    if(!pass) return showToast('પાસવર્ડ નાખો.');
    const {data,error}=await db.auth.signInWithPassword({email:adminEmail,password:pass});
    if(error || !data.user || data.user.email?.toLowerCase()!==adminEmail.toLowerCase()) return showToast('લોગઇન વિગતો ખોટી છે.');
    isAdminLoggedIn=true;
    document.getElementById('admin-login-screen')?.classList.add('hidden');
    document.getElementById('admin-dashboard')?.classList.remove('hidden');
    await loadCloud();
    if(typeof populateAdminForms==='function') populateAdminForms();
    renderKeywordManager();
    showToast('સિક્યોર એડમિન લોગઇન સફળ!');
  };
  window.adminLogout=async function(){ await db.auth.signOut(); isAdminLoggedIn=false; document.getElementById('admin-dashboard')?.classList.add('hidden'); document.getElementById('admin-login-screen')?.classList.remove('hidden'); };

  async function saveLeadCloud(lead){
    const {error}=await db.from('leads').insert({id:lead.id||safeId(),lead_date:lead.date,name:lead.name,phone:lead.phone,email:lead.email||'',city:lead.city,state:lead.state||'Gujarat',budget:lead.budget,source:lead.source,keyword:lead.keyword,campaign:lead.campaign||'',campaign_id:lead.campaignId||'',ad_group:lead.adGroup||'',gclid:lead.gclid||'',raw_data:lead});
    if(error) throw error;
  }
  window.submitInquiry = async function(e){
    e.preventDefault();
    const name=document.getElementById('lead-name').value.trim(), phone=document.getElementById('lead-phone').value.trim(), city=document.getElementById('lead-city').value.trim(), budget=document.getElementById('lead-budget').value;
    const lead={id:safeId(),date:new Date().toLocaleDateString('gu-IN'),name,phone,city,budget,source:visitorSource,keyword:visitorKeyword,state:'Gujarat'};
    try { await saveLeadCloud(lead); leadInquiries.unshift(lead); } catch(err){ console.error(err); showToast('લીડ સેવ કરવામાં સમસ્યા આવી.'); return; }
    const rawPhone=(siteData.phone||'').replace(/[^0-9]/g,'');
    const msg=`હેલો ${siteData.name} (${siteData.brand}),\n\nમારે પેન્શન પ્લાન વિશે વધુ વિગતો જોઈએ છે:\n👤 નામ: ${name}\n📱 મોબાઈલ: ${phone}\n📍 શહેર: ${city}\n💼 અંદાજિત બજેટ: ${budget}\n🌐 સોર્સ: ${visitorSource}\n🔎 કીવર્ડ: ${visitorKeyword}`;
    window.open(`https://wa.me/${rawPhone}?text=${encodeURIComponent(msg)}`,'_blank');
    updateCustomerStatistics(); showToast('ઇન્ક્વાયરી સફળતાપૂર્વક નોંધાઈ ગઈ!'); e.target.reset();
  };

  async function reloadKeywords(){ const {data,error}=await db.from('google_keywords').select('*').order('created_at',{ascending:false}); if(!error) window.npsKeywords=data||[]; renderKeywordManager(); }
  window.addGoogleKeyword=async function(){ const input=document.getElementById('new-google-keyword'), type=document.getElementById('new-google-match'); const keyword=(input?.value||'').trim(); if(!keyword) return showToast('કીવર્ડ લખો.'); const {error}=await db.from('google_keywords').insert({keyword,match_type:type?.value||'phrase'}); if(error) return showToast(error.code==='23505'?'આ કીવર્ડ પહેલેથી છે.':error.message); input.value=''; await reloadKeywords(); showToast('કીવર્ડ ઉમેરાયો.'); };
  window.updateGoogleKeyword=async function(id,keyword,match_type,active){ const {error}=await db.from('google_keywords').update({keyword,match_type,active,updated_at:new Date().toISOString()}).eq('id',id); if(error) return showToast(error.message); await reloadKeywords(); showToast('કીવર્ડ અપડેટ થયો.'); };
  window.deleteGoogleKeyword=async function(id){ if(!confirm('આ કીવર્ડ ડિલીટ કરવો છે?')) return; const {error}=await db.from('google_keywords').delete().eq('id',id); if(error) return showToast(error.message); await reloadKeywords(); showToast('કીવર્ડ ડિલીટ થયો.'); };

  window.renderKeywordManager=function(){
    const box=document.getElementById('nps-keyword-manager'); if(!box) return;
    const list=window.npsKeywords||[];
    box.innerHTML=`<div class="bg-navy-900/90 border border-gold-500/30 rounded-xl p-4 space-y-3"><div class="flex flex-wrap justify-between gap-2 items-center"><div><h5 class="text-sm font-bold text-gold-400"><i class="fa-solid fa-tags"></i> Google Keywords Manager</h5><p class="text-[10px] text-slate-400">Unlimited keywords • Add / Edit / Delete • Supabaseમાં સેવ</p></div><span class="bg-gold-500 text-navy-900 px-2 py-1 rounded-full text-[10px] font-black">${list.length} Keywords</span></div><div class="flex gap-2"><input id="new-google-keyword" class="flex-1 bg-navy-800 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" placeholder="NPS pension plan Gujarat"><select id="new-google-match" class="bg-navy-800 border border-slate-700 rounded-lg px-2 text-xs text-white"><option value="exact">Exact</option><option value="phrase" selected>Phrase</option><option value="broad">Broad</option></select><button onclick="addGoogleKeyword()" class="bg-emerald-600 text-white px-3 rounded-lg text-xs font-bold">+ Add</button></div><div class="max-h-72 overflow-y-auto space-y-2">${list.map(k=>`<div class="flex flex-wrap items-center gap-2 bg-navy-800 border border-slate-700 rounded-lg p-2"><input value="${esc(k.keyword)}" id="kw-${k.id}" class="flex-1 min-w-[180px] bg-navy-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"><select id="kt-${k.id}" class="bg-navy-900 border border-slate-700 rounded px-2 py-1.5 text-xs text-white"><option ${k.match_type==='exact'?'selected':''}>exact</option><option ${k.match_type==='phrase'?'selected':''}>phrase</option><option ${k.match_type==='broad'?'selected':''}>broad</option></select><label class="text-[10px] text-slate-300"><input type="checkbox" id="ka-${k.id}" ${k.active?'checked':''}> Active</label><button onclick="updateGoogleKeyword('${k.id}',document.getElementById('kw-${k.id}').value,document.getElementById('kt-${k.id}').value,document.getElementById('ka-${k.id}').checked)" class="text-blue-300 text-xs">Save</button><button onclick="deleteGoogleKeyword('${k.id}')" class="text-rose-400 text-xs">Delete</button></div>`).join('')}</div></div>`;
  };
  function esc(v){return String(v||'').replace(/[&<>"']/g,m=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[m]));}

  const oldRenderLeads = window.renderAdminLeadsTable;
  window.renderAdminLeadsTable = function(){
    const q=(document.getElementById('nps-lead-keyword-filter')?.value||'').trim().toLowerCase();
    const st=(document.getElementById('nps-lead-state-filter')?.value||'').trim().toLowerCase();
    if(!q && !st) return oldRenderLeads && oldRenderLeads();
    const original=leadInquiries;
    leadInquiries=original.filter(l=>(!q || String(l.keyword||'').toLowerCase().includes(q)) && (!st || String(l.state||'').toLowerCase()===st));
    try { oldRenderLeads && oldRenderLeads(); } finally { leadInquiries=original; }
  };
  function injectLeadFilters(){
    const pane=document.getElementById('admin-pane-leads'); if(!pane || document.getElementById('nps-lead-filters')) return;
    const wrap=document.createElement('div'); wrap.id='nps-lead-filters'; wrap.className='grid grid-cols-1 sm:grid-cols-3 gap-2';
    wrap.innerHTML='<input id="nps-lead-keyword-filter" oninput="renderAdminLeadsTable()" class="bg-navy-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white" placeholder="🔎 Keyword filter"><select id="nps-lead-state-filter" onchange="renderAdminLeadsTable()" class="bg-navy-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-white"><option value="">બધા રાજ્ય</option><option value="gujarat">Gujarat</option><option value="ગુજરાત">ગુજરાત</option></select><div class="bg-navy-900 border border-slate-700 rounded-lg px-3 py-2 text-xs text-gold-400">Google Leads: <b id="nps-google-lead-filter-count">0</b></div>';
    pane.insertBefore(wrap,pane.children[1]||null);
  }
  function updateGoogleWebhookUI(){
    const input=[...document.querySelectorAll('#admin-pane-google-leads input[readonly]')].find(x=>x.value.includes('/api/webhook/google-leads'));
    if(input) input.value=(C.SUPABASE_URL||'')+'/functions/v1/google-leads?key=YOUR_WEBHOOK_KEY';
    const p=document.querySelector('#admin-pane-google-leads p.text-slate-400');
    if(p) p.innerHTML='Google Ads Lead Formમાંથી આવતી lead સીધી Supabase CRMમાં આવશે. પહેલા Edge Function deploy કરો અને webhook key સેટ કરો.';
    document.querySelectorAll('#admin-login-screen p').forEach(x=>{ if(x.innerText.includes('ડિફોલ્ટ પાસવર્ડ')) x.remove(); });
  }
  window.simulateGoogleLeadInjection = async function(){
    const keywords=window.npsKeywords||[]; const keyword=keywords.find(k=>k.active)?.keyword || 'NPS Pension Plan Gujarat';
    const names=['મહેશભાઈ વ્યાસ','જિગ્નેશભાઈ પંડ્યા','અશોકભાઈ પટેલ','વિજયસિંહ પરમાર']; const cities=['અમદાવાદ','રાજકોટ','સુરત','વડોદરા','ભાવનગર'];
    const lead={id:safeId(),date:new Date().toLocaleDateString('gu-IN'),name:names[Math.floor(Math.random()*names.length)],phone:'98'+Math.floor(10000000+Math.random()*90000000),city:cities[Math.floor(Math.random()*cities.length)],state:'Gujarat',budget:'₹25,00,000 થી ₹50,00,000',source:'Google Ads (Test)',keyword};
    try{await saveLeadCloud(lead);leadInquiries.unshift(lead);renderAdminLeadsTable();updateCustomerStatistics();showToast('Google test lead Supabaseમાં ઉમેરાઈ.');}catch(e){showToast('Test lead error: '+e.message);}
  };
  window.saveAllAdminData = async function(){
    siteData.brand=document.getElementById('edit-brand').value; siteData.name=document.getElementById('edit-name').value; siteData.phone=document.getElementById('edit-phone').value; siteData.address=document.getElementById('edit-address').value; siteData.rate=document.getElementById('edit-rate').value; siteData.branches=document.getElementById('edit-branches').value; siteData.experience=document.getElementById('edit-exp').value;
    const publicData={...siteData}; delete publicData.customers; delete publicData.adminPass; const {error}=await db.from('site_settings').upsert({id:'main',data:publicData,updated_at:new Date().toISOString()}); if(error)return showToast(error.message); renderDynamicContent(); updateCustomerStatistics(); showToast('તમામ ફેરફારો Supabaseમાં સેવ થયા.');
  };
  window.updateAdminPassword = async function(){
    const curr=document.getElementById('change-pass-current').value, newP=document.getElementById('change-pass-new').value; if(!newP||newP.length<6)return showToast('નવો પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરનો હોવો જોઈએ.');
    const {error:reauth}=await db.auth.signInWithPassword({email:adminEmail,password:curr}); if(reauth)return showToast('હાલનો પાસવર્ડ ખોટો છે.');
    const {error}=await db.auth.updateUser({password:newP}); if(error)return showToast(error.message); document.getElementById('change-pass-current').value=''; document.getElementById('change-pass-new').value=''; showToast('પાસવર્ડ અપડેટ થયો.');
  };

  // Replace old localStorage customer/lead operations with cloud-backed operations where possible.
  const oldSaveCustomer=window.saveCustomerRecord;
  window.saveCustomerRecord=async function(e){ e.preventDefault(); const editId=document.getElementById('cust-id').value; const row={id:editId?Number(editId):safeId(),name:document.getElementById('cust-name').value.trim(),phone:document.getElementById('cust-phone').value.trim(),pran:document.getElementById('cust-pran').value.trim(),city:document.getElementById('cust-city').value.trim(),corpus:document.getElementById('cust-corpus').value.trim(),status:document.getElementById('cust-status').value,plan_type:document.getElementById('cust-plan').value,notes:document.getElementById('cust-notes').value.trim(),date:new Date().toLocaleDateString('gu-IN'),updated_at:new Date().toISOString()}; const {error}=await db.from('customers').upsert(row); if(error)return showToast(error.message); await loadCloud(); closeCustomerModal(); updateCustomerStatistics(); renderAdminCustomerTable(); showToast('કસ્ટમર સેવ થયો.'); };
  window.deleteLead=async function(index){ const lead=leadInquiries[index]; if(!lead)return; if(!confirm('આ લીડ ડિલીટ કરવી છે?'))return; const {error}=await db.from('leads').delete().eq('id',lead.id); if(error)return showToast(error.message); leadInquiries.splice(index,1); renderAdminLeadsTable(); updateCustomerStatistics(); showToast('લીડ ડિલીટ થઈ ગઈ.'); };
  window.clearAllLeads=async function(){ if(!confirm('બધી લીડ્સ ડિલીટ કરવી છે?'))return; const {error}=await db.from('leads').delete().not('id','is',null); if(error)return showToast(error.message); leadInquiries=[]; renderAdminLeadsTable(); updateCustomerStatistics(); showToast('બધી લીડ્સ સાફ થઈ ગઈ.'); };

  // Inject keyword manager into existing Google admin pane.
  window.addEventListener('load',()=>{ const pane=document.getElementById('admin-pane-google-leads'); if(pane && !document.getElementById('nps-keyword-manager')){ const d=document.createElement('div'); d.id='nps-keyword-manager'; pane.appendChild(d); } renderKeywordManager(); injectLeadFilters(); updateGoogleWebhookUI(); });
})();
