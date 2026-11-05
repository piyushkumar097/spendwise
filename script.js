/**
 * ==============================================================================
 * SPENDWISE – CORE APPLICATION CONTROLLER (script.js)
 * University Innovation Lab Project No. 32
 * Version: 1.1.0
 * 
 * ARCHITECTURE OVERVIEW FOR DEVELOPERS:
 * 1. SpendWiseConfig        - Central global configuration & defaults (from config.js)
 * 2. SpendWiseStorage       - Data persistence, schema migrations & safe corrupt handling
 * 3. SpendWiseCalculations  - Pure mathematical analytics & financial rules (no DOM code)
 * 4. SpendWiseCharts        - Chart.js lifecycle management & canvas rendering
 * 5. SpendWiseUI            - DOM interaction, modal dialogs, filters & table renderers
 * 6. SpendWiseApp           - Public API controller orchestrating all modules
 * ==============================================================================
 */

'use strict';

// ------------------------------------------------------------------------------
// MODULE 1: CONFIGURATION RESOLVER
// ------------------------------------------------------------------------------
const Config = (function () {
  // Use global SpendWiseConfig if loaded, otherwise fallback to safe defaults
  if (typeof SpendWiseConfig !== 'undefined') {
    return SpendWiseConfig;
  }
  return {
    APP_VERSION: '1.1.0',
    STORAGE_KEYS: {
      DATA: 'spendwise_app_data_v1',
      THEME: 'spendwise_theme_pref',
      VERSION: 'spendwise_schema_version'
    },
    CURRENCIES: {
      INR: { code: 'INR', symbol: '₹' },
      USD: { code: 'USD', symbol: '$' },
      EUR: { code: 'EUR', symbol: '€' },
      GBP: { code: 'GBP', symbol: '£' }
    },
    DEFAULT_PREFERENCES: {
      userName: 'Student',
      currency: 'INR',
      studentMode: true,
      theme: 'light'
    },
    STANDARD_CATEGORIES: ['Food', 'Transportation', 'Shopping', 'Education', 'Entertainment', 'Healthcare', 'Bills', 'Other'],
    STUDENT_CATEGORIES: ['Food and Snacks', 'Books and Stationery', 'Transportation', 'Hostel Expenses', 'College Fees', 'Entertainment', 'Pocket Money', 'Other'],
    BUDGET_THRESHOLDS: { WARNING: 80, DANGER: 100 },
    CHART_COLORS: ['#10b981', '#3b82f6', '#f59e0b', '#ec4899', '#8b5cf6', '#06b6d4', '#14b8a6', '#f97316', '#6366f1', '#84cc16']
  };
})();

// ------------------------------------------------------------------------------
// MODULE 2: STATE & STORAGE MANAGEMENT (Versioned & Safe Migration)
// ------------------------------------------------------------------------------
const SpendWiseStorage = (function () {
  let appState = {
    version: Config.APP_VERSION,
    expenses: [],
    income: [],
    monthlyBudgets: {},
    categoryBudgets: {},
    customCategories: [],
    userPreferences: Object.assign({}, Config.DEFAULT_PREFERENCES)
  };

  /**
   * Loads state from localStorage with backward-compatible schema migration
   */
  function load() {
    try {
      const raw = localStorage.getItem(Config.STORAGE_KEYS.DATA);
      if (raw) {
        const parsed = JSON.parse(raw);

        // Safe migration: Merge existing data while preserving all user records
        appState.expenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
        appState.income = Array.isArray(parsed.income) ? parsed.income : [];
        appState.monthlyBudgets = (typeof parsed.monthlyBudgets === 'object' && parsed.monthlyBudgets !== null) ? parsed.monthlyBudgets : {};
        appState.categoryBudgets = (typeof parsed.categoryBudgets === 'object' && parsed.categoryBudgets !== null) ? parsed.categoryBudgets : {};
        appState.customCategories = Array.isArray(parsed.customCategories) ? parsed.customCategories : [];
        appState.userPreferences = Object.assign({}, Config.DEFAULT_PREFERENCES, parsed.userPreferences || {});
        appState.version = Config.APP_VERSION;
      }
    } catch (err) {
      console.warn('SpendWise: Error reading localStorage data. Initializing clean recovery state.', err);
    }

    // Remove records and budgets previously seeded by the demo setup, preserving user data.
    const expenseCount = appState.expenses.length;
    const incomeCount = appState.income.length;
    appState.expenses = appState.expenses.filter(e => e.id !== 'demo_street_food_20261105');
    appState.income = appState.income.filter(i => i.id !== 'demo_income_pocket_money_001');
    let removedLegacyBudget = false;
    const legacyDemoMonth = '2026-11';
    const legacyCategoryCaps = {
      'Food': 1500,
      'Food and Snacks': 1500,
      'Transportation': 800,
      'Books and Stationery': 1000
    };
    if (appState.monthlyBudgets[legacyDemoMonth] === 4000) {
      delete appState.monthlyBudgets[legacyDemoMonth];
      removedLegacyBudget = true;
    }
    const savedLegacyCategoryCaps = appState.categoryBudgets[legacyDemoMonth];
    if (savedLegacyCategoryCaps &&
        Object.keys(savedLegacyCategoryCaps).length === Object.keys(legacyCategoryCaps).length &&
        Object.keys(legacyCategoryCaps).every(category => savedLegacyCategoryCaps[category] === legacyCategoryCaps[category])) {
      delete appState.categoryBudgets[legacyDemoMonth];
      removedLegacyBudget = true;
    }
    if (expenseCount !== appState.expenses.length ||
        incomeCount !== appState.income.length ||
        removedLegacyBudget) {
      save();
    }

    return appState;
  }

  /**
   * Persists state to browser localStorage
   */
  function save() {
    try {
      localStorage.setItem(Config.STORAGE_KEYS.DATA, JSON.stringify(appState));
      localStorage.setItem(Config.STORAGE_KEYS.VERSION, Config.APP_VERSION);
    } catch (err) {
      console.error('SpendWise: Failed to write state to localStorage', err);
    }
  }

  function getState() {
    return appState;
  }

  function resetToDefaults() {
    localStorage.removeItem(Config.STORAGE_KEYS.DATA);
    appState = {
      version: Config.APP_VERSION,
      expenses: [],
      income: [],
      monthlyBudgets: {},
      categoryBudgets: {},
      customCategories: [],
      userPreferences: Object.assign({}, Config.DEFAULT_PREFERENCES)
    };
    return load();
  }

  return {
    load,
    save,
    getState,
    resetToDefaults
  };
})();

// ------------------------------------------------------------------------------
// MODULE 3: PURE MATHEMATICAL CALCULATION ENGINE
// (Separated from UI rendering as requested in Developer Control guidelines)
// ------------------------------------------------------------------------------
const SpendWiseCalculations = (function () {

  /**
   * Filters transactions strictly by month (format: YYYY-MM)
   */
  function filterByMonth(records, monthStr) {
    if (!monthStr || !Array.isArray(records)) return [];
    return records.filter(item => item.date && item.date.startsWith(monthStr));
  }

  /**
   * Sums numeric amounts in a transaction list
   */
  function sumAmounts(records) {
    if (!Array.isArray(records)) return 0;
    return records.reduce((acc, curr) => acc + (Number(curr.amount) || 0), 0);
  }

  /**
   * Calculates Total Monthly Expenses (Strictly expenses; income is NEVER included)
   */
  function getMonthlyExpensesTotal(expenses, monthStr) {
    const list = filterByMonth(expenses, monthStr);
    return sumAmounts(list);
  }

  /**
   * Calculates Total Monthly Income
   */
  function getMonthlyIncomeTotal(income, monthStr) {
    const list = filterByMonth(income, monthStr);
    return sumAmounts(list);
  }

  /**
   * Calculates Remaining Budget Formula:
   * Remaining Budget = Monthly Budget - Monthly Expenses (Same Month)
   * Note: Shows negative remaining amounts when expenses exceed budget.
   */
  function calculateRemainingBudget(monthlyBudget, totalExpenses) {
    const b = Number(monthlyBudget) || 0;
    const e = Number(totalExpenses) || 0;
    return b - e;
  }

  /**
   * Calculates Budget Usage Percentage:
   * Budget Usage % = (Monthly Expenses / Monthly Budget) * 100
   * Safe when budget is zero.
   */
  function calculateBudgetUsagePercent(monthlyBudget, totalExpenses) {
    const b = Number(monthlyBudget) || 0;
    const e = Number(totalExpenses) || 0;
    if (b <= 0) return 0;
    return Math.round((e / b) * 100);
  }

  /**
   * Determines budget status indicator ('safe', 'warning', 'danger')
   */
  function getBudgetStatus(usagePercent, budget) {
    if (!budget || budget <= 0) return 'safe';
    if (usagePercent >= Config.BUDGET_THRESHOLDS.DANGER) return 'danger';
    if (usagePercent >= Config.BUDGET_THRESHOLDS.WARNING) return 'warning';
    return 'safe';
  }

  /**
   * Category-wise spending breakdown for a specific month
   * Returns: { [categoryName]: totalAmount }
   */
  function getCategoryBreakdown(expenses, monthStr) {
    const list = filterByMonth(expenses, monthStr);
    const breakdown = {};
    list.forEach(item => {
      const cat = item.category || 'Other';
      breakdown[cat] = (breakdown[cat] || 0) + (Number(item.amount) || 0);
    });
    return breakdown;
  }

  /**
   * Checks if a date falls in current calendar week (Monday to Sunday)
   */
  function isDateInCurrentWeek(dateStr) {
    if (!dateStr) return false;
    const target = new Date(dateStr + 'T00:00:00');
    const now = new Date();
    const day = now.getDay();
    const diffToMonday = now.getDate() - day + (day === 0 ? -6 : 1);
    const monday = new Date(now.setDate(diffToMonday));
    monday.setHours(0, 0, 0, 0);

    const sunday = new Date(monday);
    sunday.setDate(monday.getDate() + 6);
    sunday.setHours(23, 59, 59, 999);

    return target >= monday && target <= sunday;
  }

  /**
   * Calculates Today's Spending
   */
  function getTodaySpending(expenses, todayStr) {
    return sumAmounts(expenses.filter(e => e.date === todayStr));
  }

  /**
   * Calculates This Week's Spending
   */
  function getWeekSpending(expenses) {
    return sumAmounts(expenses.filter(e => isDateInCurrentWeek(e.date)));
  }

  /**
   * Calculates Average Daily Spending
   */
  function getAverageDailySpending(monthlyTotal, monthStr, todayStr) {
    let days = 30;
    if (todayStr && monthStr === todayStr.substring(0, 7)) {
      days = Math.max(new Date().getDate(), 1);
    }
    return monthlyTotal / days;
  }

  /**
   * Finds the highest individual expense in a given month
   */
  function getHighestExpense(expenses, monthStr) {
    const list = filterByMonth(expenses, monthStr);
    if (list.length === 0) return null;
    let maxItem = list[0];
    list.forEach(item => {
      if ((Number(item.amount) || 0) > (Number(maxItem.amount) || 0)) {
        maxItem = item;
      }
    });
    return maxItem;
  }

  return {
    filterByMonth,
    sumAmounts,
    getMonthlyExpensesTotal,
    getMonthlyIncomeTotal,
    calculateRemainingBudget,
    calculateBudgetUsagePercent,
    getBudgetStatus,
    getCategoryBreakdown,
    isDateInCurrentWeek,
    getTodaySpending,
    getWeekSpending,
    getAverageDailySpending,
    getHighestExpense
  };
})();

// ------------------------------------------------------------------------------
// MODULE 4: CHART.JS VISUALIZATION ENGINE
// ------------------------------------------------------------------------------
const SpendWiseCharts = (function () {
  const instances = {
    categoryPie: null,
    incomeVsExpense: null,
    monthlyTrend: null,
    budgetVsActual: null,
    categoryBudget: null
  };

  function destroyChart(key) {
    if (instances[key]) {
      instances[key].destroy();
      instances[key] = null;
    }
  }

  /**
   * Chart 1: Category-wise Spending Doughnut Chart
   */
  function renderCategoryPie(canvasId, catBreakdown, currencySymbol, isDarkTheme) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart('categoryPie');

    const labels = Object.keys(catBreakdown);
    const data = Object.values(catBreakdown);

    if (labels.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText('No expenses recorded for this month', canvas.width / 2, canvas.height / 2);
      return;
    }

    instances.categoryPie = new Chart(canvas, {
      type: 'doughnut',
      data: {
        labels: labels,
        datasets: [{
          data: data,
          backgroundColor: Config.CHART_COLORS.slice(0, labels.length),
          borderWidth: 2,
          borderColor: isDarkTheme ? '#131a29' : '#ffffff'
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: {
            position: 'bottom',
            labels: {
              boxWidth: 12,
              font: { family: 'Inter', size: 11 },
              color: isDarkTheme ? '#f8fafc' : '#0f172a'
            }
          },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${currencySymbol}${Number(ctx.parsed).toLocaleString('en-IN', { minimumFractionDigits: 2 })}`
            }
          }
        },
        cutout: '62%'
      }
    });
  }

  /**
   * Chart 2: Income vs Expense Grouped Bar Chart
   */
  function renderIncomeVsExpense(canvasId, labels, incomeData, expenseData, currencySymbol) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart('incomeVsExpense');

    instances.incomeVsExpense = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [
          { label: 'Total Income', data: incomeData, backgroundColor: '#10b981', borderRadius: 6 },
          { label: 'Money Spent', data: expenseData, backgroundColor: '#f59e0b', borderRadius: 6 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${currencySymbol}${Number(ctx.parsed.y).toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (val) => `${currencySymbol}${val}` }
          }
        }
      }
    });
  }

  /**
   * Chart 3: Monthly Spending Trend Bar Chart
   */
  function renderMonthlyTrend(canvasId, labels, expenseData, currencySymbol) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart('monthlyTrend');

    instances.monthlyTrend = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: labels,
        datasets: [{
          label: 'Money Spent',
          data: expenseData,
          backgroundColor: '#3b82f6',
          borderRadius: 6
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` Spent: ${currencySymbol}${Number(ctx.parsed.y).toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (val) => `${currencySymbol}${val}` }
          }
        }
      }
    });
  }

  /**
   * Chart 4: Planned Budget vs Actual Spending Comparison
   */
  function renderBudgetVsActual(canvasId, planned, actual, currencySymbol) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart('budgetVsActual');

    instances.budgetVsActual = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: ['Planned Budget', 'Actual Spent'],
        datasets: [{
          data: [planned, actual],
          backgroundColor: [
            '#3b82f6',
            actual > planned && planned > 0 ? '#ef4444' : '#10b981'
          ],
          borderRadius: 8,
          barThickness: 45
        }]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.label}: ${currencySymbol}${Number(ctx.parsed.y).toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (val) => `${currencySymbol}${val}` }
          }
        }
      }
    });
  }

  /**
   * Chart 5: Category Planned Cap vs Actual Spending
   */
  function renderCategoryBudgetComparison(canvasId, categories, plannedData, actualData, currencySymbol) {
    const canvas = document.getElementById(canvasId);
    if (!canvas) return;
    destroyChart('categoryBudget');

    if (categories.length === 0) {
      const ctx = canvas.getContext('2d');
      ctx.clearRect(0, 0, canvas.width, canvas.height);
      ctx.font = '14px Inter, sans-serif';
      ctx.fillStyle = '#94a3b8';
      ctx.textAlign = 'center';
      ctx.fillText('No category allocations or spending recorded', canvas.width / 2, canvas.height / 2);
      return;
    }

    instances.categoryBudget = new Chart(canvas, {
      type: 'bar',
      data: {
        labels: categories,
        datasets: [
          { label: 'Planned Cap', data: plannedData, backgroundColor: '#93c5fd', borderRadius: 5 },
          { label: 'Actual Spent', data: actualData, backgroundColor: '#f59e0b', borderRadius: 5 }
        ]
      },
      options: {
        responsive: true,
        maintainAspectRatio: false,
        plugins: {
          legend: { position: 'top' },
          tooltip: {
            callbacks: {
              label: (ctx) => ` ${ctx.dataset.label}: ${currencySymbol}${Number(ctx.parsed.y).toLocaleString('en-IN')}`
            }
          }
        },
        scales: {
          y: {
            beginAtZero: true,
            ticks: { callback: (val) => `${currencySymbol}${val}` }
          }
        }
      }
    });
  }

  return {
    renderCategoryPie,
    renderIncomeVsExpense,
    renderMonthlyTrend,
    renderBudgetVsActual,
    renderCategoryBudgetComparison
  };
})();

// ------------------------------------------------------------------------------
// MODULE 5: MASTER APPLICATION CONTROLLER (SpendWiseApp)
// ------------------------------------------------------------------------------
const SpendWiseApp = (function () {
  let state = null;
  let activeMonth = '';
  let pendingConfirmAction = null;
  let previouslyFocusedElement = null;

  // ----------------------------------------------------------------------------
  // HELPER FORMATTERS
  // ----------------------------------------------------------------------------
  function getTodayString() {
    const d = new Date();
    const y = d.getFullYear();
    const m = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${y}-${m}-${day}`;
  }

  function getCurrencySymbol() {
    const code = state.userPreferences.currency || 'INR';
    return Config.CURRENCIES[code] ? Config.CURRENCIES[code].symbol : '₹';
  }

  function formatMoney(amount, currencyCode = null) {
    const code = currencyCode || state.userPreferences.currency || 'INR';
    const sym = Config.CURRENCIES[code] ? Config.CURRENCIES[code].symbol : '₹';
    const num = Number(amount) || 0;
    return `${sym}${num.toLocaleString('en-IN', { minimumFractionDigits: 2, maximumFractionDigits: 2 })}`;
  }

  function formatDisplayDate(dateStr) {
    if (!dateStr) return '--';
    const parts = dateStr.split('-');
    if (parts.length !== 3) return dateStr;
    const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];
    return `${parts[2]} ${months[parseInt(parts[1], 10) - 1] || parts[1]} ${parts[0]}`;
  }

  function formatMonthName(monthStr) {
    if (!monthStr) return '--';
    const parts = monthStr.split('-');
    if (parts.length !== 2) return monthStr;
    const fullMonths = ['January', 'February', 'March', 'April', 'May', 'June', 'July', 'August', 'September', 'October', 'November', 'December'];
    return `${fullMonths[parseInt(parts[1], 10) - 1] || parts[1]} ${parts[0]}`;
  }

  function generateUniqueId(prefix = 'tx') {
    return `${prefix}_${Date.now()}_${Math.random().toString(36).substring(2, 8)}`;
  }

  function escapeHTML(str) {
    if (!str) return '';
    return String(str)
      .replace(/&/g, '&amp;')
      .replace(/</g, '&lt;')
      .replace(/>/g, '&gt;')
      .replace(/"/g, '&quot;')
      .replace(/'/g, '&#039;');
  }

  function iconSvg(name, size = 18) {
    const paths = {
      activity: '<path d="M3 12h4l3-8 4 16 3-8h4"></path>',
      chart: '<path d="M3 3v18h18"></path><path d="m19 9-5 5-4-4-5 5"></path>',
      target: '<circle cx="12" cy="12" r="9"></circle><circle cx="12" cy="12" r="4"></circle><path d="m12 12 6-6"></path>',
      warning: '<path d="m10.3 3.9-8 14A2 2 0 0 0 4 21h16a2 2 0 0 0 1.7-3.1l-8-14a2 2 0 0 0-3.4 0Z"></path><path d="M12 9v4"></path><path d="M12 17h.01"></path>',
      lightbulb: '<path d="M9 18h6"></path><path d="M10 22h4"></path><path d="M15.1 14.5A6 6 0 1 0 8.9 14.5c.7.6 1.1 1.2 1.1 2.5h4c0-1.3.4-1.9 1.1-2.5Z"></path>',
      trendUp: '<path d="m3 17 6-6 4 4 8-8"></path><path d="M15 7h6v6"></path>',
      trendDown: '<path d="m3 7 6 6 4-4 8 8"></path><path d="M15 17h6v-6"></path>',
      student: '<path d="m2 10 10-5 10 5-10 5-10-5Z"></path><path d="M6 12v5c3.5 2.5 8.5 2.5 12 0v-5"></path><path d="M22 10v6"></path>',
      expense: '<path d="M12 5v14"></path><path d="m19 12-7 7-7-7"></path>',
      income: '<path d="M12 19V5"></path><path d="m5 12 7-7 7 7"></path>',
      edit: '<path d="m15 5 4 4"></path><path d="m4 20 4-.8L19 8a2.1 2.1 0 0 0-3-3L5 16l-1 4Z"></path>',
      trash: '<path d="M3 6h18"></path><path d="M8 6V4h8v2"></path><path d="m19 6-1 14H6L5 6"></path><path d="M10 11v5m4-5v5"></path>',
      check: '<path d="m5 12 4 4L19 6"></path>',
      moon: '<path d="M20.9 13A9 9 0 0 1 11 3.1 9 9 0 1 0 20.9 13Z"></path>',
      sun: '<circle cx="12" cy="12" r="4"></circle><path d="M12 2v2m0 16v2M4.93 4.93l1.42 1.42m11.3 11.3 1.42 1.42M2 12h2m16 0h2M4.93 19.07l1.42-1.42m11.3-11.3 1.42-1.42"></path>'
    };
    const path = paths[name];
    if (!path) throw new Error(`Unknown SpendWise icon: ${name}`);
    return `<svg viewBox="0 0 24 24" width="${size}" height="${size}" fill="none" stroke="currentColor" stroke-width="1.8" stroke-linecap="round" stroke-linejoin="round" aria-hidden="true" focusable="false">${path}</svg>`;
  }

  // ----------------------------------------------------------------------------
  // CATEGORIES RESOLUTION
  // ----------------------------------------------------------------------------
  function getActiveCategories() {
    const base = state.userPreferences.studentMode ? Config.STUDENT_CATEGORIES : Config.STANDARD_CATEGORIES;
    const combined = [...base];
    state.customCategories.forEach(c => {
      if (!combined.includes(c)) combined.push(c);
    });
    return combined;
  }

  function populateCategoryDropdowns() {
    const categories = getActiveCategories();

    // 1. Expense Modal Select
    const expSelect = document.getElementById('expenseCategory');
    if (expSelect) {
      const current = expSelect.value;
      expSelect.innerHTML = categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
      if (categories.includes(current)) expSelect.value = current;
    }

    // 2. Expense Filter Dropdown
    const expFilter = document.getElementById('expenseCategoryFilter');
    if (expFilter) {
      const current = expFilter.value;
      expFilter.innerHTML = '<option value="ALL">All Categories</option>' +
        categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
      if (current && (current === 'ALL' || categories.includes(current))) expFilter.value = current;
    }

    // 3. Category Budget Selector
    const catBudgetSelect = document.getElementById('catBudgetCategorySelect');
    if (catBudgetSelect) {
      catBudgetSelect.innerHTML = categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
    }

    // 4. History Filter
    const histFilter = document.getElementById('historyCategoryFilter');
    if (histFilter) {
      const current = histFilter.value;
      histFilter.innerHTML = '<option value="ALL">All Categories / Sources</option>' +
        categories.map(c => `<option value="${escapeHTML(c)}">${escapeHTML(c)}</option>`).join('');
      if (current) histFilter.value = current;
    }

    renderCustomCategoriesList();
  }

  // ----------------------------------------------------------------------------
  // LIVE DASHBOARD RENDERING (100% Dynamic - Zero Hardcoding)
  // ----------------------------------------------------------------------------
  function updateDashboard() {
    const month = activeMonth;
    const todayStr = getTodayString();

    // 1. Retrieve Dynamic Calculations
    const monthlyBudget = Number(state.monthlyBudgets[month]) || 0;
    const moneySpent = SpendWiseCalculations.getMonthlyExpensesTotal(state.expenses, month);
    const totalIncome = SpendWiseCalculations.getMonthlyIncomeTotal(state.income, month);
    const moneyLeft = SpendWiseCalculations.calculateRemainingBudget(monthlyBudget, moneySpent);
    const usagePercent = SpendWiseCalculations.calculateBudgetUsagePercent(monthlyBudget, moneySpent);
    const budgetStatus = SpendWiseCalculations.getBudgetStatus(usagePercent, monthlyBudget);

    // 2. Update Greeting & Date
    const user = state.userPreferences.userName || 'Student';
    const headGreet = document.getElementById('headerUserName');
    if (headGreet) headGreet.textContent = user;

    const dateElem = document.getElementById('currentDateDisplay');
    if (dateElem) dateElem.textContent = formatDisplayDate(todayStr);

    const monthInput = document.getElementById('dashMonthSelect');
    if (monthInput && monthInput.value !== month) monthInput.value = month;

    // 3. Update Metric Cards
    // A. Total Income
    const incElem = document.getElementById('dashTotalIncome');
    const incSub = document.getElementById('dashIncomeCount');
    if (incElem) incElem.textContent = formatMoney(totalIncome);
    if (incSub) {
      const count = SpendWiseCalculations.filterByMonth(state.income, month).length;
      incSub.textContent = `${count} income ${count === 1 ? 'entry' : 'entries'} in ${formatMonthName(month)}`;
    }

    // B. Monthly Budget
    const budElem = document.getElementById('dashMonthlyBudget');
    const budSub = document.getElementById('dashBudgetStatusText');
    if (budElem) budElem.textContent = formatMoney(monthlyBudget);
    if (budSub) {
      budSub.textContent = monthlyBudget > 0
        ? `Planned ceiling for ${formatMonthName(month)}`
        : 'No budget set (Click Set Monthly Budget)';
    }

    // C. Money Spent
    const spentElem = document.getElementById('dashMoneySpent');
    const spentSub = document.getElementById('dashExpenseCount');
    if (spentElem) spentElem.textContent = formatMoney(moneySpent);
    if (spentSub) {
      const count = SpendWiseCalculations.filterByMonth(state.expenses, month).length;
      spentSub.textContent = `${count} ${count === 1 ? 'expense' : 'expenses'} recorded`;
    }

    // D. Money Left (Handles Negative Overspent Amounts)
    const leftElem = document.getElementById('dashMoneyLeft');
    const leftHint = document.getElementById('dashMoneyLeftHint');
    if (leftElem && leftHint) {
      if (monthlyBudget > 0) {
        if (moneyLeft >= 0) {
          leftElem.textContent = formatMoney(moneyLeft);
          leftElem.className = 'metric-value text-green';
          leftHint.textContent = 'Remaining budget to spend';
        } else {
          // Negative remaining money display
          leftElem.textContent = `-${formatMoney(Math.abs(moneyLeft))}`;
          leftElem.className = 'metric-value text-danger';
          leftHint.textContent = `Over budget by ${formatMoney(Math.abs(moneyLeft))}!`;
        }
      } else {
        // Fallback to cash flow balance when budget is zero
        const balance = totalIncome - moneySpent;
        leftElem.textContent = balance >= 0 ? formatMoney(balance) : `-${formatMoney(Math.abs(balance))}`;
        leftElem.className = balance >= 0 ? 'metric-value text-blue' : 'metric-value text-danger';
        leftHint.textContent = 'Cash balance (Income - Spending)';
      }
    }

    // 4. Update Progress Bar & Alert Banner
    const pBar = document.getElementById('dashProgressBar');
    const pBadge = document.getElementById('dashUsagePercentBadge');
    const pMonth = document.getElementById('dashProgressMonth');
    if (pMonth) pMonth.textContent = formatMonthName(month);

    if (pBar && pBadge) {
      const capped = Math.min(usagePercent, 100);
      pBar.style.width = `${capped}%`;
      pBar.setAttribute('aria-valuenow', capped);
      pBar.className = `progress-bar-fill ${budgetStatus}`;
      pBadge.textContent = `${usagePercent}% Used`;
      pBadge.className = `usage-percentage-badge ${budgetStatus}`;
    }

    const banner = document.getElementById('globalBudgetBanner');
    const bText = document.getElementById('budgetBannerText');
    const bIcon = document.getElementById('budgetBannerIcon');
    if (banner && bText && bIcon) {
      if (monthlyBudget > 0 && usagePercent >= Config.BUDGET_THRESHOLDS.DANGER) {
        banner.style.display = 'block';
        banner.className = 'budget-alert-banner danger';
        bIcon.innerHTML = iconSvg('warning', 20);
        bText.textContent = `ALERT: You have exceeded your monthly budget for ${formatMonthName(month)} by ${formatMoney(Math.abs(moneyLeft))}!`;
      } else if (monthlyBudget > 0 && usagePercent >= Config.BUDGET_THRESHOLDS.WARNING) {
        banner.style.display = 'block';
        banner.className = 'budget-alert-banner';
        bIcon.innerHTML = iconSvg('warning', 20);
        bText.textContent = `WARNING: You have used ${usagePercent}% of your planned budget for ${formatMonthName(month)}. Spend cautiously!`;
      } else {
        banner.style.display = 'none';
      }
    }

    // 5. Update Student Card & Spending Summaries
    updateStudentCard(month, moneySpent);
    updateSpendingSummaries(month, moneySpent, todayStr);
    renderRecentTransactions();
  }

  function updateStudentCard(month, moneySpent) {
    const card = document.getElementById('studentSummaryCard');
    if (!card) return;

    if (!state.userPreferences.studentMode) {
      card.style.display = 'none';
      return;
    }
    card.style.display = 'block';

    const pocketMoneyIncome = state.income
      .filter(i => i.date && i.date.startsWith(month) && (i.source === 'Pocket Money' || i.source === 'Scholarship'))
      .reduce((s, i) => s + (Number(i.amount) || 0), 0);

    const remainingPocket = pocketMoneyIncome - moneySpent;
    const ratio = pocketMoneyIncome > 0 ? Math.round((moneySpent / pocketMoneyIncome) * 100) : 0;

    const pmElem = document.getElementById('studentPocketMoney');
    const spElem = document.getElementById('studentMoneySpent');
    const remElem = document.getElementById('studentMoneyRemaining');
    const ratElem = document.getElementById('studentSpendRatio');

    if (pmElem) pmElem.textContent = formatMoney(pocketMoneyIncome);
    if (spElem) spElem.textContent = formatMoney(moneySpent);
    if (remElem) {
      remElem.textContent = remainingPocket >= 0 ? formatMoney(remainingPocket) : `-${formatMoney(Math.abs(remainingPocket))}`;
      remElem.className = remainingPocket >= 0 ? 's-val text-green' : 's-val text-danger';
    }
    if (ratElem) ratElem.textContent = `${ratio}%`;
  }

  function updateSpendingSummaries(month, monthExpenses, todayStr) {
    const todaySpent = SpendWiseCalculations.getTodaySpending(state.expenses, todayStr);
    const weekSpent = SpendWiseCalculations.getWeekSpending(state.expenses);
    const avgDaily = SpendWiseCalculations.getAverageDailySpending(monthExpenses, month, todayStr);
    const highest = SpendWiseCalculations.getHighestExpense(state.expenses, month);

    const todayElem = document.getElementById('dashTodaySpending');
    const weekElem = document.getElementById('dashWeekSpending');
    const monthElem = document.getElementById('dashMonthSpending');
    const monthLbl = document.getElementById('monthSummaryLabel');
    const avgElem = document.getElementById('dashAvgDailySpending');
    const highAmt = document.getElementById('dashHighestExpenseAmount');
    const highDesc = document.getElementById('dashHighestExpenseDesc');

    if (todayElem) todayElem.textContent = formatMoney(todaySpent);
    if (weekElem) weekElem.textContent = formatMoney(weekSpent);
    if (monthElem) monthElem.textContent = formatMoney(monthExpenses);
    if (monthLbl) monthLbl.textContent = formatMonthName(month);
    if (avgElem) avgElem.textContent = `${formatMoney(avgDaily)} / day`;

    if (highAmt && highDesc) {
      if (highest) {
        highAmt.textContent = formatMoney(highest.amount, highest.currency);
        highDesc.textContent = `${highest.description} (${formatDisplayDate(highest.date)})`;
      } else {
        highAmt.textContent = formatMoney(0);
        highDesc.textContent = 'None recorded this month';
      }
    }
  }

  function renderRecentTransactions() {
    const container = document.getElementById('dashRecentTransactionsList');
    if (!container) return;

    const combined = [
      ...state.expenses.map(e => Object.assign({}, e, { type: 'expense' })),
      ...state.income.map(i => Object.assign({}, i, { type: 'income' }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    const recent = combined.slice(0, 5);

    if (recent.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 1.5rem 0;">
          <div class="empty-icon">${iconSvg('activity', 24)}</div>
          <p>No activity yet. Add your first transaction to start building a clear picture of your spending.</p>
          <button class="btn btn-outline btn-sm" onclick="SpendWiseApp.openAddExpenseModal()">Add your first expense</button>
        </div>
      `;
      return;
    }

    container.innerHTML = recent.map(tx => {
      const isExp = tx.type === 'expense';
      const icon = iconSvg(isExp ? 'expense' : 'income', 18);
      const cat = isExp ? tx.category : tx.source;
      const sign = isExp ? '-' : '+';
      const color = isExp ? 'text-amber' : 'text-green';

      return `
        <div class="transaction-mini-item">
          <div class="t-left">
            <div class="t-icon-box">${icon}</div>
            <div>
              <div class="t-title">${escapeHTML(tx.description)}</div>
              <div class="t-meta">${formatDisplayDate(tx.date)} • <span class="category-tag">${escapeHTML(cat || '—')}</span></div>
            </div>
          </div>
          <div class="t-amount ${color}">
            ${sign}${formatMoney(tx.amount, tx.currency)}
          </div>
        </div>
      `;
    }).join('');
  }

  // ----------------------------------------------------------------------------
  // EXPENSE MANAGEMENT (CRUD & LIVE FILTERING)
  // ----------------------------------------------------------------------------
  function openAddExpenseModal(expenseId = null) {
    const modal = document.getElementById('expenseModal');
    const form = document.getElementById('expenseForm');
    const title = document.getElementById('expenseModalTitle');
    const editIdInput = document.getElementById('expenseEditId');
    const submitBtn = document.getElementById('expenseSubmitBtn');

    form.reset();
    populateCategoryDropdowns();

    if (expenseId) {
      const item = state.expenses.find(e => e.id === expenseId);
      if (item) {
        title.textContent = 'Edit Expense';
        submitBtn.textContent = 'Update Expense';
        editIdInput.value = item.id;
        document.getElementById('expenseDescription').value = item.description;
        document.getElementById('expenseAmount').value = item.amount;
        document.getElementById('expenseCategory').value = item.category;
        document.getElementById('expenseDate').value = item.date;
        document.getElementById('expenseCurrency').value = item.currency || state.userPreferences.currency;
        document.getElementById('expenseNotes').value = item.notes || '';
      }
    } else {
      title.textContent = 'Record Daily Expense';
      submitBtn.textContent = 'Save Expense';
      editIdInput.value = '';
      document.getElementById('expenseDate').value = getTodayString();
      document.getElementById('expenseCurrency').value = state.userPreferences.currency;
    }

    updateModalCurrencyPrefixes();
    openModal(modal);
    document.getElementById('expenseDescription').focus();
  }

  function handleExpenseSubmit(event) {
    event.preventDefault();

    const editId = document.getElementById('expenseEditId').value.trim();
    const description = document.getElementById('expenseDescription').value.trim();
    const amountVal = parseFloat(document.getElementById('expenseAmount').value);
    const category = document.getElementById('expenseCategory').value;
    const date = document.getElementById('expenseDate').value;
    const currency = document.getElementById('expenseCurrency').value;
    const notes = document.getElementById('expenseNotes').value.trim();

    // STRICT VALIDATION
    if (!description) {
      showToast('Please enter an expense description.', 'error');
      return;
    }
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Expense amount must be strictly greater than zero.', 'error');
      return;
    }
    if (!date) {
      showToast('Please select a valid date.', 'error');
      return;
    }

    if (editId) {
      const idx = state.expenses.findIndex(e => e.id === editId);
      if (idx !== -1) {
        state.expenses[idx] = Object.assign({}, state.expenses[idx], {
          description,
          amount: Number(amountVal.toFixed(2)),
          category,
          date,
          currency,
          notes,
          updatedAt: new Date().toISOString()
        });
        showToast('Expense updated successfully!', 'success');
      }
    } else {
      const newExp = {
        id: generateUniqueId('exp'),
        description,
        amount: Number(amountVal.toFixed(2)),
        category,
        date,
        currency,
        notes,
        type: 'expense',
        createdAt: new Date().toISOString()
      };
      state.expenses.unshift(newExp);
      showToast(`Recorded ${formatMoney(amountVal, currency)} for ${description}`, 'success');
    }

    SpendWiseStorage.save();
    closeModal('expenseModal');
    refreshAllViews();
  }

  function quickAddExpense(desc, amount, category) {
    let finalCat = category;
    if (state.userPreferences.studentMode) {
      if (category === 'Food') finalCat = 'Food and Snacks';
      if (category === 'Education') finalCat = 'Books and Stationery';
    }

    const newExp = {
      id: generateUniqueId('quick_exp'),
      description: desc,
      amount: Number(amount),
      category: finalCat,
      date: getTodayString(),
      currency: state.userPreferences.currency,
      notes: '1-tap quick recorded expense',
      type: 'expense',
      createdAt: new Date().toISOString()
    };

    state.expenses.unshift(newExp);
    SpendWiseStorage.save();
    showToast(`Quick Added: ${desc} (${formatMoney(amount)})`, 'success');
    refreshAllViews();
  }

  function filterExpenses() {
    const search = (document.getElementById('expenseSearchInput')?.value || '').toLowerCase().trim();
    const cat = document.getElementById('expenseCategoryFilter')?.value || 'ALL';
    const period = document.getElementById('expenseTimeFilter')?.value || 'month';
    const customDate = document.getElementById('expenseCustomDate')?.value || '';
    const todayStr = getTodayString();

    const filtered = state.expenses.filter(item => {
      const matchSearch = !search ||
        item.description.toLowerCase().includes(search) ||
        (item.notes && item.notes.toLowerCase().includes(search));

      const matchCat = (cat === 'ALL') || (item.category === cat);

      if (customDate) {
        return matchSearch && matchCat && (item.date === customDate);
      }

      let matchPeriod = true;
      if (period === 'today') matchPeriod = item.date === todayStr;
      else if (period === 'week') matchPeriod = SpendWiseCalculations.isDateInCurrentWeek(item.date);
      else if (period === 'month') matchPeriod = item.date && item.date.startsWith(activeMonth);

      return matchSearch && matchCat && matchPeriod;
    });

    renderExpensesTable(filtered);
  }

  function renderExpensesTable(list) {
    const tbody = document.getElementById('expensesTableBody');
    const empty = document.getElementById('expensesEmptyState');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    tbody.innerHTML = list.map(item => `
      <tr>
        <td><strong>${formatDisplayDate(item.date)}</strong></td>
        <td>
          <span class="font-bold">${escapeHTML(item.description)}</span>
          ${item.isDemo ? '<span class="badge-tag" style="margin-left: 6px;">Demo</span>' : ''}
        </td>
        <td><span class="category-tag">${escapeHTML(item.category || 'Other')}</span></td>
        <td class="text-muted" style="max-width: 220px; font-size: 0.8rem;">${escapeHTML(item.notes || '—')}</td>
        <td class="text-right font-bold text-amber">${formatMoney(item.amount, item.currency)}</td>
        <td class="text-center">
          <button class="table-action-btn" aria-label="Edit expense: ${escapeHTML(item.description)}" title="Edit Expense" onclick="SpendWiseApp.openAddExpenseModal('${item.id}')">${iconSvg('edit', 16)}</button>
          <button class="table-action-btn delete-btn" aria-label="Delete expense: ${escapeHTML(item.description)}" title="Delete Expense" onclick="SpendWiseApp.confirmDeleteExpense('${item.id}')">${iconSvg('trash', 16)}</button>
        </td>
      </tr>
    `).join('');
  }

  function resetExpenseFilters() {
    const s = document.getElementById('expenseSearchInput');
    const c = document.getElementById('expenseCategoryFilter');
    const t = document.getElementById('expenseTimeFilter');
    const d = document.getElementById('expenseCustomDate');
    if (s) s.value = '';
    if (c) c.value = 'ALL';
    if (t) t.value = 'month';
    if (d) d.value = '';
    filterExpenses();
  }

  function confirmDeleteExpense(expenseId) {
    const item = state.expenses.find(e => e.id === expenseId);
    if (!item) return;

    openConfirmModal(
      'Delete Expense',
      `Delete "${escapeHTML(item.description)}" (${formatMoney(item.amount, item.currency)})? This cannot be undone.`,
      () => {
        state.expenses = state.expenses.filter(e => e.id !== expenseId);
        SpendWiseStorage.save();
        showToast('Expense deleted successfully.', 'success');
        refreshAllViews();
      }
    );
  }

  // ----------------------------------------------------------------------------
  // INCOME MANAGEMENT (CRUD & LIVE FILTERING)
  // ----------------------------------------------------------------------------
  function openAddIncomeModal(incomeId = null) {
    const modal = document.getElementById('incomeModal');
    const form = document.getElementById('incomeForm');
    const title = document.getElementById('incomeModalTitle');
    const editIdInput = document.getElementById('incomeEditId');
    const submitBtn = document.getElementById('incomeSubmitBtn');

    form.reset();

    if (incomeId) {
      const item = state.income.find(i => i.id === incomeId);
      if (item) {
        title.textContent = 'Edit Income';
        submitBtn.textContent = 'Update Income';
        editIdInput.value = item.id;
        document.getElementById('incomeDescription').value = item.description;
        document.getElementById('incomeAmount').value = item.amount;
        document.getElementById('incomeSource').value = item.source;
        document.getElementById('incomeDate').value = item.date;
        document.getElementById('incomeNotes').value = item.notes || '';
      }
    } else {
      title.textContent = 'Record Income';
      submitBtn.textContent = 'Save Income';
      editIdInput.value = '';
      document.getElementById('incomeDate').value = getTodayString();
    }

    updateModalCurrencyPrefixes();
    openModal(modal);
    document.getElementById('incomeDescription').focus();
  }

  function handleIncomeSubmit(event) {
    event.preventDefault();

    const editId = document.getElementById('incomeEditId').value.trim();
    const description = document.getElementById('incomeDescription').value.trim();
    const amountVal = parseFloat(document.getElementById('incomeAmount').value);
    const source = document.getElementById('incomeSource').value;
    const date = document.getElementById('incomeDate').value;
    const notes = document.getElementById('incomeNotes').value.trim();

    if (!description) {
      showToast('Please enter an income description.', 'error');
      return;
    }
    if (isNaN(amountVal) || amountVal <= 0) {
      showToast('Income amount must be greater than zero.', 'error');
      return;
    }
    if (!date) {
      showToast('Please select a valid date.', 'error');
      return;
    }

    if (editId) {
      const idx = state.income.findIndex(i => i.id === editId);
      if (idx !== -1) {
        state.income[idx] = Object.assign({}, state.income[idx], {
          description,
          amount: Number(amountVal.toFixed(2)),
          source,
          date,
          notes,
          updatedAt: new Date().toISOString()
        });
        showToast('Income record updated!', 'success');
      }
    } else {
      const newInc = {
        id: generateUniqueId('inc'),
        description,
        amount: Number(amountVal.toFixed(2)),
        source,
        date,
        notes,
        type: 'income',
        createdAt: new Date().toISOString()
      };
      state.income.unshift(newInc);
      showToast(`Added income: ${description} (${formatMoney(amountVal)})`, 'success');
    }

    SpendWiseStorage.save();
    closeModal('incomeModal');
    refreshAllViews();
  }

  function filterIncome() {
    const search = (document.getElementById('incomeSearchInput')?.value || '').toLowerCase().trim();
    const source = document.getElementById('incomeSourceFilter')?.value || 'ALL';

    const filtered = state.income.filter(item => {
      const matchSearch = !search ||
        item.description.toLowerCase().includes(search) ||
        (item.notes && item.notes.toLowerCase().includes(search));
      const matchSource = (source === 'ALL') || (item.source === source);
      return matchSearch && matchSource;
    });

    renderIncomeTable(filtered);
  }

  function renderIncomeTable(list) {
    const tbody = document.getElementById('incomeTableBody');
    const empty = document.getElementById('incomeEmptyState');
    if (!tbody) return;

    // Overview Stats
    const totalAllTime = SpendWiseCalculations.sumAmounts(state.income);
    const totalMonth = SpendWiseCalculations.getMonthlyIncomeTotal(state.income, activeMonth);

    const allElem = document.getElementById('incomeTotalAllTime');
    const monthElem = document.getElementById('incomeTotalThisMonth');
    const topElem = document.getElementById('incomeTopSource');

    if (allElem) allElem.textContent = formatMoney(totalAllTime);
    if (monthElem) monthElem.textContent = formatMoney(totalMonth);

    if (topElem) {
      const counts = {};
      state.income.forEach(i => { counts[i.source] = (counts[i.source] || 0) + (Number(i.amount) || 0); });
      let top = 'None';
      let maxVal = 0;
      Object.keys(counts).forEach(src => {
        if (counts[src] > maxVal) { maxVal = counts[src]; top = src; }
      });
      topElem.textContent = top;
    }

    if (!list || list.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    tbody.innerHTML = list.map(item => `
      <tr>
        <td><strong>${formatDisplayDate(item.date)}</strong></td>
        <td><span class="font-bold">${escapeHTML(item.description)}</span></td>
        <td><span class="category-tag text-green font-bold">${escapeHTML(item.source)}</span></td>
        <td class="text-muted" style="max-width: 220px; font-size: 0.8rem;">${escapeHTML(item.notes || '—')}</td>
        <td class="text-right font-bold text-green">+${formatMoney(item.amount)}</td>
        <td class="text-center">
          <button class="table-action-btn" aria-label="Edit income: ${escapeHTML(item.description)}" title="Edit Income" onclick="SpendWiseApp.openAddIncomeModal('${item.id}')">${iconSvg('edit', 16)}</button>
          <button class="table-action-btn delete-btn" aria-label="Delete income: ${escapeHTML(item.description)}" title="Delete Income" onclick="SpendWiseApp.confirmDeleteIncome('${item.id}')">${iconSvg('trash', 16)}</button>
        </td>
      </tr>
    `).join('');
  }

  function resetIncomeFilters() {
    const s = document.getElementById('incomeSearchInput');
    const src = document.getElementById('incomeSourceFilter');
    if (s) s.value = '';
    if (src) src.value = 'ALL';
    filterIncome();
  }

  function confirmDeleteIncome(incomeId) {
    const item = state.income.find(i => i.id === incomeId);
    if (!item) return;

    openConfirmModal(
      'Delete Income',
      `Delete income "${escapeHTML(item.description)}" (${formatMoney(item.amount)})?`,
      () => {
        state.income = state.income.filter(i => i.id !== incomeId);
        SpendWiseStorage.save();
        showToast('Income record removed.', 'success');
        refreshAllViews();
      }
    );
  }

  // ----------------------------------------------------------------------------
  // BUDGET PLANNER & CATEGORY CAPS
  // ----------------------------------------------------------------------------
  function openSetBudgetModal() {
    const modal = document.getElementById('budgetModal');
    const monthInput = document.getElementById('budgetMonthInput');
    const amountInput = document.getElementById('budgetAmountInput');

    monthInput.value = activeMonth;
    amountInput.value = state.monthlyBudgets[activeMonth] || '';

    updateModalCurrencyPrefixes();
    openModal(modal);
    amountInput.focus();
  }

  function handleBudgetSubmit(event) {
    event.preventDefault();

    const month = document.getElementById('budgetMonthInput').value;
    const amount = parseFloat(document.getElementById('budgetAmountInput').value);

    if (!month) {
      showToast('Please select a month.', 'error');
      return;
    }
    if (isNaN(amount) || amount < 0) {
      showToast('Please enter a valid budget amount (0 or positive).', 'error');
      return;
    }

    state.monthlyBudgets[month] = Number(amount.toFixed(2));
    activeMonth = month;
    SpendWiseStorage.save();
    closeModal('budgetModal');
    showToast(`Monthly budget of ${formatMoney(amount)} saved for ${formatMonthName(month)}!`, 'success');
    refreshAllViews();
  }

  function loadBudgetForSelectedMonth() {
    const picker = document.getElementById('budgetSelectMonth');
    if (picker && picker.value) activeMonth = picker.value;

    const display = document.getElementById('plannerMonthlyBudgetDisplay');
    const budget = state.monthlyBudgets[activeMonth] || 0;
    if (display) display.textContent = formatMoney(budget);

    renderCategoryBudgetsList();
  }

  function saveCategoryBudget() {
    const catSelect = document.getElementById('catBudgetCategorySelect');
    const amountInput = document.getElementById('catBudgetAmountInput');
    const cat = catSelect.value;
    const amount = parseFloat(amountInput.value);

    if (!cat) {
      showToast('Please select a category.', 'error');
      return;
    }
    if (isNaN(amount) || amount <= 0) {
      showToast('Please enter a valid positive cap amount.', 'error');
      return;
    }

    if (!state.categoryBudgets[activeMonth]) {
      state.categoryBudgets[activeMonth] = {};
    }

    state.categoryBudgets[activeMonth][cat] = Number(amount.toFixed(2));
    amountInput.value = '';
    SpendWiseStorage.save();
    showToast(`Assigned cap of ${formatMoney(amount)} to ${cat}`, 'success');
    renderCategoryBudgetsList();
    renderBudgetVsActual();
  }

  function deleteCategoryBudget(categoryName) {
    if (state.categoryBudgets[activeMonth] && state.categoryBudgets[activeMonth][categoryName]) {
      delete state.categoryBudgets[activeMonth][categoryName];
      SpendWiseStorage.save();
      showToast(`Removed cap for ${categoryName}`, 'success');
      renderCategoryBudgetsList();
      renderBudgetVsActual();
    }
  }

  function renderCategoryBudgetsList() {
    const container = document.getElementById('categoryBudgetsListContainer');
    if (!container) return;

    const allocations = state.categoryBudgets[activeMonth] || {};
    const keys = Object.keys(allocations);

    if (keys.length === 0) {
      container.innerHTML = `
        <div class="empty-state" style="padding: 1rem 0;">
          <p class="text-muted">No category caps defined for ${formatMonthName(activeMonth)}.</p>
        </div>
      `;
      return;
    }

    container.innerHTML = keys.map(cat => `
      <div class="category-budget-item">
        <span class="cat-b-name">${escapeHTML(cat)}</span>
        <div style="display: flex; align-items: center; gap: 0.75rem;">
          <span class="cat-b-amount">${formatMoney(allocations[cat])}</span>
          <button class="table-action-btn delete-btn" title="Delete Cap" onclick="SpendWiseApp.deleteCategoryBudget('${escapeHTML(cat)}')">✕</button>
        </div>
      </div>
    `).join('');
  }

  // ----------------------------------------------------------------------------
  // BUDGET VS ACTUAL SPENDING SECTION
  // ----------------------------------------------------------------------------
  function renderBudgetVsActual() {
    const picker = document.getElementById('bvaMonthSelect');
    if (picker && picker.value) activeMonth = picker.value;
    else if (picker) picker.value = activeMonth;

    const month = activeMonth;
    const budget = Number(state.monthlyBudgets[month]) || 0;
    const spent = SpendWiseCalculations.getMonthlyExpensesTotal(state.expenses, month);
    const remaining = SpendWiseCalculations.calculateRemainingBudget(budget, spent);
    const usage = SpendWiseCalculations.calculateBudgetUsagePercent(budget, spent);
    const status = SpendWiseCalculations.getBudgetStatus(usage, budget);

    const catPlanned = state.categoryBudgets[month] || {};
    const catSpending = SpendWiseCalculations.getCategoryBreakdown(state.expenses, month);

    // Cards
    const plannedElem = document.getElementById('bvaPlannedAmount');
    const actualElem = document.getElementById('bvaActualAmount');
    const remElem = document.getElementById('bvaRemainingAmount');
    const usageElem = document.getElementById('bvaUsagePercent');
    const statusBadge = document.getElementById('bvaStatusBadge');

    if (plannedElem) plannedElem.textContent = formatMoney(budget);
    if (actualElem) actualElem.textContent = formatMoney(spent);

    if (remElem) {
      if (remaining >= 0) {
        remElem.textContent = formatMoney(remaining);
        remElem.className = 'bva-amount text-green';
      } else {
        remElem.textContent = `-${formatMoney(Math.abs(remaining))}`;
        remElem.className = 'bva-amount text-danger';
      }
    }

    if (usageElem) {
      usageElem.textContent = `${usage}%`;
      usageElem.className = `bva-amount ${status === 'safe' ? 'text-green' : (status === 'warning' ? 'text-amber' : 'text-danger')}`;
    }

    if (statusBadge) {
      if (usage > 100) {
        statusBadge.textContent = 'Budget Exceeded!';
        statusBadge.className = 'bva-sub text-danger font-bold';
      } else if (usage >= 80) {
        statusBadge.textContent = 'Warning (80%+ Limit)';
        statusBadge.className = 'bva-sub text-amber font-bold';
      } else {
        statusBadge.textContent = 'Within Planned Budget';
        statusBadge.className = 'bva-sub text-green font-bold';
      }
    }

    // Progress Bar
    const barFill = document.getElementById('bvaProgressBarFill');
    if (barFill) {
      barFill.style.width = `${Math.min(usage, 100)}%`;
      barFill.className = `bva-progress-fill ${status}`;
    }

    // Breakdown Table
    const tbody = document.getElementById('bvaCategoryTableBody');
    if (tbody) {
      const allCats = Array.from(new Set([...Object.keys(catPlanned), ...Object.keys(catSpending)]));
      if (allCats.length === 0) {
        tbody.innerHTML = `<tr><td colspan="5" class="text-center text-muted" style="padding: 1.5rem;">No category data for ${formatMonthName(month)}</td></tr>`;
      } else {
        tbody.innerHTML = allCats.map(cat => {
          const plan = catPlanned[cat] || 0;
          const act = catSpending[cat] || 0;
          const variance = plan > 0 ? (plan - act) : -act;
          const isOver = plan > 0 ? (act > plan) : (act > 0);

          let badge = '<span class="status-badge under">OK</span>';
          if (plan > 0 && isOver) badge = '<span class="status-badge over">Over Cap</span>';
          else if (plan === 0) badge = '<span class="badge-tag">No Cap</span>';

          return `
            <tr>
              <td><span class="font-bold">${escapeHTML(cat)}</span></td>
              <td class="text-right font-bold text-blue">${plan > 0 ? formatMoney(plan) : '—'}</td>
              <td class="text-right font-bold text-amber">${formatMoney(act)}</td>
              <td class="text-right font-bold ${variance >= 0 ? 'text-green' : 'text-danger'}">
                ${variance >= 0 ? formatMoney(variance) : '-' + formatMoney(Math.abs(variance))}
              </td>
              <td class="text-center">${badge}</td>
            </tr>
          `;
        }).join('');
      }
    }

    // Chart
    SpendWiseCharts.renderBudgetVsActual('budgetVsActualChart', budget, spent, getCurrencySymbol());
  }

  // ----------------------------------------------------------------------------
  // MONTHLY REPORT, CHARTS & FINANCIAL INSIGHTS
  // ----------------------------------------------------------------------------
  function renderAllReports() {
    const picker = document.getElementById('reportsMonthSelect');
    if (picker && picker.value) activeMonth = picker.value;
    else if (picker) picker.value = activeMonth;

    const month = activeMonth;
    const isDark = document.body.getAttribute('data-theme') === 'dark';
    const sym = getCurrencySymbol();

    // 1. Insights
    renderFinancialInsights();

    // 2. Category Pie Chart
    const catBreakdown = SpendWiseCalculations.getCategoryBreakdown(state.expenses, month);
    SpendWiseCharts.renderCategoryPie('categoryPieChart', catBreakdown, sym, isDark);

    // 3. Income vs Expense Past 4 Months
    const past4 = getLastNMonths(4);
    const inc4 = past4.map(m => SpendWiseCalculations.getMonthlyIncomeTotal(state.income, m));
    const exp4 = past4.map(m => SpendWiseCalculations.getMonthlyExpensesTotal(state.expenses, m));
    const lbl4 = past4.map(m => formatMonthName(m).split(' ')[0]);
    SpendWiseCharts.renderIncomeVsExpense('incomeVsExpenseChart', lbl4, inc4, exp4, sym);

    // 4. Monthly Trend Past 6 Months
    const past6 = getLastNMonths(6);
    const exp6 = past6.map(m => SpendWiseCalculations.getMonthlyExpensesTotal(state.expenses, m));
    const lbl6 = past6.map(m => {
      const p = formatMonthName(m).split(' ');
      return `${p[0].substring(0, 3)} '${p[1].substring(2)}`;
    });
    SpendWiseCharts.renderMonthlyTrend('monthlyTrendChart', lbl6, exp6, sym);

    // 5. Category Budget vs Actual
    const catPlanned = state.categoryBudgets[month] || {};
    const allCats = Array.from(new Set([...Object.keys(catPlanned), ...Object.keys(catBreakdown)]));
    const plannedArr = allCats.map(c => catPlanned[c] || 0);
    const actualArr = allCats.map(c => catBreakdown[c] || 0);
    SpendWiseCharts.renderCategoryBudgetComparison('categoryBudgetChart', allCats, plannedArr, actualArr, sym);
  }

  function renderFinancialInsights() {
    const container = document.getElementById('financialInsightsContainer');
    if (!container) return;

    const month = activeMonth;
    const budget = Number(state.monthlyBudgets[month]) || 0;
    const spent = SpendWiseCalculations.getMonthlyExpensesTotal(state.expenses, month);
    const remaining = SpendWiseCalculations.calculateRemainingBudget(budget, spent);
    const usage = SpendWiseCalculations.calculateBudgetUsagePercent(budget, spent);
    const catData = SpendWiseCalculations.getCategoryBreakdown(state.expenses, month);

    const insights = [];

    // Top Category
    const keys = Object.keys(catData);
    if (keys.length > 0) {
      let top = keys[0];
      keys.forEach(k => { if (catData[k] > catData[top]) top = k; });
      const pct = spent > 0 ? Math.round((catData[top] / spent) * 100) : 0;
      insights.push({
        icon: iconSvg('chart', 20),
        title: `Top Spending Category: ${escapeHTML(top)}`,
        desc: `You spent ${formatMoney(catData[top])} (${pct}% of total spending) on ${escapeHTML(top)} this month.`
      });
    }

    // Budget Health
    if (budget > 0) {
      if (remaining >= 0) {
        insights.push({
          icon: iconSvg('target', 20),
          title: 'Budget On Track',
          desc: `You have ${formatMoney(remaining)} remaining out of your ${formatMoney(budget)} monthly budget (${usage}% used).`
        });
      } else {
        insights.push({
          icon: iconSvg('warning', 20),
          title: 'Budget Exceeded',
          desc: `You have exceeded your monthly limit by ${formatMoney(Math.abs(remaining))}. Avoid non-essential expenses.`
        });
      }
    } else {
      insights.push({
        icon: iconSvg('lightbulb', 20),
        title: 'Plan a Monthly Budget',
        desc: 'Setting a monthly budget ceiling encourages mindful spending and helps you build savings.'
      });
    }

    // Month-over-Month Comparison
    const past2 = getLastNMonths(2);
    if (past2.length === 2) {
      const lastMonthSpent = SpendWiseCalculations.getMonthlyExpensesTotal(state.expenses, past2[0]);
      if (lastMonthSpent > 0 && spent > 0) {
        const diff = spent - lastMonthSpent;
        if (diff > 0) {
          insights.push({
            icon: iconSvg('trendUp', 20),
            title: 'Spending Acceleration',
            desc: `You spent ${formatMoney(diff)} more in ${formatMonthName(month)} than in ${formatMonthName(past2[0])}.`
          });
        } else {
          insights.push({
            icon: iconSvg('trendDown', 20),
            title: 'Spending Reduction',
            desc: `Good job! You reduced your spending by ${formatMoney(Math.abs(diff))} compared to ${formatMonthName(past2[0])}.`
          });
        }
      }
    }

    // Student Tip
    if (state.userPreferences.studentMode) {
      insights.push({
        icon: iconSvg('student', 20),
        title: 'Student Money Tip',
        desc: 'Review weekly micro-expenses (chai, xerox, snacks). Small daily savings add up to substantial semester savings!'
      });
    }

    container.innerHTML = insights.map(item => `
      <div class="insight-item">
        <div class="insight-icon">${item.icon}</div>
        <div class="insight-text">
          <h5>${item.title}</h5>
          <p>${item.desc}</p>
        </div>
      </div>
    `).join('');
  }

  function getLastNMonths(count = 6) {
    const list = [];
    const base = new Date(activeMonth + '-01T00:00:00');
    for (let i = count - 1; i >= 0; i--) {
      const d = new Date(base.getFullYear(), base.getMonth() - i, 1);
      const y = d.getFullYear();
      const m = String(d.getMonth() + 1).padStart(2, '0');
      list.push(`${y}-${m}`);
    }
    return list;
  }

  // ----------------------------------------------------------------------------
  // TRANSACTION HISTORY & CSV EXPORT
  // ----------------------------------------------------------------------------
  function filterHistory() {
    const search = (document.getElementById('historySearchInput')?.value || '').toLowerCase().trim();
    const type = document.getElementById('historyTypeFilter')?.value || 'ALL';
    const cat = document.getElementById('historyCategoryFilter')?.value || 'ALL';
    const period = document.getElementById('historyPeriodFilter')?.value || 'all';
    const todayStr = getTodayString();

    const all = [
      ...state.expenses.map(e => Object.assign({}, e, { type: 'expense' })),
      ...state.income.map(i => Object.assign({}, i, { type: 'income' }))
    ];

    const filtered = all.filter(item => {
      if (type !== 'ALL' && item.type !== type) return false;

      const label = item.type === 'expense' ? item.category : item.source;
      if (cat !== 'ALL' && label !== cat) return false;

      if (search) {
        const dMatch = item.description.toLowerCase().includes(search);
        const nMatch = item.notes && item.notes.toLowerCase().includes(search);
        if (!dMatch && !nMatch) return false;
      }

      if (period === 'today' && item.date !== todayStr) return false;
      if (period === 'week' && !SpendWiseCalculations.isDateInCurrentWeek(item.date)) return false;
      if (period === 'month' && (!item.date || !item.date.startsWith(activeMonth))) return false;

      return true;
    }).sort((a, b) => new Date(b.date) - new Date(a.date));

    renderHistoryTable(filtered);
  }

  function renderHistoryTable(list) {
    const tbody = document.getElementById('historyTableBody');
    const empty = document.getElementById('historyEmptyState');
    if (!tbody) return;

    if (!list || list.length === 0) {
      tbody.innerHTML = '';
      if (empty) empty.style.display = 'block';
      return;
    }

    if (empty) empty.style.display = 'none';

    tbody.innerHTML = list.map(item => {
      const isExp = item.type === 'expense';
      const typeBadge = isExp
        ? '<span class="type-pill type-expense">Expense</span>'
        : '<span class="type-pill type-income">Income</span>';
      const label = isExp ? item.category : item.source;
      const color = isExp ? 'text-amber' : 'text-green';
      const sign = isExp ? '-' : '+';

      return `
        <tr>
          <td><strong>${formatDisplayDate(item.date)}</strong></td>
          <td>${typeBadge}</td>
          <td><span class="font-bold">${escapeHTML(item.description)}</span></td>
          <td><span class="category-tag">${escapeHTML(label || '—')}</span></td>
          <td class="text-muted" style="max-width: 200px; font-size: 0.8rem;">${escapeHTML(item.notes || '—')}</td>
          <td class="text-right font-bold ${color}">${sign}${formatMoney(item.amount, item.currency)}</td>
          <td class="text-center">
            <button class="table-action-btn" aria-label="Edit transaction: ${escapeHTML(item.description)}" title="Edit" onclick="${isExp ? `SpendWiseApp.openAddExpenseModal('${item.id}')` : `SpendWiseApp.openAddIncomeModal('${item.id}')`}">${iconSvg('edit', 16)}</button>
            <button class="table-action-btn delete-btn" aria-label="Delete transaction: ${escapeHTML(item.description)}" title="Delete" onclick="${isExp ? `SpendWiseApp.confirmDeleteExpense('${item.id}')` : `SpendWiseApp.confirmDeleteIncome('${item.id}')`}">${iconSvg('trash', 16)}</button>
          </td>
        </tr>
      `;
    }).join('');
  }

  function resetHistoryFilters() {
    const s = document.getElementById('historySearchInput');
    const t = document.getElementById('historyTypeFilter');
    const c = document.getElementById('historyCategoryFilter');
    const p = document.getElementById('historyPeriodFilter');
    if (s) s.value = '';
    if (t) t.value = 'ALL';
    if (c) c.value = 'ALL';
    if (p) p.value = 'all';
    filterHistory();
  }

  function exportToCSV() {
    const all = [
      ...state.expenses.map(e => ({
        id: e.id,
        type: 'Expense',
        date: e.date,
        description: e.description,
        amount: e.amount,
        currency: e.currency || state.userPreferences.currency,
        category: e.category,
        notes: e.notes || ''
      })),
      ...state.income.map(i => ({
        id: i.id,
        type: 'Income',
        date: i.date,
        description: i.description,
        amount: i.amount,
        currency: state.userPreferences.currency,
        category: i.source,
        notes: i.notes || ''
      }))
    ].sort((a, b) => new Date(b.date) - new Date(a.date));

    if (all.length === 0) {
      showToast('No transactions to export.', 'error');
      return;
    }

    const headers = ['Transaction ID', 'Type', 'Date', 'Description', 'Amount', 'Currency', 'Category or Source', 'Notes'];
    const rows = all.map(tx => [
      tx.id,
      tx.type,
      tx.date,
      `"${(tx.description || '').replace(/"/g, '""')}"`,
      tx.amount,
      tx.currency,
      `"${(tx.category || '').replace(/"/g, '""')}"`,
      `"${(tx.notes || '').replace(/"/g, '""')}"`
    ]);

    // UTF-8 BOM (\uFEFF) ensures proper currency display in MS Excel
    const csvContent = '\uFEFF' + [headers.join(','), ...rows.map(r => r.join(','))].join('\r\n');
    const blob = new Blob([csvContent], { type: 'text/csv;charset=utf-8;' });
    const url = URL.createObjectURL(blob);
    const link = document.createElement('a');
    const filename = `SpendWise_Transactions_${getTodayString()}.csv`;

    link.setAttribute('href', url);
    link.setAttribute('download', filename);
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);

    showToast(`Exported ${all.length} transactions to ${filename}!`, 'success');
  }

  // ----------------------------------------------------------------------------
  // USER CUSTOMIZATION & SETTINGS
  // ----------------------------------------------------------------------------
  function addCustomCategory() {
    const input = document.getElementById('newCategoryInput');
    const name = (input?.value || '').trim();

    if (!name) {
      showToast('Please type a category name.', 'error');
      return;
    }

    const current = getActiveCategories();
    if (current.some(c => c.toLowerCase() === name.toLowerCase())) {
      showToast(`Category "${name}" already exists.`, 'error');
      return;
    }

    state.customCategories.push(name);
    SpendWiseStorage.save();
    input.value = '';
    populateCategoryDropdowns();
    showToast(`Added custom category: ${name}`, 'success');
  }

  function renameCustomCategory(oldName) {
    const newName = prompt(`Enter new name for category "${oldName}":`, oldName);
    if (!newName || newName.trim() === '' || newName === oldName) return;

    const trimmed = newName.trim();
    const idx = state.customCategories.indexOf(oldName);
    if (idx !== -1) {
      state.customCategories[idx] = trimmed;
      state.expenses.forEach(e => {
        if (e.category === oldName) e.category = trimmed;
      });
      SpendWiseStorage.save();
      populateCategoryDropdowns();
      refreshAllViews();
      showToast(`Renamed category to "${trimmed}"`, 'success');
    }
  }

  function deleteCustomCategory(catName) {
    const inUse = state.expenses.some(e => e.category === catName);
    if (inUse) {
      showToast(`Cannot delete "${catName}": It is assigned to existing expenses.`, 'error');
      return;
    }

    openConfirmModal(
      'Delete Category',
      `Delete custom category "${escapeHTML(catName)}"?`,
      () => {
        state.customCategories = state.customCategories.filter(c => c !== catName);
        SpendWiseStorage.save();
        populateCategoryDropdowns();
        showToast(`Category "${catName}" removed.`, 'success');
      }
    );
  }

  function renderCustomCategoriesList() {
    const container = document.getElementById('customCategoriesList');
    if (!container) return;

    if (state.customCategories.length === 0) {
      container.innerHTML = '<p class="text-muted" style="font-size: 0.82rem;">No custom categories created yet. Add one above.</p>';
      return;
    }

    container.innerHTML = state.customCategories.map(cat => `
      <div class="cat-item-row">
        <span class="cat-name-badge">${escapeHTML(cat)}</span>
        <div class="cat-actions">
          <button class="table-action-btn" aria-label="Rename category: ${escapeHTML(cat)}" title="Rename" onclick="SpendWiseApp.renameCustomCategory('${escapeHTML(cat)}')">${iconSvg('edit', 16)}</button>
          <button class="table-action-btn delete-btn" aria-label="Delete category: ${escapeHTML(cat)}" title="Delete" onclick="SpendWiseApp.deleteCustomCategory('${escapeHTML(cat)}')">${iconSvg('trash', 16)}</button>
        </div>
      </div>
    `).join('');
  }

  function saveUserName() {
    const input = document.getElementById('settingsUserName');
    const name = (input?.value || '').trim();
    if (!name) {
      showToast('Please enter your name.', 'error');
      return;
    }
    state.userPreferences.userName = name;
    SpendWiseStorage.save();
    updateDashboard();
    showToast(`Hello, ${name}! Your name has been saved.`, 'success');
  }

  function toggleStudentMode() {
    state.userPreferences.studentMode = !state.userPreferences.studentMode;
    SpendWiseStorage.save();
    syncStudentModeUI();
    populateCategoryDropdowns();
    refreshAllViews();
    showToast(`Student Mode ${state.userPreferences.studentMode ? 'Activated' : 'Deactivated'}`, 'success');
  }

  function syncStudentModeUI() {
    const btn = document.getElementById('studentModeBtn');
    const status = document.getElementById('studentModeStatus');
    const isStudent = state.userPreferences.studentMode;

    if (btn && status) {
      if (isStudent) {
        btn.classList.add('active');
        status.textContent = 'ON';
      } else {
        btn.classList.remove('active');
        status.textContent = 'OFF';
      }
    }
  }

  function setCurrency(code) {
    if (!Config.CURRENCIES[code]) return;
    state.userPreferences.currency = code;
    SpendWiseStorage.save();
    updateModalCurrencyPrefixes();
    refreshAllViews();
    showToast(`Currency set to ${Config.CURRENCIES[code].symbol} ${code}`, 'success');
  }

  function setTheme(theme) {
    state.userPreferences.theme = theme;
    document.body.setAttribute('data-theme', theme);
    localStorage.setItem(Config.STORAGE_KEYS.THEME, theme);

    const icon = document.getElementById('themeIcon');
    const themeButton = document.getElementById('themeToggleBtn');
    if (icon) icon.innerHTML = iconSvg(theme === 'dark' ? 'sun' : 'moon', 19);
    if (themeButton) {
      const nextTheme = theme === 'dark' ? 'light' : 'dark';
      themeButton.setAttribute('aria-label', `Switch to ${nextTheme} theme`);
      themeButton.title = `Switch to ${nextTheme} theme`;
    }

    SpendWiseStorage.save();
    renderAllReports();
  }

  function toggleTheme() {
    const current = document.body.getAttribute('data-theme') || 'light';
    setTheme(current === 'dark' ? 'light' : 'dark');
  }

  function updateModalCurrencyPrefixes() {
    const sym = getCurrencySymbol();
    const e = document.getElementById('expenseCurrencyPrefix');
    const i = document.getElementById('incomeCurrencyPrefix');
    const b = document.getElementById('budgetCurrencyPrefix');
    if (e) e.textContent = sym;
    if (i) i.textContent = sym;
    if (b) b.textContent = sym;
  }

  function confirmResetData() {
    openConfirmModal(
      'Reset All Application Data',
      'WARNING: This will erase all your expenses, income records, and category budgets in this browser. This cannot be undone!',
      () => {
        state = SpendWiseStorage.resetToDefaults();
        populateCategoryDropdowns();
        refreshAllViews();
        showToast('Application data reset. All totals start at zero.', 'success');
      }
    );
  }

  // ----------------------------------------------------------------------------
  // UI TABS, MODALS & TOAST NOTIFICATIONS
  // ----------------------------------------------------------------------------
  function switchTab(tabId) {
    const navLinks = document.querySelectorAll('.nav-link');
    const tabContents = document.querySelectorAll('.tab-content');

    navLinks.forEach(link => {
      const isActive = link.getAttribute('data-tab') === tabId;
      link.classList.toggle('active', isActive);
      if (isActive) link.setAttribute('aria-current', 'page');
      else link.removeAttribute('aria-current');
    });

    tabContents.forEach(content => {
      if (content.id === `tab-${tabId}`) content.classList.add('active');
      else content.classList.remove('active');
    });

    const mainNav = document.getElementById('mainNav');
    if (mainNav) mainNav.classList.remove('open');
    const mobileBtn = document.getElementById('mobileNavToggle');
    if (mobileBtn) mobileBtn.setAttribute('aria-expanded', 'false');

    // Tab-specific lifecycle activations
    if (tabId === 'dashboard') updateDashboard();
    else if (tabId === 'expenses') filterExpenses();
    else if (tabId === 'income') filterIncome();
    else if (tabId === 'budget') loadBudgetForSelectedMonth();
    else if (tabId === 'budget-vs-actual') renderBudgetVsActual();
    else if (tabId === 'reports') renderAllReports();
    else if (tabId === 'history') filterHistory();
    else if (tabId === 'settings') renderSettingsTab();

    const scrollBehavior = window.matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth';
    window.scrollTo({ top: 0, behavior: scrollBehavior });
  }

  function renderSettingsTab() {
    const nameInput = document.getElementById('settingsUserName');
    if (nameInput) nameInput.value = state.userPreferences.userName || '';

    const expCount = document.getElementById('storageExpenseCount');
    const incCount = document.getElementById('storageIncomeCount');
    const demoStat = document.getElementById('storageDemoStatus');
    const verElem = document.getElementById('storageAppVersion');

    if (expCount) expCount.textContent = state.expenses.length;
    if (incCount) incCount.textContent = state.income.length;
    if (demoStat) demoStat.textContent = 'Disabled — zero-data defaults';
    if (verElem) verElem.textContent = Config.APP_VERSION;

    renderCustomCategoriesList();
  }

  function openConfirmModal(title, message, onConfirm) {
    const modal = document.getElementById('confirmModal');
    const titleElem = document.getElementById('confirmModalTitle');
    const msgElem = document.getElementById('confirmModalMessage');
    const actionBtn = document.getElementById('confirmModalActionBtn');

    titleElem.textContent = title;
    msgElem.innerHTML = message;
    pendingConfirmAction = onConfirm;

    actionBtn.onclick = () => {
      if (typeof pendingConfirmAction === 'function') pendingConfirmAction();
      closeModal('confirmModal');
    };

    openModal(modal);
  }

  function openModal(modal) {
    previouslyFocusedElement = document.activeElement;
    modal.classList.add('open');
    document.body.classList.add('modal-open');
    const firstFocusable = modal.querySelector('input:not([type="hidden"]):not([disabled]), button:not([disabled]), select:not([disabled]), textarea:not([disabled])');
    (firstFocusable || modal.querySelector('.modal-dialog')).focus();
  }

  function closeModal(modalId) {
    const modal = document.getElementById(modalId);
    if (modal) modal.classList.remove('open');
    if (!document.querySelector('.modal-backdrop.open')) {
      document.body.classList.remove('modal-open');
      if (previouslyFocusedElement instanceof HTMLElement && previouslyFocusedElement.isConnected) {
        previouslyFocusedElement.focus();
      }
      previouslyFocusedElement = null;
    }
    pendingConfirmAction = null;
  }

  function showToast(message, type = 'success') {
    const container = document.getElementById('toastContainer');
    if (!container) return;

    const toast = document.createElement('div');
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `<span class="toast-icon">${iconSvg(type === 'success' ? 'check' : 'warning', 18)}</span><span>${escapeHTML(message)}</span>`;
    container.appendChild(toast);

    setTimeout(() => {
      if (toast && toast.parentNode) toast.parentNode.removeChild(toast);
    }, 3000);
  }

  /**
   * Refreshes every active view on the page immediately
   */
  function refreshAllViews() {
    updateDashboard();
    filterExpenses();
    filterIncome();
    filterHistory();
    loadBudgetForSelectedMonth();
    renderBudgetVsActual();
  }

  // ----------------------------------------------------------------------------
  // APPLICATION BOOTSTRAP
  // ----------------------------------------------------------------------------
  function init() {
    // 1. Initialize Storage and Load State
    state = SpendWiseStorage.load();
    activeMonth = getTodayString().substring(0, 7);

    // 2. Initialize Theme
    const savedTheme = localStorage.getItem(Config.STORAGE_KEYS.THEME) || state.userPreferences.theme || 'light';
    setTheme(savedTheme);

    // 3. Initialize Currency Select
    const currSelect = document.getElementById('currencySelect');
    if (currSelect) {
      currSelect.value = state.userPreferences.currency;
      currSelect.addEventListener('change', (e) => setCurrency(e.target.value));
    }

    // 4. Student Mode & Theme Buttons
    syncStudentModeUI();
    const studentBtn = document.getElementById('studentModeBtn');
    if (studentBtn) studentBtn.addEventListener('click', toggleStudentMode);

    const themeBtn = document.getElementById('themeToggleBtn');
    if (themeBtn) themeBtn.addEventListener('click', toggleTheme);

    const mobileBtn = document.getElementById('mobileNavToggle');
    const mainNav = document.getElementById('mainNav');
    if (mobileBtn && mainNav) {
      mobileBtn.addEventListener('click', () => {
        const isOpen = mainNav.classList.toggle('open');
        mobileBtn.setAttribute('aria-expanded', String(isOpen));
      });
    }

    // 5. Navigation Tab Links
    const navLinks = document.querySelectorAll('.nav-link');
    navLinks.forEach(link => {
      link.addEventListener('click', () => {
        const tab = link.getAttribute('data-tab');
        switchTab(tab);
      });
    });

    // 6. Month Selectors Synchronization
    const dashMonth = document.getElementById('dashMonthSelect');
    if (dashMonth) {
      dashMonth.value = activeMonth;
      dashMonth.addEventListener('change', (e) => {
        activeMonth = e.target.value;
        refreshAllViews();
      });
    }

    const budMonth = document.getElementById('budgetSelectMonth');
    if (budMonth) budMonth.value = activeMonth;

    const bvaMonth = document.getElementById('bvaMonthSelect');
    if (bvaMonth) bvaMonth.value = activeMonth;

    const repMonth = document.getElementById('reportsMonthSelect');
    if (repMonth) repMonth.value = activeMonth;

    // 7. Global Backdrop Click to Close Modals
    window.addEventListener('click', (e) => {
      if (e.target.classList.contains('modal-backdrop')) {
        closeModal(e.target.id);
      }
    });

    document.addEventListener('keydown', (event) => {
      const modal = document.querySelector('.modal-backdrop.open');
      if (!modal) return;

      if (event.key === 'Escape') {
        event.preventDefault();
        closeModal(modal.id);
        return;
      }

      if (event.key !== 'Tab') return;
      const focusable = Array.from(modal.querySelectorAll(
        'button:not([disabled]), input:not([type="hidden"]):not([disabled]), select:not([disabled]), textarea:not([disabled]), a[href], [tabindex]:not([tabindex="-1"])'
      )).filter(element => element.getClientRects().length > 0);
      if (focusable.length === 0) {
        event.preventDefault();
        modal.querySelector('.modal-dialog').focus();
        return;
      }

      const first = focusable[0];
      const last = focusable[focusable.length - 1];
      if (event.shiftKey && (document.activeElement === first || !modal.contains(document.activeElement))) {
        event.preventDefault();
        last.focus();
      } else if (!event.shiftKey && (document.activeElement === last || !modal.contains(document.activeElement))) {
        event.preventDefault();
        first.focus();
      }
    });

    // 8. Populate Categories & Render UI
    populateCategoryDropdowns();
    refreshAllViews();

    console.log(`SpendWise v${Config.APP_VERSION} initialized successfully.`);
  }

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', init);
  } else {
    init();
  }

  // Public Interface for Inline Handlers & External Modules
  return {
    switchTab,
    openAddExpenseModal,
    handleExpenseSubmit,
    quickAddExpense,
    filterExpenses,
    resetExpenseFilters,
    confirmDeleteExpense,
    openAddIncomeModal,
    handleIncomeSubmit,
    filterIncome,
    resetIncomeFilters,
    confirmDeleteIncome,
    openSetBudgetModal,
    handleBudgetSubmit,
    loadBudgetForSelectedMonth,
    saveCategoryBudget,
    deleteCategoryBudget,
    renderBudgetVsActual,
    renderAllReports,
    filterHistory,
    resetHistoryFilters,
    exportToCSV,
    addCustomCategory,
    renameCustomCategory,
    deleteCustomCategory,
    saveUserName,
    toggleStudentMode,
    setTheme,
    confirmResetData,
    closeModal,
    getState: () => state,
    refreshAllViews
  };
})();
