const CART_STORAGE_KEY = "shri-hari-cart";

const els = {
  cartItems: document.getElementById("cartItems"),
  cartEmpty: document.getElementById("cartEmpty"),
  cartMeta: document.getElementById("cartMeta"),
  cartItemCount: document.getElementById("cartItemCount"),
  cartSubtotal: document.getElementById("cartSubtotal"),
  cartClearBtn: document.getElementById("cartClearBtn"),
  orderForm: document.getElementById("orderForm"),
  customerName: document.getElementById("customerName"),
  customerPhone: document.getElementById("customerPhone"),
  customerAddress: document.getElementById("customerAddress"),
  customerNote: document.getElementById("customerNote"),
  nameError: document.getElementById("nameError"),
  phoneError: document.getElementById("phoneError"),
  addressError: document.getElementById("addressError"),
  cartError: document.getElementById("cartError"),
};

let cart = [];
const WHATSAPP_NUMBER = "919095477477";

function formatInr(n) {
  const value = typeof n === "number" && Number.isFinite(n) ? n : 0;
  return new Intl.NumberFormat("en-IN", { maximumFractionDigits: 2 }).format(value);
}

function gstLabel(gst) {
  if (gst === null || gst === 0) return "Nil";
  return `${gst}%`;
}

function saveCart() {
  localStorage.setItem(CART_STORAGE_KEY, JSON.stringify(cart));
}

function loadCart() {
  try {
    const raw = localStorage.getItem(CART_STORAGE_KEY);
    const parsed = raw ? JSON.parse(raw) : [];
    if (!Array.isArray(parsed)) return;

    cart = parsed
      .filter((item) => item && typeof item.id === "string")
      .map((item) => ({
        id: item.id,
        brand: String(item.brand ?? "").trim(),
        name: String(item.name ?? "").trim(),
        packSize: String(item.packSize ?? "").trim(),
        price: Number(item.price ?? 0),
        gst: item.gst === null || item.gst === "Nil" ? null : Number(item.gst),
        qty: Math.max(1, Number(item.qty ?? 1) || 1),
      }));
  } catch {
    cart = [];
  }
}

function cartTotals() {
  return cart.reduce(
    (acc, item) => {
      acc.items += item.qty;
      acc.subtotal += item.price * item.qty;
      return acc;
    },
    { items: 0, subtotal: 0 }
  );
}

function renderCart() {
  els.cartItems.innerHTML = "";

  const { items, subtotal } = cartTotals();
  els.cartMeta.textContent = items ? `${items} item${items === 1 ? "" : "s"} selected` : "No products selected";
  els.cartItemCount.textContent = String(items);
  els.cartSubtotal.textContent = `₹ ${formatInr(subtotal)}`;
  els.cartEmpty.hidden = cart.length > 0;
  els.cartItems.hidden = cart.length === 0;
  els.cartClearBtn.disabled = cart.length === 0;
  els.cartClearBtn.hidden = cart.length === 0;
  els.cartClearBtn.setAttribute("aria-disabled", cart.length === 0 ? "true" : "false");
  if (els.cartError) els.cartError.hidden = cart.length > 0;

  if (!cart.length) return;

  const frag = document.createDocumentFragment();

  for (const item of cart) {
    const row = document.createElement("div");
    row.className = "cart-item";

    const body = document.createElement("div");
    body.className = "cart-item-body";

    const title = document.createElement("div");
    title.className = "cart-item-title";
    title.textContent = item.name;

    const meta = document.createElement("div");
    meta.className = "cart-item-meta";
    meta.textContent = `${item.brand} • ${item.packSize} • GST ${gstLabel(item.gst)}`;

    const price = document.createElement("div");
    price.className = "cart-item-price";
    price.textContent = `₹ ${formatInr(item.price)} each`;

    body.appendChild(title);
    body.appendChild(meta);
    body.appendChild(price);

    const actions = document.createElement("div");
    actions.className = "cart-item-actions";

    const qtyControls = document.createElement("div");
    qtyControls.className = "qty-controls";

    const decBtn = document.createElement("button");
    decBtn.className = "qty-btn";
    decBtn.type = "button";
    decBtn.textContent = "-";
    decBtn.setAttribute("aria-label", `Decrease quantity for ${item.name}`);
    decBtn.addEventListener("click", () => changeCartQty(item.id, -1));

    const qtyValue = document.createElement("span");
    qtyValue.className = "qty-value";
    qtyValue.textContent = String(item.qty);

    const incBtn = document.createElement("button");
    incBtn.className = "qty-btn";
    incBtn.type = "button";
    incBtn.textContent = "+";
    incBtn.setAttribute("aria-label", `Increase quantity for ${item.name}`);
    incBtn.addEventListener("click", () => changeCartQty(item.id, 1));

    qtyControls.appendChild(decBtn);
    qtyControls.appendChild(qtyValue);
    qtyControls.appendChild(incBtn);

    const lineTotal = document.createElement("div");
    lineTotal.className = "cart-line-total";
    lineTotal.textContent = `₹ ${formatInr(item.price * item.qty)}`;

    const removeBtn = document.createElement("button");
    removeBtn.className = "btn small ghost cart-remove";
    removeBtn.type = "button";
    removeBtn.textContent = "Remove";
    removeBtn.addEventListener("click", () => removeFromCart(item.id));

    actions.appendChild(qtyControls);
    actions.appendChild(lineTotal);
    actions.appendChild(removeBtn);

    row.appendChild(body);
    row.appendChild(actions);
    frag.appendChild(row);
  }

  els.cartItems.appendChild(frag);
}

function changeCartQty(id, delta) {
  const item = cart.find((entry) => entry.id === id);
  if (!item) return;

  item.qty = Math.max(1, item.qty + delta);
  saveCart();
  renderCart();
}

function removeFromCart(id) {
  cart = cart.filter((item) => item.id !== id);
  saveCart();
  renderCart();
}

function clearCart() {
  cart = [];
  saveCart();
  renderCart();
}

function setFieldError(el, shouldShow) {
  if (!el) return;
  el.hidden = !shouldShow;
}

function isValidPhone(value) {
  return /^\d{10}$/.test(value);
}

function buildWhatsAppMessage() {
  const name = els.customerName.value.trim();
  const phone = els.customerPhone.value.trim();
  const address = els.customerAddress.value.trim();
  const note = els.customerNote.value.trim();
  const { subtotal } = cartTotals();

  const lines = [
    "Hello, I want to place an order.",
    "",
    `Name: ${name}`,
    `Phone: ${phone}`,
    `Address: ${address}`,
    "",
    "Products:",
  ];

  cart.forEach((item, index) => {
    lines.push(`${index + 1}. ${item.name} - ${item.qty} x Rs.${formatInr(item.price)}`);
  });

  lines.push("");
  lines.push(`Subtotal: Rs.${formatInr(subtotal)}`);

  if (note) {
    lines.push("");
    lines.push(`Note: ${note}`);
  }

  return lines.join("\n");
}

function handleOrderSubmit(event) {
  event.preventDefault();

  const name = els.customerName.value.trim();
  const phone = els.customerPhone.value.trim();
  const address = els.customerAddress.value.trim();

  const nameInvalid = name === "";
  const phoneInvalid = !isValidPhone(phone);
  const addressInvalid = address === "";
  const cartInvalid = cart.length === 0;

  setFieldError(els.nameError, nameInvalid);
  setFieldError(els.phoneError, phoneInvalid);
  setFieldError(els.addressError, addressInvalid);
  if (els.cartError) els.cartError.hidden = !cartInvalid;

  if (nameInvalid || phoneInvalid || addressInvalid || cartInvalid) return;

  const message = buildWhatsAppMessage();
  const whatsappUrl = `https://wa.me/${WHATSAPP_NUMBER}?text=${encodeURIComponent(message)}`;
  window.open(whatsappUrl, "_blank", "noopener,noreferrer");
}

function wireEvents() {
  els.cartClearBtn?.addEventListener("click", clearCart);
  els.orderForm?.addEventListener("submit", handleOrderSubmit);
}

(function init() {
  loadCart();
  renderCart();
  wireEvents();
})();
