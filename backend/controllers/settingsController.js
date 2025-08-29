import Setting from '../models/Settings.js';

export async function getSetting(req, res) {
  try {
    const { key } = req.params;
    const setting = await Setting.findOne({ key });

    if (!setting) {
      return res.status(404).json({ error: 'Paramètre non trouvé.' });
    }

    res.status(200).json(setting);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function updateSetting(req, res) {
  try {
    const { key } = req.params;
    const { value, description } = req.body;

    const setting = await Setting.findOneAndUpdate(
      { key },
      { value, description },
      { new: true, upsert: true, runValidators: true } // upsert: true pour créer si non trouvé
    );

    res.status(200).json({ message: 'Paramètre mis à jour avec succès.', setting });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}
