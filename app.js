const bcrypt = require('bcryptjs');

let password = 'supersecret';
console.log(`The password is: ${password}`);
const hash = bcrypt.hashSync(password, 8);

console.log(`The hashed password is ${hash}`);
