
// services/customer.service.js

import Customer from "../models/Customer.js";
import Barber from "../models/Barber.js";
import Service from "../models/Service.js";
import ApiError from "../utils/ApiError.js";
const normalizeEmail = (email) =>
  String(email || "").trim().toLowerCase();

const normalizePhone = (phone) =>
  String(phone || "").replace(/\D/g, "");


const validatePreferences = async ({
  preferredBarber,
  preferredService,
}) => {
  if (preferredBarber) {
    const barber = await Barber.findById(preferredBarber)
      .select("_id active");

    if (!barber) {
      throw new ApiError(404, "Preferred barber not found");
    }

    if (!barber.active) {
      throw new ApiError(
        409,
        "Preferred barber is inactive"
      );
    }
  }

  if (preferredService) {
    const service = await Service.findById(preferredService)
      .select("_id active");

    if (!service) {
      throw new ApiError(404, "Preferred service not found");
    }

    if (!service.active) {
      throw new ApiError(
        409,
        "Preferred service is inactive"
      );
    }
  }
};
/**
 * Find an existing customer by email and/or phone, or create one.
 *
 * Matching rules:
 * 1. If email exists, search by email.
 * 2. If phone exists, search by phone.
 * 3. If both exist and they point to DIFFERENT customers,
 *    reject the request instead of merging two people.
 *
 * This prevents accidental customer merging.
 */
export const findOrCreateCustomer = async ({
  name,
  email,
  phone,
  preferredBarber = null,
  preferredService = null,
  notes = "",
}) => {
 const normEmail = normalizeEmail(email);
const normPhone = normalizePhone(phone);

await validatePreferences({
  preferredBarber,
  preferredService,
});

if (!normEmail && !normPhone)  {
    throw new ApiError(
      400,
      "Customer email or phone is required"
    );
  }

  /* -------------------------------------------------------------- */
  /* Find matches independently                                      */
  /* -------------------------------------------------------------- */

  const [emailCustomer, phoneCustomer] =
    await Promise.all([
      normEmail
        ? Customer.findOne({ email: normEmail })
        : null,

      normPhone
        ? Customer.findOne({ phone: normPhone })
        : null,
    ]);

  /* -------------------------------------------------------------- */
  /* Detect conflicting identities                                   */
  /* -------------------------------------------------------------- */

  if (
    emailCustomer &&
    phoneCustomer &&
    String(emailCustomer._id) !== String(phoneCustomer._id)
  ) {
    throw new ApiError(
      409,
      "The provided email and phone belong to different customers"
    );
  }

  /* -------------------------------------------------------------- */
  /* Existing customer                                               */
  /* -------------------------------------------------------------- */

  let customer = emailCustomer || phoneCustomer;

  if (customer) {
    let changed = false;

    if (name && customer.name !== name) {
      customer.name = name;
      changed = true;
    }

    if (
      normEmail &&
      customer.email !== normEmail
    ) {
      /*
       * Normally this means the customer was found
       * by phone and is now providing an email.
       */
      customer.email = normEmail;
      changed = true;
    }

    if (
      normPhone &&
      customer.phone !== normPhone
    ) {
      /*
       * Normally this means the customer was found
       * by email and is now providing a phone.
       */
      customer.phone = normPhone;
      changed = true;
    }

    if (
      preferredBarber &&
      String(customer.preferredBarber || "") !==
        String(preferredBarber)
    ) {
      customer.preferredBarber = preferredBarber;
      changed = true;
    }

    if (
      preferredService &&
      String(customer.preferredService || "") !==
        String(preferredService)
    ) {
      customer.preferredService = preferredService;
      changed = true;
    }

    if (
      notes &&
      customer.notes !== notes
    ) {
      customer.notes = notes;
      changed = true;
    }

    if (changed) {
      try {
        await customer.save();
      } catch (error) {
        /*
         * A unique email/phone conflict can occur if another
         * request changed the same identity concurrently.
         */
        if (error?.code === 11000) {
          throw new ApiError(
            409,
            "Customer email or phone is already associated with another customer"
          );
        }

        throw error;
      }
    }

    return customer;
  }

  /* -------------------------------------------------------------- */
  /* Create new customer                                             */
  /* -------------------------------------------------------------- */

  try {
    return await Customer.create({
      name,
      email: normEmail,
      phone: normPhone,
      preferredBarber: preferredBarber || null,
      preferredService: preferredService || null,
      notes: notes || "",
    });
  } catch (error) {
    /*
     * Two simultaneous booking requests can both reach create().
     *
     * MongoDB unique indexes will allow one request to win.
     * The other request gets a duplicate-key error.
     */
    if (error?.code === 11000) {
      const [existingByEmail, existingByPhone] =
        await Promise.all([
          normEmail
            ? Customer.findOne({ email: normEmail })
            : null,

          normPhone
            ? Customer.findOne({ phone: normPhone })
            : null,
        ]);

      if (
        existingByEmail &&
        existingByPhone &&
        String(existingByEmail._id) !==
          String(existingByPhone._id)
      ) {
        throw new ApiError(
          409,
          "The provided email and phone belong to different customers"
        );
      }

      const existing =
        existingByEmail || existingByPhone;

      if (existing) {
        return existing;
      }

      throw new ApiError(
        409,
        "Customer already exists"
      );
    }

    throw error;
  }
};

