
  import { createClient } from "https://esm.sh/@supabase/supabase-js@2";


const res = await fetch("/.netlify/functions/fcnfig");
const { url, key } = await res.json();

export const supabase = createClient(url, key);
document.getElementById("submitable").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const email = document.querySelector('#signEmail').value;
  const password = document.querySelector('#signPsw').value;
  const username = document.querySelector('#signUserName').value.replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");
  const bio = document.querySelector('#signBio').value.replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");
  const skills = document.querySelector('#signSkill').value;
  const fullName = document.querySelector('#signFullName').value.replace(/&/g, "&amp;")
  .replace(/</g, "&lt;")
  .replace(/>/g, "&gt;");
  const fileInput = document.querySelector('#signImg'); // file input (type="file")
  
  try {
    // 1. Create user in Supabase Auth
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (authError) throw authError;
    const user = authData.user;
    
    let photoURL = "https://placehold.co/100x100"; // fallback
    
    // 2. Upload profile image if selected
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const filePath = `avatars/${user.id}_${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);
      
      if (uploadError) {
        console.error("Upload failed:", uploadError.message);
      } else {
        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        photoURL = data.publicUrl;
      }
    }
    
    // 3. Insert profile into "profiles" table
    const { error: dbError } = await supabase.from("profiles").insert([{
      id: user.id,
      username,
      full_name: fullName,
      bio,
      skills,
      email,
      photo_url: photoURL,
      created_at: new Date()
    }]);
    
    if (dbError) throw dbError;
    
    cAlert("✅ Signup successful!");
window.location.href = "/dashboard";    
  } catch (err) {
    cAlert("❌ Error: " + err.message);
  }
});

  document.querySelector('#haveAcct form').addEventListener("submit", async (e) => {
  e.preventDefault();
  
  const email = document.querySelector('#logEmail').value;
  const password = document.querySelector('#logPsw').value;
  
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    cAlert("✅ Logged in successfully!");
    window.location.href = "/dashboard";
  } catch (err) {
    cAlert("❌ Login failed: " + err.message);
  }
});

  
