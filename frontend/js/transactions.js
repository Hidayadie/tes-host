// ========================================================
// Cuan't - Transactions Management Logic
// ========================================================

let allTransactions = [];
let cachedCategories = { income: [], expense: [] };
let activeDeleteId = null;

document.addEventListener("DOMContentLoaded", () => {
  if (!requireAuth()) return;

  initUserProfile();
  initCategoryFilters();
  initFilterListeners();
  initModalListeners();

  // Initial load
  loadTransactions();
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

  const logoutBtn = document.getElementById("btn-logout");
  if (logoutBtn) {
    logoutBtn.addEventListener("click", () => {
      authAPI.logout();
    });
  }
}

// Load Categories for Filter and Modal
async function initCategoryFilters() {
  try {
    const res = await transactionsAPI.getCategories();
    cachedCategories = res;
  } catch (err) {
    cachedCategories = {
      income: ["Gaji", "Uang Saku", "Investasi", "Pemasukan Lainnya"],
      expense: [
        "Makanan & Minuman",
        "Transportasi",
        "Kebutuhan Pokok",
        "Pendidikan",
        "Tagihan",
        "Hiburan",
        "Pengeluaran Lainnya",
      ],
    };
  }

  // Populate Filter Category Dropdown
  const filterCatSelect = document.getElementById("filter-category");
  if (filterCatSelect) {
    const combined = Array.from(
      new Set([...cachedCategories.expense, ...cachedCategories.income])
    ).sort();

    filterCatSelect.innerHTML =
      '<option value="">Semua Kategori</option>' +
      combined
        .map((cat) => `<option value="${escapeHtml(cat)}">${escapeHtml(cat)}</option>`)
        .join("");
  }
}

// Setup Filters & Search
function initFilterListeners() {
  const searchInput = document.getElementById("filter-search");
  const typeSelect = document.getElementById("filter-type");
  const catSelect = document.getElementById("filter-category");
  const startDateInput = document.getElementById("filter-start-date");
  const endDateInput = document.getElementById("filter-end-date");
  const sortSelect = document.getElementById("filter-sort");
  const resetBtn = document.getElementById("btn-reset-filter");

  let debounceTimer = null;
  searchInput.addEventListener("input", () => {
    clearTimeout(debounceTimer);
    debounceTimer = setTimeout(loadTransactions, 300);
  });

  typeSelect.addEventListener("change", loadTransactions);
  catSelect.addEventListener("change", loadTransactions);
  startDateInput.addEventListener("change", loadTransactions);
  endDateInput.addEventListener("change", loadTransactions);
  sortSelect.addEventListener("change", loadTransactions);

  resetBtn.addEventListener("click", () => {
    searchInput.value = "";
    typeSelect.value = "";
    catSelect.value = "";
    startDateInput.value = "";
    endDateInput.value = "";
    sortSelect.value = "date_desc";
    loadTransactions();
  });
}

// Fetch and Render Transactions with Filters
async function loadTransactions() {
  const tbody = document.getElementById("transactions-tbody");
  const totalCountEl = document.getElementById("total-count");

  const params = {
    search: document.getElementById("filter-search").value.trim(),
    type: document.getElementById("filter-type").value,
    category: document.getElementById("filter-category").value,
    start_date: document.getElementById("filter-start-date").value,
    end_date: document.getElementById("filter-end-date").value,
    sort: document.getElementById("filter-sort").value,
  };

  try {
    const res = await transactionsAPI.getAll(params);
    allTransactions = res.data || [];
    totalCountEl.textContent = allTransactions.length;
    renderTransactionsTable(allTransactions);
  } catch (err) {
    showToast(err.message, "danger");
  }
}

// Render Table Rows
function renderTransactionsTable(transactions) {
  const tbody = document.getElementById("transactions-tbody");
  if (!tbody) return;

  if (transactions.length === 0) {
    tbody.innerHTML = `
      <tr>
        <td colspan="6" class="empty-state">
          <div class="empty-icon">📂</div>
          <div class="empty-title">Tidak ada transaksi ditemukan</div>
          <p class="empty-desc">Coba sesuaikan kata kunci pencarian atau filter yang Anda gunakan.</p>
        </td>
      </tr>
    `;
    return;
  }

  tbody.innerHTML = transactions
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
            <div style="font-weight: 600; color: var(--text-main);">${escapeHtml(tx.title)}</div>
            ${
              tx.description
                ? `<div style="font-size: 0.8rem; color: var(--text-muted); margin-top: 2px;">${escapeHtml(tx.description)}</div>`
                : ""
            }
          </td>
          <td>
            <span class="badge badge-cat">${escapeHtml(tx.category)}</span>
          </td>
          <td>
            <span class="badge ${badgeClass}">${badgeText}</span>
          </td>
          <td style="text-align: right; font-weight: 700; white-space: nowrap;">
            <span class="stat-value ${amountClass}" style="font-size: 0.95rem;">
              ${sign} ${formatIDR(tx.amount)}
            </span>
          </td>
          <td style="text-align: center; white-space: nowrap;">
            <button class="btn btn-secondary btn-sm" onclick="openEditModal(${tx.id})" title="Edit transaksi">
              ✏️ Edit
            </button>
            <button class="btn btn-secondary btn-sm" style="color: var(--danger);" onclick="openDeleteModal(${tx.id}, '${escapeQuote(tx.title)}')" title="Hapus transaksi">
              🗑️
            </button>
          </td>
        </tr>
      `;
    })
    .join("");
}

// Populate Modal Category Select based on Type
function updateModalCategories(selectedType, defaultVal = "") {
  const categorySelect = document.getElementById("trans-category");
  if (!categorySelect) return;

  const list = selectedType === "income" ? cachedCategories.income : cachedCategories.expense;

  categorySelect.innerHTML = list
    .map((cat) => {
      const isSelected = cat.toLowerCase() === (defaultVal || "").toLowerCase();
      return `<option value="${escapeHtml(cat)}" ${isSelected ? "selected" : ""}>${escapeHtml(cat)}</option>`;
    })
    .join("");
}

// Setup Add / Edit & Delete Modals
function initModalListeners() {
  const modal = document.getElementById("transaction-modal");
  const openAddBtn = document.getElementById("btn-open-add");
  const closeModalBtn = document.getElementById("btn-close-modal");
  const cancelModalBtn = document.getElementById("btn-cancel-modal");
  const form = document.getElementById("transaction-form");
  const modalAlert = document.getElementById("modal-alert");
  const modalTitle = document.getElementById("modal-title");

  const btnTypeExpense = document.getElementById("btn-type-expense");
  const btnTypeIncome = document.getElementById("btn-type-income");
  const inputType = document.getElementById("trans-type");
  const inputId = document.getElementById("trans-id");
  const inputDate = document.getElementById("trans-date");

  // Open Add Modal
  const openAdd = () => {
    form.reset();
    inputId.value = "";
    modalTitle.textContent = "Catat Transaksi Baru";
    modalAlert.style.display = "none";
    inputType.value = "expense";
    btnTypeExpense.className = "type-toggle-btn active expense";
    btnTypeIncome.className = "type-toggle-btn";
    inputDate.value = formatDateInput(new Date());
    updateModalCategories("expense");
    modal.classList.add("show");
  };

  const closeModal = () => {
    modal.classList.remove("show");
  };

  if (openAddBtn) openAddBtn.addEventListener("click", openAdd);
  if (closeModalBtn) closeModalBtn.addEventListener("click", closeModal);
  if (cancelModalBtn) cancelModalBtn.addEventListener("click", closeModal);

  // Close when clicking backdrop
  if (modal) {
    modal.addEventListener("click", (e) => {
      if (e.target === modal) closeModal();
    });
  }

  // Type Toggle Buttons
  btnTypeExpense.addEventListener("click", () => {
    btnTypeExpense.className = "type-toggle-btn active expense";
    btnTypeIncome.className = "type-toggle-btn";
    inputType.value = "expense";
    updateModalCategories("expense");
  });

  btnTypeIncome.addEventListener("click", () => {
    btnTypeIncome.className = "type-toggle-btn active income";
    btnTypeExpense.className = "type-toggle-btn";
    inputType.value = "income";
    updateModalCategories("income");
  });

  // Submit Form (Add or Edit)
  form.addEventListener("submit", async (e) => {
    e.preventDefault();
    modalAlert.style.display = "none";

    const id = inputId.value;
    const title = document.getElementById("trans-title").value.trim();
    const amount = parseFloat(document.getElementById("trans-amount").value);
    const type = inputType.value;
    const category = document.getElementById("trans-category").value;
    const date = document.getElementById("trans-date").value;
    const description = document.getElementById("trans-desc").value.trim();

    if (!title || !amount || amount <= 0 || !category || !date) {
      modalAlert.textContent = "Pastikan semua bidang wajib diisi dengan benar.";
      modalAlert.style.display = "flex";
      return;
    }

    const saveBtn = document.getElementById("btn-save-transaction");
    saveBtn.disabled = true;
    saveBtn.textContent = "Menyimpan...";

    try {
      if (id) {
        // Update existing
        await transactionsAPI.update(id, {
          title,
          amount,
          type,
          category,
          date,
          description,
        });
        showToast("Transaksi berhasil diperbarui!", "success");
      } else {
        // Create new
        await transactionsAPI.create({
          title,
          amount,
          type,
          category,
          date,
          description,
        });
        showToast("Transaksi berhasil dicatat!", "success");
      }

      closeModal();
      await loadTransactions();
    } catch (err) {
      modalAlert.textContent = err.message;
      modalAlert.style.display = "flex";
    } finally {
      saveBtn.disabled = false;
      saveBtn.textContent = "Simpan";
    }
  });

  // Delete Modal listeners
  const deleteModal = document.getElementById("delete-modal");
  const closeDeleteBtn = document.getElementById("btn-close-delete-modal");
  const cancelDeleteBtn = document.getElementById("btn-cancel-delete");
  const confirmDeleteBtn = document.getElementById("btn-confirm-delete");

  const closeDeleteModal = () => {
    deleteModal.classList.remove("show");
    activeDeleteId = null;
  };

  if (closeDeleteBtn) closeDeleteBtn.addEventListener("click", closeDeleteModal);
  if (cancelDeleteBtn) cancelDeleteBtn.addEventListener("click", closeDeleteModal);

  if (deleteModal) {
    deleteModal.addEventListener("click", (e) => {
      if (e.target === deleteModal) closeDeleteModal();
    });
  }

  // Global Escape key listener for open modals
  document.addEventListener("keydown", (e) => {
    if (e.key === "Escape") {
      if (modal && modal.classList.contains("show")) closeModal();
      if (deleteModal && deleteModal.classList.contains("show")) closeDeleteModal();
    }
  });

  if (confirmDeleteBtn) {
    confirmDeleteBtn.addEventListener("click", async () => {
      if (!activeDeleteId) return;

      confirmDeleteBtn.disabled = true;
      confirmDeleteBtn.textContent = "Menghapus...";

      try {
        await transactionsAPI.delete(activeDeleteId);
        showToast("Transaksi berhasil dihapus.", "success");
        closeDeleteModal();
        await loadTransactions();
      } catch (err) {
        showToast(err.message, "danger");
      } finally {
        confirmDeleteBtn.disabled = false;
        confirmDeleteBtn.textContent = "Ya, Hapus";
      }
    });
  }
}

// Global functions attached to window for table action buttons
window.openEditModal = (id) => {
  const tx = allTransactions.find((item) => item.id === id);
  if (!tx) return;

  const modal = document.getElementById("transaction-modal");
  const form = document.getElementById("transaction-form");
  const modalAlert = document.getElementById("modal-alert");
  const modalTitle = document.getElementById("modal-title");

  const btnTypeExpense = document.getElementById("btn-type-expense");
  const btnTypeIncome = document.getElementById("btn-type-income");
  const inputType = document.getElementById("trans-type");
  const inputId = document.getElementById("trans-id");

  modalAlert.style.display = "none";
  modalTitle.textContent = "Edit Transaksi";

  inputId.value = tx.id;
  document.getElementById("trans-title").value = tx.title;
  document.getElementById("trans-amount").value = tx.amount;
  document.getElementById("trans-desc").value = tx.description || "";

  // Date formatted to YYYY-MM-DD
  const dateObj = new Date(tx.date);
  document.getElementById("trans-date").value = formatDateInput(dateObj);

  // Type
  inputType.value = tx.type;
  if (tx.type === "income") {
    btnTypeIncome.className = "type-toggle-btn active income";
    btnTypeExpense.className = "type-toggle-btn";
  } else {
    btnTypeExpense.className = "type-toggle-btn active expense";
    btnTypeIncome.className = "type-toggle-btn";
  }

  updateModalCategories(tx.type, tx.category);

  modal.classList.add("show");
};

window.openDeleteModal = (id, title) => {
  activeDeleteId = id;
  const deleteModal = document.getElementById("delete-modal");
  const itemTitle = document.getElementById("delete-item-title");
  itemTitle.textContent = title;
  deleteModal.classList.add("show");
};

function escapeHtml(str) {
  if (!str) return "";
  return String(str)
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/"/g, "&quot;")
    .replace(/'/g, "&#039;");
}

function escapeQuote(str) {
  if (!str) return "";
  return String(str).replace(/'/g, "\\'");
}
