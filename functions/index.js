const { onCall } = require("firebase-functions/v2/https");

const { initializeApp } = require("firebase-admin/app");
const { getImage } = require("./getImage");
const { createPrompt } = require("./createPrompt");
const { getChallenge } = require("./getChallenge");
const { reset } = require("./reset");
const { submitGuess } = require("./submitGuess");
const { getScores } = require("./getScores");

require("dotenv").config();

initializeApp();

exports.getImage = onCall(getImage);
exports.createPrompt = onCall(createPrompt);
exports.getChallenge = onCall(getChallenge);
exports.submitGuess = onCall(submitGuess);
exports.getScores = onCall(getScores);
exports.reset = onCall(reset);
