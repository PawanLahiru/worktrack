import {
  useEffect,
  useState,
} from "react";

import {
  onAuthStateChanged,
} from "firebase/auth";

import { auth } from "./firebase";

import Login from "./pages/Login";

import {
  BrowserRouter,
  Routes,
  Route,
  NavLink,
} from "react-router-dom";

import {
  Home,
  BriefcaseBusiness,
  WalletCards,
  Settings as SettingsIcon,
} from "lucide-react";

import HomePage from "./pages/Home";
import WorkPage from "./pages/Work";
import MoneyPage from "./pages/Money";
import SettingsPage from "./pages/Settings";

import "./App.css";

function BottomNav() {
  return (
    <nav className="bottom-nav">
      <NavLink
        to="/"
        end
        className={({ isActive }) =>
          isActive ? "nav-item active" : "nav-item"
        }
      >
        <Home size={22} />
        <span>Home</span>
      </NavLink>

      <NavLink
        to="/work"
        className={({ isActive }) =>
          isActive ? "nav-item active" : "nav-item"
        }
      >
        <BriefcaseBusiness size={22} />
        <span>Work</span>
      </NavLink>

      <NavLink
        to="/money"
        className={({ isActive }) =>
          isActive ? "nav-item active" : "nav-item"
        }
      >
        <WalletCards size={22} />
        <span>Money</span>
      </NavLink>

      <NavLink
        to="/settings"
        className={({ isActive }) =>
          isActive ? "nav-item active" : "nav-item"
        }
      >
        <SettingsIcon size={22} />
        <span>Settings</span>
      </NavLink>
    </nav>
  );
}

function App() {
  const [user, setUser] =
  useState(null);

const [authLoading, setAuthLoading] =
  useState(true);

useEffect(() => {
  const unsubscribe =
    onAuthStateChanged(
      auth,
      (currentUser) => {
        setUser(currentUser);
        setAuthLoading(false);
      }
    );

  return unsubscribe;
}, []);

if (authLoading) {
  return (
    <div className="app-loading">
      Loading WorkTrack...
    </div>
  );
}

if (!user) {
  return <Login />;
}

  return (
    <BrowserRouter>
      <div className="app">
        <main className="app-content">
          <Routes>
            <Route path="/" element={<HomePage />} />
            <Route path="/work" element={<WorkPage />} />
            <Route path="/money" element={<MoneyPage />} />
            <Route path="/settings" element={<SettingsPage />} />
          </Routes>
        </main>

        <BottomNav />
      </div>
    </BrowserRouter>
  );

  
}

export default App;