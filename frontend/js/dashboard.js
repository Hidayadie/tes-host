// ========================================================
// Cuan't - Dashboard Logic
// ========================================================

document.addEventListener("DOMContentLoaded", () => {
  if (!requireAuth()) return;

  // 1. Initialize User Profile
  initUserProfile();

  // 2. Fetch Data
  loadDashboardData();

  // 3. Setup Modal & Events
  setupModalEvents();
});

// Setup User Profile and Logout
function initUserProfile() {
  const user = getUser();
  if (user) {
    const nameEl = document.getElementById("user-name");
    const avatarEl = document.getElementById("user-avatar");
    if (nameEl) nameEl.textContent = user.name || user.email;
    if (avatarEl) {
      avatarEl.textContent = (user.name ? user.name.charAt(0) : "U").toUpperCase();
    }
  }

  // Logout listener
  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      authAPI.logout();
    });
  }
}

// Load Summary & Recent Transactions
async function loadDashboardData() {
  try {
    const [summaryRes, transRes] = await Promise.all([
      transactionsAPI.getSummary(),
      transactionsAPI.getAll({ sort: "date_desc" }),
    ]);

    renderSummary(summaryRes);
    renderRecentTransactions(transRes.data || []);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// Render Summary Cards & Breakdown
function renderSummary(summary) {
  const balanceEl = document.getElementById("stat-balance");
  const incomeEl = document.getElementById("stat-income");
  const expenseEl = document.getElementById("stat-expense");

  const balance = summary.net_balance || 0;
  const income = summary.total_income || 0;
  const expense = summary.total_expense || 0;

  balanceEl.textContent = formatIDR(balance);
  balanceEl.className = `stat-value ${balance >= 0 ? "balance-pos" : "balance-neg"}`;

  incomeEl.textContent = formatIDR(income);
  expenseEl.textContent = formatIDR(expense);

  // Render Category Breakdown (filter only expenses for expenditure breakdown)
  const categoryContainer = document.getElementById("category-bars-container");
  if (!categoryContainer) return;

  const expenseCategories = (summary.categories || []).filter((c) => c.type === "expense");

  if (expenseCategories.length === 0) {
    categoryContainer.innerHTML = `
      <div class="empty-state" style="padding: 1.5rem 0;">
        <p class="empty-desc">Belum ada transaksi pengeluaran untuk dianalisis.</p>
      </div>
    `;
    return;
  }

  categoryContainer.innerHTML = expenseCategories
    .map((cat) => {
      const pct = Math.round(cat.percentage || 0);
      return `
        <div class="cat-bar-item">
          <div class="cat-bar-header">
            <span>${escapeHtml(cat.category)}</span>
            <span>${formatIDR(cat.total)} (${pct}%)</span>
          </div>
          <div class="cat-bar-track">
            <div class="cat-bar-fill expense" style="width: ${Math.min(100, pct)}%;"></div>
          </div>
        </div>
      `;
    })
    .join("");
}

// Render Recent 5 Transactions
function renderRecentTransactions(transactions) {
  const tbody = document.getElementById("recent-transactions-tbody");
  if (!tbody) return;

  const recent = transactions.slice(0, 5);

  if (recent.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="4" class="empty-state">
          <p class="empty-desc">Belum ada transaksi tercatat.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = recent
    .map((tx) => {
      const isExpense = tx.type === "expense";
      const sign = isExpense ? "-" : "+";
      const amountClass = isExpense ? "expense" : "income";
      const badgeClass = isExpense ? "badge-expense" : "badge-income";
      const badgeText = isExpense ? "Pengeluaran" : "Pemasukan";

      return `
        <tr>
          <td style="color: var(--text-muted); font-size: 0.85rem; white-space: nowrap;">
            ${formatDate(tx.date)}
          </td>
          <td>
            <div style="font-weight: 600;">${escapeHtml(tx.title)}</div>
            ${tx.description ? `<div style="font-size: 0.8rem; color: var(--text-muted);">${escapeHtml(tx.description)}</div>` : ""}
          </td>
          <td>
            <span class="badge badge-cat">${escapeHtml(tx.category)}</span>
          </td>
          <td style="text-align: right; font-weight: 700; white-space: nowrap;">
            <span class="stat-value ${amountClass}" style="font-size: 0.95rem;">
              ${sign} ${formatIDR(tx.amount)}
            </span>
          </td>
        </tr>
      `;
    })
    .join("");
}

// Category Storage & Modal Logic
let cachedCategories = { income: [], expense: [] };

async function loadCategoryOptions(selectedType = "expense") {
  const categorySelect = document.getElementById("trans-category");
  if (!categorySelect) return;

  if (cachedCategories.income.length === 0 && cachedCategories.expense.length === 0) {
    try {
      const res = await transactionsAPI.getCategories();
      cachedCategories = res;
    } catch (e) {
      cachedCategories = {
        income: ["Gaji", "Uang Saku", "Investasi", "Pemasukan Lainnya"],
        expense: ["Makanan & Minuman", "Transportasi", "Kebutuhan Pokok", "Pendidikan", "Tagihan", "Hiburan", "Pengeluaran Lainnya"],
      };
    }
  }

  const list = selectedType === "income" ? cachedCategories.income : cachedCategories.expense;

  categorySelect.innerHTML = list
    .map((cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`)
    .join("");
}

function setupModalEvents() {
  const modal = document.getElementById("transaction-modal");
  const openBtn = document.getElementById("btn-open-modal");
  const closeBtn = document.getElementById("btn-close-modal");
  const cancelBtn = document.getElementById("btn-cancel-modal");
  const form = document.getElementById("transaction-form");
  const modalAlert = document.getElementById("modal-alert");

  const btnTypeExpense = document.getElementById("btn-type-expense");
  const btnTypeIncome = document.getElementById("btn-type-income");
  const inputType = document.getElementById("trans-type");
  const inputDate = document.getElementById("trans-date");

  // Open modal
  const openModal = () => {
    form.reset();
    modalAlert.style.display = "none";
    inputType.value = "expense";
    btnTypeExpense.className = "type-toggle-btn active expense";
    btnTypeIncome.className = "type-toggle-btn";
    inputDate.value = formatDateInput(new Date());
    loadCategoryOptions("expense");
    modal.classList.add("show");
  };

  const closeModal = () => {
    modal.classList.remove("show");
  };

  if (openBtn) openBtn.addEventListener("click", openModal);
  if (closeBtn) closeBtn.addEventListener("click", closeModal);
  if (cancelBtn) cancelBtn.addEventListener("click", closeModal);

  // Close when clicking backdrop or pressing Escape
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape" && modal && modal.classList.contains("show")) {
      closeModal();
    }
  });

  // Type Toggle Buttons
  if (btnTypeExpense && btnTypeIncome) {
    btnTypeExpense.addEventListener("click", () => {
      btnTypeExpense.className = "type-toggle-btn active expense";
      btnTypeIncome.className = "type-toggle-btn";
      inputType.value = "expense";
      loadCategoryOptions("expense");
    });

    btnTypeIncome.addEventListener("click", () => {
      btnTypeIncome.className = "type-toggle-btn active income";
      btnTypeExpense.className = "type-toggle-btn";
      inputType.value = "income";
      loadCategoryOptions("income");
    });
  }

  // Submit Transaction
  if (form) {
    form.addEventListener("submit", async (e) => {
      e.preventDefault();
      modalAlert.style.display = "none";

      const title = document.getElementById("trans-title").value.trim();
      const amount = parseFloat(document.getElementById("trans-amount").value);
      const type = inputType.value;
      const category = document.getElementById("trans-category").value;
      const date = document.getElementById("trans-date").value;
      const description = document.getElementById("trans-desc").value.trim();

      if (!title || !amount || amount <= 0 || !category || !date) {
        modalAlert.textContent = "Pastikan semua bidang wajib terisi dengan benar.";
        modalAlert.style.display = "flex";
        return;
      }

      const saveBtn = document.getElementById("btn-save-transaction");
      saveBtn.disabled = true;
      saveBtn.textContent = "Menyimpan...";

      try {
        await transactionsAPI.create({
          title,
          amount,
          type,
          category,
          date,
          description,
        });

        closeModal();
        showToast("Transaksi berhasil dicatat!", "success");
        await loadDashboardData();
      } catch (err) {
        modalAlert.textContent = err.message;
        modalAlert.style.display = "flex";
      } finally {
        saveBtn.disabled = false;
        saveBtn.textContent = "Simpan Transaksi";
      }
    });
  }
}

// Utility to escape HTML to prevent XSS
function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}
