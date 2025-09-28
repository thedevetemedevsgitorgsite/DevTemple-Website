
  
  
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth, createUserWithEmailAndPassword, updateProfile, signInWithEmailAndPassword } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore, collection, updateDoc, doc, addDoc, setDoc } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const res = await fetch("/.netlify/functions/fcnfig");
const config = await res.json();


const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);

  document.getElementById("submitable").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.querySelector('#signEmail').value;
    const password = document.querySelector('#signPsw').value;
    const username = document.querySelector('#signUserName').value;
    const bio = document.querySelector('#signBio').value;
    const skills = document.querySelector('#signSkill').value;
    const fullName = document.querySelector('#signFullName').value;
    const photoURL = document.querySelector('#signImg').value || "https://encrypted-tbn0.gstatic.com/images?q=tbn:ANd9GcT_bGUA_VzLBi52TYDKoEKj-kGTaYbUhb_Sc7FtOGEMug&s";

    try {
      const userCred = await createUserWithEmailAndPassword(auth, email, password);
      const user = userCred.user;

      // Update profile
      await updateProfile(user, {
        displayName: username,
        photoURL: photoURL
      });

      // Save extra info in Firestore
      await setDoc(doc(db, "users", user.uid), {
        username,
        bio,
        skills,
        fullName,
        email,
        photoURL,
        createdAt: Date.now()
      });

      alert("✅ Signup successful! You are logged in.");
      window.location.href = "/dashboard"; // redirect after signup
    } catch (err) {
      alert("❌ Error: " + err.message);
    }
  });

  // Handle login form
  document.querySelector('#haveAcct form').addEventListener("submit", async (e) => {
    e.preventDefault();
    const email = document.querySelector('#logEmail').value;
    const password = document.querySelector('#logPsw').value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("✅ Logged in successfully!");
      window.location.href = "/dashboard";
    } catch (err) {
      alert("❌ Login failed: " + err.message);
    }
  });
