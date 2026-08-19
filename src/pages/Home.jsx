import { useEffect, useMemo, useState } from "react";

import {
  Clock3,
  Wallet,
  TrendingDown,
  CircleDollarSign,
  AlertTriangle,
} from "lucide-react";

function Home() {
  /* =========================================================
     STATE
  ========================================================= */

  const [workEntries, setWorkEntries] =
    useState([]);

  const [expenses, setExpenses] =
    useState([]);

  const [
    weeklyLimitHours,
    setWeeklyLimitHours,
  ] = useState(28);

  const [
    hourlyRate,
    setHourlyRate,
  ] = useState(1250);

  const [
    transportPerDay,
    setTransportPerDay,
  ] = useState(500);

  const [currentTime, setCurrentTime] =
    useState(new Date());

  /* =========================================================
     LIVE CLOCK
  ========================================================= */

  useEffect(() => {
    const timer = setInterval(() => {
      setCurrentTime(
        new Date()
      );
    }, 1000);

    return () =>
      clearInterval(timer);
  }, []);

  /* =========================================================
     LOAD LOCAL DATA
  ========================================================= */

  useEffect(() => {
    loadData();

    window.addEventListener(
      "focus",
      loadData
    );

    return () => {
      window.removeEventListener(
        "focus",
        loadData
      );
    };
  }, []);

  function loadData() {
    const savedWork =
      localStorage.getItem(
        "worktrack-work-entries"
      );

    const savedExpenses =
      localStorage.getItem(
        "worktrack-expenses"
      );

    const savedWeeklyLimit =
      localStorage.getItem(
        "worktrack-weekly-limit"
      );

    const savedHourlyRate =
      localStorage.getItem(
        "worktrack-hourly-rate"
      );

    const savedTransport =
      localStorage.getItem(
        "worktrack-transport-per-day"
      );

    try {
      const parsedWork =
        savedWork
          ? JSON.parse(savedWork)
          : [];

      setWorkEntries(
        Array.isArray(parsedWork)
          ? parsedWork
          : []
      );
    } catch {
      setWorkEntries([]);
    }

    try {
      const parsedExpenses =
        savedExpenses
          ? JSON.parse(
              savedExpenses
            )
          : [];

      setExpenses(
        Array.isArray(
          parsedExpenses
        )
          ? parsedExpenses
          : []
      );
    } catch {
      setExpenses([]);
    }

    setWeeklyLimitHours(
      savedWeeklyLimit
        ? Number(
            savedWeeklyLimit
          )
        : 28
    );

    setHourlyRate(
      savedHourlyRate
        ? Number(
            savedHourlyRate
          )
        : 1250
    );

    setTransportPerDay(
      savedTransport
        ? Number(
            savedTransport
          )
        : 500
    );
  }

  /* =========================================================
     GREETING / CLOCK
  ========================================================= */

  function getGreeting() {
    const hour =
      currentTime.getHours();

    if (
      hour >= 5 &&
      hour < 12
    ) {
      return "Good morning";
    }

    if (
      hour >= 12 &&
      hour < 17
    ) {
      return "Good afternoon";
    }

    if (
      hour >= 17 &&
      hour < 21
    ) {
      return "Good evening";
    }

    return "Good night";
  }

  function getFormattedTime() {
    return currentTime
      .toLocaleTimeString(
        "en-US",
        {
          hour: "2-digit",
          minute: "2-digit",
          second: "2-digit",
          hour12: true,
        }
      );
  }

  /* =========================================================
     DATE HELPERS
  ========================================================= */

  function formatDateKey(
    dateValue
  ) {
    const year =
      dateValue.getFullYear();

    const month =
      String(
        dateValue.getMonth() + 1
      ).padStart(2, "0");

    const day =
      String(
        dateValue.getDate()
      ).padStart(2, "0");

    return `${year}-${month}-${day}`;
  }

  function getTodayDate() {
    return formatDateKey(
      new Date()
    );
  }

  function parseDateKey(
    dateString
  ) {
    return new Date(
      `${dateString}T00:00:00`
    );
  }

  function addDays(
    dateString,
    numberOfDays
  ) {
    const result =
      parseDateKey(
        dateString
      );

    result.setDate(
      result.getDate() +
        numberOfDays
    );

    return formatDateKey(
      result
    );
  }

  function getCurrentMonth() {
    const now =
      new Date();

    const year =
      now.getFullYear();

    const month =
      String(
        now.getMonth() + 1
      ).padStart(2, "0");

    return `${year}-${month}`;
  }

  /* =========================================================
     FORMATTERS
  ========================================================= */

  function formatMinutes(
    totalMinutes
  ) {
    const safeMinutes =
      Math.max(
        0,
        Math.floor(
          Number(
            totalMinutes || 0
          )
        )
      );

    const hours =
      Math.floor(
        safeMinutes / 60
      );

    const minutes =
      safeMinutes % 60;

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
    return parseDateKey(
      dateString
    ).toLocaleDateString(
      "en-US",
      {
        weekday: "short",
        day: "numeric",
        month: "short",
      }
    );
  }

  /* =========================================================
     ROLLING 7-DAY ENGINE
  ========================================================= */

  function getRolling7DayMinutes(
    entries,
    endDate
  ) {
    const startDate =
      addDays(
        endDate,
        -6
      );

    return entries.reduce(
      (total, entry) => {
        if (
          entry.date >=
            startDate &&
          entry.date <=
            endDate
        ) {
          return (
            total +
            Number(
              entry.totalMinutes ||
                0
            )
          );
        }

        return total;
      },
      0
    );
  }

  function getComplianceStatus(
    totalMinutes
  ) {
    const limitMinutes =
      weeklyLimitHours * 60;

    if (
      totalMinutes >
      limitMinutes
    ) {
      return {
        label:
          "Over limit",
        className:
          "home-limit-over",
      };
    }

    if (
      totalMinutes ===
      limitMinutes
    ) {
      return {
        label:
          "At limit",
        className:
          "home-limit-danger",
      };
    }

    if (
      totalMinutes >=
      27 * 60
    ) {
      return {
        label:
          "Danger",
        className:
          "home-limit-danger",
      };
    }

    if (
      totalMinutes >=
      26 * 60
    ) {
      return {
        label:
          "Caution",
        className:
          "home-limit-caution",
      };
    }

    return {
      label:
        "Safe",
      className:
        "home-limit-safe",
    };
  }

  /* =========================================================
     TODAY / ROLLING TOTAL
  ========================================================= */

  const todayDate =
    getTodayDate();

  const rollingStartDate =
    addDays(
      todayDate,
      -6
    );

  const rollingMinutes =
    useMemo(() => {
      return getRolling7DayMinutes(
        workEntries,
        todayDate
      );
    }, [
      workEntries,
      todayDate,
    ]);

  const todayMinutes =
    useMemo(() => {
      return workEntries
        .filter(
          (entry) =>
            entry.date ===
            todayDate
        )
        .reduce(
          (total, entry) =>
            total +
            Number(
              entry.totalMinutes ||
                0
            ),
          0
        );
    }, [
      workEntries,
      todayDate,
    ]);

  const limitMinutes =
    weeklyLimitHours * 60;

  const rollingRemaining =
    limitMinutes -
    rollingMinutes;

  const rollingPercentage =
    limitMinutes > 0
      ? Math.min(
          100,
          Math.floor(
            (rollingMinutes /
              limitMinutes) *
              100
          )
        )
      : 0;

  const complianceStatus =
    getComplianceStatus(
      rollingMinutes
    );

  /* =========================================================
     CURRENT MONTH
  ========================================================= */

  const currentMonth =
    getCurrentMonth();

  const monthlyEntries =
    useMemo(() => {
      return workEntries.filter(
        (entry) =>
          entry.date?.startsWith(
            currentMonth
          )
      );
    }, [
      workEntries,
      currentMonth,
    ]);

  const monthlyMinutes =
    monthlyEntries.reduce(
      (total, entry) =>
        total +
        Number(
          entry.totalMinutes ||
            0
        ),
      0
    );

  const workedDays =
    new Set(
      monthlyEntries.map(
        (entry) =>
          entry.date
      )
    ).size;

  const baseSalary =
    Math.round(
      (monthlyMinutes / 60) *
        hourlyRate
    );

  const transportTotal =
    workedDays *
    transportPerDay;

  const estimatedSalary =
    baseSalary +
    transportTotal;

  const monthlyExpenses =
    expenses.filter(
      (expense) =>
        expense.date?.startsWith(
          currentMonth
        )
    );

  const totalExpenses =
    monthlyExpenses.reduce(
      (total, expense) =>
        total +
        Number(
          expense.amount ||
            0
        ),
      0
    );

  const balance =
    estimatedSalary -
    totalExpenses;

  /* =========================================================
     RECENT WORK
  ========================================================= */

  const recentEntries =
    [...workEntries]
      .sort(
        (a, b) => {
          const dateDifference =
            new Date(
              b.date
            ) -
            new Date(
              a.date
            );

          if (
            dateDifference !== 0
          ) {
            return dateDifference;
          }

          return (
            b.clockIn?.localeCompare(
              a.clockIn
            ) || 0
          );
        }
      )
      .slice(0, 4);

  /* =========================================================
     FULL DATE
  ========================================================= */

  const fullDate =
    currentTime
      .toLocaleDateString(
        "en-US",
        {
          weekday: "long",
          day: "numeric",
          month: "long",
          year: "numeric",
        }
      );

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="home-page">
      <header className="home-header">
        <div className="home-greeting-row">
          <div>
            <p className="hello">
              {getGreeting()},
              Pavan 👋
            </p>

            <p className="date">
              {fullDate}
            </p>
          </div>

          <div className="live-clock">
            <Clock3
              size={17}
            />

            <span>
              {getFormattedTime()}
            </span>
          </div>
        </div>
      </header>

      {/* =====================================================
          ROLLING 7 DAYS
      ====================================================== */}

      <section className="card weekly-card">
        <div className="home-rolling-header">
          <div>
            <p className="section-label">
              ROLLING 7 DAYS
            </p>

            <p className="home-rolling-range">
              {formatDate(
                rollingStartDate
              )}{" "}
              –{" "}
              {formatDate(
                todayDate
              )}
            </p>
          </div>

          <span
            className={`home-compliance-badge ${complianceStatus.className}`}
          >
            {
              complianceStatus.label
            }
          </span>
        </div>

        <div className="hours-row">
          <div>
            <span className="main-hours">
              {formatMinutes(
                rollingMinutes
              )}
            </span>

            <span className="limit-hours">
              {" "}
              /{" "}
              {
                weeklyLimitHours
              }
              h
            </span>
          </div>

          <span className="percentage">
            {
              rollingPercentage
            }
            %
          </span>
        </div>

        <div className="progress-track">
          <div
            className="progress-fill"
            style={{
              width: `${rollingPercentage}%`,
            }}
          />
        </div>

        <div className="remaining-row">
          {rollingRemaining >=
          0 ? (
            <>
              <Clock3
                size={18}
              />

              <div>
                <strong>
                  {formatMinutes(
                    rollingRemaining
                  )}{" "}
                  remaining
                </strong>

                <p>
                  Rolling 7-day
                  compliance limit
                </p>
              </div>
            </>
          ) : (
            <>
              <AlertTriangle
                size={18}
              />

              <div>
                <strong className="weekly-over">
                  {formatMinutes(
                    Math.abs(
                      rollingRemaining
                    )
                  )}{" "}
                  over limit
                </strong>

                <p>
                  Rolling 7-day
                  limit exceeded
                </p>
              </div>
            </>
          )}
        </div>
      </section>

      {/* =====================================================
          TODAY
      ====================================================== */}

      <section className="card today-card">
        <p className="section-label">
          TODAY
        </p>

        <h2>
          {formatMinutes(
            todayMinutes
          )}
        </h2>

        <p className="muted">
          {todayMinutes > 0
            ? "Completed today"
            : "No work logged yet"}
        </p>
      </section>

      {/* =====================================================
          MONTH
      ====================================================== */}

      <section className="card">
        <p className="section-label">
          THIS MONTH
        </p>

        <div className="stat-row">
          <div className="stat-title">
            <Clock3
              size={18}
            />

            <span>
              Worked
            </span>
          </div>

          <strong>
            {formatMinutes(
              monthlyMinutes
            )}
          </strong>
        </div>

        <div className="stat-row">
          <div className="stat-title">
            <CircleDollarSign
              size={18}
            />

            <span>
              Est. Salary
            </span>
          </div>

          <strong>
            {formatYen(
              estimatedSalary
            )}
          </strong>
        </div>

        <div className="stat-row">
          <div className="stat-title">
            <TrendingDown
              size={18}
            />

            <span>
              Expenses
            </span>
          </div>

          <strong>
            {formatYen(
              totalExpenses
            )}
          </strong>
        </div>

        <div className="stat-row balance-row">
          <div className="stat-title">
            <Wallet
              size={18}
            />

            <span>
              Balance
            </span>
          </div>

          <strong>
            {formatYen(
              balance
            )}
          </strong>
        </div>
      </section>

      {/* =====================================================
          RECENT WORK
      ====================================================== */}

      <section className="card recent-card">
        <div className="section-header">
          <p className="section-label">
            RECENT WORK
          </p>
        </div>

        {recentEntries.length ===
          0 && (
          <p className="empty-message">
            No work entries yet.
          </p>
        )}

        {recentEntries.map(
          (entry) => (
            <div
              className="work-row"
              key={entry.id}
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

              <strong>
                {formatMinutes(
                  entry.totalMinutes
                )}
              </strong>
            </div>
          )
        )}
      </section>
    </div>
  );
}

export default Home;