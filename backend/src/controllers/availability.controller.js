// controllers/availability.controller.js
import ApiError from "../utils/ApiError.js";
import asyncHandler from "../utils/asyncHandler.js";
import { sendSuccess } from "../utils/response.js";
import { getAvailableSlots } from "../services/availability.service.js";

export const getAvailability = asyncHandler(async (req, res) => {
  const { barber, service, date } = req.query;

  if (!barber) throw new ApiError(400, "Query param 'barber' is required");
  if (!service) throw new ApiError(400, "Query param 'service' is required");
  if (!date) throw new ApiError(400, "Query param 'date' is required");

  const slots = await getAvailableSlots({
    barberId: barber,
    serviceId: service,
    date,
  });

  return sendSuccess(
    res,
    {
      date,
      barber,
      service,
      slots,
    },
    "Availability retrieved successfully"
  );
});