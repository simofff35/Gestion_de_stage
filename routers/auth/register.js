const express = require("express");
const router = express.Router();
const stagerSchema = require("../../Database/schema.js");
const bcrypt = require("bcrypt");

// Get requests
router.get("/register", (req, res) => {
  res.render("auth/register", { title: "Inscription" });
});

// Post requests
router.post("/register", async (req, res) => {
  res.clearCookie("token");
  try {
    const { nom, prenom, email, password } = req.body;
    const existingUser = await stagerSchema.findOne({ email: email });

    if (existingUser) {
      return res.redirect("/register");
    } else {
      const hashedPass = await bcrypt.hash(password, 10);

      const newStager = new stagerSchema({
        nom: nom,
        prenom: prenom,
        email: email,
        password: hashedPass,
      });

      await newStager.save();
      res.status(201).redirect("/login");
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
