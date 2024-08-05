const { getFirestore, FieldValue } = require("firebase-admin/firestore");

const { GoogleGenerativeAI } = require("@google/generative-ai");
const { GoogleAIFileManager } = require("@google/generative-ai/server");

const {
  IS_BOT,
  IS_NOT,
  validateRequest,
  getPromptCollectionName,
  getResponseCollectionName,
  getImageCollectionName,
  downloadFile,
} = require("./constants");

const getPromptsWithoutUserResponse = async (db, interest, uid, type) => {
  const responsesSnapshot = await db
    .collection(getResponseCollectionName(interest))
    .where("uid", "==", uid)
    .get();
  let promptToReturn;

  const promptsWithUserResponses = responsesSnapshot.docs.map(
    (response) => response.data().promptId
  );

  const allPromptsSnapshot = await db
    .collection(getPromptCollectionName(interest))
    .where(type, "==", true)
    .get();

  const promptsWithoutUserResponses = allPromptsSnapshot.docs.filter(
    (prompt) => !promptsWithUserResponses.includes(prompt.id)
  );

  if (promptsWithoutUserResponses.length > 0) {
    const promptSnapshot =
      promptsWithoutUserResponses[
        Math.floor(Math.random() * promptsWithoutUserResponses.length)
      ];
    const promptDoc = promptSnapshot.data();

    const imageDoc = (
      await db
        .collection(getImageCollectionName(interest))
        .doc(promptDoc.imageId)
        .get()
    ).data();

    promptToReturn = {
      description: imageDoc.description,
      imageUrl: imageDoc.imageUrl,
      prompt: promptDoc.prompt,
      promptId: promptSnapshot.id,
    };
  }

  return promptToReturn;
};

const getNotBotPrompt = async (db, interest, uid) =>
  await getPromptsWithoutUserResponse(db, interest, uid, IS_NOT);

const getBotPrompt = async (db, interest, uid) => {
  let promptToReturn = await getPromptsWithoutUserResponse(
    db,
    interest,
    uid,
    IS_BOT
  );

  if (!promptToReturn) {
    const imageCollection = await db
      .collection(getImageCollectionName(interest))
      .get();

    if (!imageCollection.empty) {
      const randomImageSnapshot =
        imageCollection.docs[
          Math.floor(Math.random() * imageCollection.docs.length)
        ];
      const randomImageDoc = randomImageSnapshot.data();
      const filePath = await downloadFile(randomImageDoc.imageUrl);

      const fileManager = new GoogleAIFileManager(process.env.GEMINI_API_KEY);
      const uploadResponse = await fileManager.uploadFile(filePath, {
        mimeType: "image/jpeg",
        displayName: `${interest}_${Date.now()}`,
      });

      const genAI = new GoogleGenerativeAI(process.env.GEMINI_API_KEY);
      const model = genAI.getGenerativeModel({
        model: "gemini-1.5-pro",
        systemInstruction:
          "You are Tim, a snarky young adult from Toronto, Ontario.\n\nAnswer in a single short sentence, and use a sarcastic tone.\n\n",
      });

      const result = await model.generateContent([
        {
          fileData: {
            mimeType: uploadResponse.file.mimeType,
            fileUri: uploadResponse.file.uri,
          },
        },
        { text: "What are your thoughts on seeing this image?" },
      ]);

      const newPromptData = {
        [IS_BOT]: true,
        [IS_NOT]: false,
        createdAt: FieldValue.serverTimestamp(),
        imageId: randomImageSnapshot.id,
        prompt: result.response.text(),
        uid: "itz_a_BOT",
      };
      const newPromptDoc = db
        .collection(getPromptCollectionName(interest))
        .doc();
      await newPromptDoc.set(newPromptData);

      promptToReturn = {
        description: randomImageDoc.description,
        imageUrl: randomImageDoc.imageUrl,
        prompt: newPromptData.prompt,
        promptId: newPromptDoc.id,
      };
    }
  }

  return promptToReturn;
};

exports.getChallenge = async (request) => {
  const { uid, data } = validateRequest(request);
  const { interest } = data;

  const db = getFirestore();
  let result;

  const coinFlip = Math.random() > 0.5 ? IS_BOT : IS_NOT;

  if (coinFlip === IS_NOT) {
    result = await getNotBotPrompt(db, interest, uid);
  }

  if (coinFlip === IS_BOT || !result) {
    result = await getBotPrompt(db, interest, uid);
  }

  return { result: result || "No more challenges available." };
};
