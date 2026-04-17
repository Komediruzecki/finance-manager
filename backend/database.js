const Database = require('better-sqlite3');
const path = require('path');

const DB_PATH = path.join(__dirname, '..', 'db', process.env.NODE_ENV === 'test' ? 'test.db' : 'finance.db');
const db = new Database(DB_PATH);

// Enable WAL mode for better performance
db.pragma('journal_mode = WAL');
db.pragma('foreign_keys = ON');

// Run migrations
migrate();

function migrate() {
  // Create profiles table
  db.exec(`
    CREATE TABLE IF NOT EXISTS profiles (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL UNIQUE,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create categories table
  db.exec(`
    CREATE TABLE IF NOT EXISTS categories (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT NOT NULL DEFAULT '#6b7280',
      icon TEXT NOT NULL DEFAULT 'tag',
      type TEXT NOT NULL DEFAULT 'expense',
      parent_id INTEGER,
      tax_deductible INTEGER DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      profile_id INTEGER NOT NULL DEFAULT 1
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_categories_profile ON categories(profile_id)');

  // Create transactions table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      description TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL,
      date TEXT NOT NULL,
      beneficiary TEXT DEFAULT '',
      payor TEXT DEFAULT '',
      category_id INTEGER,
      currency TEXT NOT NULL DEFAULT 'USD',
      amount_local REAL,
      means_of_payment TEXT DEFAULT '',
      exchange_rate REAL DEFAULT 1.0,
      type TEXT NOT NULL DEFAULT 'expense',
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      updated_at TEXT NOT NULL DEFAULT (datetime('now')),
      profile_id INTEGER NOT NULL DEFAULT 1
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_profile ON transactions(profile_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_date ON transactions(date)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_transactions_category ON transactions(category_id)');

  // Create budgets table
  db.exec(`
    CREATE TABLE IF NOT EXISTS budgets (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      category_id INTEGER NOT NULL,
      amount REAL NOT NULL,
      period TEXT NOT NULL DEFAULT 'monthly',
      start_date TEXT NOT NULL,
      end_date TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      profile_id INTEGER NOT NULL DEFAULT 1
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_budgets_profile ON budgets(profile_id)');

  // Create savings_goals table
  db.exec(`
    CREATE TABLE IF NOT EXISTS savings_goals (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      target_amount REAL NOT NULL,
      current_amount REAL NOT NULL DEFAULT 0,
      deadline TEXT,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      profile_id INTEGER NOT NULL DEFAULT 1
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_savings_goals_profile ON savings_goals(profile_id)');

  // Create emergency_fund_config table
  db.exec(`
    CREATE TABLE IF NOT EXISTS emergency_fund_config (
      id INTEGER PRIMARY KEY,
      monthly_expenses REAL NOT NULL DEFAULT 0,
      profile_id INTEGER NOT NULL DEFAULT 1
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_emergency_fund_profile ON emergency_fund_config(profile_id)');

  // Create loans table
  db.exec(`
    CREATE TABLE IF NOT EXISTS loans (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      principal REAL NOT NULL,
      interest_rate REAL NOT NULL DEFAULT 5.0,
      start_date TEXT NOT NULL,
      term_months INTEGER NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      profile_id INTEGER NOT NULL DEFAULT 1
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_loans_profile ON loans(profile_id)');

  // Create loan_rate_periods table
  db.exec(`
    CREATE TABLE IF NOT EXISTS loan_rate_periods (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      rate REAL NOT NULL,
      start_month INTEGER NOT NULL,
      end_month INTEGER
    );
  `);

  // Create loan_prepayments table
  db.exec(`
    CREATE TABLE IF NOT EXISTS loan_prepayments (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      loan_id INTEGER NOT NULL,
      month INTEGER NOT NULL,
      amount REAL NOT NULL,
      note TEXT DEFAULT ''
    );
  `);

  // Create settings table
  db.exec(`
    CREATE TABLE IF NOT EXISTS settings (
      key TEXT NOT NULL,
      value TEXT NOT NULL,
      profile_id INTEGER DEFAULT 1,
      PRIMARY KEY (key, profile_id)
    );
  `);

  // Create users table for authentication
  db.exec(`
    CREATE TABLE IF NOT EXISTS users (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      username TEXT NOT NULL UNIQUE,
      password_hash TEXT NOT NULL,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );
  `);

  // Create sessions table for express-session
  db.exec(`
    CREATE TABLE IF NOT EXISTS sessions (
      sid TEXT PRIMARY KEY,
      sess TEXT NOT NULL,
      expire TEXT NOT NULL
    );
  `);

  // Create accounts table
  db.exec(`
    CREATE TABLE IF NOT EXISTS accounts (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      type TEXT NOT NULL DEFAULT 'giro',
      currency TEXT NOT NULL DEFAULT 'USD',
      balance REAL NOT NULL DEFAULT 0,
      notes TEXT DEFAULT '',
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      profile_id INTEGER NOT NULL DEFAULT 1
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_accounts_profile ON accounts(profile_id)');

  // Create account_balance_history table
  db.exec(`
    CREATE TABLE IF NOT EXISTS account_balance_history (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      account_id INTEGER NOT NULL,
      balance REAL NOT NULL,
      recorded_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (account_id) REFERENCES accounts(id) ON DELETE CASCADE
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_balance_history_account ON account_balance_history(account_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_balance_history_recorded ON account_balance_history(recorded_at)');

  db.exec(`
    CREATE TABLE IF NOT EXISTS recurring_transactions (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL DEFAULT 1,
      description TEXT NOT NULL DEFAULT '',
      amount REAL NOT NULL,
      type TEXT NOT NULL DEFAULT 'expense',
      category_id INTEGER,
      frequency TEXT NOT NULL DEFAULT 'monthly',
      day_of_month INTEGER,
      next_date TEXT,
      notes TEXT DEFAULT '',
      active INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    )
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_recurring_profile ON recurring_transactions(profile_id)');

  // Create tags table
  db.exec(`
    CREATE TABLE IF NOT EXISTS tags (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT NOT NULL,
      color TEXT DEFAULT '#6b7280',
      profile_id INTEGER NOT NULL DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      UNIQUE(name, profile_id)
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_tags_profile ON tags(profile_id)');

  // Create transaction_tags junction table
  db.exec(`
    CREATE TABLE IF NOT EXISTS transaction_tags (
      transaction_id INTEGER NOT NULL,
      tag_id INTEGER NOT NULL,
      PRIMARY KEY (transaction_id, tag_id),
      FOREIGN KEY (transaction_id) REFERENCES transactions(id) ON DELETE CASCADE,
      FOREIGN KEY (tag_id) REFERENCES tags(id) ON DELETE CASCADE
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_tx_tags_tx ON transaction_tags(transaction_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_tx_tags_tag ON transaction_tags(tag_id)');

  // Create category_mappings table for auto-categorization
  db.exec(`
    CREATE TABLE IF NOT EXISTS category_mappings (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      profile_id INTEGER NOT NULL,
      pattern TEXT NOT NULL,
      category_id INTEGER NOT NULL,
      confidence REAL NOT NULL,
      use_count INTEGER DEFAULT 1,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      FOREIGN KEY (profile_id) REFERENCES profiles(id),
      FOREIGN KEY (category_id) REFERENCES categories(id)
    );
  `);
  db.exec('CREATE INDEX IF NOT EXISTS idx_mappings_profile ON category_mappings(profile_id)');
  db.exec('CREATE INDEX IF NOT EXISTS idx_mappings_pattern ON category_mappings(pattern)');

  // Migration: Add profile_id to existing tables (for upgrades)
  if (!columnExists('categories', 'profile_id')) {
    try { db.exec('ALTER TABLE categories ADD COLUMN profile_id INTEGER NOT NULL DEFAULT 1'); } catch(e) {}
  }
  if (!columnExists('transactions', 'profile_id')) {
    try { db.exec('ALTER TABLE transactions ADD COLUMN profile_id INTEGER NOT NULL DEFAULT 1'); } catch(e) {}
  }
  if (!columnExists('budgets', 'profile_id')) {
    try { db.exec('ALTER TABLE budgets ADD COLUMN profile_id INTEGER NOT NULL DEFAULT 1'); } catch(e) {}
  }
  if (!columnExists('loans', 'profile_id')) {
    try { db.exec('ALTER TABLE loans ADD COLUMN profile_id INTEGER NOT NULL DEFAULT 1'); } catch(e) {}
  }
  if (!columnExists('settings', 'profile_id')) {
    try { db.exec('ALTER TABLE settings ADD COLUMN profile_id INTEGER DEFAULT 1'); } catch(e) {}
  }

  // Migration: Fix sample transaction amounts (should be positive, type determines sign)
  if (columnExists('transactions', 'amount')) {
    try {
      db.exec("UPDATE transactions SET amount = ABS(amount) WHERE profile_id = 1 AND amount < 0");
    } catch(e) {}
  }

  // Migration: Add user_id to profiles table
  if (!columnExists('profiles', 'user_id')) {
    try { db.exec('ALTER TABLE profiles ADD COLUMN user_id INTEGER REFERENCES users(id)'); } catch(e) {}
  }

  // Migration: Add reconciled column to transactions
  if (!columnExists('transactions', 'reconciled')) {
    try { db.exec('ALTER TABLE transactions ADD COLUMN reconciled INTEGER DEFAULT 0'); } catch(e) {}
  }

  // Migration: Add reconciled_at column to transactions
  if (!columnExists('transactions', 'reconciled_at')) {
    try { db.exec('ALTER TABLE transactions ADD COLUMN reconciled_at TEXT'); } catch(e) {}
  }

  // Create default profile if none exist
  const profileCount = db.prepare('SELECT COUNT(*) as c FROM profiles').get();
  if (profileCount.c === 0) {
    db.prepare('INSERT INTO profiles (id, name) VALUES (1, ?)').run('ExampleProfile');
  }

  // Seed default categories for the default profile (if no categories exist for profile 1)
  const catCount = db.prepare('SELECT COUNT(*) as c FROM categories WHERE profile_id = 1').get();
  if (catCount.c === 0) {
    const insertCat = db.prepare(
      'INSERT INTO categories (name, color, icon, type, profile_id) VALUES (?, ?, ?, ?, ?)'
    );
    const defaults = [
      ['Housing', '#dc2626', 'home', 'expense'],
      ['Food & Dining', '#ea580c', 'utensils', 'expense'],
      ['Transportation', '#d97706', 'car', 'expense'],
      ['Healthcare', '#16a34a', 'heart', 'expense'],
      ['Entertainment', '#0891b2', 'film', 'expense'],
      ['Shopping', '#7c3aed', 'shopping-bag', 'expense'],
      ['Utilities', '#475569', 'zap', 'expense'],
      ['Education', '#db2777', 'book', 'expense'],
      ['Personal Care', '#e11d48', 'smile', 'expense'],
      ['Travel', '#0d9488', 'plane', 'expense'],
      ['Salary', '#059669', 'briefcase', 'income'],
      ['Freelance', '#2563eb', 'laptop', 'income'],
      ['Investments', '#4f46e5', 'trending-up', 'income'],
      ['Other Income', '#9333ea', 'plus-circle', 'income'],
    ];
    for (const c of defaults) insertCat.run(...c, 1);
  }

  // Seed demo user if no users exist
  const userCount = db.prepare('SELECT COUNT(*) as c FROM users').get();
  if (userCount.c === 0) {
    // Demo user: maff / add2 (password will be bcrypt hashed)
    const bcrypt = require('bcrypt');
    const passwordHash = bcrypt.hashSync('add2', 10);
    db.prepare('INSERT INTO users (username, password_hash) VALUES (?, ?)').run('maff', passwordHash);
  }

  // Seed sample transactions for ExampleProfile (id=1) if none exist
  const txCount = db.prepare('SELECT COUNT(*) as c FROM transactions WHERE profile_id = 1').get();
  if (txCount.c === 0) {
    const insertTx = db.prepare(
      'INSERT INTO transactions (description, amount, date, category_id, type, profile_id, currency, beneficiary, means_of_payment) VALUES (?,?,?,?,?,?,?,?,?)'
    );
    // Get category IDs for ExampleProfile
    const cats = {};
    db.prepare('SELECT name, id FROM categories WHERE profile_id = 1').all().forEach(c => { cats[c.name] = c.id; });

    // Generate 26 years of realistic transactions (2000-2026)
    const startYear = 2000;
    const currentYear = 2026;
    const inflationRate = 0.03; // 3% annual inflation

    const catId = (name) => cats[name] || null;

    // Helper to get inflation multiplier for a given year
    const inflationMult = (year) => Math.pow(1 + inflationRate, year - startYear);

    // Seed each month from 2000 to current month
    for (let year = startYear; year <= currentYear; year++) {
      const monthsToSeed = year === currentYear ? 4 : 12; // Only Jan-Apr 2026
      for (let month = 1; month <= monthsToSeed; month++) {
        const ym = `${year}-${String(month).padStart(2, '0')}`;
        const mult = inflationMult(year);

        // --- INCOME: Bi-weekly salary (twice a month) + occasional freelance ---
        const baseSalary = 3500 * mult;
        // Bi-weekly salary payments (1st and 15th)
        const payDates = ['01', '15'];
        for (const day of payDates) {
          const date = `${ym}-${day}`;
          insertTx.run('Monthly Salary Deposit', baseSalary / 2, date, catId('Salary'), 'income', 1, 'USD', 'Acme Corp', 'Direct Deposit');
        }
        // Quarterly freelance income (3rd month of each quarter)
        if (month % 3 === 0 && year >= 2002) {
          const freelance = (600 + Math.random() * 400) * mult;
          const day = 20 + Math.floor(Math.random() * 5);
          insertTx.run('Freelance Project Payment', freelance, `${ym}-${String(Math.min(day, 28)).padStart(2, '0')}`, catId('Freelance'), 'income', 1, 'USD', 'Client Project', 'Bank Transfer');
        }
        // Annual bonus in December
        if (month === 12 && year >= 2003) {
          const bonus = (2000 + Math.random() * 1500) * mult;
          insertTx.run('Year-End Bonus', bonus, `${ym}-20`, catId('Salary'), 'income', 1, 'USD', 'Acme Corp', 'Direct Deposit');
        }
        // Annual investment dividend in March
        if (month === 3 && year >= 2005) {
          const dividend = (500 + Math.random() * 300) * mult;
          insertTx.run('Investment Dividend', dividend, `${ym}-15`, catId('Investments'), 'income', 1, 'USD', 'Vanguard Index Fund', 'Reinvested');
        }

        // --- EXPENSES: Recurring monthly bills ---
        // Rent (1st of each month)
        const rent = (900 + Math.random() * 100) * mult;
        insertTx.run('Monthly Rent', rent, `${ym}-01`, catId('Housing'), 'expense', 1, 'USD', 'Oakwood Apartments', 'ACH');
        // Utilities (variable, mid-month)
        const electric = (60 + Math.random() * 40) * mult;
        insertTx.run('Electricity Bill', electric, `${ym}-12`, catId('Utilities'), 'expense', 1, 'USD', 'City Power Co', 'Auto-Pay');
        const gas = (45 + Math.random() * 30) * mult;
        insertTx.run('Natural Gas Bill', gas, `${ym}-15`, catId('Utilities'), 'expense', 1, 'USD', 'Metro Gas', 'Auto-Pay');
        const water = (35 + Math.random() * 15) * mult;
        insertTx.run('Water & Sewage', water, `${ym}-18`, catId('Utilities'), 'expense', 1, 'USD', 'Municipal Water', 'Auto-Pay');
        // Internet (20th)
        const internet = (45 + Math.random() * 20) * mult;
        insertTx.run('Internet Service', internet, `${ym}-20`, catId('Utilities'), 'expense', 1, 'USD', 'FiberNet ISP', 'Credit Card');
        // Phone plan (10th)
        const phone = (55 + Math.random() * 25) * mult;
        insertTx.run('Mobile Phone Plan', phone, `${ym}-10`, catId('Utilities'), 'expense', 1, 'USD', 'Verizon Wireless', 'Auto-Pay');

        // --- FOOD & DINING: Weekly grocery runs + occasional dining ---
        const groceryWeeks = year >= 2010 ? 4 : 3; // More weeks after 2010
        for (let w = 0; w < groceryWeeks; w++) {
          const weekDay = 5 + w * 7; // Friday or Saturday
          const grocery = (80 + Math.random() * 60) * mult;
          insertTx.run('Grocery Shopping - Weekly', grocery, `${ym}-${String(Math.min(weekDay, 28)).padStart(2, '0')}`, catId('Food & Dining'), 'expense', 1, 'USD', 'Whole Foods Market', 'Debit Card');
        }
        // Restaurant dinners (2-3 times per month, more frequent in later years)
        const restaurantCount = year >= 2015 ? 4 : 2;
        for (let r = 0; r < restaurantCount; r++) {
          const rDay = 7 + r * 6 + Math.floor(Math.random() * 3);
          const restaurant = (35 + Math.random() * 45) * mult;
          const restaurants = ['Olive Garden', 'Thai Palace', 'Burger Joint', 'Sushi Bar', 'Pizza Place', 'Local Bistro'];
          insertTx.run('Restaurant Dinner', restaurant, `${ym}-${String(Math.min(rDay, 28)).padStart(2, '0')}`, catId('Food & Dining'), 'expense', 1, 'USD', restaurants[Math.floor(Math.random() * restaurants.length)], 'Credit Card');
        }
        // Coffee shops (3-4 times per week after 2008)
        if (year >= 2008) {
          for (let d = 0; d < 4; d++) {
            const cDay = 3 + d * 7 + Math.floor(Math.random() * 3);
            const coffee = (4 + Math.random() * 3) * mult;
            insertTx.run('Coffee Shop', coffee, `${ym}-${String(Math.min(cDay, 28)).padStart(2, '0')}`, catId('Food & Dining'), 'expense', 1, 'USD', 'Starbucks', 'Credit Card');
          }
        }

        // --- TRANSPORTATION ---
        // Gas for car (weekly after 2005)
        if (year >= 2005) {
          for (let w = 0; w < 4; w++) {
            const gDay = 3 + w * 7;
            const gasAmt = (35 + Math.random() * 25) * mult;
            insertTx.run('Gas Station Fill-up', gasAmt, `${ym}-${String(Math.min(gDay, 28)).padStart(2, '0')}`, catId('Transportation'), 'expense', 1, 'USD', 'Shell Gas Station', 'Credit Card');
          }
        }
        // Public transit pass (monthly, after 2010)
        if (year >= 2010 && month === 1) {
          const transit = (85 + Math.random() * 20) * mult;
          insertTx.run('Monthly Transit Pass', transit, `${ym}-01`, catId('Transportation'), 'expense', 1, 'USD', 'Metro Transit Authority', 'Auto-Pay');
        }
        // Car insurance (quarterly)
        if (month % 3 === 1) {
          const insurance = (120 + Math.random() * 40) * mult;
          insertTx.run('Car Insurance Premium', insurance, `${ym}-${String(Math.min(5 + Math.floor(Math.random() * 10), 28)).padStart(2, '0')}`, catId('Transportation'), 'expense', 1, 'USD', 'State Farm Insurance', 'ACH');
        }
        // Parking (occasional)
        for (let p = 0; p < 3; p++) {
          const pDay = 8 + p * 8 + Math.floor(Math.random() * 4);
          const parking = (12 + Math.random() * 8) * mult;
          insertTx.run('Parking Fee', parking, `${ym}-${String(Math.min(pDay, 28)).padStart(2, '0')}`, catId('Transportation'), 'expense', 1, 'USD', 'Downtown Parking', 'Credit Card');
        }

        // --- HEALTHCARE ---
        // Health insurance (monthly, employer deducted from salary - but also personal contribution)
        if (year >= 2003) {
          const healthIns = (150 + Math.random() * 50) * mult;
          insertTx.run('Health Insurance Premium', healthIns, `${ym}-05`, catId('Healthcare'), 'expense', 1, 'USD', 'Blue Cross', 'Payroll Deduction');
        }
        // Pharmacy (occasional, more frequent after 2020)
        const pharmFreq = year >= 2020 ? 3 : 2;
        for (let p = 0; p < pharmFreq; p++) {
          const phDay = 10 + p * 7 + Math.floor(Math.random() * 3);
          const pharmacy = (15 + Math.random() * 35) * mult;
          insertTx.run('Pharmacy - Prescription', pharmacy, `${ym}-${String(Math.min(phDay, 28)).padStart(2, '0')}`, catId('Healthcare'), 'expense', 1, 'USD', 'CVS Pharmacy', 'Insurance Copay');
        }
        // Gym membership (monthly, after 2012)
        if (year >= 2012) {
          const gym = (45 + Math.random() * 15) * mult;
          insertTx.run('Gym Membership', gym, `${ym}-01`, catId('Healthcare'), 'expense', 1, 'USD', 'Planet Fitness', 'Auto-Pay');
        }

        // --- ENTERTAINMENT ---
        // Streaming services (after 2015)
        if (year >= 2015) {
          const streaming = (12 + Math.random() * 8) * mult;
          insertTx.run('Netflix Subscription', streaming, `${ym}-15`, catId('Entertainment'), 'expense', 1, 'USD', 'Netflix', 'Credit Card');
        }
        if (year >= 2019) {
          const spotify = (10 + Math.random() * 2) * mult;
          insertTx.run('Spotify Premium', spotify, `${ym}-20`, catId('Entertainment'), 'expense', 1, 'USD', 'Spotify', 'Credit Card');
        }
        if (year >= 2020) {
          const disney = (8 + Math.random() * 3) * mult;
          insertTx.run('Disney+ Subscription', disney, `${ym}-10`, catId('Entertainment'), 'expense', 1, 'USD', 'Disney+', 'Credit Card');
        }
        // Movie theater (occasional)
        const movieFreq = year >= 2015 ? 3 : 2;
        for (let m = 0; m < movieFreq; m++) {
          const movDay = 14 + m * 9 + Math.floor(Math.random() * 4);
          const movie = (14 + Math.random() * 8) * mult;
          insertTx.run('Movie Theater', movie, `${ym}-${String(Math.min(movDay, 28)).padStart(2, '0')}`, catId('Entertainment'), 'expense', 1, 'USD', 'AMC Theaters', 'Credit Card');
        }

        // --- SHOPPING ---
        // Amazon orders (bi-weekly after 2008)
        if (year >= 2008) {
          for (let a = 0; a < 3; a++) {
            const aDay = 7 + a * 10 + Math.floor(Math.random() * 3);
            const amazon = (30 + Math.random() * 70) * mult;
            insertTx.run('Online Shopping - Amazon', amazon, `${ym}-${String(Math.min(aDay, 28)).padStart(2, '0')}`, catId('Shopping'), 'expense', 1, 'USD', 'Amazon.com', 'Credit Card');
          }
        }
        // Clothing (seasonal, quarterly)
        if (month === 3 || month === 9) {
          const clothing = (80 + Math.random() * 120) * mult;
          const cDay = 15 + Math.floor(Math.random() * 5);
          insertTx.run('Clothing - Seasonal', clothing, `${ym}-${String(Math.min(cDay, 28)).padStart(2, '0')}`, catId('Shopping'), 'expense', 1, 'USD', 'Macy\'s', 'Credit Card');
        }
        // Holiday shopping (December)
        if (month === 12) {
          const holiday = (200 + Math.random() * 200) * mult;
          const hDay = 15 + Math.floor(Math.random() * 10);
          insertTx.run('Holiday Gift Shopping', holiday, `${ym}-${String(Math.min(hDay, 26)).padStart(2, '0')}`, catId('Shopping'), 'expense', 1, 'USD', 'Various Retailers', 'Credit Card');
        }

        // --- EDUCATION ---
        // Books/courses (occasional)
        for (let e = 0; e < 2; e++) {
          const eDay = 10 + e * 12 + Math.floor(Math.random() * 5);
          const edu = (25 + Math.random() * 75) * mult;
          insertTx.run('Books / Online Course', edu, `${ym}-${String(Math.min(eDay, 28)).padStart(2, '0')}`, catId('Education'), 'expense', 1, 'USD', 'Barnes & Noble', 'Credit Card');
        }
        // Professional certification (annual, February)
        if (month === 2 && year >= 2010) {
          const cert = (200 + Math.random() * 300) * mult;
          insertTx.run('Professional Certification Fee', cert, `${ym}-15`, catId('Education'), 'expense', 1, 'USD', 'Professional Association', 'Credit Card');
        }

        // --- PERSONAL CARE ---
        for (let pc = 0; pc < 3; pc++) {
          const pcDay = 6 + pc * 9 + Math.floor(Math.random() * 3);
          const personal = (25 + Math.random() * 35) * mult;
          insertTx.run('Personal Care Items', personal, `${ym}-${String(Math.min(pcDay, 28)).padStart(2, '0')}`, catId('Personal Care'), 'expense', 1, 'USD', 'Target', 'Credit Card');
        }
        // Haircut (bi-monthly)
        const haircutDay = 20 + Math.floor(Math.random() * 5);
        const haircut = (25 + Math.random() * 15) * mult;
        insertTx.run('Haircut / Barber', haircut, `${ym}-${String(Math.min(haircutDay, 28)).padStart(2, '0')}`, catId('Personal Care'), 'expense', 1, 'USD', 'Local Barber Shop', 'Cash');

        // --- TRAVEL (seasonal, twice a year after 2010) ---
        if (year >= 2010 && (month === 7 || month === 12)) {
          const travelBase = (1200 + Math.random() * 800) * mult;
          const travelDay = 5 + Math.floor(Math.random() * 10);
          insertTx.run('Vacation Travel Expense', travelBase, `${ym}-${String(Math.min(travelDay, 28)).padStart(2, '0')}`, catId('Travel'), 'expense', 1, 'USD', 'Travel Expenses', 'Credit Card');
        }

        // --- ADDITIONAL VARIANCE: Random small expenses ---
        // Occasional coffee/lunch at work
        for (let i = 0; i < 8; i++) {
          const lDay = 2 + i * 3 + Math.floor(Math.random() * 2);
          const lunch = (8 + Math.random() * 12) * mult;
          insertTx.run('Lunch at Work', lunch, `${ym}-${String(Math.min(lDay, 28)).padStart(2, '0')}`, catId('Food & Dining'), 'expense', 1, 'USD', 'Office Cafeteria', 'Cash');
        }
      }
    }
  }
}

function columnExists(table, column) {
  try {
    db.prepare(`SELECT ${column} FROM ${table} WHERE 1=0`).get();
    return true;
  } catch (e) {
    return false;
  }
}

module.exports = db;
