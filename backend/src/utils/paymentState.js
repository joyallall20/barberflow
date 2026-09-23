 export const PAYMENT_STATUSES = [
  "pending",
  "authorized",
  "completed",
  "partially_refunded",
  "refunded",
  "failed",
  "cancelled",
];

export const ALLOWED_TRANSITIONS = {
  pending: new Set([
    "authorized",
    "completed",
    "failed",
    "cancelled",
  ]),

  authorized: new Set([
    "completed",
    "failed",
    "cancelled",
  ]),

  completed: new Set([
    "partially_refunded",
    "refunded",
  ]),

  partially_refunded: new Set([
    "refunded",
  ]),

  failed: new Set(),

  cancelled: new Set(),

  refunded: new Set(),
};

export const canTransitionPayment = (from, to) => {
  if (!PAYMENT_STATUSES.includes(from)) {
    return false;
  }

  if (!PAYMENT_STATUSES.includes(to)) {
    return false;
  }

  if (from === to) {
    return true;
  }

  return ALLOWED_TRANSITIONS[from]?.has(to) ?? false;
};

export const assertPaymentTransition = (from, to) => {
  if (!canTransitionPayment(from, to)) {
    throw Object.assign(
      new Error(
        `Invalid payment status transition: ${from} -> ${to}`
      ),
      {
        status: 409,
      }
    );
  }
};