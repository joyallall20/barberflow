const toMoney = (value) => Number(Number(value).toFixed(2));

export const verifyPaypalOrderMatchesPayment = (
  paypalOrder,
  payment
) => {
  if (!paypalOrder?.id) {
    throw new Error("PayPal order response is missing order ID");
  }

  if (paypalOrder.id !== payment.providerOrderId) {
    throw new Error("PayPal order ID does not match payment");
  }

  const purchaseUnits = paypalOrder.purchase_units;

  if (!Array.isArray(purchaseUnits) || purchaseUnits.length !== 1) {
    throw new Error(
      "PayPal order must contain exactly one purchase unit"
    );
  }

  const purchaseUnit = purchaseUnits[0];

  const paypalAmount = toMoney(
    purchaseUnit?.amount?.value
  );

  const paypalCurrency =
    purchaseUnit?.amount?.currency_code;

  const expectedAmount = toMoney(payment.amount);
  const expectedCurrency = payment.currency;

  if (paypalAmount !== expectedAmount) {
    throw new Error(
      `PayPal amount mismatch: expected ${expectedAmount}, received ${paypalAmount}`
    );
  }

  if (paypalCurrency !== expectedCurrency) {
    throw new Error(
      `PayPal currency mismatch: expected ${expectedCurrency}, received ${paypalCurrency}`
    );
  }

  return true;
};

export const verifyPaypalCaptureMatchesPayment = (
  paypalCapture,
  payment
) => {
  if (!paypalCapture?.id) {
    throw new Error("PayPal capture response is missing capture ID");
  }

  const captureAmount = toMoney(
    paypalCapture?.amount?.value
  );

  const captureCurrency =
    paypalCapture?.amount?.currency_code;

  const expectedAmount = toMoney(payment.amount);
  const expectedCurrency = payment.currency;

  if (captureAmount !== expectedAmount) {
    throw new Error(
      `PayPal capture amount mismatch: expected ${expectedAmount}, received ${captureAmount}`
    );
  }

  if (captureCurrency !== expectedCurrency) {
    throw new Error(
      `PayPal capture currency mismatch: expected ${expectedCurrency}, received ${captureCurrency}`
    );
  }

  if (paypalCapture.status !== "COMPLETED") {
    throw new Error(
      `PayPal capture is not completed: ${paypalCapture.status}`
    );
  }

  return true;
};