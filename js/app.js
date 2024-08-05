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

const resetButton = document.getElementById("resetButton");
// End -- Page Elements

// Helpers/Utilities -- Begin
const renderError = (error = null) => {
  if (error) {
    errorDiv.classList.remove("hidden");
    errorCode.innerText = error.code;
    errorMessage.innerText = error.message;
  } else {
    errorDiv.classList.add("hidden");
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

const getPromptImage = async () => {
  promptForm.classList.add("hidden");
  loadingScreen.classList.remove("hidden");

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

  loadingScreen.classList.add("hidden");
  promptForm.classList.remove("hidden");
};

const getChallenge = async (lastGuessResponse) => {
  if (lastGuessResponse && lastGuessResponse.data) {
    if (lastGuessResponse.data.result) {
      alert("You guessed correctly! 🎉");
    } else {
      alert("You guessed incorrectly! 😢");
    }
  }

  guessForm.classList.add("hidden");
  loadingScreen.classList.remove("hidden");

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

  loadingScreen.classList.add("hidden");
  guessForm.classList.remove("hidden");
};

resetButton.addEventListener("click", () => {
  const reset = httpsCallable(functions, "reset");
  reset()
    .then(() => {
      renderError();
      window.location.reload();
    })
    .catch(renderError);
});
// End -- Helpers/Utilities

// Welcome Form Listeners -- Begin
welcomeForm.addEventListener("submit", (event) => {
  event.preventDefault();

  welcomeForm.classList.add("hidden");
  authForm.classList.remove("hidden");
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

    authForm.classList.add("hidden");
    interestsForm.classList.remove("hidden");
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

  interestsForm.classList.add("hidden");
  choiceForm.classList.remove("hidden");
});

choiceForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  choiceForm.classList.add("hidden");

  switch (event.submitter.name) {
    case "takeToPrompt":
      await getPromptImage();
      break;
    case "takeToGuess":
      await getChallenge();
      break;
  }
});
// End -- Interests Form Listeners

// Prompt Form Listeners -- Begin
promptForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  const promptData = new FormData(event.target);

  switch (event.submitter.name) {
    case "promptSkipButton":
      await getPromptImage();
      break;
    case "promptButton":
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

        await getPromptImage();
      } catch (error) {
        renderError(error);
      }
  }
});

promptInput.addEventListener("input", updateCharCount);
// End -- Prompt Form Listeners

// Guess Form Listeners -- Begin
guessForm.addEventListener("submit", async (event) => {
  event.preventDefault();

  let submitterName = event.submitter.name;
  switch (submitterName) {
    case "guessSkipButton":
      await getChallenge();
      break;
    case "guessBotButton":
    case "guessNotButton":
      try {
        const submitGuess = httpsCallable(functions, "submitGuess");
        const response = await submitGuess({
          promptId: _RESPONSE.promptId,
          interest: _INTEREST,
          guess: `is${submitterName.slice(5, 8)}`,
        });

        await getChallenge(response);
      } catch (error) {
        renderError(error);
      }
  }
});
// End -- Guess Form Listeners
