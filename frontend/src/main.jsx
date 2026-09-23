import React from "react";
import ReactDOM from "react-dom/client";
import { BrowserRouter } from "react-router-dom";
import { PayPalScriptProvider } from "@paypal/react-paypal-js";
import App from "./App";

import "./index.css";

/**
 * PayPal SDK is loaded once at the app root.
 *
 * - clientId is a *public* identifier; the secret stays on the backend.
 * - intent: "capture" → we capture server-side; the browser never sees amounts.
 * - currency is fixed to USD to match the backend's currency.
 * - We deliberately do NOT pass `createOrder` here; each checkout creates
 *   its own server-side order and provides it via the Buttons' createOrder.
 */
const paypalOptions = {
  clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
  currency: "USD",
  intent: "capture",
  // components: "buttons",  // uncomment if you want to trim the SDK payload
};

ReactDOM.createRoot(document.getElementById("root")).render(
  <React.StrictMode>
    <PayPalScriptProvider options={paypalOptions}>
      <BrowserRouter>
        <App />
      </BrowserRouter>
    </PayPalScriptProvider>
  </React.StrictMode>
);