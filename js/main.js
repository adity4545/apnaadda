/* ==========================================================================
  ApnaAdda — main.js
   Vanilla JS. One function per feature, guard clauses, reduced-motion aware.
   ========================================================================== */
(function () {
  "use strict";

  var reduceMotion = window.matchMedia("(prefers-reduced-motion: reduce)").matches;
  var FREE_SHIP = 150;
  var CURRENCY = "INR";

  /* ---------- Helpers ---------- */
  function $(sel, ctx) { return (ctx || document).querySelector(sel); }
  function $all(sel, ctx) { return Array.prototype.slice.call((ctx || document).querySelectorAll(sel)); }
  function money(n) { return "₹" + Math.round(n).toLocaleString("en-IN"); }
  function lockScroll(on) { document.body.classList.toggle("body-lock", !!on); }
  function apiUrl(path) {
    var base = window.APNAADDA_API_BASE || (window.location.port === "5501" ? "http://localhost:4173" : "");
    return base + path;
  }

  function initCurrency() {
    var walker = document.createTreeWalker(document.body, NodeFilter.SHOW_TEXT);
    var node;
    while ((node = walker.nextNode())) {
      if (node.parentElement && !["SCRIPT", "STYLE"].includes(node.parentElement.tagName)) {
        node.nodeValue = node.nodeValue.replace(/\$/g, "₹");
      }
    }
  }

  /* ---------- Toast ---------- */
  var toastTimer;
  function showToast(msg) {
    var t = $("#toast"), m = $("#toastMsg");
    if (!t || !m) return;
    m.textContent = msg;
    t.classList.add("show");
    clearTimeout(toastTimer);
    toastTimer = setTimeout(function () { t.classList.remove("show"); }, 2600);
  }

  /* ---------- Sticky header state ---------- */
  function initStickyHeader() {
    var header = $("#siteHeader");
    if (!header) return;
    function onScroll() { header.classList.toggle("is-stuck", window.scrollY > 12); }
    onScroll();
    window.addEventListener("scroll", onScroll, { passive: true });
  }

  /* ---------- Mobile nav ---------- */
  function initMobileNav() {
    var toggle = $("#navToggle"), nav = $("#mobileNav"), close = $("#navClose"), scrim = $("#scrim");
    if (!toggle || !nav) return;
    function open() {
      nav.classList.add("open");
      if (scrim) scrim.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
      lockScroll(true);
      var first = nav.querySelector("a");
      if (first) first.focus();
    }
    function shut() {
      nav.classList.remove("open");
      if (scrim) scrim.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
      lockScroll(false);
    }
    toggle.addEventListener("click", open);
    if (close) close.addEventListener("click", shut);
    if (scrim) scrim.addEventListener("click", shut);
    $all("a", nav).forEach(function (a) { a.addEventListener("click", shut); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && nav.classList.contains("open")) shut(); });
  }

  /* ---------- Search panel ---------- */
  function initSearch() {
    var toggle = $("#searchToggle"), panel = $("#searchPanel"), close = $("#searchClose"), input = $("#searchInput");
    if (!toggle || !panel) return;
    function open() {
      panel.classList.add("open");
      toggle.setAttribute("aria-expanded", "true");
      if (input) setTimeout(function () { input.focus(); }, 60);
    }
    function shut() {
      panel.classList.remove("open");
      toggle.setAttribute("aria-expanded", "false");
    }
    toggle.addEventListener("click", function () {
      panel.classList.contains("open") ? shut() : open();
    });
    if (close) close.addEventListener("click", shut);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && panel.classList.contains("open")) shut(); });
    document.addEventListener("click", function (e) {
      if (panel.classList.contains("open") && !panel.contains(e.target) && !toggle.contains(e.target)) shut();
    });
  }

  /* ---------- Product filtering ---------- */
  function initFilter() {
    var buttons = $all(".filter-btn");
    var cards = $all("#productGrid .product-card");
    var noRes = $("#noResults");
    if (!buttons.length || !cards.length) return;
    buttons.forEach(function (btn) {
      btn.addEventListener("click", function () {
        var f = btn.getAttribute("data-filter");
        buttons.forEach(function (b) {
          var on = b === btn;
          b.classList.toggle("active", on);
          b.setAttribute("aria-selected", on ? "true" : "false");
        });
        var shown = 0;
        cards.forEach(function (card) {
          var match = f === "all" || card.getAttribute("data-cat") === f;
          card.classList.toggle("hide", !match);
          if (match) shown++;
        });
        if (noRes) noRes.style.display = shown === 0 ? "block" : "none";
      });
    });
  }

  /* ---------- Wishlist toggles ---------- */
  function initWishlist() {
    $all(".pc-wish").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        var on = btn.classList.toggle("active");
        btn.setAttribute("aria-pressed", on ? "true" : "false");
        showToast(on ? "Saved to wishlist" : "Removed from wishlist");
      });
    });
    var big = $("#pdpWish");
    if (big) big.addEventListener("click", function () {
      var on = big.classList.toggle("active");
      big.setAttribute("aria-pressed", on ? "true" : "false");
      showToast(on ? "Saved to wishlist" : "Removed from wishlist");
    });
  }

  /* ==========================================================================
     Cart
     ========================================================================== */
  var cart = [];
  var CART_STORAGE_KEY = "apnaadda-cart";

  function saveCart() {
    try { localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart)); } catch (error) { }
  }

  function loadCart() {
    try {
      var stored = JSON.parse(localStorage.getItem(CART_STORAGE_KEY) || "[]");
      if (Array.isArray(stored)) cart = stored.filter(function (item) {
        return item && item.id && item.name && Number.isFinite(Number(item.price)) && Number(item.qty) > 0;
      }).map(function (item) {
        item.price = Number(item.price);
        item.qty = Number(item.qty);
        return item;
      });
    } catch (error) { cart = []; }
  }

  function cartKey(item) { return item.id + "|" + (item.variant || ""); }

  function addToCart(item) {
    var key = cartKey(item);
    var existing = cart.filter(function (c) { return cartKey(c) === key; })[0];
    if (existing) { existing.qty += item.qty; }
    else { cart.push(item); }
    saveCart();
    renderCart(true);
  }

  function removeFromCart(key) {
    cart = cart.filter(function (c) { return cartKey(c) !== key; });
    saveCart();
    renderCart();
  }

  function changeQty(key, delta) {
    cart.forEach(function (c) {
      if (cartKey(c) === key) { c.qty = Math.max(1, c.qty + delta); }
    });
    saveCart();
    renderCart();
  }

  function cartTotals() {
    var qty = 0, sub = 0;
    cart.forEach(function (c) { qty += c.qty; sub += c.qty * c.price; });
    return { qty: qty, sub: sub };
  }

  function cartMessage() {
    var lines = cart.map(function (c) {
      return "- " + c.name + (c.variant ? " (" + c.variant + ")" : "") + " x" + c.qty + " - " + money(c.price * c.qty);
    });
    var total = cartTotals();
    return "Hello ApnaAdda, I'd like help placing this order:\n\n" + lines.join("\n") + "\n\nSubtotal: " + money(total.sub);
  }

  function openWhatsApp() {
    if (!cart.length) { showToast("Add an item before opening WhatsApp"); return; }
    var phone = "4532140988";
    window.open("https://wa.me/" + phone + "?text=" + encodeURIComponent(cartMessage()), "_blank", "noopener");
  }

  function initCheckout() {
    var modal = $("#checkoutModal"), close = $("#checkoutClose"), form = $("#checkoutForm");
    var payBtn = $("#cartCheckout"), whatsappBtn = $("#whatsappCheckout");
    if (!modal || !payBtn) return;
    function open() { modal.classList.add("open"); lockScroll(true); if (close) close.focus(); }
    function shut() { modal.classList.remove("open"); lockScroll(false); }
    payBtn.addEventListener("click", open);
    if (close) close.addEventListener("click", shut);
    modal.addEventListener("click", function (e) { if (e.target === modal) shut(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && modal.classList.contains("open")) shut(); });
    if (whatsappBtn) whatsappBtn.addEventListener("click", openWhatsApp);
    if (form) form.addEventListener("submit", async function (e) {
      e.preventDefault();
      if (!cart.length) { showToast("Add an item before checkout"); return; }
      var email = $("#checkoutEmail");
      var submit = form.querySelector('[type="submit"]');
      var orderEndpoint = window.APNAADDA_ORDER_ENDPOINT || apiUrl("/api/create-razorpay-order");
      var total = cartTotals();
      if (submit) { submit.disabled = true; submit.textContent = "Connecting to payment..."; }
      try {
        var response = await fetch(orderEndpoint, {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ currency: CURRENCY, amount: Math.round(total.sub * 100), email: email ? email.value : "", items: cart })
        });
        if (!response.ok) throw new Error("Order endpoint returned " + response.status);
        var order = await response.json();
        if (!window.Razorpay || !order.order_id || !order.key_id) throw new Error("Incomplete Razorpay order response");
        var razorpay = new window.Razorpay({
          key: order.key_id,
          amount: order.amount,
          currency: order.currency || CURRENCY,
          name: "ApnaAdda",
          description: "ApnaAdda clothing order",
          order_id: order.order_id,
          prefill: { email: email ? email.value : "" },
          theme: { color: "#7c2b3b" },
          handler: async function (payment) {
            try {
              var verification = await fetch(window.APNAADDA_VERIFY_ENDPOINT || apiUrl("/api/verify-razorpay-payment"), {
                method: "POST",
                headers: { "Content-Type": "application/json" },
                body: JSON.stringify({ order_id: payment.razorpay_order_id, payment_id: payment.razorpay_payment_id, signature: payment.razorpay_signature })
              });
              var result = await verification.json();
              if (!verification.ok || !result.verified) throw new Error("Payment verification failed");
              showToast("Payment received. Thank you for shopping with ApnaAdda.");
              shut();
            } catch (error) {
              showToast("Payment received but verification is pending. Please contact support.");
            }
          },
          modal: { ondismiss: function () { showToast("Payment cancelled"); } }
        });
        razorpay.open();
      } catch (err) {
        showToast("Payment setup is incomplete. Connect the Razorpay order endpoint.");
      } finally {
        if (submit) { submit.disabled = false; submit.textContent = "Continue to payment"; }
      }
    });
  }

  function renderCart(bump) {
    var wrap = $("#cartItems"), empty = $("#cartEmpty"), foot = $("#cartFoot");
    var countEl = $("#cartCount"), noteEl = $("#cartQtyNote"), subEl = $("#cartSubtotal");
    var freeMsg = $("#cartFreeMsg"), progress = $("#cartProgress");
    if (!wrap) return;
    var t = cartTotals();

    // count pill
    if (countEl) {
      countEl.textContent = t.qty;
      countEl.style.display = t.qty > 0 ? "flex" : "none";
      if (bump) { countEl.classList.remove("pop"); void countEl.offsetWidth; countEl.classList.add("pop"); }
    }
    if (noteEl) noteEl.textContent = t.qty + (t.qty === 1 ? " item" : " items");

    // lines
    $all(".cart-line", wrap).forEach(function (n) { n.remove(); });
    if (cart.length === 0) {
      if (empty) empty.style.display = "";
      if (foot) foot.hidden = true;
    } else {
      if (empty) empty.style.display = "none";
      if (foot) foot.hidden = false;
      cart.forEach(function (c) {
        var key = cartKey(c);
        var line = document.createElement("div");
        line.className = "cart-line";
        line.innerHTML =
          '<img src="' + c.img + '" alt="' + c.name + '" width="74" height="94" loading="lazy">' +
          '<div><div class="cl-name">' + c.name + '</div>' +
          '<div class="cl-meta">' + (c.variant || "") + '</div>' +
          '<div class="cl-price">' + money(c.price) + '</div>' +
          '<button class="cl-remove" type="button" data-key="' + key + '">Remove</button></div>' +
          '<div class="cl-right"><div class="qty-stepper">' +
          '<button type="button" class="q-minus" data-key="' + key + '" aria-label="Decrease quantity"' + (c.qty <= 1 ? " disabled" : "") + '>&minus;</button>' +
          '<span class="q">' + c.qty + '</span>' +
          '<button type="button" class="q-plus" data-key="' + key + '" aria-label="Increase quantity">+</button>' +
          '</div></div>';
        wrap.appendChild(line);
      });
    }

    // subtotal + free-ship progress
    if (subEl) subEl.textContent = money(t.sub);
    var remaining = Math.max(0, FREE_SHIP - t.sub);
    if (freeMsg) {
      freeMsg.innerHTML = remaining > 0
        ? "<strong>" + money(remaining) + "</strong> away from free express shipping"
        : "You've unlocked <strong>free express shipping</strong> 🎉";
    }
    if (progress) progress.style.width = Math.min(100, (t.sub / FREE_SHIP) * 100) + "%";
  }

  function initCart() {
    var drawer = $("#cartDrawer"), scrim = $("#cartScrim");
    var openBtn = $("#cartOpen"), closeBtn = $("#cartClose");
    var contBtn = $("#cartContinue"), emptyShop = $("#cartEmptyShop");
    loadCart();
    if (!drawer) return;

    function open() {
      drawer.classList.add("open");
      if (scrim) scrim.classList.add("open");
      lockScroll(true);
      if (closeBtn) closeBtn.focus();
    }
    function shut() {
      drawer.classList.remove("open");
      if (scrim) scrim.classList.remove("open");
      lockScroll(false);
    }
    if (openBtn) openBtn.addEventListener("click", open);
    if (closeBtn) closeBtn.addEventListener("click", shut);
    if (scrim) scrim.addEventListener("click", shut);
    if (contBtn) contBtn.addEventListener("click", shut);
    if (emptyShop) emptyShop.addEventListener("click", shut);
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && drawer.classList.contains("open")) shut(); });

    // delegate qty/remove inside cart
    drawer.addEventListener("click", function (e) {
      var minus = e.target.closest(".q-minus");
      var plus = e.target.closest(".q-plus");
      var rm = e.target.closest(".cl-remove");
      if (minus) changeQty(minus.getAttribute("data-key"), -1);
      else if (plus) changeQty(plus.getAttribute("data-key"), 1);
      else if (rm) removeFromCart(rm.getAttribute("data-key"));
    });

    // quick-add buttons across the page
    $all(".js-add").forEach(function (btn) {
      btn.addEventListener("click", function (e) {
        e.preventDefault();
        addToCart({
          id: btn.getAttribute("data-id"),
          name: btn.getAttribute("data-name"),
          price: parseFloat(btn.getAttribute("data-price")),
          img: btn.getAttribute("data-img"),
          variant: btn.getAttribute("data-variant") || "",
          qty: 1
        });
        showToast(btn.getAttribute("data-name") + " added to bag");
        open();
      });
    });

    // PDP add-to-bag (reads live colour/size/qty)
    var pdpAdd = $("#pdpAdd");
    if (pdpAdd) {
      pdpAdd.addEventListener("click", function () {
        var colour = ($("#colourVal") || {}).textContent || "";
        var sizeBtn = $(".size-btn.active");
        var size = sizeBtn ? sizeBtn.getAttribute("data-size") : "";
        var qty = parseInt(($("#qtyVal") || {}).textContent, 10) || 1;
        addToCart({
          id: pdpAdd.getAttribute("data-id"),
          name: pdpAdd.getAttribute("data-name"),
          price: parseFloat(pdpAdd.getAttribute("data-price")),
          img: pdpAdd.getAttribute("data-img"),
          variant: [colour, size].filter(Boolean).join(" · "),
          qty: qty
        });
        showToast(pdpAdd.getAttribute("data-name") + " added to bag");
        open();
      });
    }

    renderCart();
  }

  /* ---------- New arrivals scroll-snap nav ---------- */
  function initSnapNav() {
    var row = $("#snapRow"), prev = $("#snapPrev"), next = $("#snapNext");
    if (!row) return;
    function step() {
      var item = row.querySelector(".snap-item");
      return item ? item.getBoundingClientRect().width + 22 : 280;
    }
    if (prev) prev.addEventListener("click", function () { row.scrollBy({ left: -step(), behavior: reduceMotion ? "auto" : "smooth" }); });
    if (next) next.addEventListener("click", function () { row.scrollBy({ left: step(), behavior: reduceMotion ? "auto" : "smooth" }); });
  }

  /* ---------- Countdown ---------- */
  function initCountdown() {
    var box = $("#countdown");
    if (!box) return;
    var units = {
      days: box.querySelector('[data-cd="days"]'),
      hours: box.querySelector('[data-cd="hours"]'),
      mins: box.querySelector('[data-cd="mins"]'),
      secs: box.querySelector('[data-cd="secs"]')
    };
    // Target: 2 days 8 hours from load (front-end demo)
    var target = Date.now() + (2 * 24 * 60 * 60 + 8 * 60 * 60) * 1000;
    function pad(n) { return (n < 10 ? "0" : "") + n; }
    function tick() {
      var diff = Math.max(0, target - Date.now());
      var s = Math.floor(diff / 1000);
      var d = Math.floor(s / 86400); s -= d * 86400;
      var h = Math.floor(s / 3600); s -= h * 3600;
      var m = Math.floor(s / 60); s -= m * 60;
      if (units.days) units.days.textContent = pad(d);
      if (units.hours) units.hours.textContent = pad(h);
      if (units.mins) units.mins.textContent = pad(m);
      if (units.secs) units.secs.textContent = pad(s);
    }
    tick();
    setInterval(tick, 1000);
  }

  /* ---------- Count-up stats ---------- */
  function initCounters() {
    var nums = $all("[data-count]");
    if (!nums.length) return;
    function run(el) {
      var target = parseFloat(el.getAttribute("data-count"));
      var suffix = el.getAttribute("data-suffix") || "";
      if (reduceMotion) { el.textContent = target + suffix; return; }
      var start = null, dur = 1500;
      function frame(ts) {
        if (!start) start = ts;
        var p = Math.min(1, (ts - start) / dur);
        var eased = 1 - Math.pow(1 - p, 3);
        el.textContent = Math.round(target * eased) + suffix;
        if (p < 1) requestAnimationFrame(frame);
      }
      requestAnimationFrame(frame);
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { run(en.target); io.unobserve(en.target); }
      });
    }, { threshold: 0.4 });
    nums.forEach(function (n) { io.observe(n); });
  }

  /* ---------- Reveal on scroll ---------- */
  function initReveal() {
    var els = $all(".reveal");
    if (!els.length) return;
    if (reduceMotion || !("IntersectionObserver" in window)) {
      els.forEach(function (el) { el.classList.add("in"); });
      return;
    }
    var io = new IntersectionObserver(function (entries) {
      entries.forEach(function (en) {
        if (en.isIntersecting) { en.target.classList.add("in"); io.unobserve(en.target); }
      });
    }, { threshold: 0.12, rootMargin: "0px 0px -8% 0px" });
    els.forEach(function (el) { io.observe(el); });
  }

  /* ---------- Testimonial slider ---------- */
  function initTestimonials() {
    var track = $("#testiTrack"), dotsWrap = $("#testiDots");
    if (!track) return;
    var slides = $all(".testi-slide", track);
    var dots = dotsWrap ? $all("button", dotsWrap) : [];
    if (slides.length < 2) return;
    var i = 0, timer;
    function go(n) {
      i = (n + slides.length) % slides.length;
      slides.forEach(function (s, k) { s.classList.toggle("active", k === i); });
      dots.forEach(function (d, k) { d.classList.toggle("active", k === i); });
    }
    function auto() {
      if (reduceMotion) return;
      clearInterval(timer);
      timer = setInterval(function () { go(i + 1); }, 6000);
    }
    dots.forEach(function (d, k) { d.addEventListener("click", function () { go(k); auto(); }); });
    go(0); auto();
  }

  /* ---------- Newsletter ---------- */
  function initNewsletter() {
    var form = $("#nlForm"), ok = $("#nlOk"), input = $("#nlEmail");
    if (!form) return;
    form.addEventListener("submit", function (e) {
      e.preventDefault();
      if (input && !input.checkValidity()) { input.reportValidity(); return; }
      if (ok) ok.classList.add("show");
      form.reset();
      showToast("You're on the list — welcome to ApnaAdda");
    });
  }

  /* ---------- Smooth-scroll anchors (respect reduced motion) ---------- */
  function initSmoothScroll() {
    $all('a[href^="#"]').forEach(function (a) {
      var id = a.getAttribute("href");
      if (id === "#" || id.length < 2) return;
      a.addEventListener("click", function (e) {
        var target = document.querySelector(id);
        if (!target) return;
        e.preventDefault();
        target.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth", block: "start" });
      });
    });
  }

  /* ==========================================================================
     Product detail page
     ========================================================================== */
  function initGallery() {
    var thumbs = $all(".pdp-thumb"), mainImg = $("#pdpMainImg");
    if (!thumbs.length || !mainImg) return;
    thumbs.forEach(function (t) {
      t.addEventListener("click", function () {
        var full = t.getAttribute("data-full");
        if (full) mainImg.src = full;
        thumbs.forEach(function (x) { x.classList.remove("active"); });
        t.classList.add("active");
      });
    });
  }

  function initLightbox() {
    var main = $("#pdpMain"), lb = $("#lightbox"), lbImg = $("#lightboxImg"), close = $("#lightboxClose"), mainImg = $("#pdpMainImg");
    if (!main || !lb) return;
    function open() {
      if (mainImg && lbImg) lbImg.src = mainImg.src;
      lb.classList.add("open");
      lockScroll(true);
      if (close) close.focus();
    }
    function shut() { lb.classList.remove("open"); lockScroll(false); }
    main.addEventListener("click", open);
    main.addEventListener("keydown", function (e) { if (e.key === "Enter" || e.key === " ") { e.preventDefault(); open(); } });
    if (close) close.addEventListener("click", shut);
    lb.addEventListener("click", function (e) { if (e.target === lb) shut(); });
    document.addEventListener("keydown", function (e) { if (e.key === "Escape" && lb.classList.contains("open")) shut(); });
  }

  function initSwatches() {
    var swatches = $all("#swatches .swatch"), val = $("#colourVal");
    if (!swatches.length) return;
    swatches.forEach(function (s) {
      s.addEventListener("click", function () {
        swatches.forEach(function (x) { x.classList.remove("active"); x.setAttribute("aria-checked", "false"); });
        s.classList.add("active");
        s.setAttribute("aria-checked", "true");
        if (val) val.textContent = s.getAttribute("data-colour");
      });
    });
  }

  function initSizePicker() {
    var sizes = $all("#sizes .size-btn");
    if (!sizes.length) return;
    sizes.forEach(function (s) {
      if (s.disabled) return;
      s.addEventListener("click", function () {
        sizes.forEach(function (x) { x.classList.remove("active"); x.setAttribute("aria-checked", "false"); });
        s.classList.add("active");
        s.setAttribute("aria-checked", "true");
      });
    });
  }

  function initQtyStepper() {
    var minus = $("#qtyMinus"), plus = $("#qtyPlus"), val = $("#qtyVal"), add = $("#pdpAdd");
    if (!val) return;
    function get() { return parseInt(val.textContent, 10) || 1; }
    function setPrice() {
      if (!add) return;
      var base = parseFloat(add.getAttribute("data-price"));
      add.textContent = "Add to bag — " + money(base * get());
    }
    function set(n) { val.textContent = Math.max(1, n); if (minus) minus.disabled = get() <= 1; setPrice(); }
    if (minus) minus.addEventListener("click", function () { set(get() - 1); });
    if (plus) plus.addEventListener("click", function () { set(get() + 1); });
    set(1);
  }

  function initTabs() {
    var tabs = $all(".tab-btn"), panels = $all(".tab-panel");
    if (!tabs.length) return;
    function activate(name) {
      tabs.forEach(function (t) {
        var on = t.getAttribute("data-tab") === name;
        t.classList.toggle("active", on);
        t.setAttribute("aria-selected", on ? "true" : "false");
      });
      panels.forEach(function (p) { p.classList.toggle("active", p.getAttribute("data-panel") === name); });
    }
    tabs.forEach(function (t, idx) {
      t.addEventListener("click", function () { activate(t.getAttribute("data-tab")); });
      t.addEventListener("keydown", function (e) {
        var n;
        if (e.key === "ArrowRight") n = (idx + 1) % tabs.length;
        else if (e.key === "ArrowLeft") n = (idx - 1 + tabs.length) % tabs.length;
        else return;
        e.preventDefault();
        tabs[n].focus();
        activate(tabs[n].getAttribute("data-tab"));
      });
    });
    // deep links to reviews / size guide
    var jumpR = $("#jumpReviews"), jumpS = $("#jumpSize");
    if (jumpR) jumpR.addEventListener("click", function () { activate("reviews"); });
    if (jumpS) jumpS.addEventListener("click", function (e) { e.preventDefault(); activate("size"); var el = $("#sizeguide"); if (el) el.scrollIntoView({ behavior: reduceMotion ? "auto" : "smooth" }); });
  }

  /* ---------- Init ---------- */
  document.addEventListener("DOMContentLoaded", function () {
    initCurrency();
    initStickyHeader();
    initMobileNav();
    initSearch();
    initFilter();
    initWishlist();
    initCart();
    initCheckout();
    initSnapNav();
    initCountdown();
    initCounters();
    initTestimonials();
    initNewsletter();
    initSmoothScroll();
    // PDP
    initGallery();
    initLightbox();
    initSwatches();
    initSizePicker();
    initQtyStepper();
    initTabs();
  });

  // Reveal runs immediately so above-the-fold isn't stuck hidden
  initReveal();
})();
