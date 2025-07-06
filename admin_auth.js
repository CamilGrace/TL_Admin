// --- Firebase Configuration ---

// --- Initialize Firebase ---
if (!firebase.apps.length) {
    // init.js already calls initializeApp, but this is a good safety check.
    // If running locally, you might need a local init.js or manual config.
    // For deployment, this will work.
    firebase.initializeApp(firebaseConfig);
}


const auth = firebase.auth();
const db = firebase.firestore();
const storage = firebase.storage();
let adminUser = null;

// --- DOM Elements ---
// Login Page Elements
const loginForm = document.getElementById('login-form');
const loginEmailInput = document.getElementById('login-email');
const loginPasswordInput = document.getElementById('login-password');
const loginErrorDiv = document.getElementById('login-error');
const loginButton = document.querySelector('#login-form button'); // Get button inside form

// Register Page Elements
const registerForm = document.getElementById('register-form');
const registerEmailInput = document.getElementById('register-email');
const registerPasswordInput = document.getElementById('register-password');
const registerConfirmPasswordInput = document.getElementById('register-confirm-password');
const registerErrorDiv = document.getElementById('register-error');
const registerButton = document.querySelector('#register-form button');

// Dashboard Page Elements (Auth related)
const authStatusDiv = document.getElementById('auth-status');
const userEmailSpan = document.getElementById('user-email');
const logoutButton = document.getElementById('logout-button');
const dashboardContainer = document.querySelector('.dashboard-container'); // Get dashboard main container
const bodyElement = document.body;

// --- Utility to Show Errors ---
function showAuthError(element, message) {
    if (element) {
        element.textContent = message;
        element.style.display = 'block';
    }
    console.error("Auth Error:", message);
}
function clearAuthError(element) {
    if (element) {
        element.textContent = '';
        element.style.display = 'none';
    }
}

// --- Event Listeners ---

// Login Form Submission
if (loginForm) {
    loginForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const loginEmailInput = document.getElementById('login-email');
        const loginPasswordInput = document.getElementById('login-password');
        const loginErrorDiv = document.getElementById('login-error');
        const loginButton = loginForm.querySelector('button');

        clearAuthError(loginErrorDiv);
        const email = loginEmailInput.value;
        const password = loginPasswordInput.value;

        if (!email || !password) {
            showAuthError(loginErrorDiv, "Please enter both email and password.");
            return;
        }

        loginButton.disabled = true;
        loginButton.textContent = 'Logging in...';

        auth.signInWithEmailAndPassword(email, password)
            .catch((error) => {
                showAuthError(loginErrorDiv, `Login Failed: ${error.message}`);
                loginButton.disabled = false;
                loginButton.textContent = 'Login';
            });
    });
}

if (registerForm) {
    registerForm.addEventListener('submit', (e) => {
        e.preventDefault();
        const registerEmailInput = document.getElementById('register-email');
        const registerPasswordInput = document.getElementById('register-password');
        const registerConfirmPasswordInput = document.getElementById('register-confirm-password');
        const registerErrorDiv = document.getElementById('register-error');
        const registerButton = registerForm.querySelector('button');

        clearAuthError(registerErrorDiv);
        const email = registerEmailInput.value;
        const password = registerPasswordInput.value;
        const confirmPassword = registerConfirmPasswordInput.value;

        if (!email || !password || !confirmPassword) { showAuthError(registerErrorDiv, "Please fill all fields."); return; }
        if (password.length < 6) { showAuthError(registerErrorDiv, "Password must be at least 6 characters."); return; }
        if (password !== confirmPassword) { showAuthError(registerErrorDiv, "Passwords do not match."); return; }

        registerButton.disabled = true;
        registerButton.textContent = 'Registering...';

        auth.createUserWithEmailAndPassword(email, password)
            .then(() => {
                alert("Registration successful! Please login.");
                window.location.href = 'admin_login.html';
            })
            .catch((error) => {
                showAuthError(registerErrorDiv, `Registration Failed: ${error.message}`);
                registerButton.disabled = false;
                registerButton.textContent = 'Register';
            });
    });
}
// --- Auth State Listener (The core logic) ---
auth.onAuthStateChanged(user => {
    const currentPage = window.location.pathname.split('/').pop() || "index.html";
    console.log("Auth state changed. User:", user ? user.email : null, "Current page:", currentPage);
    adminUser = user;

    // We need to find elements that exist on BOTH login and dashboard pages
    const logoutButton = document.getElementById('logout-button');
    const userEmailSpan = document.getElementById('user-email');
    const dashboardContainer = document.querySelector('.dashboard-container');

    if (user) { // USER IS LOGGED IN
        if (currentPage === 'admin_login.html' || currentPage === 'admin_register.html') {
            window.location.replace('admin_dashboard.html');
        } else {
            // This code runs when on admin_dashboard.html
            if (dashboardContainer) document.body.classList.add('dashboard-active');
            if (userEmailSpan) userEmailSpan.textContent = `Logged in: ${user.email}`;
            if (logoutButton) {
                logoutButton.style.display = 'block'; // Show the logout button
                // Attach the listener here, after confirming the button exists
                logoutButton.onclick = () => {
                    auth.signOut().catch((error) => console.error("Sign out error:", error));
                };
            }
            // Notify the dashboard script that it's safe to run
            document.dispatchEvent(new CustomEvent('authReady', { detail: { user: user } }));
        }
    } else { // USER IS LOGGED OUT
        if (currentPage === 'admin_dashboard.html') {
            window.location.replace('admin_login.html');
        } else {
            // On login/register page, ensure correct body class
            document.body.classList.add('auth-page');
            document.body.classList.remove('dashboard-active');
        }
    }
});