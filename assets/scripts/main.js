const starBtn = document.querySelectorAll(".buttons");

starBtn.forEach(btnPar => {
  const btn = btnPar.querySelector("button.star");
  const starCount = btnPar.querySelector(".star-count");
  btn.style.background = "#ddd";
  btn.addEventListener("click", (e) => {
    const starRaw = parseInt(starCount.textContent);
    
    btn.style.background = btn.style.background === "blue" ? "#ddd" : "blue";
    starCount.textContent = btn.style.background === "blue" ? starRaw + 1 : starRaw - 1;
  })
})
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

document.addEventListener("DOMContentLoaded", () => {
      const schInp = document.querySelector(".top-menu form input");
      const comm = document.querySelector(".product");
      
      const proCard = comm.querySelectorAll(".card");
      proCard.forEach(card =>{
        
       const tag = card.querySelector(".product-describe");
       if(card){
       card.querySelector(".buttons a").href=`#search?q=${encodeURIComponent(tag.innerHTML.match(/#[\w-]+/)||"")}`;
        tag.innerHTML=tag.innerHTML.replace(/\#([\w\-]+)/g, "<a href='#search?q=$1' class='card-tag' >#$1</a>");
        tag.querySelectorAll(".card-tag").forEach(ctag=>{ 
        ctag.style.cssText=`
        color: #09f;
        font-family: "ADLaM Display", monospace;
        
        text-decoration: none;
        `;
        });
       } 
      });
      let noMatch = document.querySelector("#noMatch");
      if (!noMatch) {
        noMatch = document.createElement("p");
        noMatch.id = "noMatch";
        noMatch.innerHTML = `<a href=""><button>Refresh</button></a> No matching results found.`;
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
        }, 1500);
      }

      processSearchFromURL();
      window.addEventListener("hashchange", processSearchFromURL)
      document.querySelector(".top-menu form").addEventListener("submit", (e) =>{
        e.preventDefault()
        filterCrips(document.querySelector(".top-menu form input").value.toUpperCase());
      })
})
