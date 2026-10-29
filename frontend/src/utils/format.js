import { PROB_THRESHOLD } from '../stores/referenceData.js';

export function formatProb(val) {
  return Number(val || 0).toFixed(1) + '%';
}

export function formatBytes(bytes) {
  if (!bytes || bytes <= 0) return '0 KB';
  const kb = bytes / 1024;
  if (kb < 1024) return kb.toFixed(1) + ' KB';
  return (kb / 1024).toFixed(2) + ' MB';
}

export function formatNowTime() {
  const d = new Date();
  const pad = (n) => String(n).padStart(2, '0');
  return `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())} ${pad(d.getHours())}:${pad(d.getMinutes())}`;
}

export function getRiskStyle(levelOrProb, diseaseCode = null) {
  if (diseaseCode === 'no_finding') levelOrProb = 0;
  let level = levelOrProb;
  if (typeof levelOrProb === 'number') {
    if (levelOrProb >= PROB_THRESHOLD.HIGH) level = 'HIGH';
    else if (levelOrProb >= PROB_THRESHOLD.MEDIUM) level = 'MEDIUM';
    else level = 'LOW';
  }
  if (level === 'HIGH') {
    return {
      level: 'HIGH',
      label: '高风险关注',
      shortLabel: '高风险',
      color: '#F53F3F',
      badgeClass: 'border-danger/30 bg-danger/10 text-danger',
      dotClass: 'bg-danger'
    };
  }
  if (level === 'MEDIUM') {
    return {
      level: 'MEDIUM',
      label: '中风险随访',
      shortLabel: '中风险',
      color: '#FF8A00',
      badgeClass: 'border-warning/30 bg-warning/10 text-warning',
      dotClass: 'bg-warning'
    };
  }
  return {
    level: 'LOW',
    label: '低风险正常',
    shortLabel: '低风险',
    color: '#00B42A',
    badgeClass: 'border-success/30 bg-success/10 text-success',
    dotClass: 'bg-success'
  };
}

export function isNormalDominant(probabilities) {
  const noFinding = probabilities.find((item) => item.code === 'no_finding');
  const maxDisease = Math.max(
    ...probabilities
      .filter((item) => item.code !== 'no_finding')
      .map((item) => Number(item.prob) || 0),
    0
  );
  return Number(noFinding?.prob) >= maxDisease;
}

export function escapeHtml(value) {
  return String(value ?? '').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;'
  })[char]);
}
