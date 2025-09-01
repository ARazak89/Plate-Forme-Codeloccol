import Resource from '../models/Resource.js';

export async function createResource(req, res) {
  try {
    const resource = await Resource.create(req.body);
    res.status(201).json(resource);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function listResources(req, res) {
  try {
    const resources = await Resource.find().populate('moduleId');
    res.status(200).json(resources);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function getResourceById(req, res) {
  try {
    const { id } = req.params;
    const resource = await Resource.findById(id).populate('moduleId');
    if (!resource)
      return res.status(404).json({ error: 'Ressource non trouvée.' });
    res.status(200).json(resource);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateResource(req, res) {
  try {
    const { id } = req.params;
    const updatedData = req.body;

    const resource = await Resource.findByIdAndUpdate(id, updatedData, {
      new: true,
      runValidators: true,
    });

    if (!resource) {
      return res.status(404).json({ error: 'Ressource non trouvée.' });
    }

    res
      .status(200)
      .json({ message: 'Ressource mise à jour avec succès.', resource });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function deleteResource(req, res) {
  try {
    const { id } = req.params;
    const resource = await Resource.findByIdAndDelete(id);

    if (!resource) {
      return res.status(404).json({ error: 'Ressource non trouvée.' });
    }

    res.status(200).json({ message: 'Ressource supprimée avec succès.' });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
