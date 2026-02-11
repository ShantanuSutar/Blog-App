import { Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";
import "./style.scss";
import Register from "./Pages/Register";
import Login from "./Pages/Login";
import Home from "./Pages/Home";
import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";
import Single from "./Pages/Single";
import Write from "./Pages/Write";
import Drafts from "./Pages/Drafts";
import Scheduled from "./Pages/Scheduled";
import Bookmarks from "./Pages/Bookmarks";
import { useThemeContext } from "./Context/theme";

const Layout = () => {
  const { theme } = useThemeContext();

  return (
    <div className={theme === "dark" ? "layout dark" : "layout"}>
      <Navbar />
      <Outlet />
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
  return (
    <div className="app">
      <div className="container">
        <RouterProvider router={router} />
      </div>
    </div>
  );
}

export default App;