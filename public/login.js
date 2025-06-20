// login.js - handles login form submission and redirects upon success

document.getElementById("loginForm").addEventListener("submit", async (e) => {
  e.preventDefault();

  const username = document.getElementById("username").value.trim();
  const password = document.getElementById("password").value.trim();
  const errorMsg = document.getElementById("errorMsg");

  try {
    const res = await fetch("/login", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ username, password }),
    });

    const data = await res.json();

    if (data.success) {
      // Store user info in sessionStorage
      sessionStorage.setItem("username", data.username);
      sessionStorage.setItem("role", data.role);

      // Redirect to scanner page
      window.location.href = "scanner.html";
    } else {
      errorMsg.textContent = data.message || "התחברות נכשלה.";
    }
  } catch (err) {
    console.error("Login error:", err);
    errorMsg.textContent = "שגיאה בחיבור לשרת.";
  }
});
