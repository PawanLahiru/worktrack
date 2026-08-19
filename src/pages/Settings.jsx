import { useEffect, useState } from "react";

import { signOut } from "firebase/auth";

import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  setDoc,
} from "firebase/firestore";

import { auth, db } from "../firebase";

import {
  Clock3,
  Wallet,
  Train,
  Coins,
  Trash2,
  RotateCcw,
} from "lucide-react";

function Settings() {
  const user = auth.currentUser;

  /* =========================================================
     DEFAULT SETTINGS
  ========================================================= */

  const DEFAULT_WEEKLY_LIMIT = 28;
  const DEFAULT_HOURLY_RATE = 1250;
  const DEFAULT_TRANSPORT = 500;
  const DEFAULT_CURRENCY = "JPY";

  /* =========================================================
     SETTINGS STATE
  ========================================================= */

  const [weeklyLimit, setWeeklyLimit] =
    useState(() => {
      const saved =
        localStorage.getItem(
          "worktrack-weekly-limit"
        );

      return saved
        ? Number(saved)
        : DEFAULT_WEEKLY_LIMIT;
    });

  const [hourlyRate, setHourlyRate] =
    useState(() => {
      const saved =
        localStorage.getItem(
          "worktrack-hourly-rate"
        );

      return saved
        ? Number(saved)
        : DEFAULT_HOURLY_RATE;
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
      : DEFAULT_TRANSPORT;
  });

  const [currency, setCurrency] =
    useState(() => {
      return (
        localStorage.getItem(
          "worktrack-currency"
        ) ||
        DEFAULT_CURRENCY
      );
    });

  /*
    Prevents the default/local values from
    overwriting Firestore before the initial
    cloud settings have been loaded.
  */

  const [
    settingsLoaded,
    setSettingsLoaded,
  ] = useState(false);

  const [
    savingSettings,
    setSavingSettings,
  ] = useState(false);

  const [
    clearingWork,
    setClearingWork,
  ] = useState(false);

  const [
    clearingExpenses,
    setClearingExpenses,
  ] = useState(false);

  /* =========================================================
     FIRESTORE SETTINGS PATH
  ========================================================= */

  function getSettingsRef() {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      return null;
    }

    return doc(
      db,
      "users",
      currentUser.uid,
      "settings",
      "preferences"
    );
  }

  /* =========================================================
     INITIAL SETTINGS LOAD / MIGRATION
  ========================================================= */

  useEffect(() => {
    async function loadSettings() {
      const currentUser =
        auth.currentUser;

      if (!currentUser) {
        return;
      }

      try {
        const settingsRef =
          doc(
            db,
            "users",
            currentUser.uid,
            "settings",
            "preferences"
          );

        const snapshot =
          await getDoc(
            settingsRef
          );

        /*
          CASE 1:
          Firestore already contains settings.
        */

        if (snapshot.exists()) {
          const cloudSettings =
            snapshot.data();

          const cloudWeeklyLimit =
            Number(
              cloudSettings.weeklyLimit ??
                DEFAULT_WEEKLY_LIMIT
            );

          const cloudHourlyRate =
            Number(
              cloudSettings.hourlyRate ??
                DEFAULT_HOURLY_RATE
            );

          const cloudTransport =
            Number(
              cloudSettings.transportPerDay ??
                DEFAULT_TRANSPORT
            );

          const cloudCurrency =
            cloudSettings.currency ||
            DEFAULT_CURRENCY;

          setWeeklyLimit(
            cloudWeeklyLimit
          );

          setHourlyRate(
            cloudHourlyRate
          );

          setTransportPerDay(
            cloudTransport
          );

          setCurrency(
            cloudCurrency
          );

          /*
            Keep localStorage synchronized
            as the app's local cache.
          */

          localStorage.setItem(
            "worktrack-weekly-limit",
            String(
              cloudWeeklyLimit
            )
          );

          localStorage.setItem(
            "worktrack-hourly-rate",
            String(
              cloudHourlyRate
            )
          );

          localStorage.setItem(
            "worktrack-transport-per-day",
            String(
              cloudTransport
            )
          );

          localStorage.setItem(
            "worktrack-currency",
            cloudCurrency
          );

          /*
            Old setting is no longer used.
          */

          localStorage.removeItem(
            "worktrack-week-start"
          );

          setSettingsLoaded(
            true
          );

          console.log(
            "Settings loaded from Firestore."
          );

          return;
        }

        /*
          CASE 2:
          Firestore has no settings yet.

          Upload the existing local settings.
        */

        const localSettings = {
          weeklyLimit:
            weeklyLimit,

          hourlyRate:
            hourlyRate,

          transportPerDay:
            transportPerDay,

          currency:
            currency,
        };

        await setDoc(
          settingsRef,
          localSettings
        );

        localStorage.removeItem(
          "worktrack-week-start"
        );

        setSettingsLoaded(
          true
        );

        console.log(
          "Local settings migrated to Firestore."
        );
      } catch (error) {
        console.error(
          "Failed to load settings:",
          error
        );

        /*
          Keep the app usable with local settings
          even if Firestore temporarily fails.
        */

        setSettingsLoaded(
          true
        );
      }
    }

    loadSettings();
  }, []);

  /* =========================================================
     SAVE SETTINGS
  ========================================================= */

  useEffect(() => {
    if (!settingsLoaded) {
      return;
    }

    /*
      Save local cache immediately.
    */

    localStorage.setItem(
      "worktrack-weekly-limit",
      String(weeklyLimit)
    );

    localStorage.setItem(
      "worktrack-hourly-rate",
      String(hourlyRate)
    );

    localStorage.setItem(
      "worktrack-transport-per-day",
      String(transportPerDay)
    );

    localStorage.setItem(
      "worktrack-currency",
      currency
    );

    /*
      This is intentionally removed because
      rolling 7-day compliance does not depend
      on Monday/Sunday week boundaries.
    */

    localStorage.removeItem(
      "worktrack-week-start"
    );

    const timeout =
      setTimeout(async () => {
        const settingsRef =
          getSettingsRef();

        if (!settingsRef) {
          return;
        }

        try {
          setSavingSettings(
            true
          );

          await setDoc(
            settingsRef,
            {
              weeklyLimit,
              hourlyRate,
              transportPerDay,
              currency,
            },
            {
              merge: true,
            }
          );

          console.log(
            "Settings saved to Firestore."
          );
        } catch (error) {
          console.error(
            "Failed to save settings:",
            error
          );
        } finally {
          setSavingSettings(
            false
          );
        }
      }, 400);

    /*
      Debounce:
      If the user is still typing a number,
      wait before sending the Firestore write.
    */

    return () =>
      clearTimeout(timeout);
  }, [
    weeklyLimit,
    hourlyRate,
    transportPerDay,
    currency,
    settingsLoaded,
  ]);

  /* =========================================================
     DELETE ALL DOCUMENTS IN A SUBCOLLECTION
  ========================================================= */

  async function deleteCollectionDocuments(
    collectionName
  ) {
    const currentUser =
      auth.currentUser;

    if (!currentUser) {
      return;
    }

    const collectionRef =
      collection(
        db,
        "users",
        currentUser.uid,
        collectionName
      );

    const snapshot =
      await getDocs(
        collectionRef
      );

    await Promise.all(
      snapshot.docs.map(
        (documentSnapshot) =>
          deleteDoc(
            documentSnapshot.ref
          )
      )
    );
  }

  /* =========================================================
     CLEAR WORK DATA
  ========================================================= */

  async function clearWorkData() {
    const confirmed =
      window.confirm(
        "Delete ALL work entries from this device and Firebase?\n\nThis cannot be undone."
      );

    if (!confirmed) {
      return;
    }

    try {
      setClearingWork(
        true
      );

      /*
        Delete cloud entries.
      */

      await deleteCollectionDocuments(
        "workEntries"
      );

      /*
        Delete local cache / active timer.
      */

      localStorage.removeItem(
        "worktrack-work-entries"
      );

      localStorage.removeItem(
        "worktrack-active-shift"
      );

      /*
        Keep the migration marker TRUE.

        This prevents Work.jsx from trying to
        restore old local data after a deliberate
        deletion.
      */

      if (user) {
        localStorage.setItem(
          `worktrack-work-migrated-${user.uid}`,
          "true"
        );
      }

      /*
        Create an explicit empty local cache.
      */

      localStorage.setItem(
        "worktrack-work-entries",
        JSON.stringify([])
      );

      alert(
        "All work data has been deleted."
      );
    } catch (error) {
      console.error(
        "Failed to clear work data:",
        error
      );

      alert(
        "Could not delete all work data. Please try again."
      );
    } finally {
      setClearingWork(
        false
      );
    }
  }

  /* =========================================================
     CLEAR EXPENSE DATA
  ========================================================= */

  async function clearExpenseData() {
    const confirmed =
      window.confirm(
        "Delete ALL expense entries from this device and Firebase?\n\nThis cannot be undone."
      );

    if (!confirmed) {
      return;
    }

    try {
      setClearingExpenses(
        true
      );

      /*
        Delete cloud expenses.
      */

      await deleteCollectionDocuments(
        "expenses"
      );

      /*
        Delete local cache.
      */

      localStorage.removeItem(
        "worktrack-expenses"
      );

      if (user) {
        localStorage.setItem(
          `worktrack-expenses-migrated-${user.uid}`,
          "true"
        );
      }

      localStorage.setItem(
        "worktrack-expenses",
        JSON.stringify([])
      );

      alert(
        "All expense data has been deleted."
      );
    } catch (error) {
      console.error(
        "Failed to clear expense data:",
        error
      );

      alert(
        "Could not delete all expense data. Please try again."
      );
    } finally {
      setClearingExpenses(
        false
      );
    }
  }

  /* =========================================================
     RESET SETTINGS
  ========================================================= */

  async function resetSettings() {
    const confirmed =
      window.confirm(
        "Reset your WorkTrack settings to the defaults?"
      );

    if (!confirmed) {
      return;
    }

    const defaultSettings = {
      weeklyLimit:
        DEFAULT_WEEKLY_LIMIT,

      hourlyRate:
        DEFAULT_HOURLY_RATE,

      transportPerDay:
        DEFAULT_TRANSPORT,

      currency:
        DEFAULT_CURRENCY,
    };

    setWeeklyLimit(
      defaultSettings.weeklyLimit
    );

    setHourlyRate(
      defaultSettings.hourlyRate
    );

    setTransportPerDay(
      defaultSettings.transportPerDay
    );

    setCurrency(
      defaultSettings.currency
    );

    localStorage.removeItem(
      "worktrack-week-start"
    );

    const settingsRef =
      getSettingsRef();

    if (!settingsRef) {
      return;
    }

    try {
      await setDoc(
        settingsRef,
        defaultSettings
      );

      alert(
        "Settings reset."
      );
    } catch (error) {
      console.error(
        "Failed to reset settings:",
        error
      );
    }
  }

  /* =========================================================
     SIGN OUT
  ========================================================= */

  async function handleSignOut() {
    try {
      await signOut(auth);
    } catch (error) {
      console.error(
        "Failed to sign out:",
        error
      );
    }
  }

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="settings-page">
      {/* =====================================================
          HEADER
      ====================================================== */}

      <header className="settings-header">
        <p className="page-eyebrow">
          APP SETTINGS
        </p>

        <h1>
          Settings
        </h1>

        <p>
          Manage your work and money preferences.
        </p>
      </header>

      {/* =====================================================
          ACCOUNT
      ====================================================== */}

      <section className="card">
        <p className="section-label">
          ACCOUNT
        </p>

        <div className="account-card">
          {user?.photoURL && (
            <img
              src={
                user.photoURL
              }
              alt="Profile"
              className="account-avatar"
            />
          )}

          <div>
            <strong>
              {user?.displayName ||
                "WorkTrack User"}
            </strong>

            <p>
              {user?.email}
            </p>
          </div>
        </div>

        <button
          className="sign-out-button"
          onClick={
            handleSignOut
          }
        >
          Sign Out
        </button>
      </section>

      {/* =====================================================
          COMPLIANCE SETTINGS
      ====================================================== */}

      <section className="card">
        <p className="section-label">
          COMPLIANCE
        </p>

        <div className="settings-row">
          <div className="settings-info">
            <div className="settings-icon">
              <Clock3
                size={19}
              />
            </div>

            <div>
              <strong>
                Rolling 7-Day Limit
              </strong>

              <p>
                Maximum hours used
                by the compliance
                calculator
              </p>
            </div>
          </div>

          <div className="settings-number-input">
            <input
              type="number"
              min="1"
              max="168"
              value={
                weeklyLimit
              }
              onChange={(e) => {
                const value =
                  Number(
                    e.target
                      .value
                  );

                if (
                  Number.isFinite(
                    value
                  )
                ) {
                  setWeeklyLimit(
                    value
                  );
                }
              }}
            />

            <span>
              h
            </span>
          </div>
        </div>

        <div className="compliance-setting-note">
          <strong>
            Rolling calculation
          </strong>

          <p>
            WorkTrack checks every
            consecutive 7-calendar-day
            period. There is no
            Monday or Sunday reset.
          </p>
        </div>
      </section>

      {/* =====================================================
          SALARY SETTINGS
      ====================================================== */}

      <section className="card">
        <p className="section-label">
          SALARY SETTINGS
        </p>

        <div className="settings-row">
          <div className="settings-info">
            <div className="settings-icon">
              <Wallet
                size={19}
              />
            </div>

            <div>
              <strong>
                Hourly Rate
              </strong>

              <p>
                Your regular
                hourly wage
              </p>
            </div>
          </div>

          <div className="settings-yen-input">
            <span>
              ¥
            </span>

            <input
              type="number"
              min="0"
              value={
                hourlyRate
              }
              onChange={(e) => {
                const value =
                  Number(
                    e.target
                      .value
                  );

                if (
                  Number.isFinite(
                    value
                  )
                ) {
                  setHourlyRate(
                    value
                  );
                }
              }}
            />
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <div className="settings-icon">
              <Train
                size={19}
              />
            </div>

            <div>
              <strong>
                Transportation
              </strong>

              <p>
                Allowance per
                working day
              </p>
            </div>
          </div>

          <div className="settings-yen-input">
            <span>
              ¥
            </span>

            <input
              type="number"
              min="0"
              value={
                transportPerDay
              }
              onChange={(e) => {
                const value =
                  Number(
                    e.target
                      .value
                  );

                if (
                  Number.isFinite(
                    value
                  )
                ) {
                  setTransportPerDay(
                    value
                  );
                }
              }}
            />
          </div>
        </div>

        <div className="settings-row">
          <div className="settings-info">
            <div className="settings-icon">
              <Coins
                size={19}
              />
            </div>

            <div>
              <strong>
                Currency
              </strong>

              <p>
                Used for money
                calculations
              </p>
            </div>
          </div>

          <select
            className="settings-select"
            value={
              currency
            }
            onChange={(e) =>
              setCurrency(
                e.target.value
              )
            }
          >
            <option value="JPY">
              JPY
            </option>
          </select>
        </div>

        {savingSettings && (
          <p className="settings-saving-text">
            Saving settings...
          </p>
        )}
      </section>

      {/* =====================================================
          DATA
      ====================================================== */}

      <section className="card">
        <p className="section-label">
          DATA
        </p>

        <button
          className="settings-action-button"
          onClick={
            clearWorkData
          }
          disabled={
            clearingWork
          }
        >
          <Trash2
            size={18}
          />

          <div>
            <strong>
              {clearingWork
                ? "Deleting..."
                : "Clear Work Data"}
            </strong>

            <span>
              Delete shifts from
              this device and
              Firebase
            </span>
          </div>
        </button>

        <button
          className="settings-action-button"
          onClick={
            clearExpenseData
          }
          disabled={
            clearingExpenses
          }
        >
          <Trash2
            size={18}
          />

          <div>
            <strong>
              {clearingExpenses
                ? "Deleting..."
                : "Clear Expense Data"}
            </strong>

            <span>
              Delete expenses
              from this device
              and Firebase
            </span>
          </div>
        </button>

        <button
          className="settings-action-button reset-button"
          onClick={
            resetSettings
          }
        >
          <RotateCcw
            size={18}
          />

          <div>
            <strong>
              Reset Settings
            </strong>

            <span>
              Restore default
              app preferences
            </span>
          </div>
        </button>
      </section>

      {/* =====================================================
          FOOTER
      ====================================================== */}

      <section className="settings-footer">
        <strong>
          WorkTrack
        </strong>

        <p>
          Personal Work & Money Manager
        </p>

        <span>
          Version 1.0
        </span>
      </section>
    </div>
  );
}

export default Settings;