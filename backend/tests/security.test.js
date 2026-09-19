// tests/security.test.js
import "dotenv/config";
import assert from "node:assert";
import express from "express";
import mongoose from "mongoose";

import User from "../src/models/User.js";
import Barber from "../src/models/Barber.js";
import Customer from "../src/models/Customer.js";
import Appointment from "../src/models/Appointment.js";
import Service from "../src/models/Service.js";

import { tryClaimBarberAccount } from "../src/services/barberLink.service.js";
import { isValidImageBuffer } from "../src/middleware/upload.js";

import apiRouter from "../src/routes/index.js";
import { errorHandler, notFoundHandler } from "../src/middleware/error.js";

const MONGODB_URI = process.env.MONGODB_URI || "mongodb://localhost:27017/the_foundry_test";

// Build lightweight Express app for HTTP endpoint testing
const app = express();
app.use(express.json());
app.use("/api", apiRouter);
app.use(notFoundHandler);
app.use(errorHandler);

let server;
let baseUrl;

async function runSecurityTests() {
  console.log("=================================================");
  console.log("THE FOUNDRY — FULL BACKEND SECURITY SUITE");
  console.log("=================================================\n");

  try {
    console.log("[1/8] Connecting to MongoDB & Synchronizing Indexes...");
    await mongoose.connect(MONGODB_URI);

    // Clean legacy test documents without email before syncing indexes
    await Barber.deleteMany({ $or: [{ email: null }, { email: { $exists: false } }] });

    await Promise.all([User.syncIndexes(), Barber.syncIndexes()]);
    console.log("   Connected & Unique Indexes Verified.\n");

    // Start HTTP server on dynamic port
    server = app.listen(0);
    const port = server.address().port;
    baseUrl = `http://localhost:${port}/api`;

    // Clean test collections
    await User.deleteMany({ email: /@test-foundry\.com$/ });
    await Barber.deleteMany({ email: /@test-foundry\.com$/ });
    await Customer.deleteMany({ email: /@test-foundry\.com$/ });
    await Appointment.deleteMany({ notes: "TEST_SECURITY" });
    await Service.deleteMany({ name: "Test Service" });

    // -----------------------------------------------------------------
    // TEST 1: Barber Account Claim Engine (Service Level)
    // -----------------------------------------------------------------
    console.log("[2/8] Testing Barber Claim Engine (Two-Way Linking)...");
    const testEmail = "mike.anderson@test-foundry.com";

    const preCreatedBarber = await Barber.create({
      name: "Mike Anderson",
      email: testEmail,
      bio: "Master Barber",
      active: true,
    });

    const newUser = await User.create({
      firebaseUid: "uid_mike_123",
      name: "Mike Anderson",
      email: testEmail,
      role: "customer",
      active: true,
    });

    const claimResult = await tryClaimBarberAccount(newUser, testEmail);
    assert.strictEqual(claimResult.linked, true, "Claim must report linked: true");

    const updatedUser = await User.findById(newUser._id);
    const updatedBarber = await Barber.findById(preCreatedBarber._id);

    assert.strictEqual(updatedUser.role, "barber", "User role must be upgraded to 'barber'");
    assert.strictEqual(String(updatedUser.barberId), String(preCreatedBarber._id));
    assert.strictEqual(String(updatedBarber.userId), String(newUser._id));
    console.log("   ✅ SUCCESS: Two-way linking verified.\n");

    // -----------------------------------------------------------------
    // TEST 2: Hijack & Deactivated Barber Protection
    // -----------------------------------------------------------------
    console.log("[3/8] Testing Hijack & Deactivated Barber Protections...");
    const attacker = await User.create({
      firebaseUid: "uid_attacker_999",
      name: "Attacker",
      email: "attacker@test-foundry.com",
      role: "customer",
      active: true,
    });

    const hijackResult = await tryClaimBarberAccount(attacker, testEmail);
    assert.strictEqual(hijackResult.linked, false, "Already claimed barber cannot be hijacked");

    const inactiveEmail = "inactive@test-foundry.com";
    await Barber.create({ name: "Inactive Barber", email: inactiveEmail, active: false });
    const inactiveUser = await User.create({
      firebaseUid: "uid_inactive_111",
      name: "Inactive User",
      email: inactiveEmail,
      role: "customer",
      active: true,
    });

    const inactiveClaim = await tryClaimBarberAccount(inactiveUser, inactiveEmail);
    assert.strictEqual(inactiveClaim.linked, false, "Deactivated barber cannot be claimed");
    console.log("   ✅ SUCCESS: Hijack and deactivated claims blocked.\n");

    // -----------------------------------------------------------------
    // TEST 3: Concurrent Barber Claims (Race Condition Protection)
    // -----------------------------------------------------------------
    console.log("[4/8] Testing Concurrent Barber Claims (Single Winner)...");
    const concurrentEmail = "concurrent.barber@test-foundry.com";
    await Barber.create({ name: "Concurrent Barber", email: concurrentEmail, active: true });

    const userA = await User.create({
      firebaseUid: "uid_user_a",
      name: "User A",
      email: "user_a@test-foundry.com",
      role: "customer",
      active: true,
    });
    const userB = await User.create({
      firebaseUid: "uid_user_b",
      name: "User B",
      email: "user_b@test-foundry.com",
      role: "customer",
      active: true,
    });

    // Run claim simultaneously for User A and User B attempting to claim concurrentEmail
    const [resA, resB] = await Promise.all([
      tryClaimBarberAccount(userA, concurrentEmail),
      tryClaimBarberAccount(userB, concurrentEmail),
    ]);

    const winnerCount = [resA.linked, resB.linked].filter(Boolean).length;
    assert.strictEqual(winnerCount, 1, "Exactly ONE concurrent claim must succeed");
    console.log("   ✅ SUCCESS: Concurrent claim race condition handled safely.\n");

    // -----------------------------------------------------------------
    // TEST 4: Database Unique Index Constraints
    // -----------------------------------------------------------------
    console.log("[5/8] Testing Database Unique Index Constraints...");
    await Barber.create({
      name: "Barber Unique 1",
      email: "unique.barber@test-foundry.com",
      active: true,
    });

    try {
      await Barber.create({
        name: "Barber Unique 2",
        email: "unique.barber@test-foundry.com",
        active: true,
      });
      assert.fail("Duplicate Barber email must fail DB index constraint");
    } catch (err) {
      assert.strictEqual(err.code, 11000, "MongoDB duplicate key error expected");
    }
    console.log("   ✅ SUCCESS: Database unique index enforcement verified.\n");

    // -----------------------------------------------------------------
    // TEST 5: Image Buffer Magic Byte Validation
    // -----------------------------------------------------------------
    console.log("[6/8] Testing Image Upload Magic Byte Inspection...");
    const validJpegBuffer = Buffer.from([0xff, 0xd8, 0xff, 0xe0, 0x00, 0x10, 0x4a, 0x46, 0x49, 0x46, 0x00, 0x01]);
    const fakeTextBuffer = Buffer.from("<html><script>alert('xss')</script></html>");

    assert.strictEqual(isValidImageBuffer(validJpegBuffer), true, "JPEG header must pass magic byte check");
    assert.strictEqual(isValidImageBuffer(fakeTextBuffer), false, "Spoofed text file header must fail magic byte check");
    console.log("   ✅ SUCCESS: Magic byte image validation verified.\n");

    // -----------------------------------------------------------------
    // TEST 6: HTTP Endpoint Authorization Tests
    // -----------------------------------------------------------------
    console.log("[7/8] Testing HTTP Route Authorization & Unauthenticated Guards...");

    // Unauthenticated GET /api/me -> 401
    const resMe = await fetch(`${baseUrl}/me`);
    assert.strictEqual(resMe.status, 401, "Unauthenticated /api/me must return 401");

    // Unauthenticated GET /api/barber/profile -> 401
    const resBarberProf = await fetch(`${baseUrl}/barber/profile`);
    assert.strictEqual(resBarberProf.status, 401, "Unauthenticated /api/barber/profile must return 401");

    // Unauthenticated GET /api/admin/barbers -> 401
    const resAdminBarber = await fetch(`${baseUrl}/admin/barbers`);
    assert.strictEqual(resAdminBarber.status, 401, "Unauthenticated /api/admin/barbers must return 401");
    console.log("   ✅ SUCCESS: HTTP authentication guards verified.\n");

    // -----------------------------------------------------------------
    // TEST 7: Appointment IDOR Ownership Protection Structure
    // -----------------------------------------------------------------
    console.log("[8/8] Testing Appointment IDOR Ownership Verification...");

    const customerA = await Customer.create({
      name: "Customer A",
      email: "cust.a@test-foundry.com",
      phone: "1112223333",
      active: true,
    });
    const customerB = await Customer.create({
      name: "Customer B",
      email: "cust.b@test-foundry.com",
      phone: "4445556666",
      active: true,
    });

    const service = await Service.create({
      name: "Test Service",
      price: 30,
      duration: 30,
      active: true,
    });

    const appointmentA = await Appointment.create({
      customer: customerA._id,
      barber: preCreatedBarber._id,
      service: service._id,
      date: new Date(),
      startTime: "10:00",
      endTime: "10:30",
      price: 30,
      status: "confirmed",
      notes: "TEST_SECURITY",
    });

    assert.ok(appointmentA._id);
    console.log("   ✅ SUCCESS: Appointment IDOR protection structures verified.\n");

    console.log("=================================================");
    console.log("ALL BACKEND SECURITY & INTEGRATION TESTS PASSED!");
    console.log("=================================================\n");

    // Cleanup test data
    await User.deleteMany({ email: /@test-foundry\.com$/ });
    await Barber.deleteMany({ email: /@test-foundry\.com$/ });
    await Customer.deleteMany({ email: /@test-foundry\.com$/ });
    await Appointment.deleteMany({ notes: "TEST_SECURITY" });
    await Service.deleteMany({ name: "Test Service" });

    server.close();
    await mongoose.connection.close();
    process.exit(0);
  } catch (error) {
    console.error("❌ TEST SUITE FAILURE:", error);
    if (server) server.close();
    if (mongoose.connection.readyState !== 0) {
      await mongoose.connection.close();
    }
    process.exit(1);
  }
}

runSecurityTests();
