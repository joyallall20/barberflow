import cron from "node-cron";

const KEEP_ALIVE_URL =
  process.env.KEEP_ALIVE_URL ||
  process.env.RENDER_EXTERNAL_URL;

const keepAlive = async () => {
  if (!KEEP_ALIVE_URL) {
    console.warn(
      "KEEP_ALIVE_URL / RENDER_EXTERNAL_URL is not configured."
    );
    return;
  }

  try {
    const response = await fetch(`${KEEP_ALIVE_URL}/api/health`);

    if (!response.ok) {
      console.warn(
        `Keep-alive request failed: ${response.status}`
      );
      return;
    }

    console.log(
      `Keep-alive successful: ${new Date().toISOString()}`
    );
  } catch (error) {
    console.error(
      "Keep-alive request failed:",
      error.message
    );
  }
};

// Every 10 minutes
cron.schedule("*/10 * * * *", keepAlive);

console.log("Keep-alive cron job started.");