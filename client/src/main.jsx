import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";
import { AuthContextProvider } from "./AuthContext/authContext.jsx";
import ThemeContextProvider from "./Context/theme.jsx";
import ErrorBoundary from "./ErrorBoundary.jsx";
import { ToastProvider } from "./Context/ToastContext.jsx";

ReactDOM.createRoot(document.getElementById("root")).render(
  <ErrorBoundary>
    <ThemeContextProvider>
      <AuthContextProvider>
        <ToastProvider>
          <App />
        </ToastProvider>
      </AuthContextProvider>
    </ThemeContextProvider>
  </ErrorBoundary>
);
