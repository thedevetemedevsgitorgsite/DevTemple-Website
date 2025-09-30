import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const { url, key } = { url: td, key: tc };

export const supabase = createClient(url, key);


async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Auth error:", error);
    return null;
  }
  return data?.user || null;
}

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

async function initFor(){
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

async function toggleStar(postId, btn, starCountEl) {
  const user = await getUser();
  if (!user) {
    alert("Please log in to star posts.");
    return;
  }

  const userId = user.id;
  let starRaw = parseInt(starCountEl.dataset.rawCount);

  try {
    // Check if this star already exists
    const { data: existing, error: checkError } = await supabase
      .from("stars")
      .select("id")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {
      // ⭐ Remove star
      await supabase.from("stars").delete().eq("id", existing.id);

      await supabase
        .from("posts")
        .update({ star: starRaw - 1 })
        .eq("id", postId);

      btn.style.background = "#ddd";
      starRaw -= 1;
    } else {
      // ⭐ Add star
      await supabase.from("stars").insert({
        user_id: userId,
        post_id: postId,
      });

      await supabase
        .from("posts")
        .update({ star: starRaw + 1 })
        .eq("id", postId);

      btn.style.background = "gold";
      starRaw += 1;
    }

    // Update UI counter
    starCountEl.dataset.rawCount = starRaw;
    starCountEl.textContent = formatCount(starRaw);

  } catch (err) {
    console.error("Star toggle failed:", err);
    alert("Could not update star, try again.");
  }
}

async function initStar(postId, btn, starCountEl) {
  const user = await getUser();
  if (!user) {
    
    return;
  }

  const userId = user.id;
  let starRaw = parseInt(starCountEl.dataset.rawCount);

  try {
    // Check if this star already exists
    const { data: existing, error: checkError } = await supabase
      .from("stars")
      .select("id")
      .eq("user_id", userId)
      .eq("post_id", postId)
      .maybeSingle();

    if (checkError) throw checkError;

    if (existing) {

      btn.style.background = "gold";
    } else {
      
      
      btn.style.background = "#ddd";
    }

    // Update UI counter
    starCountEl.dataset.rawCount = starRaw;
    starCountEl.textContent = formatCount(starRaw);

  } catch (err) {
    console.error("Star toggle failed:", err);
    alert("Could not update star, try again.");
  }
}



const cart = [];
const cartBox = document.querySelector(".cart-items");
const cartTotalEl = cartBox.querySelector("h4 span");

let checkoutBtn = document.createElement("button");
checkoutBtn.textContent = "Checkout with Paystack";
checkoutBtn.className = "checkout-btn";
checkoutBtn.style.cssText = `
  background: #0a6;
  color: #fff;
  border: none;
  padding: 8px 14px;
  margin-top: 5px;
  border-radius: 5px;
  cursor: pointer;
`;

// update UI
function updateCartUI() {
  cartBox.querySelectorAll(".cart-item").forEach(el => el.remove());
  
  let total = 0;
  cart.forEach((item, index) => {
    total += item.price;
    const div = document.createElement("div");
    div.className = "cart-item";
    div.innerHTML = `
      <strong>${item.title}</strong> - ₦${item.price}
      <button data-index="${index}" class="remove">x</button>
    `;
    cartBox.insertBefore(div, cartBox.querySelector("h4"));
  });
  
  cartTotalEl.textContent = total.toFixed(2);
  
  if (cart.length > 0) {
    if (!cartBox.contains(checkoutBtn)) cartBox.appendChild(checkoutBtn);
  } else {
    if (cartBox.contains(checkoutBtn)) checkoutBtn.remove();
  }
  
  cartBox.querySelectorAll(".remove").forEach(btn => {
    btn.onclick = e => {
      const idx = e.target.dataset.index;
      cart.splice(idx, 1);
      updateCartUI();
    };
  });
}

// add-to-cart

// checkout click
// Updated checkout function with better error handling
checkoutBtn.onclick = async () => {
  if (cart.length === 0) {
    alert("Cart is empty");
    return;
  }

  // Show loading state
  checkoutBtn.disabled = true;
  checkoutBtn.textContent = "Processing...";

  try {
    const user = await getUser();
    let email = user?.email;

    if (!email) {
      email = prompt("Enter your email to continue:");
      if (!email) {
        alert("Email is required for payment");
        return;
      }
      
      // Basic email validation
      if (!email.includes('@') || !email.includes('.')) {
        alert("Please enter a valid email address");
        return;
      }
    }

    console.log("Sending checkout request:", { email, cart });

    const res = await fetch("/.netlify/functions/create-pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ 
        email, 
        cart: cart.map(item => ({
          id: item.id,
          title: item.title,
          price: item.price,
          sellerId: item.sellerId,
          filePath: item.filePath
        }))
      })
    });

    const data = await res.json();
    console.log("Checkout response:", data);

    if (!res.ok || data.error) {
      let errorMessage = data.error || "Payment initialization failed";
      
      // Specific error messages for common issues
      if (errorMessage.includes("amount") || errorMessage.includes("Amount")) {
        errorMessage = "Invalid amount. Please check your cart items.";
      } else if (errorMessage.includes("email") || errorMessage.includes("Email")) {
        errorMessage = "Invalid email address. Please check and try again.";
      } else if (errorMessage.includes("key") || errorMessage.includes("authorization")) {
        errorMessage = "Payment service configuration error. Please contact support.";
      }
      
      throw new Error(errorMessage);
    }

    if (!data.authorization_url) {
      throw new Error("No payment URL received from server");
    }

    // Open Paystack checkout
    const handler = PaystackPop.setup({
      key: "pk_live_0b0770be1e29f5e7a159b39d2d9bdc2c41785306",
      email: email,
      amount: cart.reduce((s, i) => s + i.price, 0) * 100,
      currency: "NGN",
      ref: data.reference,
      callback: async function(response) {
        console.log("Paystack callback:", response);
        
        try {
          const verifyRes = await fetch("/.netlify/functions/verify-pay", {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({ reference: response.reference })
          });
          
          const verifyData = await verifyRes.json();
          console.log("Verification response:", verifyData);

          if (verifyData.success) {
            alert("✅ Payment successful! Your downloads are ready.");
            
            // Clear cart
            cart.length = 0;
            updateCartUI();
            
            // Show download links
            showDownloadLinks(verifyData.downloadLinks);
          } else {
            alert("❌ Payment verification failed: " + (verifyData.error || "Unknown error"));
          }
        } catch (verifyError) {
          console.error("Verification error:", verifyError);
          alert("❌ Could not verify payment. Please contact support with reference: " + response.reference);
        }
      },
      onClose: function() {
        console.log("Payment window closed");
        alert("Payment window closed. You can complete the payment later.");
        
        // Reset button state
        checkoutBtn.disabled = false;
        checkoutBtn.textContent = "Checkout with Paystack";
      }
    });
    
    handler.openIframe();
    
  } catch (error) {
    console.error("Checkout error:", error);
    alert("❌ Checkout failed: " + error.message);
    
    // Reset button state
    checkoutBtn.disabled = false;
    checkoutBtn.textContent = "Checkout with Paystack";
  }
};


// Function to display download links
function showDownloadLinks(downloadLinks) {
  // Remove existing download section if any
  const existingSection = cartBox.querySelector(".download-links");
  if (existingSection) existingSection.remove();

  // Create download section
  const dlSection = document.createElement("div");
  dlSection.className = "download-links";
  dlSection.style.cssText = `
    margin-top: 15px;
    padding: 15px;
    border: 2px solid #0a6;
    border-radius: 8px;
    background: #f9fff9;
  `;

  const title = document.createElement("h4");
  title.textContent = "📥 Your Downloads";
  title.style.cssText = "margin-bottom: 10px; color: #0a6;";
  dlSection.appendChild(title);

  const info = document.createElement("p");
  info.textContent = "Links are valid for 24 hours. Click to download:";
  info.style.cssText = "font-size: 14px; color: #666; margin-bottom: 10px;";
  dlSection.appendChild(info);

  downloadLinks.forEach(linkObj => {
    const itemDiv = document.createElement("div");
    itemDiv.style.cssText = "margin: 8px 0; padding: 8px; background: white; border-radius: 4px;";
    
    const a = document.createElement("a");
    a.href = linkObj.url;
    a.textContent = `Download: ${linkObj.title}`;
    a.target = "_blank";
    a.style.cssText = `
      display: block;
      padding: 8px 12px;
      background: #0a6;
      color: white;
      text-decoration: none;
      border-radius: 4px;
      text-align: center;
      font-weight: bold;
    `;
    
    a.onmouseover = () => a.style.background = "#084";
    a.onmouseout = () => a.style.background = "#0a6";
    
    itemDiv.appendChild(a);
    dlSection.appendChild(itemDiv);
  });

  cartBox.appendChild(dlSection);
}

// Handle payment verification on page load (if returning from Paystack)
document.addEventListener("DOMContentLoaded", () => {
  // Check for Paystack reference in URL
  const urlParams = new URLSearchParams(window.location.search);
  const reference = urlParams.get('reference');
  
  if (reference) {
    verifyPaymentOnReturn(reference);
  }
  
  loadPosts();
});

async function verifyPaymentOnReturn(reference) {
  try {
    const verifyRes = await fetch("/.netlify/functions/verify-pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference })
    });
    
    const verifyData = await verifyRes.json();

    if (verifyData.success) {
      alert("✅ Payment verified! Your downloads are ready.");
      showDownloadLinks(verifyData.downloadLinks);
      
      // Clear cart
      cart.length = 0;
      updateCartUI();
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      alert("❌ Payment verification failed: " + verifyData.error);
    }
  } catch (error) {
    console.error("Verification error:", error);
    alert("❌ Could not verify payment. Please contact support.");
  }
      }

// ========== SALES & POSTS ==========
async function loadPosts() {
  try {
    const user = await getUser();
    if (!user) {
      console.warn("No logged-in user found.");
      return;
    }
    
    console.log("Current user ID:", user.id);
    
    const { data, error } = await supabase
      .from("posts")
      .select("id, name, description, price, cover, auth_bio,  auth_img, auth_name, star, sales, auth_skill, file_path, viewer")
      .order("id", { ascending: false }); // newest first
    
    if (error) {
      throw error;
    }
    
    const grid = document.querySelector(".product");
    grid.innerHTML = "";
    
    if (!data || data.length === 0) {
      grid.innerHTML = `<p class="empty-msg">You haven’t uploaded any posts yet.</p>`;
      return;
    }
    
    data.forEach(post => {
      const div = document.createElement("div");
div.className = "card";
div.dataset.id = post.id;
div.dataset.filePath = post.file_path;
div.dataset.sellerId = post.user_id; 

div.innerHTML = `
  <div class="product-img" style="background-image: url(${post.cover || "/assets/images/index.png"});">
    <h3><i class="fas fa-shopping-cart"></i></h3>
    <h4 data-view="${post.viewer || 'https://media.tenor.com/rRBWXoBqPikAAAAM/critical-error-error.gif'}"><i class="fas fa-eye"></i></h4>
  </div>
  <p class="product-describe">
    <strong>${post.name.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</strong><br>
    ${post.description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
  </p>
  <div class="profile" data-bio="${post.auth_bio||''} • ${post.auth_skill||''}">
    <p>
      <img src="${post.auth_img||post.cover||'/assets/images/default.png'}" alt="User profile">
      <strong class="user-name">@${post.auth_name || post.name}</strong> 
      &nbsp;<sup class="report" style="color:#f50;">Report</sup>
    </p>
  </div>
  <div class="buttons">
          <span class="star-contain">
        <button class="star"></button>
        <span class="star-count" data-raw-count="${post.star || 0}">
          ${formatCount(post.star || 0)}
        </span>
      </span>
      <span class="amount" data-price="${post.price || 0}">$${post.price || 0} 
        <small><b class="sales">${post.sales || 0}</b> sales</small>
      </span>
    <a href="/home.html#search?q=${encodeURIComponent(post.name)}"><span class="star-contain"><i class="fas fa-search"></i></span></a>
  </div>
`;
//`

  grid.appendChild(div);

  // ⭐ Setup star button
  const btn = div.querySelector("button.star");
  const starCountEl = div.querySelector(".star-count");

  btn.style.background = "#ddd";
  initStar(post.id, btn, starCountEl);
  btn.addEventListener("click", () => {
    toggleStar(post.id, btn, starCountEl);
})
  const comm = document.querySelector(".product");
  const proCard = comm.querySelectorAll(".card");
  
  proCard.forEach(card => {
        const tag = card.querySelector(".product-describe");
        if (card) {
          card.querySelector(".buttons a").href = `#search?q=${encodeURIComponent(tag.innerHTML.match(/#[\w-]+/) || '')}`;
          tag.innerHTML = tag.innerHTML.replace(/\#([\w\-]+)/g, "<a href='#search?q=$1' class='card-tag'>#$1</a>");
          tag.querySelectorAll(".card-tag").forEach(ctag => {
            ctag.style.cssText = `color: var(--primary-color);
          font-family: "ADLaM Display", monospace;
          text-decoration: none;`;
          });
          }
        });
        
        comm.querySelectorAll(".card").forEach(card => {
  const addBtn = card.querySelector(".product-img h3");
  addBtn.style.cursor = "pointer";
  
  addBtn.onclick = () => {
    const id = card.dataset.id;
    const title = card.querySelector(".product-describe strong").textContent;
    const price = parseFloat(card.querySelector(".amount").dataset.price);
    const sellerId = card.dataset.sellerId;
    const filePath = card.dataset.filePath; // stored in dataset for download later
    
    cart.push({ id, title, price, sellerId, filePath });
    updateCartUI();
  };
});

        document.querySelectorAll(".card .profile").forEach(profile => {
    
  profile.addEventListener("click", () => {
      document.querySelector(".search-loader").style.display = "flex";

setTimeout(() => {
    const name = profile.querySelector(".user-name").textContent;
    let bio = profile.dataset.bio;
    bio=bio.replace(/((https?:\/\/)?(\w+\.[^\s]+))/g, "<a href='$1'>$1</a>")
    const img = profile.querySelector("img").src;

    document.getElementById("popupName").textContent = name;
    document.getElementById("schUser").href = `#search?q=${encodeURIComponent(name)}`;
    document.getElementById("userToRe").value=`User reported: ${name}`;
    document.getElementById("popupBio").innerHTML = bio;
    document.getElementById("popupImg").src = img;
    
    document.getElementById("userView").style.display = "block";
    document.querySelector(".search-loader").style.display = "none";
}, 2000);
  });
  
});


const dataView = document.querySelectorAll("h4[data-view*='/']");
dataView.forEach(view => {
  view.addEventListener("click", e => {
    const viewSrc = view.dataset.view || "/assets/images/20250918_223801.png";
    const videoBox = document.querySelector(".video-view");
    const embed = videoBox.querySelector("embed");
    embed.src = viewSrc;
    videoBox.style.display = "block";
    embed.style.display = 'none';
    document.getElementById("embedLoader").style.display = 'block';
    embed.onload = function() {
      document.getElementById("embedLoader").style.display = 'none';
      embed.style.display = 'block';
    }
  })
})
        
        
        
        
    });
  } catch (error) {
    console.error("Error loading posts:", error);
  }} 



document.addEventListener("DOMContentLoaded", ()=>{
  loadPosts();
})


