import { useRef, useState } from "react";
import {
  PayPalScriptProvider,
  PayPalButtons,
} from "@paypal/react-paypal-js";
import { AlertCircle, Loader2 } from "lucide-react";
import { capturePayment } from "../../services/paymentService";

/**
 * Renders PayPal buttons for a *server-created* PayPal order.
 *
 * Security contract:
 * - The backend created the PayPal order (with the correct amount) in
 *   `POST /payments` and returned `paypalOrderId`.
 * - The browser NEVER supplies an amount or currency.
 * - `createOrder` here simply returns the server-side order id.
 * - `onApprove` triggers a *server-side* capture via `POST /payments/:id/capture`.
 * - `onSuccess` fires ONLY after the backend response confirms
 *   `payment.status === "completed"`.
 *
 * Props:
 *  - payment: { _id | id, amount, currency, status, ... }  (from createPayment)
 *  - paypalOrderId: string                                  (from createPayment)
 *  - onSuccess: (payment) => void                           (called after verified capture)
 *  - onError: (message: string) => void                     (called on any failure)
 */
const PayPalCheckout = ({ payment, paypalOrderId, onSuccess, onError }) => {
  const [capturing, setCapturing] = useState(false);
  const [error, setError] = useState(null);

  // Guards against a second `onApprove` firing before the first resolves
  // (e.g. user double-clicks, or React StrictMode remounts in dev).
  const inFlight = useRef(false);

  if (!payment || !paypalOrderId) {
    return (
      <div className="flex items-start gap-3 border border-red-500/30 bg-red-500/[0.04] p-4">
        <AlertCircle size={16} className="mt-0.5 text-red-400" />
        <p className="text-xs leading-relaxed text-[#e8e2d6]">
          Payment could not be initialized. Please refresh and try again.
        </p>
      </div>
    );
  }

  const handleApprove = async (data) => {
    if (inFlight.current) return;
    inFlight.current = true;
    setError(null);
    setCapturing(true);

    try {
      const result = await capturePayment(payment._id ?? payment.id, data.orderID);

      // Backend envelope: { success, message, data: { payment } }
      const confirmedPayment = result?.data?.payment ?? result?.data;

      if (!confirmedPayment || confirmedPayment.status !== "completed") {
        throw new Error(
          result?.message || "Payment could not be verified by the server."
        );
      }

      onSuccess?.(confirmedPayment);
    } catch (err) {
      const message =
        err?.response?.data?.message ||
        err?.message ||
        "Payment could not be completed.";

      setError(message);
      onError?.(message);
    } finally {
      setCapturing(false);
      inFlight.current = false;
    }
  };

  const handleError = (err) => {
    // PayPal-level error (button load, network, user-cancelled SDK error).
    // Do NOT navigate to success.
    console.error("PayPal SDK error:", err);
    const message = "PayPal encountered an error. Please try again.";
    setError(message);
    onError?.(message);
  };

  const handleCancel = () => {
    // User closed the PayPal window without approving.
    // Appointment stays unpaid. Do NOT navigate.
    const message = "Payment was cancelled. Your appointment is saved but unpaid.";
    setError(message);
    onError?.(message);
  };

  console.log(
    "PayPal config:",
    {
      clientIdLoaded: Boolean(import.meta.env.VITE_PAYPAL_CLIENT_ID),
      currency: import.meta.env.VITE_PAYPAL_CURRENCY || "USD",
    }
  );

  return (
    <PayPalScriptProvider
      options={{
        clientId: import.meta.env.VITE_PAYPAL_CLIENT_ID,
        currency: "USD",
        intent: "capture",
      }}
    >
      <div className="flex flex-col gap-4">
        {error && (
          <div className="flex items-start gap-3 border border-red-500/30 bg-red-500/[0.04] p-4">
            <AlertCircle size={16} className="mt-0.5 text-red-400" />
            <p className="text-xs leading-relaxed text-[#e8e2d6]">{error}</p>
          </div>
        )}

        <div className="relative">
          {/*
            `forceReRender` changes identity when capturing toggles, which
            causes PayPal to re-mount the buttons. While capturing, we hide
            them behind an overlay so clicks cannot reach PayPal.
          */}
          <div className={capturing ? "pointer-events-none opacity-40" : ""}>
            <PayPalButtons
              style={{ layout: "vertical", shape: "rect", label: "pay" }}
              disabled={capturing}
              forceReRender={[payment._id ?? payment.id]}
              createOrder={() => paypalOrderId}
              onApprove={handleApprove}
              onError={handleError}
              onCancel={handleCancel}
            />
          </div>

          {capturing && (
            <div className="absolute inset-0 flex items-center justify-center bg-[#141311]/80">
              <div className="flex items-center gap-3 text-[10px] font-bold uppercase tracking-[0.2em] text-amber-500">
                <Loader2 size={14} className="animate-spin" />
                Verifying payment…
              </div>
            </div>
          )}
        </div>
      </div>
    </PayPalScriptProvider>
  );
};

export default PayPalCheckout;