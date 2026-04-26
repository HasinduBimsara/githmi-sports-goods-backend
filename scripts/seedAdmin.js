require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/user");
const bcrypt = require("bcryptjs");

const seedAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB for seeding...");

    const email = "admin@githmi.com";
    const plainPassword = "password123";
    const hashedPassword = await bcrypt.hash(plainPassword, 12);

    const admin = await User.findOneAndUpdate(
      { email },
      {
        firstName: "Super",
        lastName: "Admin",
        phone: "0000000000",
        password: hashedPassword,
        role: "admin",
      },
      { upsert: true, new: true }
    );

    console.log(`Admin account created successfully!`);
    console.log(`Email: ${email}`);
    console.log(`Password: ${plainPassword}`);
    process.exit(0);
  } catch (err) {
    console.error("Error creating admin:", err);
    process.exit(1);
  }
};

seedAdmin();
