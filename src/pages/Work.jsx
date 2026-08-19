import { useEffect, useMemo, useState } from "react";

import {
  collection,
  doc,
  getDocs,
  setDoc,
  deleteDoc,
  onSnapshot,
  runTransaction,
} from "firebase/firestore";

import { auth, db } from "../firebase";

import {
  Clock3,
  Plus,
  Pencil,
  AlertTriangle,
  X,
  Save,
  Square,
} from "lucide-react";

function Work() {
  /* =========================================================
     COMPLIANCE SETTINGS
  ========================================================= */

  const [weeklyLimitHours] = useState(() => {
    const saved = localStorage.getItem(
      "worktrack-weekly-limit"
    );

    return saved ? Number(saved) : 28;
  });

  /*
    IMPORTANT:
    Compliance calculations use exact integer minutes.

    28 hours = 1680 minutes.
  */

  const LIMIT_MINUTES =
    weeklyLimitHours * 60;

  /* =========================================================
     MANUAL ENTRY FORM
  ========================================================= */

  const [showManualForm, setShowManualForm] =
    useState(false);

  const [date, setDate] =
    useState(getTodayDate());

  const [clockIn, setClockIn] =
    useState("10:00");

  const [clockOut, setClockOut] =
    useState("16:00");

  const [breakMinutes, setBreakMinutes] =
    useState(0);

  const [note, setNote] =
    useState("");

  const [
    editingEntryId,
    setEditingEntryId,
  ] = useState(null);

  /* =========================================================
     WORK ENTRIES
  ========================================================= */

  const [workEntries, setWorkEntries] =
    useState(() => {
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
    });

  /* =========================================================
     ACTIVE CLOCK-IN SHIFT
  ========================================================= */

  const [activeShift, setActiveShift] =
    useState(() => {
      const saved =
        localStorage.getItem(
          "worktrack-active-shift"
        );

      if (!saved) return null;

      try {
        return JSON.parse(saved);
      } catch {
        return null;
      }
    });

  const [now, setNow] =
    useState(Date.now());

  /* =========================================================
     FIRESTORE HELPERS
  ========================================================= */

  async function saveWorkEntryToFirestore(
    entry
  ) {
    const user = auth.currentUser;

    if (!user) return;

    try {
      await setDoc(
        doc(
          db,
          "users",
          user.uid,
          "workEntries",
          entry.id
        ),
        entry
      );
    } catch (error) {
      console.error(
        "Failed to save work entry:",
        error
      );
    }
  }

  async function deleteWorkEntryFromFirestore(
    entryId
  ) {
    const user = auth.currentUser;

    if (!user) return;

    try {
      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "workEntries",
          entryId
        )
      );
    } catch (error) {
      console.error(
        "Failed to delete work entry:",
        error
      );
    }
  }


  async function saveActiveShiftToFirestore(shift) {
    const user = auth.currentUser;
  
    if (!user) return;
  
    try {
      await setDoc(
        doc(
          db,
          "users",
          user.uid,
          "activeShift",
          "current"
        ),
        shift
      );
    } catch (error) {
      console.error(
        "Failed to save active shift:",
        error
      );
    }
  }
  
  async function deleteActiveShiftFromFirestore() {
    const user = auth.currentUser;
  
    if (!user) return;
  
    try {
      await deleteDoc(
        doc(
          db,
          "users",
          user.uid,
          "activeShift",
          "current"
        )
      );
    } catch (error) {
      console.error(
        "Failed to delete active shift:",
        error
      );
    }
  }


  /* =========================================================
   FIRESTORE WORK DATA
   INITIAL MIGRATION + REAL-TIME SYNC
========================================================= */

useEffect(() => {
    const user =
      auth.currentUser;
  
    if (!user) {
      return;
    }
  
    let unsubscribe =
      () => {};
  
    let cancelled =
      false;
  
    async function initializeWorkSync() {
      try {
        const workRef =
          collection(
            db,
            "users",
            user.uid,
            "workEntries"
          );
  
        /*
          STEP 1:
          Check Firestore once before starting
          the real-time listener.
  
          This preserves your existing
          localStorage migration behavior.
        */
  
        const initialSnapshot =
          await getDocs(
            workRef
          );
  
        if (cancelled) {
          return;
        }
  
        /*
          Firestore is empty.
  
          Check whether old localStorage
          entries still need to be migrated.
        */
  
        if (
          initialSnapshot.empty
        ) {
          const migrationKey =
            `worktrack-work-migrated-${user.uid}`;
  
          const alreadyMigrated =
            localStorage.getItem(
              migrationKey
            ) === "true";
  
          const savedLocal =
            localStorage.getItem(
              "worktrack-work-entries"
            );
  
          let localEntries = [];
  
          if (savedLocal) {
            try {
              const parsed =
                JSON.parse(
                  savedLocal
                );
  
              if (
                Array.isArray(
                  parsed
                )
              ) {
                localEntries =
                  parsed;
              }
            } catch (error) {
              console.error(
                "Failed to read local work entries:",
                error
              );
            }
          }
  
          /*
            Migrate old local data only once.
          */
  
          if (
            !alreadyMigrated &&
            localEntries.length > 0
          ) {
            await Promise.all(
              localEntries.map(
                (entry) =>
                  setDoc(
                    doc(
                      db,
                      "users",
                      user.uid,
                      "workEntries",
                      entry.id
                    ),
                    entry
                  )
              )
            );
          }
  
          localStorage.setItem(
            migrationKey,
            "true"
          );
        } else {
          /*
            Cloud already has work data.
  
            Mark migration completed so that
            old local data can never be uploaded
            on top of the cloud later.
          */
  
          localStorage.setItem(
            `worktrack-work-migrated-${user.uid}`,
            "true"
          );
        }
  
        if (cancelled) {
          return;
        }
  
        /*
          STEP 2:
          Start real-time Firestore listener.
  
          From this point forward Firestore is
          the live source of truth for completed
          work entries.
        */
  
        unsubscribe =
          onSnapshot(
            workRef,
  
            (snapshot) => {
              const cloudEntries =
                snapshot.docs.map(
                  (docItem) => ({
                    id:
                      docItem.id,
  
                    ...docItem.data(),
                  })
                );
  
              /*
                Update React immediately.
              */
  
              setWorkEntries(
                cloudEntries
              );
  
              /*
                Keep localStorage as an
                offline/local cache.
              */
  
              localStorage.setItem(
                "worktrack-work-entries",
                JSON.stringify(
                  cloudEntries
                )
              );
            },
  
            (error) => {
              console.error(
                "Real-time work sync failed:",
                error
              );
            }
          );
      } catch (error) {
        console.error(
          "Work data initialization failed:",
          error
        );
      }
    }
  
    initializeWorkSync();
  
    /*
      Important:
      Remove Firestore listener when the
      Work page is unmounted.
    */
  
    return () => {
      cancelled =
        true;
  
      unsubscribe();
    };
  }, []);

  useEffect(() => {
    const user =
      auth.currentUser;
  
    if (!user) {
      return;
    }
  
    const activeShiftRef =
      doc(
        db,
        "users",
        user.uid,
        "activeShift",
        "current"
      );
  
    let firstSnapshotHandled =
      false;
  
    const unsubscribe =
      onSnapshot(
        activeShiftRef,
  
        async (snapshot) => {
          /*
            If Firestore has an active shift,
            always use it as the source of truth.
          */
  
          if (snapshot.exists()) {
            const cloudShift =
              snapshot.data();
  
            setActiveShift(
              cloudShift
            );
  
            localStorage.setItem(
              "worktrack-active-shift",
              JSON.stringify(
                cloudShift
              )
            );
  
            setNow(
              Date.now()
            );
  
            firstSnapshotHandled =
              true;
  
            return;
          }
  
          /*
            Firestore has no active shift.
  
            On the very first snapshot only,
            check whether an old local shift
            needs to be migrated.
          */
  
          if (
            !firstSnapshotHandled
          ) {
            const savedLocal =
              localStorage.getItem(
                "worktrack-active-shift"
              );
  
            if (savedLocal) {
              try {
                const localShift =
                  JSON.parse(
                    savedLocal
                  );
  
                if (
                  localShift &&
                  localShift.startedTimestamp &&
                  localShift.date &&
                  localShift.clockIn
                ) {
                  firstSnapshotHandled =
                    true;
  
                  await setDoc(
                    activeShiftRef,
                    localShift
                  );
  
                  return;
                }
              } catch (error) {
                console.error(
                  "Failed to migrate local active shift:",
                  error
                );
              }
            }
          }
  
          /*
            No cloud active shift exists.
  
            Clear local state too.
          */
  
          firstSnapshotHandled =
            true;
  
          setActiveShift(
            null
          );
  
          localStorage.removeItem(
            "worktrack-active-shift"
          );
        },
  
        (error) => {
          console.error(
            "Real-time active shift sync failed:",
            error
          );
        }
      );
  
    return () => {
      unsubscribe();
    };
  }, []);

  /* =========================================================
     LOCAL STORAGE
  ========================================================= */

  useEffect(() => {
    localStorage.setItem(
      "worktrack-work-entries",
      JSON.stringify(workEntries)
    );
  }, [workEntries]);

  useEffect(() => {
    if (activeShift) {
      localStorage.setItem(
        "worktrack-active-shift",
        JSON.stringify(
          activeShift
        )
      );
    } else {
      localStorage.removeItem(
        "worktrack-active-shift"
      );
    }
  }, [activeShift]);

  /* =========================================================
     LIVE TIMER
  ========================================================= */

  useEffect(() => {
    if (!activeShift) return;

    const timer =
      setInterval(() => {
        setNow(Date.now());
      }, 1000);

    return () =>
      clearInterval(timer);
  }, [activeShift]);

  /* =========================================================
     DATE / TIME HELPERS
  ========================================================= */

  function getTodayDate() {
    return formatDateKey(
      new Date()
    );
  }

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
      parseDateKey(dateString);

    result.setDate(
      result.getDate() +
        numberOfDays
    );

    return formatDateKey(
      result
    );
  }

  function getCurrentTime() {
    const current =
      new Date();

    const hours =
      String(
        current.getHours()
      ).padStart(2, "0");

    const minutes =
      String(
        current.getMinutes()
      ).padStart(2, "0");

    return `${hours}:${minutes}`;
  }

  function timeToMinutes(
    time
  ) {
    if (!time) return 0;

    const [hours, minutes] =
      time
        .split(":")
        .map(Number);

    return (
      hours * 60 +
      minutes
    );
  }

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

  function formatTimer(
    totalSeconds
  ) {
    const hours =
      Math.floor(
        totalSeconds / 3600
      );

    const minutes =
      Math.floor(
        (totalSeconds % 3600) /
          60
      );

    const seconds =
      totalSeconds % 60;

    return `${String(
      hours
    ).padStart(
      2,
      "0"
    )}:${String(
      minutes
    ).padStart(
      2,
      "0"
    )}:${String(
      seconds
    ).padStart(
      2,
      "0"
    )}`;
  }

  function formatDisplayDate(
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

  /*
    A rolling 7-day window ending on endDate includes:

    endDate - 6 days
    ...
    endDate

    Example:
    Aug 6 → Aug 12
  */

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

  /*
    How many completed minutes were worked
    during the six calendar days BEFORE
    a given date?
  */

  function getPrevious6DaysMinutes(
    entries,
    targetDate
  ) {
    const previousDay =
      addDays(
        targetDate,
        -1
      );

    const firstDay =
      addDays(
        targetDate,
        -6
      );

    return entries.reduce(
      (total, entry) => {
        if (
          entry.date >=
            firstDay &&
          entry.date <=
            previousDay
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

  /*
    A shift on date D affects seven possible
    rolling windows:

    D-6 → D
    D-5 → D+1
    ...
    D → D+6

    Therefore check window end dates:
    D, D+1, ... D+6.
  */

  function getAffectedRollingWindows(
    entries,
    changedDate
  ) {
    const windows = [];

    for (
      let offset = 0;
      offset <= 6;
      offset += 1
    ) {
      const endDate =
        addDays(
          changedDate,
          offset
        );

      const startDate =
        addDays(
          endDate,
          -6
        );

      const totalMinutes =
        getRolling7DayMinutes(
          entries,
          endDate
        );

      windows.push({
        startDate,
        endDate,
        totalMinutes,
        exceeds:
          totalMinutes >
          LIMIT_MINUTES,
      });
    }

    return windows;
  }

  const todayDate = getTodayDate();
  /* =========================================================
   COMPLIANCE HISTORY
========================================================= */

function getComplianceStatus(totalMinutes) {
    if (totalMinutes > LIMIT_MINUTES) {
      return {
        label: "OVER",
        className: "compliance-over",
      };
    }
  
    if (totalMinutes === LIMIT_MINUTES) {
      return {
        label: "LIMIT",
        className: "compliance-limit",
      };
    }
  
    if (totalMinutes >= 27 * 60) {
      return {
        label: "DANGER",
        className: "compliance-danger",
      };
    }
  
    if (totalMinutes >= 26 * 60) {
      return {
        label: "CAUTION",
        className: "compliance-caution",
      };
    }
  
    return {
      label: "SAFE",
      className: "compliance-safe",
    };
  }
  
  const complianceHistory = useMemo(() => {
    if (workEntries.length === 0) {
      return [];
    }
  
    /*
      Start from today.
  
      Show the most recent 14 rolling
      seven-day periods.
    */
  
    const history = [];
  
    for (
      let offset = 0;
      offset < 14;
      offset += 1
    ) {
      const endDate = addDays(
        todayDate,
        -offset
      );
  
      const startDate = addDays(
        endDate,
        -6
      );
  
      const totalMinutes =
        getRolling7DayMinutes(
          workEntries,
          endDate
        );
  
      const remainingMinutes =
        Math.max(
          0,
          LIMIT_MINUTES -
            totalMinutes
        );
  
      const overMinutes =
        Math.max(
          0,
          totalMinutes -
            LIMIT_MINUTES
        );
  
      history.push({
        startDate,
        endDate,
        totalMinutes,
        remainingMinutes,
        overMinutes,
        status:
          getComplianceStatus(
            totalMinutes
          ),
      });
    }
  
    return history;
  }, [
    workEntries,
    todayDate,
    LIMIT_MINUTES,
  ]);

  /* =========================================================
     TODAY'S COMPLETED WORK
  ========================================================= */


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

  /* =========================================================
     ACTIVE SHIFT CALCULATIONS
  ========================================================= */

  const activeSeconds =
    activeShift
      ? Math.max(
          0,
          Math.floor(
            (now -
              activeShift.startedTimestamp) /
              1000
          )
        )
      : 0;

  /*
    Use completed full minutes for compliance.
  */

  const activeMinutes =
    Math.floor(
      activeSeconds / 60
    );

  /*
    Completed rolling total,
    excluding currently active shift.
  */

  const completedRollingMinutes =
    useMemo(() => {
      return getRolling7DayMinutes(
        workEntries,
        todayDate
      );
    }, [
      workEntries,
      todayDate,
    ]);

  /*
    Live rolling total includes active shift.
  */

  const liveRollingMinutes =
    completedRollingMinutes +
    (activeShift &&
    activeShift.date === todayDate
      ? activeMinutes
      : 0);

  const rollingRemainingMinutes =
    LIMIT_MINUTES -
    liveRollingMinutes;

  const rollingPercentage =
    LIMIT_MINUTES > 0
      ? Math.min(
          100,
          Math.floor(
            (liveRollingMinutes /
              LIMIT_MINUTES) *
              100
          )
        )
      : 0;

  const liveExceedsLimit =
    liveRollingMinutes >
    LIMIT_MINUTES;

  /*
    Previous six days are important because
    they determine the maximum amount that
    can be worked TODAY.
  */

  const previous6DaysMinutes =
    useMemo(() => {
      return getPrevious6DaysMinutes(
        workEntries,
        todayDate
      );
    }, [
      workEntries,
      todayDate,
    ]);

  /*
    Maximum total minutes that today itself
    can contribute without the rolling window
    going above the configured limit.
  */

  const maxTodayMinutes =
    Math.max(
      0,
      LIMIT_MINUTES -
        previous6DaysMinutes
    );

  /*
    Remaining additional work possible today.

    This subtracts:
    - already completed shifts today
    - current live shift
  */


  const availableAdditionalMinutesToday =
    Math.max(
      0,
      maxTodayMinutes -
        todayMinutes -
        (activeShift &&
        activeShift.date ===
          todayDate
          ? activeMinutes
          : 0)
    );

    /* =========================================================
   TOMORROW AVAILABILITY
========================================================= */

const tomorrowDate =
addDays(
  todayDate,
  1
);

/*
Tomorrow's allowed work depends on the
six calendar days BEFORE tomorrow.

That means:
tomorrow - 6 through tomorrow - 1

Because tomorrow itself has no worked
minutes yet.
*/

const previous6DaysBeforeTomorrow =
useMemo(() => {
  return getPrevious6DaysMinutes(
    workEntries,
    tomorrowDate
  );
}, [
  workEntries,
  tomorrowDate,
]);

const availableMinutesTomorrow =
Math.max(
  0,
  LIMIT_MINUTES -
    previous6DaysBeforeTomorrow
);

const tomorrowWindowStart =
addDays(
  tomorrowDate,
  -6
);

  /* =========================================================
     MANUAL ENTRY CALCULATION
  ========================================================= */

  const startMinutes =
    timeToMinutes(clockIn);

  const endMinutes =
    timeToMinutes(clockOut);

  let calculatedMinutes =
    endMinutes -
    startMinutes -
    Number(
      breakMinutes
    );

  if (
    calculatedMinutes < 0
  ) {
    calculatedMinutes = 0;
  }

  const editingEntry =
    editingEntryId
      ? workEntries.find(
          (entry) =>
            entry.id ===
            editingEntryId
        )
      : null;

  /*
    Build the proposed entry before saving.
  */

  const previewEntry = {
    ...(editingEntry || {}),

    id:
      editingEntryId ||
      "preview-entry",

    date,

    clockIn,

    clockOut,

    breakMinutes:
      Number(
        breakMinutes
      ),

    totalMinutes:
      calculatedMinutes,

    entryType:
      editingEntry?.entryType ||
      "manual",

    note,
  };

  /*
    Remove old edited version and insert
    the proposed version.
  */

  const previewEntries =
    calculatedMinutes > 0
      ? [
          ...workEntries.filter(
            (entry) =>
              entry.id !==
              editingEntryId
          ),
          previewEntry,
        ]
      : workEntries;

  /*
    Check ALL rolling windows that this
    new/edited shift affects.
  */

  const affectedWindows =
    getAffectedRollingWindows(
      previewEntries,
      date
    );

  const highestAffectedWindow =
    affectedWindows.reduce(
      (highest, current) =>
        current.totalMinutes >
        highest.totalMinutes
          ? current
          : highest,
      affectedWindows[0]
    );

  const violatingWindows =
    affectedWindows.filter(
      (window) =>
        window.exceeds
    );

  const exceedsAnyRollingWindow =
    violatingWindows.length >
    0;

  /* =========================================================
   CLOCK IN
========================================================= */

async function handleClockIn() {
  if (activeShift) {
    return;
  }

  if (
    availableAdditionalMinutesToday <= 0
  ) {
    const continueAnyway =
      window.confirm(
        `Your rolling 7-day total has no remaining time available today under the ${weeklyLimitHours}-hour limit.\n\nClock in anyway?`
      );

    if (!continueAnyway) {
      return;
    }
  }

  const start =
    new Date();

  const newActiveShift = {
    shiftId:
      crypto.randomUUID(),

    startedTimestamp:
      start.getTime(),

    date:
      getTodayDate(),

    clockIn:
      getCurrentTime(),

    breakMinutes: 0,
  };

  setActiveShift(
    newActiveShift
  );

  localStorage.setItem(
    "worktrack-active-shift",
    JSON.stringify(
      newActiveShift
    )
  );

  setNow(
    Date.now()
  );

  await saveActiveShiftToFirestore(
    newActiveShift
  );
}

/* =========================================================
   CLOCK OUT
========================================================= */

async function handleClockOut() {
  if (!activeShift) {
    return;
  }

  const user =
    auth.currentUser;

  if (!user) {
    return;
  }

  /*
    Capture this shift before starting
    the Firestore transaction.
  */

  const shift =
    activeShift;

  const shiftId =
    shift.shiftId ||
    crypto.randomUUID();

  const activeShiftRef =
    doc(
      db,
      "users",
      user.uid,
      "activeShift",
      "current"
    );

  const workEntryRef =
    doc(
      db,
      "users",
      user.uid,
      "workEntries",
      shiftId
    );

  try {
    const result =
      await runTransaction(
        db,
        async (transaction) => {
          /*
            Read the active shift inside
            the transaction.
          */

          const activeSnapshot =
            await transaction.get(
              activeShiftRef
            );

          /*
            If the document disappeared,
            another device already completed it.
          */

          if (
            !activeSnapshot.exists()
          ) {
            return {
              alreadyCompleted:
                true,
            };
          }

          const cloudShift =
            activeSnapshot.data();

          /*
            Confirm that both devices are
            talking about the same shift.
          */

          if (
            cloudShift.shiftId &&
            shift.shiftId &&
            cloudShift.shiftId !==
              shift.shiftId
          ) {
            throw new Error(
              "Active shift changed on another device."
            );
          }

          const finish =
            new Date();

          const elapsedMinutes =
            Math.floor(
              (finish.getTime() -
                Number(
                  cloudShift.startedTimestamp
                )) /
                60000
            );

          const usedBreakMinutes =
            Number(
              cloudShift.breakMinutes ||
                0
            );

          /*
            Exact worked time:
            elapsed time - unpaid break.
          */

          const totalMinutes =
            Math.max(
              1,
              elapsedMinutes -
                usedBreakMinutes
            );

          const clockOutTime =
            `${String(
              finish.getHours()
            ).padStart(
              2,
              "0"
            )}:${String(
              finish.getMinutes()
            ).padStart(
              2,
              "0"
            )}`;

          const newEntry = {
            id:
              cloudShift.shiftId ||
              shiftId,

            date:
              cloudShift.date,

            clockIn:
              cloudShift.clockIn,

            clockOut:
              clockOutTime,

            breakMinutes:
              usedBreakMinutes,

            totalMinutes,

            entryType:
              "clock",

            note: "",
          };

          /*
            These happen atomically:

            1. Save completed shift
            2. Delete active shift
          */

          transaction.set(
            workEntryRef,
            newEntry
          );

          transaction.delete(
            activeShiftRef
          );

          return {
            alreadyCompleted:
              false,
          };
        }
      );

    /*
      Another device already clocked out.
    */

    if (
      result.alreadyCompleted
    ) {
      setActiveShift(
        null
      );

      localStorage.removeItem(
        "worktrack-active-shift"
      );

      return;
    }

    /*
      onSnapshot() will automatically
      receive the new work entry.
    */

    setActiveShift(
      null
    );

    localStorage.removeItem(
      "worktrack-active-shift"
    );
  } catch (error) {
    console.error(
      "Clock out transaction failed:",
      error
    );

    alert(
      "Clock out could not be completed. Your active shift has been kept. Please try again."
    );
  }
}
  /* =========================================================
     OPEN / CLOSE MANUAL FORM
  ========================================================= */

  function openManualForm() {
    setEditingEntryId(
      null
    );

    setDate(
      getTodayDate()
    );

    setClockIn(
      "10:00"
    );

    setClockOut(
      "16:00"
    );

    setBreakMinutes(
      0
    );

    setNote("");

    setShowManualForm(
      true
    );
  }

  function closeManualForm() {
    setShowManualForm(
      false
    );

    setEditingEntryId(
      null
    );

    setDate(
      getTodayDate()
    );

    setClockIn(
      "10:00"
    );

    setClockOut(
      "16:00"
    );

    setBreakMinutes(
      0
    );

    setNote("");
  }

  /* =========================================================
     SAVE MANUAL / EDITED SHIFT
  ========================================================= */

  async function handleSaveManualShift() {
    if (
      !date ||
      !clockIn ||
      !clockOut
    ) {
      alert(
        "Please enter the date, clock-in time and clock-out time."
      );

      return;
    }

    if (
      calculatedMinutes <= 0
    ) {
      alert(
        "Please enter a valid work period."
      );

      return;
    }

    /*
      Strong warning if ANY affected
      rolling 7-day window exceeds limit.
    */

    if (
      exceedsAnyRollingWindow
    ) {
      const worst =
        highestAffectedWindow;

      const overBy =
        worst.totalMinutes -
        LIMIT_MINUTES;

      const continueAnyway =
        window.confirm(
          `WARNING\n\nThis shift would cause at least one rolling 7-day period to exceed ${weeklyLimitHours} hours.\n\nHighest affected total: ${formatMinutes(
            worst.totalMinutes
          )}\nOver by: ${formatMinutes(
            Math.max(
              0,
              overBy
            )
          )}\nAffected period: ${worst.startDate} to ${worst.endDate}\n\nSave this actual work record anyway?`
        );

      /*
        Don't silently block factual records.
        User can still save if this is work
        that actually happened.
      */

      if (
        !continueAnyway
      ) {
        return;
      }
    }

    if (
      editingEntryId
    ) {
      const currentEntry =
        workEntries.find(
          (entry) =>
            entry.id ===
            editingEntryId
        );

      if (!currentEntry) {
        return;
      }

      const updatedEntry = {
        ...currentEntry,

        date,

        clockIn,

        clockOut,

        breakMinutes:
          Number(
            breakMinutes
          ),

        totalMinutes:
          calculatedMinutes,

        note,
      };

      setWorkEntries(
        (previous) =>
          previous.map(
            (entry) =>
              entry.id ===
              editingEntryId
                ? updatedEntry
                : entry
          )
      );

      await saveWorkEntryToFirestore(
        updatedEntry
      );
    } else {
      const newEntry = {
        id:
          crypto.randomUUID(),

        date,

        clockIn,

        clockOut,

        breakMinutes:
          Number(
            breakMinutes
          ),

        totalMinutes:
          calculatedMinutes,

        entryType:
          "manual",

        note,
      };

      setWorkEntries(
        (previous) => [
          ...previous,
          newEntry,
        ]
      );

      await saveWorkEntryToFirestore(
        newEntry
      );
    }

    closeManualForm();
  }

  /* =========================================================
     EDIT SHIFT
  ========================================================= */

  function handleEditEntry(
    entry
  ) {
    setEditingEntryId(
      entry.id
    );

    setDate(
      entry.date
    );

    setClockIn(
      entry.clockIn
    );

    setClockOut(
      entry.clockOut
    );

    setBreakMinutes(
      entry.breakMinutes ||
        0
    );

    setNote(
      entry.note ||
        ""
    );

    setShowManualForm(
      true
    );
  }

  /* =========================================================
     DELETE SHIFT
  ========================================================= */

  async function handleDeleteEntry() {
    if (
      !editingEntryId
    ) {
      return;
    }

    const confirmed =
      window.confirm(
        "Are you sure you want to delete this shift?"
      );

    if (!confirmed) {
      return;
    }

    const entryIdToDelete =
      editingEntryId;

    setWorkEntries(
      (previous) =>
        previous.filter(
          (entry) =>
            entry.id !==
            entryIdToDelete
        )
    );

    await deleteWorkEntryFromFirestore(
      entryIdToDelete
    );

    closeManualForm();
  }

  /* =========================================================
     SORT HISTORY
  ========================================================= */

  const sortedEntries =
    [...workEntries].sort(
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
          timeToMinutes(
            b.clockIn
          ) -
          timeToMinutes(
            a.clockIn
          )
        );
      }
    );

  /* =========================================================
     UI
  ========================================================= */

  return (
    <div className="work-page">
      <header className="work-header">
        <div>
          <p className="page-eyebrow">
            WORK TRACKER
          </p>

          <h1>Work</h1>

          <p>
            Track your shifts and
            rolling 7-day limit.
          </p>
        </div>
      </header>

      {/* =====================================================
          TODAY
      ====================================================== */}

      <section className="card work-today-card">
        <p className="section-label">
          TODAY
        </p>

        {!activeShift && (
          <>
            <div className="today-time">
              <h2>
                {formatMinutes(
                  todayMinutes
                )}
              </h2>

              <p>
                {todayMinutes > 0
                  ? "Completed today"
                  : "No active shift"}
              </p>
            </div>

            <button
              className="clock-button"
              onClick={
                handleClockIn
              }
            >
              <Clock3
                size={19}
              />

              CLOCK IN
            </button>
          </>
        )}

        {activeShift && (
          <>
            <div className="active-shift-status">
              <span className="live-indicator">
                ● WORKING
              </span>

              <h2>
                {formatTimer(
                  activeSeconds
                )}
              </h2>

              <p>
                Started at{" "}
                <strong>
                  {
                    activeShift.clockIn
                  }
                </strong>
              </p>
            </div>

            <button
              className="clock-out-button"
              onClick={
                handleClockOut
              }
            >
              <Square
                size={18}
              />

              CLOCK OUT
            </button>
          </>
        )}

        <button
          className="manual-entry-button"
          onClick={
            openManualForm
          }
        >
          <Plus size={18} />

          Add Time Manually
        </button>
      </section>

      {/* =====================================================
          ROLLING 7-DAY SUMMARY
      ====================================================== */}

      <section className="card weekly-summary-card">
        <div className="weekly-summary-top">
          <div>
            <p className="section-label">
              ROLLING 7 DAYS
            </p>

            <h3>
              {formatMinutes(
                liveRollingMinutes
              )}
            </h3>
          </div>

          <span className="week-limit">
            /{" "}
            {weeklyLimitHours}h
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

        <div className="weekly-info">
          <span>
            {rollingPercentage}%
            used
          </span>

          {rollingRemainingMinutes >=
          0 ? (
            <strong>
              {formatMinutes(
                rollingRemainingMinutes
              )}{" "}
              remaining
            </strong>
          ) : (
            <strong className="weekly-over">
              {formatMinutes(
                Math.abs(
                  rollingRemainingMinutes
                )
              )}{" "}
              over limit
            </strong>
          )}
        </div>

        <div className="rolling-date-range">
          <small>
            {formatDisplayDate(
              addDays(
                todayDate,
                -6
              )
            )}{" "}
            –{" "}
            {formatDisplayDate(
              todayDate
            )}
          </small>
        </div>

        {!liveExceedsLimit && (
          <div className="safe-hours-card">
            <span>
              Additional time
              available today
            </span>

            <strong>
              {formatMinutes(
                availableAdditionalMinutesToday
              )}
            </strong>
          </div>
        )}

      <div className="tomorrow-hours-card">
        <div className="tomorrow-hours-info">
          <span>
            Available tomorrow
          </span>

          <small>
            {formatDisplayDate(
              tomorrowDate
            )}
          </small>

          <small>
            Window:{" "}
            {formatDisplayDate(
              tomorrowWindowStart
            )}{" "}
            –{" "}
            {formatDisplayDate(
              tomorrowDate
            )}
          </small>
        </div>

        <strong>
          {formatMinutes(
            availableMinutesTomorrow
          )}
        </strong>
      </div>

        {liveExceedsLimit && (
          <div className="live-warning">
            <AlertTriangle
              size={17}
            />

            <span>
              Rolling 7-day total
              is above{" "}
              {weeklyLimitHours}{" "}
              hours.
            </span>
          </div>
        )}

        {!liveExceedsLimit &&
          rollingRemainingMinutes <=
            60 && (
            <div className="live-warning">
              <AlertTriangle
                size={17}
              />

              <span>
                Only{" "}
                {formatMinutes(
                  rollingRemainingMinutes
                )}{" "}
                remains before the
                rolling limit.
              </span>
            </div>
          )}
      </section>

      {/* =====================================================
            COMPLIANCE HISTORY
        ===================================================== */}

        <section className="card compliance-history-card">
        <div className="compliance-history-header">
            <div>
            <p className="section-label">
                COMPLIANCE HISTORY
            </p>

            <p className="compliance-description">
                Rolling 7-day totals calculated
                from exact worked minutes.
            </p>
            </div>
        </div>

        {complianceHistory.length === 0 && (
            <p className="empty-message">
            No compliance data available yet.
            </p>
        )}

        <div className="compliance-history-list">
            {complianceHistory.map(
            (item) => (
                <div
                className="compliance-row"
                key={item.endDate}
                >
                <div className="compliance-main">
                    <div className="compliance-date">
                    <strong>
                        {formatDisplayDate(
                        item.endDate
                        )}
                    </strong>

                    <span>
                        {formatDisplayDate(
                        item.startDate
                        )}{" "}
                        –{" "}
                        {formatDisplayDate(
                        item.endDate
                        )}
                    </span>
                    </div>

                    <div className="compliance-total">
                    <strong>
                        {formatMinutes(
                        item.totalMinutes
                        )}
                    </strong>

                    <span>
                        / {weeklyLimitHours}h
                    </span>
                    </div>
                </div>

                <div className="compliance-bottom">
                    <span
                    className={`compliance-badge ${item.status.className}`}
                    >
                    {item.status.label}
                    </span>

                    {item.totalMinutes <=
                    LIMIT_MINUTES ? (
                    <span className="compliance-remaining">
                        {formatMinutes(
                        item.remainingMinutes
                        )}{" "}
                        left
                    </span>
                    ) : (
                    <span className="compliance-over-text">
                        {formatMinutes(
                        item.overMinutes
                        )}{" "}
                        over
                    </span>
                    )}
                </div>
                </div>
            )
            )}
        </div>

        <div className="compliance-legend">
            <span>
            <i className="legend-dot safe-dot" />
            Safe
            </span>

            <span>
            <i className="legend-dot caution-dot" />
            26h+
            </span>

            <span>
            <i className="legend-dot danger-dot" />
            27h+
            </span>

            <span>
            <i className="legend-dot limit-dot" />
            28h
            </span>
        </div>
        </section>

      {/* =====================================================
          HISTORY
      ====================================================== */}

      <section className="card">
        <div className="section-header">
          <p className="section-label">
            WORK HISTORY
          </p>
        </div>

        {sortedEntries.length ===
          0 && (
          <p className="empty-message">
            No work entries yet.
          </p>
        )}

        {sortedEntries.map(
          (entry) => (
            <div
              className="shift-row"
              key={entry.id}
            >
              <div>
                <div className="shift-title-row">
                  <strong>
                    {formatDisplayDate(
                      entry.date
                    )}
                  </strong>

                  {entry.entryType ===
                    "manual" && (
                    <span className="manual-badge">
                      Manual
                    </span>
                  )}
                </div>

                <p>
                  {entry.clockIn}{" "}
                  –{" "}
                  {entry.clockOut}
                </p>

                {Number(
                  entry.breakMinutes
                ) > 0 && (
                  <small>
                    Break:{" "}
                    {
                      entry.breakMinutes
                    }{" "}
                    min
                  </small>
                )}

                {entry.note && (
                  <small className="shift-note">
                    {entry.note}
                  </small>
                )}
              </div>

              <div className="shift-right">
                <strong>
                  {formatMinutes(
                    entry.totalMinutes
                  )}
                </strong>

                <button
                  className="edit-button"
                  onClick={() =>
                    handleEditEntry(
                      entry
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

      {/* =====================================================
          MANUAL / EDIT MODAL
      ====================================================== */}

      {showManualForm && (
        <div className="modal-overlay">
          <div className="manual-modal">
            <div className="modal-header">
              <div>
                <p className="page-eyebrow">
                  {editingEntryId
                    ? "EDIT SHIFT"
                    : "MANUAL ENTRY"}
                </p>

                <h2>
                  {editingEntryId
                    ? "Edit Work Time"
                    : "Add Work Time"}
                </h2>
              </div>

              <button
                className="modal-close"
                onClick={
                  closeManualForm
                }
              >
                <X size={21} />
              </button>
            </div>

            <div className="form-group">
              <label>
                Date
              </label>

              <input
                type="date"
                value={date}
                onChange={(e) =>
                  setDate(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="time-input-row">
              <div className="form-group">
                <label>
                  Clock In
                </label>

                <input
                  type="time"
                  value={
                    clockIn
                  }
                  onChange={(e) =>
                    setClockIn(
                      e.target.value
                    )
                  }
                />
              </div>

              <div className="form-group">
                <label>
                  Clock Out
                </label>

                <input
                  type="time"
                  value={
                    clockOut
                  }
                  onChange={(e) =>
                    setClockOut(
                      e.target.value
                    )
                  }
                />
              </div>
            </div>

            <div className="form-group">
              <label>
                Break
              </label>

              <select
                value={
                  breakMinutes
                }
                onChange={(e) =>
                  setBreakMinutes(
                    Number(
                      e.target.value
                    )
                  )
                }
              >
                <option value={0}>
                  No break
                </option>

                <option value={15}>
                  15 minutes
                </option>

                <option value={30}>
                  30 minutes
                </option>

                <option value={45}>
                  45 minutes
                </option>

                <option value={60}>
                  1 hour
                </option>
              </select>
            </div>

            <div className="calculation-card">
              <span>
                Calculated Work
                Time
              </span>

              <strong>
                {formatMinutes(
                  calculatedMinutes
                )}
              </strong>
            </div>

            {/* ================================================
                ROLLING 7-DAY PREVIEW
            ================================================= */}

            <div
              className={`limit-preview ${
                exceedsAnyRollingWindow
                  ? "limit-danger"
                  : ""
              }`}
            >
              <div className="limit-preview-title">
                <AlertTriangle
                  size={18}
                />

                <span>
                  {exceedsAnyRollingWindow
                    ? "Rolling 7-day warning"
                    : "Rolling 7-day check"}
                </span>
              </div>

              <div className="preview-row">
                <span>
                  This shift
                </span>

                <strong>
                  {formatMinutes(
                    calculatedMinutes
                  )}
                </strong>
              </div>

              <div className="preview-row">
                <span>
                  Highest affected
                  7-day total
                </span>

                <strong>
                  {formatMinutes(
                    highestAffectedWindow
                      .totalMinutes
                  )}
                </strong>
              </div>

              <div className="preview-row">
                <span>
                  Highest period
                </span>

                <strong>
                  {
                    highestAffectedWindow.startDate
                  }{" "}
                  –{" "}
                  {
                    highestAffectedWindow.endDate
                  }
                </strong>
              </div>

              {!exceedsAnyRollingWindow && (
                <p className="safe-message">
                  All affected
                  rolling 7-day
                  periods remain
                  within{" "}
                  {weeklyLimitHours}{" "}
                  hours.
                </p>
              )}

              {exceedsAnyRollingWindow && (
                <p className="danger-message">
                  {
                    violatingWindows.length
                  }{" "}
                  affected rolling
                  period
                  {violatingWindows.length >
                  1
                    ? "s"
                    : ""}{" "}
                  would exceed the{" "}
                  {weeklyLimitHours}
                  -hour limit.
                </p>
              )}
            </div>

            <div className="form-group">
              <label>
                Note
              </label>

              <textarea
                rows="3"
                placeholder="Example: Forgot to clock out"
                value={note}
                onChange={(e) =>
                  setNote(
                    e.target.value
                  )
                }
              />
            </div>

            <div className="modal-action-buttons">
              {editingEntryId && (
                <button
                  className="delete-shift-button"
                  onClick={
                    handleDeleteEntry
                  }
                >
                  Delete
                </button>
              )}

              <button
                className="save-shift-button"
                onClick={
                  handleSaveManualShift
                }
              >
                <Save
                  size={18}
                />

                {editingEntryId
                  ? "Save Changes"
                  : "Save Shift"}
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

export default Work;