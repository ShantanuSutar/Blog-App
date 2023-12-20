import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthContextProvider } from "./AuthContext/authContext.jsx";
import ThemeContextProvider from "./Context/theme.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <ThemeContextProvider>
      <AuthContextProvider>
        <App />
      </AuthContextProvider>
    </ThemeContextProvider>
  </React.StrictMode>
);
