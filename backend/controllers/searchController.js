import Project from '../models/Project.js';
import Hackathon from '../models/Hackathon.js';
import User from '../models/User.js';

export async function searchProjects(req, res) {
  try {
    const { q } = req.query;
    const query = { $or: [{ title: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }] };
    const projects = await Project.find(query).populate('student');
    res.status(200).json(projects);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function searchHackathons(req, res) {
  try {
    const { q } = req.query;
    const query = { $or: [{ title: new RegExp(q, 'i') }, { description: new RegExp(q, 'i') }] };
    const hackathons = await Hackathon.find(query);
    res.status(200).json(hackathons);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function searchUsers(req, res) {
  try {
    const { q } = req.query;
    const query = { $or: [{ name: new RegExp(q, 'i') }, { email: new RegExp(q, 'i') }] };
    const users = await User.find(query).select('-password');
    res.status(200).json(users);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
