(async () => {
  // Import Supabase
  import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

  let supabase;
  
  try {
    // Initialize Supabase client
    const jres = await fetch("/.netlify/functions/fcnfig");
    const config = await jres.json();
    
    if (!config.url || !config.key) {
      throw new Error("Invalid configuration from Netlify function");
    }
    
    supabase = createClient(config.url, config.key);
    console.log("Supabase client initialized successfully");
  } catch (error) {
    console.error("Failed to initialize Supabase:", error);
    // Fallback: You might want to handle this gracefully
    return;
  }

  // Your existing helper functions
  window.fn = function fn(fng) {
    return fng.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
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

  async function getUser() {
    try {
      const { data, error } = await supabase.auth.getUser();
      if (error) {
        console.error("Auth error:", error);
        return null;
      }
      return data?.user || null;
    } catch (error) {
      console.error("Get user error:", error);
      return null;
    }
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
      btn.style.background = "#ddd";
    } else {
      // Add star
      await supabase.from("stars").insert({
        user_id: userId,
        post_id: postId,
      });
      btn.style.background = "gold";
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
    cAlert("Could not update star, try again.");
  }
}

async function initStar(postId, btn, starCountEl) {
  const user = await getUser();
  
  // Set default color
  btn.style.background = "#ddd";
  
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
        btn.style.background = "gold";
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
        alert("Email is required for payment");
        return;
      }
      
      if (!email.includes('@') || !email.includes('.')) {
        resetCheckoutButton(checkoutBtn, originalText);
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
          filePath: item.filePath,
          sales: item.sales || 0
        }))
      })
    });

    const data = await res.json();
    console.log("Checkout response:", data);

    if (!res.ok || data.error) {
      let errorMessage = data.error || "Payment initialization failed";
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
      alert("Payment window closed. You can complete the payment later.");
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
    cAlert("❌ Checkout failed: " + error.message);
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
      cAlert("✅ Payment successful! Your downloads are ready.");
      
      // Clear cart
      cart.length = 0;
      updateCartUI();
      
      // Show download links
      showDownloadLinks(verifyData.downloadLinks);
    } else {
      cAlert("❌ Payment verification failed: " + (verifyData.error || "Unknown error"));
    }
  } catch (verifyError) {
    console.error("Verification error:", verifyError);
    cAlert("❌ Could not verify payment. Please contact support with reference: " + reference);
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
      cAlert("✅ Payment verified! Your downloads are ready.");
      showDownloadLinks(verifyData.downloadLinks);
      
      // Clear cart
      cart.length = 0;
      updateCartUI();
      
      // Clean URL
      window.history.replaceState({}, document.title, window.location.pathname);
    } else {
      cAlert("❌ Payment verification failed: " + verifyData.error);
    }
  } catch (error) {
    console.error("Verification error:", error);
    cAlert("❌ Could not verify payment. Please contact support.");
  }
    } 
  
  
  async function loadPosts() {
    try {
      console.log("Starting to load posts...");
      
      const user = await getUser();
      
      if (!user) {
        console.warn("No logged-in user found.");
        document.querySelector(".product").innerHTML = `
          <div class="card">
            <div class="product-img" style="background-image: url(https://media.tenor.com/2yKn3g52FdgAAAAM/login-required-access-denied-gen-v.gif);">
              <h3><i class="fas fa-shopping-cart"></i></h3>
              <h4 data-view="https://media.tenor.com/J3_7mEynzQIAAAAM/ganz.gif"><I class="fas fa-eye"></I></h4>
            </div>
            <p class="product-describe">
              <strong><a href="/signup.html">Sign up/Login</a></strong>
              <br>
            </p>
            <div class="profile" data-name="@DevTemple" data-bio="Official DevTemple •🦺">
              <p><img src="/assets/images/20250918_223801.png" alt="User-profile">
              <strong class="user-name">@DevTemple<I class="fas fa-verify"></I></strong> &nbsp; <sup class="report" style="color:#f50;">Report</sup></p>
            </div>
            <div class="buttons">
              <span class="star-contain"><button class="star"></button><span class="star-count">_</span>
              </span><span class="amount" data-price="37.05">_ <small><b class="sales">_</b> sales</small></span>
              <a><span class="star-contain"><i class="fas fa-search"></i> </span></a>
            </div>
          </div>
        `;
        return;
      }
      
      console.log("Current user ID:", user.id);
      
      // Test the Supabase connection first
      const { data: testData, error: testError } = await supabase
        .from('posts')
        .select('id')
        .limit(1);
        
      if (testError) {
        console.error("Supabase connection test failed:", testError);
        throw testError;
      }
      
      console.log("Supabase connection test successful");
      
      const { data, error } = await supabase
        .from("posts")
        .select("id, name, description, price, cover, auth_bio, auth_img, auth_name, star, sales, auth_skill, file_path, viewer, user_id, portfolio_url, auth_fname, auth_status")
        .order("id", { ascending: false });
      
      if (error) {
        console.error("Error fetching posts:", error);
        throw error;
      }
      
      console.log("Posts fetched successfully:", data?.length || 0);
      
      const grid = document.querySelector(".product");
      if (!grid) {
        console.error("Product grid element not found");
        return;
      }
      
      grid.innerHTML = "";
      
      if (!data || data.length === 0) {
        grid.innerHTML = `<p class="empty-msg">No posts found.</p>`;
        return;
      }
      
      // Render posts
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
              <strong class="user-name"> ${post.auth_fname || post.name||" "}</strong><sup>${post.auth_status==="verified"? "<i class='fas fa-check-circle' style='color:#1DA1F2;'></i>":""||""}</sup>
              &nbsp;<sup class="report" style="color:#f50;">Report</sup>
              <br/>
              <small style="font-size: 13px;color: var(--text-dim);">@${post.auth_name || ""}</small>
            </p>
          </div>
          <div class="buttons">
            <span class="star-contain">
              <button class="star" data-post-id="${post.id}" style="cursor: pointer;"></button>
              <span class="star-count" data-raw-count="${post.star || 0}">
                ${post.star || 0}
              </span>
            </span>
            <span class="amount" data-price="${post.price || 0}">₦${fn(post.price || 0)}
              <small><b class="sales">${post.sales || 0}</b> sales</small>
            </span>
            <a href="/home.html#search?q=${encodeURIComponent(post.name)}"><span class="star-contain"><i class="fas fa-search"></i></span></a>
          </div>
        `;

        grid.appendChild(div);

        // Initialize star functionality
        const btn = div.querySelector("button.star");
        const starCountEl = div.querySelector(".star-count");

        div.querySelector(".star-contain").addEventListener("click", () => {
          toggleStar(post.id, btn, starCountEl);
        });
        
        div.addEventListener("dblclick", () => {
          toggleStar(post.id, btn, starCountEl);
        });
        
        initStar(post.id, btn, starCountEl);
      });

      // Initialize other functionality
      initFor();
      setupCardInteractions();
      
    } catch (error) {
      console.error("Error loading posts:", error);
      const grid = document.querySelector(".product");
      if (grid) {
        grid.innerHTML = `<p class="error-msg">Failed to load posts: ${error.message}</p>`;
      }
    }
  }

  function setupCardInteractions() {
    const comm = document.querySelector(".product");
    if (!comm) return;

    // Your existing card interaction setup code
    const proCard = comm.querySelectorAll(".card");
    
    proCard.forEach(card => {
      const tag = card.querySelector(".product-describe");
      if (card && tag) {
        card.querySelector(".buttons a").href = `#search?q=${encodeURIComponent(tag.textContent.match(/#[\w-]+/) || '')}`;
        tag.innerHTML = tag.innerHTML.replace(/\#([\w\-]+)/g, "<a href='#search?q=$1' class='card-tag'>#$1</a>");
        tag.querySelectorAll(".card-tag").forEach(ctag => {
          ctag.style.cssText = `color: var(--primary-color);
            font-family: "ADLaM Display", monospace;
            text-decoration: none;`;
        });
      }
    });

    // Add to cart functionality
    comm.querySelectorAll(".card").forEach(card => {
      const addBtn = card.querySelector(".product-img h3");
      if (addBtn) {
        addBtn.style.cursor = "pointer";
        addBtn.onclick = () => {
          document.querySelector(".search-loader").style.display = "flex";
          setTimeout(() => {
            const id = card.dataset.id;
            const title = card.querySelector(".product-describe strong").textContent;
            const price = parseFloat(card.querySelector(".amount").dataset.price);
            const filePath = card.dataset.filePath;
            
            cart.push({ 
              id, 
              title, 
              price, 
              filePath 
            });
            updateCartUI();
            document.querySelector(".search-loader").style.display = "none";
          }, 1200);
        };
      }
    });

    // Profile click handlers
    document.querySelectorAll(".card .profile").forEach(profile => {
      profile.addEventListener("click", () => {
        document.querySelector(".search-loader").style.display = "flex";
        setTimeout(() => {
          const name = profile.querySelector(".user-name").textContent;
          let bio = profile.dataset.bio;
          bio = bio.replace(/((https?:\/\/)?(\w+\.[^\s]+))/g, "<a href='$1'>$1</a>");
          const img = profile.querySelector("img").src;

          document.getElementById("popupName").textContent = name;
          document.getElementById("schUser").href = `#search?q=${encodeURIComponent(name)}`;
          document.getElementById("userToRe").value = `User reported: ${name}`;
          document.getElementById("popupBio").innerHTML = bio;
          document.getElementById("popupImg").src = img;
          
          document.getElementById("userView").style.display = "block";
          document.querySelector(".search-loader").style.display = "none";
        }, 1500);
      });
    });

    // Data view handlers
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
      });
    });
  }

  // Initialize when DOM is ready
  document.addEventListener("DOMContentLoaded", () => {
    
    loadPosts();
  });

})();
