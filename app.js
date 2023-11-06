const express = require("express");
const app = express();
const mongoCnx = require("./Database/connnection");
const bodyParser = require("body-parser");
const path = require("path");
const cookieParser = require("cookie-parser");

const homeRouter = require("./routers/client/home");
const registerRouter = require("./routers/auth/register");
const registerAdminRouter = require("./routers/auth/registerAdmin");
const resetPasswordRouter = require("./routers/auth/resetpass");
const loginRouter = require("./routers/auth/login");
const loginAdminRouter = require("./routers/auth/loginAdmin");
const admindashboardRouter = require("./routers/admin/dashboard");
const dashboardRouter = require("./routers/client/dashboard");

app.use(express.static("uploads")); // Serve files from the 'uploads' folder
app.use(express.static(path.join(__dirname, "public")));
app.set("view engine", "ejs");
app.use(bodyParser.urlencoded({ extended: false }));
app.use(bodyParser.json());
app.use(cookieParser());

app.use(
  homeRouter,
  registerRouter,
  registerAdminRouter,
  resetPasswordRouter,
  loginRouter,
  loginAdminRouter,
  admindashboardRouter,
  dashboardRouter
);

const port = 3000;
app.listen(port, () => {
  console.log(`app running on port ${port}`);
});
