const express = require("express");
const app = express();
const dotenv = require("dotenv");
dotenv.config();
const cors = require("cors");
const PORT = process.env.PORT || 5000;
const UserRoutes = require("./Routes/UserRoutes");
const UserModel = require("./Models/UserModel");
const ReminderModel = require("./Models/ReminderModel");
const ReminderRoutes = require("./Routes/ReminderRoutes");
const connectDB = require("./Config/db");
const cookiePraser = require("cookie-parser");

app.use(cors());
app.use(cookiePraser());
app.use(express.json());
app.use("/api/user", UserRoutes);
app.use("/api/reminder", ReminderRoutes);
connectDB();

app.use(express.urlencoded({ extended: true }));

app.post("/api/user/delete", async (req, res) => {
  const { email } = req.body;

  try {
    // Find the user by email and delete them
    const deletedUser = await UserModel.findOneAndDelete({ email });

    if (deletedUser) {
      await ReminderModel.deleteMany({ email: email });
      res.json({
        status: "USER_DELETED_SUCCESSFULLY",
        message: "User deleted",
      });
    } else {
      res
        .status(404)
        .json({ status: "USER_NOT_FOUND", message: "User not found" });
    }
  } catch (error) {
    console.error("Error deleting user:", error);
    res.status(500).json({ status: "ERROR", message: "Failed to delete user" });
  }
});

app.listen(PORT, () => {
  console.log(`server is running on port http://localhost:${PORT}`);
});
