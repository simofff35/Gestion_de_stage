const jwt = require("jsonwebtoken");

module.exports = (req, res, next) => {
  const token = req.cookies.token;
  if (!token) {
    return res.status(401).redirect("/login");
  }

  jwt.verify(token, process.env.SECRET_CODE, (err, user) => {
    if (err) {
      return res.status(403).redirect("/login");
    }
    req.user = user;
    next();
  });
};
