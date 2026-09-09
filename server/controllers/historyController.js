const AIHistory = require("../models/AIHistory");

// @desc    Get user's AI interaction history
// @route   GET /api/history
// @access  Private
const getHistory = async (req, res, next) => {
  try {
    const { category, search, limit = 50, page = 1 } = req.query;

    const query = { userId: req.user.id };

    if (category && category !== "All") {
      query.category = category;
    }

    if (search) {
      query.$or = [
        { prompt: { $regex: search, $options: "i" } },
        { response: { $regex: search, $options: "i" } },
      ];
    }

    const totalCount = await AIHistory.countDocuments({ userId: req.user.id });
    const filteredCount = await AIHistory.countDocuments(query);

    const history = await AIHistory.find(query)
      .sort({ createdAt: -1 })
      .skip((parseInt(page) - 1) * parseInt(limit))
      .limit(parseInt(limit));

    res.json({
      success: true,
      count: history.length,
      totalCount,
      filteredCount,
      history,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Delete single history item
// @route   DELETE /api/history/:id
// @access  Private
const deleteHistoryItem = async (req, res, next) => {
  try {
    const historyItem = await AIHistory.findById(req.params.id);

    if (!historyItem) {
      res.status(404);
      throw new Error("History item not found");
    }

    // Verify ownership
    if (historyItem.userId.toString() !== req.user.id.toString()) {
      res.status(403);
      throw new Error("Unauthorized to delete this history item");
    }

    await historyItem.deleteOne();

    res.json({
      success: true,
      message: "History item deleted successfully",
      id: req.params.id,
    });
  } catch (error) {
    next(error);
  }
};

// @desc    Clear all user history
// @route   DELETE /api/history
// @access  Private
const clearHistory = async (req, res, next) => {
  try {
    const result = await AIHistory.deleteMany({ userId: req.user.id });

    res.json({
      success: true,
      message: `Cleared ${result.deletedCount} history records successfully`,
      deletedCount: result.deletedCount,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = {
  getHistory,
  deleteHistoryItem,
  clearHistory,
};
