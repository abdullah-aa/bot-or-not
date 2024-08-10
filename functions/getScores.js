const { getFirestore } = require("firebase-admin/firestore");

const {
  INTERESTS,
  validateRequest,
  getResponseCollectionName,
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

    const scoreBoard = responseSnapshot.docs.reduce((acc, doc) => {
      const { uid: userUid, win } = doc.data();

      if (!acc[userUid]) {
        acc[userUid] = {
          total: 0,
          wins: 0,
        };
      }

      acc[userUid].total++;
      if (win) {
        acc[userUid].wins++;
      }

      return acc;
    }, {});

    const calculateRate = (user) => user?.wins / user?.total;
    const usersByWins = Object.keys(scoreBoard).sort(
      (a, b) => scoreBoard[b]?.wins - scoreBoard[a]?.wins
    );
    const usersByRates = Object.keys(scoreBoard).sort(
      (a, b) => calculateRate(scoreBoard[b]) - calculateRate(scoreBoard[a])
    );

    scoreResults[interest] = {
      wins: scoreBoard[uid]?.wins || 0,
      total: scoreBoard[uid]?.total || 0,
      rate: scoreBoard[uid]
        ? Math.floor(calculateRate(scoreBoard[uid]) * 100)
        : 0,

      highestWins: scoreBoard[usersByWins[0]].wins,
      winRank: usersByWins.findIndex((id) => id === uid) + 1,

      highestRate: Math.floor(calculateRate(scoreBoard[usersByRates[0]]) * 100),
      rateRank: usersByRates.findIndex((id) => id === uid) + 1,
    };
  }

  return { result: scoreResults };
};
