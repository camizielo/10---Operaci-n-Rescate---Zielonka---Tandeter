const { users } = require("../data/db");

function listUsers(req, res) {
  return res.status(200).json({
    total: users.length,
    users
  });
}

module.exports = {
  listUsers
};
