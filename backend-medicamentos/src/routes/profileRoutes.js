const router = require("express").Router()
const auth = require("../middlewares/auth")
const User = require("../models/User")

router.get("/", auth, async (req, res) => {
  const user = await User.findById(req.userId).select("-senha")
  res.json(user)
})

module.exports = router