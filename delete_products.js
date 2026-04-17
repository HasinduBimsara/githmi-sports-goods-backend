require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const Product = require("./models/Product");

async function removeAllProducts() {
  try {
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected Successfully.");

    console.log("Removing all products from the database...");
    const result = await Product.deleteMany({});
    console.log(`Deleted ${result.deletedCount} products.`);

  } catch (error) {
    console.error("Deletion failed: ", error);
  } finally {
    mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

removeAllProducts();
