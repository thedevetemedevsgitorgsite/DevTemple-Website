
  import { initializeApp } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-app.js";
import { getAuth } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-auth.js";
import { getFirestore } from "https://www.gstatic.com/firebasejs/10.14.0/firebase-firestore.js";

const res = await fetch("/.netlify/functions/fcnfig");
const config = await res.json();

const app = initializeApp(config);
export const auth = getAuth(app);
export const db = getFirestore(app);

  document.getElementById("submitable").addEventListener("submit", async (e) => {
    e.preventDefault();

    const email = document.querySelector('input[type="email"]').value;
    const password = document.querySelector('#seePw input').value;
    const username = document.querySelector('[name="user-name"]').value;
    const bio = document.querySelector('[name="bio"]').value;
    const skills = document.querySelector('[name="skills"]').value;
    const fullName = document.querySelector('[name="full-name"]').value;
    const photoURL = document.querySelector('[name="photo"]').value || null;

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
    const email = e.target.querySelector('input[type="email"]').value;
    const password = e.target.querySelector('input[type="password"]').value;

    try {
      await signInWithEmailAndPassword(auth, email, password);
      alert("✅ Logged in successfully!");
      window.location.href = "/dashboard";
    } catch (err) {
      alert("❌ Login failed: " + err.message);
    }
  });
