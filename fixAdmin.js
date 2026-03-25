require("dotenv").config();
const mongoose = require("mongoose");
const User = require("./models/user");
const bcrypt = require("bcryptjs");

const fixAdmin = async () => {
  try {
    await mongoose.connect(process.env.MONGO_URI);
    console.log("Connected to MongoDB");

    const email = "bimsarapremarathna123@gmail.com";
    const password = "12345";
    const hashedPassword = await bcrypt.hash(password, 12);

    const admin = await User.findOneAndUpdate(
      { email },
      {
        $setOnInsert: {
          firstName: "Hasindu",
          lastName: "Bimsara",
          phone: "0000000000",
        },
        $set: {
          password: hashedPassword,
          role: "admin",
        }
      },
      { upsert: true, new: true }
    );

    console.log(`\n✅ SUCCESS!`);
    console.log(`Email: ${admin.email}`);
    console.log(`Role: ${admin.role}`);
    console.log(`You can now log in with password: 12345`);
    process.exit(0);
  } catch (err) {
    console.error("Error creating admin:", err);
    process.exit(1);
  }
};

fixAdmin();
