import mongoose from 'mongoose';

const TeamSchema = new mongoose.Schema({
  name: {
    type: String,
    required: true,
    unique: true,
    trim: true,
  },
  members: [
    {
      type: mongoose.Schema.Types.ObjectId,
      ref: 'User',
    },
  ],
  hackathon: {
    type: mongoose.Schema.Types.ObjectId,
    ref: 'Hackathon',
    required: true,
  },
  // Vous pouvez ajouter d'autres champs si nécessaire, comme un chef d'équipe, etc.
}, { timestamps: true });

const Team = mongoose.model('Team', TeamSchema);

export default Team;
