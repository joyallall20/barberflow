// src/controllers/webhook.controller.js
import Payment from "../models/Payment.js";
import Refund from "../models/Refund.js";
import Appointment from "../models/Appointment.js";
import { verifyPaypalWebhook } from "../services/paypal.service.js";

/**
 * @desc    Handle PayPal webhook events
 * @route   POST /api/webhooks/paypal
 * @access  Public (verified via PayPal signature)
 *
 * IMPORTANT: This route is mounted BEFORE express.json() in server.js,
 * so req.body is a raw Buffer — required for signature verification.
 */
export const handlePaypalWebhook = async (req, res) => {
  try {
    // 1. Verify signature
    const isValid = await verifyPaypalWebhook({
      headers: req.headers,
      rawBody: req.body,
    });

    if (!isValid) {
      console.warn("❌ PayPal webhook signature verification failed");
      return res.status(401).json({ success: false, message: "Invalid signature" });
    }

    // 2. Parse body AFTER verification
    const event = JSON.parse(req.body.toString("utf8"));
    const { event_type, resource, id: eventId } = event;

    console.log(`📩 PayPal webhook received: ${event_type} (${eventId})`);

    // 3. Route on event type
    switch (event_type) {
      // ------------------------------------------------------------
      // Order approved by customer (before capture)
      // ------------------------------------------------------------
      case "CHECKOUT.ORDER.APPROVED": {
        await Payment.findOneAndUpdate(
          { providerOrderId: resource.id },
          {
            status: "authorized",
            metadata: { ...(resource.metadata || {}), approvedEvent: resource },
          }
        );
        break;
      }

      // ------------------------------------------------------------
      // Capture completed → payment fully paid
      // ------------------------------------------------------------
      case "PAYMENT.CAPTURE.COMPLETED": {
        const orderId = resource?.supplementary_data?.related_ids?.order_id;

        if (!orderId) {
          console.warn("PAYMENT.CAPTURE.COMPLETED missing order_id");
          break;
        }

        const payment = await Payment.findOneAndUpdate(
          { providerOrderId: orderId },
          {
            status: "completed",
            providerCaptureId: resource.id,
            metadata: {
              ...(resource.metadata || {}),
              captureEvent: resource,
            },
          },
          { new: true }
        );

        if (payment) {
          await Appointment.findByIdAndUpdate(payment.appointment, {
            paymentStatus: "paid",
          }).catch((e) =>
            console.warn("Failed to sync appointment (paid):", e.message)
          );
        }
        break;
      }

      // ------------------------------------------------------------
      // Refund completed
      // ------------------------------------------------------------
      case "PAYMENT.CAPTURE.REFUNDED": {
        // The refund resource id is the PayPal refund id
        const refundId = resource.id;

        // Try matching by providerRefundId first
        let refund = await Refund.findOneAndUpdate(
          { providerRefundId: refundId },
          { status: "completed", providerResponse: resource },
          { new: true }
        );

        // Fallback: match by the capture id in the refund's links
        if (!refund) {
          const captureId = resource?.links?.find((l) =>
            l.href?.includes("/payments/captures/")
          )?.href?.split("/payments/captures/")[1]?.split("/")[0];

          if (captureId) {
            const payment = await Payment.findOne({ providerCaptureId: captureId });
            if (payment) {
              refund = await Refund.findOneAndUpdate(
                { payment: payment._id, status: "pending" },
                {
                  status: "completed",
                  providerRefundId: refundId,
                  providerResponse: resource,
                },
                { new: true, sort: { createdAt: -1 } }
              );
            }
          }
        }

        if (!refund) {
          console.warn(`Refund record not found for PayPal refund ${refundId}`);
        }
        break;
      }

      // ------------------------------------------------------------
      // Capture denied / failed
      // ------------------------------------------------------------
      case "PAYMENT.CAPTURE.DENIED":
      case "PAYMENT.CAPTURE.DECLINED": {
        const orderId = resource?.supplementary_data?.related_ids?.order_id;

        if (orderId) {
          await Payment.findOneAndUpdate(
            { providerOrderId: orderId },
            {
              status: "failed",
              failureReason:
                resource?.status_details?.reason || "Capture denied by PayPal",
              metadata: { ...(resource.metadata || {}), deniedEvent: resource },
            }
          );
        }
        break;
      }

      // ------------------------------------------------------------
      // Order saved / created (informational)
      // ------------------------------------------------------------
      case "CHECKOUT.ORDER.COMPLETED": {
        // Fires when an order transitions to COMPLETED (usually paired
        // with a capture event). Nothing critical to do here, but log it.
        console.log(`Order completed: ${resource.id}`);
        break;
      }

      default:
        console.log(`Unhandled PayPal event: ${event_type}`);
        break;
    }

    // 4. Always respond 200 quickly so PayPal doesn't retry
    return res.status(200).json({ received: true });
  } catch (error) {
    console.error("PayPal webhook handler error:", error);
    // Return 200 for processed-but-failed logic to avoid retries flooding you.
    // Return 500 only for genuine transient errors you want retried.
    return res.status(200).json({ received: true });
  }
};

/**
 * Retrieve a PayPal order directly from PayPal.
 *
 * This is used to verify that a client-supplied PayPal order ID
 * actually exists and that its financial details match our
 * server-side payment record.
 */
export const getPaypalOrder = async (orderId) => {
  if (!orderId || typeof orderId !== "string") {
    throw new Error("A valid PayPal order ID is required");
  }

  const accessToken = await getAccessToken();

  const res = await fetch(
    `${PAYPAL_API_BASE}/v2/checkout/orders/${encodeURIComponent(orderId)}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const errText = await res.text();

    throw new Error(
      `PayPal getOrder failed: ${res.status} ${errText}`
    );
  }

  return res.json();
};

/**
 * Retrieve a PayPal capture directly from PayPal.
 *
 * Used to verify capture ID, status, amount and currency
 * before treating a capture as financially valid.
 */
export const getPaypalCapture = async (captureId) => {
  if (!captureId || typeof captureId !== "string") {
    throw new Error("A valid PayPal capture ID is required");
  }

  const accessToken = await getAccessToken();

  const res = await fetch(
    `${PAYPAL_API_BASE}/v2/payments/captures/${encodeURIComponent(
      captureId
    )}`,
    {
      method: "GET",
      headers: {
        Authorization: `Bearer ${accessToken}`,
        "Content-Type": "application/json",
      },
    }
  );

  if (!res.ok) {
    const errText = await res.text();

    throw new Error(
      `PayPal getCapture failed: ${res.status} ${errText}`
    );
  }

  return res.json();
};