const mongoose = require("mongoose");

const stagerSchema = new mongoose.Schema({
  nom: {
    type: String,
    required: true,
  },
  prenom: {
    type: String,
    required: true,
  },
  email: {
    type: String,
    unique: true,
    required: true,
  },
  password: {
    type: String,
    required: true,
  },
  date: {
    type: Date,
    default: Date.now,
  },
  demande: [
    {
      sexe: { type: String, required: true },
      datenaiss: { type: String, required: true },
      adress: { type: String, required: true },
      domain: { type: String, required: true },
      tel: { type: String, required: true },
      cv: { type: String, required: true },
      demandeDeStage: {
        type: String,
        required: true,
      },
      status: {
        type: String,
        enum: ["En attente", "Accepté", "Diminué"],
        default: "En attente",
      },
      dateSubmitted: {
        type: Date,
        default: Date.now,
      },
    },
  ],
  messages: [],
  img: { type: String },
});

module.exports = mongoose.model("stager", stagerSchema);
