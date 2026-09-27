import mongoose from "mongoose";
import crypto from "crypto";

const { Schema } = mongoose;

/* --------------------------------------------------------------
   Generate a permanent public QR identifier
-------------------------------------------------------------- */
const generatePublicId = () => {
  return crypto.randomBytes(32).toString("hex");
};

/* --------------------------------------------------------------
   Review QR schema
-------------------------------------------------------------- */
const reviewQRSchema = new Schema(
  {
    /* One permanent QR record per barber */
  barber: {
  type: Schema.Types.ObjectId,
  ref: "Barber",
  required: true,
  unique: true,
},

    /*
     * Permanent public identifier embedded in the QR URL.
     *
     * This is not an authentication token.
     * It only resolves the QR to safe public barber information.
     *
     * Do not regenerate this when review destination URLs change.
     *
     * NOTE: Temporarily optional + sparse so legacy documents that
     * predate this field do not break unique index creation.
     * Tighten to required: true once the migration is complete.
     */
    publicId: {
      type: String,
      required: false,
      unique: true,
      sparse: true,
      immutable: true,
      default: generatePublicId,
      match: [
        /^[a-f0-9]{64}$/,
        "Invalid permanent QR identifier",
      ],
    },

    /*
     * Legacy SHA-256 hash retained to keep previously printed QR
     * codes working during the migration window.
     *
     * select: false so it is never returned by default queries.
     * Remove this field and its DB index after migration is
     * verified and all legacy QRs are retired or re-issued.
     */
    tokenHash: {
      type: String,
      required: false,
      select: false,
    },

    /* QR availability */
    active: {
      type: Boolean,
      default: true,
      index: true,
    },

    /*
     * Initial QR creation timestamp is maintained by createdAt.
     * This field tracks the most recent administrative regeneration
     * only if regeneration is explicitly implemented.
     */
    regeneratedAt: {
      type: Date,
      default: null,
    },
  },
  {
    timestamps: true,
  }
);

/* --------------------------------------------------------------
   Query indexes
-------------------------------------------------------------- */
reviewQRSchema.index({
  barber: 1,
  active: 1,
});

/* --------------------------------------------------------------
   Model
-------------------------------------------------------------- */
const ReviewQR = mongoose.model("ReviewQR", reviewQRSchema);

export default ReviewQR;