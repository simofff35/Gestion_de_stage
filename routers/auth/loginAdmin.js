const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
const bcrypt = require("bcrypt");
const adminSchema = require("../../Database/adminSchema.js");

router.get("/admin/login", (req, res) => {
  res.render("auth/loginAdmin", { title: "Authentication", pop: null });
});

router.post("/admin/login", async (req, res) => {
  const { username, password, remember } = req.body;

  const user = await adminSchema
    .findOne({ username: username })
    .then((result) => {
      if (!result) {
        res.render("auth/loginAdmin", {
          title: "Authentication",
          pop: "Le nom d'utilisateur est incorrect",
        });
      } else {
        const matchedPassword = bcrypt.compareSync(password, result.password);
        if (matchedPassword) {
          const expire = remember ? 60 * 60 * 24 : 60 * 60;
          const token = jwt.sign({ _id: result._id }, process.env.SECRET_CODE, {
            expiresIn: expire,
          });
          res.cookie("token", token, { httpOnly: true });
          res.status(200).redirect("/admin/dashboard");
        } else {
          res.render("auth/loginAdmin", {
            title: "Authentication",
            pop: "Le mot de passe est incorrect",
          });
        }
      }
    });
});

module.exports = router;
