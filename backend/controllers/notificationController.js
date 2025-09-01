import Notification from "../models/Notification.js";

export async function listNotifications(req, res) {
  try {
    const notifications = await Notification.find({ user: req.user._id }).sort({
      createdAt: -1,
    });
    res.status(200).json(notifications);
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function markAsRead(req, res) {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndUpdate(
      { _id: id, user: req.user._id },
      { read: true },
      { new: true },
    );

    if (!notification) {
      return res.status(404).json({ error: "Notification non trouvée." });
    }

    res
      .status(200)
      .json({ message: "Notification marquée comme lue.", notification });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function deleteNotification(req, res) {
  try {
    const { id } = req.params;
    const notification = await Notification.findOneAndDelete({
      _id: id,
      user: req.user._id,
    });

    if (!notification) {
      return res.status(404).json({ error: "Notification non trouvée." });
    }

    res.status(200).json({ message: "Notification supprimée avec succès." });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
}

export async function getNotificationsCount(req, res) {
  try {
    const userId = req.user._id;
    const count = await Notification.countDocuments({
      user: userId,
      read: false,
    });
    res.status(200).json({ count });
  } catch (e) {
    console.error("Error in getNotificationsCount:", e);
    res.status(500).json({ error: e.message });
  }
}
