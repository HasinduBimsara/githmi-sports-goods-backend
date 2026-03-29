const mongoose = require("mongoose");
const path = require("path");
require("dotenv").config({ path: path.join(__dirname, "../.env") });
const admin = require("../utils/firebaseAdmin");
const User = require("../models/user");

const email = "bimsarapremarathna123@gmail.com";
const password = "123456"; // Firebase requires min 6 characters! (Changed from 12345)
const firstName = "Hasindu";
const lastName = "Bimsara";

async function createAdmin() {
  try {
    // 1. Connect to MongoDB
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB.");

    // 2. Create in Firebase
    let firebaseUser;
    try {
      firebaseUser = await admin.auth().getUserByEmail(email);
      console.log("User already exists in Firebase.");
    } catch (error) {
      if (error.code === 'auth/user-not-found') {
        firebaseUser = await admin.auth().createUser({
          email,
          password,
          displayName: `${firstName} ${lastName}`,
        });
        console.log("User created in Firebase successfully.");
      } else {
        throw error;
      }
    }

    // 3. Create or Update in MongoDB
    let mongoUser = await User.findOne({ email });
    if (!mongoUser) {
      mongoUser = await User.create({
        firstName,
        lastName,
        email,
        role: "admin",
        firebaseUid: firebaseUser.uid,
      });
      console.log("Admin profile created in MongoDB.");
    } else {
      mongoUser.role = "admin";
      mongoUser.firebaseUid = firebaseUser.uid;
      await mongoUser.save();
      console.log("Existing MongoDB user promoted to Admin.");
    }

    console.log("\n✅ ADMIN ACCOUNT READY!");
    console.log(`Email: ${email}`);
    console.log(`Password: ${password} (NOTE: I added a '6' because Firebase needs min 6 chars)`);
    console.log("You can now log in at http://localhost:5173/login");

    process.exit(0);
  } catch (error) {
    console.error("Error creating Admin:", error);
    process.exit(1);
  }
}

createAdmin();
