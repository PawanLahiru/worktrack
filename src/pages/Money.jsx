import { useEffect, useMemo, useState } from "react";

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";

import {
  ChevronLeft,
  ChevronRight,
  Wallet,
  Clock3,
  Train,
  Plus,
  Pencil,
  X,
  Save,
  Trash2,
  Utensils,
  Bus,
  ShoppingBag,
  ReceiptText,
  House,
  CircleEllipsis,
} from "lucide-react";

function Money() {
  /* =========================================================
     TABS
  ========================================================= */

  const [activeTab, setActiveTab] =
    useState("overview");

  /* =========================================================
     MONTH
  ========================================================= */

  const [selectedMonth, setSelectedMonth] =
    useState(() => {
      const now = new Date();

      const year =
        now.getFullYear();

      const month =
        String(
          now.getMonth() + 1
        ).padStart(2, "0");

      return `${year}-${month}`;
    });

  /* =========================================================
     SALARY SETTINGS
  ========================================================= */

  const [hourlyRate, setHourlyRate] =
    useState(() => {
      const saved =
        localStorage.getItem(
          "worktrack-hourly-rate"
        );

      return saved
        ? Number(saved)
        : 1250;
    });

  const [
    transportPerDay,
    setTransportPerDay,
  ] = useState(() => {
    const saved =
      localStorage.getItem(
        "worktrack-transport-per-day"
      );

    return saved
      ? Number(saved)
      : 500;
  });

  /* =========================================================
     EXPENSES
  ========================================================= */

  const [expenses, setExpenses] =
    useState(() => {
      const saved =
        localStorage.getItem(
          "worktrack-expenses"
        );

      if (!saved) return [];

      try {
        const parsed =
          JSON.parse(saved);

        return Array.isArray(parsed)
          ? parsed
          : [];
      } catch {
        return [];
      }
    });

  /* =========================================================
     EXPENSE FORM
  ========================================================= */

  const [
    showExpenseForm,
    setShowExpenseForm,
  ] = useState(false);

  const [
    editingExpenseId,
    setEditingExpenseId,
  ] = useState(null);

  const [
    expenseAmount,
    setExpenseAmount,
  ] = useState("");

  const [
    expenseDate,
    setExpenseDate,
  ] = useState(getTodayDate());

  const [
    expenseCategory,
    setExpenseCategory,
  ] = useState("Food");

  const [
    expenseNote,
    setExpenseNote,
  ] = useState("");

  /* =========================================================
     FIRESTORE HELPERS
  ========================================================= */

  async function saveExpenseToFirestore(
    expense
  ) {
    const user =
      auth.currentUser;

    if (!user) return;

    try {
      await setDoc(
        doc(
          db,
          "users",
          user.uid,
          "expenses",
          expense.id
        ),
        expense
      );
    } catch (error) {
      console.error(
        "Failed to save expense:",
        error
      );
    }
  }

  async function deleteExpenseFromFirestore(
    expenseId
  ) {
    const user =
      auth.currentUser;

    if (!user) return;

    try {
      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "expenses",
          expenseId
        )
      );
    } catch (error) {
      console.error(
        "Failed to delete expense:",
        error
      );
    }
  }

  /* =========================================================
     FIRESTORE INITIAL SYNC / MIGRATION
  ========================================================= */

  useEffect(() => {
    async function syncExpenseData() {
      const user =
        auth.currentUser;

      if (!user) {
        console.log(
          "No logged-in user."
        );

        return;
      }

      try {
        const expenseRef =
          collection(
            db,
            "users",
            user.uid,
            "expenses"
          );

        const snapshot =
          await getDocs(expenseRef);

        /*
          CASE 1:
          Firestore already has expenses
        */

        if (!snapshot.empty) {
          const cloudExpenses =
            snapshot.docs.map(
              (docItem) => ({
                id: docItem.id,
                ...docItem.data(),
              })
            );

          setExpenses(
            cloudExpenses
          );

          localStorage.setItem(
            "worktrack-expenses",
            JSON.stringify(
              cloudExpenses
            )
          );

          localStorage.setItem(
            `worktrack-expenses-migrated-${user.uid}`,
            "true"
          );

          console.log(
            "Loaded expenses from Firestore."
          );

          return;
        }

        /*
          CASE 2:
          Firestore empty → migrate old local data
        */

        const migrationKey =
          `worktrack-expenses-migrated-${user.uid}`;

        const alreadyMigrated =
          localStorage.getItem(
            migrationKey
          ) === "true";

        const savedLocal =
          localStorage.getItem(
            "worktrack-expenses"
          );

        let localExpenses = [];

        if (savedLocal) {
          try {
            const parsed =
              JSON.parse(savedLocal);

            if (
              Array.isArray(parsed)
            ) {
              localExpenses =
                parsed;
            }
          } catch (error) {
            console.error(
              "Failed to read local expenses:",
              error
            );
          }
        }

        if (
          !alreadyMigrated &&
          localExpenses.length > 0
        ) {
          console.log(
            `Migrating ${localExpenses.length} local expenses...`
          );

          await Promise.all(
            localExpenses.map(
              (expense) =>
                setDoc(
                  doc(
                    db,
                    "users",
                    user.uid,
                    "expenses",
                    expense.id
                  ),
                  expense
                )
            )
          );

          localStorage.setItem(
            migrationKey,
            "true"
          );

          setExpenses(
            localExpenses
          );

          console.log(
            "Expense migration complete."
          );

          return;
        }

        setExpenses([]);

        localStorage.setItem(
          "worktrack-expenses",
          JSON.stringify([])
        );

        localStorage.setItem(
          migrationKey,
          "true"
        );

        console.log(
          "No expenses found."
        );
      } catch (error) {
        console.error(
          "Expense sync failed:",
          error
        );
      }
    }

    syncExpenseData();
  }, []);

  /* =========================================================
     LOCAL STORAGE
  ========================================================= */

  useEffect(() => {
    localStorage.setItem(
      "worktrack-hourly-rate",
      String(hourlyRate)
    );
  }, [hourlyRate]);

  useEffect(() => {
    localStorage.setItem(
      "worktrack-transport-per-day",
      String(transportPerDay)
    );
  }, [transportPerDay]);

  useEffect(() => {
    localStorage.setItem(
      "worktrack-expenses",
      JSON.stringify(expenses)
    );
  }, [expenses]);

  /* =========================================================
     WORK ENTRIES
  ========================================================= */

  const workEntries =
    useMemo(() => {
      const saved =
        localStorage.getItem(
          "worktrack-work-entries"
        );

      if (!saved) return [];

      try {
        const parsed =
          JSON.parse(saved);

        return Array.isArray(parsed)
          ? parsed
          : [];
      } catch {
        return [];
      }
    }, []);

  /* =========================================================
     MONTH FILTERS
  ========================================================= */

  const monthlyEntries =
    workEntries.filter(
      (entry) =>
        entry.date?.startsWith(
          selectedMonth
        )
    );

  const monthlyExpenses =
    expenses.filter(
      (expense) =>
        expense.date?.startsWith(
          selectedMonth
        )
    );

  /* =========================================================
     SALARY CALCULATIONS
  ========================================================= */

  const totalMinutes =
    monthlyEntries.reduce(
      (total, entry) =>
        total +
        Number(
          entry.totalMinutes || 0
        ),
      0
    );

  const totalHours =
    totalMinutes / 60;

  const workedDays =
    new Set(
      monthlyEntries.map(
        (entry) =>
          entry.date
      )
    ).size;

  const baseSalary =
    Math.round(
      totalHours *
        hourlyRate
    );

  const transportTotal =
    workedDays *
    transportPerDay;

  const estimatedSalary =
    baseSalary +
    transportTotal;

  /* =========================================================
     EXPENSE CALCULATIONS
  ========================================================= */

  const totalExpenses =
    monthlyExpenses.reduce(
      (total, expense) =>
        total +
        Number(
          expense.amount || 0
        ),
      0
    );

  const categoryTotals =
    monthlyExpenses.reduce(
      (totals, expense) => {
        const category =
          expense.category ||
          "Other";

        totals[category] =
          (totals[category] ||
            0) +
          Number(
            expense.amount ||
              0
          );

        return totals;
      },
      {}
    );

  const categoryData =
    Object.entries(
      categoryTotals
    )
      .map(
        ([category, amount]) => ({
          category,
          amount,
        })
      )
      .sort(
        (a, b) =>
          b.amount -
          a.amount
      );

  const highestCategoryAmount =
    categoryData.length > 0
      ? Math.max(
          ...categoryData.map(
            (item) =>
              item.amount
          )
        )
      : 0;

  const spendingPercentage =
    estimatedSalary > 0
      ? Math.min(
          100,
          Math.floor(
            (totalExpenses /
              estimatedSalary) *
              100
          )
        )
      : 0;

  const recentExpenses =
    [...monthlyExpenses]
      .sort(
        (a, b) =>
          new Date(
            b.date
          ) -
          new Date(
            a.date
          )
      )
      .slice(0, 5);

  const remainingBalance =
    estimatedSalary -
    totalExpenses;

  /* =========================================================
     DATE HELPERS
  ========================================================= */

  function getTodayDate() {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        now.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function changeMonth(
    direction
  ) {
    const [
      year,
      month,
    ] =
      selectedMonth
        .split("-")
        .map(Number);

    const date =
      new Date(
        year,
        month - 1,
        1
      );

    date.setMonth(
      date.getMonth() +
        direction
    );

    const newYear =
      date.getFullYear();

    const newMonth =
      String(
        date.getMonth() + 1
      ).padStart(2, "0");

    setSelectedMonth(
      `${newYear}-${newMonth}`
    );
  }

  function getMonthLabel() {
    const [
      year,
      month,
    ] =
      selectedMonth
        .split("-")
        .map(Number);

    return new Date(
      year,
      month - 1,
      1
    ).toLocaleDateString(
      "en-US",
      {
        month: "long",
        year: "numeric",
      }
    );
  }

  /* =========================================================
     FORMATTERS
  ========================================================= */

  function formatMinutes(
    totalMinutes
  ) {
    const hours =
      Math.floor(
        totalMinutes / 60
      );

    const minutes =
      totalMinutes % 60;

    return `${hours}h ${String(
      minutes
    ).padStart(2, "0")}m`;
  }

  function formatYen(
    amount
  ) {
    return new Intl.NumberFormat(
      "ja-JP",
      {
        style: "currency",
        currency: "JPY",
        maximumFractionDigits: 0,
      }
    ).format(amount);
  }

  function formatDate(
    dateString
  ) {
    const date =
      new Date(
        `${dateString}T00:00:00`
      );

    return date.toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        day: "numeric",
        month: "short",
      }
    );
  }

  /* =========================================================
     EXPENSE FORM HELPERS
  ========================================================= */

  function resetExpenseForm() {
    setEditingExpenseId(
      null
    );

    setExpenseAmount(
      ""
    );

    setExpenseDate(
      getTodayDate()
    );

    setExpenseCategory(
      "Food"
    );

    setExpenseNote(
      ""
    );
  }

  function openNewExpenseForm() {
    resetExpenseForm();

    setShowExpenseForm(
      true
    );
  }

  function closeExpenseForm() {
    resetExpenseForm();

    setShowExpenseForm(
      false
    );
  }

  /* =========================================================
     SAVE / EDIT EXPENSE
  ========================================================= */

  async function handleSaveExpense() {
    const amount =
      Number(
        expenseAmount
      );

    if (!expenseDate) {
      alert(
        "Please select a date."
      );

      return;
    }

    if (
      !amount ||
      amount <= 0
    ) {
      alert(
        "Please enter a valid expense amount."
      );

      return;
    }

    if (
      editingExpenseId
    ) {
      const currentExpense =
        expenses.find(
          (expense) =>
            expense.id ===
            editingExpenseId
        );

      if (
        !currentExpense
      ) {
        return;
      }

      const updatedExpense = {
        ...currentExpense,

        amount,

        date:
          expenseDate,

        category:
          expenseCategory,

        note:
          expenseNote,
      };

      setExpenses(
        (previous) =>
          previous.map(
            (expense) =>
              expense.id ===
              editingExpenseId
                ? updatedExpense
                : expense
          )
      );

      await saveExpenseToFirestore(
        updatedExpense
      );
    } else {
      const newExpense = {
        id:
          crypto.randomUUID(),

        amount,

        date:
          expenseDate,

        category:
          expenseCategory,

        note:
          expenseNote,
      };

      setExpenses(
        (previous) => [
          ...previous,
          newExpense,
        ]
      );

      await saveExpenseToFirestore(
        newExpense
      );
    }

    closeExpenseForm();
  }

  /* =========================================================
     EDIT EXPENSE
  ========================================================= */

  function handleEditExpense(
    expense
  ) {
    setEditingExpenseId(
      expense.id
    );

    setExpenseAmount(
      expense.amount
    );

    setExpenseDate(
      expense.date
    );

    setExpenseCategory(
      expense.category
    );

    setExpenseNote(
      expense.note ||
        ""
    );

    setShowExpenseForm(
      true
    );
  }

  /* =========================================================
     DELETE EXPENSE
  ========================================================= */

  async function handleDeleteExpense() {
    if (
      !editingExpenseId
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this expense?"
      );

    if (
      !confirmed
    ) {
      return;
    }

    const expenseIdToDelete =
      editingExpenseId;

    setExpenses(
      (previous) =>
        previous.filter(
          (expense) =>
            expense.id !==
            expenseIdToDelete
        )
    );

    await deleteExpenseFromFirestore(
      expenseIdToDelete
    );

    closeExpenseForm();
  }

  /* =========================================================
     CATEGORY ICONS
  ========================================================= */

  function getCategoryIcon(
    category
  ) {
    switch (category) {
      case "Food":
        return (
          <Utensils
            size={18}
          />
        );

      case "Transport":
        return (
          <Bus
            size={18}
          />
        );

      case "Shopping":
        return (
          <ShoppingBag
            size={18}
          />
        );

      case "Bills":
        return (
          <ReceiptText
            size={18}
          />
        );

      case "Rent":
        return (
          <House
            size={18}
          />
        );

      default:
        return (
          <CircleEllipsis
            size={18}
          />
        );
    }
  }

  /* =========================================================
     SORTING
  ========================================================= */

  const sortedEntries =
    [...monthlyEntries].sort(
      (a, b) =>
        new Date(
          b.date
        ) -
        new Date(
          a.date
        )
    );

  const sortedExpenses =
    [...monthlyExpenses].sort(
      (a, b) =>
        new Date(
          b.date
        ) -
        new Date(
          a.date
        )
    );

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="money-page">
      <header className="money-header">
        <p className="page-eyebrow">
          MONEY MANAGER
        </p>

        <h1>Money</h1>

        <p>
          Track your salary,
          expenses and balance.
        </p>
      </header>

      <div className="money-tabs">
        <button
          className={
            activeTab ===
            "overview"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "overview"
            )
          }
        >
          Overview
        </button>

        <button
          className={
            activeTab ===
            "salary"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "salary"
            )
          }
        >
          Salary
        </button>

        <button
          className={
            activeTab ===
            "expenses"
              ? "active"
              : ""
          }
          onClick={() =>
            setActiveTab(
              "expenses"
            )
          }
        >
          Expenses
        </button>
      </div>

      {/* =====================================================
          OVERVIEW
      ====================================================== */}

      {activeTab ===
        "overview" && (
        <>
          <section className="card month-selector">
            <button
              onClick={() =>
                changeMonth(-1)
              }
            >
              <ChevronLeft
                size={18}
              />
            </button>

            <strong>
              {getMonthLabel()}
            </strong>

            <button
              onClick={() =>
                changeMonth(1)
              }
            >
              <ChevronRight
                size={18}
              />
            </button>
          </section>

          <section className="card balance-main-card">
            <p className="section-label">
              AVAILABLE BALANCE
            </p>

            <h2>
              {formatYen(
                remainingBalance
              )}
            </h2>

            <p>
              Estimated remaining
              this month
            </p>
          </section>

          <section className="overview-money-grid">
            <div className="card overview-money-card">
              <span>
                Income
              </span>

              <strong>
                {formatYen(
                  estimatedSalary
                )}
              </strong>
            </div>

            <div className="card overview-money-card">
              <span>
                Expenses
              </span>

              <strong>
                {formatYen(
                  totalExpenses
                )}
              </strong>
            </div>
          </section>

          <section className="card">
            <div className="overview-title-row">
              <div>
                <p className="section-label">
                  MONTHLY SPENDING
                </p>

                <strong>
                  {
                    spendingPercentage
                  }
                  % of income
                </strong>
              </div>

              <span>
                {formatYen(
                  totalExpenses
                )}
              </span>
            </div>

            <div className="spending-progress">
              <div
                className="spending-progress-fill"
                style={{
                  width: `${spendingPercentage}%`,
                }}
              />
            </div>

            <div className="spending-progress-info">
              <span>
                {formatYen(
                  totalExpenses
                )}{" "}
                spent
              </span>

              <span>
                {formatYen(
                  Math.max(
                    0,
                    remainingBalance
                  )
                )}{" "}
                remaining
              </span>
            </div>
          </section>

          <section className="card">
            <p className="section-label">
              SPENDING BY CATEGORY
            </p>

            {categoryData.length ===
              0 && (
              <p className="empty-message">
                Add some expenses
                to see your
                spending breakdown.
              </p>
            )}

            {categoryData.map(
              (item) => {
                const barWidth =
                  highestCategoryAmount >
                  0
                    ? Math.round(
                        (item.amount /
                          highestCategoryAmount) *
                          100
                      )
                    : 0;

                const categoryPercentage =
                  totalExpenses >
                  0
                    ? Math.round(
                        (item.amount /
                          totalExpenses) *
                          100
                      )
                    : 0;

                return (
                  <div
                    className="category-spending-row"
                    key={
                      item.category
                    }
                  >
                    <div className="category-spending-top">
                      <div className="category-name">
                        <div className="category-small-icon">
                          {getCategoryIcon(
                            item.category
                          )}
                        </div>

                        <div>
                          <strong>
                            {
                              item.category
                            }
                          </strong>

                          <span>
                            {
                              categoryPercentage
                            }
                            %
                          </span>
                        </div>
                      </div>

                      <strong>
                        {formatYen(
                          item.amount
                        )}
                      </strong>
                    </div>

                    <div className="category-bar">
                      <div
                        className="category-bar-fill"
                        style={{
                          width: `${barWidth}%`,
                        }}
                      />
                    </div>
                  </div>
                );
              }
            )}
          </section>

          <section className="card">
            <div className="overview-section-header">
              <p className="section-label">
                RECENT EXPENSES
              </p>

              {recentExpenses.length >
                0 && (
                <button
                  className="text-button"
                  onClick={() =>
                    setActiveTab(
                      "expenses"
                    )
                  }
                >
                  View All
                </button>
              )}
            </div>

            {recentExpenses.length ===
              0 && (
              <p className="empty-message">
                No expenses yet.
              </p>
            )}

            {recentExpenses.map(
              (expense) => (
                <div
                  className="expense-row"
                  key={
                    expense.id
                  }
                >
                  <div className="expense-left">
                    <div className="expense-icon">
                      {getCategoryIcon(
                        expense.category
                      )}
                    </div>

                    <div>
                      <strong>
                        {
                          expense.category
                        }
                      </strong>

                      <p>
                        {formatDate(
                          expense.date
                        )}
                      </p>

                      {expense.note && (
                        <small>
                          {
                            expense.note
                          }
                        </small>
                      )}
                    </div>
                  </div>

                  <strong>
                    {formatYen(
                      expense.amount
                    )}
                  </strong>
                </div>
              )
            )}
          </section>

          <section className="card">
            <p className="section-label">
              WORK & INCOME
            </p>

            <div className="stat-row">
              <span>
                Worked
              </span>

              <strong>
                {formatMinutes(
                  totalMinutes
                )}
              </strong>
            </div>

            <div className="stat-row">
              <span>
                Days Worked
              </span>

              <strong>
                {
                  workedDays
                }
              </strong>
            </div>

            <div className="stat-row">
              <span>
                Base Salary
              </span>

              <strong>
                {formatYen(
                  baseSalary
                )}
              </strong>
            </div>

            <div className="stat-row balance-row">
              <span>
                Transport
              </span>

              <strong>
                {formatYen(
                  transportTotal
                )}
              </strong>
            </div>
          </section>
        </>
      )}

      {/* =====================================================
          SALARY
      ====================================================== */}

      {activeTab ===
        "salary" && (
        <>
          <section className="card month-selector">
            <button
              onClick={() =>
                changeMonth(-1)
              }
            >
              <ChevronLeft
                size={18}
              />
            </button>

            <strong>
              {getMonthLabel()}
            </strong>

            <button
              onClick={() =>
                changeMonth(1)
              }
            >
              <ChevronRight
                size={18}
              />
            </button>
          </section>

          <section className="card salary-main-card">
            <p className="section-label">
              ESTIMATED EARNINGS
            </p>

            <h2>
              {formatYen(
                estimatedSalary
              )}
            </h2>

            <p>
              {formatMinutes(
                totalMinutes
              )}{" "}
              worked
            </p>
          </section>

          <section className="salary-summary-grid">
            <div className="card salary-mini-card">
              <Clock3
                size={20}
              />

              <span>
                Worked
              </span>

              <strong>
                {formatMinutes(
                  totalMinutes
                )}
              </strong>
            </div>

            <div className="card salary-mini-card">
              <Wallet
                size={20}
              />

              <span>
                Base Salary
              </span>

              <strong>
                {formatYen(
                  baseSalary
                )}
              </strong>
            </div>

            <div className="card salary-mini-card">
              <Train
                size={20}
              />

              <span>
                Transport
              </span>

              <strong>
                {formatYen(
                  transportTotal
                )}
              </strong>
            </div>

            <div className="card salary-mini-card">
              <span>
                Days Worked
              </span>

              <strong>
                {
                  workedDays
                }
              </strong>
            </div>
          </section>

          <section className="card">
            <p className="section-label">
              SALARY SETTINGS
            </p>

            <div className="salary-setting-row">
              <div>
                <strong>
                  Hourly Rate
                </strong>

                <p>
                  Your current
                  hourly wage
                </p>
              </div>

              <div className="yen-input">
                <span>
                  ¥
                </span>

                <input
                  type="number"
                  value={
                    hourlyRate
                  }
                  onChange={(e) =>
                    setHourlyRate(
                      Number(
                        e.target
                          .value
                      )
                    )
                  }
                />
              </div>
            </div>

            <div className="salary-setting-row">
              <div>
                <strong>
                  Transportation
                </strong>

                <p>
                  Payment per
                  working day
                </p>
              </div>

              <div className="yen-input">
                <span>
                  ¥
                </span>

                <input
                  type="number"
                  value={
                    transportPerDay
                  }
                  onChange={(e) =>
                    setTransportPerDay(
                      Number(
                        e.target
                          .value
                      )
                    )
                  }
                />
              </div>
            </div>
          </section>

          <section className="card">
            <p className="section-label">
              EARNINGS BY SHIFT
            </p>

            {sortedEntries.length ===
              0 && (
              <p className="empty-message">
                No work entries
                for this month.
              </p>
            )}

            {sortedEntries.map(
              (entry) => {
                const shiftSalary =
                  Math.round(
                    (entry.totalMinutes /
                      60) *
                      hourlyRate +
                      transportPerDay
                  );

                return (
                  <div
                    className="salary-shift-row"
                    key={
                      entry.id
                    }
                  >
                    <div>
                      <strong>
                        {formatDate(
                          entry.date
                        )}
                      </strong>

                      <p>
                        {
                          entry.clockIn
                        }{" "}
                        –{" "}
                        {
                          entry.clockOut
                        }
                      </p>
                    </div>

                    <div className="salary-shift-right">
                      <span>
                        {formatMinutes(
                          entry.totalMinutes
                        )}
                      </span>

                      <strong>
                        {formatYen(
                          shiftSalary
                        )}
                      </strong>
                    </div>
                  </div>
                );
              }
            )}
          </section>
        </>
      )}

      {/* =====================================================
          EXPENSES
      ====================================================== */}

      {activeTab ===
        "expenses" && (
        <>
          <section className="card month-selector">
            <button
              onClick={() =>
                changeMonth(-1)
              }
            >
              <ChevronLeft
                size={18}
              />
            </button>

            <strong>
              {getMonthLabel()}
            </strong>

            <button
              onClick={() =>
                changeMonth(1)
              }
            >
              <ChevronRight
                size={18}
              />
            </button>
          </section>

          <section className="card expense-total-card">
            <p className="section-label">
              THIS MONTH
            </p>

            <h2>
              {formatYen(
                totalExpenses
              )}
            </h2>

            <p className="muted">
              Total expenses
            </p>

            <button
              className="add-expense-button"
              onClick={
                openNewExpenseForm
              }
            >
              <Plus
                size={18}
              />

              Add Expense
            </button>
          </section>

          <section className="card">
            <div className="stat-row">
              <span>
                Estimated Income
              </span>

              <strong>
                {formatYen(
                  estimatedSalary
                )}
              </strong>
            </div>

            <div className="stat-row">
              <span>
                Total Expenses
              </span>

              <strong>
                {formatYen(
                  totalExpenses
                )}
              </strong>
            </div>

            <div className="stat-row balance-row">
              <span>
                Remaining
              </span>

              <strong>
                {formatYen(
                  remainingBalance
                )}
              </strong>
            </div>
          </section>

          <section className="card">
            <p className="section-label">
              EXPENSE HISTORY
            </p>

            {sortedExpenses.length ===
              0 && (
              <p className="empty-message">
                No expenses
                recorded this
                month.
              </p>
            )}

            {sortedExpenses.map(
              (expense) => (
                <div
                  className="expense-row"
                  key={
                    expense.id
                  }
                >
                  <div className="expense-left">
                    <div className="expense-icon">
                      {getCategoryIcon(
                        expense.category
                      )}
                    </div>

                    <div>
                      <strong>
                        {
                          expense.category
                        }
                      </strong>

                      <p>
                        {formatDate(
                          expense.date
                        )}
                      </p>

                      {expense.note && (
                        <small>
                          {
                            expense.note
                          }
                        </small>
                      )}
                    </div>
                  </div>

                  <div className="expense-right">
                    <strong>
                      {formatYen(
                        expense.amount
                      )}
                    </strong>

                    <button
                      className="edit-button"
                      onClick={() =>
                        handleEditExpense(
                          expense
                        )
                      }
                    >
                      <Pencil
                        size={15}
                      />
                    </button>
                  </div>
                </div>
              )
            )}
          </section>
        </>
      )}

      {/* =====================================================
          EXPENSE MODAL
      ====================================================== */}

      {showExpenseForm && (
        <div className="modal-overlay">
          <div className="manual-modal">
            <div className="modal-header">
              <div>
                <p className="page-eyebrow">
                  EXPENSE
                </p>

                <h2>
                  {editingExpenseId
                    ? "Edit Expense"
                    : "Add Expense"}
                </h2>
              </div>

              <button
                className="modal-close"
                onClick={
                  closeExpenseForm
                }
              >
                <X
                  size={21}
                />
              </button>
            </div>

            <div className="form-group">
              <label>
                Amount
              </label>

              <div className="expense-amount-input">
                <span>
                  ¥
                </span>

                <input
                  type="number"
                  placeholder="0"
                  value={
                    expenseAmount
                  }
                  onChange={(e) =>
                    setExpenseAmount(
                      e.target
                        .value
                    )
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Date
              </label>

              <input
                type="date"
                value={
                  expenseDate
                }
                onChange={(e) =>
                  setExpenseDate(
                    e.target
                      .value
                  )
                }
              />
            </div>

            <div className="form-group">
              <label>
                Category
              </label>

              <select
                value={
                  expenseCategory
                }
                onChange={(e) =>
                  setExpenseCategory(
                    e.target
                      .value
                  )
                }
              >
                <option value="Food">
                  Food
                </option>

                <option value="Transport">
                  Transport
                </option>

                <option value="Shopping">
                  Shopping
                </option>

                <option value="Bills">
                  Bills
                </option>

                <option value="Rent">
                  Rent
                </option>

                <option value="Other">
                  Other
                </option>
              </select>
            </div>

            <div className="form-group">
              <label>
                Note
              </label>

              <textarea
                rows="3"
                placeholder="Example: Lunch"
                value={
                  expenseNote
                }
                onChange={(e) =>
                  setExpenseNote(
                    e.target
                      .value
                  )
                }
              />
            </div>

            <div className="modal-action-buttons">
              {editingExpenseId && (
                <button
                  className="delete-shift-button"
                  onClick={
                    handleDeleteExpense
                  }
                >
                  <Trash2
                    size={17}
                  />

                  Delete
                </button>
              )}

              <button
                className="save-shift-button"
                onClick={
                  handleSaveExpense
                }
              >
                <Save
                  size={18}
                />

                {editingExpenseId
                  ? "Save Changes"
                  : "Save Expense"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Money;