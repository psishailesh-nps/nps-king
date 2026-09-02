/* NPS KING cloud backend adapter: Supabase */
(function () {
  const cfg = window.NPS_KING_CONFIG || {};
  if (!cfg.SUPABASE_URL || cfg.SUPABASE_URL.includes('YOUR-PROJECT') || !cfg.SUPABASE_ANON_KEY || cfg.SUPABASE_ANON_KEY.includes('YOUR_')) {
    console.warn('NPS KING: Supabase config is not filled yet.');
    return;
  }

  const supabase = window.supabase.createClient(cfg.SUPABASE_URL, cfg.SUPABASE_ANON_KEY);
  window.npsSupabase = supabase;

  function customerFromDb(c) {
    return { id:c.id, name:c.name||'', phone:c.phone||'', pran:c.pran||'', city:c.city||'', corpus:c.corpus||'', planType:c.plan_type||'', status:c.status||'pending', notes:c.notes||'', date:c.created_at ? new Date(c.created_at).toLocaleDateString('gu-IN') : '' };
  }
  function leadFromDb(l) {
    return { id:l.id, date:l.created_at ? new Date(l.created_at).toLocaleDateString('gu-IN') : '', name:l.name||'', phone:l.phone||'', city:l.city||'', budget:l.budget||'', source:l.source||'Website Direct', keyword:l.keyword||'Direct Visit' };
  }
  function settingsPayload() {
    const copy = JSON.parse(JSON.stringify(siteData || {}));
    delete copy.customers;
    delete copy.adminPass;
    return copy;
  }

  window.initApp = async function () {
    try {
      const { data: settings } = await supabase.from('site_settings').select('data').eq('id','main').maybeSingle();
      if (settings && settings.data) siteData = { ...defaultData, ...settings.data, customers: [] };
      else siteData = JSON.parse(JSON.stringify(defaultData));
      const { data: customers, error: ce } = await supabase.from('customers').select('*').order('created_at',{ascending:false});
      if (!ce && customers) siteData.customers = customers.map(customerFromDb);
      const { data: leads, error: le } = await supabase.from('leads').select('*').order('created_at',{ascending:false});
      if (!le && leads) leadInquiries = leads.map(leadFromDb);
      detectGoogleVisitor(); renderDynamicContent(); updateCustomerStatistics(); calculatePension();
    } catch (e) { console.error(e); siteData = JSON.parse(JSON.stringify(defaultData)); leadInquiries = []; renderDynamicContent(); updateCustomerStatistics(); calculatePension(); }
  };

  window.processAdminLogin = async function () {
    const pass = document.getElementById('admin-pass-input').value;
    if (!pass) return showToast('પાસવર્ડ નાખો.');
    if (!cfg.ADMIN_EMAIL || cfg.ADMIN_EMAIL.includes('YOUR_')) return showToast('config.js માં ADMIN_EMAIL સેટ કરો.');
    const { error } = await supabase.auth.signInWithPassword({ email: cfg.ADMIN_EMAIL, password: pass });
    if (error) return showToast('લોગિન નિષ્ફળ: ' + error.message);
    isAdminLoggedIn = true; showToast('સફળતાપૂર્વક લોગીન થયું!');
    document.getElementById('admin-login-screen').classList.add('hidden');
    document.getElementById('admin-dashboard').classList.remove('hidden');
    await initApp(); populateAdminForms();
  };

  window.adminLogout = async function () { await supabase.auth.signOut(); isAdminLoggedIn=false; document.getElementById('admin-pass-input').value=''; showToast('લોગઆઉટ થઈ ગયું.'); switchTab('landing'); };

  window.submitInquiry = async function (e) {
    e.preventDefault();
    const name=document.getElementById('lead-name').value.trim(), phone=document.getElementById('lead-phone').value.trim(), city=document.getElementById('lead-city').value.trim(), budget=document.getElementById('lead-budget').value;
    const { error } = await supabase.from('leads').insert({name,phone,city,budget,source:visitorSource,keyword:visitorKeyword});
    if (error) return showToast('ઇન્ક્વાયરી સેવ થઈ નથી: '+error.message);
    const { data: leads } = await supabase.from('leads').select('*').order('created_at',{ascending:false}); leadInquiries=(leads||[]).map(leadFromDb); updateCustomerStatistics();
    const rawPhone=(siteData.phone||'').replace(/[^0-9]/g,''); const msg=`હેલો ${siteData.name} (${siteData.brand}),\n\nમારે પેન્શન પ્લાન વિશે વધુ વિગતો જોઈએ છે:\n👤 નામ: ${name}\n📱 મોબાઈલ: ${phone}\n📍 શહેર: ${city}\n💼 અંદાજિત બજેટ: ${budget}\n🌐 સોર્સ: ${visitorSource}`;
    window.open(`https://wa.me/${rawPhone}?text=${encodeURIComponent(msg)}`,'_blank'); showToast('ઇન્ક્વાયરી સફળતાપૂર્વક નોંધાઈ ગઈ!'); e.target.reset();
  };

  window.saveCustomerRecord = async function(e) {
    e.preventDefault();
    const id=document.getElementById('cust-id').value; const row={name:document.getElementById('cust-name').value.trim(),phone:document.getElementById('cust-phone').value.trim(),pran:document.getElementById('cust-pran').value.trim(),city:document.getElementById('cust-city').value.trim(),corpus:document.getElementById('cust-corpus').value.trim(),status:document.getElementById('cust-status').value,plan_type:document.getElementById('cust-plan').value,notes:document.getElementById('cust-notes').value.trim()};
    const res=id ? await supabase.from('customers').update(row).eq('id',id) : await supabase.from('customers').insert(row); if(res.error) return showToast('કસ્ટમર સેવ થયો નથી: '+res.error.message);
    const {data}=await supabase.from('customers').select('*').order('created_at',{ascending:false}); siteData.customers=(data||[]).map(customerFromDb); closeCustomerModal(); updateCustomerStatistics(); renderAdminCustomerTable(); showToast('કસ્ટમર વિગતો સેવ થઈ ગઈ!');
  };

  window.updateCustomerStatusDirect = async function(index,newStatus){ const c=siteData.customers[index]; if(!c)return; const {error}=await supabase.from('customers').update({status:newStatus,updated_at:new Date().toISOString()}).eq('id',c.id); if(error)return showToast('સ્ટેટસ અપડેટ થયું નથી.'); c.status=newStatus; updateCustomerStatistics(); renderAdminCustomerTable(); showToast('સ્ટેટસ અપડેટ થઈ ગયું!'); };
  window.deleteCustomerRecord = async function(index){ const c=siteData.customers[index]; if(!c||!confirm('શું તમે આ કસ્ટમરની વિગતો કાયમ માટે ડિલીટ કરવા માગો છો?'))return; const {error}=await supabase.from('customers').delete().eq('id',c.id); if(error)return showToast('ડિલીટ થયું નથી.'); siteData.customers.splice(index,1); updateCustomerStatistics(); renderAdminCustomerTable(); showToast('કસ્ટમર રેકોર્ડ ડિલીટ થયો.'); };
  window.deleteLead = async function(index){ const l=leadInquiries[index]; if(!l)return; const {error}=await supabase.from('leads').delete().eq('id',l.id); if(error)return showToast('લીડ ડિલીટ થઈ નથી.'); leadInquiries.splice(index,1); renderAdminLeadsTable(); updateCustomerStatistics(); showToast('લીડ ડિલીટ થઈ ગઈ.'); };
  window.clearAllLeads = async function(){ if(!confirm('શું તમે બધી લીડ્સ ડિલીટ કરવા માગો છો?'))return; const {error}=await supabase.from('leads').delete().neq('id',0); if(error)return showToast('લીડ્સ ડિલીટ થઈ નથી.'); leadInquiries=[]; renderAdminLeadsTable(); updateCustomerStatistics(); showToast('બધી લીડ્સ સાફ થઈ ગઈ.'); };

  window.saveAllAdminData = async function(){
    siteData.brand=document.getElementById('edit-brand').value; siteData.name=document.getElementById('edit-name').value; siteData.phone=document.getElementById('edit-phone').value; siteData.address=document.getElementById('edit-address').value; siteData.rate=document.getElementById('edit-rate').value; siteData.branches=document.getElementById('edit-branches').value; siteData.experience=document.getElementById('edit-exp').value;
    const {error}=await supabase.from('site_settings').upsert({id:'main',data:settingsPayload(),updated_at:new Date().toISOString()}); if(error)return showToast('સેટિંગ્સ સેવ થઈ નથી: '+error.message); renderDynamicContent(); updateCustomerStatistics(); showToast('તમામ ફેરફારો સેવ થઈ ગયા છે!');
  };

  window.updateAdminPassword = async function(){
    const curr=document.getElementById('change-pass-current').value, newP=document.getElementById('change-pass-new').value; if(!newP||newP.length<6)return showToast('નવો પાસવર્ડ ઓછામાં ઓછો 6 અક્ષરનો હોવો જોઈએ.');
    const {data:session}=await supabase.auth.getSession(); const email=session.session?.user?.email || cfg.ADMIN_EMAIL; const reauth=await supabase.auth.signInWithPassword({email,password:curr}); if(reauth.error)return showToast('હાલનો પાસવર્ડ ખોટો છે.'); const {error}=await supabase.auth.updateUser({password:newP}); if(error)return showToast('પાસવર્ડ અપડેટ થયો નથી: '+error.message); document.getElementById('change-pass-current').value=''; document.getElementById('change-pass-new').value=''; showToast('પાસવર્ડ સફળતાપૂર્વક અપડેટ થયો!');
  };

  // Replace public status lookup with the secure RPC.
  window.checkPublicStatus = async function(){
    const query=document.getElementById('public-track-input').value.trim(); const resultBox=document.getElementById('public-track-result'); if(!query)return showToast('કૃપા કરી મોબાઇલ નંબર અથવા PRAN દાખલ કરો');
    const {data,error}=await supabase.rpc('check_application',{search_value:query}); if(error)return showToast('સ્ટેટસ ચેક થઈ શક્યો નથી.'); resultBox.classList.remove('hidden'); const match=(data||[])[0];
    if(match){ const statusMsg=match.status==='completed'?'પેન્શન શરૂ / મંજૂર':match.status==='underprocess'?'ફાઈલ પ્રોસેસિંગ હેઠળ':'દસ્તાવેજ ચકાસણી / નવી અરજી'; resultBox.className='mt-3 p-3 rounded-xl border bg-emerald-950/40 border-emerald-700/60 text-left text-xs text-emerald-300 space-y-1'; resultBox.innerHTML=`<p class="font-bold">રેકોર્ડ મળ્યો</p><p><b>નામ:</b> ${match.name||''}</p><p><b>PRAN / અરજી નંબર:</b> ${match.pran||'ઉપલબ્ધ નથી'}</p><p class="text-gold-300">📌 <b>હાલની સ્થિતિ:</b> ${statusMsg}</p>`; }
    else { resultBox.className='mt-3 p-3 rounded-xl border bg-rose-950/40 border-rose-700/60 text-left text-xs text-rose-300 space-y-1'; resultBox.innerHTML='<p class="font-bold">કોઈ રેકોર્ડ મળ્યો નથી</p><p class="text-[11px]">દાખલ કરેલ વિગતો પર કોઈ સક્રિય અરજી મળી નથી.</p>'; }
  };
})();
