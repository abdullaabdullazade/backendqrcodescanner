const express = require("express");
const multer = require("multer");
const sharp = require("sharp");
const jsQR = require("jsqr");
const fs = require("fs");
const QRCode = require("qrcode");
const path = require("path");
app = express();

app.use("/uploads", express.static(path.join(__dirname, "uploads")));
app.use("/qrcodes", express.static(path.join(__dirname, "qrcodes")));
app.use(express.json());
app.use(express.urlencoded({ extended: true }));
const PORT = 3000;


const storage = multer.diskStorage({
  destination: "uploads/",
  filename: (req, file, cb) => {
    cb(null, Date.now() + "-" + file.originalname);
  },
});
const upload = multer({ storage });

app.get("/", (req, res) => {
  res.send("abdulla");
});
app.post("/scan", upload.single("image"), async (req, res) => {
  try {
    const imagePath = req.file.path;
    const imageBuffer = fs.readFileSync(imagePath);

    const { data, info } = await sharp(imageBuffer)
      .ensureAlpha()
      .raw()
      .toBuffer({ resolveWithObject: true });

    const qrCode = jsQR(new Uint8ClampedArray(data), info.width, info.height);

    fs.unlinkSync(imagePath);

    if (qrCode) {
      return res.json({ qrCode: qrCode.data });
    } else {
      return res.status(404).json({ error: "No QR code found" });
    }
  } catch (error) {
    console.error("Server Error:", error);
    return res
      .status(500)
      .json({ error: "Internal Server Error", detail: error.message });
  }
});

app.post("/generate", async (req, res) => {
  const { data } = req.body;
  if (!data) return res.status(400).json({ error: "No data provided" });

  let qrContent = "";

  if (typeof data === "object" && data !== null) {
    const target = data.data ?? data;

    const values = Object.entries(target)
      .filter(([key, value]) => typeof value === "string")
      .map(([key, value]) => value);

    if (values.length > 0) {
      qrContent = values.join("\n");
    } else {
      qrContent = JSON.stringify(data);
    }
  } else {
    qrContent = String(data);
  }

  const qrPngBuffer = await QRCode.toBuffer(qrContent, {
    errorCorrectionLevel: "H",
    color: {
      dark: "#ffffff",
      light: "#333333",
    },
    width: 600,
    margin: 1,
  });

  const outputPath = path.join(__dirname, "qrcodes", `${Date.now()}-qr.png`);
  fs.writeFileSync(outputPath, qrPngBuffer);
  res.send({
    url: "/qrcodes/" + path.basename(outputPath),
    data: qrContent,
  });
});

app.listen(PORT, () => {
  console.log(`🚀 Server running on http://localhost:${PORT}`);
});
