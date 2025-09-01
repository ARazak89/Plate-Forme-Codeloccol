// Placeholder for future GitHub API integrations (webhooks, commit checks, etc.)
export function validateGithubUrl(url) {
  return /^https?:\/\/(www\.)?github\.com\//i.test(url);
}

export function getRepoNameFromUrl(url) {
  try {
    const urlObj = new URL(url);
    const pathParts = urlObj.pathname.split("/").filter((part) => part !== "");
    // Expected format: /owner/repo_name
    if (pathParts.length >= 2) {
      return pathParts[1]; // Le nom du dépôt est la deuxième partie après le propriétaire
    }
    return null;
  } catch (error) {
    console.error('Invalid GitHub URL for repo name extraction:', error);
    return null;
  }
}
