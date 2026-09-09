const User = require("../models/User");

// @desc    Get user profile
// @route   GET /api/users/profile
// @access  Private
const getProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id);

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    res.json({
      success: true,
      user,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Update user profile
// @route   PUT /api/users/profile
// @access  Private
const updateProfile = async (req, res, next) => {
  try {
    const user = await User.findById(req.user.id).select("+password");

    if (!user) {
      res.status(404);
      throw new Error("User not found");
    }

    const { name, email, currentPassword, newPassword } = req.body;

    // Update name
    if (name) {
      user.name = name.trim();
    }

    // Update email if changed
    if (email && email.toLowerCase() !== user.email) {
      const emailExists = await User.findOne({
        email: email.toLowerCase(),
        _id: { $ne: user._id },
      });
      if (emailExists) {
        res.status(400);
        throw new Error("Email address is already in use by another account");
      }
      user.email = email.toLowerCase().trim();
    }

    // Update password if requested
    if (newPassword) {
      if (!currentPassword) {
        res.status(400);
        throw new Error("Current password is required to set a new password");
      }

      const isMatch = await user.matchPassword(currentPassword);
      if (!isMatch) {
        res.status(401);
        throw new Error("Current password provided is incorrect");
      }

      if (newPassword.length < 6) {
        res.status(400);
        throw new Error("New password must be at least 6 characters long");
      }

      user.password = newPassword;
    }

    const updatedUser = await user.save();

    res.json({
      success: true,
      message: "Profile updated successfully",
      user: {
        id: updatedUser._id,
        name: updatedUser.name,
        email: updatedUser.email,
        createdAt: updatedUser.createdAt,
        updatedAt: updatedUser.updatedAt,
      },
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getProfile,
  updateProfile,
};
