(function () {
  "use strict";

  var icons = {
    search: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="11" cy="11" r="7"/><path d="m20 20-3.5-3.5"/></svg>',
    account: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><circle cx="12" cy="8" r="4"/><path d="M4 21c0-4 4-6 8-6s8 2 8 6"/></svg>',
    bag: '<svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M6 8h12l-1 12H7L6 8Z"/><path d="M9 8V6a3 3 0 0 1 6 0v2"/></svg>'
  };

  function footerMarkup() {
    return '<div class="container-x"><div class="footer-top"><div><span class="brand">ApnaAdda<span class="dot">.</span></span><p class="footer-about">Considered, small-batch clothing in natural materials, designed to be worn for years, not seasons.</p><div class="footer-social"><a href="https://instagram.com" aria-label="ApnaAdda on Instagram">' + icons.account + '</a><a href="https://pinterest.com" aria-label="ApnaAdda on Pinterest">' + icons.search + '</a><a href="https://tiktok.com" aria-label="ApnaAdda on TikTok">' + icons.bag + '</a></div></div><div class="footer-col"><h4>Shop</h4><ul><li><a href="new.html">New Arrivals</a></li><li><a href="women.html">Women</a></li><li><a href="men.html">Men</a></li><li><a href="sale.html">Sale</a></li></ul></div><div class="footer-col"><h4>Help</h4><ul><li><a href="shop.html#shipping">Shipping &amp; Delivery</a></li><li><a href="shop.html#returns">Returns &amp; Exchanges</a></li><li><a href="product.html#sizeguide">Size Guide</a></li><li><a href="shop.html#order">Track Your Order</a></li><li><a href="mailto:hello@apnaadda.com">Contact Us</a></li></ul></div><div class="footer-col"><h4>Contact</h4><ul class="footer-contact"><li>hello@apnaadda.com</li><li>+45 32 14 09 88</li><li>Studio 4, Vesterbro, Copenhagen</li></ul></div></div><div class="footer-bottom"><p>&copy; 2026 ApnaAdda. All rights reserved.</p><div class="footer-pay"><span>Visa</span><span>Mastercard</span><span>Amex</span><span>PayPal</span><span>Klarna</span></div></div></div>';
  }

  function normalize() {
    var header = document.querySelector(".site-header");
    var footer = document.querySelector(".site-footer");
    if (header) {
      var actions = header.querySelector(".nav-actions");
      if (actions && !document.getElementById("cartOpen")) actions.innerHTML = '<a class="icon-btn" href="shop.html" aria-label="Search products">' + icons.search + '</a><a href="account.html" class="icon-btn" aria-label="Account">' + icons.account + '</a><a class="icon-btn cart-pill" href="shop.html" aria-label="Open shop">' + icons.bag + '</a><button class="icon-btn nav-toggle" id="navToggle" aria-label="Open menu" aria-expanded="false"><svg viewBox="0 0 24 24" fill="none" stroke="currentColor" stroke-width="1.7" aria-hidden="true"><path d="M4 7h16M4 12h16M4 17h16"/></svg></button>';
    }
    if (footer) footer.innerHTML = footerMarkup();
  }

  document.addEventListener("DOMContentLoaded", normalize);
})();
