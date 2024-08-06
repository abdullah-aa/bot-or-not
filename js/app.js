import { initializeApp } from "firebase/app";
import { getFunctions, httpsCallable } from "firebase/functions";
import {
  createUserWithEmailAndPassword,
  getAuth,
  signInWithEmailAndPassword,
} from "firebase/auth";

// Constants, Variables Firebase Init -- Begin
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

let _USER, _INTEREST, _RESPONSE;
// End -- Constants, Variables Firebase Init

// Page Elements -- Begin
const welcomeForm = document.getElementById("welcomeForm");
const authForm = document.getElementById("authForm");

const loadingScreen = document.getElementById("loadingScreen");

const interestsForm = document.getElementById("interestsForm");
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

const errorDiv = document.getElementById("errorDiv");
const errorCode = document.getElementById("errorCode");
const errorMessage = document.getElementById("errorMessage");

// const resetButton = document.getElementById("resetButton");
// End -- Page Elements

// Helpers/Utilities -- Begin
// resetButton.addEventListener("click", () => {
//   const reset = httpsCallable(functions, "reset");
//   reset()
//     .then(() => {
//       renderError();
//       window.location.reload();
//     })
//     .catch(renderError);
// });

const hide = (element) => element.classList.add("hidden");
const show = (element) => element.classList.remove("hidden");

const renderError = (error = null) => {
  if (error) {
    show(errorDiv);
    errorCode.innerText = error.code;
    errorMessage.innerText = error.message;
  } else {
    hide(errorDiv);
    errorCode.innerText = "";
    errorMessage.innerText = "";
  }
};

const updateCharCount = () => {
  const charCount = MAX_PROMPT_LENGTH - promptInput.value.length;
  inputPromptCharCount.innerText = `${charCount}/${MAX_PROMPT_LENGTH} character${
    charCount > 1 ? "" : "s"
  } left`;
};

const getImage = async () => {
  try {
    const getImage = httpsCallable(functions, "getImage");
    const response = await getImage({ interest: _INTEREST });
    _RESPONSE = response.data.result;

    promptImage.src = _RESPONSE.imageUrl;
    promptText.innerHTML = _RESPONSE.description
      ? `<h5><q>${_RESPONSE.description.replace("[...]", "")}</q></h5>`
      : "<h6>No description available, sorry... 😓</h6>";
    promptInput.value = "";
    updateCharCount();
  } catch (error) {
    renderError(error);
  }

  hide(loadingScreen);
  show(promptForm);
};

const getChallenge = async () => {
  try {
    const getChallenge = httpsCallable(functions, "getChallenge");
    const response = await getChallenge({ interest: _INTEREST });
    _RESPONSE = response.data.result;

    guessImage.src = _RESPONSE.imageUrl;
    guessPrompt.innerHTML = _RESPONSE.prompt;
    guessText.innerHTML = _RESPONSE.description
      ? `written after reading this <h5><q>${_RESPONSE.description.replace(
          "[...]",
          ""
        )}</q></h5>`
      : "<h6>No context was provided for this image... 😓</h6>";
  } catch (error) {
    renderError(error);
  }

  hide(loadingScreen);
  show(guessForm);
};
// End -- Helpers/Utilities

// Welcome Form Listeners -- Begin
welcomeForm.addEventListener("submit", (event) => {
  event.preventDefault();

  hide(welcomeForm);
  show(authForm);
});
// End -- Welcome Form Listeners

// Auth Form Listeners -- Begin
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

    renderError();

    hide(authForm);
    show(interestsForm);
  } catch (error) {
    renderError(error);
  }
});
// End -- Auth Form Listeners

// Interests Form Listeners -- Begin
interestsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const interestData = new FormData(event.target);
  _INTEREST = interestData.get("interest");

  hide(interestsForm);
  show(choiceForm);
});

choiceForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  hide(choiceForm);

  switch (event.submitter.name) {
    case "takeToPromptButton":
      show(loadingScreen);
      await getImage();
      break;
    case "takeToGuessButton":
      show(loadingScreen);
      await getChallenge();
      break;
    case "takeToInterestButton":
      show(interestsForm);
      break;
  }
});
// End -- Interests Form Listeners

// Prompt Form Listeners -- Begin
promptForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const promptData = new FormData(event.target);

  hide(promptForm);

  switch (event.submitter.name) {
    case "promptSkipButton":
      show(loadingScreen);
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
// End -- Prompt Form Listeners

// Guess Form Listeners -- Begin
guessForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  hide(guessForm);

  const submitterName = event.submitter.name;
  switch (submitterName) {
    case "guessSkipButton":
      show(loadingScreen);
      await getChallenge();
      break;
    case "guessBotButton":
    case "guessNotButton":
      show(loadingScreen);
      try {
        const submitGuess = httpsCallable(functions, "submitGuess");
        const response = await submitGuess({
          promptId: _RESPONSE.promptId,
          interest: _INTEREST,
          guess: `is${submitterName.slice(5, 8)}`,
        });

        if (response && response.data) {
          if (response.data.result) {
            alert("You guessed correctly! 🎉");
          } else {
            alert("You guessed incorrectly! 😢");
          }
        }

        await getChallenge();
      } catch (error) {
        renderError(error);
      }
      break;
    case "guessBackButton":
      show(choiceForm);
      break;
  }
});
// End -- Guess Form Listeners
