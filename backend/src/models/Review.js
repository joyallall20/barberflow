
import mongoose from "mongoose";

const reviewSchema = new mongoose.Schema(
  {
    customer: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Customer",
      required: true,
      index: true,
    },

    barber: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Barber",
      required: true,
      index: true,
    },

    appointment: {
      type: mongoose.Schema.Types.ObjectId,
      ref: "Appointment",
      required: true,
    },

    rating: {
      type: Number,
      required: true,
      min: 1,
      max: 5,
      validate: {
        validator: Number.isInteger,
        message: "Rating must be a whole number from 1 to 5",
      },
    },

    comment: {
      type: String,
      trim: true,
      maxlength: 2000,
      default: "",
    },

    status: {
      type: String,
      enum: ["pending", "approved", "rejected"],
      default: "pending",
      index: true,
    },

    source: {
      type: String,
      enum: ["qr", "email", "website"],
      required: true,
      default: "website",
      index: true,
    },
  },
  {
    timestamps: true,
  }
);

/*
 * Efficient public review queries:
 * approved reviews for a specific barber.
 */
reviewSchema.index({
  barber: 1,
  status: 1,
  createdAt: -1,
});

/*
 * Efficient admin moderation queries.
 */
reviewSchema.index({
  status: 1,
  createdAt: -1,
});

/*
 * One appointment can produce at most one review.
 *
 * Enforced at the database level in addition
 * to the application-level eligibility check.
 */
reviewSchema.index(
  { appointment: 1 },
  { unique: true }
);

const Review = mongoose.model("Review", reviewSchema);

export default Review;