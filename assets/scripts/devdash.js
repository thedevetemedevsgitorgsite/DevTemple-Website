import { createClient } from "https://esm.sh/@supabase/supabase-js@2";

const resSul = await fetch("/.netlify/functions/fcnfig");
const { url, key } = await resSul.json();


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
    <span class="amount" data-price="${post.price||0}">$${post.price||0} <small><b class="sales">${post.sales? post.sales:0}</b> sales</small></span>
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

  const { data, error } = await supabase
    .from("posts")
    .select("price, sales")
    .eq("user_id", user.id);

  if (error) {
    console.error("Sales summary error:", error);
    return;
  }

  if (!data || data.length === 0) {
    document.querySelector(".sales-stats").innerHTML = "<p>No sales yet.</p>";
    return;
  }

  let totalSales = 0;
  let unitsSold = 0;

  data.forEach(post => {
    totalSales += (post.price || 0) * (post.sales || 0);
    unitsSold += post.sales || 0;
  });

  document.querySelector(".sales-stats").innerHTML = `
    <div class="card">Total Sales: <strong>$${totalSales.toFixed(2)}</strong></div>
    <div class="card">Units Sold: <strong>${unitsSold}</strong></div>
    <div class="card">Products: <strong>${data.length}</strong></div>
    <div class="card">
    Available balance: 
    <strong>${await getAvailableBalance()}</strong></div>
  `;
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

  // Total earnings from transactions
  const { data: txData, error: txError } = await supabase
    .from("transactions")
    .select("creator_earnings")
    .eq("user_id", user.id);

  if (txError) {
    console.error("Error loading transactions:", txError);
    return 0;
  }
  const totalEarnings = txData.reduce((sum, t) => sum + t.creator_earnings, 0);

  // Total already paid out
  const { data: withdraws, error: wdError } = await supabase
    .from("withdraw_requests")
    .select("amount, status")
    .eq("user_id", user.id)
    .in("status", ["approved", "paid"]); // only count approved/paid

  if (wdError) {
    console.error("Error loading withdraws:", wdError);
    return 0;
  }
  const totalWithdrawn = withdraws.reduce((sum, w) => sum + w.amount, 0);

  return totalEarnings - totalWithdrawn||0;
}

async function requestWithdraw(amount) {
  const user = await getUser();
  if (!user) return;
  
  const balance = await getAvailableBalance();
  if (amount > balance) {
    return alert(`❌ You can only withdraw up to $${balance.toFixed(2)}`);
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

document.getElementById("withdrawForm").addEventListener("submit", async (e)=>{
  e.preventDefault()
  await requestWithdraw(document.querySelector("#requestAmt").value);
  
})

document.getElementById("delete-account").addEventListener("click", async () => {
  if (!confirm("⚠️ This will permanently delete your account and posts. Continue?")) {
    return;
  }

  const user = (await supabase.auth.getUser()).data.user;
  if (!user) {
    alert("No user logged in");
    return;
  }

  try {
    // 1. Delete posts (optional – remove if you want to keep them)
    const { error: postsError } = await supabase
      .from("posts")
      .delete()
      .eq("user_id", user.id);
    if (postsError) console.error("Post delete error:", postsError);

    // 2. Delete profile
    const { error: profileError } = await supabase
      .from("profiles")
      .delete()
      .eq("id", user.id);
    if (profileError) console.error("Profile delete error:", profileError);

    
    const resS = await fetch("/.netlify/functions/deleteUser", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ uid: user.id })
    });

    if (!resS.ok) throw new Error("Auth delete failed");

    alert("✅ Account deleted successfully.");
    window.location.href = "/"; // redirect to homepage
  } catch (err) {
    console.error("Delete error:", err.message);
    alert("❌ Error deleting account: " + err.message);
  }
});

// ========== INIT ==========
window.addEventListener("DOMContentLoaded", () => {
loadPosts();
  loadProfile();
  loadPosts();
  loadSalesSummary();
  loadSalesChart();
  renderPerformanceChart();
  const dataView = document.querySelectorAll("h4[data-view]");
dataView.forEach(view=>{
    view.addEventListener("click", e=>{
    const viewSrc = view.dataset.view||"/assets/images/20250918_223801.png";
    const videoBox = document.querySelector(".video-view");
    const embed = videoBox.querySelector("embed");
    embed.src=viewSrc;
    videoBox.style.display="block";
    embed.style.display='none';
    document.getElementById("embedLoader").style.display='block';
    embed.onload=function(){
        document.getElementById("embedLoader").style.display='none';
        embed.style.display='block';
    }
    })
})

});

