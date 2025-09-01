import User from "../models/User.js";

export async function autoBlockInactiveUsers() {
  const fourDaysAgo = new Date(Date.now() - 4 * 24 * 60 * 60 * 1000);
  const res = await User.updateMany(
    { lastLogin: { $lt: fourDaysAgo }, status: "active" },
    { status: "blocked" },
  );
  console.log("Auto-blocked users:", res.modifiedCount);
}

export async function attachLastSeen(req, res, next) {
  // If auth is present and valid, auth middleware will set req.user later;
  // Here we only mark last seen after route handler when user is known.
  const end = res.end;
  res.end = async function (...args) {
    try {
      if (req.user) {
        req.user.lastLogin = new Date();
        await req.user.save();
      }
    } catch (error) {
      console.error("Error updating lastLogin:", error);
    }
    end.apply(this, args);
  };
  next();
}
