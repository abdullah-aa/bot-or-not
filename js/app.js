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

const MAX_PROMPT_LENGTH = 150;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

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

let _USER, _INTEREST, _RESPONSE;

// Helpers

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

const getPromptImage = () => {
  promptForm.classList.add("hidden");
  loadingScreen.classList.remove("hidden");

  const getImage = httpsCallable(functions, "getImage");
  getImage({ interest: _INTEREST })
    .then((response) => {
      _RESPONSE = response.data.result;

      promptImage.src = _RESPONSE.imageUrl;
      promptText.innerHTML = _RESPONSE.description
        ? `<h5><q>${_RESPONSE.description.replace("[...]", "")}</q></h5>`
        : "<h6>No description available, sorry... 😓</h6>";
      promptInput.value = "";
      updateCharCount();

      loadingScreen.classList.add("hidden");
      promptForm.classList.remove("hidden");
    })
    .catch(renderError);
};

const getChallenge = () => {
  guessForm.classList.add("hidden");
  loadingScreen.classList.remove("hidden");

  const getChallenge = httpsCallable(functions, "getChallenge");
  getChallenge({ interest: _INTEREST })
    .then((response) => {
      _RESPONSE = response.data.result;

      guessImage.src = _RESPONSE.imageUrl;
      guessPrompt.innerHTML = _RESPONSE.prompt;
      guessText.innerHTML = _RESPONSE.description
        ? `written after reading this <h5><q>${_RESPONSE.description.replace(
            "[...]",
            ""
          )}</q></h5>`
        : "<h6>No context was provided for this image... 😓</h6>";

      loadingScreen.classList.add("hidden");
      guessForm.classList.remove("hidden");
    })
    .catch(renderError);
};

// Form Listeners

resetButton.addEventListener("click", () => {
  const reset = httpsCallable(functions, "reset");
  reset()
    .then(() => {
      renderError();
      window.location.reload();
    })
    .catch(renderError);
});

welcomeForm.addEventListener("submit", (event) => {
  event.preventDefault();

  welcomeForm.classList.add("hidden");
  authForm.classList.remove("hidden");
});

authForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const authData = new FormData(event.target);
  let authPromise;

  switch (event.submitter.name) {
    case "signupButton":
      authPromise = createUserWithEmailAndPassword(
        auth,
        authData.get("email"),
        authData.get("password")
      );
      break;
    case "loginButton":
      authPromise = signInWithEmailAndPassword(
        auth,
        authData.get("email"),
        authData.get("password")
      );
      break;
  }

  authPromise
    .then((userCredential) => {
      _USER = userCredential.user;

      renderError();

      authForm.classList.add("hidden");
      interestsForm.classList.remove("hidden");
    })
    .catch(renderError);
});

interestsForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const interestData = new FormData(event.target);
  _INTEREST = interestData.get("interest");

  interestsForm.classList.add("hidden");
  choiceForm.classList.remove("hidden");
});

choiceForm.addEventListener("submit", (event) => {
  event.preventDefault();

  choiceForm.classList.add("hidden");

  switch (event.submitter.name) {
    case "takeToPrompt":
      getPromptImage();
      break;
    case "takeToGuess":
      getChallenge();
      break;
  }
});

promptForm.addEventListener("submit", (event) => {
  event.preventDefault();

  const promptData = new FormData(event.target);

  switch (event.submitter.name) {
    case "promptSkipButton":
      getPromptImage();
      break;
    case "promptButton":
      const prompt = promptData.get("promptInput");

      if (!prompt) {
        return;
      }

      const createPrompt = httpsCallable(functions, "createPrompt");
      createPrompt({
        imageId: _RESPONSE.imageId,
        interest: _INTEREST,
        prompt,
      })
        .then(getPromptImage)
        .catch(renderError);
      break;
  }
});

promptInput.addEventListener("input", updateCharCount);

guessForm.addEventListener("submit", (event) => {
  event.preventDefault();
});
