require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");

// We don't necessarily need the exact model if we just want to clear a collection,
// but requiring it or defining a basic schema works universally.
const Order = require("./models/Order");

async function removeAllOrders() {
  try {
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected Successfully.");

    console.log("Removing all orders from the database...");
    const result = await Order.deleteMany({});
    console.log(`Deleted ${result.deletedCount} orders.`);

  } catch (error) {
    console.error("Deletion failed: ", error);
  } finally {
    mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

removeAllOrders();
