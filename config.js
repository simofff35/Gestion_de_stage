require("dotenv").config();

module.exports = {
  sessionCode: process.env.SESSION_SECRET,
  mongo: process.env.DB_URI,
};
