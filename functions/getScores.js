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

    const scoreBoard = {};
    const allUserIds = [];
    for (const response of responseSnapshot.docs) {
      const { uid: userUid, win } = response.data();
      allUserIds.push(userUid);

      if (!scoreBoard[userUid]) {
        scoreBoard[userUid] = {
          total: 0,
          wins: 0,
        };
      }

      scoreBoard[userUid].total++;
      if (win) {
        scoreBoard[userUid].wins++;
      }
    }

    scoreResults[interest] = {
      wins: scoreBoard[uid]?.wins || 0,
      total: scoreBoard[uid]?.total || 0,
      rate: scoreBoard[uid]
        ? Math.floor(scoreBoard[uid].wins / scoreBoard[uid].total)
        : 0,

      mostWins: allUserIds.reduce((a, b) =>
        scoreBoard[a]?.wins > scoreBoard[b]?.wins ? a : b
      )?.wins,
      winRank:
        allUserIds
          .sort((a, b) => scoreBoard[b]?.wins - scoreBoard[a]?.wins)
          .findIndex((id) => id === uid) + 1,

      highestRate: allUserIds.reduce((a, b) =>
        scoreBoard[a]?.wins / scoreBoard[a]?.total >
        scoreBoard[b]?.wins / scoreBoard[b]?.total
          ? a
          : b
      ),
      rateRank:
        allUserIds
          .sort(
            (a, b) =>
              scoreBoard[b]?.wins / scoreBoard[b]?.total -
              scoreBoard[a]?.wins / scoreBoard[a]?.total
          )
          .findIndex((id) => id === uid) + 1,
    };
  }

  return { result: scoreResults };
};
