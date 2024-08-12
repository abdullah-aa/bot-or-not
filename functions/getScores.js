const { getFirestore } = require("firebase-admin/firestore");

const {
  INTERESTS,
  validateRequest,
  getResponseCollectionName,
  getPromptCollectionName,
} = require("./constants");

exports.getScores = async (request) => {
  const { uid } = validateRequest(request);

  const db = getFirestore();
  const scoreResults = {};

  for (const interest of INTERESTS) {
    const responseSnapshot = await db
      .collection(getResponseCollectionName(interest))
      .get();

    if (responseSnapshot.empty) {
      continue;
    }

    const deceivingPrompts = new Set();
    const scoreBoard = responseSnapshot.docs.reduce((acc, doc) => {
      const { uid: userUid, win, promptId } = doc.data();

      if (!acc[userUid]) {
        acc[userUid] = {
          total: 0,
          wins: 0,
        };
      }

      acc[userUid].total++;
      if (win) {
        acc[userUid].wins++;
      } else {
        deceivingPrompts.add(promptId);
      }

      return acc;
    }, {});

    for (const deceivingPrompt of deceivingPrompts) {
      const promptDoc = await db
        .collection(getPromptCollectionName(interest))
        .doc(deceivingPrompt)
        .get();

      const { uid: userUid } = promptDoc.data();
      if (!scoreBoard[userUid]) {
        scoreBoard[userUid] = {
          deceptions: 1,
        };
      } else {
        scoreBoard[userUid].deceptions++;
      }
    }

    const usersByWins = Object.keys(scoreBoard).sort(
      (a, b) => scoreBoard[b]?.wins - scoreBoard[a]?.wins
    );
    const usersByDeceptions = Object.keys(scoreBoard).sort(
      (a, b) => scoreBoard[b]?.deceptions - scoreBoard[a]?.deceptions
    );

    scoreResults[interest] = {
      wins: scoreBoard[uid]?.wins || 0,
      total: scoreBoard[uid]?.total || 0,
      deceptions: scoreBoard[uid]?.deceptions || 0,

      highestWins: scoreBoard[usersByWins[0]].wins,
      winRank: usersByWins.findIndex((id) => id === uid) + 1,

      highestDeceptions: scoreBoard[usersByDeceptions[0]].deceptions,
      deceptionRank: usersByDeceptions.findIndex((id) => id === uid) + 1,
    };
  }

  return { result: scoreResults };
};
