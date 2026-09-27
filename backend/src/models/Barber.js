
import mongoose from "mongoose";

const { Schema } = mongoose;

/* --------------------------------------------------------------
   Working hour sub-schema – existing behavior preserved
-------------------------------------------------------------- */
const workingHourSchema = new Schema(
  {
    day: {
      type: Number,
      required: true,
      min: 0,
      max: 6,
    },

    isWorking: {
      type: Boolean,
      default: true,
    },

    startTime: {
      type: String,
      default: "09:00",
    },

    endTime: {
      type: String,
      default: "18:00",
    },
  },
  {
    _id: false,
  }
);

/* --------------------------------------------------------------
   Review destination URL validation
-------------------------------------------------------------- */
const validateReviewUrl = (value) => {
  if (!value) return true;

  try {
    const parsed = new URL(value);

    return (
      (parsed.protocol === "https:" ||
        parsed.protocol === "http:") &&
      Boolean(parsed.hostname)
    );
  } catch {
    return false;
  }
};

/* --------------------------------------------------------------
   Review destination sub-schema
-------------------------------------------------------------- */
const reviewLinksSchema = new Schema(
  {
    google: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: "",
      validate: {
        validator: validateReviewUrl,
        message: "Google review link must be a valid HTTP or HTTPS URL",
      },
    },

    facebook: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: "",
      validate: {
        validator: validateReviewUrl,
        message: "Facebook review link must be a valid HTTP or HTTPS URL",
      },
    },

    website: {
      type: String,
      trim: true,
      maxlength: 2048,
      default: "",
      validate: {
        validator: validateReviewUrl,
        message: "Website review link must be a valid HTTP or HTTPS URL",
      },
    },
  },
  {
    _id: false,
  }
);

/* --------------------------------------------------------------
   Main Barber schema
-------------------------------------------------------------- */
const barberSchema = new Schema(
  {
    /* Basic identity */
    name: {
      type: String,
      required: true,
      trim: true,
      maxlength: 100,
    },

    /* Email – required for linking and unique */
    email: {
      type: String,
      required: true,
      unique: true,
      trim: true,
      lowercase: true,
      maxlength: 254,
      match: [
        /^[^\s@]+@[^\s@]+\.[^\s@]{2,}$/,
        "Please provide a valid email address",
      ],
    },

    /* Cloudinary photo representation */
    photo: {
      url: {
        type: String,
        trim: true,
        maxlength: 1024,
        default: null,
      },

      publicId: {
        type: String,
        trim: true,
        maxlength: 256,
        default: null,
      },
    },

    /* Business profile */
    bio: {
      type: String,
      default: "",
      trim: true,
      maxlength: 500,
    },

    specialties: {
      type: [String],
      default: [],
      validate: {
        validator: (arr) =>
          arr.every(
            (s) => typeof s === "string" && s.length <= 50
          ),
        message:
          "Each specialty must be a string of at most 50 characters",
      },
    },

    /* Existing working hours */
    workingHours: {
      type: [workingHourSchema],
      default: [
        { day: 0, isWorking: false },
        {
          day: 1,
          isWorking: true,
          startTime: "09:00",
          endTime: "18:00",
        },
        {
          day: 2,
          isWorking: true,
          startTime: "09:00",
          endTime: "18:00",
        },
        {
          day: 3,
          isWorking: true,
          startTime: "09:00",
          endTime: "18:00",
        },
        {
          day: 4,
          isWorking: true,
          startTime: "09:00",
          endTime: "18:00",
        },
        {
          day: 5,
          isWorking: true,
          startTime: "09:00",
          endTime: "18:00",
        },
        { day: 6, isWorking: false },
      ],
    },

    /* ----------------------------------------------------------
       External review destinations

       These URLs can change without changing the barber's
       permanent QR identity.
    ---------------------------------------------------------- */
    reviewLinks: {
      type: reviewLinksSchema,
      default: () => ({}),
    },

    /* One-to-one optional link to a User */
    userId: {
      type: Schema.Types.ObjectId,
      ref: "User",
      unique: true,
      sparse: true,
    },

    /* Active flag */
    active: {
      type: Boolean,
      default: true,
    },
  },
  {
    timestamps: true,
  }
);

const Barber = mongoose.model("Barber", barberSchema);

export default Barber;