const express = require("express");
const router = express.Router();

router.get("/", (req, res) => {
  res.render("client/home", { title: "Accueil" });
});

module.exports = router;
