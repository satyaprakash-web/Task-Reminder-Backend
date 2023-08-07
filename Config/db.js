const mongoose = require("mongoose");

const connectDB = async () => {
  try {
    const conn = await mongoose.connect(process.env.MONGO_URL, {
      useNewUrlParser: true, //used to parse the connection string correctly
      useUnifiedTopology: true, //enables the new unified topology engine for handling MongoDB's underlying driver monitoring and server discovery engine
    });

    console.log(`MongoDB Connected Successfully`);
  } catch (error) {
    console.log(`Some Error Occurs : ${error.message}`);
  }
};

module.exports = connectDB;
