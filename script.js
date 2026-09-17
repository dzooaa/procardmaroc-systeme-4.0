/* =========================================================
   CardForge — Digital Business Card Generator
   100% client-side : HTML / CSS / JS, aucune dépendance externe.
   ========================================================= */

(function () {
  "use strict";

  /* ---------------- CONSTANTS ---------------- */

  const STORAGE_KEY = "cardforge_profiles_v1";

  const FIXED_SOCIALS = [
    { key: "instagram", label: "Instagram", glyph: "IG", base: "https://instagram.com/" },
    { key: "facebook", label: "Facebook", glyph: "FB", base: "https://facebook.com/" },
    { key: "tiktok", label: "TikTok", glyph: "TT", base: "https://tiktok.com/@" },
    { key: "linkedin", label: "LinkedIn", glyph: "in", base: "https://linkedin.com/in/" },
    { key: "youtube", label: "YouTube", glyph: "YT", base: "https://youtube.com/@" },
    { key: "x", label: "X / Twitter", glyph: "X", base: "https://x.com/" },
    { key: "snapchat", label: "Snapchat", glyph: "SC", base: "https://snapchat.com/add/" }
  ];

  const THEME_PRESETS = {
    "noir-or": { label: "Noir & Or", primary: "#B08D57", secondary: "#14171F", text: "#1E2027", bg: "#FFFFFF" },
    "noir-blanc": { label: "Noir & Blanc", primary: "#20232B", secondary: "#4A4E58", text: "#1E2027", bg: "#FFFFFF" },
    "bleu-pro": { label: "Bleu professionnel", primary: "#2A5C9A", secondary: "#153A63", text: "#1E2027", bg: "#FFFFFF" },
    "violet-premium": { label: "Violet premium", primary: "#6E4AA8", secondary: "#402C68", text: "#1E2027", bg: "#FFFFFF" },
    "vert": { label: "Vert", primary: "#2F7A4F", secondary: "#1C4A30", text: "#1E2027", bg: "#FFFFFF" },
    "custom": { label: "Personnalisé", primary: "#B08D57", secondary: "#14171F", text: "#1E2027", bg: "#FFFFFF" }
  };

  /* ---------------- STATE ---------------- */

  let profiles = loadProfiles();
  let currentProfile = null;
  let isEditingExisting = false;

  /* ---------------- UTILITIES ---------------- */

  function uid() {
    return "p_" + Date.now().toString(36) + Math.random().toString(36).slice(2, 7);
  }

  // Escape any user-supplied string before it is ever inserted into HTML.
  function esc(str) {
    if (str === undefined || str === null) return "";
    return String(str)
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;")
      .replace(/'/g, "&#39;");
  }

  // Escape a value for safe use inside an href attribute (tel:, mailto:, https:).
  function escAttr(str) {
    return esc(str).replace(/`/g, "&#96;");
  }

  function isValidEmail(v) {
    if (!v) return true;
    return /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(v);
  }
  function isValidPhone(v) {
    if (!v) return true;
    return /^[+]?[\d\s().-]{6,20}$/.test(v);
  }
  function isValidURL(v) {
    if (!v) return true;
    return /^https?:\/\/[^\s]+\.[^\s]+/.test(v);
  }
  function digitsOnly(v) {
    return (v || "").replace(/[^\d+]/g, "");
  }

  function toast(msg) {
    const el = document.getElementById("toast");
    el.textContent = msg;
    el.hidden = false;
    clearTimeout(toast._t);
    toast._t = setTimeout(() => { el.hidden = true; }, 2400);
  }

  function fileToDataURL(file) {
    return new Promise((resolve, reject) => {
      if (!file) return resolve(null);
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(file);
    });
  }

  function downloadBlob(content, filename, mime) {
    const blob = new Blob([content], { type: mime });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = filename;
    document.body.appendChild(a);
    a.click();
    a.remove();
    setTimeout(() => URL.revokeObjectURL(url), 2000);
  }

  /* ---------------- PROFILE MODEL ---------------- */

  function createDefaultProfile() {
    return {
      id: uid(),
      name: "",
      role: "",
      company: "",
      bio: "",
      photo: null,
      logo: null,
      phone: "",
      whatsapp: "",
      email: "",
      address: "",
      website: "",
      socials: FIXED_SOCIALS.map(s => ({ network: s.key, url: "", custom: false }))
        .concat([]),
      theme: {
        preset: "noir-or",
        custom: { primary: "#B08D57", secondary: "#14171F", text: "#1E2027", bg: "#FFFFFF" },
        font: "system",
        textSize: "md",
        buttonStyle: "filled",
        buttonShape: "round",
        photoPosition: "center",
        cardStyle: "elevated",
        bgImage: null
      },
      createdAt: Date.now()
    };
  }

  function activeThemeColors(profile) {
    if (profile.theme.preset === "custom") return profile.theme.custom;
    return THEME_PRESETS[profile.theme.preset] || THEME_PRESETS["noir-or"];
  }

  /* ---------------- STORAGE ---------------- */

  function loadProfiles() {
    try {
      const raw = localStorage.getItem(STORAGE_KEY);
      return raw ? JSON.parse(raw) : [];
    } catch (e) {
      console.error("Impossible de lire les profils stockés :", e);
      return [];
    }
  }

  function saveProfiles() {
    try {
      localStorage.setItem(STORAGE_KEY, JSON.stringify(profiles));
    } catch (e) {
      console.error("Erreur de sauvegarde localStorage :", e);
      toast("Erreur : stockage local plein ou indisponible.");
    }
  }

  /* ---------------- CARD RENDERING ---------------- */

  function socialHref(entry) {
    if (!entry.url) return "";
    const trimmed = entry.url.trim();
    if (/^https?:\/\//i.test(trimmed)) return trimmed;
    const def = FIXED_SOCIALS.find(s => s.key === entry.network);
    const handle = trimmed.replace(/^@/, "");
    return def ? def.base + handle : trimmed;
  }

  function buildCardInnerHTML(profile) {
    if (!profile.name && !profile.company && !profile.phone && !profile.email) {
      return `<div class="dc-empty">Remplissez le formulaire pour voir l'aperçu de votre carte.</div>`;
    }

    const t = profile.theme;
    const colors = activeThemeColors(profile);

    const photoBlock = profile.photo
      ? `<img class="dc-photo" src="${profile.photo}" alt="${esc(profile.name)}">`
      : `<div class="dc-photo" aria-hidden="true"></div>`;

    const logoBlock = profile.logo ? `<img class="dc-logo" src="${profile.logo}" alt="logo">` : "";

    const actions = [];
    if (profile.phone && isValidPhone(profile.phone)) {
      actions.push(`<a class="dc-btn" href="tel:${escAttr(digitsOnly(profile.phone))}">📞 Appeler</a>`);
    }
    if (profile.whatsapp && isValidPhone(profile.whatsapp)) {
      actions.push(`<a class="dc-btn" href="https://wa.me/${escAttr(digitsOnly(profile.whatsapp).replace(/^\+/, ""))}" target="_blank" rel="noopener">💬 WhatsApp</a>`);
    }
    if (profile.email && isValidEmail(profile.email)) {
      actions.push(`<a class="dc-btn" href="mailto:${escAttr(profile.email)}">✉️ Email</a>`);
    }
    if (profile.website && isValidURL(profile.website)) {
      actions.push(`<a class="dc-btn" href="${escAttr(profile.website)}" target="_blank" rel="noopener">🌐 Site web</a>`);
    }

    const socialLinks = (profile.socials || [])
      .filter(s => s.url && s.url.trim())
      .map(s => {
        const href = socialHref(s);
        const def = FIXED_SOCIALS.find(f => f.key === s.network);
        const glyph = s.custom ? (s.network || "?").slice(0, 2).toUpperCase() : (def ? def.glyph : "?");
        const label = s.custom ? s.network : (def ? def.label : s.network);
        return `<a class="dc-social" href="${escAttr(href)}" target="_blank" rel="noopener" title="${esc(label)}">${esc(glyph)}</a>`;
      }).join("");

    const addressBlock = profile.address
      ? `<div class="dc-address"><span>📍</span><span>${esc(profile.address)}</span></div>`
      : "";

    const heroPos = t.photoPosition === "banner" ? "pos-banner" : (t.photoPosition === "left" ? "pos-left" : "");

    return `
      <div class="dc-hero ${heroPos}">
        ${logoBlock}
        ${t.photoPosition !== "banner" ? photoBlock : ""}
        <h2 class="dc-name">${esc(profile.name) || "Votre nom"}</h2>
        ${profile.role ? `<div class="dc-role">${esc(profile.role)}</div>` : ""}
        ${profile.company ? `<div class="dc-company">${esc(profile.company)}</div>` : ""}
      </div>
      <div class="dc-body">
        ${profile.bio ? `<p class="dc-bio">${esc(profile.bio)}</p>` : ""}
        ${actions.length ? `<div class="dc-actions">${actions.join("")}</div>` : ""}
        ${socialLinks ? `<div class="dc-socials">${socialLinks}</div>` : ""}
        ${addressBlock}
      </div>
    `;
  }

  function cardClassList(profile) {
    const t = profile.theme;
    return [
      "digital-card",
      "font-" + t.font,
      "size-" + t.textSize,
      "btn-" + t.buttonStyle,
      "shape-" + t.buttonShape,
      "style-" + t.cardStyle
    ].join(" ");
  }

  function renderCardInto(el, profile) {
    if (!el) return;
    el.innerHTML = `<div class="${cardClassList(profile)}" style="${cardStyleVars(profile)}">${buildCardInnerHTML(profile)}</div>`;
  }

  function cardStyleVars(profile) {
    const c = activeThemeColors(profile);
    let bgImg = "";
    if (profile.theme.bgImage) {
      bgImg = `background-image:url('${profile.theme.bgImage}'); background-size:cover; background-position:center;`;
    }
    return `--c-primary:${c.primary}; --c-secondary:${c.secondary}; --c-text:${c.text}; --c-bg:${c.bg}; ${bgImg}`;
  }

  function renderAll() {
    renderCardInto(document.getElementById("card-render"), currentProfile);
    const fs = document.getElementById("card-render-fullscreen");
    if (fs && !document.getElementById("fullscreen-modal").hidden) renderCardInto(fs, currentProfile);
  }

  /* ---------------- FORM <-> PROFILE BINDING ---------------- */

  function buildSocialsFixedFields() {
    const wrap = document.getElementById("socials-fixed");
    wrap.innerHTML = FIXED_SOCIALS.map(s => `
      <div class="social-row">
        <label>${s.label}</label>
        <input type="text" data-social="${s.key}" placeholder="nom d'utilisateur ou URL complète">
        <span></span>
      </div>
    `).join("");
    wrap.querySelectorAll("input[data-social]").forEach(input => {
      input.addEventListener("input", () => {
        const key = input.dataset.social;
        let entry = currentProfile.socials.find(s => s.network === key && !s.custom);
        if (!entry) {
          entry = { network: key, url: "", custom: false };
          currentProfile.socials.push(entry);
        }
        entry.url = input.value;
        renderAll();
      });
    });
  }

  function renderCustomSocials() {
    const wrap = document.getElementById("socials-custom");
    const customs = currentProfile.socials.filter(s => s.custom);
    wrap.innerHTML = customs.map((s, idx) => `
      <div class="social-row" data-custom-idx="${idx}">
        <input type="text" class="custom-social-name" placeholder="Nom du réseau" value="${esc(s.network)}" data-role="name">
        <input type="text" placeholder="URL (https://...)" value="${esc(s.url)}" data-role="url">
        <button type="button" class="remove-social" title="Supprimer">✕</button>
      </div>
    `).join("");

    wrap.querySelectorAll(".social-row").forEach(row => {
      const idx = Number(row.dataset.customIdx);
      row.querySelector('[data-role="name"]').addEventListener("input", e => {
        customs[idx].network = e.target.value;
        renderAll();
      });
      row.querySelector('[data-role="url"]').addEventListener("input", e => {
        customs[idx].url = e.target.value;
        renderAll();
      });
      row.querySelector(".remove-social").addEventListener("click", () => {
        currentProfile.socials.splice(currentProfile.socials.indexOf(customs[idx]), 1);
        renderCustomSocials();
        renderAll();
      });
    });
  }

  function buildThemeSwatches() {
    const wrap = document.getElementById("theme-swatches");
    wrap.innerHTML = Object.entries(THEME_PRESETS).map(([key, val]) => `
      <div>
        <div class="swatch" data-theme="${key}" style="background:linear-gradient(135deg, ${val.primary}, ${val.secondary})"></div>
        <span class="swatch-label">${val.label}</span>
      </div>
    `).join("");
    wrap.querySelectorAll(".swatch").forEach(sw => {
      sw.addEventListener("click", () => {
        currentProfile.theme.preset = sw.dataset.theme;
        document.getElementById("custom-theme-block").hidden = sw.dataset.theme !== "custom";
        markSelectedSwatch();
        renderAll();
      });
    });
    markSelectedSwatch();
  }

  function markSelectedSwatch() {
    document.querySelectorAll(".swatch").forEach(sw => {
      sw.classList.toggle("selected", sw.dataset.theme === currentProfile.theme.preset);
    });
    document.getElementById("custom-theme-block").hidden = currentProfile.theme.preset !== "custom";
  }

  function bindSimpleFields() {
    const map = {
      "f-name": "name", "f-role": "role", "f-company": "company", "f-bio": "bio",
      "f-phone": "phone", "f-whatsapp": "whatsapp", "f-email": "email",
      "f-address": "address", "f-website": "website"
    };
    Object.entries(map).forEach(([id, field]) => {
      const el = document.getElementById(id);
      el.addEventListener("input", () => {
        currentProfile[field] = el.value;
        validateField(id, field);
        renderAll();
      });
    });

    document.getElementById("f-font").addEventListener("change", e => { currentProfile.theme.font = e.target.value; renderAll(); });
    document.getElementById("f-textsize").addEventListener("change", e => { currentProfile.theme.textSize = e.target.value; renderAll(); });
    document.getElementById("f-btnstyle").addEventListener("change", e => { currentProfile.theme.buttonStyle = e.target.value; renderAll(); });
    document.getElementById("f-btnshape").addEventListener("change", e => { currentProfile.theme.buttonShape = e.target.value; renderAll(); });
    document.getElementById("f-photopos").addEventListener("change", e => { currentProfile.theme.photoPosition = e.target.value; renderAll(); });
    document.getElementById("f-cardstyle").addEventListener("change", e => { currentProfile.theme.cardStyle = e.target.value; renderAll(); });

    ["primary", "secondary", "text", "bg"].forEach(k => {
      document.getElementById("f-color-" + k).addEventListener("input", e => {
        currentProfile.theme.custom[k] = e.target.value;
        renderAll();
      });
    });

    document.getElementById("f-photo").addEventListener("change", async e => {
      currentProfile.photo = await fileToDataURL(e.target.files[0]);
      renderAll();
    });
    document.getElementById("f-logo").addEventListener("change", async e => {
      currentProfile.logo = await fileToDataURL(e.target.files[0]);
      renderAll();
    });
    document.getElementById("f-bgimage").addEventListener("change", async e => {
      currentProfile.theme.bgImage = await fileToDataURL(e.target.files[0]);
      renderAll();
    });
  }

  function validateField(inputId, field) {
    const errMap = { phone: "err-phone", whatsapp: "err-whatsapp", email: "err-email", website: "err-website" };
    const errId = errMap[field];
    if (!errId) return true;
    const value = currentProfile[field];
    let ok = true, msg = "";
    if (field === "email" && !isValidEmail(value)) { ok = false; msg = "Email invalide."; }
    if ((field === "phone" || field === "whatsapp") && !isValidPhone(value)) { ok = false; msg = "Numéro invalide."; }
    if (field === "website" && !isValidURL(value)) { ok = false; msg = "URL invalide (doit commencer par http:// ou https://)."; }
    document.getElementById(errId).textContent = msg;
    return ok;
  }

  function validateAll() {
    let ok = true;
    if (!currentProfile.name.trim()) { toast("Le nom complet est requis."); ok = false; }
    ["phone", "whatsapp", "email", "website"].forEach(f => {
      if (!validateField(null, f)) ok = false;
    });
    return ok;
  }

  function populateForm(profile) {
    document.getElementById("f-name").value = profile.name || "";
    document.getElementById("f-role").value = profile.role || "";
    document.getElementById("f-company").value = profile.company || "";
    document.getElementById("f-bio").value = profile.bio || "";
    document.getElementById("f-phone").value = profile.phone || "";
    document.getElementById("f-whatsapp").value = profile.whatsapp || "";
    document.getElementById("f-email").value = profile.email || "";
    document.getElementById("f-address").value = profile.address || "";
    document.getElementById("f-website").value = profile.website || "";
    document.getElementById("f-font").value = profile.theme.font;
    document.getElementById("f-textsize").value = profile.theme.textSize;
    document.getElementById("f-btnstyle").value = profile.theme.buttonStyle;
    document.getElementById("f-btnshape").value = profile.theme.buttonShape;
    document.getElementById("f-photopos").value = profile.theme.photoPosition;
    document.getElementById("f-cardstyle").value = profile.theme.cardStyle;
    document.getElementById("f-color-primary").value = profile.theme.custom.primary;
    document.getElementById("f-color-secondary").value = profile.theme.custom.secondary;
    document.getElementById("f-color-text").value = profile.theme.custom.text;
    document.getElementById("f-color-bg").value = profile.theme.custom.bg;

    FIXED_SOCIALS.forEach(s => {
      const entry = profile.socials.find(x => x.network === s.key && !x.custom);
      const input = document.querySelector(`[data-social="${s.key}"]`);
      if (input) input.value = entry ? entry.url : "";
    });
    renderCustomSocials();
    markSelectedSwatch();
    ["err-phone", "err-whatsapp", "err-email", "err-website"].forEach(id => document.getElementById(id).textContent = "");
  }

  /* ---------------- VIEWS / NAVIGATION ---------------- */

  function showView(name) {
    document.querySelectorAll(".view").forEach(v => v.hidden = true);
    document.getElementById("view-" + name).hidden = false;
    document.querySelectorAll(".nav-item").forEach(n => n.classList.toggle("active", n.dataset.view === name));
    if (name === "dashboard") renderDashboard();
    if (name === "cards") renderProfilesList();
    if (name === "templates") renderTemplates();
  }

  function startNewProfile() {
    currentProfile = createDefaultProfile();
    isEditingExisting = false;
    populateForm(currentProfile);
    renderAll();
    showView("create");
  }

  function editProfile(id) {
    const p = profiles.find(x => x.id === id);
    if (!p) return;
    currentProfile = JSON.parse(JSON.stringify(p));
    isEditingExisting = true;
    populateForm(currentProfile);
    renderAll();
    showView("create");
  }

  function duplicateProfile(id) {
    const p = profiles.find(x => x.id === id);
    if (!p) return;
    const copy = JSON.parse(JSON.stringify(p));
    copy.id = uid();
    copy.name = (copy.name || "Profil") + " (copie)";
    copy.createdAt = Date.now();
    profiles.push(copy);
    saveProfiles();
    toast("Profil dupliqué.");
    renderProfilesList();
    renderDashboard();
  }

  function deleteProfile(id) {
    if (!confirm("Supprimer définitivement ce profil ?")) return;
    profiles = profiles.filter(x => x.id !== id);
    saveProfiles();
    toast("Profil supprimé.");
    renderProfilesList();
    renderDashboard();
  }

  /* ---------------- DASHBOARD / LISTS ---------------- */

  function renderDashboard() {
    document.getElementById("stat-total").textContent = profiles.length;
    const socialCount = profiles.reduce((acc, p) => acc + p.socials.filter(s => s.url && s.url.trim()).length, 0);
    document.getElementById("stat-socials").textContent = socialCount;

    const grid = document.getElementById("dashboard-cards-grid");
    if (!profiles.length) {
      grid.innerHTML = `<div class="empty-state">Aucune carte pour le moment. Créez votre première carte digitale.</div>`;
      return;
    }
    grid.innerHTML = profiles.map(p => miniCardHTML(p)).join("");
    grid.querySelectorAll(".mini-card").forEach(el => el.addEventListener("click", () => editProfile(el.dataset.id)));
  }

  function miniCardHTML(p) {
    const c = activeThemeColors(p);
    return `
      <div class="mini-card" data-id="${p.id}">
        <div class="mc-name">${esc(p.name) || "Sans nom"}</div>
        <div class="mc-role">${esc(p.role || p.company || "")}</div>
        <div class="mc-swatch" style="background:linear-gradient(90deg, ${c.primary}, ${c.secondary})"></div>
      </div>
    `;
  }

  function renderProfilesList() {
    const wrap = document.getElementById("profiles-list");
    if (!profiles.length) {
      wrap.innerHTML = `<div class="empty-state">Aucun profil enregistré.</div>`;
      return;
    }
    wrap.innerHTML = profiles.map(p => `
      <div class="profile-row" data-id="${p.id}">
        <div class="profile-row-info">
          ${p.photo ? `<img class="profile-row-avatar" src="${p.photo}">` : `<div class="profile-row-avatar"></div>`}
          <div>
            <div class="mc-name">${esc(p.name) || "Sans nom"}</div>
            <div class="mc-role">${esc(p.role || "")} ${p.company ? "· " + esc(p.company) : ""}</div>
          </div>
        </div>
        <div class="profile-row-actions">
          <button class="ghost-btn small" data-act="edit">Modifier</button>
          <button class="ghost-btn small" data-act="dup">Dupliquer</button>
          <button class="ghost-btn small danger" data-act="del">Supprimer</button>
        </div>
      </div>
    `).join("");

    wrap.querySelectorAll(".profile-row").forEach(row => {
      const id = row.dataset.id;
      row.querySelector('[data-act="edit"]').addEventListener("click", () => editProfile(id));
      row.querySelector('[data-act="dup"]').addEventListener("click", () => duplicateProfile(id));
      row.querySelector('[data-act="del"]').addEventListener("click", () => deleteProfile(id));
    });
  }

  function renderTemplates() {
    const grid = document.getElementById("template-grid");
    grid.innerHTML = Object.entries(THEME_PRESETS).filter(([k]) => k !== "custom").map(([key, val]) => `
      <div class="mini-card" data-template="${key}">
        <div class="mc-name">${val.label}</div>
        <div class="mc-role">Modèle prêt à l'emploi</div>
        <div class="mc-swatch" style="background:linear-gradient(90deg, ${val.primary}, ${val.secondary})"></div>
      </div>
    `).join("");
    grid.querySelectorAll(".mini-card").forEach(el => {
      el.addEventListener("click", () => {
        currentProfile = createDefaultProfile();
        currentProfile.theme.preset = el.dataset.template;
        isEditingExisting = false;
        populateForm(currentProfile);
        renderAll();
        showView("create");
      });
    });
  }

  /* ---------------- SAVE PROFILE ---------------- */

  function saveCurrentProfile() {
    if (!validateAll()) return;
    const idx = profiles.findIndex(p => p.id === currentProfile.id);
    if (idx >= 0) {
      profiles[idx] = JSON.parse(JSON.stringify(currentProfile));
    } else {
      profiles.push(JSON.parse(JSON.stringify(currentProfile)));
    }
    isEditingExisting = true;
    saveProfiles();
    toast("Carte enregistrée avec succès.");
  }

  /* ---------------- STANDALONE HTML EXPORT ---------------- */

  function cardOnlyCSS() {
    // Minimal, self-contained CSS needed to render just the .digital-card component,
    // extracted so the downloaded file has no external dependency.
    return `
      *{box-sizing:border-box;}
      body{margin:0; padding:24px; background:#EFEDE7; font-family:system-ui,-apple-system,'Segoe UI',sans-serif; display:flex; justify-content:center;}
      .card-shell{width:100%; max-width:400px;}
      .digital-card{--c-primary:#B08D57;--c-secondary:#14171F;--c-text:#1E2027;--c-bg:#fff; background:var(--c-bg); color:var(--c-text); border-radius:26px; overflow:hidden; box-shadow:0 20px 45px rgba(20,23,31,0.18);}
      .digital-card.font-serif{font-family:Georgia,'Times New Roman',serif;}
      .digital-card.font-mono{font-family:'Courier New',monospace;}
      .digital-card.size-sm{font-size:13px;} .digital-card.size-md{font-size:14.5px;} .digital-card.size-lg{font-size:16px;}
      .dc-hero{background:linear-gradient(160deg, var(--c-primary), var(--c-secondary)); padding:36px 20px 46px; text-align:center; color:#fff;}
      .dc-hero.pos-left{text-align:left; padding-left:26px;}
      .dc-hero.pos-banner{padding-top:0; height:120px; display:flex; align-items:flex-end; justify-content:center;}
      .dc-photo{width:92px; height:92px; border-radius:50%; object-fit:cover; border:3px solid rgba(255,255,255,0.85); margin:0 auto 14px; background:rgba(255,255,255,0.25);}
      .dc-hero.pos-left .dc-photo{margin:0 0 14px;}
      .dc-logo{width:34px; height:34px; border-radius:8px; object-fit:cover; margin-bottom:10px; background:#fff;}
      .dc-name{font-weight:700; font-size:1.35em; margin:0;}
      .dc-role{opacity:.9; font-size:.95em; margin-top:2px;}
      .dc-company{opacity:.85; font-size:.88em; margin-top:2px;}
      .dc-body{padding:22px 22px 26px;}
      .dc-bio{color:#6B6F7A; line-height:1.5; margin-bottom:18px; font-size:.95em;}
      .dc-actions{display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-bottom:18px;}
      .dc-btn{display:flex; align-items:center; gap:8px; justify-content:center; padding:11px 10px; text-decoration:none; font-weight:600; font-size:.88em; border:1.5px solid var(--c-primary); color:var(--c-primary);}
      .digital-card.btn-filled .dc-btn{background:var(--c-primary); color:#fff;}
      .digital-card.btn-soft .dc-btn{background:color-mix(in srgb, var(--c-primary) 14%, transparent); border-color:transparent;}
      .digital-card.shape-round .dc-btn{border-radius:10px;} .digital-card.shape-pill .dc-btn{border-radius:999px;} .digital-card.shape-square .dc-btn{border-radius:2px;}
      .dc-socials{display:flex; flex-wrap:wrap; gap:10px; margin-bottom:18px;}
      .dc-social{width:42px; height:42px; display:flex; align-items:center; justify-content:center; border-radius:50%; background:var(--c-primary); color:#fff; text-decoration:none; font-size:16px;}
      .dc-address{display:flex; gap:8px; align-items:flex-start; font-size:.88em; color:#6B6F7A; padding-top:12px; border-top:1px solid #E3DFD6;}
      .digital-card.style-flat .dc-hero{background:var(--c-secondary);}
      .digital-card.style-bordered{border:1px solid #E3DFD6;}
    `;
  }

  function buildStandaloneHTML(profile) {
    const inner = buildCardInnerHTML(profile);
    const classes = cardClassList(profile);
    const vars = cardStyleVars(profile);
    return `<!DOCTYPE html>
<html lang="fr">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1.0">
<title>${esc(profile.name) || "Carte de visite digitale"}</title>
<style>${cardOnlyCSS()}</style>
</head>
<body>
  <div class="card-shell">
    <div class="${classes}" style="${vars}">
      ${inner}
    </div>
  </div>
</body>
</html>`;
  }

  function handleDownloadHTML() {
    if (!currentProfile.name) { toast("Ajoutez au moins un nom avant d'exporter."); return; }
    const html = buildStandaloneHTML(currentProfile);
    const filename = (currentProfile.name || "carte").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".html";
    downloadBlob(html, filename || "carte.html", "text/html");
    toast("Fichier HTML téléchargé.");
  }

  /* ---------------- VCARD EXPORT ---------------- */

  function buildVCF(profile) {
    const lines = [
      "BEGIN:VCARD",
      "VERSION:3.0",
      `FN:${vEsc(profile.name)}`,
      profile.company ? `ORG:${vEsc(profile.company)}` : "",
      profile.role ? `TITLE:${vEsc(profile.role)}` : "",
      profile.phone ? `TEL;TYPE=CELL:${vEsc(profile.phone)}` : "",
      profile.email ? `EMAIL:${vEsc(profile.email)}` : "",
      profile.website ? `URL:${vEsc(profile.website)}` : "",
      profile.address ? `ADR;TYPE=WORK:;;${vEsc(profile.address)};;;;` : "",
      "END:VCARD"
    ].filter(Boolean);
    return lines.join("\r\n");
  }
  function vEsc(str) {
    return String(str || "").replace(/([,;\\])/g, "\\$1");
  }

  function handleDownloadVCF() {
    if (!currentProfile.name) { toast("Ajoutez au moins un nom avant d'exporter."); return; }
    const vcf = buildVCF(currentProfile);
    const filename = (currentProfile.name || "contact").toLowerCase().replace(/[^a-z0-9]+/g, "-") + ".vcf";
    downloadBlob(vcf, filename, "text/vcard");
    toast("Fichier VCard téléchargé.");
  }

  /* ---------------- LIEN PARTAGEABLE ---------------- */
  // Sans backend, il n'existe pas d'URL hébergée réelle : on encode donc la
  // carte elle-même dans un lien "data:" auto-suffisant, qui s'ouvre dans
  // n'importe quel navigateur sans hébergement.

  function buildDataLink(profile) {
    const html = buildStandaloneHTML(profile);
    return "data:text/html;base64," + btoa(unescape(encodeURIComponent(html)));
  }

  function handleCopyLink() {
    if (!currentProfile.name) { toast("Ajoutez au moins un nom avant de générer un lien."); return; }
    const link = buildDataLink(currentProfile);
    navigator.clipboard.writeText(link).then(() => {
      toast("Lien copié (fichier autonome encodé — aucun serveur requis).");
    }).catch(() => {
      toast("Impossible de copier automatiquement. Le lien a été généré dans la console.");
      console.log(link);
    });
  }

  /* ---------------- IMPORT / EXPORT PROFILES JSON ---------------- */

  function exportAllProfiles() {
    if (!profiles.length) { toast("Aucun profil à exporter."); return; }
    downloadBlob(JSON.stringify(profiles, null, 2), "cardforge-profils.json", "application/json");
    toast("Profils exportés.");
  }

  function importAllProfiles(file) {
    const reader = new FileReader();
    reader.onload = () => {
      try {
        const imported = JSON.parse(reader.result);
        if (!Array.isArray(imported)) throw new Error("Format invalide");
        const existingIds = new Set(profiles.map(p => p.id));
        imported.forEach(p => {
          if (!p || typeof p !== "object") return;
          if (existingIds.has(p.id)) p.id = uid();
          if (!p.theme) p.theme = createDefaultProfile().theme;
          if (!p.socials) p.socials = createDefaultProfile().socials;
          profiles.push(p);
        });
        saveProfiles();
        renderDashboard();
        renderProfilesList();
        toast(`${imported.length} profil(s) importé(s).`);
      } catch (e) {
        console.error(e);
        toast("Fichier JSON invalide.");
      }
    };
    reader.readAsText(file);
  }

  /* ---------------- EVENT WIRING ---------------- */

  function wireNav() {
    document.querySelectorAll(".nav-item").forEach(btn => {
      btn.addEventListener("click", () => {
        document.getElementById("fullscreen-modal").hidden = true;
        showView(btn.dataset.view);
      });
    });
    document.getElementById("dash-new-card").addEventListener("click", startNewProfile);
  }

  function wireForm() {
    buildSocialsFixedFields();
    buildThemeSwatches();
    bindSimpleFields();
    document.getElementById("btn-add-social").addEventListener("click", () => {
      currentProfile.socials.push({ network: "", url: "", custom: true });
      renderCustomSocials();
    });
  }

  function wireActions() {
    document.getElementById("btn-save-profile").addEventListener("click", saveCurrentProfile);
    document.getElementById("btn-download-html").addEventListener("click", handleDownloadHTML);
    document.getElementById("btn-download-vcf").addEventListener("click", handleDownloadVCF);
    document.getElementById("btn-copy-link").addEventListener("click", handleCopyLink);

    document.getElementById("btn-fullscreen").addEventListener("click", () => {
      document.getElementById("fullscreen-modal").hidden = false;
      renderCardInto(document.getElementById("card-render-fullscreen"), currentProfile);
    });
    document.getElementById("close-fullscreen").addEventListener("click", () => {
      document.getElementById("fullscreen-modal").hidden = true;
    });

    document.getElementById("btn-export-all").addEventListener("click", exportAllProfiles);
    document.getElementById("btn-import-all").addEventListener("click", () => document.getElementById("import-file-input").click());
    document.getElementById("import-file-input").addEventListener("change", e => {
      if (e.target.files[0]) importAllProfiles(e.target.files[0]);
      e.target.value = "";
    });

    document.getElementById("btn-clear-all").addEventListener("click", () => {
      if (!confirm("Effacer définitivement tous les profils enregistrés ?")) return;
      profiles = [];
      saveProfiles();
      renderDashboard();
      renderProfilesList();
      toast("Tous les profils ont été effacés.");
    });

    document.getElementById("fullscreen-modal").addEventListener("click", e => {
      if (e.target === document.getElementById("fullscreen-modal")) e.target.hidden = true;
    });
  }

  /* ---------------- INIT ---------------- */

  function init() {
    wireNav();
    wireForm();
    wireActions();
    currentProfile = createDefaultProfile();
    populateForm(currentProfile);
    renderAll();
    showView("dashboard");
  }

  document.addEventListener("DOMContentLoaded", init);
})();
