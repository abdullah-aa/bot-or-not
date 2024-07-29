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

const STATE_MAP = {
  LOGGED_OUT: 'loggedOut',
  LOGGED_IN: 'loggedIn',
  SIGNUP: 'signup',
  LOGIN: 'login',
};

const MAX_PROMPT_LENGTH = 150;

const app = initializeApp(firebaseConfig);
const auth = getAuth(app);
const functions = getFunctions(app);

const email = document.getElementById('email');
const password = document.getElementById('password');

const authForm = document.getElementById('authForm');
const authSubmitButton = document.getElementById('authSubmitButton');

const signupButton = document.getElementById('signupButton');
const loginButton = document.getElementById('loginButton');
const authButtons = document.getElementById('authButtons');

const interestsForm = document.getElementById('interestsForm');

const loadingScreen = document.getElementById('loadingScreen');

const promptScreen = document.getElementById('promptScreen');
const promptImage = document.getElementById('promptImage');
const promptText = document.getElementById('promptText');

const promptForm = document.getElementById('promptForm');
const promptInput = document.getElementById('promptInput');
const inputPromptCharCount = document.getElementById('inputPromptCharCount');
const promptSkipButton = document.getElementById('promptSkipButton');

const errorDiv = document.getElementById('errorDiv');
const errorCode = document.getElementById('errorCode');
const errorMessage = document.getElementById('errorMessage');

let _USER, _AUTH_MODE, _INTEREST;

const renderError = (error = null) => {
    if (error) {
        errorDiv.classList.remove('hidden');
        errorCode.innerText = error.code;
        errorMessage.innerText = error.message;
    } else {
        errorDiv.classList.add('hidden');
        errorCode.innerText = '';
        errorMessage.innerText = '';
    }
};

signupButton.addEventListener('click', () => {
  loginButton.classList.remove('hidden');
  signupButton.classList.add('hidden');
  authForm.classList.remove('hidden');
  authSubmitButton.innerText = 'Create Account';
  _AUTH_MODE = STATE_MAP.SIGNUP;
});

loginButton.addEventListener('click', () => {
  loginButton.classList.add('hidden');
  signupButton.classList.remove('hidden');
  authForm.classList.remove('hidden');
  authSubmitButton.innerText = 'Login';
  _AUTH_MODE = STATE_MAP.LOGIN;
});

authForm.addEventListener('submit', (event) => {
  event.preventDefault();

  const showInterestSelection = (userCredential) => {
    _USER = userCredential.user;
    _AUTH_MODE = STATE_MAP.LOGGED_IN;

    authButtons.classList.add('hidden');
    authForm.classList.add('hidden');
    renderError();

    interestsForm.classList.remove('hidden');
  };

  if (_AUTH_MODE === 'signup') {
    createUserWithEmailAndPassword(auth, email.value, password.value)
      .then(showInterestSelection)
      .catch(renderError);
  } else {
    signInWithEmailAndPassword(auth, email.value, password.value)
      .then(showInterestSelection)
      .catch(renderError);
  }
});

const getPromptImage = () => {
    loadingScreen.classList.remove('hidden');

    const getImage = httpsCallable(functions, 'getImage');
    getImage({ interest: _INTEREST })
        .then((result) => {
            loadingScreen.classList.add('hidden');

            promptImage.src = result.data.imageUrl;
            promptText.innerHTML = result.data.description ? `Here's what this image is about: <h5><q>${result.data.description.replace('[...]', '')}</q></h5>` : '<h6>Only the image to work with here sorry... 😓</h6>';
            promptInput.value = '';
            inputPromptCharCount.innerText = `${MAX_PROMPT_LENGTH}/${MAX_PROMPT_LENGTH} characters left`;

            promptScreen.classList.remove('hidden');
        })
        .catch(renderError);
}

interestsForm.addEventListener('submit',(event) => {
    event.preventDefault();

    interestsForm.classList.add('hidden');

    const interestData = new FormData(event.target);
    _INTEREST = interestData.get('interest');

    getPromptImage();
});

promptInput.addEventListener('input', () => {
    const charCount = promptInput.value.length;
    inputPromptCharCount.innerText = `${MAX_PROMPT_LENGTH - charCount}/${MAX_PROMPT_LENGTH} characters left`;
});

promptSkipButton.addEventListener('click', () => {
    promptScreen.classList.add('hidden');
    getPromptImage();
});
