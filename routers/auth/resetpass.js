const express = require("express");
const router = express.Router();
const jwt = require("jsonwebtoken");
require("dotenv").config();
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const path = require("path");
const bcrypt = require("bcrypt");

const stagerSchema = require("../../Database/schema.js");
const authToken = require("../../middleware/jwt");

const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "simofff0@gmail.com",
    pass: "deovnqdeqbihcipz",
  },
});

router.get("/reset", (req, res) => {
  res.render("auth/resetpass", {
    title: "Restaurer mon mot de passe",
    pop: null,
  });
});

router.post("/reset", (req, res) => {
  const email = req.body.email;
  stagerSchema
    .findOne({ email: email })
    .then((user) => {
      const token = jwt.sign({ email: email }, process.env.SECRET_CODE, {
        expiresIn: "30m",
      });
      const tokenLink = `http://localhost:3000/reset/${token}`;
      const ejsFilePath = path.join(
        __dirname,
        "..",
        "..",
        "views",
        "emails",
        "reset.ejs"
      );

      const data = ejs.renderFile(
        ejsFilePath,
        { link: tokenLink },
        (err, data) => {
          if (err) {
            res.redirect("/login");
          } else {
            const mailerOptions = {
              from: "simofff0@gmail.com",
              to: email,
              subject: "Réinitialisation de mot de passe",
              html: data,
            };
            stagerSchema.findOne({ email: email }).then((result) => {
              if (result == null) {
                res.render("auth/resetpass", {
                  title: "Restaurer mon mot de passe",
                  pop: email,
                });
              } else {
                transporter.sendMail(mailerOptions, (err, info) => {
                  if (err) {
                    console.log(err);
                    res.redirect("/");
                  } else {
                    console.log(info);
                    res.redirect("/reset");
                  }
                });
              }
            });
          }
        }
      );
    })
    .catch((err) => {
      res.send("user not found");
    });
});

router.get("/reset/:token", (req, res) => {
  const token = req.params.token;
  jwt.verify(token, process.env.SECRET_CODE, (err, user) => {
    if (err) {
      res.redirect("/reset");
    } else {
      res.render("auth/resetpassinput", {
        title: "Réinitialiser le mot de passe",
        token: token,
      });
    }
  });
});

router.post("/resetchange/:token", (req, res) => {
  const password = req.body.password;
  const hashedPassword = bcrypt.hashSync(password, 10);
  const token = req.params.token;
  const decodedToken = jwt.decode(token);
  stagerSchema
    .findOneAndUpdate(
      { email: decodedToken.email },
      { password: hashedPassword }
    )
    .then((result) => {
      res.redirect("/login");
    })
    .catch((err) => {
      res.send(err);
    });
});

module.exports = router;
