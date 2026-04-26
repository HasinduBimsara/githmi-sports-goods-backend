require("dotenv").config({ path: __dirname + "/.env" });
const mongoose = require("mongoose");
const Product = require("./models/Product");

const categories = [
  "Footwear", "Football", "Cricket", "Basketball", "Racket Sports", 
  "Gym & Fitness", "Swimming", "Apparel", "Indoor Games"
];

const mockDescriptions = [
  "Experience maximum comfort and performance with advanced technology.",
  "Designed for the professionals. Highly durable and optimized for competitive play.",
  "Premium materials engineered to give you the perfect balance and control.",
  "Stay ahead of the game with our new, cutting-edge sports design.",
  "Perfect for beginners and pros alike, providing exceptional stability.",
  "Dominate your workout with breathable fabrics and sweat-resistant builds."
];

async function seedDatabase() {
  try {
    console.log("Connecting to Database...");
    await mongoose.connect(process.env.MONGO_URI, {
      useNewUrlParser: true,
      useUnifiedTopology: true,
    });
    console.log("Connected Successfully.");

    console.log("Purging all existing products...");
    await Product.deleteMany({});
    console.log("Deleted all old products.");

    console.log("Generating 126 optimized products...");
    const productsToInsert = [];
    
    let globalCounter = 1;

    for (const category of categories) {
      for (let i = 1; i <= 14; i++) {
        const pId = `PROD-${category.substring(0,3).toUpperCase()}-${Math.floor(1000 + Math.random() * 9000)}-${i}`;
        
        // Pseudo-random booleans based on math
        const isDeal = Math.random() > 0.7; // ~30% chance to be best deal
        const isLat = Math.random() > 0.6;   // ~40% chance it's latest
        const isShip = Math.random() > 0.4;  // ~60% chance it's ready to ship

        const basePrice = Math.floor(Math.random() * 10000) + 1500;
        const labeledPrice = isDeal ? basePrice + Math.floor(Math.random() * 3000) : basePrice;

        const description = mockDescriptions[Math.floor(Math.random() * mockDescriptions.length)];

        productsToInsert.push({
          productId: pId,
          name: `Premium ${category} Model X${i}`,
          price: basePrice,
          labeledPrice: labeledPrice,
          description: description,
          stock: isShip ? Math.floor(Math.random() * 50) + 5 : 0,
          category: category,
          images: [
            `https://picsum.photos/seed/${pId}/400/400`,
            `https://picsum.photos/seed/${pId}alt/400/400`
          ],
          isActive: true,
          isBestDeal: isDeal,
          isLatest: isLat,
          isReadyToShip: isShip
        });
        
        globalCounter++;
      }
    }

    await Product.insertMany(productsToInsert);
    console.log(`Successfully seeded ${productsToInsert.length} products.`);

  } catch (error) {
    console.error("Seeding failed: ", error);
  } finally {
    mongoose.connection.close();
    console.log("Database connection closed.");
  }
}

seedDatabase();
