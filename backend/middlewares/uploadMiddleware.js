import multer from "multer";
import path from "path";
import { fileURLToPath } from "url";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

// Configuration du stockage de Multer
const storage = multer.diskStorage({
  destination: (req, file, cb) => {
    // Le dossier où les images seront stockées. Assurez-vous qu'il existe !
    // Dans un environnement de production, vous utiliseriez un service de stockage cloud (S3, Cloudinary, etc.)
    cb(null, path.join(__dirname, "../public/uploads/profile_pictures"));
  },
  filename: (req, file, cb) => {
    // Nom du fichier : user ID + horodatage + extension originale
    const uniqueSuffix = Date.now() + "-" + Math.round(Math.random() * 1e9);
    cb(
      null,
      req.user._id + "-" + uniqueSuffix + path.extname(file.originalname),
    );
  },
});

// Filtre pour n'accepter que les images
const fileFilter = (req, file, cb) => {
  if (file.mimetype.startsWith("image/")) {
    cb(null, true);
  } else {
    cb(new Error("Seules les images sont autorisées !"), false);
  }
};

// Initialisation de Multer
const upload = multer({
  storage: storage,
  fileFilter: fileFilter,
  limits: { fileSize: 1024 * 1024 * 10 }, // Limite de taille de fichier à 10MB
});

export default upload;
