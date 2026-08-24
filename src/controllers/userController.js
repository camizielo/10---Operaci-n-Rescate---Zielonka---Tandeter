const { users } = require("../data/db");

function getProfile(req, res) {
  const user = users.find((u) => u.id === req.user.id);

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  const { password, ...safeUser } = user;
  return res.json({ user: safeUser });
}

function updateMe(req, res) {
  const userId = req.user.id;
  const user = users.find((u) => u.id === userId);

  if (!user) {
    return res.status(404).json({ message: "Usuario no encontrado" });
  }

  const { name } = req.body;
  user.name = name || user.name;

  const { password, ...safeUser } = user;
  return res.status(200).json({ message: "Perfil actualizado", user: safeUser });
}

module.exports = {
  getProfile,
  updateMe
};
