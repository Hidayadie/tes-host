// ========================================================
// Cuan't - API Client & Utility Functions
// ========================================================

const getApiBaseUrl = () => {
  // If served directly from Go backend (e.g., http://localhost:8080/dashboard)
  if (window.location.origin && window.location.origin !== "null" && !window.location.origin.startsWith("file:")) {
    return `${window.location.origin}/api`;
  }
  // Fallback for opening via file:// or other frontend server
  return "http://localhost:8080/api";
};

const API_BASE_URL = getApiBaseUrl();

// --------------------------------------------------------
// Auth & Token Storage Helpers
// --------------------------------------------------------
function getToken() {
  return localStorage.getItem("cuant_token");
}

function getUser() {
  const userJson = localStorage.getItem("cuant_user");
  if (!userJson) return null;
  try {
    return JSON.parse(userJson);
  } catch (e) {
    return null;
  }
}

function setAuth(token, user) {
  localStorage.setItem("cuant_token", token);
  if (user) {
    localStorage.setItem("cuant_user", JSON.stringify(user));
  }
}

function clearAuth() {
  localStorage.removeItem("cuant_token");
  localStorage.removeItem("cuant_user");
}

function isAuthenticated() {
  return !!getToken();
}

function requireAuth() {
  if (!isAuthenticated()) {
    window.location.href = "login.html";
    return false;
  }
  return true;
}

function redirectIfAuthenticated() {
  if (isAuthenticated()) {
    window.location.href = "dashboard.html";
  }
}

// --------------------------------------------------------
// Core HTTP Fetch Client
// --------------------------------------------------------
async function apiFetch(endpoint, options = {}) {
  const token = getToken();
  const headers = {
    "Content-Type": "application/json",
    Accept: "application/json",
    ...options.headers,
  };

  if (token) {
    headers["Authorization"] = `Bearer ${token}`;
  }

  try {
    const response = await fetch(`${API_BASE_URL}${endpoint}`, {
      ...options,
      headers,
    });

    // Handle session expired / Unauthorized
    if (response.status === 401) {
      clearAuth();
      const currentPath = window.location.pathname;
      if (!currentPath.includes("login.html") && !currentPath.includes("register.html")) {
        window.location.href = "login.html";
      }
      const data = await response.json().catch(() => ({}));
      throw new Error(data.error || "Sesi login telah berakhir, silakan login kembali.");
    }

    if (response.status === 204) {
      return null;
    }

    const data = await response.json();

    if (!response.ok) {
      throw new Error(data.error || "Terjadi kesalahan pada server");
    }

    return data;
  } catch (err) {
    if (err.name === "TypeError" && err.message.includes("Failed to fetch")) {
      throw new Error("Gagal terhubung ke server backend. Pastikan server Cuan't (port 8080) sedang aktif.");
    }
    throw err;
  }
}

// --------------------------------------------------------
// API Services
// --------------------------------------------------------
const authAPI = {
  login: (email, password) =>
    apiFetch("/auth/login", {
      method: "POST",
      body: JSON.stringify({ email, password }),
    }),

  register: (name, email, password) =>
    apiFetch("/auth/register", {
      method: "POST",
      body: JSON.stringify({ name, email, password }),
    }),

  logout: async () => {
    try {
      await apiFetch("/auth/logout", { method: "POST" });
    } catch (e) {
      // Ignore network error during logout
    } finally {
      clearAuth();
      window.location.href = "login.html";
    }
  },

  getMe: () => apiFetch("/auth/me"),
};

const transactionsAPI = {
  getAll: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
        searchParams.append(key, params[key]);
      }
    });
    const qs = searchParams.toString();
    return apiFetch(`/transactions${qs ? "?" + qs : ""}`);
  },

  getById: (id) => apiFetch(`/transactions/${id}`),

  create: (data) =>
    apiFetch("/transactions", {
      method: "POST",
      body: JSON.stringify(data),
    }),

  update: (id, data) =>
    apiFetch(`/transactions/${id}`, {
      method: "PUT",
      body: JSON.stringify(data),
    }),

  delete: (id) =>
    apiFetch(`/transactions/${id}`, {
      method: "DELETE",
    }),

  getSummary: (params = {}) => {
    const searchParams = new URLSearchParams();
    Object.keys(params).forEach((key) => {
      if (params[key] !== undefined && params[key] !== null && params[key] !== "") {
        searchParams.append(key, params[key]);
      }
    });
    const qs = searchParams.toString();
    return apiFetch(`/summary${qs ? "?" + qs : ""}`);
  },

  getCategories: () => apiFetch("/categories"),
};

// --------------------------------------------------------
// Formatting & Notification Helpers
// --------------------------------------------------------
function formatIDR(amount) {
  const num = Number(amount) || 0;
  return new Intl.NumberFormat("id-ID", {
    style: "currency",
    currency: "IDR",
    maximumFractionDigits: 0,
  }).format(num);
}

function formatDate(dateStr) {
  if (!dateStr) return "-";
  const date = new Date(dateStr);
  if (isNaN(date.getTime())) return dateStr;

  return date.toLocaleDateString("id-ID", {
    day: "numeric",
    month: "short",
    year: "numeric",
  });
}

function formatDateInput(dateObj = new Date()) {
  const year = dateObj.getFullYear();
  const month = String(dateObj.getMonth() + 1).padStart(2, "0");
  const day = String(dateObj.getDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function showToast(message, type = "success") {
  let container = document.getElementById("toast-container");
  if (!container) {
    container = document.createElement("div");
    container.id = "toast-container";
    document.body.appendChild(container);
  }

  const toast = document.createElement("div");
  toast.className = `toast toast-${type}`;
  toast.innerHTML = `
    <span>${type === "success" ? "✓" : "⚠"}</span>
    <span>${message}</span>
  `;

  container.appendChild(toast);

  setTimeout(() => {
    toast.style.opacity = "0";
    toast.style.transform = "translateY(10px)";
    toast.style.transition = "all 0.3s ease";
    setTimeout(() => toast.remove(), 300);
  }, 3500);
}
