const schForm = document.querySelector(".top-menu form");
const schInput = schForm.querySelector("input");
schInput.style.display="none";
schForm.querySelector("button").onclick = ()=>{
  
  schInput.style.display=schInput.style.display==="none"? "inline-block":"none";
  document.querySelector(".cart-items").style.display=schInput.style.display==="none"? "block":"none";
}
const toggle = document.querySelector("#toggle");
const toggleBtn = document.querySelector("[for='toggle']");
toggle.addEventListener("input", (e)=>{
  if(e.target.checked){
    toggleBtn.innerHTML="<I class='fas fa-times'></i>";
    
  }
  else {
    toggleBtn.textContent="☰"; 
  }
})

const tb=".eyJpc3MiOiJzdXBhYmFzZSIsInJlZiI6ImZnZ2xxdXllcGJienJkem1rcGZkIiwicm9sZSI6ImFub24iLCJpYXQiOjE3NTkwOTkyMjksImV4cCI6MjA3NDY3NTIyOX0.mT03kocvd2gMLu6y4VeYXQqcBKUPD5DKtku6HrRO7cA";

document.addEventListener("DOMContentLoaded", () => {
  // === Your existing search + filter logic ===
  const schInp = document.querySelector(".top-menu form input");
  const comm = document.querySelector(".product");
  const proCard = comm.querySelectorAll(".card");
  
  proCard.forEach(card => {
    const tag = card.querySelector(".product-describe");
    if (card) {
      card.querySelector(".buttons a").href=`#search?q=${encodeURIComponent(tag.innerHTML.match(/#[\w-]+/) || '')}`; 
      tag.innerHTML = tag.innerHTML.replace(/\#([\w\-]+)/g, "<a href='#search?q=$1' class='card-tag'>#$1</a>");
      tag.querySelectorAll(".card-tag").forEach(ctag => {
        ctag.style.cssText =`color: var(--primary-color);
          font-family: "ADLaM Display", monospace;
          text-decoration: none;`;
      });
    }
 });
  //`
  let noMatch = document.querySelector("#noMatch");
  if (!noMatch) {
    noMatch = document.createElement("p");
    noMatch.id = "noMatch";
    noMatch.innerHTML = `<img src="/assets/images/20250918_223801.png" width="40" height="40" style="margin-top: 10px;animation:spin-bor 2s ease-in-out infinite;border-radius: 50%;border: 1px solid var(--primary-color);border-right: 0;"><a href=""><button>Refresh</button></a> No matching results found.`;
    noMatch.style.display = "none";
    comm.appendChild(noMatch);
  }
  
  function filterCrips(searchTerm) {
    const allCripElements = comm.querySelectorAll(".card");
    let matchFound = false;
    allCripElements.forEach((el) => {
      if (el.innerText.toUpperCase().includes(searchTerm)) {
        el.style.display = "";
        matchFound = true;
      } else {
        el.style.display = "none";
      }
    });
    noMatch.style.display = matchFound ? "none" : "block";
  }
  
  schInp.addEventListener("input", () => {
    const searchTerm = schInp.value.trim();
    filterCrips(searchTerm.toUpperCase());
  });
  
  function processSearchFromURL() {
  document.querySelector(".search-loader").style.display='flex';
    setTimeout(() => {
      const params = new URLSearchParams(window.location.search);
      let value = params.get("q");
      if (!value) {
        const hash = window.location.hash;
        if (hash.startsWith("#search")) {
          const queryString = hash.split("?")[1];
          if (queryString) {
            const hashParams = new URLSearchParams(queryString);
            value = hashParams.get("q");
          }
        }
      }
      if (value) {
        schInp.value = decodeURIComponent(value);
        filterCrips(value.trim().toUpperCase());
      }
      document.querySelector(".search-loader").style.display='none';
    }, 1500);
  }
  
  processSearchFromURL();
  window.addEventListener("hashchange", processSearchFromURL);
  document.querySelector(".top-menu form").addEventListener("submit", (e) => {
    e.preventDefault();
    filterCrips(document.querySelector(".top-menu form input").value.toUpperCase());
  });
  

const cartBox = document.querySelector(".cart-items");
cartBox.classList.add("collapsed");

// toggle on click
cartBox.addEventListener("click", function (e) {
  if (
    e.target.closest(".remove") ||
    e.target.closest(".checkout-btn") ||
    e.target.closest("#currency-select") ||
    e.target.closest("#paypal-button-container")
  ) {
    return; // don’t toggle if inside controls
  }
  cartBox.classList.toggle("collapsed");
});
});
const ta="eyJhbGciOiJIUzI1NiIsInR5cCI6IkpXVCJ9";
const themeToggle = document.getElementById('theme-toggle');

// Load saved theme on page load
if (localStorage.getItem('theme') === 'dark') {
    document.documentElement.classList.add('dark-theme');
}
const tc=ta+tb;
const te="s";

// Add a single click event listener
themeToggle.addEventListener('click', function() {
    document.documentElement.classList.toggle('dark-theme');
    if (document.documentElement.classList.contains('dark-theme')) {
        localStorage.setItem('theme', 'dark');
    } else {
        localStorage.setItem('theme', 'light');
    }
});




document.getElementById("sideSearch").addEventListener("keyup", e=>{
  if(e.key === "Enter"){
    window.location.href="#search?q="+encodeURIComponent(e.target.value);
  }
})
const td = "https://fgglquyepbbzrdzmkpfd." +te+"upabase.co";

// Enhanced theme detection with system preferences
function initializeTheme() {
  const storedTheme = localStorage.getItem('theme');
  const systemPrefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  
  // Priority: stored theme > system preference > light
  const theme = storedTheme || (systemPrefersDark ? 'dark' : 'light');
  
  if (theme === 'dark') {
    document.documentElement.classList.add('dark-theme');
  } else {
    document.documentElement.classList.remove('dark-theme');
  }
}

// Listen for system theme changes
window.matchMedia('(prefers-color-scheme: dark)').addEventListener('change', e => {
  if (!localStorage.getItem('theme')) {
    initializeTheme();
  }
});
