import { lazy, Suspense, useEffect, useRef } from "react";
import { Outlet, RouterProvider, createBrowserRouter, useLocation } from "react-router-dom";
import "./style.scss";
import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";
import { useThemeContext } from "./Context/theme";
import InlineLoader from "./Components/ui/InlineLoader.jsx";

const Register = lazy(() => import("./Pages/Register.jsx"));
const Login = lazy(() => import("./Pages/Login.jsx"));
const Home = lazy(() => import("./Pages/Home.jsx"));
const Single = lazy(() => import("./Pages/Single.jsx"));
const Write = lazy(() => import("./Pages/Write.jsx"));
const Drafts = lazy(() => import("./Pages/Drafts.jsx"));
const Scheduled = lazy(() => import("./Pages/Scheduled.jsx"));
const Bookmarks = lazy(() => import("./Pages/Bookmarks.jsx"));
const Profile = lazy(() => import("./Pages/Profile.jsx"));
const ProfileEdit = lazy(() => import("./Components/ProfileEdit.jsx"));
const ActivityFeed = lazy(() => import("./Pages/ActivityFeed.jsx"));

function RouteLoading({ standalone = false }) {
  return (
    <div className={`route-loading${standalone ? " route-loading--standalone" : ""}`} role="status">
      <InlineLoader label="Loading page…" />
    </div>
  );
}

const Layout = () => {
  const { theme } = useThemeContext();
  const location = useLocation();
  const mainRef = useRef(null);
  const initialRenderRef = useRef(true);

  useEffect(() => {
    if (initialRenderRef.current) {
      initialRenderRef.current = false;
      return;
    }
    mainRef.current?.focus({ preventScroll: true });
  }, [location.pathname]);

  return (
    <div className={theme === "dark" ? "page-container dark" : "page-container"}>
      <Navbar />
      <main ref={mainRef} id="main-content" className="main-content-wrapper ui-container" tabIndex={-1}>
        <Suspense fallback={<RouteLoading />}>
          <Outlet />
        </Suspense>
      </main>
      <Footer />
    </div>
  );
};

const router = createBrowserRouter([
  {
    path: "/",
    element: <Layout />,
    children: [
      {
        path: "/",
        element: <Home />,
      },
      {
        path: "/post/:id",
        element: <Single />,
      },
      {
        path: "/write",
        element: <Write />,
      },
      {
        path: "/drafts",
        element: <Drafts />,
      },
      {
        path: "/scheduled",
        element: <Scheduled />,
      },
      {
        path: "/bookmarks",
        element: <Bookmarks />,
      },
      {
        path: "/feed",
        element: <ActivityFeed />,
      },
      {
        path: "/profile/:username",
        element: <Profile />,
      },
      {
        path: "/profile/:username/edit",
        element: <ProfileEdit />,
      },
      {
        path: "/tag/:tag",
        element: <Home />,
      },
    ],
  },
  {
    path: "/register",
    element: <Register />,
  },
  {
    path: "/login",
    element: <Login />,
  },
]);

function App() {
  const { theme } = useThemeContext();

  useEffect(() => {
    if (theme === "dark") {
      document.body.classList.add("dark");
    } else {
      document.body.classList.remove("dark");
    }
  }, [theme]);

  return (
    <div className={`app ${theme === "dark" ? "dark" : ""}`}>
      <Suspense fallback={<RouteLoading standalone />}>
        <RouterProvider router={router} />
      </Suspense>
    </div>
  );
}

export default App;
