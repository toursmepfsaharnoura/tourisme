module.exports = {
  formatDate: function (date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) return '';
    return d.toLocaleDateString('fr-FR', {
      day: '2-digit',
      month: '2-digit',
      year: 'numeric'
    });
  },
  eq: function (a, b) { return a === b; },
  ne: function (a, b) { return a !== b; },
  and: function (a, b) { return a && b; },
  gt: function (a, b) { return a > b; },
  lt: function (a, b) { return a < b; },
  mod: function (a, b) { return a % b; },
  times: function (n, options) {
    let result = '';
    for (let i = 0; i < n; i++) {
      result += options.fn(this);
    }
    return result;
  },
  substring: function (str, start, end) {
    if (!str) return '';
    return str.substring(start, end || str.length);
  },
  split: function (str, separator) {
    if (!str) return [];
    return str.split(separator).map(s => s.trim()).filter(s => s);
  },
  uploadPath: function (assetPath) {
    if (!assetPath) return '';
    if (typeof assetPath !== 'string') return '';
    const trimmed = assetPath.trim();
    if (trimmed.startsWith('http://') || trimmed.startsWith('https://') || trimmed.startsWith('//')) {
      return trimmed;
    }
    return trimmed.startsWith('/') ? trimmed : '/' + trimmed.replace(/^\/+/, '');
  },
  formatDateForInput: function (date) {
    if (!date) return '';
    const d = new Date(date);
    if (isNaN(d.getTime())) {
      const parts = date.split(/[-\/]/);
      if (parts.length === 3) {
        const [day, month, year] = parts;
        return `${year.padStart(4, '0')}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
      }
      return '';
    }
    const year = d.getFullYear();
    const month = String(d.getMonth() + 1).padStart(2, '0');
    const day = String(d.getDate()).padStart(2, '0');
    return `${year}-${month}-${day}`;
  },
  calculateDays: function (startDate, endDate) {
    if (!startDate || !endDate) return '';
    const start = new Date(startDate);
    const end = new Date(endDate);
    if (isNaN(start.getTime()) || isNaN(end.getTime())) return '';
    const diffTime = Math.abs(end - start);
    const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24)) + 1; // +1 pour inclure le jour de départ
    return diffDays;
  }
};