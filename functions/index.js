const { onCall } = require("firebase-functions/v2/https");

const { initializeApp } = require("firebase-admin/app");
const { getImage } = require("./getImage");

require("dotenv").config();

initializeApp();

exports.getImage = onCall(getImage);
