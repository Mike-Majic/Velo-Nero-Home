function showSection(id) {
  document.querySelectorAll(".section").forEach(section => {
    section.classList.remove("active");
  });

  const target = document.getElementById(id);
  if (target) target.classList.add("active");
}

function logout() {
  localStorage.removeItem("vn_session_v1");
  localStorage.removeItem("vn_session");
  location.reload();
}

document.addEventListener("DOMContentLoaded", () => {
  const btnLogout = document.getElementById("btnLogout");
  if (btnLogout) btnLogout.style.display = "none";
});
