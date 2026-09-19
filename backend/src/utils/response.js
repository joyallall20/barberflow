// utils/response.js
export const sendSuccess = (res, data, message = "Success", statusCode = 200) =>
  res.status(statusCode).json({ success: true, message, data });

export const sendCreated = (res, data, message = "Created successfully") =>
  res.status(201).json({ success: true, message, data });