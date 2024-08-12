const { HttpsError } = require("firebase-functions/v2/https");
const fetch = require("node-fetch");
const os = require("os");
const path = require("path");
const fs = require("fs");

const INTERESTS = ["Business", "Entertainment", "Politics", "Sports"];
const NEXT_PAGE_COLLECTION = "NextPage";

// https://firebase.google.com/docs/firestore/query-data/queries#limits_on_or_queries
const MAX_LEFT_HAND_LIST_SIZE = 30;

const IS_BOT = "isBot";
const IS_NOT = "isNot";

const getImageCollectionName = (interest = "Uncategorized") =>
  `${interest}_Images`;
const getPromptCollectionName = (interest = "Uncategorized") =>
  `${interest}_Prompts`;
const getResponseCollectionName = (interest = "Uncategorized") =>
  `${interest}_Responses`;

const validateRequest = (request) => {
  const { interest } = request.data;
  const { uid } = request.auth;

  if (!uid) {
    throw new HttpsError(
      "unauthenticated",
      "You must be logged in to call this function"
    );
  }

  if (interest && !INTERESTS.includes(interest)) {
    throw new HttpsError("invalid-argument", "Invalid interest category.");
  }

  return { uid, data: request.data };
};

const downloadFile = async (fileUrl) => {
  const response = await fetch(fileUrl);

  if (!response.ok) {
    throw new Error(`Failed to fetch ${fileUrl}: ${response.statusText}`);
  }

  const tempDir = os.tmpdir();
  const fileName = path.basename(fileUrl);
  const filePath = path.join(tempDir, fileName);

  const fileStream = fs.createWriteStream(filePath);
  await new Promise((resolve, reject) => {
    response.body.pipe(fileStream);
    response.body.on("error", reject);
    fileStream.on("finish", resolve);
  });

  return filePath;
};

const SYSTEM_INSTRUCTIONS_P1 = [
  "Tim, a snarky young adult man from Toronto, Ontario",
  "Sarah, a sarcastic teenage girl from Vancouver, British Columbia",
  "Alex, a witty young adult man from Montreal, Quebec",
  "Emily, a boisterous teenager from Calgary, Alberta",
  "Chris, a reclusive 23 year old man from Halifax, Nova Scotia",
  "Jessica, an energetic 24 year old from Toronto, Ontario",
  "Michael, a introverted 27 year man from New York, New York",
  "Amanda, a shy 30 year old woman from Los Angeles, California",
  "David, an outgoing 32 year old man from Miami, Florida",
  "Lauren, a confident 35 year old woman from Seattle, Washington",
];

const SYSTEM_INSTRUCTIONS_P2 = [
  "a single short sentence",
  "one or two short sentences",
  "a medium length sentence",
  "one or two medium length sentences",
  "a single sentence of medium length sentence or less",
  "a single lengthy sentence",
  "three or four short sentences of just a few words each",
];

const SYSTEM_INSTRUCTIONS_P3 = [
  "sarcastic tone",
  "rambling tone",
  "humorous tone",
  "serious tone",
  "angry tone",
  "sad tone",
  "happy tone",
  "excited tone",
  "bored tone",
  "confused tone",
];

const getRandomSystemInstructions = () => {
  const p1 =
    SYSTEM_INSTRUCTIONS_P1[
      Math.floor(Math.random() * SYSTEM_INSTRUCTIONS_P1.length)
    ];
  const p2 =
    SYSTEM_INSTRUCTIONS_P2[
      Math.floor(Math.random() * SYSTEM_INSTRUCTIONS_P2.length)
    ];
  const p3 =
    SYSTEM_INSTRUCTIONS_P3[
      Math.floor(Math.random() * SYSTEM_INSTRUCTIONS_P3.length)
    ];

  return `You are ${p1}.\n\nAnswer in ${p2}, and use a ${p3}`;
};

module.exports = {
  IS_BOT,
  IS_NOT,
  INTERESTS,
  MAX_LEFT_HAND_LIST_SIZE,
  NEXT_PAGE_COLLECTION,

  getImageCollectionName,
  getPromptCollectionName,
  getResponseCollectionName,
  getRandomSystemInstructions,

  downloadFile,
  validateRequest,
};
