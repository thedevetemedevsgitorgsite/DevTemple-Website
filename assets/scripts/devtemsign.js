import{createClient}from"https://esm.sh/@supabase/supabase-js@2";const btnDr=document.getElementById("btttn");btnDr&&(window.addEventListener("scroll",(function(){window.pageYOffset>=300?btnDr.style.display="block":btnDr.style.display="none"})),btnDr.addEventListener("click",(function(){window.scrollTo({top:0,behavior:"smooth"})})));const res=await fetch("/.netlify/functions/fcnfig");const{url,key}=await res.json();
export const supabase=createClient(url,key);  


async function verifyRecaptcha() {
  const token = grecaptcha.getResponse();
  
  if (!token) {
    cAlert("❌ Please complete the reCAPTCHA", "warning", "Error");
    return false;
  }
  
  const response = await fetch('/.netlify/functions/verify-recaptcha', {
    method: 'POST',
    body: JSON.stringify({ token })
  });
  
  const result = await response.json();
  
  if (!result.success) {
    cAlert("❌ reCAPTCHA verification failed", "warning", "Error");
    return false;
  }
  
  return true;
}

// SIGNUP
document.getElementById("submitable").addEventListener("submit", async (e) => {
  e.preventDefault();
  
  // Verify reCAPTCHA first
  const isHuman = await verifyRecaptcha();
  if (!isHuman) return;
  
  const email = document.querySelector('#signEmail').value;
  const password = document.querySelector('#signPsw').value;
  const fullName = document.querySelector('#signFullName').value.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const username = document.querySelector('#signUserName')?.value.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;") 
    .replace(/>/g, "&gt;")||fullName.trim().replace(/\W+/g,"_").toLowerCase();
  const bio = document.querySelector('#signBio').value.replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");
  const skills = document.querySelector('#signSkill').value;
  const fileInput = document.querySelector('#signImg');
  
  try {
    const { data: authData, error: authError } = await supabase.auth.signUp({
      email,
      password
    });
    
    if (authError) throw authError;
    const user = authData.user;
    
    let photoURL = "https://placehold.co/100x100";
    
    if (fileInput.files.length > 0) {
      const file = fileInput.files[0];
      const filePath = `avatars/${user.id}_${Date.now()}_${file.name}`;
      
      const { error: uploadError } = await supabase.storage
        .from("avatars")
        .upload(filePath, file);
      
      if (!uploadError) {
        const { data } = supabase.storage.from("avatars").getPublicUrl(filePath);
        photoURL = data.publicUrl;
      }
    }
    
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
    
    cAlert("✅ Signup successful!", "success", "Success");
    window.location.href = "/dashboard";    
  } catch (err) {
    cAlert("❌ Error: " + err.message, "warning", "Error");
  } finally {
    grecaptcha.reset(); // Reset reCAPTCHA
  }
});

// LOGIN
document.querySelector('#haveAcct form').addEventListener("submit", async (e) => {
  e.preventDefault();
  
  // Verify reCAPTCHA first
  const isHuman = await verifyRecaptcha();
  if (!isHuman) return;
  
  const email = document.querySelector('#logEmail').value;
  const password = document.querySelector('#logPsw').value;
  
  try {
    const { error } = await supabase.auth.signInWithPassword({
      email,
      password,
    });
    
    if (error) throw error;
    
    cAlert("✅ Logged in successfully!", "success", "Logged in");
    window.location.href = "/dashboard";
  } catch (err) {
    cAlert("❌ Login failed: " + err.message, "warning", "Error");
  } finally {
    grecaptcha.reset(); // Reset reCAPTCHA
  }
});
