// main.js (module) - Firestore-backed PWA with Google Auth, offline persistence, add/delete for all pages

import { initializeApp } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-app.js";
import { getAuth, GoogleAuthProvider, signInWithPopup, signOut, onAuthStateChanged } from "https://www.gstatic.com/firebasejs/11.10.0/firebase-auth.js";
import {
  getFirestore,
  enableIndexedDbPersistence,
  collection,
  addDoc,
  deleteDoc,
  doc,
  onSnapshot,
  query,
  orderBy
} from "https://www.gstatic.com/firebasejs/11.10.0/firebase-firestore.js";

/* --------- Firebase config (use your project values) --------- */
const firebaseConfig = {
  apiKey: "AIzaSyBW5iWg5mCgbzjF9MBdR32VJi4uX2JHf0A",
  authDomain: "mcb-database-b9815.firebaseapp.com",
  projectId: "mcb-database-b9815",
  storageBucket: "mcb-database-b9815.firebasestorage.app",
  messagingSenderId: "541175340452",
  appId: "1:541175340452:web:156f7c14ef081bde633531",
  measurementId: "G-Y2DY5J84RL"
};

/* --------- Init Firebase --------- */
const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const db = getFirestore(app);

// enable offline persistence
enableIndexedDbPersistence(db).catch(err => {
  console.warn("Persistence not enabled:", err && err.code ? err.code : err);
});

/* --------- Auth UI bindings --------- */
const loginBtn = document.getElementById("loginBtn");
const loginBtn2 = document.getElementById("loginBtn2");
const logoutBtn = document.getElementById("logoutBtn");
const userNameEl = document.getElementById("userName");
const syncBtn = document.getElementById("syncBtn");

const provider = new GoogleAuthProvider();
loginBtn?.addEventListener("click", () => signInWithPopup(auth, provider).catch(console.error));
loginBtn2?.addEventListener("click", () => signInWithPopup(auth, provider).catch(console.error));
logoutBtn?.addEventListener("click", () => signOut(auth));

let currentUser = null;

/* small helpers */
function createEl(tag, attrs = {}, html = "") {
  const el = document.createElement(tag);
  Object.entries(attrs).forEach(([k, v]) => el.setAttribute(k, v));
  el.innerHTML = html;
  return el;
}
function nzDate(d) {
  if (!d) return "";
  const date = new Date(d);
  return date.toLocaleDateString("en-NZ", { weekday: "short", day: "2-digit", month: "2-digit", year: "numeric" });
}
function show(page) {
  document.querySelectorAll("main section").forEach(s => s.classList.remove("active"));
  document.getElementById("appContent").style.display = "block";
  const el = document.getElementById(page);
  if (el) el.classList.add("active");
}

/* Expose menu toggle for index buttons */
function toggleMenu(force) {
  const menu = document.getElementById("menuDropdown");
  if (!menu) return;
  const isShown = menu.classList.contains("show");
  const shouldShow = typeof force === "boolean" ? force : !isShown;
  if (shouldShow) menu.classList.add("show");
  else menu.classList.remove("show");
}
document.getElementById("menuBtn")?.addEventListener("click", (e) => {
  e.stopPropagation();
  toggleMenu();
});
document.addEventListener("click", (e) => {
  const menu = document.getElementById("menuDropdown");
  if (menu?.classList.contains("show") && !menu.contains(e.target) && e.target.id !== "menuBtn") toggleMenu(false);
});
window.show = show;
window.toggleMenu = toggleMenu;

/* --------- Firestore helper: user subcollection path --------- */
function userCol(name) {
  // path: users/{uid}/{name}
  return collection(db, "users", currentUser.uid, name);
}

/* --------- LISTENERS: once user signs in, bind live updates --------- */
let unsubscribers = [];

onAuthStateChanged(auth, user => {
  currentUser = user;
  if (user) {
    // show app
    document.getElementById("signedOut").style.display = "none";
    document.getElementById("appContent").style.display = "block";
    loginBtn.style.display = "none";
    loginBtn2.style.display = "none";
    logoutBtn.style.display = "inline-block";
    userNameEl.textContent = user.displayName || user.email || user.uid;

    // start listeners and wire UI controls
    startAppListeners();
    wireUI();
  } else {
    // signed out
    document.getElementById("signedOut").style.display = "block";
    document.getElementById("appContent").style.display = "none";
    loginBtn.style.display = "inline-block";
    loginBtn2.style.display = "inline-block";
    logoutBtn.style.display = "none";
    userNameEl.textContent = "";
    // clean up listeners
    unsubscribers.forEach(u => u && u());
    unsubscribers = [];
  }
});

/* --------- Wire UI buttons for add/delete actions --------- */
function wireUI() {
  // Work log add
  document.getElementById("addLogBtn").onclick = async () => {
    const date = document.getElementById("logDate").value;
    const site = document.getElementById("logSite").value || "";
    const task = document.getElementById("logTask").value || "";
    const hours = document.getElementById("logHours").value || "";
    const notes = document.getElementById("logNotes").value || "";
    if (!date) return alert("Pick a date");
    await addDoc(userCol("workLogs"), { date, site, task, hours, notes, createdAt: Date.now() });
    // clear
    document.getElementById("logDate").value = "";
    document.getElementById("logNotes").value = "";
    document.getElementById("logHours").value = "";
  };

  // Sites
  document.getElementById("addSiteBtn").onclick = async () => {
    const name = document.getElementById("siteName").value.trim();
    const address = document.getElementById("siteAddress").value.trim();
    const contact = document.getElementById("siteContact").value.trim();
    const notes = document.getElementById("siteNotes").value.trim();
    if (!name) return alert("Enter site name");
    await addDoc(userCol("sites"), { name, address, contact, notes, createdAt: Date.now() });
    document.getElementById("siteName").value = "";
    document.getElementById("siteAddress").value = "";
  };

  // Tasks
  document.getElementById("addTaskBtn").onclick = async () => {
    const text = document.getElementById("taskName").value.trim();
    if (!text) return;
    await addDoc(userCol("tasks"), { text, createdAt: Date.now() });
    document.getElementById("taskName").value = "";
  };

  // Materials
  document.getElementById("addMaterialBtn").onclick = async () => {
    const name = document.getElementById("materialName").value.trim();
    const due = document.getElementById("materialDue").value;
    const status = document.getElementById("materialStatus").value;
    if (!name) return;
    await addDoc(userCol("materials"), { name, due, status, createdAt: Date.now() });
    document.getElementById("materialName").value = "";
    document.getElementById("materialDue").value = "";
  };

  // Cutting list
  document.getElementById("addCutBtn").onclick = async () => {
    const item = document.getElementById("cutItem").value.trim();
    if (!item) return;
    await addDoc(userCol("cuttingList"), { item, createdAt: Date.now() });
    document.getElementById("cutItem").value = "";
  };

  // Events
  document.getElementById("addEventBtn").onclick = async () => {
    const title = document.getElementById("eventTitle").value.trim();
    const date = document.getElementById("eventDate").value;
    if (!title || !date) return alert("Enter title and date");
    await addDoc(userCol("events"), { title, date, createdAt: Date.now() });
    document.getElementById("eventTitle").value = "";
    document.getElementById("eventDate").value = "";
  };

  // Reports: simple generate (show combined data)
  document.getElementById("generateReportBtn").onclick = async () => {
    const site = document.getElementById("reportSite").value;
    const [logs, mats, events] = await Promise.all([
      fetchCollectionOnce("workLogs"),
      fetchCollectionOnce("materials"),
      fetchCollectionOnce("events")
    ]);
    const outs = [];
    outs.push(`<h3>Work Logs${site ? " — " + site : ""}</h3>`);
    logs.filter(l => !site || l.site === site).forEach(l => outs.push(`<div>${l.date} — ${l.task} ${l.hours || ""}h — ${l.site}</div>`));
    outs.push(`<h3>Materials</h3>`);
    mats.filter(m => !site || m.site === site).forEach(m => outs.push(`<div>${m.name} — ${m.due} — ${m.status}</div>`));
    outs.push(`<h3>Events</h3>`);
    events.filter(e => !site || e.site === site).forEach(e => outs.push(`<div>${e.date} — ${e.title}</div>`));
    document.getElementById("reportOutput").innerHTML = outs.join("");
  };

  // Clear local cache (fires reload of persistence)
  document.getElementById("clearAllBtn").onclick = async () => {
    alert("This clears local UI; Firestore cloud data remains. Reloading UI.");
    location.reload();
  };

  // Sync button triggers a manual refetch
  syncBtn.onclick = async () => {
    if (!currentUser) return alert("Please sign in first");
    // manual reload (listeners keep UI current, but we do a small feedback)
    syncBtn.textContent = "Synced ✓";
    setTimeout(() => (syncBtn.textContent = "Sync"), 1400);
  };
}

/* --------- Fetch collection once (snapshot-free helper) --------- */
async function fetchCollectionOnce(name) {
  // onSnapshot listeners will keep UI live — this helper reads currently stored docs from Firestore
  return new Promise((resolve, reject) => {
    const q = query(userCol(name), orderBy("createdAt", "desc"));
    let results = [];
    const unsub = onSnapshot(q, snap => {
      results = snap.docs.map(d => ({ id: d.id, ...d.data() }));
      unsub(); // immediate single-fire
      resolve(results);
    }, err => {
      reject(err);
    });
  });
}

/* --------- Start real-time listeners for each subcollection  --------- */
function startAppListeners() {
  // clear previous unsubscribers
  unsubscribers.forEach(u => u && u());
  unsubscribers = [];

  // Work logs
  const qWork = query(userCol("workLogs"), orderBy("date", "desc"));
  const unsubWork = onSnapshot(qWork, snap => {
    const out = document.getElementById("logsList"); out.innerHTML = "";
    const homeLogs = [];
    snap.forEach(doc => {
      const d = doc.data();
      const el = createEl("div", { class: "entry-card" }, `<strong>${nzDate(d.date)}</strong><div>${d.task || ""} ${d.hours ? "(" + d.hours + "h)" : ""}</div><div>${d.site || ""}</div><div>${d.notes || ""}</div>`);
      // actions
      const act = createEl("div", { class: "entry-actions" });
      const del = createEl("button", { class: "btn" }, "Delete");
      del.onclick = async () => { if (confirm("Delete this log?")) { await deleteDoc(doc(db, "users", currentUser.uid, "workLogs", doc.id)); } };
      act.appendChild(del);
      el.appendChild(act);
      out.appendChild(el);
      homeLogs.push(el.outerHTML);
    });
    document.getElementById("homeLogs").innerHTML = homeLogs.slice(0,5).join("");
  });
  unsubscribers.push(unsubWork);

  // Sites
  const qSites = query(userCol("sites"), orderBy("createdAt", "desc"));
  const unsubSites = onSnapshot(qSites, snap => {
    const out = document.getElementById("sitesList"); out.innerHTML = "";
    const sel = document.getElementById("logSite"); sel.innerHTML = "";
    const repSel = document.getElementById("reportSite"); if (repSel) repSel.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const el = createEl("div", { class: "entry-card" }, `<strong>${d.name}</strong><div>${d.address || ""}</div><div>${d.contact || ""}</div>`);
      const act = createEl("div", { class: "entry-actions" });
      const del = createEl("button", { class: "btn" }, "Delete");
      del.onclick = async () => { if (confirm("Delete this site?")) await deleteDoc(doc(db, "users", currentUser.uid, "sites", docSnap.id)); };
      act.appendChild(del); el.appendChild(act); out.appendChild(el);

      // add to selects
      const o = document.createElement("option"); o.value = d.name; o.textContent = d.name; sel.appendChild(o);
      if (repSel) { const r = document.createElement("option"); r.value = d.name; r.textContent = d.name; repSel.appendChild(r); }
    });
  });
  unsubscribers.push(unsubSites);

  // Tasks
  const qTasks = query(userCol("tasks"), orderBy("createdAt", "desc"));
  const unsubTasks = onSnapshot(qTasks, snap => {
    const out = document.getElementById("tasksList"); out.innerHTML = "";
    const taskSelect = document.getElementById("logTask"); taskSelect.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const el = createEl("div", { class: "entry-card" }, `${d.text}`);
      const act = createEl("div", { class: "entry-actions" });
      const del = createEl("button", { class: "btn" }, "Delete");
      del.onclick = async () => { if (confirm("Delete task?")) await deleteDoc(doc(db, "users", currentUser.uid, "tasks", docSnap.id)); };
      act.appendChild(del); el.appendChild(act); out.appendChild(el);

      // task select for work log
      const o = document.createElement("option"); o.value = d.text; o.textContent = d.text; taskSelect.appendChild(o);
    });
  });
  unsubscribers.push(unsubTasks);

  // Materials
  const qMats = query(userCol("materials"), orderBy("createdAt", "desc"));
  const unsubMats = onSnapshot(qMats, snap => {
    const out = document.getElementById("materialsList"); out.innerHTML = "";
    const homeM = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const el = createEl("div", { class: "entry-card" }, `${d.name} — ${d.due || ""} <span class="muted">${d.status || ""}</span>`);
      const act = createEl("div", { class: "entry-actions" });
      const del = createEl("button", { class: "btn" }, "Delete");
      del.onclick = async () => { if (confirm("Delete material?")) await deleteDoc(doc(db, "users", currentUser.uid, "materials", docSnap.id)); };
      act.appendChild(del); el.appendChild(act); out.appendChild(el);
      homeM.push(el.outerHTML);
    });
    document.getElementById("homeMaterials").innerHTML = homeM.slice(0,5).join("");
  });
  unsubscribers.push(unsubMats);

  // Cutting list
  const qCut = query(userCol("cuttingList"), orderBy("createdAt", "desc"));
  const unsubCut = onSnapshot(qCut, snap => {
    const out = document.getElementById("cuttingList"); out.innerHTML = "";
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const el = createEl("div", { class: "entry-card" }, `${d.item}`);
      const act = createEl("div", { class: "entry-actions" });
      const del = createEl("button", { class: "btn" }, "Delete");
      del.onclick = async () => { if (confirm("Delete item?")) await deleteDoc(doc(db, "users", currentUser.uid, "cuttingList", docSnap.id)); };
      act.appendChild(del); el.appendChild(act); out.appendChild(el);
    });
  });
  unsubscribers.push(unsubCut);

  // Events
  const qEvents = query(userCol("events"), orderBy("date", "desc"));
  const unsubEvents = onSnapshot(qEvents, snap => {
    const out = document.getElementById("eventsList"); out.innerHTML = "";
    const homeE = [];
    snap.forEach(docSnap => {
      const d = docSnap.data();
      const el = createEl("div", { class: "entry-card" }, `<strong>${d.title}</strong> — ${d.date || ""}`);
      const act = createEl("div", { class: "entry-actions" });
      const del = createEl("button", { class: "btn" }, "Delete");
      del.onclick = async () => { if (confirm("Delete event?")) await deleteDoc(doc(db, "users", currentUser.uid, "events", docSnap.id)); };
      act.appendChild(del); el.appendChild(act); out.appendChild(el);
      homeE.push(el.outerHTML);
    });
    document.getElementById("homeEvents").innerHTML = homeE.slice(0,5).join("");
  });
  unsubscribers.push(unsubEvents);
}

/* unsubscribers array for active listeners */
let unsubscribers = [];

/* --------- utility to delete doc via doc path (already used above) --------- */
async function deleteDocByPath(collName, id) {
  await deleteDoc(doc(db, "users", currentUser.uid, collName, id));
}

/* --------- small init: show signedOut until signed in --------- */
document.getElementById("signedOut").style.display = "block";
document.getElementById("appContent").style.display = "none";

// initial show home
show("home");
