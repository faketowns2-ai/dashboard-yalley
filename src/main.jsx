import React from "react";
import ReactDOM from "react-dom/client";
import App from "./App.jsx";

// Fora do Claude nao existe window.storage. Criamos um equivalente
// usando localStorage, para o app funcionar igual no Vercel/celular.
if (!window.storage) {
  window.storage = {
    get: async (key) => {
      const value = localStorage.getItem(key);
      return value !== null ? { key, value } : null;
    },
    set: async (key, value) => {
      localStorage.setItem(key, value);
      return { key, value };
    },
    delete: async (key) => {
      localStorage.removeItem(key);
      return { key, deleted: true };
    },
    list: async (prefix = "") => {
      const keys = Object.keys(localStorage).filter((k) => k.startsWith(prefix));
      return { keys, prefix };
    },
  };
}

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <App />
  </React.StrictMode>
);
