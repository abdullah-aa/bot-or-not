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

    const deceivingPromptCounts = {};
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
        if (!deceivingPromptCounts[promptId]) {
          deceivingPromptCounts[promptId] = 1;
        } else {
          deceivingPromptCounts[promptId]++;
        }
      }

      return acc;
    }, {});

    const userPromptsSnapshot = await db
      .collection(getPromptCollectionName(interest))
      .where("uid", "==", uid)
      .get();

    let mostDeceivingPrompt,
      deceptions = 0;
    userPromptsSnapshot.docs
      .filter((doc) => deceivingPromptCounts[doc.id])
      .forEach((doc) => {
        const promptId = doc.id;
        const promptDeceptions = deceivingPromptCounts[promptId];

        if (
          !deceptions ||
          promptDeceptions > deceivingPromptCounts[mostDeceivingPrompt]
        ) {
          mostDeceivingPrompt = promptId;
        }
        deceptions = +promptDeceptions;
      });

    const usersByWins = Object.keys(scoreBoard).sort(
      (a, b) => scoreBoard[b]?.wins - scoreBoard[a]?.wins
    );
    const deceivingPromptEntries = Object.entries(deceivingPromptCounts).sort(
      (a, b) => b[1] - a[1]
    );

    scoreResults[interest] = {
      wins: scoreBoard[uid]?.wins || 0,
      total: scoreBoard[uid]?.total || 0,
      deceptions: deceptions || 0,

      highestWins: scoreBoard[usersByWins[0]].wins,
      winRank: usersByWins.findIndex((id) => id === uid) + 1,

      highestDeceptions: deceivingPromptEntries[0][1],
      deceptionRank:
        deceivingPromptEntries.findIndex(([id]) => id === mostDeceivingPrompt) +
        1,
    };
  }

  return { result: scoreResults };
};
