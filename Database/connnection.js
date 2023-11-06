const mongoose = require("mongoose");
require("dotenv").config();
module.exports = mongoose
  .connect(String(process.env.MONGO))
  .then(() => {
    console.log("Connected the the DB");
  })
  .catch((err) => {
    console.log(`err :\n ${err}`);
  });
