const els = {
  searchInput: document.getElementById("searchInput"),
  brandSelect: document.getElementById("brandSelect"),
  gstSelect: document.getElementById("gstSelect"),
  clearBtn: document.getElementById("clearBtn"),
  grid: document.getElementById("catalogGrid"),
  resultsMeta: document.getElementById("resultsMeta"),
  emptyState: document.getElementById("emptyState"),
};

/** @typedef {{id?: string, brand: string, name: string, packSize: string, price: number, gst: number|null, image?: string}} Product */

/** @type {Product[]} */
let allProducts = [];

function formatInr(n) {
  const value = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

function normalizeStr(s) {
  return String(s ?? "").trim().toLowerCase();
}

function gstLabel(gst) {
  if (gst === null || gst === 0) return "Nil";
  return `${gst}%`;
}

function gstBadgeClass(gst) {
  if (gst === null || gst === 0) return "gst-nil";
  if (gst === 18) return "gst-18";
  return "";
}

function uniqSorted(list) {
  return Array.from(new Set(list)).sort((a, b) => a.localeCompare(b));
}

function uniqSortedNumbers(list) {
  return Array.from(new Set(list)).sort((a, b) => a - b);
}

function option(label, value) {
  const o = document.createElement("option");
  o.value = value;
  o.textContent = label;
  return o;
}

function setSelectOptions(selectEl, items, format = (x) => x) {
  const keepFirst = selectEl.querySelector("option");
  selectEl.innerHTML = "";
  if (keepFirst) selectEl.appendChild(keepFirst);
  for (const it of items) selectEl.appendChild(option(format(it), String(it)));
}

function getState() {
  return {
    q: normalizeStr(els.searchInput.value),
    brand: els.brandSelect.value,
    gst: els.gstSelect.value,
  };
}

function applyFilters(products, state) {
  const q = state.q;
  const brand = state.brand;
  const gstRaw = state.gst;
  const gst = gstRaw === "" ? "" : Number(gstRaw);

  return products.filter((p) => {
    const matchesQ =
      q === "" ||
      normalizeStr(p.name).includes(q) ||
      normalizeStr(p.brand).includes(q) ||
      normalizeStr(p.packSize).includes(q);

    const matchesBrand = brand === "" || p.brand === brand;

    const pgst = p.gst === null ? 0 : p.gst;
    const matchesGst = gst === "" || pgst === gst;

    return matchesQ && matchesBrand && matchesGst;
  });
}

function render(products) {
  els.grid.innerHTML = "";

  if (!products.length) {
    els.emptyState.hidden = false;
    return;
  }
  els.emptyState.hidden = true;

  const frag = document.createDocumentFragment();

  for (const p of products) {
    const card = document.createElement("article");
    card.className = "card";
    if (p.id) card.dataset.productId = p.id;

    card.appendChild(createMedia(p));

    const top = document.createElement("div");
    top.className = "card-top";

    const left = document.createElement("div");
    const title = document.createElement("h3");
    title.textContent = p.name;

    const sub = document.createElement("div");
    sub.className = "card-sub";
    sub.textContent = p.brand;

    left.appendChild(title);
    left.appendChild(sub);

    const badge = document.createElement("div");
    badge.className = `badge ${gstBadgeClass(p.gst)}`.trim();
    badge.textContent = `GST: ${gstLabel(p.gst)}`;

    top.appendChild(left);
    top.appendChild(badge);

    const kv = document.createElement("div");
    kv.className = "kv";

    const kvPack = kvItem("Pack size", p.packSize || "-");
    const kvPrice = kvItem("Base price", `₹ ${formatInr(p.price)}`, "price");
    const kvGst = kvItem("GST", gstLabel(p.gst));

    kv.appendChild(kvPack);
    kv.appendChild(kvPrice);
    kv.appendChild(kvGst);

    card.appendChild(top);
    card.appendChild(kv);

    frag.appendChild(card);
  }

  els.grid.appendChild(frag);
}

function createMedia(product) {
  const media = document.createElement("div");
  media.className = "card-media";

  const imgSrc = String(product.image ?? "").trim();
  if (!imgSrc) {
    media.appendChild(createPlaceholder(product.name));
    return media;
  }

  const img = document.createElement("img");
  img.loading = "lazy";
  img.alt = `${product.name} (${product.brand})`;
  img.src = imgSrc;
  img.addEventListener("error", () => {
    media.replaceChildren(createPlaceholder(product.name));
  });
  media.appendChild(img);
  return media;
}

function createPlaceholder(name) {
  const wrap = document.createElement("div");
  wrap.className = "card-placeholder";

  const badge = document.createElement("div");
  badge.className = "card-placeholder-badge";
  badge.textContent = initials(name);

  const label = document.createElement("div");
  label.className = "card-placeholder-label";
  label.textContent = "Image coming soon";

  wrap.appendChild(badge);
  wrap.appendChild(label);
  return wrap;
}

function initials(name) {
  return String(name ?? "")
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0].toUpperCase())
    .join("") || "PR";
}

function kvItem(k, v, extraClass = "") {
  const wrap = document.createElement("div");
  wrap.className = "kv-item";

  const kk = document.createElement("div");
  kk.className = "kv-k";
  kk.textContent = k;

  const vv = document.createElement("div");
  vv.className = `kv-v ${extraClass}`.trim();
  vv.textContent = v;

  wrap.appendChild(kk);
  wrap.appendChild(vv);
  return wrap;
}

function update() {
  const state = getState();
  const filtered = applyFilters(allProducts, state);

  els.resultsMeta.textContent = `${filtered.length} item${filtered.length === 1 ? "" : "s"} shown`;
  render(filtered);
}

function clearControls() {
  els.searchInput.value = "";
  els.brandSelect.value = "";
  els.gstSelect.value = "";
  update();
}

async function loadProducts() {
  let data;

  try {
    const res = await fetch("data/products.json", { cache: "no-store" });
    if (!res.ok) throw new Error(`Failed to load products.json (${res.status})`);
    data = await res.json();
  } catch (fetchError) {
    if (Array.isArray(window.PRODUCTS)) {
      data = window.PRODUCTS;
    } else {
      throw fetchError;
    }
  }

  if (!Array.isArray(data)) throw new Error("products.json must be an array");

  allProducts = data
    .map((p) => ({
      id: p.id,
      brand: String(p.brand ?? "").trim(),
      name: String(p.name ?? "").trim(),
      packSize: String(p.packSize ?? "").trim(),
      price: Number(p.price ?? 0),
      gst:
        p.gst === null || p.gst === "Nil"
          ? null
          : Number(p.gst),
      image: String(p.image ?? "").trim(),
    }))
    .filter((p) => p.brand && p.name);

  const brands = uniqSorted(allProducts.map((p) => p.brand));
  const gstVals = uniqSortedNumbers(
    allProducts.map((p) => (p.gst === null ? 0 : p.gst)).filter((n) => Number.isFinite(n))
  );

  setSelectOptions(els.brandSelect, brands);
  setSelectOptions(els.gstSelect, gstVals, (n) => (n === 0 ? "Nil" : `${n}%`));

  update();
}

function wireEvents() {
  const onChange = () => update();
  els.searchInput.addEventListener("input", onChange);
  els.brandSelect.addEventListener("change", onChange);
  els.gstSelect.addEventListener("change", onChange);
  els.clearBtn.addEventListener("click", clearControls);
}

(async function init() {
  wireEvents();
  try {
    await loadProducts();
  } catch (err) {
    els.resultsMeta.textContent = "Could not load catalog data.";
    els.grid.innerHTML =
      '<div class="empty"><div class="empty-title">Catalog not loaded</div><div class="empty-subtitle">The product list could not be read. If you are opening the file directly, keep `data/products-data.js` next to the site files or run a local server.</div></div>';
    els.emptyState.hidden = true;
    // eslint-disable-next-line no-console
    console.error(err);
  }
})();
