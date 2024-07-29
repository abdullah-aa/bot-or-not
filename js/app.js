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
  NEW_LOGIN: 'newLogin',
};

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

const errorDiv = document.getElementById('errorDiv');
const errorCode = document.getElementById('errorCode');
const errorMessage = document.getElementById('errorMessage');

let _USER, _AUTH_MODE;

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

interestsForm.addEventListener('submit',(event) => {
    event.preventDefault();

    interestsForm.classList.add('hidden');

    const interestData = new FormData(event.target);
    const interest = interestData.get('interest');

    loadingScreen.classList.remove('hidden');

    const getImage = httpsCallable(functions, 'getImage');
    getImage({ interest })
      .then((result) => {
          loadingScreen.classList.add('hidden');

          promptImage.src = result.data.imageUrl;
          promptText.innerText = result.data.description && result.data.description.replace('[...]', '');
          promptScreen.classList.remove('hidden');

          alert(result.data.id);
      })
      .catch(renderError);
});
