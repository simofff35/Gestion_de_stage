const express = require("express");
const router = express.Router();
const multer = require("multer");
const _ = require("lodash");
const mongoose = require("mongoose");
const stagerSchema = require("../../Database/schema");
const authToken = require("../../middleware/jwt");
const messageSchema = require("../../Database/messageSchema");

// Multer settings PDF
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const fileFilter = (req, file, cb) => {
  // Only allow certain file types (in this example, we allow PDF files)
  if (file.mimetype === "application/pdf") {
    cb(null, true);
  } else {
    cb(new Error("Only PDF files are allowed."), false);
  }
};
const upload = multer({
  storage: storage,
  limits: { fileSize: 5 * 1024 * 1024 }, // Limit the file size to 5MB
  fileFilter: fileFilter,
});
// Multer settings IMG
const storageImg = multer.diskStorage({
  destination: (req, file, cb) => {
    cb(null, "public/uploads/");
  },
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});

const fileFilterImg = (req, file, cb) => {
  if (file.mimetype === "image/jpeg" || file.mimetype === "image/png") {
    cb(null, true);
  } else {
    cb(new Error("Only JPEG and PNG images are allowed."), false);
  }
};
const uploadImg = multer({
  storage: storageImg,
  limits: { fileSize: 5 * 1024 * 1024 },
  fileFilter: fileFilterImg,
});

// *Routes
router.get("/dashboard", authToken, async (req, res) => {
  try {
    const foundStager = await stagerSchema.findById(req.user._id);
    img = `uploads/${foundStager.img}`;

    res.render("client/dashboard", {
      title: "Mes demandes",
      activeTab: "dashboard",
      stager: foundStager,
      img,
      name: _.startCase(`${foundStager.nom} ${foundStager.prenom}`),
    });
  } catch (err) {
    console.error("Error fetching data:", err);
    res.status(500).send("An error occurred while fetching the data.");
  }
});

router.get("/new", authToken, async (req, res) => {
  const foundStager = await stagerSchema.findById(req.user._id);
  img = `uploads/${foundStager.img}`;

  res.render("client/createdemande", {
    title: "Nouvelle demande",
    activeTab: "new",
    stager: foundStager,
    img,
    name: _.startCase(`${foundStager.nom} ${foundStager.prenom}`),
  });
});

router.post("/new", upload.any(), authToken, async (req, res) => {
  const body = req.body;
  const cvFile = req.files.find((file) => file.fieldname === "cv");
  const demandeFile = req.files.find(
    (file) => file.fieldname === "demandeDeStage"
  );

  try {
    const newDemande = {
      adress: body.adress,
      sexe: body.sexe,
      datenaiss: body.datenaiss,
      domain: body.domain,
      tel: body.tel,
      cv: cvFile.filename,
      demandeDeStage: demandeFile.filename, // Save the demande file name
      status: "En attente",
      dateSubmitted: new Date(),
    };

    const foundStager = await stagerSchema.findById(req.user._id);
    foundStager.demande.push(newDemande);
    await foundStager.save();

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Error saving demande:", err);
    res.status(500).send("An error occurred while saving the demande.");
  }
});

router.get("/modify/:id", authToken, async (req, res) => {
  const idDemand = req.params.id;
  const foundStager = await stagerSchema.findById(req.user._id);
  img = `uploads/${foundStager.img}`;

  const foundDemande = foundStager.demande.find(
    (demande) => demande._id.toString() === idDemand
  );

  if (!foundDemande) {
    return res.status(404).send("Demande not found.");
  }

  res.render("client/modifydemande", {
    title: "Modifier une demande",
    activeTab: "modify",
    demande: foundDemande,
    img,
    name: _.startCase(`${foundStager.nom} ${foundStager.prenom}`),
  });
});

router.get("/messages", authToken, async (req, res) => {
  const foundStager = await stagerSchema.findById(req.user._id);
  img = `uploads/${foundStager.img}`;

  await messageSchema
    .updateMany({ receiverId: req.user._id }, { $set: { read: true } })
    .then(async (result) => {
      await messageSchema
        .find({ receiverId: req.user._id })
        .then(async (msg) => {
          res.render("client/messages", {
            title: "Boite de reception",
            activeTab: "messages",
            stager: foundStager,
            img,
            msg,
            name: _.startCase(`${foundStager.nom} ${foundStager.prenom}`),
          });
        });
    });
});

router.post("/modify/:id", upload.any(), authToken, async (req, res) => {
  const idDemand = req.params.id;
  const { sexe, datenaiss, adress, domain, tel, status, nom, prenom, email } =
    req.body;
  const cvFile = req.files.find((file) => file.fieldname === "cv");
  const demandeFile = req.files.find(
    (file) => file.fieldname === "demandeDeStage"
  );

  try {
    const foundStager = await stagerSchema.findById(req.user._id);

    // Find the demande inside the stager's demande array
    const foundDemande = foundStager.demande.find(
      (demande) => demande._id.toString() === idDemand
    );

    if (!foundDemande) {
      return res.status(404).send("Demande not found.");
    }

    // Update the demande fields
    foundDemande.sexe = sexe;
    foundDemande.datenaiss = datenaiss;
    foundDemande.adress = adress;
    foundDemande.domain = domain;
    foundDemande.tel = tel;
    if (cvFile) {
      foundDemande.cv = cvFile.filename;
    }
    if (demandeFile) {
      foundDemande.demandeDeStage = demandeFile.filename;
    }
    foundDemande.status = status || foundDemande.status;

    // Update nom, prenom, and email fields in the stager document
    foundStager.nom = nom || foundStager.nom;
    foundStager.prenom = prenom || foundStager.prenom;
    foundStager.email = email || foundStager.email;

    await foundStager.save();

    res.redirect("/dashboard");
  } catch (err) {
    console.error("Error updating demande:", err);
    res.status(500).send("An error occurred while updating the demande.");
  }
});

// Logout
router.get("/logout", authToken, (req, res) => {
  res.clearCookie("token");
  res.redirect("/login");
});

router.post(
  "/upload-profile-image",
  authToken,
  uploadImg.single("profileImage"),
  async (req, res) => {
    try {
      const foundStager = await stagerSchema.findById(req.user._id);

      if (!foundStager) {
        return res.status(404).send("User not found.");
      }

      if (req.file) {
        foundStager.img = req.file.filename;
        await foundStager.save();
      }

      res.redirect("/dashboard");
    } catch (err) {
      console.error("Error uploading profile image:", err);
      res
        .status(500)
        .send("An error occurred while uploading the profile image.");
    }
  }
);

module.exports = router;
