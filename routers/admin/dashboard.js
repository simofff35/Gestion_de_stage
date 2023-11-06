const express = require("express");
const router = express.Router();
const stagerSchema = require("../../Database/schema");
const adminSchema = require("../../Database/adminSchema");
const messageSchema = require("../../Database/messageSchema");
const authToken = require("../../middleware/jwtAdmin");
const _ = require("lodash");
const multer = require("multer");
const path = require("path");
const { title } = require("process");
const bcrypt = require("bcrypt");

// Multer settings
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
router.get("/admin", (req, res) => {
  res.redirect("/admin/dashboard");
});
router.get("/admin/dashboard", authToken, async (req, res) => {
  try {
    const admin = await adminSchema.findById(req.user._id);
    const adminName = `${admin.nom} ${admin.prenom}`;

    const stagers = await stagerSchema.find();

    res.render("admin/dashboard", {
      title: "Dashboard",
      name: adminName,
      stagers: stagers,
    });
  } catch (error) {
    console.error("Error fetching admin data:", error);
    res.status(500).send("An error occurred while fetching admin data.");
  }
});
router.get("/admin/logout", authToken, (req, res) => {
  res.clearCookie("token");
  res.redirect("/admin/login");
});
router.get("/admin/doc/:document", authToken, (req, res) => {
  const documentName = req.params.document;
  const pdfPath = path.join(__dirname, "../../uploads", documentName);
  res.sendFile(pdfPath);
});
// ? Traiter les demande
router.get("/admin/traiter", authToken, async (req, res) => {
  try {
    const admin = await adminSchema.findById(req.user._id);
    const adminName = `${admin.nom} ${admin.prenom}`;

    let enAttente;
    let accepte;
    let diminue;
    let pasDedemande;

    enAttente = await stagerSchema.find({
      demande: {
        $elemMatch: {
          status: "En attente",
        },
      },
    });
    accepte = await stagerSchema.find({
      demande: {
        $elemMatch: {
          status: "Accepté",
        },
      },
    });
    diminue = await stagerSchema.find({
      demande: {
        $elemMatch: {
          status: "Diminué",
        },
      },
    });
    pasDedemande = await stagerSchema.find({
      demande: {
        $exists: true,
      },
      demande: {
        $size: 0,
      },
    });
    res.render("admin/traiter", {
      title: "Traiter les  demandes",
      name: adminName,
      enAttente,
      accepte,
      diminue,
      pasDedemande,
    });
  } catch (error) {
    res.redirect("/admin");
    console.log(error);
  }
});
router.post("/admin/traiter/accept/:id", authToken, async (req, res) => {
  const stagerId = req.params.id;
  const adminId = req.user._id;

  try {
    const accepteMsg = req.body.accept;
    console.log(accepteMsg);

    if (accepteMsg) {
      const message = await new messageSchema({
        senderId: adminId,
        receiverId: stagerId,
        message: accepteMsg,
      });
      await message.save();
    }

    const stager = await stagerSchema.findById(stagerId);
    const demandeId = stager.demande[0]._id; // You need to adapt this based on your data structure

    stagerSchema
      .updateOne(
        {
          _id: stagerId,
          "demande._id": demandeId,
        },
        {
          $set: { "demande.$.status": "Accepté" },
        }
      )
      .then((result) => {
        res.redirect("/admin/traiter");
      })
      .catch((err) => {
        res.send(err);
        console.log(err);
      });
  } catch (error) {
    res.redirect("/admin");
    console.log(error);
  }
});
router.post("/admin/traiter/refuse/:id", authToken, async (req, res) => {
  const stagerId = req.params.id;
  const adminId = req.user._id;

  try {
    const refuseMsg = req.body.refuse;
    console.log(refuseMsg);

    if (refuseMsg) {
      const message = await new messageSchema({
        senderId: adminId,
        receiverId: stagerId,
        message: refuseMsg,
      });
      await message.save();
    }

    const stager = await stagerSchema.findById(stagerId);
    const demandeId = stager.demande[0]._id; // You need to adapt this based on your data structure

    stagerSchema
      .updateOne(
        { _id: stagerId, "demande._id": demandeId },
        { $set: { "demande.$.status": "Diminué" } }
      )
      .then((result) => {
        res.redirect("/admin/traiter");
      })
      .catch((err) => {
        res.send(err);
        console.log(err);
      });
  } catch (error) {
    res.redirect("/admin");
    console.log(error);
  }
});
// ?New demande
router.get("/admin/new", authToken, async (req, res) => {
  try {
    const admin = await adminSchema.findById(req.user._id);
    const adminName = `${admin.nom} ${admin.prenom}`;

    pasDedemande = await stagerSchema.find({
      demande: {
        $exists: true,
      },
      demande: {
        $size: 0,
      },
    });

    res.render("admin/new", {
      title: "Dashboard",
      name: adminName,
      stagers: pasDedemande,
    });
  } catch (error) {
    console.error(error);
    res.status(500).redirect("/admin");
  }
});
router.get("/admin/new/:id", authToken, async (req, res) => {
  try {
    const admin = await adminSchema.findById(req.user._id);
    const adminName = `${admin.nom} ${admin.prenom}`;
    const stager = await stagerSchema.findById(req.params.id);

    res.render("admin/newDemande", {
      title: "Créer une demande",
      name: adminName,
      stager,
    });
  } catch (error) {
    console.error(error);
    res.status(500).redirect("/admin");
  }
});
router.post("/admin/new/:id", upload.any(), authToken, async (req, res) => {
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
      demandeDeStage: demandeFile.filename,
      status: "En attente",
      dateSubmitted: new Date(),
    };

    const foundStager = await stagerSchema.findById(req.params.id);
    foundStager.demande.push(newDemande);
    await foundStager.save();

    res.redirect("/admin/new");
  } catch (err) {
    console.error("Error saving demande:", err);
    res.redirect("/admin/new");
  }
});
// ?Modify demande
router.get("/admin/modify", authToken, async (req, res) => {
  try {
    const admin = await adminSchema.findById(req.user._id);
    const adminName = `${admin.nom} ${admin.prenom}`;

    withDedemande = await stagerSchema.find({
      demande: {
        $exists: true,
      },
      demande: {
        $not: {
          $size: 0,
        },
      },
    });

    res.render("admin/modify", {
      title: "Modifier une demande",
      name: adminName,
      stagers: withDedemande,
      pop: null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).redirect("/admin");
  }
});
router.get("/admin/modify/:id", authToken, async (req, res) => {
  try {
    const admin = await adminSchema.findById(req.user._id);
    const adminName = `${admin.nom} ${admin.prenom}`;
    const found = await stagerSchema
      .findById(req.params.id)
      .then(async (stager) => {
        res.render("admin/formModifyDemande", {
          title: "Dashboard",
          name: adminName,
          stager,
        });
      });
  } catch (error) {
    console.error(error);
    res.status(500).redirect("/admin");
  }
});
router.post("/admin/modify/:id", upload.any(), authToken, async (req, res) => {
  const { sexe, datenaiss, adress, domain, tel, nom, prenom, email } = req.body;
  const admin = await adminSchema.findById(req.user._id);
  const adminName = `${admin.nom} ${admin.prenom}`;

  withDedemande = await stagerSchema.find({
    demande: {
      $exists: true,
    },
    demande: {
      $not: {
        $size: 0,
      },
    },
  });

  try {
    const stagerId = req.params.id;
    await stagerSchema
      .findByIdAndUpdate(
        stagerId,
        {
          sexe,
          datenaiss,
          adress,
          domain,
          tel,
          nom,
          prenom,
          email,
        },
        { new: true }
      )
      .then((result) => {
        res.render("admin/modify", {
          title: "Dashboard",
          name: adminName,
          stagers: withDedemande,
          pop: 1,
        });
      });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
// ?Delete demande
router.get("/admin/delete", authToken, async (req, res) => {
  try {
    const admin = await adminSchema.findById(req.user._id);
    const adminName = `${admin.nom} ${admin.prenom}`;
    const stagers = await stagerSchema.find({
      demande: { $not: { $size: 0 } },
    });

    res.render("admin/deleteDemande", {
      title: "Dashboard",
      name: adminName,
      stagers,
      pop: null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).redirect("/admin");
  }
});
router.get("/admin/delete/:id", authToken, async (req, res) => {
  try {
    const stagerId = req.params.id;
    const admin = await adminSchema.findById(req.user._id);
    const adminName = `${admin.nom} ${admin.prenom}`;
    const stagers = await stagerSchema.find({
      demande: { $not: { $size: 0 } },
    });

    stagerSchema
      .findByIdAndUpdate(stagerId, { demande: [] }, { new: true })
      .then((result) => {
        res.render("admin/deleteDemande", {
          title: "Dashboard",
          name: adminName,
          stagers,
          pop: 1,
        });
      });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
// ?Add stager
router.get("/admin/add", authToken, async (req, res) => {
  try {
    const admin = await adminSchema.findById(req.user._id);
    const adminName = `${admin.nom} ${admin.prenom}`;

    res.render("admin/add", {
      title: "Ajouter un stager",
      name: adminName,
      pop: null,
      msg: null,
    });
  } catch (error) {
    console.error(error);
    res.status(500).redirect("/admin");
  }
});
router.post("/admin/add", authToken, upload.any(), async (req, res) => {
  try {
    const admin = await adminSchema.findById(req.user._id);
    const adminName = `${admin.nom} ${admin.prenom}`;
    const { nom, prenom, email, password } = req.body;

    // Check if the user already exists
    const existingUser = await stagerSchema.findOne({ email: email });

    if (existingUser) {
      // User already exists
      res.render("admin/add", {
        title: "Ajouter un stager",
        name: adminName,
        pop: "L'utilisateur existe déjà",
        msg: null,
      });
    } else {
      // User doesn't exist, proceed to create a new user
      const hashedPass = await bcrypt.hash(password, 10);

      const newStager = new stagerSchema({
        nom: nom,
        prenom: prenom,
        email: email,
        password: hashedPass,
      });

      const savedUser = await newStager.save();

      res.render("admin/add", {
        title: "Ajouter un stagiaire",
        name: adminName,
        pop: null,
        msg: `Vous avez ajouté ${savedUser.nom} ${savedUser.prenom} comme un stagiaire`,
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
// ?Remove stager
router.get("/admin/remove", authToken, async (req, res) => {
  try {
    const admin = await adminSchema.findById(req.user._id);
    const adminName = `${admin.nom} ${admin.prenom}`;

    await stagerSchema.find().then((result) => {
      res.render("admin/remove", {
        title: "Dashboard",
        name: adminName,
        stagers: result,
        pop: null,
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).redirect("/admin");
  }
});
router.get("/admin/remove/:id", authToken, async (req, res) => {
  try {
    const stagerId = req.params.id;
    const admin = await adminSchema.findById(req.user._id);
    const adminName = `${admin.nom} ${admin.prenom}`;
    const stagers = await stagerSchema.find();

    // Find the user by ID and remove it
    stagerSchema.findByIdAndRemove(stagerId).then(() => {
      res.render("admin/remove", {
        title: "Dashboard",
        name: adminName,
        stagers,
        pop: 1,
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
router.post("/admin/change", authToken, upload.any(), async (req, res) => {
  try {
    const admin = await adminSchema.findById(req.user._id);
    const { email, nom, prenom } = req.body;
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
// ?Message
router.get("/admin/msg/new/:id", authToken, async (req, res) => {
  const admin = await adminSchema.findById(req.user._id);
  const adminName = `${admin.nom} ${admin.prenom}`;
  try {
    await stagerSchema.findById(req.params.id).then(async (stager) => {
      res.render("admin/msgNew", {
        title: "Nouveau message",
        name: adminName,
        stager,
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});
router.post("/admin/msg/new/:id", authToken, upload.any(), async (req, res) => {
  const admin = await adminSchema.findById(req.user._id);
  const adminName = `${admin.nom} ${admin.prenom}`;
  msg = req.body.msg;

  try {
    if (msg === "") {
      res.redirect(`/admin/msg/new/${req.params.id}`);
    } else {
      const message = await new messageSchema({
        senderId: admin._id,
        receiverId: req.params.id,
        message: msg,
      });
      message.save(message).then((result) => {
        res.redirect("/admin/msg");
      });
    }
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

router.get("/admin/msg", authToken, upload.any(), async (req, res) => {
  const admin = await adminSchema.findById(req.user._id);
  const adminName = `${admin.nom} ${admin.prenom}`;
  try {
    const messagesWithDetails = [];

    messageSchema.find().then(async (messages) => {
      const promiseArray = messages.map(async (message) => {
        const stager = await stagerSchema.findById(message.receiverId);
        if (stager) {
          const name = `${stager.nom} ${stager.prenom}`;
          const msg = message.message;
          const date = message.date.toLocaleString("fr-FR", {
            day: "numeric",
            month: "numeric",
            year: "numeric",
            hour: "numeric",
            minute: "numeric",
          });
          const read = message.read;
          return {
            name,
            msg,
            date,
            read,
          };
        } else {
          // Handle the case where stager is not found
          return {
            name: "N/A",
            msg: message.message || "No Message",
            date: message.date.toLocaleString("fr-FR", {
              day: "numeric",
              month: "numeric",
              year: "numeric",
              hour: "numeric",
              minute: "numeric",
            }),
            read: message.read,
          };
        }
      });

      // Wait for all promises to resolve
      const resolvedMessages = await Promise.all(promiseArray);

      res.render("admin/msg", {
        title: "Message récent",
        name: adminName,
        messages: resolvedMessages,
      });
    });
  } catch (error) {
    console.error(error);
    res.status(500).send("Internal Server Error");
  }
});

module.exports = router;
