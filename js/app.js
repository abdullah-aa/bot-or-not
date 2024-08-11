import { initializeApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";

const firebaseConfig = {
  apiKey: "AIzaSyCGzjPbE3MCph6S-3xwPS7Pp_X7a72btr4",
  authDomain: "bot-or-not-erg237.firebaseapp.com",
  projectId: "bot-or-not-erg237",
  storageBucket: "bot-or-not-erg237.appspot.com",
  messagingSenderId: "195354824452",
  appId: "1:195354824452:web:f087178204f04d785a8a51",
};

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

const MAX_PROMPT_LENGTH = 150;
const INTERESTS = ["Entertainment", "Business", "Politics", "Sports"];
const CHOICES = {
  PROMPT: "prompt",
  GUESS: "guess",
  SCORE: "score",
};

let _USER,
  _RESPONSE,
  _CHOICE,
  _INTEREST = INTERESTS[0];

const welcomeForm = document.getElementById("welcomeForm");
const authForm = document.getElementById("authForm");

const loadingScreen = document.getElementById("loadingScreen");

const interestsForm = document.getElementById("interestsForm");
const interestHeader = document.getElementById("interestHeader");

const choiceForm = document.getElementById("choiceForm");

const promptForm = document.getElementById("promptForm");
const promptImage = document.getElementById("promptImage");
const promptText = document.getElementById("promptText");
const promptInput = document.getElementById("promptInput");
const inputPromptCharCount = document.getElementById("inputPromptCharCount");

const guessForm = document.getElementById("guessForm");
const guessImage = document.getElementById("guessImage");
const guessPrompt = document.getElementById("guessPrompt");
const guessText = document.getElementById("guessText");

const scoreForm = document.getElementById("scoreForm");
const scoreTotal = document.getElementById("scoreTotal");
const scoreWins = document.getElementById("scoreWins");
const scoreWinRank = document.getElementById("scoreWinRank");
const scoreHighestWins = document.getElementById("scoreHighestWins");
const scoreRate = document.getElementById("scoreRate");
const scoreRateRank = document.getElementById("scoreRateRank");
const scoreHighestRate = document.getElementById("scoreHighestRate");

const resultForm = document.getElementById("resultForm");
const resultImage = document.getElementById("resultImage");
const resultHeader = document.getElementById("resultHeader");
const resultMessage = document.getElementById("resultMessage");

const errorDiv = document.getElementById("errorDiv");
const errorCode = document.getElementById("errorCode");
const errorMessage = document.getElementById("errorMessage");

// const resetButton = document.getElementById("resetButton");
//
// resetButton.addEventListener("click", () => {
//   const reset = httpsCallable(functions, "reset");
//   reset()
//     .then(() => {
//       renderError();
//       window.location.reload();
//     })
//     .catch(renderError);
// });

const UI_ELEMENTS = [
  welcomeForm,
  authForm,
  interestsForm,
  choiceForm,
  promptForm,
  guessForm,
  scoreForm,
  resultForm,
  loadingScreen,
  errorDiv,
];

// Helpers/Utilities

const show = (...elements) => {
  for (const el of UI_ELEMENTS) {
    if (!elements.includes(el)) {
      el.classList.add("hidden");
    }
  }

  elements.forEach((el) => el.classList.remove("hidden"));
};

const renderError = (error) => {
  errorCode.innerText = error.code;
  errorMessage.innerText = error.message;

  show(errorDiv);
};

const updateCharCount = () => {
  const charCount = MAX_PROMPT_LENGTH - promptInput.value.length;

  inputPromptCharCount.innerText = `${charCount}/${MAX_PROMPT_LENGTH} character${
    charCount > 1 ? "" : "s"
  } left`;
};

const getImage = async () => {
  show(loadingScreen);

  try {
    const getImage = httpsCallable(functions, "getImage");
    const response = await getImage({ interest: _INTEREST });
    _RESPONSE = response.data.result;

    promptImage.src = _RESPONSE.imageUrl;
    promptText.innerHTML = _RESPONSE.description
      ? `<small class="blockDisplay">Image Description</small><strong><q>${_RESPONSE.description.replace(
          "[...]",
          ""
        )}</q></strong>`
      : "<strong>No description available, sorry... 😓</strong>";
    promptText.scrollTop = 0;
    promptInput.value = "";

    updateCharCount();
  } catch (error) {
    renderError(error);
  }

  show(promptForm, interestsForm);
};

const getChallenge = async () => {
  show(loadingScreen);

  try {
    const getChallenge = httpsCallable(functions, "getChallenge");
    const response = await getChallenge({ interest: _INTEREST });
    _RESPONSE = response.data.result;

    guessImage.src = _RESPONSE.imageUrl;
    guessPrompt.innerHTML = _RESPONSE.prompt;
    guessText.innerHTML = _RESPONSE.description
      ? `written after reading this <div class="divWithScroll"><strong><q>${_RESPONSE.description.replace(
          "[...]",
          ""
        )}</q></strong></div>`
      : "<strong>No context was provided for this image... 😓</strong>";
    guessText.scrollTop = 0;
  } catch (error) {
    renderError(error);
  }

  show(guessForm, interestsForm);
};

const populateScoreContainer = () => {
  const scoreData = _RESPONSE[_INTEREST] || {
    total: 0,
    wins: 0,
    winRank: 0,
    highestWins: 0,
    rate: 0,
    rateRank: 0,
    highestRate: 0,
  };

  scoreTotal.innerText = scoreData.total;
  scoreWins.innerText = scoreData.wins;
  scoreWinRank.innerText = scoreData.winRank;
  scoreHighestWins.innerText = scoreData.highestWins;
  scoreRate.innerText = `${scoreData.rate}%`;
  scoreRateRank.innerText = scoreData.rateRank;
  scoreHighestRate.innerText = `${scoreData.highestRate}%`;
};

const getScores = async () => {
  show(loadingScreen);

  try {
    const getScores = httpsCallable(functions, "getScores");
    const response = await getScores({ interest: _INTEREST });
    _RESPONSE = response.data.result;

    populateScoreContainer();
  } catch (error) {
    renderError(error);
  }

  show(scoreForm, interestsForm);
};

const setupChoice = async (choice) => {
  const scoreFunction = choice ? getScores : populateScoreContainer;
  _CHOICE = choice || _CHOICE;

  interestHeader.innerText = _INTEREST;
  switch (_CHOICE) {
    case CHOICES.PROMPT:
      await getImage();
      break;
    case CHOICES.GUESS:
      await getChallenge();
      break;
    case CHOICES.SCORE:
      await scoreFunction();
      break;
  }
};

// Form Listeners

welcomeForm.addEventListener("submit", (event) => {
  event.preventDefault();

  show(authForm);
});

authForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const authData = new FormData(event.target);
  let userCredential;

  try {
    switch (event.submitter.name) {
      case "signupButton":
        userCredential = await createUserWithEmailAndPassword(
          auth,
          authData.get("email"),
          authData.get("password")
        );
        break;
      case "loginButton":
        userCredential = await signInWithEmailAndPassword(
          auth,
          authData.get("email"),
          authData.get("password")
        );
        break;
    }

    _USER = userCredential.user;

    show(choiceForm);
  } catch (error) {
    renderError(error);
  }
});

interestsForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  switch (event.submitter.name) {
    case "prevInterestButton":
      const previousIndex = INTERESTS.indexOf(_INTEREST) - 1;
      _INTEREST =
        INTERESTS[previousIndex >= 0 ? previousIndex : INTERESTS.length - 1];
      break;
    case "nextInterestButton":
      const nextIndex = INTERESTS.indexOf(_INTEREST) + 1;
      _INTEREST = INTERESTS[nextIndex < INTERESTS.length ? nextIndex : 0];
      break;
  }

  await setupChoice();
});

choiceForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  switch (event.submitter.name) {
    case "takeToPromptButton":
      await setupChoice(CHOICES.PROMPT);
      break;
    case "takeToGuessButton":
      await setupChoice(CHOICES.GUESS);
      break;
    case "takeToAllScoreButton":
      await setupChoice(CHOICES.SCORE);
      break;
  }
});

promptForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const promptData = new FormData(event.target);

  switch (event.submitter.name) {
    case "promptSkipButton":
      await getImage();
      break;
    case "promptButton":
      show(loadingScreen);

      const prompt = promptData.get("promptInput");
      if (!prompt) {
        return;
      }

      try {
        const createPrompt = httpsCallable(functions, "createPrompt");
        await createPrompt({
          imageId: _RESPONSE.imageId,
          interest: _INTEREST,
          prompt,
        });

        await getImage();
      } catch (error) {
        renderError(error);
      }
      break;
    case "promptBackButton":
      show(choiceForm);
      break;
  }
});

promptInput.addEventListener("input", updateCharCount);

guessForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const submitterName = event.submitter.name;
  switch (submitterName) {
    case "guessSkipButton":
      await getChallenge();
      break;
    case "guessBotButton":
    case "guessNotButton":
      show(loadingScreen);

      try {
        const submitGuess = httpsCallable(functions, "submitGuess");
        const guessType = submitterName.slice(5, 8);
        const response = await submitGuess({
          promptId: _RESPONSE.promptId,
          interest: _INTEREST,
          guess: `is${guessType}`,
        });

        _RESPONSE = response.data.result;

        if (_RESPONSE) {
          resultMessage.innerText = "U were right! 🎉";
          resultImage.src = "img/correctGuess";
        } else {
          if (guessType === "Bot") {
            resultImage.src = "img/fooledByNot";
            resultMessage.innerText = "That wasn't a bot! 😀";
          } else {
            resultImage.src = "img/fooledByBot";
            resultMessage.innerText = "You fell for a bot! 🤖";
          }
        }

        show(resultForm);
      } catch (error) {
        renderError(error);
      }
      break;
    case "guessBackButton":
      show(choiceForm);
      break;
  }
});

scoreForm.addEventListener("submit", (event) => {
  event.preventDefault();

  show(choiceForm);
});

resultForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  switch (event.submitter.name) {
    case "resultBackButton":
      show(choiceForm);
      break;
    case "resultNextButton":
      await setupChoice();
      break;
  }
});
