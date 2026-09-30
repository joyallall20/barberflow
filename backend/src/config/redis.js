import IORedis from "ioredis";

const redisUrl = process.env.REDIS_URL;

if (!redisUrl) {
  throw new Error(
    "REDIS_URL is not configured. Add your Upstash Redis connection URL to the backend .env file."
  );
}

const redisConnection = new IORedis(redisUrl, {
  maxRetriesPerRequest: null,
  enableReadyCheck: true,
  tls: redisUrl.startsWith("rediss://")
    ? {}
    : undefined,
});

redisConnection.on("connect", () => {
  console.log("Redis connection established.");
});

redisConnection.on("ready", () => {
  console.log("Redis is ready for BullMQ.");
});

redisConnection.on("error", (error) => {
  console.error("Redis connection error:", error.message);
});

redisConnection.on("close", () => {
  console.warn("Redis connection closed.");
});

export default redisConnection;