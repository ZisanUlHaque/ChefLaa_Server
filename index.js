// server.js
require("dotenv").config();
const express = require("express");
const cors = require("cors");
const multer = require("multer");
const bcrypt = require("bcryptjs");
const jwt = require("jsonwebtoken");
const { MongoClient, ServerApiVersion, ObjectId } = require("mongodb");

const app = express();
const port = process.env.PORT || 5000;

app.use(cors());
app.use(express.json());
const upload = multer({ storage: multer.memoryStorage() });

// MongoDB
const uri = `mongodb+srv://${process.env.DB_USER}:${process.env.DB_PASS}@cluster0.ifwcykr.mongodb.net/?retryWrites=true&w=majority`;
const client = new MongoClient(uri, {
  serverApi: { version: ServerApiVersion.v1, strict: true, deprecationErrors: true }
});

const JWT_SECRET = process.env.JWT_SECRET || "smartchef_secret_key_2024";

// ================== FOOD DATABASE ==================
const FOOD_DB = {
  vegetables: ["tomato", "onion", "potato", "carrot", "pepper", "garlic", "ginger", "cabbage", "spinach", "broccoli", "mushroom", "cucumber", "eggplant", "zucchini", "celery", "kale", "lettuce", "corn", "peas", "beans", "asparagus"],
  proteins: ["chicken", "beef", "mutton", "fish", "egg", "shrimp", "prawn", "crab", "salmon", "tuna", "tofu", "paneer", "sausage", "bacon", "duck", "turkey", "lamb", "pork", "lobster"],
  dairy: ["milk", "cheese", "butter", "cream", "yogurt"],
  fruits: ["banana", "apple", "orange", "lemon", "mango", "avocado", "coconut", "strawberry", "blueberry", "grape", "watermelon", "pineapple", "peach"],
  grains: ["rice", "bread", "flour", "noodles", "pasta", "oats"],
  spices: ["salt", "sugar", "chili", "cilantro", "basil", "mint", "thyme", "oregano", "paprika", "cumin", "turmeric", "cinnamon"],
  others: ["oil", "honey", "soy sauce", "vinegar", "chocolate", "vanilla"]
};

const CUISINES = ["Asian", "Indian", "Italian", "Mexican", "Thai", "Chinese", "Japanese", "Mediterranean", "American", "French"];
const DIFFICULTIES = ["Easy", "Medium", "Hard"];
const STYLES = ["Spicy", "Grilled", "Crispy", "Creamy", "Garlic", "Honey", "Tangy", "Smoky", "Zesty", "Buttery"];
const TYPES = ["Stir-Fry", "Curry", "Bowl", "Salad", "Roast", "Soup", "Pasta", "Rice", "Noodles", "Wrap"];

// ================== HELPER FUNCTIONS ==================
const pick = (arr) => arr[Math.floor(Math.random() * arr.length)];
const pickMultiple = (arr, count) => {
  const shuffled = [...arr].sort(() => 0.5 - Math.random());
  return shuffled.slice(0, count);
};

// Generate random ingredients from image (simulating AI detection)
function generateRandomIngredients() {
  const allIngredients = Object.values(FOOD_DB).flat();
  const count = 4 + Math.floor(Math.random() * 5); 
  return pickMultiple(allIngredients, count);
}

// Generate a random recipe
function generateRandomRecipe(ingredients, index = 0) {
  const main = pick(ingredients);
  const style = pick(STYLES);
  const type = pick(TYPES);
  const cuisine = pick(CUISINES);
  const difficulty = pick(DIFFICULTIES);
  
  const cookTime = 15 + Math.floor(Math.random() * 45);
  const servings = 2 + Math.floor(Math.random() * 4);
  const kcal = 250 + Math.floor(Math.random() * 400);
  
  const title = `${style} ${main.charAt(0).toUpperCase() + main.slice(1)} ${type}`;
  
  const steps = [
    `Prepare all ingredients: wash and chop ${ingredients.slice(0, 3).join(", ")}.`,
    `Heat ${pick(["oil", "butter"])} in a ${pick(["pan", "wok", "pot"])} over ${pick(["medium", "high", "medium-high"])} heat.`,
    `Add ${ingredients[0]} and cook for ${2 + Math.floor(Math.random() * 4)} minutes until ${pick(["golden", "tender", "fragrant"])}.`,
    `Add ${ingredients.slice(1, 3).join(" and ")} and stir well.`,
    `Season with ${pick(["salt", "pepper", "spices"])} to taste.`,
    `Cook for another ${5 + Math.floor(Math.random() * 10)} minutes.`,
    `Garnish with ${pick(["fresh herbs", "green onions", "sesame seeds"])} and serve ${pick(["hot", "warm"])}.`
  ];
  
  const tips = [
    `Best served with ${pick(["rice", "bread", "naan", "salad"])}.`,
    `You can substitute ${pick(ingredients)} with ${pick(Object.values(FOOD_DB).flat())}.`,
    `For extra flavor, add a squeeze of ${pick(["lemon", "lime"])} before serving.`
  ];

  return {
    slug: `recipe-${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
    title,
    short: `A delicious ${cuisine.toLowerCase()} ${type.toLowerCase()} featuring ${ingredients.slice(0, 3).join(", ")}`,
    time: `${cookTime}m`,
    servings,
    difficulty,
    cuisine,
    kcal,
    protein: 15 + Math.floor(Math.random() * 30),
    carbs: 20 + Math.floor(Math.random() * 40),
    fats: 10 + Math.floor(Math.random() * 25),
    ingredients,
    steps,
    tips,
    image: `https://source.unsplash.com/800x600/?${encodeURIComponent(main + " food")}`,
    aiGenerated: false,
    createdAt: new Date()
  };
}

// ================== AUTH MIDDLEWARE ==================
const verifyToken = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (!authHeader || !authHeader.startsWith("Bearer ")) {
    return res.status(401).json({ error: "No token provided" });
  }
  
  const token = authHeader.split(" ")[1];
  try {
    const decoded = jwt.verify(token, JWT_SECRET);
    req.user = decoded;
    next();
  } catch (err) {
    return res.status(403).json({ error: "Invalid or expired token" });
  }
};

// Optional auth - doesn't fail if no token
const optionalAuth = (req, res, next) => {
  const authHeader = req.headers.authorization;
  if (authHeader && authHeader.startsWith("Bearer ")) {
    const token = authHeader.split(" ")[1];
    try {
      const decoded = jwt.verify(token, JWT_SECRET);
      req.user = decoded;
    } catch (err) {
      // Token invalid, but we continue anyway
    }
  }
  next();
};

// ================== MAIN ==================
async function start() {
  try {
    await client.connect();
    console.log("✅ MongoDB Connected");

    const db = client.db("chefLaa");
    const users = db.collection("users");
    const scans = db.collection("scans");
    const recipesCol = db.collection("recipes");
    const savedRecipes = db.collection("savedRecipes");

    // Create indexes
    await users.createIndex({ email: 1 }, { unique: true });
    await recipesCol.createIndex({ slug: 1 }, { unique: true });

    // ================== AUTH ROUTES ==================
    
    // Sign Up
    app.post("/api/auth/signup", async (req, res) => {
      try {
        const { name, email, password } = req.body;

        if (!name || !email || !password) {
          return res.status(400).json({ error: "All fields are required" });
        }

        if (password.length < 6) {
          return res.status(400).json({ error: "Password must be at least 6 characters" });
        }

        // Check if user exists
        const existingUser = await users.findOne({ email: email.toLowerCase() });
        if (existingUser) {
          return res.status(400).json({ error: "Email already registered" });
        }

        // Hash password
        const hashedPassword = await bcrypt.hash(password, 10);

        // Create user
        const newUser = {
          name,
          email: email.toLowerCase(),
          password: hashedPassword,
          avatar: `https://ui-avatars.com/api/?name=${encodeURIComponent(name)}&background=random`,
          createdAt: new Date(),
          preferences: {
            diet: "none",
            allergies: []
          }
        };

        const result = await users.insertOne(newUser);

        // Generate token
        const token = jwt.sign(
          { userId: result.insertedId, email: newUser.email, name: newUser.name },
          JWT_SECRET,
          { expiresIn: "7d" }
        );

        res.status(201).json({
          success: true,
          message: "Account created successfully",
          token,
          user: {
            id: result.insertedId,
            name: newUser.name,
            email: newUser.email,
            avatar: newUser.avatar
          }
        });
      } catch (err) {
        console.error("Signup error:", err);
        res.status(500).json({ error: "Failed to create account" });
      }
    });

    // Login
    app.post("/api/auth/login", async (req, res) => {
      try {
        const { email, password } = req.body;

        if (!email || !password) {
          return res.status(400).json({ error: "Email and password are required" });
        }

        // Find user
        const user = await users.findOne({ email: email.toLowerCase() });
        if (!user) {
          return res.status(401).json({ error: "Invalid email or password" });
        }

        // Check password
        const validPassword = await bcrypt.compare(password, user.password);
        if (!validPassword) {
          return res.status(401).json({ error: "Invalid email or password" });
        }

        // Generate token
        const token = jwt.sign(
          { userId: user._id, email: user.email, name: user.name },
          JWT_SECRET,
          { expiresIn: "7d" }
        );

        res.json({
          success: true,
          message: "Login successful",
          token,
          user: {
            id: user._id,
            name: user.name,
            email: user.email,
            avatar: user.avatar
          }
        });
      } catch (err) {
        console.error("Login error:", err);
        res.status(500).json({ error: "Login failed" });
      }
    });

    // Get current user
    app.get("/api/auth/me", verifyToken, async (req, res) => {
      try {
        const user = await users.findOne(
          { _id: new ObjectId(req.user.userId) },
          { projection: { password: 0 } }
        );
        
        if (!user) {
          return res.status(404).json({ error: "User not found" });
        }

        res.json({ user });
      } catch (err) {
        console.error("Get user error:", err);
        res.status(500).json({ error: "Failed to get user" });
      }
    });

    // Update user preferences
    app.patch("/api/auth/preferences", verifyToken, async (req, res) => {
      try {
        const { diet, allergies } = req.body;
        
        await users.updateOne(
          { _id: new ObjectId(req.user.userId) },
          { $set: { preferences: { diet, allergies } } }
        );

        res.json({ success: true, message: "Preferences updated" });
      } catch (err) {
        console.error("Update preferences error:", err);
        res.status(500).json({ error: "Failed to update preferences" });
      }
    });

    // ================== SCAN ROUTES ==================

    app.get("/", (_, res) => res.json({ status: "🍳 SmartChef v4.0 Running", time: new Date().toISOString() }));

    // Scan image (with random data for now)
    app.post("/api/scan", optionalAuth, upload.single("image"), async (req, res) => {
      const startTime = Date.now();
      try {
        if (!req.file) {
          return res.status(400).json({ error: "No image uploaded" });
        }

        console.log(`\n${"=".repeat(50)}`);
        console.log(`📸 Scanning: ${req.file.originalname} (${(req.file.size / 1024).toFixed(1)}KB)`);

        // Generate random ingredients (simulating AI detection)
        const ingredients = generateRandomIngredients();
        console.log("🥗 Detected ingredients:", ingredients.join(", "));

        // Generate 2-3 random recipes
        const recipeCount = 2 + Math.floor(Math.random() * 2);
        const recipes = [];
        
        for (let i = 0; i < recipeCount; i++) {
          const recipe = generateRandomRecipe(ingredients, i);
          recipes.push(recipe);
          
          // Save to database
          await recipesCol.updateOne(
            { slug: recipe.slug },
            { $set: recipe },
            { upsert: true }
          );
        }

        // Save scan history
        const scanRecord = {
          ingredients,
          recipeCount: recipes.length,
          userId: req.user?.userId || null,
          fileName: req.file.originalname,
          fileSize: req.file.size,
          createdAt: new Date()
        };
        await scans.insertOne(scanRecord);

        const processingTime = Date.now() - startTime;
        console.log(`✅ Generated ${recipes.length} recipes in ${processingTime}ms\n`);

        res.json({
          success: true,
          ingredients,
          recipes,
          processingTime: `${processingTime}ms`
        });
      } catch (err) {
        console.error("❌ Scan error:", err);
        res.status(500).json({ error: err.message || "Scan failed" });
      }
    });

    // Get recipe by slug
    app.get("/api/recipes/:slug", async (req, res) => {
      try {
        const recipe = await recipesCol.findOne({ slug: req.params.slug });
        
        if (!recipe) {
          return res.status(404).json({ error: "Recipe not found" });
        }

        res.json(recipe);
      } catch (err) {
        console.error("Get recipe error:", err);
        res.status(500).json({ error: "Failed to fetch recipe" });
      }
    });

    // Get all recipes (with pagination)
    app.get("/api/recipes", async (req, res) => {
      try {
        const page = parseInt(req.query.page) || 1;
        const limit = parseInt(req.query.limit) || 10;
        const skip = (page - 1) * limit;

        const [recipes, total] = await Promise.all([
          recipesCol.find().sort({ createdAt: -1 }).skip(skip).limit(limit).toArray(),
          recipesCol.countDocuments()
        ]);

        res.json({
          recipes,
          pagination: {
            page,
            limit,
            total,
            pages: Math.ceil(total / limit)
          }
        });
      } catch (err) {
        console.error("Get recipes error:", err);
        res.status(500).json({ error: "Failed to fetch recipes" });
      }
    });

    // ================== SAVED RECIPES ==================

    // Save a recipe
    app.post("/api/saved-recipes", verifyToken, async (req, res) => {
      try {
        const { recipeSlug } = req.body;

        const existing = await savedRecipes.findOne({
          userId: new ObjectId(req.user.userId),
          recipeSlug
        });

        if (existing) {
          return res.status(400).json({ error: "Recipe already saved" });
        }

        await savedRecipes.insertOne({
          userId: new ObjectId(req.user.userId),
          recipeSlug,
          savedAt: new Date()
        });

        res.json({ success: true, message: "Recipe saved" });
      } catch (err) {
        console.error("Save recipe error:", err);
        res.status(500).json({ error: "Failed to save recipe" });
      }
    });

    // Get user's saved recipes
    app.get("/api/saved-recipes", verifyToken, async (req, res) => {
      try {
        const saved = await savedRecipes
          .find({ userId: new ObjectId(req.user.userId) })
          .sort({ savedAt: -1 })
          .toArray();

        const slugs = saved.map(s => s.recipeSlug);
        const recipes = await recipesCol.find({ slug: { $in: slugs } }).toArray();

        res.json({ savedRecipes: recipes });
      } catch (err) {
        console.error("Get saved recipes error:", err);
        res.status(500).json({ error: "Failed to fetch saved recipes" });
      }
    });

    // Remove saved recipe
    app.delete("/api/saved-recipes/:slug", verifyToken, async (req, res) => {
      try {
        await savedRecipes.deleteOne({
          userId: new ObjectId(req.user.userId),
          recipeSlug: req.params.slug
        });

        res.json({ success: true, message: "Recipe removed from saved" });
      } catch (err) {
        console.error("Remove saved recipe error:", err);
        res.status(500).json({ error: "Failed to remove recipe" });
      }
    });

    // ================== USER SCAN HISTORY ==================

    app.get("/api/scan-history", verifyToken, async (req, res) => {
      try {
        const history = await scans
          .find({ userId: req.user.userId })
          .sort({ createdAt: -1 })
          .limit(20)
          .toArray();

        res.json({ history });
      } catch (err) {
        console.error("Get scan history error:", err);
        res.status(500).json({ error: "Failed to fetch scan history" });
      }
    });

    // ================== START SERVER ==================

    app.listen(port, () => {
      console.log(`
╔══════════════════════════════════════════════════╗
║  🍳 SmartChef v4.0 - Random Mode                 ║
║  📍 http://localhost:${port}                        ║
║  🔐 Auth: JWT | 📦 DB: MongoDB                   ║
║  🎲 Mode: Random Data (AI coming soon)           ║
╚══════════════════════════════════════════════════╝`);
    });
  } catch (err) {
    console.error("❌ Failed to start server:", err);
    process.exit(1);
  }
}

start();