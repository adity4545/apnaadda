(function () {
  "use strict";

  var mode = "login";
  var usersKey = "apnaadda-account";
  var tabs = document.querySelectorAll(".account-tab");
  var form = document.getElementById("accountForm");
  var message = document.getElementById("accountMessage");
  var title = document.getElementById("accountTitle");
  var intro = document.getElementById("accountIntro");
  var nameField = document.getElementById("nameField");
  var submit = document.getElementById("accountSubmit");
  var googleButton = document.getElementById("googleButton");
  var auth = document.getElementById("accountAuth");
  var dashboard = document.getElementById("accountDashboard");

  function googleClientId() {
    var meta = document.querySelector('meta[name="google-client-id"]');
    return window.APNAADDA_GOOGLE_CLIENT_ID || (meta ? meta.content : "");
  }

  function showMessage(text, error) {
    message.textContent = text;
    message.classList.toggle("error", !!error);
    message.hidden = false;
  }

  function getUser() {
    try { return JSON.parse(localStorage.getItem(usersKey) || "null"); } catch (error) { return null; }
  }

  function showDashboard(user) {
    if (!user || !user.email) return;
    auth.hidden = true;
    dashboard.hidden = false;
    document.getElementById("dashboardName").textContent = user.name || user.email.split("@")[0];
    document.getElementById("dashboardEmail").textContent = user.email;
    document.getElementById("settingsName").textContent = user.name || "Not added";
    document.getElementById("settingsEmail").textContent = user.email;
  }

  function signOut() {
    localStorage.removeItem(usersKey);
    dashboard.hidden = true;
    auth.hidden = false;
    form.reset();
    setMode("login");
  }

  function setMode(next) {
    mode = next;
    tabs.forEach(function (tab) {
      var active = tab.getAttribute("data-mode") === mode;
      tab.classList.toggle("active", active);
      tab.setAttribute("aria-selected", active ? "true" : "false");
    });
    var registering = mode === "register";
    title.textContent = registering ? "Make it yours." : "Welcome back.";
    intro.textContent = registering ? "Create an account to keep your orders and saved pieces together." : "Sign in to view orders, saved pieces and delivery details.";
    nameField.hidden = !registering;
    document.getElementById("accountName").required = registering;
    submit.textContent = registering ? "Create account" : "Sign in";
    message.hidden = true;
  }

  tabs.forEach(function (tab) { tab.addEventListener("click", function () { setMode(tab.getAttribute("data-mode")); }); });
  form.addEventListener("submit", function (event) {
    event.preventDefault();
    var email = document.getElementById("accountEmail").value.trim().toLowerCase();
    var password = document.getElementById("accountPassword").value;
    if (mode === "register") {
      localStorage.setItem(usersKey, JSON.stringify({ name: document.getElementById("accountName").value.trim(), email: email }));
      showMessage("Account created for " + email + ". You can now sign in.");
      setMode("login");
      document.getElementById("accountEmail").value = email;
      return;
    }
    var user = getUser();
    if (!user || user.email !== email) { showMessage("No local account found for this email. Create an account first.", true); return; }
    showMessage("Signed in as " + (user.name || email) + ".");
    showDashboard(user);
    form.reset();
  });

  googleButton.addEventListener("click", function () {
    var clientId = googleClientId();
    if (!clientId) {
      showMessage("Google sign-in needs a Google OAuth Web Client ID. Add it to APNAADDA_GOOGLE_CLIENT_ID.", true);
      return;
    }
    if (!window.google || !window.google.accounts || !window.google.accounts.id) {
      showMessage("Google sign-in is still loading. Please try again in a moment.", true);
      return;
    }
    window.google.accounts.id.initialize({ client_id: clientId, callback: async function (response) {
      try {
        var result = await fetch((window.APNAADDA_API_BASE || "http://localhost:4173") + "/api/google-login", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ credential: response.credential })
        });
        var payload = await result.json();
        if (!result.ok || !payload.user) throw new Error(payload.error || "Google verification failed");
        localStorage.setItem(usersKey, JSON.stringify(payload.user));
        showDashboard(payload.user);
        window.dispatchEvent(new CustomEvent("apnaadda-google-credential", { detail: payload.user }));
      } catch (error) {
        showMessage("Google sign-in failed: " + error.message, true);
      }
    } });
    window.google.accounts.id.prompt();
  });

  document.getElementById("accountLogout").addEventListener("click", signOut);
  showDashboard(getUser());
})();
