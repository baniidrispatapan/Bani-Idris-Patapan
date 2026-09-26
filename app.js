const SUPABASE_URL = "https://xxlszlouqsnllwxroybw.supabase.co";
const SUPABASE_KEY = "sb_publishable_xtMKVLnAsX2Pd_zSkrsllQ_PyRvnwAc";
const db = supabase.createClient(SUPABASE_URL, SUPABASE_KEY);

let personA = null;
let personB = null;

const $ = (id) => document.getElementById(id);
const esc = (s="") => String(s).replace(/[&<>"']/g, m => ({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#039;'}[m]));

document.querySelectorAll("[data-scroll]").forEach(btn => {
  btn.addEventListener("click", () => document.querySelector(btn.dataset.scroll).scrollIntoView({behavior:"smooth"}));
});

async function loadStats(){
  const {data,error}=await db.rpc("get_public_stats");
  if(error){ console.error(error); return; }
  $("statPeople").textContent = data?.people ?? "—";
  $("statLinks").textContent = data?.parent_child ?? "—";
  $("statMarriages").textContent = data?.marriages ?? "—";
  $("statRefs").textContent = data?.cross_references ?? "—";
}

async function searchPeople(q){
  if(!q || q.trim().length < 1) return [];
  const {data,error} = await db.rpc("search_people",{p_query:q.trim(),p_limit:12});
  if(error){ console.error(error); return []; }
  return data || [];
}

function optionHTML(p){
  return `<div class="option" data-id="${p.id}">
    <strong>${esc(p.name)}</strong>
    <div class="meta">${esc(p.book_code || "tanpa kode")} · ID-${p.generation_no ?? "?"}${""}</div>
  </div>`;
}

function setupPicker(inputId, dropdownId, selectedId, which){
  const input = $(inputId), dd=$(dropdownId), selected=$(selectedId);
  let timer;
  input.addEventListener("input", ()=>{
    clearTimeout(timer);
    timer=setTimeout(async ()=>{
      const rows=await searchPeople(input.value);
      dd.innerHTML=rows.length?rows.map(optionHTML).join(""):`<div class="loading">Tidak ditemukan</div>`;
      dd.classList.add("show");
      dd.querySelectorAll(".option").forEach((el,i)=>{
        el.onclick=()=>{
          const p=rows[i];
          if(which==="A") personA=p; else personB=p;
          input.value=p.name;
          selected.classList.remove("empty");
          selected.innerHTML=`<strong>${esc(p.name)}</strong><div class="meta">${esc(p.book_code||"tanpa kode")} · ID-${p.generation_no ?? "?"}${p.address ? " · "+esc(p.address):""}</div>`;
          dd.classList.remove("show");
          updateCompare();
        };
      });
    },220);
  });
  input.addEventListener("focus", ()=>{ if(dd.innerHTML) dd.classList.add("show"); });
  document.addEventListener("click", e=>{ if(!e.target.closest(".picker")) dd.classList.remove("show"); });
}

function updateCompare(){
  $("compareBtn").disabled=!(personA && personB && personA.id!==personB.id);
}

function relationTitle(rel){
  if(rel.type==="SAME_PERSON") return "Orang yang sama";
  if(rel.type==="DIRECT_ANCESTOR" || rel.type==="DIRECT_DESCENDANT") return rel.label;
  if(rel.type==="SIBLING") return "Saudara";
  if(rel.type==="COLLATERAL"){
    return rel.local_name_a_to_b || rel.standard_name_a_to_b || rel.fallback_label || "Kerabat";
  }
  return rel.label || "Hubungan belum dapat ditentukan";
}

function pathHTML(title,path){
  if(!path || !path.length) return "";
  return `<div class="path"><strong>${esc(title)}</strong><ul>${
    path.map(x=>`<li>${esc(x.name)} ${x.book_code?`<span class="code">${esc(x.book_code)}</span>`:""}</li>`).join("")
  }</ul></div>`;
}

$("compareBtn").addEventListener("click", async ()=>{
  const box=$("relationResult");
  box.classList.remove("hidden");
  box.innerHTML=`<div class="loading" style="color:white">Menelusuri jalur nasab…</div>`;
  const {data,error}=await db.rpc("get_relationship_details",{p_person_a:personA.id,p_person_b:personB.id});
  if(error){
    box.innerHTML=`<div class="error" style="color:#ffd5d5">Gagal membaca hubungan: ${esc(error.message)}</div>`;
    return;
  }

  const rel=data || {};
  const title=relationTitle(rel);

  let badges=[];
  if(rel.type==="COLLATERAL"){
    badges.push(rel.same_generation ? "Generasi sejajar" : `Selisih ${rel.generation_gap} generasi`);
  }else{
    badges.push("Hubungan nasab");
  }
  if(rel.is_spouse) badges.push("Juga pasangan");

  let details="";
  if(rel.type==="COLLATERAL"){
    details += rel.common_ancestor_name
      ? `<p>Leluhur bersama terdekat: <strong style="color:white">${esc(rel.common_ancestor_name)}</strong></p>`
      : "";
    if(rel.distance_a!=null && rel.distance_b!=null){
      details += `<p>Jarak ke leluhur bersama: <strong style="color:white">${esc(personA.name)} ${rel.distance_a} generasi</strong> · <strong style="color:white">${esc(personB.name)} ${rel.distance_b} generasi</strong></p>`;
    }
    if(rel.same_generation===false && !rel.local_name_a_to_b && !rel.local_name_b_to_a){
      details += `<p style="font-size:13px">Istilah kekerabatan lokal untuk pola beda generasi ini belum diverifikasi. Sementara aplikasi memakai label netral berdasarkan jarak nasab.</p>`;
    }
  }else if(rel.type==="DIRECT_ANCESTOR" || rel.type==="DIRECT_DESCENDANT"){
    details += `<p>Jarak nasab: <strong style="color:white">${rel.distance} tingkat</strong></p>`;
  }

  if(rel.is_spouse){
    details += `<p><strong style="color:white">Catatan:</strong> selain memiliki hubungan nasab, keduanya juga tercatat sebagai pasangan${rel.is_internal_marriage ? " sesama keturunan Bani Idris" : ""}.</p>`;
  }

  box.innerHTML=`
    <p>${esc(personA.name)} ↔ ${esc(personB.name)}</p>
    <h3>${esc(title)}</h3>
    <div style="display:flex;gap:8px;flex-wrap:wrap;margin:8px 0 18px">
      ${badges.map(b=>`<div class="relation-label" style="margin:0">${esc(b)}</div>`).join("")}
    </div>
    ${details}
    <div class="paths">
      ${pathHTML(personA.name,rel.path_a)}
      ${pathHTML(personB.name,rel.path_b)}
    </div>`;
});

async function doGlobalSearch(){
  const q=$("globalSearch").value;
  const out=$("searchResults");
  out.innerHTML=`<div class="loading">Mencari…</div>`;
  const rows=await searchPeople(q);
  if(!rows.length){ out.innerHTML=`<div class="loading">Tidak ada data yang cocok.</div>`; return; }
  out.innerHTML=rows.map(p=>`
    <article class="person-card">
      <h3>${esc(p.name)}</h3>
      <span class="code">${esc(p.book_code||"tanpa kode")}</span>
      <span class="verify">${esc(p.verification_status||"")}</span>
      <div class="meta" style="margin-top:10px">Generasi: ID-${p.generation_no ?? "?"}</div>
      <div class="meta">Alamat disembunyikan pada tampilan publik</div>
    </article>`).join("");
}
$("globalSearchBtn").onclick=doGlobalSearch;
$("globalSearch").addEventListener("keydown",e=>{if(e.key==="Enter")doGlobalSearch();});

setupPicker("personAInput","personADropdown","personASelected","A");
setupPicker("personBInput","personBDropdown","personBSelected","B");
loadStats();


async function openProfile(person){
  const box=$("profileView");
  box.classList.remove("hidden");
  box.innerHTML=`<div class="loading">Memuat profil dan jalur nasab…</div>`;
  const [{data:profile,error:e1},{data:lineage,error:e2}] = await Promise.all([
    db.rpc("get_person_profile",{p_person_id:person.id}),
    db.rpc("get_lineage_to_root",{p_person_id:person.id,p_root_code:"ROOT"})
  ]);
  if(e1){
    box.innerHTML=`<div class="error">Gagal memuat profil: ${esc(e1.message)}</div>`; return;
  }
  const kin=(arr,empty="Belum tercatat") => (arr && arr.length)
    ? `<div class="kin-list">${arr.map(x=>`<div class="kin-item"><strong>${esc(x.name)}</strong><div class="meta">${esc(x.book_code||"tanpa kode")}${x.generation_no!=null?` · ID-${x.generation_no}`:""}</div></div>`).join("")}</div>`
    : `<div class="meta">${empty}</div>`;
  const lineageHtml = (!e2 && lineage && lineage.length)
    ? `<div class="lineage"><h4>Jalur menuju K. Idris Patapan</h4><div class="lineage-track">${
        lineage.map((x,i)=>`${i?'<div class="lineage-arrow">→</div>':''}<div class="lineage-node"><strong>${esc(x.name)}</strong><div class="meta">${esc(x.book_code||"")}${x.book_code==="ROOT"?" · Leluhur utama":""}</div></div>`).join("")
      }</div></div>`
    : `<div class="lineage"><div class="meta">Jalur lengkap ke K. Idris Patapan belum tersedia pada data yang telah diimpor.</div></div>`;
  box.innerHTML=`
    <div class="profile-head">
      <div>
        <span class="code">${esc(profile.book_code||"tanpa kode")}</span>
        <h3>${esc(profile.name)}</h3>
        <div class="meta">${profile.generation_no!=null?`Generasi ID-${profile.generation_no}`:"Generasi belum ditetapkan"} · ${esc(profile.verification_status||"")}</div>
      </div>
      <div class="meta">${profile.source_page?`Sumber buku hal. ${profile.source_page}`:""}</div>
    </div>
    <div class="profile-grid">
      <div class="profile-card"><h4>Orang tua</h4>${kin(profile.parents)}</div>
      <div class="profile-card"><h4>Pasangan</h4>${kin(profile.spouses)}</div>
      <div class="profile-card"><h4>Anak</h4>${kin(profile.children)}</div>
      <div class="profile-card"><h4>Sumber & verifikasi</h4>
        <div class="meta">${profile.source_page?`Sumber buku halaman ${profile.source_page}`:"Halaman sumber belum tercatat"}</div>
        <div class="meta" style="margin-top:8px">Status: ${esc(profile.verification_status||"UNVERIFIED")}</div>
        <div class="meta" style="margin-top:8px">Alamat, kode lokasi, tanggal lahir/wafat, dan catatan privat hanya dapat dilihat oleh admin/verifikator.</div>
      </div>
    </div>
    ${lineageHtml}
  `;
}

async function profileSearch(){
  const q=$("profileSearch").value.trim();
  const out=$("profileSuggestions");
  if(!q){out.innerHTML="";return;}
  out.innerHTML=`<div class="loading">Mencari…</div>`;
  const rows=await searchPeople(q);
  if(!rows.length){out.innerHTML=`<div class="loading">Tidak ada data yang cocok.</div>`;return;}
  out.innerHTML=rows.map((p,i)=>`
    <article class="person-card profile-result" data-i="${i}" style="cursor:pointer">
      <h3>${esc(p.name)}</h3>
      <span class="code">${esc(p.book_code||"tanpa kode")}</span>
      <div class="meta" style="margin-top:8px">ID-${p.generation_no ?? "?"}${""}</div>
    </article>`).join("");
  out.querySelectorAll(".profile-result").forEach((el)=>{
    el.onclick=()=>openProfile(rows[Number(el.dataset.i)]);
  });
}
$("profileSearchBtn").onclick=profileSearch;
$("profileSearch").addEventListener("keydown",e=>{if(e.key==="Enter")profileSearch();});


let treeFocusPerson = null;
let treeZoom = 1;

function lineBetween(x1,y1,x2,y2,extraClass=""){
  const dx=x2-x1, dy=y2-y1, len=Math.sqrt(dx*dx+dy*dy), angle=Math.atan2(dy,dx)*180/Math.PI;
  return `<div class="tree-line ${extraClass}" style="left:${x1}px;top:${y1}px;width:${len}px;transform:rotate(${angle}deg)"></div>`;
}

function nodeHTML(n,x,y,cls=""){
  return `<div class="tree-node ${cls}" data-person-id="${n.id}" data-code="${esc(n.book_code||"")}" style="left:${x}px;top:${y}px">
    <div class="tree-name">${esc(n.name)}</div>
    <div class="tree-meta">${esc(n.book_code||"tanpa kode")}${n.generation_no!=null?` · ID-${n.generation_no}`:""}</div>
  </div>`;
}

function layoutTree(data){
  const canvas=$("treeCanvas");
  if(!data || !data.center){
    canvas.innerHTML=`<div class="tree-empty">Data pohon belum tersedia.</div>`;
    return;
  }

  const W=1100, centerX=550, centerY=260, nodeW=180, nodeH=76;
  let html="", lines="";
  const pos = new Map();

  // group ancestors by depth
  const ancGroups={};
  (data.ancestors||[]).forEach(a=>{(ancGroups[a.depth] ||= []).push(a);});
  Object.keys(ancGroups).forEach(k=>ancGroups[k].sort((a,b)=>(a.book_code||"").localeCompare(b.book_code||"")));

  // center
  pos.set(data.center.id,{x:centerX-nodeW/2,y:centerY});
  html += nodeHTML(data.center,centerX-nodeW/2,centerY,"center");

  // spouses
  (data.spouses||[]).forEach((s,i)=>{
    const sx=centerX+220+(i*205), sy=centerY;
    pos.set(s.id,{x:sx,y:sy});
    html += nodeHTML(s,sx,sy,"spouse");
    lines += lineBetween(centerX+nodeW/2,centerY+nodeH/2,sx,sy+nodeH/2,"spouse-line");
  });

  // ancestors above
  Object.entries(ancGroups).forEach(([depthStr,items])=>{
    const depth=Number(depthStr);
    const y=centerY-depth*125;
    const spacing=Math.max(205, 850/items.length);
    const total=(items.length-1)*spacing;
    const start=centerX-total/2-nodeW/2;
    items.forEach((n,i)=>{
      const x=start+i*spacing;
      pos.set(n.id,{x,y});
      html += nodeHTML(n,x,y);
    });
    html += `<div class="tree-generation-label" style="top:${Math.max(8,y-22)}px">Leluhur +${depth}</div>`;
  });

  // descendants below
  const desGroups={};
  (data.descendants||[]).forEach(d=>{(desGroups[d.depth] ||= []).push(d);});
  Object.keys(desGroups).forEach(k=>desGroups[k].sort((a,b)=>(a.book_code||"").localeCompare(b.book_code||"")));
  Object.entries(desGroups).forEach(([depthStr,items])=>{
    const depth=Number(depthStr);
    const y=centerY+depth*125;
    const spacing=Math.max(200, 900/items.length);
    const total=(items.length-1)*spacing;
    const start=centerX-total/2-nodeW/2;
    items.forEach((n,i)=>{
      const x=start+i*spacing;
      pos.set(n.id,{x,y});
      html += nodeHTML(n,x,y);
    });
    html += `<div class="tree-generation-label" style="top:${y-22}px">Keturunan +${depth}</div>`;
  });

  // ancestor lines
  (data.ancestors||[]).forEach(n=>{
    const p=pos.get(n.id), child=pos.get(n.child_id);
    if(p && child){
      lines += lineBetween(p.x+nodeW/2,p.y+nodeH,child.x+nodeW/2,child.y);
    }
  });

  // descendant lines
  (data.descendants||[]).forEach(n=>{
    const p=pos.get(n.id), parent=pos.get(n.parent_id);
    if(p && parent){
      lines += lineBetween(parent.x+nodeW/2,parent.y+nodeH,p.x+nodeW/2,p.y);
    }
  });

  canvas.innerHTML=lines+html;
  canvas.querySelectorAll(".tree-node").forEach(el=>{
    el.addEventListener("click",async ()=>{
      const id=el.dataset.personId;
      const {data,error}=await db.rpc("get_person_profile",{p_person_id:id});
      if(!error && data){
        const p={
          id:data.id,
          book_code:data.book_code,
          name:data.name,
          generation_no:data.generation_no,
          verification_status:data.verification_status
        };
        treeFocusPerson=p;
        $("treeSearch").value=p.name;
        await loadTree(p);
      }
    });
  });
}

async function loadTree(person){
  treeFocusPerson=person;
  const viewport=$("treeViewport"), toolbar=$("treeToolbar"), canvas=$("treeCanvas");
  viewport.classList.remove("hidden"); toolbar.classList.remove("hidden");
  canvas.innerHTML=`<div class="tree-empty">Menyusun pohon silsilah…</div>`;
  $("rootPathPanel").classList.add("hidden");
  const {data,error}=await db.rpc("get_family_tree",{
    p_person_id:person.id,p_ancestor_depth:4,p_descendant_depth:3
  });
  if(error){
    canvas.innerHTML=`<div class="tree-empty">Gagal memuat pohon: ${esc(error.message)}</div>`;return;
  }
  layoutTree(data);
  treeZoom=1; canvas.style.transform=`scale(1)`;
  $("zoomResetBtn").textContent="100%";
  setTimeout(()=>{viewport.scrollLeft=Math.max(0,(1100-viewport.clientWidth)/2);viewport.scrollTop=60;},80);
}

async function treeSearch(){
  const q=$("treeSearch").value.trim();
  const out=$("treeSuggestions");
  if(!q){out.innerHTML="";return;}
  out.innerHTML=`<div class="loading">Mencari…</div>`;
  const rows=await searchPeople(q);
  if(!rows.length){out.innerHTML=`<div class="loading">Tidak ada data yang cocok.</div>`;return;}
  out.innerHTML=rows.map((p,i)=>`
    <article class="person-card tree-result" data-i="${i}" style="cursor:pointer">
      <h3>${esc(p.name)}</h3>
      <span class="code">${esc(p.book_code||"tanpa kode")}</span>
      <div class="meta" style="margin-top:8px">ID-${p.generation_no ?? "?"}${""}</div>
    </article>`).join("");
  out.querySelectorAll(".tree-result").forEach(el=>{
    el.onclick=async()=>{
      const p=rows[Number(el.dataset.i)];
      $("treeSearch").value=p.name;
      out.innerHTML="";
      await loadTree(p);
    };
  });
}

$("treeSearchBtn").onclick=treeSearch;
$("treeSearch").addEventListener("keydown",e=>{if(e.key==="Enter")treeSearch();});

$("zoomInBtn").onclick=()=>{
  treeZoom=Math.min(1.6,treeZoom+0.1);
  $("treeCanvas").style.transform=`scale(${treeZoom})`;
  $("zoomResetBtn").textContent=`${Math.round(treeZoom*100)}%`;
};
$("zoomOutBtn").onclick=()=>{
  treeZoom=Math.max(.6,treeZoom-0.1);
  $("treeCanvas").style.transform=`scale(${treeZoom})`;
  $("zoomResetBtn").textContent=`${Math.round(treeZoom*100)}%`;
};
$("zoomResetBtn").onclick=()=>{
  treeZoom=1;$("treeCanvas").style.transform="scale(1)";$("zoomResetBtn").textContent="100%";
};

$("rootPathBtn").onclick=async()=>{
  if(!treeFocusPerson) return;
  const panel=$("rootPathPanel");
  panel.classList.remove("hidden");
  panel.innerHTML=`<div class="loading">Menelusuri jalur ke K. Idris Patapan…</div>`;
  const {data,error}=await db.rpc("get_lineage_to_root",{p_person_id:treeFocusPerson.id,p_root_code:"ROOT"});
  if(error || !data || !data.length){
    panel.innerHTML=`<div class="meta">Jalur belum lengkap pada data yang tersedia.</div>`;return;
  }
  panel.innerHTML=`<h4>Jalur ${esc(treeFocusPerson.name)} → K. Idris Patapan</h4>
    <div class="root-path-track">${
      data.map((x,i)=>`${i?'<div class="root-path-arrow">→</div>':''}
        <div class="root-path-node"><strong>${esc(x.name)}</strong><div class="meta">${esc(x.book_code||"")}</div></div>`).join("")
    }</div>`;
};


let adminSelectedPerson = null;

async function refreshAdminSession(){
  const {data:{session}} = await db.auth.getSession();
  if(!session){
    $("adminWorkspace").classList.add("hidden");
    $("adminLogoutBtn").classList.add("hidden");
    $("adminLoginBtn").classList.remove("hidden");
    $("adminBadge").textContent="Belum login";
    return;
  }

  const {data:isAdmin,error} = await db.rpc("is_app_admin");
  if(error || !isAdmin){
    $("adminWorkspace").classList.add("hidden");
    $("adminLogoutBtn").classList.remove("hidden");
    $("adminLoginBtn").classList.add("hidden");
    $("adminBadge").textContent="Login, bukan admin";
    $("adminAuthMessage").textContent="Akun berhasil login, tetapi belum terdaftar sebagai admin aplikasi.";
    return;
  }

  $("adminWorkspace").classList.remove("hidden");
  $("adminLogoutBtn").classList.remove("hidden");
  $("adminLoginBtn").classList.add("hidden");
  $("adminBadge").textContent="Admin aktif";
  $("adminAuthMessage").textContent=`Login sebagai ${session.user.email}`;
  await loadAdminQueue();
}

$("adminLoginBtn").onclick=async()=>{
  const email=$("adminEmail").value.trim();
  const password=$("adminPassword").value;
  $("adminAuthMessage").textContent="Memproses login…";
  const {error}=await db.auth.signInWithPassword({email,password});
  if(error){
    $("adminAuthMessage").textContent=`Login gagal: ${error.message}`;
    return;
  }
  await refreshAdminSession();
};

$("adminLogoutBtn").onclick=async()=>{
  await db.auth.signOut();
  adminSelectedPerson=null;
  $("adminEditorForm").classList.add("hidden");
  $("adminEditorEmpty").classList.remove("hidden");
  $("adminHistory").classList.add("hidden");
  await refreshAdminSession();
};

async function loadAdminQueue(){
  const status=$("adminStatusFilter").value || null;
  const out=$("adminQueue");
  out.innerHTML=`<div class="loading">Memuat antrean verifikasi…</div>`;
  const {data,error}=await db.rpc("admin_list_verification_queue",{p_status:status,p_limit:200});
  if(error){
    out.innerHTML=`<div class="error" style="padding:14px">Gagal memuat: ${esc(error.message)}</div>`;
    return;
  }
  if(!data?.length){
    out.innerHTML=`<div class="loading">Tidak ada data pada status ini.</div>`;
    return;
  }
  out.innerHTML=data.map((p,i)=>`
    <div class="admin-row" data-i="${i}">
      <strong>${esc(p.name)}</strong>
      <div class="meta">${esc(p.book_code||"tanpa kode")} · ID-${p.generation_no ?? "?"}</div>
      <div class="meta">${esc(p.verification_status)}${p.source_page?` · hal. ${p.source_page}`:""}</div>
    </div>`).join("");

  out.querySelectorAll(".admin-row").forEach(el=>{
    el.onclick=()=>{
      out.querySelectorAll(".admin-row").forEach(x=>x.classList.remove("active"));
      el.classList.add("active");
      selectAdminPerson(data[Number(el.dataset.i)]);
    };
  });
}

async function selectAdminPerson(p){
  adminSelectedPerson=p;
  $("adminEditorEmpty").classList.add("hidden");
  $("adminEditorForm").classList.remove("hidden");
  $("adminHistory").classList.add("hidden");
  $("editCurrentCode").textContent=p.book_code||"tanpa kode";
  $("editCurrentName").textContent=p.name;
  $("editSourceInfo").textContent=p.source_page?`Sumber buku halaman ${p.source_page}`:"Halaman sumber belum tercatat";
  $("editCurrentStatus").textContent=p.verification_status;
  $("editDisplayName").value=p.name||"";
  $("editBookCode").value=p.book_code||"";
  $("editGeneration").value=p.generation_no ?? "";
  $("editAddress").value=p.address||"";
  $("editLocationCode").value="";
  $("editNotes").value=p.notes||"";
  $("editStatus").value=p.verification_status||"UNVERIFIED";
  $("editReason").value="";

  const {data:profile}=await db.rpc("admin_get_person_profile",{p_person_id:p.id});
  if(profile){
    $("editLocationCode").value=profile.location_code||"";
  }
}

$("adminEditorForm").addEventListener("submit",async(e)=>{
  e.preventDefault();
  if(!adminSelectedPerson) return;

  const payload={
    p_person_id:adminSelectedPerson.id,
    p_display_name:$("editDisplayName").value.trim()||null,
    p_book_code:$("editBookCode").value.trim()||null,
    p_generation_no:$("editGeneration").value===""?null:Number($("editGeneration").value),
    p_address:$("editAddress").value.trim()||null,
    p_location_code:$("editLocationCode").value.trim()||null,
    p_notes:$("editNotes").value.trim()||null,
    p_status:$("editStatus").value,
    p_reason:$("editReason").value.trim()||null
  };

  const submit=e.submitter;
  if(submit){submit.disabled=true;submit.textContent="Menyimpan…";}
  const {data,error}=await db.rpc("admin_update_person",payload);
  if(submit){submit.disabled=false;submit.textContent="Simpan verifikasi";}

  if(error){
    alert(`Gagal menyimpan: ${error.message}`);
    return;
  }

  adminSelectedPerson={
    ...adminSelectedPerson,
    name:data.name,
    book_code:data.book_code,
    generation_no:data.generation_no,
    address:data.address,
    verification_status:data.verification_status,
    notes:data.notes
  };
  $("editCurrentCode").textContent=data.book_code||"tanpa kode";
  $("editCurrentName").textContent=data.name;
  $("editCurrentStatus").textContent=data.verification_status;
  $("editReason").value="";
  await loadAdminQueue();
  alert("Verifikasi berhasil disimpan.");
});

$("showHistoryBtn").onclick=async()=>{
  if(!adminSelectedPerson) return;
  const out=$("adminHistory");
  out.classList.remove("hidden");
  out.innerHTML=`<div class="loading">Memuat riwayat…</div>`;
  const {data,error}=await db.rpc("admin_get_verification_history",{p_person_id:adminSelectedPerson.id,p_limit:100});
  if(error){
    out.innerHTML=`<div class="error">Gagal memuat riwayat: ${esc(error.message)}</div>`;return;
  }
  out.innerHTML=`<h4>Riwayat perubahan</h4>` + (data?.length ? data.map(h=>`
    <div class="history-item">
      <strong>${esc(h.field_name)}</strong>
      <div class="history-change">${esc(h.old_value||"—")} → ${esc(h.new_value||"—")}</div>
      ${h.reason?`<div class="history-change">Alasan: ${esc(h.reason)}</div>`:""}
      <div class="meta">${new Date(h.verified_at).toLocaleString("id-ID")}</div>
    </div>`).join("") : `<div class="meta">Belum ada riwayat perubahan.</div>`);
};

$("adminStatusFilter").onchange=loadAdminQueue;
$("adminRefreshBtn").onclick=loadAdminQueue;

db.auth.onAuthStateChange(()=>refreshAdminSession());
refreshAdminSession();
