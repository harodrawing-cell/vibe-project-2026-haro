import firebase from './firebase.js';
import account from './account.js';
export default firebase.createRepository({ auth: account });
