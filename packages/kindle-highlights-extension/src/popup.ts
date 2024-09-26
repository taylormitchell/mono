import { GET_AUTH_API_URL } from "./env";
import { updateBadge } from "./helpers";

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const loggedInContent = document.getElementById("loggedInContent");
  const loginButton = document.getElementById("loginButton");
  const logoutButton = document.getElementById("logoutButton");
  const passwordInput = document.getElementById("password") as HTMLInputElement;
  const statusDiv = document.getElementById("status");

  let page: "login" | "loggedIn" = "login";

  if (
    !loginForm ||
    !loggedInContent ||
    !loginButton ||
    !logoutButton ||
    !passwordInput ||
    !statusDiv
  ) {
    console.error("Missing elements in DOM");
    return;
  }

  // Check if user is logged in
  chrome.storage.local.get("token", (result) => {
    if (result.token) {
      showLoggedInContent();
    } else {
      showLoginForm();
    }
  });

  async function submitLogin() {
    const password = passwordInput.value;

    try {
      const response = await fetch(GET_AUTH_API_URL, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ password }),
      });

      if (response.ok) {
        const { token } = await response.json();
        chrome.storage.local.set({ token }, () => {
          showLoggedInContent();
          updateBadge();
          chrome.runtime.sendMessage({ type: "login_success" });
        });
      } else {
        statusDiv.textContent = "Login failed. Please try again.";
      }
    } catch (error) {
      statusDiv.textContent = "An error occurred. Please try again.";
      console.error("Login error:", error);
    }
  }

  loginButton.addEventListener("click", submitLogin);
  document.addEventListener("keypress", (e) => {
    if (e.key === "Enter" && page === "login") {
      submitLogin();
    }
  });

  logoutButton.addEventListener("click", () => {
    chrome.storage.local.remove("token", () => {
      showLoginForm();
      updateBadge();
      statusDiv.textContent = "Logged out successfully.";
    });
  });

  function showLoginForm() {
    page = "login";
    loginForm.style.display = "block";
    loggedInContent.style.display = "none";
  }

  function showLoggedInContent() {
    page = "loggedIn";
    loginForm.style.display = "none";
    loggedInContent.style.display = "block";
    statusDiv.textContent = "";
  }
});
