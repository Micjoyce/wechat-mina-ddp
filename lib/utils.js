var sha256 = require('./sha256');

var i = 0;
function uniqueId () {
    return (i++).toString();
}

function contains (array, element) {
    return array.indexOf(element) !== -1;
}
function hashPassword (password) {
  return {
    digest: sha256(password).toString(),
    algorithm: "sha-256"
  }
}

module.exports = {
  uniqueId: uniqueId,
  contains: contains,
  hashPassword: hashPassword,
}
