# SpendWise – Developer Control & Maintenance Guide

> **Welcome, Student Developer!**  
> This guide is authored specifically for you as the owner and lead developer of **SpendWise** (University Innovation Lab Project No. 32). It explains how the entire codebase works, how calculations and data persistence are structured, and how you can easily maintain, modify, and expand the website without breaking existing features or losing user data.

---

## 1. Developer Philosophy: User Control vs. Developer Control

To keep SpendWise clean and secure, we enforce a strict separation between what **Users** can do and what **You (the Developer)** control:

| User Controls (Inside the Web Browser) | Developer Controls (In Source Code via Antigravity) |
|---|---|
| • Enter, edit, and delete their own expenses & income | • Modify website architecture, HTML layout, and markup |
| • Set and adjust personal monthly spending budgets | • Adjust CSS colors, fonts, card spacing, and animations |
| • Switch active currency (INR, USD, EUR, GBP) | • Add new currencies or change default currency presets |
| • Add, rename, and delete custom expense categories | • Add new default categories in `config.js` |
| • Toggle Student Mode on or off | • Upgrade calculation formulas and statistical algorithms |
| • Switch between Light and Dark themes | • Design and configure new Chart.js visualizations |
| • Export transactions to CSV | • Release new application versions with safe data migrations |

Users will never see or modify code directly. All developer updates are performed by editing the project files.

---

## 2. Project Architecture & File Organization

SpendWise is organized into four clean, maintainable files:

```
SpendWise/
├── config.js            <-- Central Configuration: Constants, categories, currencies, and app defaults
├── index.html           <-- Structure: Semantic markup, accessible forms, modal dialogs, and tabs
├── style.css            <-- Styling: Design tokens (CSS variables), light/dark themes, responsive layouts
├── script.js            <-- Logic Engine: Calculations, localStorage persistence, Chart.js, and UI events
├── DEVELOPER_GUIDE.md   <-- This guide: Maintenance, feature expansion, and debugging instructions
└── README.md            <-- University Project Report: Academic documentation and team roles
```

---

## 3. Central Configuration (`config.js`)

Instead of hunting through hundreds of lines of code to change a default category or currency, all global settings are located in `config.js`.

### Key Settings in `config.js`:
```javascript
const SpendWiseConfig = {
  APP_VERSION: '1.1.0',                     // Increment this when releasing updates!
  CURRENCIES: { ... },                      // Currency symbols and names
  DEFAULT_PREFERENCES: { ... },             // Default user settings
  STANDARD_CATEGORIES: [ ... ],             // Default lifestyle categories
  STUDENT_CATEGORIES: [ ... ],              // Student Mode categories
  INCOME_SOURCES: [ ... ],                  // Allowed income source dropdown options
  BUDGET_THRESHOLDS: { WARNING: 80, DANGER: 100 }, // Percentage warning levels
  QUICK_ADD_PRESETS: [ ... ]                // 1-Tap quick-add buttons
};
```

New installations start with no transactions or budgets. Dashboard totals therefore display zero until users add their own data.

---

## 4. How to Modify the Homepage & Dashboard Cards

### Adding or Modifying a Metric Card:
1. Open [`index.html`](file:///c:/Users/p1622/OneDrive/Documents/SpendWise/index.html) and locate the `<div class="metrics-grid">` section (around Line 130).
2. Each metric card follows this structure:
   ```html
   <div class="metric-card card-income">
     <div class="metric-header">
       <span class="metric-title">Card Title</span>
       <div class="metric-icon-wrap bg-green-light">
         <!-- SVG Icon -->
       </div>
     </div>
     <div class="metric-value text-green" id="yourMetricId">₹0.00</div>
     <div class="metric-footer">
       <span class="metric-sub" id="yourMetricSub">Subtitle text</span>
     </div>
   </div>
   ```
3. Open [`script.js`](file:///c:/Users/p1622/OneDrive/Documents/SpendWise/script.js) and locate `updateDashboard()`.
4. Compute your new calculation using `SpendWiseCalculations`, then update your DOM element:
   ```javascript
   document.getElementById('yourMetricId').textContent = formatMoney(myCalculatedValue);
   ```

---

## 5. How to Change Colours, Fonts, and Themes

All visual styles are governed by **CSS Custom Properties (Design Tokens)** in [`style.css`](file:///c:/Users/p1622/OneDrive/Documents/SpendWise/style.css).

### Changing the Primary Brand Colour:
In [`style.css`](file:///c:/Users/p1622/OneDrive/Documents/SpendWise/style.css) lines 13-18:
```css
:root {
  --primary-500: #10b981; /* Change to your desired color, e.g. #3b82f6 for blue */
  --primary-600: #059669; /* Darker shade for hover states */
  --primary-700: #047857;
}
```

### Changing Typography:
In [`index.html`](file:///c:/Users/p1622/OneDrive/Documents/SpendWise/index.html), update the Google Font link in `<head>`, and in [`style.css`](file:///c:/Users/p1622/OneDrive/Documents/SpendWise/style.css) line 80:
```css
body {
  font-family: 'Plus Jakarta Sans', sans-serif; /* Replace with your font */
}
```

### Customizing Dark Mode:
Locate `[data-theme="dark"]` in [`style.css`](file:///c:/Users/p1622/OneDrive/Documents/SpendWise/style.css) (line 50) and modify background (`--bg-app`) or card (`--bg-card`) colors.

---

## 6. How to Modify Financial Calculations

All mathematical logic is encapsulated inside the `SpendWiseCalculations` module in [`script.js`](file:///c:/Users/p1622/OneDrive/Documents/SpendWise/script.js). 

**It contains zero DOM manipulation code**, making it clean to read, modify, and unit test.

### Core Formulas:
1. **Total Monthly Expenses:**
   ```javascript
   function getMonthlyExpensesTotal(expenses, monthStr) {
     return expenses
       .filter(item => item.date && item.date.startsWith(monthStr))
       .reduce((sum, item) => sum + (Number(item.amount) || 0), 0);
   }
   ```
2. **Remaining Budget (Handling Negative Balances):**
   ```javascript
   function calculateRemainingBudget(monthlyBudget, totalExpenses) {
     return Number(monthlyBudget) - Number(totalExpenses);
   }
   ```
   *Note:* When `totalExpenses > monthlyBudget`, this returns a negative number (e.g. `-500`). The UI displays this with a minus sign in red: `-₹500.00`.
3. **Budget Usage %:**
   ```javascript
   function calculateBudgetUsagePercent(monthlyBudget, totalExpenses) {
     if (monthlyBudget <= 0) return 0;
     return Math.round((totalExpenses / monthlyBudget) * 100);
   }
   ```

To introduce a new financial calculation (e.g., *Savings Rate* or *Annual Spending Projection*), simply define a new function in `SpendWiseCalculations` and call it inside `updateDashboard()` or `renderFinancialInsights()`.

---

## 7. How to Add New Default Categories

To add a new category to either Standard Mode or Student Mode:

1. Open [`config.js`](file:///c:/Users/p1622/OneDrive/Documents/SpendWise/config.js).
2. For general categories, append to `STANDARD_CATEGORIES`:
   ```javascript
   STANDARD_CATEGORIES: [
     'Food',
     'Transportation',
     ...
     'Investment & Savings' // <-- Your new category
   ],
   ```
3. For student categories, append to `STUDENT_CATEGORIES`:
   ```javascript
   STUDENT_CATEGORIES: [
     'Food and Snacks',
     ...
     'Gym & Sports' // <-- Your new category
   ],
   ```
4. Save the file. All dropdown menus, filters, and forms will automatically display the new category without touching any other code!

---

## 8. How to Update or Add Charts (Chart.js)

All charting code is managed by the `SpendWiseCharts` module in [`script.js`](file:///c:/Users/p1622/OneDrive/Documents/SpendWise/script.js).

### Best Practices to Prevent Canvas Bugs:
- **Always destroy existing chart instances before redrawing:**
  ```javascript
  if (instances[chartKey]) {
    instances[chartKey].destroy();
    instances[chartKey] = null;
  }
  ```
- **Ensure canvases have a fixed container height:**
  ```html
  <div class="chart-container" style="height: 300px;">
    <canvas id="myNewChart"></canvas>
  </div>
  ```

---

## 9. Safe Data Migration & Versioning (Never Lose User Data)

When releasing a new version of SpendWise, you must ensure that users who have already saved expenses do not lose their records.

### How SpendWise Protects Data:
In [`script.js`](file:///c:/Users/p1622/OneDrive/Documents/SpendWise/script.js), `SpendWiseStorage.load()` checks existing data:
```javascript
const raw = localStorage.getItem(Config.STORAGE_KEYS.DATA);
if (raw) {
  const parsed = JSON.parse(raw);
  // Preserves existing user arrays and objects:
  appState.expenses = Array.isArray(parsed.expenses) ? parsed.expenses : [];
  appState.income = Array.isArray(parsed.income) ? parsed.income : [];
  appState.monthlyBudgets = parsed.monthlyBudgets || {};
  appState.categoryBudgets = parsed.categoryBudgets || {};
  appState.userPreferences = Object.assign({}, Config.DEFAULT_PREFERENCES, parsed.userPreferences || {});
}
```

### Steps to Release a New Version:
1. Increment `APP_VERSION` in [`config.js`](file:///c:/Users/p1622/OneDrive/Documents/SpendWise/config.js):
   ```javascript
   APP_VERSION: '1.2.0',
   ```
2. If you add a new property to transactions, update the object creation in `handleExpenseSubmit` or `handleIncomeSubmit`.
3. Existing transactions in users' browsers will load seamlessly without reset!

---

## 10. Common Bugs & Troubleshooting Guide

| Issue | Root Cause | Solution |
|---|---|---|
| Chart looks squeezed or overlapping | Canvas instance was not destroyed before redrawing. | Call `destroyChart(key)` before `new Chart(...)`. |
| Currency symbol shows wrong character in Excel CSV | CSV file missing UTF-8 Byte Order Mark (BOM). | Ensure `\uFEFF` prefix is prepended to CSV data string in `exportToCSV()`. |
| Remaining budget shows positive when overbudget | Missing negative sign handling. | Use `calculateRemainingBudget()`; if `< 0`, format with a minus sign and `.text-danger` class. |
| Old sample transactions still appear after updating | Previously saved sample records remain in browser storage. | Reload SpendWise; it removes its known seeded demo records and preserves user-entered records. |

---

## 11. Testing & QA Verification Checklist

Before presenting your project or sharing it with users, verify:

- [ ] **Live Updates:** Adding/editing/deleting expenses instantly updates dashboard figures without refreshing the browser.
- [ ] **Negative Remaining Budget:** Set Monthly Budget to ₹100, add ₹200 expense $\rightarrow$ verify Money Left displays `-₹100.00` in red.
- [ ] **80% and 100% Alerts:** Verify amber banner at 80% usage and red alert at 100%+ usage.
- [ ] **Student Mode:** Toggle button switches categories between General and Student sets.
- [ ] **CSV Export:** Download CSV and verify all columns open cleanly in Excel.
- [ ] **Data Safety:** Refresh browser $\rightarrow$ verify all transactions and budgets are intact.

---

*SpendWise – Innovation Lab Project No. 32 | Developer Maintenance Guide v1.1.0*
