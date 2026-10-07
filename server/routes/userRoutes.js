const express = require("express");
const router = express.Router();
const { getProfile, updateProfile } = require("../controllers/userController");
const { protect } = require("../middleware/auth");
const { updateProfileValidation } = require("../middleware/validators");

router.get("/profile", protect, getProfile);
router.put("/profile", protect, updateProfileValidation, updateProfile);

module.exports = router;
