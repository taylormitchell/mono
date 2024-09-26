import { GET_AUTH_API_URL } from "./env";
import { checkHaveToken, readAmazonAccessible, updateBadge } from "./shared";

document.addEventListener("DOMContentLoaded", function () {
  const loginForm = document.getElementById("loginForm");
  const loggedInContent = document.getElementById("loggedInContent");
  const loginButton = document.getElementById("loginButton");
  const logoutButton = document.getElementById("logoutButton");
  const passwordInput = document.getElementById("password") as HTMLInputElement;
  const statusDiv = document.getElementById("status");
  const amazonAuthStatus = document.getElementById("amazonAuthStatus");

  let page: "login" | "loggedIn" = "login";

  if (
    !loginForm ||
    !loggedInContent ||
    !loginButton ||
    !logoutButton ||
    !passwordInput ||
    !statusDiv ||
    !amazonAuthStatus
  ) {
    console.error("Missing elements in DOM");
    return;
  }

  updateBadge();

  readAmazonAccessible().then((isAccessible) => {
    amazonAuthStatus.innerHTML = isAccessible
      ? "ok"
      : 'got to <a href="https://read.amazon.com/notebook" target="_blank">https://read.amazon.com/notebook</a> and login';
  });

  checkHaveToken().then((hasToken) => {
    if (hasToken) {
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

function popup({
  apiAuth,
  amazonAuth,
  status,
}: {
  apiAuth: boolean;
  amazonAuth: boolean;
  status: string;
}) {
  return `
    <h2>Kindle Highlights Extension</h2>
    <div id="apiAuth">
      <h3>API Auth</h3>
      ${
        apiAuth
          ? `
            <div>
              <h2>Login</h2>
              <input type="password" id="password" placeholder="Password" />
              <button id="loginButton">Login</button>
            </div>
          `
          : `
            <div>
              <p>You are logged in.</p>
              <button id="logoutButton">Logout</button>
            </div>
          `
      }
    </div>
    <div id="amazonAuth">
      <h3>Amazon Auth</h3>
      ${
        amazonAuth
          ? `
            <p>ok</p>
          `
          : `
            <p>got to <a href="https://read.amazon.com/notebook" target="_blank">https://read.amazon.com/notebook</a> and login</p>
          `
      }
    </div>
    <div id="status">${status}</div>
  `;
}
