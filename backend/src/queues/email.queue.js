
import { Queue } from "bullmq";
import redisConnection from "../config/redis.js";

const emailQueue = new Queue("foundry-email", {
  connection: redisConnection,

  defaultJobOptions: {
    attempts: 5,

    backoff: {
      type: "exponential",
      delay: 5000,
    },

    removeOnComplete: {
      age: 7 * 24 * 60 * 60,
      count: 10000,
    },

    // Keep failed jobs for investigation and manual retry.
    removeOnFail: false,
  },
});

/**
 * Add an email job.
 *
 * delay is in milliseconds.
 */
export const enqueueEmail = async (
  { type, appointmentId },
  { delay = 0, jobId } = {}
) => {
  if (!type || !appointmentId) {
    throw new Error(
      "Email job requires a type and appointmentId."
    );
  }

  if (!jobId) {
    throw new Error(
      "A deterministic jobId is required to prevent duplicates."
    );
  }

  const job = await emailQueue.add(
    type,
    {
      type,
      appointmentId: String(appointmentId),
    },
    {
      jobId,
      delay: Math.max(0, Number(delay) || 0),
    }
  );

  console.log(
    `Email job queued: ${job.id} (${job.name}) delay=${job.opts.delay || 0}ms`
  );

  return job;
};

export const cancelEmailJob = async (jobId) => {
  const job = await emailQueue.getJob(jobId);

  if (!job) {
    return false;
  }

  // Only waiting or delayed jobs can be safely removed.
  const state = await job.getState();

  if (state === "waiting" || state === "delayed") {
    await job.remove();
    return true;
  }

  return false;
};

export const getEmailQueue = () => emailQueue;

export default emailQueue;
