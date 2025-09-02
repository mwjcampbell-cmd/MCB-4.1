// Firebase config
const firebaseConfig = {
  apiKey: "AIzaSyBW5iWg5mCgbzjF9MBdR32VJi4uX2JHf0A",
  authDomain: "mcb-database-b9815.firebaseapp.com",
  projectId: "mcb-database-b9815",
  storageBucket: "mcb-database-b9815.appspot.com",
  messagingSenderId: "541175340452",
  appId: "1:541175340452:web:156f7c14ef081bde633531",
  measurementId: "G-Y2DY5J84RL"
};

// Initialize Firebase
firebase.initializeApp(firebaseConfig);
const auth = firebase.auth();
const db = firebase.firestore();

// Google Login
function login() {
  const provider = new firebase.auth.GoogleAuthProvider();
  auth.signInWithPopup(provider)
    .then(result => {
      document.getElementById("user-info").innerText = `Signed in as ${result.user.displayName}`;
      document.getElementById("login-btn").style.display = "none";
      document.getElementById("logout-btn").style.display = "block";
      document.getElementById("app-content").style.display = "block";
    })
    .catch(error => {
      console.error("Login error:", error);
      alert("Google Sign-In failed. Check console for details.");
    });
}

// Logout
function logout() {
  auth.signOut().then(() => {
    document.getElementById("user-info").innerText = "Not signed in";
    document.getElementById("login-btn").style.display = "block";
    document.getElementById("logout-btn").style.display = "none";
    document.getElementById("app-content").style.display = "none";
  });
}

// Track auth state
auth.onAuthStateChanged(user => {
  if (user) {
    document.getElementById("user-info").innerText = `Signed in as ${user.displayName}`;
    document.getElementById("login-btn").style.display = "none";
    document.getElementById("logout-btn").style.display = "block";
    document.getElementById("app-content").style.display = "block";
  } else {
    document.getElementById("user-info").innerText = "Not signed in";
    document.getElementById("login-btn").style.display = "block";
    document.getElementById("logout-btn").style.display = "none";
    document.getElementById("app-content").style.display = "none";
  }
});
