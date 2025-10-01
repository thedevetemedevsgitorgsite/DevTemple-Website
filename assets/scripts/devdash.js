
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
  window.location.href = "/signup.html"; // redirect to login
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
let authImg  ="/assets/images/default.png";
let authName = "creator";
let authSkill  = "creator"; 

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
  
  document.querySelector(".user .email").textContent = user.email;
  document.querySelector(".user  .uid").textContent = user.id;
  

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("id", user.id)
    .single();
  
  if (profile) {
    document.getElementById("userName").value = profile.username || "";
    document.getElementById("bio").value = profile.bio || "";
    document.getElementById("skill").value = profile.skills || "";
    document.querySelector(".user.img").src = profile.photo_url || "/assets/images/default.png";
    authBio = profile.bio ||"";
    authImg = profile.photo_url||"/assets/images/default.png";
    authName = profile.username || "";
    authSkill = profile.skills || "";
  }
}

document.querySelector(".user-btn.logout").onclick = signOut;

const zipInput = document.getElementById("zipInput");
const filename = document.querySelector(".file-name");

zipInput.onchange = () => {
  filename.textContent = zipInput.files[0]?.name || "";
};

document.getElementById("publisherForm").onsubmit = async (e) => {
  e.preventDefault();
  
  document.querySelector(".sending").style.display="inline-block";
  
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
    return alert("Upload failed.");
    document.querySelector(".sending").style.display="none";
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
    auth_skill: authSkill
  });
  
  if (dbError) {
    console.error(dbError);
    return sendAlert("Database insert failed.", "#d00");
    document.querySelector(".sending").style.display="none";
  }
  document.querySelector(".sending").style.display="none";
  loadPosts();
  sendAlert("Upload successful!");
  showSection("posts");
};

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
      sendAlert("Failed to delete file from storage.", '#d00');
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
    alert("Failed to delete post from database.");
    return;
  }

  alert("Post deleted!");
  loadPosts();
}

// ========== SALES & POSTS ==========
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
      .select("id, name, description, price, cover, auth_bio,  auth_img, auth_name, star, sales, auth_skill")
      .eq("user_id", user.id) 
      .order("id", { ascending: false }); // newest first
    
    if (error) {
      throw error;
    }
    
    const grid = document.querySelector(".product-grid");
    grid.innerHTML = "";
    
    if (!data || data.length === 0) {
      grid.innerHTML = `<p class="empty-msg">You haven’t uploaded any posts yet.</p>`;
      return;
    }
    
    data.forEach(post => {
      const div = document.createElement("div");
      div.className = "card";
      div.innerHTML = `
      <div class="product-img" style="background-image: url(${post.cover || "/assets/images/index.png"});">
        <h3 class="delete-btn"><i class="fas fa-times"></i></h3>
        <a href="/home.html#search?q=${encodeURIComponent(post.description)}"><h4 data-view="${post.viewer || 'https://media.tenor.com/aGgnqxZUzeUAAAAM/sad.gif'}"><I class="fas fa-eye"></I></h4></a>
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
        <span class="star-contain"><span class="star-count">${post.star? post.star:0}</span></span> stars
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

const profileForm = document.querySelector('form[name="user edit"]');

profileForm.addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const username = profileForm.querySelector(".username").value.replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").trim();
  const bio = profileForm.querySelector(".bio").value.replace(/&/g, "&amp;") 
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;").trim();
  const skill = profileForm.querySelector(".skill").value;
  const photoFile = profileForm.querySelector("#imgUrl").files[0];
  
  try {
    // 1. Get current logged-in user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError || !user) throw new Error("Not logged in");
    
    let photoUrl = null;
    
    // 2. If new photo uploaded, push to storage
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
    
    // 3. Update profile table
    const { error: updateError } = await supabase
      .from("profiles")
      .update({
        username,
        bio,
        skills: skill,
        ...(photoUrl && { photo_url: photoUrl })
      })
      .eq("id", user.id);
    
    if (updateError) throw updateError;
    
    sendAlert("✅ Profile updated!");
    loadProfile();
  } catch (err) {
    console.error("Profile update error:", err.message);
    sendAlert("❌ Error updating profile: " + err.message, "#d00");
  }
});

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

    console.log("User posts data:", data);

    if (!data || data.length === 0) {
      document.querySelector(".sales-stats").innerHTML = "<p>No products uploaded yet.</p>";
      return;
    }

    let totalSales = 0;
    let unitsSold = 0;

    data.forEach(post => {
      const postSales = post.sales || 0;
      const postPrice = post.price || 0;
      totalSales += postPrice * postSales;
      unitsSold += postSales;
      
      console.log(`Post: ${post.name}, Price: ${postPrice}, Sales: ${postSales}`);
    });

    const availableBalance = await getAvailableBalance();

    document.querySelector(".sales-stats").innerHTML = `
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
    document.getElementById("summary-sales").textContent = "₦"+fn(totalSales||0);
    document.getElementById("summary-earnings").textContent = "₦"+fn(availableBalance);
  } catch (error) {
    console.error("Error in loadSalesSummary:", error);
    document.querySelector(".sales-stats").innerHTML = "<p>Error loading sales data</p>";
  }
}
async function loadSalesChart() {
  const user = await getUser();
  if (!user) return;

  const { data, error } = await supabase
    .from("posts")
    .select("name, sales, star")
    .eq("user_id", user.id);

  if (error) {
    console.error("Chart load error:", error);
    return;
  }

  const ctx = document.getElementById("salesChart").getContext("2d");
  if (window.myChart) window.myChart.destroy(); // destroy old chart if any

  window.myChart = new Chart(ctx, {
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
          data: data.map(p => p.star || 0),
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
    .select("name, sales, star")
    .eq("user_id", user.id);

  if (error) {
    console.error("Chart load error:", error);
    return;
  }

  // Prepare arrays
  const names = data.map(post => post.name);
  const sales = data.map(post => post.sales || 0);
  const stars = data.map(post => post.star || 0);

  const ctx = document.getElementById("salesChart").getContext("2d");
  if (window.performanceChart) window.performanceChart.destroy();

  window.performanceChart = new Chart(ctx, {
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
    
    // 3. Final Calculation
    const availableBalance = totalEarnings - totalWithdrawn;
    
    console.log("Balance Calculation:", {
      totalEarnings,
      totalWithdrawn,
      availableBalance,
      earningsCount: postsData?.length || 0,
      withdrawsCount: withdraws?.length || 0
    });

    return Math.max(availableBalance, 0); // Ensure non-negative

  } catch (error) {
    console.error("Error in getAvailableBalance:", error);
    return 0;
  }
}



async function requestWithdraw(amount) {
  const user = await getUser();
  if (!user) return;

  const balance = await getAvailableBalance();
  if (amount > balance) {
    return alert(`❌ You can only withdraw up to ₦${balance.toFixed(2)}`);
  }

  const { error } = await supabase.from("withdraw_requests").insert({
    user_id: user.id,
    amount,
    status: "pending"
  });

  if (error) {
    console.error("Withdraw request failed:", error);
    return;
  }

  alert("✅ Withdraw request submitted for review!");
}

    // Withdraw request
document.getElementById("withdrawForm").addEventListener("submit", async (e) => {
  e.preventDefault();
  const amt = document.getElementById("requestAmt").value;
  await requestWithdraw(amt);
});

  

// Delete account
document.getElementById("deleteAccountBtn").addEventListener("click", async () => {
  const confirmDelete = confirm("Are you sure you want to delete your account? This action cannot be undone.");
  if (!confirmDelete) return;

  try {
    // 1. Get current session user
    const { data: { user }, error: userError } = await supabase.auth.getUser();
    if (userError) throw userError;
    if (!user) throw new Error("No user found. Please log in again.");

    const userId = user.id;

    // 2. Delete from profiles table (optional: also delete their posts)
    const { error: profileError } = await supabase.from("profiles").delete().eq("id", userId);
    if (profileError) throw profileError;

    const res = await fetch("/.netlify/functions/deleteUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ user_id: userId }),
    });

    const result = await res.json();
    if (!res.ok) throw new Error(result.message);

    alert("✅ Account deleted successfully.");
    window.location.href = "/"; // redirect after deletion
  } catch (err) {
    alert("❌ Error deleting account: " + err.message);
  }
      
});



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
