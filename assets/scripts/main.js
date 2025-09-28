

const schForm = document.querySelector(".top-menu form");
const schInput = schForm.querySelector("input");
schInput.style.display="none";
schForm.querySelector("button").onclick = ()=>{
  
  schInput.style.display=schInput.style.display==="none"? "inline-block":"none";
  document.querySelector(".cart-items").style.display=schInput.style.display==="none"? "block":"none";
}
const toggle = document.querySelector("#toggle");
const toggleBtn = document.querySelector("[for='toggle']");
toggle.addEventListener("input", (e)=>{
  if(e.target.checked){
    toggleBtn.innerHTML="<I class='fas fa-times'></i>";
    
  }
  else {
    toggleBtn.textContent="☰"; 
  }
})

document.addEventListener("DOMContentLoaded", () => {
  // === Your existing search + filter logic ===
  const schInp = document.querySelector(".top-menu form input");
  const comm = document.querySelector(".product");
  const proCard = comm.querySelectorAll(".card");
  
  proCard.forEach(card => {
    const tag = card.querySelector(".product-describe");
    if (card) {
      card.querySelector(".buttons a").href=`#search?q=${encodeURIComponent(tag.innerHTML.match(/#[\w-]+/) || '')}`; 
      tag.innerHTML = tag.innerHTML.replace(/\#([\w\-]+)/g, "<a href='#search?q=$1' class='card-tag'>#$1</a>");
      tag.querySelectorAll(".card-tag").forEach(ctag => {
        ctag.style.cssText =`color: var(--primary-color);
          font-family: "ADLaM Display", monospace;
          text-decoration: none;`;
      });
    }
 });
  //`
  let noMatch = document.querySelector("#noMatch");
  if (!noMatch) {
    noMatch = document.createElement("p");
    noMatch.id = "noMatch";
    noMatch.innerHTML = `<img src="/assets/images/20250918_223801.png" width="40" height="40" style="margin-top: 10px;animation:spin-bor 2s ease-in-out infinite;border-radius: 50%;border: 1px solid var(--primary-color);border-right: 0;"><a href=""><button>Refresh</button></a> No matching results found.`;
    noMatch.style.display = "none";
    comm.appendChild(noMatch);
  }
  
  function filterCrips(searchTerm) {
    const allCripElements = comm.querySelectorAll(".card");
    let matchFound = false;
    allCripElements.forEach((el) => {
      if (el.innerText.toUpperCase().includes(searchTerm)) {
        el.style.display = "";
        matchFound = true;
      } else {
        el.style.display = "none";
      }
    });
    noMatch.style.display = matchFound ? "none" : "block";
  }
  
  schInp.addEventListener("input", () => {
    const searchTerm = schInp.value.trim();
    filterCrips(searchTerm.toUpperCase());
  });
  
  function processSearchFromURL() {
  document.querySelector(".search-loader").style.display='flex';
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      let value = params.get("q");
      if (!value) {
        const hash = window.location.hash;
        if (hash.startsWith("#search")) {
          const queryString = hash.split("?")[1];
          if (queryString) {
            const hashParams = new URLSearchParams(queryString);
            value = hashParams.get("q");
          }
        }
      }
      if (value) {
        schInp.value = decodeURIComponent(value);
        filterCrips(value.trim().toUpperCase());
      }
      document.querySelector(".search-loader").style.display='none';
    }, 1500);
  }
  
  processSearchFromURL();
  window.addEventListener("hashchange", processSearchFromURL);
  document.querySelector(".top-menu form").addEventListener("submit", (e) => {
    e.preventDefault();
    filterCrips(document.querySelector(".top-menu form input").value.toUpperCase());
  });
  

// === 🛒 CART LOGIC WITH MULTI-CURRENCY ===
const cart = [];
const cartBox = document.querySelector(".cart-items");
const cartTotalEl = cartBox.querySelector("h4 span");

// PayPal button container
let paypalContainer = document.createElement("div");
paypalContainer.id = "paypal-button-container";
paypalContainer.style.marginTop = "10px";

// Currency selector
let currencySelect = document.createElement("select");
currencySelect.id = "currency-select";
["USD", "EUR", "GBP", "NGN"].forEach(curr => {
  let opt = document.createElement("option");
  opt.value = curr;
  opt.textContent = curr;
  if(curr!="USD")opt.disabled=true;
  
  currencySelect.appendChild(opt);
});
currencySelect.style.cssText = `
  margin-top: 5px;
  padding: 3px 6px;
  border-radius: 5px;
  border: 1px solid #ccc;
`;

// Checkout button
let checkoutBtn = document.createElement("button");
checkoutBtn.textContent = "Checkout";
checkoutBtn.className = "checkout-btn";
checkoutBtn.style.cssText = `
  background: #09f;
  color: #fff;
  border: none;
  padding: 5px 12px;
  margin-top: 5px;
  border-radius: 5px;
  cursor: pointer;
`;

checkoutBtn.onclick = () => {
document.querySelector(".search-loader").style.display='flex';
setTimeout(() =>{
  if (cart.length === 0) {
    alert("Cart is empty!");
    return;
  }

  // clear old PayPal buttons
  paypalContainer.innerHTML = "";

  const selectedCurrency = currencySelect.value;

  // Render PayPal Buttons with chosen currency
  paypal.Buttons({
    createOrder: function (data, actions) {
      const total = cart.reduce((sum, item) => sum + item.price, 0).toFixed(2);
      return actions.order.create({
        purchase_units: [{
          amount: {
            currency_code: selectedCurrency,
            value: total,
            breakdown: {
              item_total: {
                currency_code: selectedCurrency,
                value: total
              }
            }
          },
          items: cart.map(item => ({
            name: item.title,
            unit_amount: {
              currency_code: selectedCurrency,
              value: item.price.toFixed(2)
            },
            quantity: "1"
          }))
        }]
      });
    },
    onApprove: function (data, actions) {
      return actions.order.capture().then(function (details) {
        alert("✅ Payment successful! Thank you, " + details.payer.name.given_name);
        cart.length = 0;
        updateCartUI();
        paypalContainer.innerHTML = "";
      });
    },
    onError: function (err) {
      console.error("PayPal Checkout Error:", err);
      alert("⚠️ Something went wrong with PayPal Checkout.");
    }
  }).render("#paypal-button-container");
  document.querySelector(".search-loader").style.display='none';
}, 1200);
};
function updateCartUI() {
  // clear old items
  cartBox.querySelectorAll(".cart-item").forEach(el => el.remove());

  let total = 0;
  cart.forEach((item, index) => {
    total += item.price;

    const div = document.createElement("div");
    div.className = "cart-item";
    div.style.cssText = "font-size: 14px; margin: 3px 0;";
    div.innerHTML = `
      <img src="${item.img}" alt="product" width="30" style="border-radius:5px;vertical-align:middle;">
      <strong>${item.title}</strong> - $${item.price.toFixed(2)}
      <button data-index="${index}" class="remove"><I class='fas fa-times'></i></button>
    `;
    cartBox.insertBefore(div, cartBox.querySelector("h4"));
  });

  cartTotalEl.textContent = total.toFixed(2);

  // remove item listener
  cartBox.querySelectorAll(".remove").forEach(btn => {
    btn.addEventListener("click", (e) => {
      const idx = e.target.dataset.index;
      cart.splice(idx, 1);
      updateCartUI();
    });
  });

  // append checkout + currency + PayPal
  if (cart.length > 0) {
    if (!cartBox.contains(currencySelect)) cartBox.appendChild(currencySelect);
    if (!cartBox.contains(checkoutBtn)) cartBox.appendChild(checkoutBtn);
    if (!cartBox.contains(paypalContainer)) cartBox.appendChild(paypalContainer);
  } else {
    [currencySelect, checkoutBtn, paypalContainer].forEach(el => {
      if (cartBox.contains(el)) el.remove();
    });
  }
}

// Attach add-to-cart buttons
proCard.forEach(card => {
  const addBtn = card.querySelector(".product-img h3");
  addBtn.style.cursor = "pointer";

  addBtn.addEventListener("click", () => {
  document.querySelector(".search-loader").style.display='flex';
  setTimeout(() =>{
    const title = card.querySelector(".product-describe strong").textContent;
    const priceRaw = card.querySelector(".amount").dataset.price;
    const price = parseFloat(priceRaw) || 0;
    const img = card.querySelector(".product-img").style.backgroundImage.replace(/url\(["']?(.+?)["']?\)/, '$1');
    const seller = card.querySelector(".user-name").textContent;

    cart.push({ title, price, img, seller });
    updateCartUI();
  document.querySelector(".search-loader").style.display='none';
  }, 1200);
  });
});


cartBox.classList.add("collapsed");

// toggle on click
cartBox.addEventListener("click", function (e) {
  if (
    e.target.closest(".remove") ||
    e.target.closest(".checkout-btn") ||
    e.target.closest("#currency-select") ||
    e.target.closest("#paypal-button-container")
  ) {
    return; // don’t toggle if inside controls
  }
  cartBox.classList.toggle("collapsed");
});
});

const themeToggle = document.getElementById('theme-toggle');

// Load saved theme on page load
if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark-theme');
}

// Add a single click event listener
themeToggle.addEventListener('click', function() {
    document.documentElement.classList.toggle('dark-theme');
    if (document.documentElement.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});



const allButtonContainers = document.querySelectorAll(".buttons"); // Corrected to select all button groups

allButtonContainers.forEach(btnPar => {
  const btn = btnPar.querySelector("button.star");
  const starCount = btnPar.querySelector(".star-count");
  
  // Set initial background *after* initFor has run, or move this logic
  // within the initFor or the click handler's setup.
  btn.style.background = "#ddd"; 
  
  btn.addEventListener("click", (e) => {
    // 1. Read the raw count from the data attribute (it's a string, convert to number)
    let starRaw = parseInt(starCount.dataset.rawCount);
    
    // 2. Toggle background and calculate the new raw count
    const isGold = btn.style.background === "gold";
    
    btn.style.background = isGold ? "#ddd" : "gold";
    
    const newRaw = isGold ? starRaw - 1 : starRaw + 1;
    
    // 3. Update the data attribute with the new raw count
    starCount.dataset.rawCount = newRaw; 
    
    // 4. Update the display by re-formatting the new raw count
    starCount.textContent = formatCount(newRaw);
  });
});

function formatCount(num) {
  if (num >= 1_000_000_000) {
    return (num / 1_000_000_000).toFixed(1).replace(/\.0$/, "") + "B";
  }
  if (num >= 1_000_000) {
    return (num / 1_000_000).toFixed(1).replace(/\.0$/, "") + "M";
  }
  if (num >= 1_000) {
    return (num / 1_000).toFixed(1).replace(/\.0$/, "") + "K";
  }
  return num.toString();
}

function initFor(){
  const containNum = document.querySelectorAll(".buttons");
  containNum.forEach(contNum=>{
    // --- For .sales (optional but good practice) ---
    const salesEl = contNum.querySelector(".sales");
    const salesRaw = parseInt(salesEl.textContent);
    salesEl.textContent = formatCount(salesRaw);
    salesEl.dataset.rawCount = salesRaw;

    // --- For .star-count (CRUCIAL) ---
    const starCountEl = contNum.querySelector(".star-count");
    const starRaw = parseInt(starCountEl.textContent); // Get the initial raw number from HTML
    
    // Store the raw number in a data attribute
    starCountEl.dataset.rawCount = starRaw; 
    
    // Format the text content for display
    starCountEl.textContent = formatCount(starRaw);
  });
}
initFor(); // Execute initialization
document.getElementById("sideSearch").addEventListener("keyup", e=>{
  if(e.key === "Enter"){
    window.location.href="/home.html#search?q="+encodeURIComponent(e.target.value);
  }
})

