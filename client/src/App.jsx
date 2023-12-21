import { Outlet, RouterProvider, createBrowserRouter } from "react-router-dom";
import "./style.scss";
import Register from "./Pages/Register";
import Login from "./Pages/Login";
import Home from "./Pages/Home";
import Navbar from "./Components/Navbar";
import Footer from "./Components/Footer";
import Single from "./Pages/Single";
import Write from "./Pages/Write";
import { useThemeContext } from "./Context/theme";

const Layout = () => {
  return (
    <div className="layout">
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
    ],
  },
  {
    path: "/login",
    element: <Login />,
  },
  {
    path: "/register",
    element: <Register />,
  },
]);

function App() {
  const { theme, setTheme } = useThemeContext();

  return (
    <div className={theme === "dark" ? "app dark" : "app"}>
      <div className="container">
        <RouterProvider router={router} />
      </div>
    </div>
  );
}

export default App;
