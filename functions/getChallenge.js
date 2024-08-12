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
  getRandomSystemInstructions,
} = require("./constants");

const getNotBotPrompt = async (db, interest, uid) => {
  const responsesSnapshot = await db
    .collection(getResponseCollectionName(interest))
    .where("uid", "==", uid)
    .get();
  let promptToReturn;

  const promptsWithUserResponses = responsesSnapshot.docs.map(
    (response) => response.data().promptId
  );

  const sixHoursAgo = new Date();
  sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
  const allPromptsSnapshot = await db
    .collection(getPromptCollectionName(interest))
    .where("createdAt", ">=", sixHoursAgo)
    .get();

  const promptsWithoutUserResponses = allPromptsSnapshot.docs.filter(
    (prompt) => !promptsWithUserResponses.includes(prompt.id)
  );

  while (!promptToReturn && promptsWithoutUserResponses.length > 0) {
    const randomPromptIndex = Math.floor(
      Math.random() * promptsWithoutUserResponses.length
    );

    const promptSnapshot = promptsWithoutUserResponses[randomPromptIndex];
    const promptDoc = promptSnapshot.data();

    if (promptDoc.uid === uid || promptDoc[IS_BOT]) {
      promptsWithoutUserResponses.splice(randomPromptIndex, 1);
      continue;
    }

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

const getBotPrompt = async (db, interest) => {
  let promptToReturn;

  const sixHoursAgo = new Date();
  sixHoursAgo.setHours(sixHoursAgo.getHours() - 6);
  const imageCollection = await db
    .collection(getImageCollectionName(interest))
    .where("createdAt", ">=", sixHoursAgo)
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
      model: "gemini-1.5-flash-latest",
      systemInstruction: getRandomSystemInstructions(),
    });

    const result = await model.generateContent([
      {
        fileData: {
          mimeType: uploadResponse.file.mimeType,
          fileUri: uploadResponse.file.uri,
        },
      },
      {
        text: `Here's what this image is supposed to be about: ${randomImageDoc.description}`,
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
    const newPromptDoc = db.collection(getPromptCollectionName(interest)).doc();
    await newPromptDoc.set(newPromptData);

    promptToReturn = {
      description: randomImageDoc.description,
      imageUrl: randomImageDoc.imageUrl,
      prompt: newPromptData.prompt,
      promptId: newPromptDoc.id,
    };
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
