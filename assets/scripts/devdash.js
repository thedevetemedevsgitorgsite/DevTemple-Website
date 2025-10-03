
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const { url, key } = {url:td, key:tc};
export const supabase = createClient(url, key);

async function getUser() {
  const { data, error } = await supabase.auth.getUser();
  if (error) {
    console.error("Auth error:", error);
    return null;
  }
  return data?.user || null;
}

async function signOut() {
  await supabase.auth.signOut();
  window.location.href = "/signup.html";
}

// ========== DASHBOARD UI ==========
const sections = {
  user: document.getElementById("user-section"),
  pen: document.getElementById("pen-section"),
  sales: document.getElementById("sales-section"),
  chart: document.getElementById("chart-section"),
  posts: document.getElementById("posts-section")
};
let authBio = "creator";
let authImg = "/assets/images/default.png";
let authName = "creator";
let authSkill = "creator";
let portfolioUrl = " ";
let authFname = "creator";
let authStatus = "pending";
function showSection(name) {
  Object.values(sections).forEach(sec => sec.classList.add("hidden"));
  if (sections[name]) sections[name].classList.remove("hidden");
}

document.querySelector(".top-btn.user").onclick = () => showSection("user");
document.querySelector(".top-btn.pen").onclick = () => showSection("pen");
document.querySelector(".top-btn.sales").onclick = () => showSection("sales");
document.querySelector(".top-btn.chart").onclick = () => showSection("chart");

// ========== PROFILE ==========
async function loadProfile() {
  const user = await getUser();
  if (!user) {
    window.location.href = "/signup.html";
    return;
  }
  
  // Update account information section
  document.querySelector(".user .email").textContent = user.email;
  document.querySelector(".user .uid").textContent = user.id;
  
  // Format and set dates
  const joinDate = new Date(user.created_at).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  document.querySelector(".join-date").textContent = joinDate;
  
  const lastLogin = new Date(user.last_sign_in_at).toLocaleDateString('en-US', { 
    year: 'numeric', 
    month: 'long', 
    day: 'numeric' 
  });
  document.querySelector(".last-login").textContent = lastLogin;
  
  // Set account status
  

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  
  if (profile) {
    // Update form fields
  document.querySelector("#account-status").textContent = profile.status;
    
document.querySelector(".status").style.color =  document.querySelector("#account-status").textContent === "pending" ? "#960" : "#096";

    document.getElementById("userName").value = profile.username || "";
    document.getElementById("fullName").value = profile.full_name || "";
    document.getElementById("email").value = user.email;
    document.getElementById("phone").value = profile.phone || "";
    document.getElementById("bio").value = profile.bio || "";
    document.getElementById("skill").value = profile.skills || "";
    document.getElementById("experience").value = profile.experience_level || "";
    document.getElementById("portfolio").value = profile.portfolio_url || "";
    
    // Update profile display
    document.querySelector(".user.img").src = profile.photo_url || "/assets/images/default.png";
    document.getElementById("profileName").textContent = profile.full_name || profile.username || "User";
    document.getElementById("profileSkill").textContent = profile.skills || "No skill set";
    
    // Update auth variables
    authBio = profile.bio || "";
    authImg = profile.photo_url || "/assets/images/default.png";
    authName = profile.username || "";
    authSkill = profile.skills || "";
    authStatus = profile.status || "pending";
    authFname = profile.full_name || "";
    portfolioUrl = profile.portfolio_url || "";
    
    // Update bio character count
    updateBioCharCount();
  }
  
  // Load profile statistics
  await loadProfileStats();
}

// Bio character count
function updateBioCharCount() {
  const bioTextarea = document.getElementById("bio");
  const charCount = document.getElementById("bioCharCount");
  if (bioTextarea && charCount) {
    charCount.textContent = bioTextarea.value.length;
    bioTextarea.addEventListener("input", () => {
      charCount.textContent = bioTextarea.value.length;
    });
  }
}

// Load profile statistics
async function loadProfileStats() {
  const user = await getUser();
  if (!user) return;

  const { data: posts } = await supabase
    .from("posts")
    .select("sales, price")
    .eq("user_id", user.id);

  if (posts) {
    const uploads = posts.length;
    const totalSales = posts.reduce((sum, post) => sum + (post.sales || 0), 0);
    const totalEarnings = posts.reduce((sum, post) => sum + ((post.price || 0) * (post.sales || 0)), 0);

    document.getElementById("statUploads").textContent = uploads;
    document.getElementById("statSales").textContent = totalSales;
    document.getElementById("statEarnings").textContent = `₦${fn(totalEarnings)}`;
  }
}

// Logout button
document.getElementById("logoutBtn").onclick = signOut;

const zipInput = document.getElementById("zipInput");
const filename = document.querySelector(".file-name");

if (zipInput) {
  zipInput.onchange = () => {
    if (filename) {
      filename.textContent = zipInput.files[0]?.name || "";
    }
  };
}

// Publisher form
const publisherForm = document.getElementById("publisherForm");
if (publisherForm) {
  publisherForm.onsubmit = async (e) => {
    e.preventDefault();
    
    document.querySelector(".sending").style.display = "inline-block";
    
    const user = await getUser();
    if (!user) return alert("Please log in.");
    
    const file = zipInput.files[0];
    if (!file) return alert("Select a ZIP file");
    
    // Upload to Supabase Storage
    const { data: storageData, error: storageError } = await supabase.storage
      .from("uploads")
      .upload(`${user.id}/${file.name}`, file, { upsert: true });
    
    if (storageError) {
      console.error(storageError);
      document.querySelector(".sending").style.display = "none";
      return cAlert("Upload failed.");
    }
    
    // Insert metadata 
    const { error: dbError } = await supabase.from("posts").insert({
      user_id: user.id,
      name: document.getElementById("cardName").value.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;"),
      description: document.getElementById("cardDes").value.replace(/&/g, "&amp;")
        .replace(/</g, "&lt;")
        .replace(/>/g, "&gt;"),
      cover: document.getElementById("cardCover").value,
      viewer: document.getElementById("cardView").value,
      price: parseFloat(document.getElementById("cardAmount").value),
      file_path: storageData.path,
      star: 0,
      sales: 0,
      auth_bio: authBio, 
      auth_img: authImg, 
      auth_name: authName, 
      auth_skill: authSkill, 
      auth_status: authStatus, 
      auth_fname: authFname, 
      portfolio_url: portfolioUrl
    });
    
    if (dbError) {
      console.error(dbError);
      document.querySelector(".sending").style.display = "none";
      return cAlert("❌ Insert failed.");
    }
    
    document.querySelector(".sending").style.display = "none";
    loadPosts();
    loadProfileStats(); // Refresh stats
    cAlert("Upload successful!");
    showSection("posts");
  };
}

async function initStar(postId) {
  try {
    const { count, error: countError } = await supabase
      .from("stars")
      .select("*", { count: 'exact', head: true })
      .eq("post_id", postId);
    
    if (countError) throw countError;
    return count || 0;
  } catch (err) {
    console.error("Star init failed:", err);
    return 0;
  }
}

// ========== DELETE POST ==========
async function deletePost(post) {
  const confirmDelete = confirm(`Delete "${post.name}"? This cannot be undone.`);
  if (!confirmDelete) return;

  // Delete from storage
  if (post.file_path) {
    const { error: storageError } = await supabase.storage
      .from("uploads")
      .remove([post.file_path]);
    if (storageError) {
      console.error("Storage delete error:", storageError);
      cAlert("❌Failed to delete file from storage.");
      return;
    }
  }

  // Delete from database
  const { error: dbError } = await supabase
    .from("posts")
    .delete()
    .eq("id", post.id);

  if (dbError) {
    console.error("DB delete error:", dbError);
    cAlert("❌Failed to delete post from Database.");
    return;
  }

  cAlert("Post deleted!");
  loadPosts();
  loadProfileStats(); // Refresh stats
}

// ========== SALES & POSTS ==========
async function loadPosts() {
  try {
    const user = await getUser();
    if (!user) {
      console.warn("No logged-in user found.");
      return;
    }
    
    const { data, error } = await supabase
      .from("posts")
      .select("id, name, description, price, cover, auth_bio, auth_img, auth_name, star, sales, auth_skill, portfolio_url, auth_fname, auth_status")
      .eq("user_id", user.id)
      .order("id", { ascending: false });
    
    if (error) throw error;
    
    const grid = document.querySelector(".product-grid");
    if (!grid) return;
    
    grid.innerHTML = "";
    
    if (!data || data.length === 0) {
      grid.innerHTML = `<p class="empty-msg">You haven't uploaded any posts yet.</p>`;
      return;
    }
    
    data.forEach(post => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
        <div class="product-img" style="background-image: url(${post.cover || "/assets/images/index.png"});">
          <h3 class="delete-btn"><i class="fas fa-times"></i></h3>
          <a href="/home.html#search?q=${encodeURIComponent(post.description)}"><h4 data-view="${post.viewer || 'https://media.tenor.com/aGgnqxZUzeUAAAAM/sad.gif'}"><i class="fas fa-eye"></i></h4></a>
        </div>
        <p class="product-describe">
          <strong>${post.name.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</strong>
          <br>
          ${post.description.replace(/</g, "&lt;").replace(/>/g, "&gt;")}
        </p>
        <div class="profile" data-bio="${post.auth_bio||''} • ${post.auth_skill||''}">
          <p><img src="${post.auth_img||post.cover||'/assets/images/default.png'}" alt="User_auth-profile">
          <strong class="user-name">@${post.auth_name?post.auth_name:post.name.replace(/</g, "&lt;").replace(/>/g, "&gt;")}</strong></p>
        </div>
        <div class="buttons">
          <span class="star-contain"><span class="star-count">_</span></span> stars
          <span class="amount" data-price="${post.price||0}">₦${fn(post.price||0)} <small><b class="sales">${post.sales? post.sales:0}</b> sales</small></span>
          <a href="/home.html#search?q=${encodeURIComponent(post.name)}"><span class="star-contain"><i class="fas fa-search"></i> </span></a>
        </div>
      `;
      //`
      div.querySelector(".delete-btn").onclick = () => deletePost(post);
      grid.appendChild(div);
    });
  } catch (error) {
    console.error("Error loading posts:", error);
  }
}

// Profile form submission
const profileForm = document.querySelector('form[name="user edit"]');
if (profileForm) {
  profileForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    
    const username = profileForm.querySelector(".username").value.replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").trim();
    const fullName = document.getElementById("fullName").value.replace(/&/g, "&amp;")
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").trim();
    const bio = profileForm.querySelector(".bio").value.replace(/&/g, "&amp;") 
      .replace(/</g, "&lt;")
      .replace(/>/g, "&gt;").trim();
    const skill = profileForm.querySelector(".skill").value;
    const phone = document.getElementById("phone").value;
    const experience = document.getElementById("experience").value;
    const portfolio = document.getElementById("portfolio").value;
    const photoFile = document.getElementById("imgUrl").files[0];
    
    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError || !user) throw new Error("Not logged in");
      
      let photoUrl = null;
      
      if (photoFile) {
        const fileExt = photoFile.name.split('.').pop();
        const fileName = `avatars/${user.id}.${fileExt}`;
        
        const { error: uploadError } = await supabase.storage
          .from("avatars")
          .upload(fileName, photoFile, { upsert: true });
        
        if (uploadError) throw uploadError;
        
        const { data: publicUrl } = supabase.storage
          .from("avatars")
          .getPublicUrl(fileName);
        
        photoUrl = publicUrl.publicUrl;
      }
      
      const { error: updateError } = await supabase
        .from("profiles")
        .update({
          username,
          full_name: fullName,
          bio,
          skills: skill,
          phone,
          portfolio_url: portfolio,
          ...(photoUrl && { photo_url: photoUrl })
        })
        .eq("id", user.id);
      
      if (updateError) throw updateError;
      
      cAlert("✅ Profile updated!");
      loadProfile(); // Reload to show updated data
    } catch (err) {
      console.error("Profile update error:", err.message);
      cAlert("❌ Error updating profile: " + err.message);
    }
  });
}

// Notification preferences form
const notificationForm = document.getElementById("notificationForm");
if (notificationForm) {
  notificationForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    // Save notification preferences logic here
    cAlert("Notification preferences saved!");
  });
}

async function loadSalesSummary() {
  const user = await getUser();
  if (!user) return;

  try {
    const { data, error } = await supabase
      .from("posts")
      .select("id, price, sales, name")
      .eq("user_id", user.id);

    if (error) {
      console.error("Sales summary error:", error);
      return;
    }

    if (!data || data.length === 0) {
      const salesStats = document.querySelector(".sales-stats");
      if (salesStats) {
        salesStats.innerHTML = "<p>No products uploaded yet.</p>";
      }
      return;
    }

    let totalSales = 0;
    let unitsSold = 0;

    data.forEach(post => {
      const postSales = post.sales || 0;
      const postPrice = post.price || 0;
      totalSales += postPrice * postSales;
      unitsSold += postSales;
    });

    const availableBalance = await getAvailableBalance();

    const salesStats = document.querySelector(".sales-stats");
    if (salesStats) {
      salesStats.innerHTML = `
        <div class="card">Total Sales Value: <strong>₦${fn(totalSales.toFixed(2))}</strong></div>
        <div class="card">Units Sold: <strong>${fn(unitsSold)}</strong></div>
        <div class="card">Products Listed: <strong>${data.length}</strong></div>
        <div class="card">Available Balance: <strong>₦${fn(availableBalance.toFixed(2))}</strong></div>
        ${availableBalance > 0 ? `
          <div class="card" style="border-color: #0a6;">
            <small>You can withdraw up to ₦${fn(availableBalance.toFixed(2))}</small>
          </div>
        ` : ''}
      `;
    }
    
    // Update summary elements if they exist
    const summarySales = document.getElementById("summary-sales");
    const summaryEarnings = document.getElementById("summary-earnings");
    if (summarySales) summarySales.textContent = "₦"+fn(totalSales||0);
    if (summaryEarnings) summaryEarnings.textContent = "₦"+fn(availableBalance);
  } catch (error) {
    console.error("Error in loadSalesSummary:", error);
    const salesStats = document.querySelector(".sales-stats");
    if (salesStats) {
      salesStats.innerHTML = "<p>Error loading sales data</p>";
    }
  }
}

async function loadSalesChart() {
  const user = await getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("posts")
    .select("id, name, sales, star")
    .eq("user_id", user.id);
    
  if (error) {
    console.error("Chart load error:", error);
    return;
  }

  const starData = await Promise.all(
    data.map(p => initStar(p.id))
  );

  const ctx = document.getElementById("salesChart");
  if (!ctx) return;
  
  const canvasCtx = ctx.getContext("2d");
  if (window.myChart) window.myChart.destroy();

  window.myChart = new Chart(canvasCtx, {
    type: "bar",
    data: {
      labels: data.map(p => p.name),
      datasets: [
        {
          label: "Sales",
          data: data.map(p => p.sales || 0),
          backgroundColor: "rgba(54, 162, 235, 0.6)"
        },
        {
          label: "Stars",
          data: starData,
          backgroundColor: "rgba(255, 206, 86, 0.6)"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

async function renderPerformanceChart() {
  const user = await getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("posts")
    .select("id, name, sales, star")
    .eq("user_id", user.id);

  if (error) {
    console.error("Chart load error:", error);
    return;
  }

  const stars = await Promise.all(
    data.map(post => initStar(post.id))
  );

  const names = data.map(post => post.name);
  const sales = data.map(post => post.sales || 0);

  const ctx = document.getElementById("salesChart");
  if (!ctx) return;
  
  const canvasCtx = ctx.getContext("2d");
  if (window.performanceChart) window.performanceChart.destroy();

  window.performanceChart = new Chart(canvasCtx, {
    type: "bar",
    data: {
      labels: names,
      datasets: [
        {
          label: "Sales",
          data: sales,
          backgroundColor: "rgba(54, 162, 235, 0.6)"
        },
        {
          label: "Stars",
          data: stars,
          backgroundColor: "rgba(255, 206, 86, 0.6)"
        }
      ]
    },
    options: {
      responsive: true,
      plugins: { legend: { position: "top" } },
      scales: { y: { beginAtZero: true } }
    }
  });
}

async function getAvailableBalance() {
  const user = await getUser();
  if (!user) return 0;

  try {
    const { data: postsData, error: postsEarnError } = await supabase
      .from("posts")
      .select("price, sales")
      .eq("user_id", user.id);
      
    if (postsEarnError) {
      console.error("Error loading posts data for earnings:", postsEarnError);
      return 0;
    }
    
    const totalEarnings = postsData.reduce((sum, post) => {
      const postSales = post.sales || 0;
      const postPrice = post.price || 0;
      const grossRevenue = postPrice * postSales;
      const netEarnings = grossRevenue * 0.7;
      return sum + netEarnings;
    }, 0);

    const { data: withdraws, error: wdError } = await supabase
      .from("withdraw_requests")
      .select("amount, status")
      .eq("user_id", user.id)
      .in("status", ["approved", "paid"]);

    if (wdError) {
      console.error("Error loading withdraws:", wdError);
      return 0;
    }

    const totalWithdrawn = withdraws.reduce((sum, w) => sum + (w.amount || 0), 0);
    const availableBalance = totalEarnings - totalWithdrawn;

    return Math.max(availableBalance, 0);
  } catch (error) {
    console.error("Error in getAvailableBalance:", error);
    return 0;
  }
}

async function requestWithdraw(amount, bankDetails) {
  const user = await getUser();
  if (!user) return;

  const balance = await getAvailableBalance();
  if (amount > balance) {
    return cAlert(`❌ You can only withdraw up to ₦${balance.toFixed(2)}`);
  }

  const { error } = await supabase.from("withdraw_requests").insert({
    user_id: user.id,
    amount,
    bank_details: bankDetails,
    status: "pending"
  });

  if (error) {
    console.error("Withdraw request failed:", error);
    cAlert("Withdraw request failed. Please try again.");
    return;
  }

  cAlert("✅ Withdraw request submitted for review!");
  document.getElementById("withdrawForm").reset();
}

// Withdraw request
const withdrawForm = document.getElementById("withdrawForm");
if (withdrawForm) {
  withdrawForm.addEventListener("submit", async (e) => {
    e.preventDefault();
    const amount = parseFloat(document.getElementById("requestAmt").value);
    const bankDetails = document.getElementById("bankDetails").value;
    
    if (!bankDetails) {
      cAlert("Please provide your bank details.");
      return;
    }
    
    await requestWithdraw(amount, bankDetails);
  });
}

// Delete account
const deleteAccountBtn = document.getElementById("deleteAccountBtn");
if (deleteAccountBtn) {
  deleteAccountBtn.addEventListener("click", async () => {
    const confirmDelete = confirm("Are you sure you want to delete your account? This action cannot be undone.");
    if (!confirmDelete) return;

    try {
      const { data: { user }, error: userError } = await supabase.auth.getUser();
      if (userError) throw userError;
      if (!user) throw new Error("No user found. Please log in again.");

      const userId = user.id;

      const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);
      if (profileError) throw profileError;

      const res = await fetch("/.netlify/functions/deleteUser", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ user_id: userId }),
      });

      const result = await res.json();
      if (!res.ok) throw new Error(result.message);

      cAlert("✅ Account deleted successfully.");
      window.location.href = "/";
    } catch (err) {
      cAlert("❌ Error deleting account: " + err.message);
    }
  });
}

// Utility function for number formatting
window.fn = function fn(fng) {
  return fng.toLocaleString("en-US", { minimumFractionDigits: 2, maximumFractionDigits: 2 });
}

// ========== INIT ==========
window.addEventListener("DOMContentLoaded", () => {
  loadProfile();
  loadPosts();
  loadSalesSummary();
  loadSalesChart();
  renderPerformanceChart();
});
