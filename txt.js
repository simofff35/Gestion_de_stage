const express = require("express");
const router = express.Router();
const multer = require("multer");
const path = require("path");
const stagerSchema = require("../Database/schema.js");
const nodemailer = require("nodemailer");
const ejs = require("ejs");
const jwt = require("jsonwebtoken");
require("dotenv").config();

//! Nodemailer settings
const transporter = nodemailer.createTransport({
  service: "gmail",
  auth: {
    user: "simofff0@gmail.com",
    pass: "ohaszqeanzfogvoi",
  },
});

//! Multer settings
const storage = multer.diskStorage({
  destination: function (req, file, cb) {
    cb(null, "./uploads");
  },
  filename: function (req, file, cb) {
    const currentDate = new Date();
    const formattedDate = currentDate.toLocaleString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      day: "2-digit",
      month: "2-digit",
      year: "numeric",
    });

    const originalName = file.originalname;
    const extension = path.extname(originalName);

    const nameWithoutSpaces = originalName.replace(/\s/g, "_");
    const truncatedName =
      nameWithoutSpaces.length > 30
        ? nameWithoutSpaces.substring(0, 30)
        : nameWithoutSpaces;

    const timestamp = formattedDate.replace(/[/:]/g, "-");
    const filename = `${truncatedName}-${timestamp}${extension}`;
    cb(null, filename);
  },
});

const upload = multer({
  storage: storage,
  limits: {
    fileSize: 5 * 1024 * 1024,
  },
});

// GET request to render the registration form
router.get("/register", (req, res) => {
  res.render("register", { title: "Inscription" });
});

// POST request to handle the form submission
router.post(
  "/register",
  upload.fields([
    { name: "cv", maxCount: 1 },
    { name: "demmande", maxCount: 1 },
    { name: "convention", maxCount: 1 },
  ]),
  async (req, res) => {
    if (req.files.length < 2 || req.files.length > 3) {
      return res.status(400).send("Veuillez télécharger 2 ou 3 fichiers PDF.");
    }

    const file1 = req.files["cv"][0];
    const file2 = req.files["demmande"][0];
    const file3 = req.files["convention"] ? req.files["convention"][0] : null;

    const file1Path = req.files["cv"][0].path;
    const file2Path = req.files["demmande"][0].path;
    const file3Path = file3 ? req.files["convention"][0].path : null;

    const { nom, prenom, sexe, email, service, periode } = req.body;

    try {
      const newStager = new stagerSchema({
        nom,
        prenom,
        sexe,
        email,
        service,
        periode,
        cv: file1Path,
        demmande: file2Path,
        convention: file3Path,
      });

      await newStager.save();

      const token = await jwt.sign(
        { userId: newStager._id },
        process.env.SECRET_CODE,
        {
          expiresIn: "1h",
        }
      );

      const resetLink = `http://localhost:3000/resetps/${token}`;

      // Email Options
      const rendpass = await ejs.renderFile("views/emails/createpass.ejs", {
        passLink: resetLink,
      });

      const mailOptions = {
        from: "simofff0@gmail.com",
        to: "kafandoaime017@gmail.com",
        subject: "Test Email with HTML and Attachment",
        html: rendpass,
      };

      // Send Email
      transporter.sendMail(mailOptions, (err, info) => {
        if (err) {
          console.log(`error: \n ${err}`);
          return res.redirect("/register");
        } else {
          return res.send("email sent!");
        }
      });
    } catch (error) {
      return res
        .status(400)
        .send("Error occurred during registration: " + error.message);
    }
  }
);

module.exports = router;
