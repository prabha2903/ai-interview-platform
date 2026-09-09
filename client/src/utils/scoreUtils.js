// Shared helpers for rendering AI evaluation / interview scores consistently
// across the Interview Prep, Mock Interview, and Report pages.

export const getScoreTier = (score) => {
  if (score >= 75) return 'high';
  if (score >= 50) return 'medium';
  return 'low';
};

export const getScoreColor = (score) => {
  const tier = getScoreTier(score);
  if (tier === 'high') return 'var(--success)';
  if (tier === 'medium') return 'var(--warning)';
  return 'var(--danger)';
};

export const getScoreClassName = (score) => `score-${getScoreTier(score)}`;

export const getDifficultyBadgeClass = (difficulty) => {
  if (difficulty === 'Easy') return 'badge-success';
  if (difficulty === 'Hard') return 'badge-danger';
  return 'badge-warning';
};
