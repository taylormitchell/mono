import { GET_AUTH_API_URL } from "./env";
import { checkHaveToken, readAmazonAccessible, updateBadge } from "./shared";

document.addEventListener("DOMContentLoaded", function () {
  let state = {
    apiAuth: true,
    amazonAuth: true,
  };

  function updateState(newState: Partial<typeof state>) {
    state = { ...state, ...newState };
    render();
  }

  function render() {
    updateBadge();
    const el = document.getElementById("status");
    if (!el) {
      console.error("Missing elements in DOM");
      return;
    }
    const { apiAuth, amazonAuth } = state;
    el.innerHTML = `
      <div>
        <div id="apiAuth">
          <h3>API Auth</h3>
          <div style="display: ${apiAuth ? "none" : "block"}">
            <h2>Login</h2>
            <input type="password" id="password" placeholder="Password" />
            <button id="loginButton">Login</button>
          </div>
          <div style="display: ${apiAuth ? "block" : "none"}">
            <p>You are logged in.</p>
            <button id="logoutButton">Logout</button>
          </div>
        </div>
        <div id="amazonAuth">
          <h3>Amazon Auth</h3>
          ${
            amazonAuth
              ? `<p>ok</p>`
              : `<p>Go to <a href="https://read.amazon.com/notebook" target="_blank">https://read.amazon.com/notebook</a> and login</p>`
          }
        </div>
      </div>
    `;

    async function submitLogin() {
      const password = (document.getElementById("password") as HTMLInputElement)?.value;

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
            updateState({ apiAuth: true });
            updateBadge();
            chrome.runtime.sendMessage({ type: "login_success" });
          });
        }
      } catch (error) {
        console.error("Login error:", error);
      }
    }

    const loginButton = document.getElementById("loginButton");
    if (loginButton) {
      loginButton.addEventListener("click", submitLogin);
      document.addEventListener("keypress", (e) => {
        if (e.key === "Enter") {
          submitLogin();
        }
      });
    }

    const logoutButton = document.getElementById("logoutButton");
    if (logoutButton) {
      logoutButton.addEventListener("click", () => {
        chrome.storage.local.remove("token", () => {
          updateBadge();
          updateState({ apiAuth: false });
        });
      });
    }
  }

  readAmazonAccessible().then((isAccessible) => {
    updateState({ amazonAuth: isAccessible });
  });

  checkHaveToken().then((hasToken) => {
    updateState({ apiAuth: hasToken });
  });
});
