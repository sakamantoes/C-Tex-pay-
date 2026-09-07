import app from "./app.js";
import sequelize from "./config/database.js";
import envConfig from "./config/constant.js";

const PORT = envConfig.PORT || 5000;

const startServer = async () => {
  try {
    await sequelize.authenticate();

    console.log("MySQL connected successfully");

    await sequelize.sync();

    console.log("Database synchronized");

    app.listen(PORT, () => {
      console.log(`Server running on http://localhost:${PORT}`);
    });
  } catch (error) {
    console.error("Unable to start server:", error);
  }
};

startServer();