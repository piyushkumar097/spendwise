/**
 * ==============================================================================
 * SPENDWISE – CENTRAL CONFIGURATION FILE (config.js)
 * University Innovation Lab Project No. 32
 * 
 * DEVELOPER CONTROL NOTE:
 * This file contains all global constants, default settings, threshold values,
 * and category definitions. As the project developer, you can modify application
 * defaults here without touching core calculation or UI rendering code.
 * ==============================================================================
 */

const SpendWiseConfig = {
  // Application Versioning (Used for safe data migrations)
  APP_VERSION: '1.1.0',
  APP_NAME: 'SpendWise',
  APP_SUBTITLE: 'Personal Expense and Budget Visualizer',
  PROJECT_CODE: 'Innovation Lab Project No. 32',

  // LocalStorage Keys
  STORAGE_KEYS: {
    DATA: 'spendwise_app_data_v1',
    THEME: 'spendwise_theme_pref',
    VERSION: 'spendwise_schema_version'
  },

  // Supported Currencies and Symbols
  // To add a new currency, simply add its code, symbol, and full label here
  CURRENCIES: {
    INR: { code: 'INR', symbol: '₹', label: 'INR (Indian Rupee)' },
    USD: { code: 'USD', symbol: '$', label: 'USD (US Dollar)' },
    EUR: { code: 'EUR', symbol: '€', label: 'EUR (Euro)' },
    GBP: { code: 'GBP', symbol: '£', label: 'GBP (British Pound)' }
  },

  // Default User Preferences
  DEFAULT_PREFERENCES: {
    userName: 'Student',
    currency: 'INR',
    studentMode: true,
    theme: 'light'
  },

  // Standard Lifestyle Categories (General / Adult Mode)
  STANDARD_CATEGORIES: [
    'Food',
    'Transportation',
    'Shopping',
    'Education',
    'Entertainment',
    'Healthcare',
    'Bills',
    'Other'
  ],

  // Student Mode Categories (Tailored for College & University Students)
  STUDENT_CATEGORIES: [
    'Food and Snacks',
    'Books and Stationery',
    'Transportation',
    'Hostel Expenses',
    'College Fees',
    'Entertainment',
    'Pocket Money',
    'Other'
  ],

  // Income Sources
  INCOME_SOURCES: [
    'Pocket Money',
    'Salary',
    'Freelancing',
    'Scholarship',
    'Business',
    'Other'
  ],

  // Budget Warning Thresholds (in percentage)
  BUDGET_THRESHOLDS: {
    WARNING: 80, // Show amber warning alert at 80% usage
    DANGER: 100  // Show red danger alert when budget is exceeded
  },

  // 1-Tap Quick Add Shortcuts for Fast Daily Expense Recording
  QUICK_ADD_PRESETS: [
    { label: '+ ₹10 Tea', desc: 'Tea / Chai', amount: 10, category: 'Food' },
    { label: '+ ₹20 Bus', desc: 'Bus Fare', amount: 20, category: 'Transportation' },
    { label: '+ ₹40 Street Food', desc: 'Street food', amount: 40, category: 'Food' },
    { label: '+ ₹50 Stationery', desc: 'Stationery / Pen', amount: 50, category: 'Education' },
    { label: '+ ₹100 Books', desc: 'Book / Xerox', amount: 100, category: 'Education' }
  ],

  // Chart Color Palette
  CHART_COLORS: [
    '#10b981', // Emerald
    '#3b82f6', // Blue
    '#f59e0b', // Amber
    '#ec4899', // Pink
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#14b8a6', // Teal
    '#f97316', // Orange
    '#6366f1', // Indigo
    '#84cc16'  // Lime
  ]
};

// Freeze configuration object in production to prevent unintended runtime modification
if (typeof Object.freeze === 'function') {
  Object.freeze(SpendWiseConfig);
}
