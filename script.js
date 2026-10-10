// WISY demo app + browser-only authentication
"use strict";

const WISY_USERS_KEY = "wisy_users_v1";
const WISY_SESSION_KEY = "wisy_session_v1";
const WISY_APPS_KEY = "wisy_apps_v1";
const WISY_PHOTO_KEY = "wisy_profile_photo_v1";

const readJSON = (key, fallback) => {
  try { return JSON.parse(localStorage.getItem(key) || JSON.stringify(fallback)); }
  catch { return fallback; }
};

let users = readJSON(WISY_USERS_KEY, []);
let session = readJSON(WISY_SESSION_KEY, null);

const demoApps = [
  {name:"Black Myth",dev:"WISY Studio",cat:"Games",icon:"🐒",desc:"Action adventure experience built for modern players.",downloads:"24.8K",version:"1.0.0"},
  {name:"Nova Notes",dev:"Pixel Labs",cat:"Tools",icon:"✦",desc:"Fast, elegant notes with a focused writing workspace.",downloads:"18.2K",version:"1.0.0"},
  {name:"FrameFlow",dev:"Mango Design",cat:"Design",icon:"◈",desc:"Create beautiful social graphics in a few simple steps.",downloads:"11.6K",version:"1.0.0"},
  {name:"Learnly",dev:"Bright Minds",cat:"Education",icon:"◎",desc:"Interactive lessons designed for everyday learning.",downloads:"9.4K",version:"1.0.0"},
  {name:"TaskPilot",dev:"Orbit Works",cat:"Business",icon:"◆",desc:"A lightweight workspace for teams and projects.",downloads:"7.8K",version:"1.0.0"},
  {name:"Pixel Runner",dev:"WISY Arcade",cat:"Games",icon:"⚡",desc:"Fast arcade challenges with a clean retro feel.",downloads:"6.3K",version:"1.0.0"}
];

let publishedApps = readJSON(WISY_APPS_KEY, []);
let apps = [...publishedApps, ...demoApps];

const $ = (s) => document.querySelector(s);
const $$ = (s) => [...document.querySelectorAll(s)];

const featured = $("#featured");
const discover = $("#discoverGrid");
const myGrid = $("#myAppsGrid");

function esc(value) {
  return String(value ?? "").replace(/[&<>"']/g, ch => ({
    "&":"&amp;","<":"&lt;",">":"&gt;",'"':"&quot;","'":"&#039;"
  }[ch]));
}

function getUserById(id) {
  return users.find(u => u.id === id) || null;
}

function getOwnerProfile(a) {
  if (a.ownerId) {
    const u = getUserById(a.ownerId);
    if (u) return u;
  }
  return {id:"", name:a.dev || "WISY Developer", username:"", email:"", bio:""};
}

function userInitial(user) {
  return (user?.name || user?.username || "W")[0].toUpperCase();
}

function userPhoto(user) {
  return user?.photo || "";
}

function ownerProfileButton(a) {
  const owner = getOwnerProfile(a);
  const photo = userPhoto(owner);
  const avatar = photo
    ? `<span class="mini-profile-photo" style="background-image:url('${esc(photo)}')"></span>`
    : `<span class="mini-profile-photo">${esc(userInitial(owner))}</span>`;
  return `<div class="app-owner">
    ${avatar}
    <span class="owner-name">${esc(owner.name || owner.username || a.dev || "Developer")}</span>
    <button class="profile-link" type="button" data-profile-id="${esc(owner.id)}" data-app-owner="${esc(a.dev || "")}">Profile</button>
  </div>`;
}

function getAppOpenUrl(a) {
  if (a.url && /^(https?:|blob:|data:)/i.test(a.url)) return a.url;
  if (a.htmlCode) return "data:text/html;charset=utf-8," + encodeURIComponent(a.htmlCode);
  return "";
}

function card(a, options = {}) {
  const safeUrl = getAppOpenUrl(a);
  const openControl = safeUrl
    ? `<a class="btn ghost open-app-btn" target="_blank" rel="noopener" href="${esc(safeUrl)}">Open app →</a>`
    : `<button class="btn ghost open-app-btn" type="button" disabled title="No app URL has been added yet">Open app →</button>`;

  const isMine = !!session && (a.ownerId === session.id || (!a.ownerId && a.dev === (session.name || session.username)));
  const deleteControl = options.myApps && isMine
    ? `<button class="btn danger delete-app-btn" type="button" data-app-id="${esc(a.id)}" data-app-name="${esc(a.name)}">🗑 Delete from WISY</button>`
    : "";

  return `<article class="card">
    <div class="app-cover">${esc(a.icon || "◉")}</div>
    <h3>${esc(a.name)}</h3>
    <p>${esc(a.desc)}</p>
    <div class="meta"><span>${esc(a.cat)}</span><span>v${esc(a.version || "1.0.0")}</span></div>
    ${ownerProfileButton(a)}
    <div class="meta"><span>↓ ${esc(a.downloads || "0")}</span><span>${esc(a.dev || "Developer")}</span></div>
    <div class="card-open">${openControl}</div>
    ${deleteControl}
  </article>`;
}

function render(list, el, options = {}) {
  if (el) el.innerHTML = list.length ? list.map(a => card(a, options)).join("") :
    `<div class="card"><h3>No apps found</h3><p>Try another search or category.</p></div>`;
}

function refreshApps() {
  publishedApps = readJSON(WISY_APPS_KEY, []);
  apps = [...publishedApps, ...demoApps];
  render(apps.slice(0,3), featured);
  render(apps, discover);
  render(myAppsForSession(), myGrid, {myApps:true});
}

function myAppsForSession() {
  if (!session) return [];
  return publishedApps.filter(a => a.ownerId === session.id);
}

function showToast(text) {
  const x = $("#toast");
  if (!x) return;
  x.textContent = text;
  x.classList.add("show");
  clearTimeout(showToast.timer);
  showToast.timer = setTimeout(() => x.classList.remove("show"), 2400);
}

// ---------- Authentication ----------
const authScreen = $("#authScreen");
const authForm = $("#authForm");
const loginTab = $("#loginTab");
const signupTab = $("#signupTab");
const nameWrap = $("#nameWrap");
const confirmWrap = $("#confirmWrap");
const authName = $("#authName");
const authUsername = $("#authUsername");
const authEmail = $("#authEmail");
const authPassword = $("#authPassword");
const authConfirm = $("#authConfirm");
const authSubmit = $("#authSubmit");
const authMsg = $("#authMsg");

let authMode = "login";

function setAuthMode(mode) {
  authMode = mode;
  loginTab.classList.toggle("active", mode === "login");
  signupTab.classList.toggle("active", mode === "signup");
  nameWrap.classList.toggle("hidden-field", mode !== "signup");
  confirmWrap.classList.toggle("hidden-field", mode !== "signup");
  authName.required = mode === "signup";
  authConfirm.required = mode === "signup";
  authSubmit.textContent = mode === "signup" ? "Create New ID" : "Login to WISY";
  authMsg.textContent = "";
}

loginTab.addEventListener("click", () => setAuthMode("login"));
signupTab.addEventListener("click", () => setAuthMode("signup"));

function updateAccountUI() {
  if (!session) {
    authScreen.style.display = "grid";
    return;
  }
  authScreen.style.display = "none";

  const avatar = $("#avatar");
  if (!avatar) return;

  const user = currentUser();
  const photo = user?.photo || "";
  if (photo) {
    avatar.textContent = "";
    avatar.style.backgroundImage = `url(${photo})`;
    avatar.style.backgroundSize = "cover";
    avatar.style.backgroundPosition = "center";
  } else {
    avatar.style.backgroundImage = "";
    avatar.textContent = (user?.name || session.name || session.username || "T")[0].toUpperCase();
  }
}

authForm.addEventListener("submit", (e) => {
  e.preventDefault();

  const username = authUsername.value.trim();
  const email = authEmail.value.trim().toLowerCase();
  const password = authPassword.value;

  if (authMode === "signup") {
    if (username.length < 3) {
      authMsg.textContent = "Username must be at least 3 characters";
      return;
    }
    if (password !== authConfirm.value) {
      authMsg.textContent = "Passwords do not match";
      return;
    }
    if (users.some(u => u.username.toLowerCase() === username.toLowerCase())) {
      authMsg.textContent = "Username already exists";
      return;
    }

    const id = "WISY-" + Math.random().toString(36).slice(2,8).toUpperCase();
    const user = { id, name: authName.value.trim(), username, email, password, bio:"", photo:"" };
    users.push(user);
    localStorage.setItem(WISY_USERS_KEY, JSON.stringify(users));

    session = { id, name: user.name, username: user.username, email: user.email };
    localStorage.setItem(WISY_SESSION_KEY, JSON.stringify(session));

    authForm.reset();
    setAuthMode("login");
    updateAccountUI();
    showToast("New WISY ID created");
    route();
    return;
  }

  const user = users.find(u =>
    u.username.toLowerCase() === username.toLowerCase() &&
    u.email.toLowerCase() === email &&
    u.password === password
  );

  if (!user) {
    authMsg.textContent = "Invalid username, email or password";
    return;
  }

  session = { id:user.id, name:user.name, username:user.username, email:user.email };
  localStorage.setItem(WISY_SESSION_KEY, JSON.stringify(session));

  authForm.reset();
  setAuthMode("login");
  updateAccountUI();
  showToast("Welcome back, " + (user.name || user.username));
  route();
});

$("#logoutBtn").addEventListener("click", (e) => {
  e.preventDefault();
  session = null;
  localStorage.removeItem(WISY_SESSION_KEY);
  updateAccountUI();
  location.hash = "home";
  showToast("Logged out");
});

$("#avatar").addEventListener("click", () => {
  if (!session) return;
  $("#profileTitle").textContent = session.name || session.username;
  $("#profileUsername").textContent = session.username;
  $("#profileEmail").textContent = session.email;
  $("#profileId").textContent = session.id;
  $("#profileModal").classList.remove("hidden");
});

$("#closeProfile").addEventListener("click", () => $("#profileModal").classList.add("hidden"));
$("#profileModal").addEventListener("click", (e) => {
  if (e.target.id === "profileModal") e.currentTarget.classList.add("hidden");
});

// ---------- Routing ----------
function route() {
  const id = location.hash.slice(1) || "home";

  if (["publish","myapps","analytics","settings"].includes(id) && !session) {
    authScreen.style.display = "grid";
    setAuthMode("login");
    return;
  }

  const page = $("#" + id);
  const target = page && page.classList.contains("page") ? id : "home";

  $$(".page").forEach(p => p.classList.toggle("hidden", p.id !== target));
  $$(".sidebar nav a").forEach(a => a.classList.toggle("active", a.getAttribute("href") === "#" + target));

  if (target === "discover") render(apps, discover);
  if (target === "myapps") render(myAppsForSession(), myGrid, {myApps:true});

  window.scrollTo({top:0, behavior:"smooth"});
}

window.addEventListener("hashchange", route);

// ---------- Search ----------
$("#search").addEventListener("input", (e) => {
  const q = e.target.value.toLowerCase().trim();
  const list = !q ? apps : apps.filter(a =>
    `${a.name} ${a.dev} ${a.cat} ${a.desc}`.toLowerCase().includes(q)
  );
  render(list, discover);
  if (location.hash !== "#discover") location.hash = "discover";
});

// ---------- Filters ----------
$$(".filter").forEach(btn => btn.addEventListener("click", () => {
  $$(".filter").forEach(b => b.classList.remove("active"));
  btn.classList.add("active");
  const cat = btn.dataset.cat;
  render(cat === "All" ? apps : apps.filter(a => a.cat === cat), discover);
}));

// ---------- Publish ----------
$("#publishForm").addEventListener("submit", (e) => {
  e.preventDefault();
  if (!session) {
    authScreen.style.display = "grid";
    setAuthMode("login");
    return;
  }

  const fileInput = e.currentTarget.querySelector('input[type="file"]');
  const iconFile = fileInput?.files?.[0];

  const app = {
    id: "APP-" + Date.now().toString(36).toUpperCase(),
    ownerId: session.id,
    name: $("#appName").value.trim(),
    dev: $("#developer").value.trim(),
    cat: $("#category").value,
    icon: iconFile ? "📱" : "◉",
    desc: $("#description").value.trim(),
    url: $("#url").value.trim(),
    downloads: "0",
    version: $("#version").value.trim() || "1.0.0"
  };

  publishedApps.unshift(app);
  localStorage.setItem(WISY_APPS_KEY, JSON.stringify(publishedApps));
  refreshApps();

  $("#publishMsg").textContent = "✓ Published in this browser";
  e.currentTarget.reset();
  $("#version").value = "1.0.0";
  showToast("App published successfully");
  location.hash = "myapps";
});

// ---------- Profile ----------
function currentUser() {
  if (!session) return null;
  return users.find(u => u.id === session.id) || null;
}

function saveUsers() {
  localStorage.setItem(WISY_USERS_KEY, JSON.stringify(users));
}

function applyProfileToSession() {
  const u = currentUser();
  if (!u) return;
  session.name = u.name || u.username;
  session.email = u.email;
  localStorage.setItem(WISY_SESSION_KEY, JSON.stringify(session));
}

function profilePhotoForUser(user) {
  return user?.photo || "";
}

function openProfileById(id, fallbackName) {
  const u = id ? getUserById(id) : null;
  const profile = u || {name:fallbackName || "WISY Developer", username:"", email:"", id:"", bio:""};
  const photo = profilePhotoForUser(profile);

  $("#profileTitle").textContent = profile.name || profile.username || fallbackName || "Developer";
  $("#profileUsername").textContent = profile.username ? "@" + profile.username : "Developer";
  $("#profileEmail").textContent = profile.email || "—";
  $("#profileId").textContent = profile.id || "—";
  $("#profileBioText").textContent = profile.bio || "No bio added yet.";

  const av = $("#profileAvatarLarge");
  if (photo) {
    av.textContent = "";
    av.style.backgroundImage = `url(${photo})`;
    av.style.backgroundSize = "cover";
    av.style.backgroundPosition = "center";
  } else {
    av.style.backgroundImage = "";
    av.textContent = userInitial(profile);
  }

  const edit = $("#editMyProfileBtn");
  const mine = !!session && !!u && u.id === session.id;
  edit.style.display = mine ? "inline-flex" : "none";

  $("#profileModal").classList.remove("hidden");
}

$("#avatar").addEventListener("click", () => {
  if (!session) return;
  openProfileById(session.id);
});

document.addEventListener("click", (e) => {
  const profileBtn = e.target.closest(".profile-link");
  if (!profileBtn) return;
  openProfileById(profileBtn.dataset.profileId, profileBtn.dataset.appOwner);
});

$("#closeProfile").addEventListener("click", () => $("#profileModal").classList.add("hidden"));
$("#profileModal").addEventListener("click", (e) => {
  if (e.target.id === "profileModal") e.currentTarget.classList.add("hidden");
});

$("#editMyProfileBtn").addEventListener("click", () => {
  $("#profileModal").classList.add("hidden");
  const u = currentUser();
  if (!u) return;
  $("#profileDisplayName").value = u.name || "";
  $("#profileBio").value = u.bio || "";
  location.hash = "settings";
});

$("#profileEditForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const u = currentUser();
  if (!u) return;

  const photoFile = $("#profilePhotoInput").files?.[0];
  u.name = $("#profileDisplayName").value.trim() || u.username;
  u.bio = $("#profileBio").value.trim();

  if (photoFile) {
    if (photoFile.size > 2 * 1024 * 1024) {
      $("#profileEditMsg").textContent = "Photo must be under 2 MB";
      return;
    }
    u.photo = await new Promise((resolve, reject) => {
      const reader = new FileReader();
      reader.onload = () => resolve(reader.result);
      reader.onerror = reject;
      reader.readAsDataURL(photoFile);
    });
  }

  saveUsers();
  applyProfileToSession();
  updateAccountUI();

  publishedApps = readJSON(WISY_APPS_KEY, []);
  publishedApps = publishedApps.map(a =>
    a.ownerId === session.id ? {...a, dev:u.name || u.username} : a
  );
  localStorage.setItem(WISY_APPS_KEY, JSON.stringify(publishedApps));

  refreshApps();
  $("#profileEditMsg").textContent = "✓ Profile saved";
  showToast("Profile updated");
});

$("#clearPhotoBtn").addEventListener("click", () => {
  const u = currentUser();
  if (!u) return;
  delete u.photo;
  saveUsers();
  updateAccountUI();
  refreshApps();
  $("#profileEditMsg").textContent = "✓ Profile photo removed";
  showToast("Profile photo removed");
});

// ---------- HTML file -> temporary URL ----------
let htmlObjectUrl = null;

$("#makeHtmlUrlBtn").addEventListener("click", async () => {
  const file = $("#htmlUrlFile").files?.[0];
  if (!file) {
    showToast("Choose an HTML file first");
    return;
  }
  try {
    const code = await file.text();
    if (htmlObjectUrl) URL.revokeObjectURL(htmlObjectUrl);
    htmlObjectUrl = URL.createObjectURL(new Blob([code], {type:"text/html"}));
    $("#htmlUrlOutput").value = htmlObjectUrl;
    $("#copyHtmlUrlBtn").disabled = false;
    window.open(htmlObjectUrl, "_blank", "noopener");
    showToast("Temporary HTML URL created");
  } catch {
    showToast("Could not read the HTML file");
  }
});

$("#copyHtmlUrlBtn").addEventListener("click", async () => {
  const value = $("#htmlUrlOutput").value;
  if (!value) return;
  try {
    await navigator.clipboard.writeText(value);
    showToast("URL copied");
  } catch {
    $("#htmlUrlOutput").select();
    document.execCommand("copy");
    showToast("URL copied");
  }
});

// ---------- HTML -> APK starter project ----------
function safeFileName(name) {
  return name.replace(/[^a-z0-9_-]+/gi, "-").replace(/^-+|-+$/g, "").toLowerCase() || "wisy-app";
}

$("#makeApkProjectBtn").addEventListener("click", async () => {
  const file = $("#apkHtmlFile").files?.[0];
  const appName = $("#apkAppName").value.trim() || "WISY App";
  const msg = $("#apkMsg");

  if (!file) {
    msg.textContent = "Choose an HTML file first";
    return;
  }

  try {
    const htmlCode = await file.text();
    const safe = safeFileName(appName);

    const manifest = `<?xml version="1.0" encoding="utf-8"?>
<manifest xmlns:android="http://schemas.android.com/apk/res/android">
    <application android:theme="@style/Theme.WisyApp" android:label="${appName.replace(/"/g,'&quot;')}">
        <activity android:name=".MainActivity" android:exported="true">
            <intent-filter>
                <action android:name="android.intent.action.MAIN"/>
                <category android:name="android.intent.category.LAUNCHER"/>
            </intent-filter>
        </activity>
    </application>
</manifest>`;

    const activity = `package com.wisy.app;

import android.app.Activity;
import android.os.Bundle;
import android.webkit.WebView;
import android.webkit.WebViewClient;

public class MainActivity extends Activity {
    @Override protected void onCreate(Bundle savedInstanceState) {
        super.onCreate(savedInstanceState);
        WebView web = new WebView(this);
        web.setWebViewClient(new WebViewClient());
        web.getSettings().setJavaScriptEnabled(true);
        web.loadUrl("file:///android_asset/index.html");
        setContentView(web);
    }
}`;

    const readme = `# ${appName} — WISY Android starter

This package contains a starter Android WebView project layout.

1. Put index.html in app/src/main/assets/
2. Put MainActivity.java in the matching Java package.
3. Add the Android manifest and a theme.
4. Open/build the project with Android Studio or Gradle.
5. Generate/sign the APK there.

This browser tool does not compile or sign an APK itself.`;

    // Create a ZIP in the browser using JSZip when available; otherwise offer the HTML file.
    if (typeof JSZip === "undefined") {
      const combined = `WISY APK STARTER\\n\\n${readme}\\n\\n--- AndroidManifest.xml ---\\n${manifest}\\n\\n--- MainActivity.java ---\\n${activity}\\n\\n--- index.html ---\\n${htmlCode}`;
      const blob = new Blob([combined], {type:"text/plain"});
      const a = document.createElement("a");
      a.href = URL.createObjectURL(blob);
      a.download = safe + "-apk-starter.txt";
      a.click();
      setTimeout(() => URL.revokeObjectURL(a.href), 1000);
      msg.textContent = "Starter instructions downloaded";
      showToast("APK starter prepared");
      return;
    }

    const zip = new JSZip();
    zip.file("README.md", readme);
    zip.file("app/src/main/assets/index.html", htmlCode);
    zip.file("app/src/main/AndroidManifest.xml", manifest);
    zip.file("app/src/main/java/com/wisy/app/MainActivity.java", activity);
    zip.file("app/src/main/res/values/themes.xml", `<resources><style name="Theme.WisyApp" parent="android:style/Theme.Material.Light.NoActionBar"/></resources>`);
    const out = await zip.generateAsync({type:"blob"});
    const a = document.createElement("a");
    a.href = URL.createObjectURL(out);
    a.download = safe + "-android-starter.zip";
    a.click();
    setTimeout(() => URL.revokeObjectURL(a.href), 1000);
    msg.textContent = "Android starter ZIP prepared";
    showToast("APK project prepared");
  } catch (err) {
    msg.textContent = "Could not prepare the project";
  }
});

// ---------- Publish HTML file ----------
$("#publishHtmlFileBtn").addEventListener("click", async () => {
  if (!session) {
    authScreen.style.display = "grid";
    setAuthMode("login");
    showToast("Login required to publish");
    return;
  }

  const file = $("#apkHtmlFile").files?.[0];
  const appName = $("#apkAppName").value.trim() || file?.name?.replace(/\.(html?|HTML?)$/i, "") || "WISY HTML App";
  if (!file) {
    $("#apkMsg").textContent = "Choose an HTML file first";
    return;
  }

  try {
    const htmlCode = await file.text();
    const published = {
      id: "APP-" + Date.now().toString(36).toUpperCase(),
      ownerId: session.id,
      name: appName,
      dev: session.name || session.username,
      cat: "Tools",
      icon: "🌐",
      desc: "HTML app published from a file.",
      url: "data:text/html;charset=utf-8," + encodeURIComponent(htmlCode),
      htmlCode,
      htmlFileName: file.name,
      downloads: "0",
      version: "1.0.0"
    };

    publishedApps.unshift(published);
    localStorage.setItem(WISY_APPS_KEY, JSON.stringify(publishedApps));
    refreshApps();
    $("#apkMsg").textContent = "✓ HTML app published";
    showToast("HTML app published to My Apps");
    location.hash = "myapps";
  } catch {
    $("#apkMsg").textContent = "Could not read the HTML file";
  }
});

// ---------- Forgot password + verification ----------
let pendingResetUser = null;
let pendingVerifyCode = null;

function openForgot() {
  $("#forgotUsername").value = "";
  $("#forgotEmail").value = "";
  $("#verifyCode").value = "";
  $("#forgotNewPassword").value = "";
  $("#forgotMsg").textContent = "";
  $("#forgotStep1").classList.remove("hidden-field");
  $("#forgotStep2").classList.add("hidden-field");
  pendingResetUser = null;
  pendingVerifyCode = null;
  $("#forgotModal").classList.remove("hidden");
}

const openForgotBtn = $("#openForgotBtn");
if (openForgotBtn) openForgotBtn.addEventListener("click", openForgot);
$("#loginForgotBtn").addEventListener("click", openForgot);

$("#closeForgot").addEventListener("click", () => $("#forgotModal").classList.add("hidden"));
$("#forgotModal").addEventListener("click", (e) => {
  if (e.target.id === "forgotModal") e.currentTarget.classList.add("hidden");
});

$("#sendVerifyBtn").addEventListener("click", () => {
  const username = $("#forgotUsername").value.trim();
  const email = $("#forgotEmail").value.trim().toLowerCase();

  const user = users.find(u =>
    u.username.toLowerCase() === username.toLowerCase() &&
    u.email.toLowerCase() === email
  );

  if (!user) {
    $("#forgotMsg").textContent = "Username and email do not match";
    return;
  }

  pendingResetUser = user.id;
  pendingVerifyCode = String(Math.floor(100000 + Math.random() * 900000));
  $("#forgotStep2").classList.remove("hidden-field");
  $("#forgotMsg").textContent = "Demo verification code: " + pendingVerifyCode;
});

$("#resetPasswordBtn").addEventListener("click", () => {
  const code = $("#verifyCode").value.trim();
  const newPassword = $("#forgotNewPassword").value;

  if (!pendingResetUser || code !== pendingVerifyCode) {
    $("#forgotMsg").textContent = "Invalid verification code";
    return;
  }
  if (newPassword.length < 4) {
    $("#forgotMsg").textContent = "New password must be at least 4 characters";
    return;
  }

  const index = users.findIndex(u => u.id === pendingResetUser);
  if (index < 0) {
    $("#forgotMsg").textContent = "Account not found";
    return;
  }

  users[index].password = newPassword;
  localStorage.setItem(WISY_USERS_KEY, JSON.stringify(users));
  $("#forgotMsg").textContent = "✓ Password reset successfully";
  showToast("Password updated");
  pendingResetUser = null;
  pendingVerifyCode = null;
  setTimeout(() => {
    $("#forgotModal").classList.add("hidden");
    setAuthMode("login");
  }, 900);
});

// ---------- Delete my app ----------
document.addEventListener("click", (e) => {
  const btn = e.target.closest(".delete-app-btn");
  if (!btn) return;

  const appId = btn.dataset.appId;
  const app = publishedApps.find(a => a.id === appId);
  if (!app || !session) {
    showToast("App not found");
    return;
  }

  const mine = app.ownerId === session.id || (!app.ownerId && app.dev === (session.name || session.username));
  if (!mine) {
    showToast("You can delete only your own app");
    return;
  }

  if (!confirm(`Delete "${app.name}" from WISY?`)) return;

  publishedApps = publishedApps.filter(a => a.id !== appId);
  localStorage.setItem(WISY_APPS_KEY, JSON.stringify(publishedApps));
  refreshApps();
  location.hash = "myapps";
  showToast("✓ App deleted from WISY");
});

// Initial render
refreshApps();
updateAccountUI();
route();


document.addEventListener("click", (e) => {
  const btn = e.target.closest(".open-app-btn");
  if (btn && btn.disabled) showToast("This app has no URL yet");
});

/* Direct HTML upload: Open only, no download control */
let directHtmlBlobUrl = "";

const directHtmlFile = document.querySelector("#directHtmlFile");
const openDirectHtmlBtn = document.querySelector("#openDirectHtmlBtn");
const directHtmlMsg = document.querySelector("#directHtmlMsg");

if (directHtmlFile && openDirectHtmlBtn) {
  directHtmlFile.addEventListener("change", () => {
    const file = directHtmlFile.files && directHtmlFile.files[0];
    if (!file) {
      openDirectHtmlBtn.disabled = true;
      return;
    }
    if (!/\.html?$/i.test(file.name) && file.type !== "text/html") {
      directHtmlMsg.textContent = "Please choose an HTML file.";
      openDirectHtmlBtn.disabled = true;
      return;
    }
    if (directHtmlBlobUrl) URL.revokeObjectURL(directHtmlBlobUrl);
    directHtmlBlobUrl = URL.createObjectURL(new Blob([file], {type:"text/html"}));
    openDirectHtmlBtn.disabled = false;
    directHtmlMsg.textContent = "✓ " + file.name + " ready to open";
  });

  openDirectHtmlBtn.addEventListener("click", () => {
    if (!directHtmlBlobUrl) return;
    window.open(directHtmlBlobUrl, "_blank", "noopener");
  });
}
