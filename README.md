# SpendWise – Personal Expense and Budget Visualizer

> **University Innovation Lab Project No. 32**  
> *"A simple application that categorizes and visualizes spending against a student budget."*  
> **Version 1.1.0 (Developer Control & Complete Functionality Upgrade)**

---

## 1. Project Title & Overview

**SpendWise** is a lightweight, responsive, and privacy-first web application designed to empower university students, young adults, and working professionals to cultivate healthy money management habits. 

The application enables users to track daily micro-expenses (such as ₹10 for tea or ₹40 for street food), record varied income streams (including monthly pocket money and freelance stipends), set monthly budget limits, and immediately visualize actual spending versus planned budgets through interactive charts and real-time analytical reports.

SpendWise is completely self-contained, requiring **no server backend**, **no paid APIs**, and **no third-party tracking**, executing securely inside any modern web browser using client-side HTML5, CSS3, Vanilla JavaScript, Chart.js, and browser `localStorage`.

---

## 2. Problem Statement

Many university students and young adults struggle with budgeting and financial awareness:
1. **Unconscious Micro-Spending:** Small daily transactions (street food, tea, photocopying, auto-rickshaw fares) often go unrecorded, accumulating into major financial deficits by month-end.
2. **Intimidating Banking Tools:** Traditional accounting and banking software are overly complex, cluttered with corporate jargon (*"debits, credits, reconciliation, fiscal depreciation"*), and disengage everyday users.
3. **Absence of Real-Time Budget Comparison:** Students rarely know how much of their planned allowance or pocket money remains until it is already exhausted.
4. **Data Privacy Concerns:** Users hesitate to enter personal expense data into cloud platforms that sell financial profiles or demand bank credentials.

SpendWise addresses these problems with an intuitive, friendly, student-tailored interface that replaces corporate jargon with plain English (*"Money Spent"*, *"Money Left"*, *"Your Money History"*) and delivers instant visual feedback.

---

## 3. Project Objectives

- **Record Daily Income & Expenses:** Fast entry for micro-transactions with decimal support and custom notes.
- **Categorize Spending Automatically:** Segment expenses across student-specific categories (e.g., *Food and Snacks*, *Books and Stationery*, *Hostel Expenses*, *Pocket Money*) and standard lifestyle categories.
- **Set Monthly Budgets:** Define spending caps for specific calendar months and establish category-level limits.
- **Compare Budget vs Actual Spending:** Accurately contrast planned financial limits against real money spent using intuitive visual progress bars, variances, and comparative bar charts.
- **Provide Actionable Financial Insights:** Calculate trends and highest-cost categories directly from real stored data rather than static templates.
- **Promote Financial Literacy:** Help students understand their spending velocity, reduce unnecessary expenses, and safeguard emergency savings.

---

## 4. Target Users

1. **University / College Students (Primary):**
   - Students living in hostels or off-campus apartments managing monthly pocket money or stipends.
   - Requires tracking college fees, textbooks, xerox, snacks, and weekend entertainment.
2. **Young Adults & Working Professionals:**
   - Entry-level employees, gig workers, and freelancers managing salary, rent, bills, groceries, and commute expenses.
3. **Budget Beginners:**
   - Anyone seeking a friction-free financial visualizer without steep learning curves.

---

## 5. Technologies Used

| Technology | Purpose in SpendWise |
|---|---|
| **HTML5 (Semantic)** | Accessible, standards-compliant structural markup with modal dialogues and responsive forms. |
| **CSS3 (Modern Architecture)** | Custom Properties (Design Tokens), Flexbox, CSS Grid, smooth transitions, mobile media queries, and dark/light themes. |
| **Vanilla JavaScript (ES6+)** | Modular object controller (`SpendWiseApp`), state management, date algorithms, and strict input validation. |
| **Chart.js (v4.4.1)** | Canvas-based data visualization: category doughnut charts, grouped bars, and multi-month trend charts. |
| **Browser `localStorage`** | Offline data persistence maintaining user transactions, category caps, and preferences across sessions. |

---

## 6. Main Features (All Dynamic)

- ⚡ **1-Tap Quick Add Pills:** Instant recording for frequent student micro-expenses (`+ ₹10 Tea`, `+ ₹20 Bus`, `+ ₹40 Street Food`, `+ ₹50 Stationery`, `+ ₹100 Xerox/Books`).
- 🎓 **Student Mode Toggle:** Dynamically swaps standard categories for student-specific groupings and unlocks the **Pocket Money vs Spending** tracking card.
- 🎯 **Budget vs Actual Dashboard:** Live calculation of percentage utilized, remaining balance, and status indicators.
- ⚠️ **Automated Warning System:**
  - **Amber Alert (80% Usage):** Alerts user when approaching their monthly spending ceiling.
  - **Red Alert (100%+ Overbudget):** Notifies user immediately if spending exceeds planned monthly allowance with negative remaining amount.
- 📊 **5 Interactive Visualizations:**
  1. Category-wise Spending Doughnut Chart.
  2. Monthly Spending 6-Month Trend Bar Chart.
  3. Income vs Expense Cashflow Comparison Chart.
  4. Planned Budget vs Actual Spending Chart.
  5. Category-wise Budget Cap vs Real Spending Comparison Bar Chart.
- 💡 **Dynamic Financial Insights:** Identifies highest individual expense, top spending category, and month-over-month variances.
- 📥 **CSV Export with UTF-8 BOM:** Exports the complete transaction history into MS Excel / Google Sheets compatible `.csv` files.
- 🎨 **Customization & Dark Mode:** Customizable user display name, currency selector (`INR ₹`, `USD $`, `EUR €`, `GBP £`), and instant light/dark mode switcher.
- 🛡️ **Zero-Data Defaults:** Starts with no transactions or budgets; dashboard totals display zero until you add your own data.

---

## 7. Budget Calculation Method & Mathematical Rules

SpendWise applies rigorous accounting principles separating cash inflow (income) from expenditure:

### 1. Monthly Budget Remaining Formula
$$\text{Remaining Budget} = \text{Monthly Budget}_M - \sum_{i \in \text{Expenses}_M} \text{Amount}_i$$

*Rules:*
- Only transactions where `type === 'expense'` and `date` belongs to selected month $M$ (`YYYY-MM`) are included.
- Income is **never** added to the monthly expense budget total.
- When spending exceeds the planned budget, SpendWise accurately displays negative remaining money (e.g. `-₹500.00`) in red.

### 2. Budget Usage Percentage
$$\text{Budget Usage \%} = \left( \frac{\sum \text{Expenses}_M}{\text{Monthly Budget}_M} \right) \times 100$$
*(Safely evaluates to 0% when budget is unallocated).*

### 3. Warning Threshold Triggers
- **Safe:** $\text{Budget Usage \%} < 80\%$ (Green Indicator)
- **Warning:** $80\% \le \text{Budget Usage \%} \le 100\%$ (Amber Indicator & Warning Banner)
- **Exceeded:** $\text{Budget Usage \%} > 100\%$ (Red Indicator, Danger Alert, & Overspent Variance)

---

## 8. Interdisciplinary Contributions

Innovation Lab Project No. 32 merges Computer Science & Engineering with Commerce / Financial Management concepts:

```
+-----------------------------------------------------------------------------------+
|                           INNOVATION LAB PROJECT NO. 32                           |
+-----------------------------------------+-----------------------------------------+
|        CSE / AI & ML CONTRIBUTION       |     COMMERCE & MANAGEMENT CONTRIBUTION  |
+-----------------------------------------+-----------------------------------------+
| 1. Modular SPA Controller Architecture  | 1. Personal Cash Flow Management        |
| 2. Reactive DOM Updates & State Flow    | 2. Variance Analysis (Planned vs Actual)|
| 3. Input Validation & ID Collision      | 3. Zero-Based vs Cap Budgeting Models   |
| 4. Chart.js Canvas Optimization         | 4. Expenditure Categorization Theory    |
| 5. CSV Stream Encoding & UTF-8 BOM      | 5. Pocket Money Ratio & Savings Buffer  |
| 6. Corrupted Storage Fault Recovery     | 6. Behavioral Nudges (80% Alert Rule)   |
+-----------------------------------------+-----------------------------------------+
```

---

## 9. Four-Member Team Work Breakdown

| Team Member | Project Role | Academic Focus |
|---|---|---|
| **Member 1** | **Frontend UI & Markup Architect** | Designed the semantic HTML5 structure in `index.html`, accessible form layouts, modal dialogs, and tab navigation. |
| **Member 2** | **Styling & Responsive Designer** | Crafted the CSS architecture in `style.css`, soft green color scheme, card design, dark/light themes, and mobile responsive breakpoints. |
| **Member 3** | **JavaScript & Budgeting Calculations** | Programmed the calculation engine (`SpendWiseCalculations`), validation algorithms, date calculations, and remaining budget formulas. |
| **Member 4** | **Data Visualizations & QA/Documentation** | Configured `config.js`, Chart.js visualizers, `localStorage` persistence, CSV export stream, and authored project documentation and `DEVELOPER_GUIDE.md`. |

---

## 10. File Structure

```
SpendWise/
├── config.js            # Central Developer Configuration (constants, defaults, categories, currencies)
├── index.html           # Semantic HTML5 website structure & dialogs
├── style.css            # Modern styling, design tokens & responsive media queries
├── script.js            # Core application engine (storage, calculations, charts, UI controller)
├── DEVELOPER_GUIDE.md   # Developer maintenance guide for future upgrades and bug fixes
└── README.md            # Comprehensive university project documentation
```

---

## 11. How to Run the Application

SpendWise requires **zero installation**, zero compilation, and no Node.js/Python server setup:

1. Navigate to your project folder (`c:\Users\p1622\OneDrive\Documents\SpendWise`).
2. Double-click **`index.html`** or right-click $\rightarrow$ **Open With** $\rightarrow$ **Google Chrome / Microsoft Edge / Firefox**.
3. The application will boot with zero income, expenses, and budgets. Add your own records to begin tracking.

---

*SpendWise – University Innovation Lab Project No. 32 | First-Year B.Tech CSE (AI & ML) Project*
