const express = require("express");
const router = express.Router();
const stagerSchema = require("../../Database/schema");
const bcrypt = require("bcrypt");
const jwt = require("jsonwebtoken");
const authToken = require("../../middleware/jwt");

router.get("/login", (req, res) => {
  res.clearCookie("token");
  res.status(200).render("auth/login", { title: "Authentication", pop: null });
});

router.post("/login", async (req, res) => {
  try {
    const { email, password, remember } = req.body;
    const user = await stagerSchema.findOne({ email });
    if (!user) {
      res.status(404).send("user not found");
    } else {
      const passwordMatch = await bcrypt.compare(password, user.password);
      if (!passwordMatch) {
        res.render("auth/login", {
          title: "Authentication",
          pop: "Le mot de passe est incorrect",
        });
      } else {
        const expire = remember ? 60 * 60 * 24 : 60 * 60;
        const token = jwt.sign({ _id: user._id }, process.env.SECRET_CODE, {
          expiresIn: expire,
        });
        res.cookie("token", token, { httpOnly: true });
        res.status(200).redirect("/dashboard");
      }
    }
  } catch (error) {
    res.status(500).send(`Error logging in. \n ${error}`);
  }
});

module.exports = router;
