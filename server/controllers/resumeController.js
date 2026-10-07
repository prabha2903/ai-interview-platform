const mammoth = require("mammoth");

// pdf-parse is required lazily inside the handler so a missing/broken binary
// dependency can never crash server startup — only the upload request itself.

// @desc    Parse an uploaded resume file (PDF/DOCX/TXT) into plain text
// @route   POST /api/interviews/parse-resume
// @access  Private
const parseResume = async (req, res, next) => {
  try {
    if (!req.file) {
      res.status(400);
      throw new Error("No resume file was uploaded");
    }

    const { mimetype, buffer, originalname } = req.file;
    let text = "";

    if (mimetype === "application/pdf") {
      const pdfParse = require("pdf-parse");
      const parsed = await pdfParse(buffer);
      text = parsed.text;
    } else if (
      mimetype === "application/vnd.openxmlformats-officedocument.wordprocessingml.document"
    ) {
      const result = await mammoth.extractRawText({ buffer });
      text = result.value;
    } else if (mimetype === "text/plain") {
      text = buffer.toString("utf-8");
    } else {
      res.status(400);
      throw new Error("Unsupported file type");
    }

    text = text.replace(/\r\n/g, "\n").replace(/\n{3,}/g, "\n\n").trim();

    if (!text) {
      res.status(422);
      throw new Error(
        "Could not extract any text from this file. It may be a scanned/image-only document — try pasting your resume text instead."
      );
    }

    if (text.length > 20000) {
      text = text.slice(0, 20000);
    }

    res.json({
      success: true,
      fileName: originalname,
      resumeText: text,
    });
  } catch (error) {
    next(error);
  }
};

module.exports = { parseResume };
