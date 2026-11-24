(() => {
  const GBP = new Intl.NumberFormat("en-GB", { style: "currency", currency: "GBP" });
  const PAGE_SIZE = 24;
  const CART_KEY = "thryxo-cart-v1";

  const state = {
    products: [],
    bundles: [],
    extras: {},
    categories: { platforms: [], gear: [] },
    cart: loadCart(),
    gearLabels: {},
    platformLabels: {},
  };

  const app = document.getElementById("app");

  function loadCart() {
    try {
      return JSON.parse(localStorage.getItem(CART_KEY)) || { lines: [], ship: "ship-standard", wrap: false, pass: null };
    } catch {
      return { lines: [], ship: "ship-standard", wrap: false, pass: null };
    }
  }
  function saveCart() {
    localStorage.setItem(CART_KEY, JSON.stringify(state.cart));
    updateCartBadge();
  }
  function money(n) { return GBP.format(Number(n) || 0); }
  function params() { return new URLSearchParams(location.search); }
  function go(next) {
    const url = typeof next === "string" ? next : `shop.html?${next.toString()}`;
    history.pushState({}, "", url);
    render();
  }

  function labelGear(id) { return state.gearLabels[id] || id; }
  function labelPlat(id) { return state.platformLabels[id] || id; }

  function updateCartBadge() {
    const n = state.cart.lines.reduce((s, l) => s + l.qty, 0);
    const badge = document.getElementById("cartCount");
    badge.hidden = n === 0;
    badge.textContent = String(n);
  }

  function navActive() {
    const p = params();
    const view = p.get("view") || "";
    const cat = p.get("category") || "";
    const plat = p.get("platform") || "";
    document.querySelectorAll("#nav a").forEach((a) => a.classList.remove("is-on"));
    let key = "shop";
    if (view === "platforms") key = "platforms";
    else if (view === "bundles") key = "bundles";
    else if (view === "pass") key = "pass";
    else if (view === "deals") key = "deals";
    else if (plat === "pc" && !cat) key = "pc";
    else if (cat === "headsets") key = "headsets";
    else if (cat === "controllers") key = "controllers";
    document.querySelector(`#nav a[data-nav="${key}"]`)?.classList.add("is-on");
    const q = document.getElementById("q");
    if (document.activeElement !== q) q.value = p.get("q") || "";
  }

  function filtered() {
    const p = params();
    const cat = p.get("category");
    const plat = p.get("platform");
    const q = (p.get("q") || "").trim().toLowerCase();
    const sort = p.get("sort") || "featured";
    let list = state.products.slice();
    if (cat) list = list.filter((x) => x.category === cat);
    if (plat) list = list.filter((x) => (x.platforms || []).includes(plat));
    if (q) {
      list = list.filter((x) =>
        `${x.title} ${x.short_description} ${(x.key_specs || []).join(" ")}`.toLowerCase().includes(q)
      );
    }
    if (p.get("view") === "deals") {
      list = list
        .filter((x) => x.compare_at_price > x.price)
        .sort((a, b) => (b.compare_at_price - b.price) - (a.compare_at_price - a.price));
    } else if (sort === "price-asc") list.sort((a, b) => a.price - b.price);
    else if (sort === "price-desc") list.sort((a, b) => b.price - a.price);
    else if (sort === "name") list.sort((a, b) => a.title.localeCompare(b.title));
    else list.sort((a, b) => (b.rating || 0) - (a.rating || 0) || a.title.localeCompare(b.title));
    return list;
  }

  function imgTag(src, alt) {
    const fallback = `data:image/svg+xml,${encodeURIComponent(
      `<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 400 400"><rect fill="#14131C" width="400" height="400"/><text x="200" y="210" text-anchor="middle" fill="#8B7CFF" font-family="sans-serif" font-size="28">THRYXO</text></svg>`
    )}`;
    return `<img src="${esc(src || fallback)}" alt="${esc(alt || "")}" loading="lazy" referrerpolicy="no-referrer" onerror="this.onerror=null;this.src='${fallback}'">`;
  }

  function esc(s) {
    return String(s ?? "")
      .replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;")
      .replace(/"/g, "&quot;");
  }

  function productCard(p) {
    return `<article class="card">
      <a class="pic" href="shop.html?product=${encodeURIComponent(p.id)}">${imgTag(p.image_url, p.title)}</a>
      <div class="body">
        <div class="meta">${esc(labelGear(p.category))}</div>
        <h2><a href="shop.html?product=${encodeURIComponent(p.id)}">${esc(p.title)}</a></h2>
        <div class="price"><span class="now">${money(p.price)}</span>${p.compare_at_price > p.price ? `<span class="was">${money(p.compare_at_price)}</span>` : ""}</div>
        <button class="btn primary" type="button" data-add="${esc(p.id)}">Add to cart</button>
      </div>
    </article>`;
  }

  function crumbs(parts) {
    return `<div class="crumbs"><a href="index.html">Home</a>${parts.map((c) => c.href ? `<span>/</span><a href="${c.href}">${esc(c.label)}</a>` : `<span>/</span><span>${esc(c.label)}</span>`).join("")}</div>`;
  }

  function filterPanel(currentCat, currentPlat) {
    const plats = state.categories.platforms || [];
    const gear = state.categories.gear || [];
    return `<aside class="filters" aria-label="Filters">
      <h3>Platform</h3>
      ${plats.map((p) => `<label><input type="radio" name="platform" value="${esc(p.id)}" ${currentPlat === p.id ? "checked" : ""}> ${esc(p.name)}</label>`).join("")}
      <label><input type="radio" name="platform" value="" ${!currentPlat ? "checked" : ""}> All platforms</label>
      <h3>Gear type</h3>
      ${gear.map((g) => `<label><input type="radio" name="category" value="${esc(g.id)}" ${currentCat === g.id ? "checked" : ""}> ${esc(g.name)}</label>`).join("")}
      <label><input type="radio" name="category" value="" ${!currentCat ? "checked" : ""}> All gear</label>
    </aside>`;
  }

  function renderCatalog() {
    const p = params();
    const cat = p.get("category") || "";
    const plat = p.get("platform") || "";
    const view = p.get("view") || "";
    const sort = p.get("sort") || "featured";
    const page = Math.max(1, parseInt(p.get("page") || "1", 10) || 1);
    const list = filtered();
    const pages = Math.max(1, Math.ceil(list.length / PAGE_SIZE));
    const pg = Math.min(page, pages);
    const slice = list.slice((pg - 1) * PAGE_SIZE, pg * PAGE_SIZE);
    const heading = view === "deals"
      ? "Deals"
      : cat && plat
        ? `${labelGear(cat)} for ${labelPlat(plat)}`
        : cat
          ? labelGear(cat)
          : plat
            ? `Gear for ${labelPlat(plat)}`
            : (p.get("q") ? `Results for “${p.get("q")}”` : "All gear");

    const pager = pages > 1 ? `<div class="pager">${Array.from({ length: pages }, (_, i) => {
      const n = i + 1;
      const sp = new URLSearchParams(p);
      sp.set("page", String(n));
      return `<button type="button" class="${n === pg ? "is-on" : ""}" data-go="shop.html?${sp}">${n}</button>`;
    }).join("")}</div>` : "";

    app.innerHTML = `
      ${crumbs([
        { href: "shop.html", label: "Shop" },
        { label: heading },
      ])}
      <div class="hero-mini">
        <h1>${esc(heading)}</h1>
        <p class="count">${list.length} product${list.length === 1 ? "" : "s"}</p>
      </div>
      <div class="layout">
        ${filterPanel(cat, plat)}
        <div>
          <div class="toolbar">
            <span class="muted">Showing ${(pg - 1) * PAGE_SIZE + (slice.length ? 1 : 0)}–${(pg - 1) * PAGE_SIZE + slice.length} of ${list.length}</span>
            <select class="sort" id="sort">
              <option value="featured" ${sort === "featured" ? "selected" : ""}>Featured</option>
              <option value="price-asc" ${sort === "price-asc" ? "selected" : ""}>Price: low to high</option>
              <option value="price-desc" ${sort === "price-desc" ? "selected" : ""}>Price: high to low</option>
              <option value="name" ${sort === "name" ? "selected" : ""}>Name</option>
            </select>
          </div>
          <div class="grid">${slice.length ? slice.map(productCard).join("") : `<p class="empty">No products match these filters.</p>`}</div>
          ${pager}
        </div>
      </div>`;
  }

  function renderPlatforms() {
    const plats = state.categories.platforms || [];
    const gear = state.categories.gear || [];
    app.innerHTML = `
      ${crumbs([{ href: "shop.html", label: "Shop" }, { label: "Platforms" }])}
      <div class="hero-mini"><h1>Shop by console and platform</h1></div>
      <div class="platform-grid">
        ${plats.map((p) => `<a href="shop.html?platform=${encodeURIComponent(p.id)}">${esc(p.name)}</a>`).join("")}
      </div>
      <h2 class="block-title" style="margin:10px 0 14px;font-size:22px">Gear type</h2>
      <div class="platform-grid">
        ${gear.map((g) => `<a href="shop.html?category=${encodeURIComponent(g.id)}">${esc(g.name)}</a>`).join("")}
      </div>`;
  }

  function protectionPrice(product, plan) {
    const raw = Math.max(product.price * plan.rate, plan.min_price);
    return Math.ceil(raw) - 0.01;
  }

  function renderProduct() {
    const id = params().get("product");
    const p = state.products.find((x) => x.id === id);
    if (!p) {
      app.innerHTML = `${crumbs([{ href: "shop.html", label: "Shop" }])}<h1>Product not found</h1>`;
      return;
    }
    const plans = state.extras.protection_plans || [];
    const wrap = state.extras.gift_wrap;
    app.innerHTML = `
      ${crumbs([
        { href: "shop.html", label: "Shop" },
        { href: `shop.html?category=${encodeURIComponent(p.category)}`, label: labelGear(p.category) },
        { label: p.title },
      ])}
      <article class="product">
        <div class="pic">${imgTag(p.image_url, p.title)}</div>
        <div>
          <div class="meta">${esc(labelGear(p.category))}</div>
          <h1>${esc(p.title)}</h1>
          <div class="price"><span class="now">${money(p.price)}</span>${p.compare_at_price > p.price ? `<span class="was">${money(p.compare_at_price)}</span>` : ""}</div>
          <p class="copy" style="margin-top:16px">${esc(p.short_description)}</p>
          <div class="specs">${(p.platforms || []).map((x) => `<span>${esc(labelPlat(x))}</span>`).join("")}${(p.key_specs || []).map((s) => `<span>${esc(s)}</span>`).join("")}</div>
          <div class="addons" id="addons">
            ${plans.map((plan) => `<label><input type="checkbox" name="protect" value="${esc(plan.id)}"> <span><strong>${esc(plan.name)}</strong> — ${money(protectionPrice(p, plan))}<br><span class="muted">${esc(plan.description)}</span></span></label>`).join("")}
            ${wrap ? `<label><input type="checkbox" name="wrap" value="${esc(wrap.id)}"> <span><strong>${esc(wrap.name)}</strong> — ${money(wrap.price)}<br><span class="muted">${esc(wrap.description)}</span></span></label>` : ""}
          </div>
          <div class="buy-row">
            <button class="btn primary" type="button" data-add="${esc(p.id)}" data-from-detail="1">Add to cart</button>
            <button class="btn" type="button" data-payment-link="${esc(p.payment_link || "")}" data-product-id="${esc(p.id)}" ${p.payment_link ? "" : "aria-disabled='true' disabled"}>Buy now</button>
          </div>
          <p class="notice">Checkout is ready for a Stripe Payment Link. The hook is on this button as <code>data-payment-link</code> — it is empty until a Thryxo Payment Link is added. No charge is taken from this page yet.</p>
          <div class="pay-methods" aria-label="Planned payment methods">${(state.extras.payment_methods_planned || []).map((m) => `<span>${esc(m)}</span>`).join("")}</div>
        </div>
      </article>`;
  }

  function renderBundles() {
    const id = params().get("bundle");
    if (id) return renderBundle(id);
    app.innerHTML = `
      ${crumbs([{ href: "shop.html", label: "Shop" }, { label: "Bundles" }])}
      <div class="hero-mini"><h1>Bundles</h1><p class="count">Save against buying the pieces solo.</p></div>
      <div class="bundle-grid">
        ${state.bundles.map((b) => `<article class="tile">
          <div class="pic" style="border-radius:12px;overflow:hidden;aspect-ratio:16/10">${imgTag(b.image_url, b.name)}</div>
          <h2><a href="shop.html?view=bundles&bundle=${encodeURIComponent(b.id)}">${esc(b.name)}</a></h2>
          <p class="copy">${esc(b.description)}</p>
          <div class="price"><span class="now">${money(b.price)}</span><span class="was">${money(b.compare_at_price)}</span></div>
          <p class="save">Save ${money(b.saving)}</p>
          <button class="btn primary" type="button" data-add-bundle="${esc(b.id)}">Add bundle</button>
        </article>`).join("")}
      </div>`;
  }

  function renderBundle(id) {
    const b = state.bundles.find((x) => x.id === id);
    if (!b) {
      app.innerHTML = `<h1>Bundle not found</h1>`;
      return;
    }
    const items = (b.product_ids || []).map((pid) => state.products.find((p) => p.id === pid)).filter(Boolean);
    app.innerHTML = `
      ${crumbs([{ href: "shop.html", label: "Shop" }, { href: "shop.html?view=bundles", label: "Bundles" }, { label: b.name }])}
      <article class="product">
        <div class="pic">${imgTag(b.image_url, b.name)}</div>
        <div>
          <h1>${esc(b.name)}</h1>
          <div class="price"><span class="now">${money(b.price)}</span><span class="was">${money(b.compare_at_price)}</span></div>
          <p class="save">Save ${money(b.saving)} versus the solo prices</p>
          <p class="copy" style="margin-top:16px">${esc(b.description)}</p>
          <h2 class="block-title" style="margin:22px 0 10px;font-size:16px">In this bundle</h2>
          <div class="grid">${items.map(productCard).join("")}</div>
          <div class="buy-row">
            <button class="btn primary" type="button" data-add-bundle="${esc(b.id)}">Add bundle to cart</button>
            <button class="btn" type="button" data-payment-link="" data-bundle-id="${esc(b.id)}" disabled aria-disabled="true">Buy now</button>
          </div>
          <p class="notice">Stripe Payment Link hook is reserved on the Buy now button as <code>data-payment-link</code>.</p>
        </div>
      </article>`;
  }

  function renderPass() {
    const pass = state.extras.membership || {};
    const gifts = state.extras.gift_cards || [];
    const boxes = state.extras.mystery_boxes || [];
    app.innerHTML = `
      ${crumbs([{ href: "shop.html", label: "Shop" }, { label: "Thryxo Pass" }])}
      <div class="hero-mini"><h1>${esc(pass.name || "Thryxo Pass")}</h1></div>
      <p class="copy">${esc(pass.description || "")}</p>
      <div class="tier-grid" style="margin-top:22px">
        ${(pass.tiers || []).map((t) => `<article class="tile">
          <h2>${esc(t.name)}</h2>
          <div class="price"><span class="now">${t.price_monthly ? `${money(t.price_monthly)} / mo` : "Free"}</span></div>
          <ul>${(t.perks || []).map((x) => `<li>${esc(x)}</li>`).join("")}</ul>
          ${t.price_monthly ? `<button class="btn primary" type="button" data-add-pass="${esc(t.id)}">Add membership</button>
            <button class="btn" type="button" data-payment-link="" data-pass-id="${esc(t.id)}" disabled aria-disabled="true">Subscribe</button>` : `<p class="muted">Default for every shopper.</p>`}
        </article>`).join("")}
      </div>
      <h2 class="block-title" style="margin:36px 0 14px;font-size:28px">Gift cards</h2>
      <div class="extra-grid">
        ${gifts.map((g) => `<article class="tile"><h2>${esc(g.name)}</h2><div class="price"><span class="now">${money(g.price)}</span></div>
          <button class="btn primary" type="button" data-add-extra="${esc(g.id)}" data-kind="gift">Add to cart</button>
          <button class="btn" type="button" data-payment-link="" data-extra-id="${esc(g.id)}" disabled aria-disabled="true">Buy now</button>
        </article>`).join("")}
      </div>
      <h2 class="block-title" style="margin:36px 0 14px;font-size:28px">Mystery boxes</h2>
      <div class="extra-grid">
        ${boxes.map((g) => `<article class="tile"><h2>${esc(g.name)}</h2><p class="copy">${esc(g.description)}</p>
          <div class="price"><span class="now">${money(g.price)}</span>${g.compare_at_price ? `<span class="was">${money(g.compare_at_price)}</span>` : ""}</div>
          <button class="btn primary" type="button" data-add-extra="${esc(g.id)}" data-kind="mystery">Add to cart</button>
          <button class="btn" type="button" data-payment-link="" data-extra-id="${esc(g.id)}" disabled aria-disabled="true">Buy now</button>
        </article>`).join("")}
      </div>`;
  }

  function renderDeals() {
    renderCatalog();
    const bundleBlock = state.bundles.length ? `
      <h2 class="block-title" style="margin:40px 0 14px;font-size:28px">Bundle deals</h2>
      <div class="bundle-grid">${state.bundles.map((b) => `<article class="tile">
        <h2><a href="shop.html?view=bundles&bundle=${encodeURIComponent(b.id)}">${esc(b.name)}</a></h2>
        <div class="price"><span class="now">${money(b.price)}</span><span class="was">${money(b.compare_at_price)}</span></div>
        <p class="save">Save ${money(b.saving)}</p>
        <button class="btn primary" type="button" data-add-bundle="${esc(b.id)}">Add bundle</button>
      </article>`).join("")}</div>` : "";
    app.insertAdjacentHTML("beforeend", bundleBlock);
  }

  function cartItemsHydrated() {
    return state.cart.lines.map((line) => {
      if (line.kind === "product") {
        const p = state.products.find((x) => x.id === line.id);
        return p ? { ...line, title: p.title, price: line.unit_price, image: p.image_url } : line;
      }
      if (line.kind === "bundle") {
        const b = state.bundles.find((x) => x.id === line.id);
        return b ? { ...line, title: b.name, price: line.unit_price, image: b.image_url } : line;
      }
      return { ...line, price: line.unit_price, image: "" };
    });
  }

  function totals() {
    const lines = cartItemsHydrated();
    const sub = lines.reduce((s, l) => s + (l.price || 0) * l.qty, 0);
    const ships = state.extras.shipping_upgrades || [];
    const ship = ships.find((s) => s.id === state.cart.ship) || ships[0];
    const shipPrice = ship ? ship.price : 0;
    const wrapPrice = state.cart.wrap && state.extras.gift_wrap ? state.extras.gift_wrap.price : 0;
    const pass = (state.extras.membership?.tiers || []).find((t) => t.id === state.cart.pass && t.price_monthly);
    const passPrice = pass ? pass.price_monthly : 0;
    const grand = sub + shipPrice + wrapPrice + passPrice;
    return { sub, ship, shipPrice, wrapPrice, pass, passPrice, grand, lines };
  }

  function renderCartDrawer() {
    const { sub, ship, shipPrice, wrapPrice, pass, passPrice, grand, lines } = totals();
    const box = document.getElementById("cartLines");
    if (!lines.length) {
      box.innerHTML = `<p class="empty">Your cart is empty.</p>`;
    } else {
      box.innerHTML = lines.map((l, i) => `<div class="line">
        ${imgTag(l.image, l.title || "")}
        <div>
          <h3>${esc(l.title || l.id)}</h3>
          <div class="muted">${money(l.price)} each</div>
          <div class="qty">
            <button type="button" data-qty="${i}" data-d="-1" aria-label="Decrease">−</button>
            <span>${l.qty}</span>
            <button type="button" data-qty="${i}" data-d="1" aria-label="Increase">+</button>
            <button type="button" data-remove="${i}">Remove</button>
          </div>
        </div>
        <strong>${money((l.price || 0) * l.qty)}</strong>
      </div>`).join("");
    }
    const ships = state.extras.shipping_upgrades || [];
    const wrap = state.extras.gift_wrap;
    document.getElementById("cartTotals").innerHTML = `
      <label class="muted">Shipping</label>
      ${ships.map((s) => `<label><input type="radio" name="ship" value="${esc(s.id)}" ${state.cart.ship === s.id ? "checked" : ""}> ${esc(s.name)} — ${money(s.price)}</label>`).join("")}
      ${wrap ? `<label><input type="checkbox" id="cartWrap" ${state.cart.wrap ? "checked" : ""}> ${esc(wrap.name)} — ${money(wrap.price)}</label>` : ""}
      <div style="display:flex;justify-content:space-between"><span>Subtotal</span><span>${money(sub)}</span></div>
      <div style="display:flex;justify-content:space-between"><span>Shipping</span><span>${money(shipPrice)}</span></div>
      ${wrapPrice ? `<div style="display:flex;justify-content:space-between"><span>Gift wrap</span><span>${money(wrapPrice)}</span></div>` : ""}
      ${passPrice ? `<div style="display:flex;justify-content:space-between"><span>${esc(pass.name)} Pass</span><span>${money(passPrice)}</span></div>` : ""}
      <div class="grand"><span>Total</span><span>${money(grand)}</span></div>
      <button class="btn primary" type="button" id="checkoutBtn" data-payment-link="" ${lines.length ? "" : "disabled"} style="width:100%;margin-top:10px">Checkout</button>
      <p class="notice">Pay with Stripe, Apple Pay, Google Pay, Klarna, Clearpay, PayPal, Shop Pay or a card once Payment Links are attached. Nothing is charged from this preview.</p>
      <div class="pay-methods">${(state.extras.payment_methods_planned || []).map((m) => `<span>${esc(m)}</span>`).join("")}</div>
    `;
  }

  function openCart() {
    const d = document.getElementById("drawer");
    const o = document.getElementById("overlay");
    d.hidden = false; o.hidden = false;
    requestAnimationFrame(() => { d.classList.add("is-on"); o.classList.add("is-on"); });
    renderCartDrawer();
  }
  function closeCart() {
    const d = document.getElementById("drawer");
    const o = document.getElementById("overlay");
    d.classList.remove("is-on"); o.classList.remove("is-on");
    setTimeout(() => { d.hidden = true; o.hidden = true; }, 250);
  }

  function addProduct(id, extras = []) {
    const p = state.products.find((x) => x.id === id);
    if (!p) return;
    const existing = state.cart.lines.find((l) => l.kind === "product" && l.id === id && JSON.stringify(l.extras || []) === JSON.stringify(extras));
    if (existing) existing.qty += 1;
    else state.cart.lines.push({ kind: "product", id, qty: 1, unit_price: p.price, extras });
    // priced add-ons as separate lines
    for (const ex of extras) {
      state.cart.lines.push({ kind: "addon", id: ex.id, title: ex.title, qty: 1, unit_price: ex.price });
    }
    saveCart();
    openCart();
  }

  function addBundle(id) {
    const b = state.bundles.find((x) => x.id === id);
    if (!b) return;
    const existing = state.cart.lines.find((l) => l.kind === "bundle" && l.id === id);
    if (existing) existing.qty += 1;
    else state.cart.lines.push({ kind: "bundle", id, qty: 1, unit_price: b.price, title: b.name });
    saveCart();
    openCart();
  }

  function addPass(id) {
    const t = (state.extras.membership?.tiers || []).find((x) => x.id === id);
    if (!t || !t.price_monthly) return;
    state.cart.pass = id;
    // represent as a line too
    state.cart.lines = state.cart.lines.filter((l) => l.kind !== "pass");
    state.cart.lines.push({ kind: "pass", id, qty: 1, unit_price: t.price_monthly, title: `Thryxo Pass — ${t.name} (monthly)` });
    saveCart();
    openCart();
  }

  function addExtra(id, kind) {
    const pool = kind === "gift" ? state.extras.gift_cards : state.extras.mystery_boxes;
    const item = (pool || []).find((x) => x.id === id);
    if (!item) return;
    const existing = state.cart.lines.find((l) => l.id === id);
    if (existing) existing.qty += 1;
    else state.cart.lines.push({ kind: kind === "gift" ? "gift-card" : "mystery-box", id, qty: 1, unit_price: item.price, title: item.name });
    saveCart();
    openCart();
  }

  function collectDetailAddons(product) {
    const extras = [];
    document.querySelectorAll("#addons input:checked").forEach((el) => {
      if (el.name === "protect") {
        const plan = (state.extras.protection_plans || []).find((p) => p.id === el.value);
        if (plan) extras.push({ id: `${plan.id}:${product.id}`, title: `${plan.name} for ${product.title}`, price: protectionPrice(product, plan) });
      }
      if (el.name === "wrap") {
        const wrap = state.extras.gift_wrap;
        if (wrap) extras.push({ id: `${wrap.id}:${product.id}`, title: wrap.name, price: wrap.price });
      }
    });
    return extras;
  }

  function render() {
    navActive();
    const p = params();
    if (p.get("product")) renderProduct();
    else if (p.get("view") === "platforms") renderPlatforms();
    else if (p.get("view") === "bundles") renderBundles();
    else if (p.get("view") === "pass") renderPass();
    else if (p.get("view") === "deals") renderDeals();
    else renderCatalog();
    updateCartBadge();
  }

  document.getElementById("searchForm").addEventListener("submit", (e) => {
    e.preventDefault();
    const sp = params();
    const q = document.getElementById("q").value.trim();
    if (q) sp.set("q", q); else sp.delete("q");
    sp.delete("product");
    sp.delete("page");
    go(sp);
  });
  document.getElementById("cartBtn").addEventListener("click", openCart);
  document.getElementById("closeCart").addEventListener("click", closeCart);
  document.getElementById("overlay").addEventListener("click", closeCart);

  document.body.addEventListener("click", (e) => {
    const goBtn = e.target.closest("[data-go]");
    if (goBtn) { e.preventDefault(); go(goBtn.getAttribute("data-go")); return; }
    const add = e.target.closest("[data-add]");
    if (add) {
      const id = add.getAttribute("data-add");
      const p = state.products.find((x) => x.id === id);
      const extras = add.getAttribute("data-from-detail") && p ? collectDetailAddons(p) : [];
      addProduct(id, extras);
      return;
    }
    const bun = e.target.closest("[data-add-bundle]");
    if (bun) { addBundle(bun.getAttribute("data-add-bundle")); return; }
    const pass = e.target.closest("[data-add-pass]");
    if (pass) { addPass(pass.getAttribute("data-add-pass")); return; }
    const ex = e.target.closest("[data-add-extra]");
    if (ex) { addExtra(ex.getAttribute("data-add-extra"), ex.getAttribute("data-kind")); return; }
    const pay = e.target.closest("[data-payment-link]");
    if (pay && !pay.disabled) {
      const href = pay.getAttribute("data-payment-link");
      if (href) window.location.href = href;
    }
  });

  document.body.addEventListener("change", (e) => {
    if (e.target.closest(".filters")) {
      const sp = params();
      const plat = document.querySelector('.filters input[name="platform"]:checked');
      const cat = document.querySelector('.filters input[name="category"]:checked');
      if (plat && plat.value) sp.set("platform", plat.value); else sp.delete("platform");
      if (cat && cat.value) sp.set("category", cat.value); else sp.delete("category");
      sp.delete("page");
      go(sp);
    }
    if (e.target.id === "sort") {
      const sp = params();
      sp.set("sort", e.target.value);
      sp.delete("page");
      go(sp);
    }
    if (e.target.name === "ship") {
      state.cart.ship = e.target.value;
      saveCart();
      renderCartDrawer();
    }
    if (e.target.id === "cartWrap") {
      state.cart.wrap = e.target.checked;
      saveCart();
      renderCartDrawer();
    }
  });

  document.getElementById("cartLines").addEventListener("click", (e) => {
    const q = e.target.closest("[data-qty]");
    if (q) {
      const i = Number(q.getAttribute("data-qty"));
      const d = Number(q.getAttribute("data-d"));
      const line = state.cart.lines[i];
      if (!line) return;
      line.qty += d;
      if (line.qty <= 0) state.cart.lines.splice(i, 1);
      saveCart();
      renderCartDrawer();
    }
    const r = e.target.closest("[data-remove]");
    if (r) {
      state.cart.lines.splice(Number(r.getAttribute("data-remove")), 1);
      saveCart();
      renderCartDrawer();
    }
  });

  window.addEventListener("popstate", render);

  async function boot() {
    try {
      const [products, bundles, extras, categories] = await Promise.all([
        fetch("data/products.json").then((r) => r.json()),
        fetch("data/bundles.json").then((r) => r.json()),
        fetch("data/extras.json").then((r) => r.json()),
        fetch("data/categories.json").then((r) => r.json()),
      ]);
      state.products = products.products || products;
      state.bundles = bundles.bundles || bundles;
      state.extras = extras;
      state.categories = categories;
      (categories.gear || []).forEach((g) => { state.gearLabels[g.id] = g.name; });
      (categories.platforms || []).forEach((g) => { state.platformLabels[g.id] = g.name; });
      render();
    } catch (err) {
      app.innerHTML = `<h1>Could not load the shop</h1><p class="copy">${esc(err.message)}</p>`;
      console.error(err);
    }
  }
  boot();
})();
