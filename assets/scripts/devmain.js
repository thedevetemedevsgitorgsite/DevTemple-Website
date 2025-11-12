import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

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
function formatLength(text) {
  const maxlength = 200;
  const length = text.length;
  const each = maxlength - length;
  if (each >= 4){
    text += "&nbsp; ".repeat(each);
  return text;
  }
  else{
    return text;
  }
}
async function initFor() {
  const containNum = document.querySelectorAll(".buttons");
  containNum.forEach(contNum => {
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
window.fn = function fn(fng) {
  return fng.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}



async function toggleStar(postId, btn, starCountEl) {
  const user = await getUser();
  if (!user) {
    cAlert("Please log in to star posts.", "warning", "User Author");
    return;
  }
  
  const userId = user.id;
  
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
      // Remove star
      await supabase.from("stars").delete().eq("id", existing.id);
      btn.style.color = "#ddd";
    } else {
      // Add star
      await supabase.from("stars").insert({
        user_id: userId,
        post_id: postId,
      });
      btn.style.color = "red";
    }
    
    // Get fresh count directly from stars table
    const { count, error: countError } = await supabase
      .from("stars")
      .select("*", { count: 'exact', head: true })
      .eq("post_id", postId);
    
    if (countError) throw countError;
    
    // Update UI with accurate count
    starCountEl.textContent = formatCount(count);
    
  } catch (err) {
    console.error("Star toggle failed:", err);
    cAlert("Could not update like, try again.", "warning", "not added");
  }
}

async function initStar(postId, btn, starCountEl) {
  const user = await getUser();
  
  // Set default color
  btn.style.color = "#ddd";
  
  try {
    // Get accurate star count from database
    const { count, error: countError } = await supabase
      .from("stars")
      .select("*", { count: 'exact', head: true })
      .eq("post_id", postId);
    
    if (countError) throw countError;
    
    // Update UI with count
    starCountEl.textContent = formatCount(count);
    
    // Check if current user has starred (only if logged in)
    if (user) {
      const userId = user.id;
      const { data: existing, error: checkError } = await supabase
        .from("stars")
        .select("id")
        .eq("user_id", userId)
        .eq("post_id", postId)
        .maybeSingle();
      
      if (checkError) throw checkError;
      
      if (existing) {
        btn.style.color = "red";
      }
    }
  } catch (err) {
    console.error("Star init failed:", err);
  }
}
const cart = [];
const cartBox = document.querySelector(".cart-items");
const cartTotalEl = cartBox.querySelector("h4 span");

let checkoutBtn = document.createElement("button");
checkoutBtn.textContent = `Checkout with Paystack`;
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
      <strong>${item.title}</strong> [ ₦${fn(item.price)}]
      <button data-index="${index}" class="remove">x</button>
      <small style="color:#d00;max-width:80%;overlay:auto;">Note: don't close or reload the browser when making the payment — <a href="/terms/index.html#payment-refunds-heading">More info</a></b></small>
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

    // Updated checkout function with proper callback handling
checkoutBtn.onclick = async function() {
  if (cart.length === 0) {
    cAlert("Cart is empty");
    return;
  }

  // Show loading state
  const originalText = checkoutBtn.textContent;
  checkoutBtn.disabled = true;
  checkoutBtn.textContent = "Processing...";

  try {
    const user = await getUser();
    let email = user?.email;

    if (!email) {
      email = prompt("Enter your email to continue:");
      if (!email) {
        resetCheckoutButton(checkoutBtn, originalText);
        cAlert("Email is required for payment", "warning");
        return;
      }
      
      if (!email.includes('@') || !email.includes('.')) {
        resetCheckoutButton(checkoutBtn, originalText);
        cAlert("Please enter a valid email address", "warning");
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
          filePath: item.filePath,
          sales: item.sales || 0
        }))
      })
    });

    const data = await res.json();
    console.log("Checkout response:", data);

    
    if (!res.ok || data.error) {
  let errorMessage = data.error || "Payment initialization failed";
  
  // Show more details if available
  if (data.paystack_error?.message) {
    errorMessage += `: ${data.paystack_error.message}`;
  }
  
  console.error("Detailed error:", data); // Log full error
  throw new Error(errorMessage);
}

    if (!data.authorization_url) {
      throw new Error("No payment URL received from server");
    }

    // Calculate total amount
    const totalAmount = cart.reduce((sum, item) => sum + item.price, 0) * 100;

    // Define callback functions first
    const paymentCallback = function(response) {
      console.log("Paystack callback triggered:", response);
      
      // Reset button immediately
      resetCheckoutButton(checkoutBtn, originalText);
      
      handlePaymentVerification(response.reference);
    };

    const onCloseCallback = function() {
      console.log("Payment window closed");
      resetCheckoutButton(checkoutBtn, originalText);
      cAlert("Payment window closed. You can complete the payment later.");
    };

    // Setup Paystack with the defined functions
    const handler = PaystackPop.setup({
      key: "pk_live_0b0770be1e29f5e7a159b39d2d9bdc2c41785306",
      email: email,
      amount: totalAmount,
      currency: "NGN",
      ref: data.reference,
      callback: paymentCallback,  // Use the predefined function
      onClose: onCloseCallback    // Use the predefined function
    });

    handler.openIframe();

  } catch (error) {
    console.error("Checkout error:", error);
    cAlert("❌ Checkout failed: " + error.message, "warning", "Initial error");
    resetCheckoutButton(checkoutBtn, originalText);
  }
};

// Helper function to reset button state
function resetCheckoutButton(button, originalText) {
  button.disabled = false;
  button.textContent = originalText;
}

// Separate function for payment verification
async function handlePaymentVerification(reference) {
  try {
    console.log("Verifying payment with reference:", reference);
    
    const verifyRes = await fetch("/.netlify/functions/verify-pay", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ reference: reference })
    });
    
    const verifyData = await verifyRes.json();
    console.log("Verification response:", verifyData);

    if (verifyData.success) {
      cAlert("✅ Payment successful! Your downloads are ready.", "success", "Success");
      
      // Clear cart
      cart.length = 0;
      updateCartUI();
      
      // Show download links
      showDownloadLinks(verifyData.downloadLinks);
    } else {
      cAlert("❌ Payment verification failed: " + (verifyData.error || "Unknown error"), "warning", "initial error");
    }
  } catch (verifyError) {
    console.error("Verification error:", verifyError);
    cAlert("❌ Could not verify payment. Please contact support with reference: " + reference, "warning", "initial error");
  }
}

// Your existing showDownloadLinks function (make sure it's defined)
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
    a.textContent = `Download: ${linkObj.title || 'Item ' + linkObj.id}`;
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
    dlSection.innerHTML += `<button onclick="this.parentElement.style.display='none'"><I class="fas fa-times"></i> close</button>`;
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
      cAlert("☑ Payment verified! Your downloads are ready.", "warning", "Verified");
      showDownloadLinks(verifyData.downloadLinks);
      
      // Clear cart
      cart.length = 0;
      updateCartUI();
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      cAlert("❌ Payment verification failed: " + verifyData.error, "warning", "initial error");
    }
  } catch (error) {
    console.error("Verification error:", error);
    cAlert("❌ Could not verify payment. Please contact support.", "warning", "Unknown error");
  }
      }


// ========== SALES & POSTS ==========
async function loadPosts(orderCl="id", orderAc=false){
  try {
    const user = await getUser();
    if (!user) {
      console.warn("No logged-in user found.");
      document.querySelector(".product").innerHTML = `
        <div class="card">
          <div class="product-img" style="background-image: url(https://media.tenor.com/2yKn3g52FdgAAAAM/login-required-access-denied-gen-v.gif);">
            <h3><svg width="24" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
      </svg></h3>
            <h4 data-view="https://media.tenor.com/J3_7mEynzQIAAAAM/ganz.gif"><svg width="24" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      </svg></h4>
          </div>
          <p class="product-describe">
            <strong><a href="/signup.html">Sign up/Login</a></strong><br>
          </p>
          <div class="profile" data-name="@DevTemple" data-bio="Official DevTemple •🦺">
            <p><img src="/assets/images/20250918_223801.png" alt="User-profile">
            <strong class="user-name">@DevTemple<I class="fas fa-verify"></I></strong> &nbsp; <sup class="report" style="color:#f50;">Report</sup></p>
          </div>
          <div class="buttons">
            <span class="star-contain"><button class="star fas fa-heart"></button><span class="star-count">_</span></span>
            <span class="amount" data-price="37.05">_ <small><b class="sales">_</b> sales</small></span>
            <a><span class="star-contain"><i class="fas fa-search"></i> </span></a>
          </div>
        </div>
      `;
      return;
    }
   
    const { data, error } = await supabase
      .from("posts")
      .select("id, name, description, price, cover, star, sales, file_path, viewer, user_id, portfolio_url, sponsored, created_at")
      .order(orderCl, { ascending: orderAc });
    
    if (error) {
      throw error;
    }
    
    const grid = document.querySelector(".product");
    grid.innerHTML = "";
    
    if (!data || data.length === 0) {
      grid.innerHTML = `<p class="empty-msg">You haven't uploaded any posts yet.</p>`;
      return;
    }
    
    // Fetch all unique user profiles
    const userIds = [...new Set(data.map(post => post.user_id))];
    const { data: profiles, error: profileError } = await supabase
      .from("profiles") // or whatever your user table is called
      .select("id, username, full_name, photo_url, bio, skills, status")
      .in("id", userIds);
    
    if (profileError) {
      console.error("Error fetching profiles:", profileError);
    }
    
    // Create a map for quick profile lookup
    const profileMap = new Map(profiles?.map(p => [p.id, p]) || []);
    
    data.forEach(post => {
      // Get live profile data
      const profile = profileMap.get(post.user_id) || {};
      
      const div = document.createElement("div");
      div.className = "card";
      div.dataset.id = post.id;
      div.dataset.filePath = post.file_path;
      div.dataset.sellerId = post.user_id;
      div.dataset.profileId = post.user_id; // Store for profile click handler
      div.dataset.sales = post.sales||0;
      
      div.innerHTML = `
  <div class="product-img" style="background-image: url(${post.cover || "/assets/images/index.png"});">
    <h3 style="visibility:${post.sponsored !=='n'?"hidden":"visible"}"><svg width="24" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M7 18c-1.1 0-1.99.9-1.99 2S5.9 22 7 22s2-.9 2-2-.9-2-2-2zM1 2v2h2l3.6 7.59-1.35 2.45c-.16.28-.25.61-.25.96 0 1.1.9 2 2 2h12v-2H7.42c-.14 0-.25-.11-.25-.25l.03-.12.9-1.63h7.45c.75 0 1.41-.41 1.75-1.03l3.58-6.49c.08-.14.12-.31.12-.48 0-.55-.45-1-1-1H5.21l-.94-2H1zm16 16c-1.1 0-1.99.9-1.99 2s.89 2 1.99 2 2-.9 2-2-.9-2-2-2z"/>
      </svg></h3>
    <h4 data-view="${post.viewer || 'https://media.tenor.com/rRBWXoBqPikAAAAM/critical-error-error.gif'}" class="${post.sponsored!=='n'?"ad":""}" ${post.sponsored!=='n'?"onclick='null'":""}>${post.sponsored!=='n'?"AD":`<svg width="24" height="20" viewBox="0 0 24 24" fill="currentColor">
        <path d="M12 4.5C7 4.5 2.73 7.61 1 12c1.73 4.39 6 7.5 11 7.5s9.27-3.11 11-7.5c-1.73-4.39-6-7.5-11-7.5zM12 17c-2.76 0-5-2.24-5-5s2.24-5 5-5 5 2.24 5 5-2.24 5-5 5zm0-8c-1.66 0-3 1.34-3 3s1.34 3 3 3 3-1.34 3-3-1.34-3-3-3z"/>
      </svg>`}</h4>
  </div>
  <p class="product-describe">
    <strong>${post.name.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</strong><br>
    ${formatLength(post.description.replace(/</g, "&lt;").replace(/>/g, "&gt;"))}
  </p>
  <input type="${post.sponsored!=='n'?"button":"hidden"}" class="learn-more" value="Learn more" onclick="window.location.href=('${post.sponsored}')"/>
  <div class="profile" data-bio="${profile.bio||''} • ${profile.skills||''}" name="${encodeURIComponent(post.name)}">
    <p>
      <img src="${profile.photo_url || post.cover || '/assets/images/default.png'}" alt="User profile" loading="lazy">
      <strong class="user-name">${profile.full_name || post.name || " "}</strong>
      <sup>${profile.status==="verified"? 
        `<svg width="14" height="14" viewBox="0 0 24 24" fill="#1DA1F2">
          <path d="M12 2C6.48 2 2 6.48 2 12s4.48 10 10 10 10-4.48 10-10S17.52 2 12 2zm-2 15l-5-5 1.41-1.41L10 14.17l7.59-7.59L19 8l-9 9z"/>
        </svg>`:""}
      </sup>
      &nbsp;<sup class="report" style="color:#f50;">Report</sup>
      <br/>
      <small style="font-size: 13px;color: var(--text-dim);">@${profile.username || ""}</small>
    </p>
  </div>
  <div class="buttons">
    <span class="star-contain">
      <button class="star" data-post-id="${post.id}" style="cursor: pointer; background: none; border: none; color: inherit;">
        <svg width="30" height="30" viewBox="0 0 24 24" fill="currentColor">
          <path d="M12 21.35l-1.45-1.32C5.4 15.36 2 12.28 2 8.5 2 5.42 4.42 3 7.5 3c1.74 0 3.41.81 4.5 2.09C13.09 3.81 14.76 3 16.5 3 19.58 3 22 5.42 22 8.5c0 3.78-3.4 6.86-8.55 11.54L12 21.35z"/>
        </svg></button><span class="star-count" data-raw-count="${post.star || 0}">
        ${post.star || 0}
      </span>
    </span>
    <span class="amount" data-price="${post.price || 0}" style="visibility:${post.sponsored!=='n'?"hidden":"visible"}">₦${fn(post.price || 0)}
      <small><b class="sales">${post.sales || 0}</b> sales</small>
    </span>
    <a name="${encodeURIComponent(post.description||'')}">
      <span class="star-contain">
        <svg width="20" height="20" viewBox="0 0 24 24" fill="currentColor">
          <path d="M18 16.08c-.76 0-1.44.3-1.96.77L8.91 12.7c.05-.23.09-.46.09-.7s-.04-.47-.09-.7l7.05-4.11c.54.5 1.25.81 2.04.81 1.66 0 3-1.34 3-3s-1.34-3-3-3-3 1.34-3 3c0 .24.04.47.09.7L8.04 9.81C7.5 9.31 6.79 9 6 9c-1.66 0-3 1.34-3 3s1.34 3 3 3c.79 0 1.5-.31 2.04-.81l7.12 4.16c-.05.21-.08.43-.08.65 0 1.61 1.31 2.92 2.92 2.92 1.61 0 2.92-1.31 2.92-2.92s-1.31-2.92-2.92-2.92z"/>
        </svg>
      </span>
    </a>
  </div>
`;

      grid.appendChild(div);

      // Setup star button
      const btn = div.querySelector("button.star");
      const starCountEl = div.querySelector(".star-count");

      div.querySelector(".star-contain").addEventListener("click",()=>{
        toggleStar(post.id, btn, starCountEl);
      })
      div.addEventListener("dblclick", ()=>{
        toggleStar(post.id, btn, starCountEl);
      })
      initStar(post.id, btn, starCountEl);
    });
    
    // Rest of your event handlers code...
    const comm = document.querySelector(".product");
    const proCard = comm.querySelectorAll(".card");
    
    proCard.forEach(card => {
      const tag = card.querySelector(".product-describe");
      if (card) {
        card.querySelector(".buttons a").addEventListener("click", (e)=>{
          navigator.clipboard.writeText(`https://devtem.org/home.html#search?q=${card.querySelector(".buttons a").name?.slice(0,70)||""}`);
          cAlert("Link copied!🎉", "success", "Copied");
        })
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
        document.querySelector(".search-loader").style.display = "flex";
        setTimeout(() => {
          const id = card.dataset.id;
          const title = card.querySelector(".product-describe strong").textContent;
          const price = parseFloat(card.querySelector(".amount").dataset.price);
          const filePath = card.dataset.filePath;
          const sales = card.dataset.sales;
          cart.push({ id, title, price, filePath, sales});
          updateCartUI();
          document.querySelector(".search-loader").style.display = "none";
          cartBox.classList.remove("collapsed");
          cartBox.style.display="block";
          icon.innerHTML ="&times;";
        }, 800);
      };
    });

 

document.querySelectorAll(".card .profile").forEach(profile => {
  profile.addEventListener("click", async (e) => {
    document.querySelector(".search-loader").style.display = "flex";
    
    const card = profile.closest(".card");
    const userId = card.dataset.profileId;
    
    try {
      // Fetch fresh profile data with additional stats
      const { data: liveProfile, error } = await supabase
        .from("profiles")
        .select("username, full_name, photo_url, bio, skills, status, created_at, portfolio_url")
        .eq("id", userId)
        .single();
      
      if (error) throw error;
      
      // Fetch user's posts count and total sales
      const { data: userPosts, error: postsError } = await supabase
        .from("posts")
        .select("id, sales, star")
        .eq("user_id", userId);
      
      const totalPosts = userPosts?.length || 0;
      const totalSales = userPosts?.reduce((sum, post) => sum + (post.sales || 0), 0) || 0;
      const avgRating = userPosts?.length > 0 
        ? (userPosts.reduce((sum, post) => sum + (post.star || 0), 0) / userPosts.length).toFixed(1)
        : 0;
      
      // Populate profile data
      const name = liveProfile.full_name || liveProfile.username;
      let bio = liveProfile.bio || "No bio available";
      bio = bio.replace(/((https?:\/\/)?(\w+\.[^\s]+))/g, "<a href='$1' target='_blank'>$1</a>");
      const img = liveProfile.photo_url || '/assets/images/default.png';
      const joinedDate = new Date(liveProfile.created_at).toLocaleDateString('en-US', { month: 'short', year: 'numeric' });

      document.getElementById("popupName").textContent = name;
      document.getElementById("popupUsername").textContent = `@${liveProfile.username}`;
      document.getElementById("popupBio").innerHTML = bio;
      document.getElementById("popupImg").src = img||"";
      
      // Status badge
      const statusBadge = document.getElementById("userStatus");
      if (liveProfile.status === "verified") {
        statusBadge.classList.add("verified");
        statusBadge.title = "Verified Creator";
      } else {
        statusBadge.classList.remove("verified");
        statusBadge.title = "Active";
      }
      
      // Stats
      document.getElementById("userPosts").textContent = totalPosts;
      document.getElementById("userSales").textContent = totalSales;
      document.getElementById("userRating").textContent = "!"||avgRating;
      
      // Additional details
      document.getElementById("joinedText").textContent = `Joined ${joinedDate}`;
      
      if (liveProfile.skills) {
        document.getElementById("userSkills").style.display = "flex";
        document.getElementById("skillsText").textContent = liveProfile.skills||"creator";
      } else {
        document.getElementById("userSkills").style.display = "none";
      }
      
      if (liveProfile.portfolio_url) {
        document.getElementById("userWebsite").style.display = "flex";
        document.getElementById("websiteLink").href = liveProfile.portfolio_url;
      } else {
        document.getElementById("userWebsite").style.display = "none";
      }
      
      // Search link
      document.getElementById("schUser").href = `#search?q=${encodeURIComponent(liveProfile.username)}`;
      document.getElementById("userToRe").value = `User reported: ${name} (@${liveProfile.username}) targeted post—{${decodeURIComponent(profile.name||"")}}`;
      
      // Show modal
      document.getElementById("userView").style.display = "flex";
      
    } catch (err) {
      console.error("Error fetching live profile:", err);
      cAlert("Error loading profile", "error", "Error");
    } finally {
      document.querySelector(".search-loader").style.display = "none";
    }
  });
});
function toggleReport() {
  const form = document.getElementById("reportForm");
  form.classList.toggle("active");
}

    const dataView = document.querySelectorAll("h4[data-view*='/']");
    dataView.forEach(view => {
      view.addEventListener("click", e => {
        const viewSrc = view.dataset.view || "/assets/images/20250918_223801.png";
        const videoBox = document.querySelector(".video-view");
        const embed = videoBox.querySelector("embed")||videoBox.querySelector(".video");
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
    
    processSearchFromURL();
    const searchFil = document.querySelector(".top-menu.main form input").value.trim();
    if(searchFil) filterCrips(searchFil.toUpperCase()); 
    
  } catch (error) {
    console.error("Error loading posts:", error);
  }
}

document.addEventListener("DOMContentLoaded", ()=>{
  loadPosts("id", false);
  document.querySelector(".top-btn.all-post").addEventListener("click", async (e)=>{
    loadPosts("id", false);
    
  })
  document.querySelector(".top-btn.latest-post").addEventListener("click", async (e) => {
  loadPosts("created_at", false)
})
document.querySelector(".top-btn.popular-post").addEventListener("click", async (e) => {
  loadPosts("sales", false)
})
})


