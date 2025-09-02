import { Strategy as GoogleStrategy } from "passport-google-oauth20";
import { Strategy as GitHubStrategy } from "passport-github2";
import User from "../models/User.js";
import Project from "../models/Project.js"; // Importer le modèle Project

export default function (passport) {
  // Vérification des variables d'environnement pour OAuth
  if (!process.env.GOOGLE_CLIENT_ID)
    console.error("Erreur: GOOGLE_CLIENT_ID non défini dans .env");
  if (!process.env.GOOGLE_CLIENT_SECRET)
    console.error("Erreur: GOOGLE_CLIENT_SECRET non défini dans .env");
  if (!process.env.GITHUB_CLIENT_ID)
    console.error("Erreur: GITHUB_CLIENT_ID non défini dans .env");
  if (!process.env.GITHUB_CLIENT_SECRET)
    console.error("Erreur: GITHUB_CLIENT_SECRET non défini dans .env");

  passport.serializeUser((user, done) => {
    done(null, user.id);
  });

  passport.deserializeUser(async (id, done) => {
    try {
      const user = await User.findById(id);
      done(null, user);
    } catch (err) {
      done(err, null);
    }
  });

  // Google Strategy
  passport.use(
    new GoogleStrategy(
      {
        clientID: process.env.GOOGLE_CLIENT_ID,
        clientSecret: process.env.GOOGLE_CLIENT_SECRET,
        callbackURL: "/api/auth/google/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ googleId: profile.id });
          if (user) {
            done(null, user);
          } else {
            user = await User.create({
              googleId: profile.id,
              name: profile.displayName,
              email: profile.emails[0].value,
              password: null,
              role: "apprenant", // Assigner le rôle d'apprenant par défaut
            });

            // Assigner automatiquement le projet d'ordre 1 au nouvel apprenant
            const firstProjectTemplate = await Project.findOne({
              order: 1,
              status: "template",
            });

            if (firstProjectTemplate) {
              const assignedProject = await Project.create({
                title: firstProjectTemplate.title,
                description: firstProjectTemplate.description,
                objectives: firstProjectTemplate.objectives,
                specifications: firstProjectTemplate.specifications,
                demoVideoUrl: firstProjectTemplate.demoVideoUrl,
                exerciseStatements: firstProjectTemplate.exerciseStatements,
                resourceLinks: firstProjectTemplate.resourceLinks,
                size: firstProjectTemplate.size,
                order: firstProjectTemplate.order,
                status: "assigned", // Le statut est 'assigned' pour l'apprenant
                student: user._id, // Assigné à ce nouvel apprenant
                templateProject: firstProjectTemplate._id, // Référence au template
              });

              user.projects.push(assignedProject._id);
              await user.save();
            }
            done(null, user);
          }
        } catch (err) {
          done(err, null);
        }
      },
    ),
  );

  // GitHub Strategy
  passport.use(
    new GitHubStrategy(
      {
        clientID: process.env.GITHUB_CLIENT_ID,
        clientSecret: process.env.GITHUB_CLIENT_SECRET,
        callbackURL: "/api/auth/github/callback",
      },
      async (accessToken, refreshToken, profile, done) => {
        try {
          let user = await User.findOne({ githubId: profile.id });
          if (user) {
            done(null, user);
          } else {
            user = await User.create({
              githubId: profile.id,
              name: profile.displayName || profile.username,
              email:
                profile.emails && profile.emails.length > 0
                  ? profile.emails[0].value
                  : null,
              password: null,
              role: "apprenant", // Assigner le rôle d'apprenant par défaut
            });

            // Assigner automatiquement le projet d'ordre 1 au nouvel apprenant
            const firstProjectTemplate = await Project.findOne({
              order: 1,
              status: "template",
            });

            if (firstProjectTemplate) {
              const assignedProject = await Project.create({
                title: firstProjectTemplate.title,
                description: firstProjectTemplate.description,
                objectives: firstProjectTemplate.objectives,
                specifications: firstProjectTemplate.specifications,
                demoVideoUrl: firstProjectTemplate.demoVideoUrl,
                exerciseStatements: firstProjectTemplate.exerciseStatements,
                resourceLinks: firstProjectTemplate.resourceLinks,
                size: firstProjectTemplate.size,
                order: firstProjectTemplate.order,
                status: "assigned", // Le statut est 'assigned' pour l'apprenant
                student: user._id, // Assigné à ce nouvel apprenant
                templateProject: firstProjectTemplate._id, // Référence au template
              });

              user.projects.push(assignedProject._id);
              await user.save();
            }
            done(null, user);
          }
        } catch (err) {
          done(err, null);
        }
      },
    ),
  );
}
