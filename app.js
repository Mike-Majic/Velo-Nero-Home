const OWNER_EMAIL = "m.colurci@gmail.com"

function showSection(id){

document.querySelectorAll(".section").forEach(s=>{
s.classList.remove("active")
})

const el=document.getElementById(id)

if(el){
el.classList.add("active")
}

}

function logout(){

localStorage.removeItem("vn_session")

location.reload()

}

function setHeaderUser(){

const email=localStorage.getItem("vn_email")

if(!email)return

document.getElementById("pillEmail").innerText=email

if(email===OWNER_EMAIL){

document.getElementById("pillRole").innerText="Ruolo: Owner"

}

document.getElementById("btnLogout").style.display="inline-block"

}

function boot(){

setHeaderUser()

}

boot()
