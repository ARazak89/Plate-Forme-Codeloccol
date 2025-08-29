import mongoose from 'mongoose';
import dotenv from 'dotenv';
import bcrypt from 'bcryptjs';
import User from './models/User.js';
import Project from './models/Project.js';
import Hackathon from './models/Hackathon.js';
import Badge from './models/Badge.js';
import Curriculum from './models/Curriculum.js';
import Evaluation from './models/Evaluation.js';
import Notification from './models/Notification.js';
import Resource from './models/Resource.js';
import Settings from './models/Settings.js';
import AvailabilitySlot from './models/AvailabilitySlot.js';

dotenv.config();

const MONGODB_URI = process.env.MONGODB_URI;

if (!MONGODB_URI) {
  console.error('Error: MONGODB_URI not found in .env file.');
  process.exit(1);
}

const seedDB = async () => {
  try {
    await mongoose.connect(MONGODB_URI);
    console.log('MongoDB Connected...');

    // Clear existing data
    await User.deleteMany({});
    await Project.deleteMany({});
    await Hackathon.deleteMany({});
    await Badge.deleteMany({});
    await Curriculum.deleteMany({});
    await Evaluation.deleteMany({});
    await Notification.deleteMany({});
    await Resource.deleteMany({});
    await Settings.deleteMany({});
    await AvailabilitySlot.deleteMany({});
    console.log('Existing data cleared.');

    // 1. Sample Users
    const usersData = [
      { name: 'Apprenant 1', email: 'apprenant1@codeloccol.com', password: 'password123', role: 'apprenant', level: 1, daysRemaining: 30, totalProjectsCompleted: 0 },
      { name: 'Apprenant 2', email: 'apprenant2@codeloccol.com', password: 'password123', role: 'apprenant', level: 2, daysRemaining: 20, totalProjectsCompleted: 1 },
      { name: 'Apprenant 3', email: 'apprenant3@codeloccol.com', password: 'password123', role: 'apprenant', level: 1, daysRemaining: 45, totalProjectsCompleted: 0 },
      { name: 'Apprenant 4', email: 'apprenant4@codeloccol.com', password: 'password123', role: 'apprenant', level: 3, daysRemaining: 10, totalProjectsCompleted: 2 },
      { name: 'Staff Évaluateur 1', email: 'staff1@codeloccol.com', password: 'password123', role: 'staff' },
      { name: 'Staff Évaluateur 2', email: 'staff2@codeloccol.com', password: 'password123', role: 'staff' },
      { name: 'Admin Superuser', email: 'admin@codeloccol.com', password: 'password123', role: 'admin' },
    ];

    const usersWithHashedPasswords = await Promise.all(usersData.map(async (user) => {
      const salt = await bcrypt.genSalt(10);
      user.password = await bcrypt.hash(user.password, salt);
      return user;
    }));

    const createdUsers = await User.insertMany(usersWithHashedPasswords);
    console.log('Users seeded!');

    const alice = createdUsers.find(u => u.email === 'apprenant1@codeloccol.com');
    const bob = createdUsers.find(u => u.email === 'apprenant2@codeloccol.com');
    const charlie = createdUsers.find(u => u.email === 'apprenant3@codeloccol.com');
    const david = createdUsers.find(u => u.email === 'apprenant4@codeloccol.com');
    const staff1 = createdUsers.find(u => u.email === 'staff1@codeloccol.com');
    const staff2 = createdUsers.find(u => u.email === 'staff2@codeloccol.com');
    const admin = createdUsers.find(u => u.email === 'admin@codeloccol.com');

    // 2. Sample Project Templates
    const projectTemplates = [
      { title: 'Landing Page Responsive (Projet 1)', description: 'Créer une page d\'atterrissage entièrement responsive.', specifications: 'Doit utiliser Flexbox/Grid, être mobile-first.', demoVideoUrl: 'https://youtube.com/landpage_demo', size: 'short', status: 'template', order: 1 },
      { title: 'API RESTful Express (Projet 2)', description: 'Développer une API pour gérer des tâches avec Node.js et Express.', specifications: 'CRUD pour les tâches, authentification JWT.', demoVideoUrl: 'https://youtube.com/api_demo', size: 'medium', status: 'template', order: 2 },
      { title: 'Application Todo List React (Projet 3)', description: 'Construire une application de liste de tâches avec React et un état local.', specifications: 'Ajouter, supprimer, marquer comme complété.', demoVideoUrl: 'https://youtube.com/todo_react_demo', size: 'short', status: 'template', order: 3 },
      { title: 'Blog Fullstack MERN (Projet 4)', description: 'Développer un blog complet avec MERN stack.', specifications: 'Authentification, CRUD posts, commentaires.', demoVideoUrl: 'https://youtube.com/blog_mern_demo', size: 'long', status: 'template', order: 4 },
    ];
    const createdProjectTemplates = await Project.insertMany(projectTemplates);
    console.log('Project Templates seeded!');

    const firstProjectTemplate = createdProjectTemplates.find(p => p.order === 1);

    // 3. Projects assigned to students and their statuses
    const studentProjectsData = [
      // Assigned projects for all learners, starting with the first template
      { title: firstProjectTemplate.title, description: firstProjectTemplate.description, specifications: firstProjectTemplate.specifications, demoVideoUrl: firstProjectTemplate.demoVideoUrl, student: alice._id, status: 'assigned', size: firstProjectTemplate.size, templateProject: firstProjectTemplate._id },
      { title: firstProjectTemplate.title, description: firstProjectTemplate.description, specifications: firstProjectTemplate.specifications, demoVideoUrl: firstProjectTemplate.demoVideoUrl, student: bob._id, status: 'assigned', size: firstProjectTemplate.size, templateProject: firstProjectTemplate._id },
      { title: firstProjectTemplate.title, description: firstProjectTemplate.description, specifications: firstProjectTemplate.specifications, demoVideoUrl: firstProjectTemplate.demoVideoUrl, student: charlie._id, status: 'assigned', size: firstProjectTemplate.size, templateProject: firstProjectTemplate._id },
      { title: firstProjectTemplate.title, description: firstProjectTemplate.description, specifications: firstProjectTemplate.specifications, demoVideoUrl: firstProjectTemplate.demoVideoUrl, student: david._id, status: 'assigned', size: firstProjectTemplate.size, templateProject: firstProjectTemplate._id },

      // Example of a submitted project (Bob's, awaiting peer review, based on first template)
      { title: 'App météo simple', description: 'Afficher la météo actuelle pour une ville donnée.', repoUrl: 'https://github.com/bob/weather-app', student: bob._id, status: 'pending', size: 'short', templateProject: firstProjectTemplate._id },
      // Example of an approved project (Charlie's Calculator, based on first template)
      { title: 'Calculatrice JS', description: 'Une calculatrice fonctionnelle en JavaScript.', repoUrl: 'https://github.com/charlie/calculator', student: charlie._id, status: 'approved', size: 'short', templateProject: firstProjectTemplate._id },
      // Example of a rejected project (David's Memory Game, based on first template)
      { title: 'Jeu de mémoire', description: 'Un jeu de paires à mémoriser.', repoUrl: 'https://github.com/david/memory-game', student: david._id, status: 'rejected', size: 'short', templateProject: firstProjectTemplate._id },
      // Example of a project awaiting staff review (Alice's Netflix clone, based on first template)
      { title: 'Clone Netflix', description: 'Réplique de l\'interface Netflix.', repoUrl: 'https://github.com/alice/netflix-clone', student: alice._id, status: 'awaiting_staff_review', size: 'medium', templateProject: firstProjectTemplate._id },
    ];
    const createdStudentProjects = await Project.insertMany(studentProjectsData);
    console.log('Student Projects seeded!');

    // Update users with their assigned projects
    for (const project of createdStudentProjects) {
      await User.findByIdAndUpdate(project.student, { $push: { projects: project._id } });
    }
    console.log('Users updated with assigned projects!');

    // 4. Availability Slots
    const now = new Date();
    const fiveMinutesAgo = new Date(now.getTime() - 5 * 60 * 1000); // 5 minutes ago
    const oneHourFromNow = new Date(now.getTime() + 60 * 60 * 1000); // 1 hour from now
    const tomorrow9am = new Date(new Date().setHours(9, 0, 0, 0) + (1 * 24 * 60 * 60 * 1000));
    const tomorrow945am = new Date(new Date().setHours(9, 45, 0, 0) + (1 * 24 * 60 * 60 * 1000));
    const dayAfterTomorrow11am = new Date(new Date().setHours(11, 0, 0, 0) + (2 * 24 * 60 * 60 * 1000));
    const dayAfterTomorrow1145am = new Date(new Date().setHours(11, 45, 0, 0) + (2 * 24 * 60 * 60 * 1000));
    const dayAfterTomorrow13pm = new Date(new Date().setHours(13, 0, 0, 0) + (2 * 24 * 60 * 60 * 1000));
    const dayAfterTomorrow1345pm = new Date(new Date().setHours(13, 45, 0, 0) + (2 * 24 * 60 * 60 * 1000));
    const threeDaysFromNow10am = new Date(new Date().setHours(10, 0, 0, 0) + (3 * 24 * 60 * 60 * 1000));
    const threeDaysFromNow1045am = new Date(new Date().setHours(10, 45, 0, 0) + (3 * 24 * 60 * 60 * 1000));

    const availabilitySlotsData = [
      // Booked slot for Alice's Netflix clone evaluated by Apprenant 2
      { evaluator: bob._id, startTime: fiveMinutesAgo, endTime: oneHourFromNow, isBooked: true, bookedByStudent: alice._id, bookedForProject: createdStudentProjects.find(p => p.title === 'Clone Netflix')._id },
      // Booked slot for Alice's Netflix clone evaluated by Apprenant 3
      { evaluator: charlie._id, startTime: new Date(fiveMinutesAgo.getTime() + 10 * 60 * 1000), endTime: new Date(oneHourFromNow.getTime() + 10 * 60 * 1000), isBooked: true, bookedByStudent: alice._id, bookedForProject: createdStudentProjects.find(p => p.title === 'Clone Netflix')._id },
      
      // Unbooked slot for Apprenant 3 (tomorrow)
      { evaluator: charlie._id, startTime: tomorrow9am, endTime: tomorrow945am, isBooked: false },
      // Unbooked slot for Apprenant 4 (as peer evaluator, day after tomorrow)
      { evaluator: david._id, startTime: dayAfterTomorrow11am, endTime: dayAfterTomorrow1145am, isBooked: false },
      // Another unbooked slot for Apprenant 1 (day after tomorrow)
      { evaluator: alice._id, startTime: dayAfterTomorrow13pm, endTime: dayAfterTomorrow1345pm, isBooked: false },
      // Another unbooked slot for Apprenant 2 (three days from now)
      { evaluator: bob._id, startTime: threeDaysFromNow10am, endTime: threeDaysFromNow1045am, isBooked: false },
    ];
    const createdAvailabilitySlots = await AvailabilitySlot.insertMany(availabilitySlotsData);
    console.log('Availability Slots seeded!');

    const aliceNetflixCloneProject = createdStudentProjects.find(p => p.title === 'Clone Netflix');
    const aliceNetflixSlot1 = createdAvailabilitySlots.find(s => s.bookedForProject?.equals(aliceNetflixCloneProject._id) && s.evaluator.equals(bob._id));
    const aliceNetflixSlot2 = createdAvailabilitySlots.find(s => s.bookedForProject?.equals(aliceNetflixCloneProject._id) && s.evaluator.equals(charlie._id));

    const charlieCalculatorProject = createdStudentProjects.find(p => p.title === 'Calculatrice JS');
    const davidMemoryGameProject = createdStudentProjects.find(p => p.title === 'Jeu de mémoire');
    
    // Arbitrary slots for past evaluations (since their booking logic isn't simulated here)
    const arbitrarySlot1 = createdAvailabilitySlots[2]; // Unbooked slot for Apprenant 3 (tomorrow)
    const arbitrarySlot2 = createdAvailabilitySlots[3]; // Unbooked slot for Apprenant 4 (as peer evaluator, day after tomorrow)

    // 5. Evaluations
    const evaluationsData = [
      // Pending evaluation for Alice's Netflix clone by Apprenant 2
      { 
        project: aliceNetflixCloneProject._id, 
        student: alice._id, 
        evaluator: bob._id, 
        slot: aliceNetflixSlot1._id, 
        status: 'pending', 
        feedback: {}
      },
      // Pending evaluation for Alice's Netflix clone by Apprenant 3
      { 
        project: aliceNetflixCloneProject._id, 
        student: alice._id, 
        evaluator: charlie._id, 
        slot: aliceNetflixSlot2._id, 
        status: 'pending', 
        feedback: {}
      },
      // Approved evaluation for Charlie's Calculator by Apprenant 1
      { 
        project: charlieCalculatorProject._id, 
        student: charlie._id, 
        evaluator: alice._id, 
        slot: arbitrarySlot1._id, 
        status: 'accepted', 
        feedback: {
          assiduite: 'Excellent engagement.',
          comprehension: 'Bonne compréhension des concepts de base.',
          specifications: 'Toutes les spécifications respectées.',
          maitrise_concepts: 'Maîtrise satisfaisante des fonctions JS.',
          capacite_expliquer: 'Très clair dans ses explications.',
        }
      },
      // Approved evaluation for Charlie's Calculator by Apprenant 2
      { 
        project: charlieCalculatorProject._id, 
        student: charlie._id, 
        evaluator: bob._id, // Autre apprenant évaluateur
        slot: arbitrarySlot2._id, 
        status: 'accepted', 
        feedback: {
          assiduite: 'Très bon effort et régularité.',
          comprehension: 'Bonne compréhension et application.',
          specifications: 'Respect des spécifications avec créativité.',
          maitrise_concepts: 'Concepts bien intégrés.',
          capacite_expliquer: 'Pédagogue dans ses explications.',
        }
      },
      // Rejected evaluation for David's Memory Game by Apprenant 1
      { 
        project: davidMemoryGameProject._id, 
        student: david._id, 
        evaluator: alice._id, 
        slot: arbitrarySlot1._id, 
        status: 'rejected', 
        feedback: {
          assiduite: 'Engagement limité.',
          comprehension: 'Quelques difficultés avec les algorithmes.',
          specifications: 'Certaines spécifications non implémentées.',
          maitrise_concepts: 'Nécessite une meilleure compréhension.',
          capacite_expliquer: 'Explications confuses.',
        }
      },
      // Rejected evaluation for David's Memory Game by Apprenant 2
      { 
        project: davidMemoryGameProject._id, 
        student: david._id, 
        evaluator: bob._id, // Autre apprenant évaluateur
        slot: arbitrarySlot2._id, 
        status: 'rejected', 
        feedback: {
          assiduite: 'Manque de régularité.',
          comprehension: 'Difficultés à résoudre des problèmes complexes.',
          specifications: 'Non-conformité aux spécifications clés.',
          maitrise_concepts: 'Absence de maîtrise des concepts.',
          capacite_expliquer: 'Difficulté à structurer ses idées.',
        }
      },
    ];
    await Evaluation.insertMany(evaluationsData);
    console.log('Evaluations seeded!');

    // 6. Other sample data (Hackathons, Badges, Curriculums, Resources, Settings, Notifications)
    const hackathons = [
      { title: 'Hackathon Printemps', description: 'Développement d\'une application web durable.', startDate: new Date(), endDate: new Date(Date.now() + 7 * 24 * 60 * 60 * 1000), projects: [], participants: [alice._id, bob._id], status: 'active' },
    ];
    await Hackathon.insertMany(hackathons);
    console.log('Hackathons seeded!');

    const badges = [
      { name: 'Premier Projet Réussi', description: 'A complété son premier projet avec succès.', icon: '🏆' },
      { name: 'Expert Frontend', description: 'Maîtrise les technologies frontend avancées.', icon: '🌟' },
    ];
    await Badge.insertMany(badges);
    console.log('Badges seeded!');

    const curriculums = [
      { name: 'Introduction au Dev Web', description: 'Les bases de HTML, CSS, JavaScript.', modules: [{ title: 'Module HTML/CSS', resources: [], projects: [] }], students: [alice._id, charlie._id] },
    ];
    const createdCurriculums = await Curriculum.insertMany(curriculums);
    console.log('Curriculums seeded!');

    const resources = [
      { title: 'Guide HTML pour débutants', description: 'Un guide complet pour apprendre le HTML.', url: 'https://www.example.com/html-guide', type: 'document', moduleId: createdCurriculums[0].modules[0]._id },
    ];
    await Resource.insertMany(resources);
    console.log('Resources seeded!');

    const settings = [
      { key: 'platformName', value: 'CodeLoccol 2.0', description: 'Nom de la plateforme.' },
    ];
    await Settings.insertMany(settings);
    console.log('Settings seeded!');

    const notifications = [
      { user: alice._id, message: 'Votre projet "Mon Premier Portfolio" a été assigné.', type: 'project_assigned', read: false },
      { user: bob._id, message: 'Vous avez une nouvelle évaluation à faire pour le projet "App météo simple".', type: 'evaluation_pending', read: false },
    ];
    await Notification.insertMany(notifications);
    console.log('Notifications seeded!');

    console.log('Database seeded successfully!');
    mongoose.connection.close();
  } catch (err) {
    console.error('Error seeding database:', err);
    mongoose.connection.close();
    process.exit(1);
  }
};

seedDB();
