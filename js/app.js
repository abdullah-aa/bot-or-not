import { initializeApp } from 'firebase/app';
import {
  getAuth,
  createUserWithEmailAndPassword,
  signInWithEmailAndPassword,
} from 'firebase/auth';

const firebaseConfig = {
  apiKey: "AIzaSyCGzjPbE3MCph6S-3xwPS7Pp_X7a72btr4",
  authDomain: "bot-or-not-erg237.firebaseapp.com",
  projectId: "bot-or-not-erg237",
  storageBucket: "bot-or-not-erg237.appspot.com",
  messagingSenderId: "195354824452",
  appId: "1:195354824452:web:f087178204f04d785a8a51"
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

const email = document.getElementById('email');
const password = document.getElementById('password');

const authForm = document.getElementById('authForm');
const authSubmitButton = document.getElementById('authSubmitButton');

const signupButton = document.getElementById('signupButton');
const loginButton = document.getElementById('loginButton');
const authButtons = document.getElementById('authButtons');

const interestsForm = document.getElementById('interestsForm');
const interestHeader = document.getElementById('interestHeader');

const errorDiv = document.getElementById('errorDiv');
const errorCode = document.getElementById('errorCode');
const errorMessage = document.getElementById('errorMessage');

let _USER, _AUTH_MODE;

const renderError = (error) => {
  errorDiv.classList.remove('hidden');
  errorCode.innerText = error.code;
  errorMessage.innerText = error.message;
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

authForm.addEventListener('submit', async (event) => {
  event.preventDefault();

  const revealPostLogin = (newMode) => {
    authButtons.classList.add('hidden');
    authForm.classList.add('hidden');

    _AUTH_MODE = newMode;

    interestsForm.classList.remove('hidden');
  };

  if (_AUTH_MODE === 'signup') {
    createUserWithEmailAndPassword(auth, email.value, password.value)
      .then((userCredential) => {
        _USER = userCredential.user;
        revealPostLogin(STATE_MAP.NEW_LOGIN);
      })
      .catch(renderError);
  } else {
    signInWithEmailAndPassword(auth, email.value, password.value)
      .then((userCredential) => {
        _USER = userCredential.user;
        revealPostLogin(STATE_MAP.LOGGED_IN);
      })
      .catch(renderError);
  }
});
