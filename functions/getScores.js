const admin = require("firebase-admin");

const { validateRequest, getResponseCollectionName } = require("./constants");
const { getFirestore } = require("firebase-admin/firestore");

exports.getScores = async (request) => {
  const { uid, interest } = validateRequest(request);

  const auth = admin.auth();
  const allUsers = await auth.listUsers();

  const db = getFirestore();
  const responseCollection = db.collection(getResponseCollectionName(interest));

  const scoreBoard = {},
    allUserIds = [];
  for (const user of allUsers.users) {
    const userUid = user.uid;
    allUserIds.push(userUid);

    const userResponsesSnapshot = await responseCollection
      .where("uid", "==", userUid)
      .get();

    for (const response of userResponsesSnapshot.docs) {
      const responseDoc = response.data();
      if (!scoreBoard[userUid]) {
        scoreBoard[userUid] = {
          total: 0,
          wins: 0,
        };
      }

      scoreBoard[userUid].total++;
      if (responseDoc.win) {
        scoreBoard[userUid].wins++;
      }
    }
  }

  return {
    wins: scoreBoard[uid].wins,
    total: scoreBoard[uid].total,
    rate: Math.floor(scoreBoard[uid].wins / scoreBoard[uid].total),

    mostWins: allUserIds.reduce((a, b) =>
      scoreBoard[a].wins > scoreBoard[b].wins ? a : b
    ),
    winRank: allUserIds.sort((a, b) => scoreBoard[b].wins - scoreBoard[a].wins),

    highestRate: allUserIds.reduce((a, b) =>
      scoreBoard[a].wins / scoreBoard[a].total >
      scoreBoard[b].wins / scoreBoard[b].total
        ? a
        : b
    ),
    rateRank: allUserIds.sort(
      (a, b) =>
        scoreBoard[b].wins / scoreBoard[b].total -
        scoreBoard[a].wins / scoreBoard[a].total
    ),
  };
};
