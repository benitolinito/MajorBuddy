const fs = require('fs');
const path = require('path');

const csvPath = path.resolve(__dirname, '../src/data/Most-Recent-Cohorts-Institution.csv');
const outputPath = path.resolve(__dirname, '../src/data/universities.ts');

if (!fs.existsSync(csvPath)) {
  console.error(`CSV file not found at ${csvPath}.`);
  process.exit(1);
}

const csvText = fs.readFileSync(csvPath, 'utf8');
const lines = csvText.split(/\r?\n/).filter((line) => line.trim().length > 0);
if (lines.length <= 1) {
  console.error('CSV file appears to be empty.');
  process.exit(1);
}

const splitCSVLine = (line) => {
  const values = [];
  let current = '';
  let inQuotes = false;
  for (let i = 0; i < line.length; i++) {
    const char = line[i];
    if (char === '"') {
      if (inQuotes && line[i + 1] === '"') {
        current += '"';
        i += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }
    if (char === ',' && !inQuotes) {
      values.push(current);
      current = '';
    } else {
      current += char;
    }
  }
  values.push(current);
  return values;
};

const header = splitCSVLine(lines[0]);
const requiredColumns = ['INSTNM', 'CURROPER', 'SCH_DEG', 'PREDDEG', 'UGDS'];
const colIndex = Object.fromEntries(requiredColumns.map((key) => [key, header.indexOf(key)]));
const missing = Object.entries(colIndex)
  .filter(([, idx]) => idx === -1)
  .map(([key]) => key);
if (missing.length) {
  console.error(`Missing required columns in CSV: ${missing.join(', ')}`);
  process.exit(1);
}

const normalizeName = (value) => value.replace(/\s+/g, ' ').trim();

const prioritySchools = [
  'Harvard University',
  'Yale University',
  'Princeton University',
  'Columbia University in the City of New York',
  'Cornell University',
  'University of Pennsylvania',
  'Brown University',
  'Dartmouth College',
  'Massachusetts Institute of Technology',
  'Stanford University',
  'University of California, Berkeley',
  'University of California-Los Angeles',
  'University of Michigan-Ann Arbor',
  'University of Chicago',
  'California Institute of Technology',
  'University of Southern California',
  'University of Texas at Austin',
  'University of Washington-Seattle Campus',
  'University of Florida',
  'Georgia Institute of Technology-Main Campus',
  'Northwestern University',
  'Duke University',
  'Johns Hopkins University',
  'Carnegie Mellon University',
  'Rice University',
  'University of Notre Dame',
  'Vanderbilt University',
  'Emory University',
  'University of Virginia-Main Campus',
  'Boston University',
  'New York University',
  'Purdue University-Main Campus',
  'Arizona State University Campus Immersion',
  'Pennsylvania State University-Main Campus',
  'University of Wisconsin-Madison',
  'Texas A & M University-College Station',
  'University of North Carolina at Chapel Hill',
  'Michigan State University',
  'Indiana University-Bloomington',
  'Ohio State University-Main Campus',
  'University of Maryland-College Park',
  'University of California-San Diego',
  'University of Illinois Urbana-Champaign',
  'University of Minnesota-Twin Cities',
  'University of Georgia',
  'University of Arizona',
  'University of Colorado Boulder',
  'University of Pittsburgh-Pittsburgh Campus',
  'University of Miami',
  'Boston College',
  'University of California-Davis',
  'University of California-Irvine',
  'University of Rochester',
  'Wake Forest University',
  'Georgetown University',
  'Tufts University',
  'Northeastern University',
  'University of California-Santa Barbara',
  'University of California-Santa Cruz',
  'Case Western Reserve University',
  'University of Massachusetts-Amherst',
  'Syracuse University',
  'Rensselaer Polytechnic Institute',
  'Lehigh University',
  'Villanova University'
];
const priorityMap = new Map(prioritySchools.map((name, index) => [name.toLowerCase(), prioritySchools.length - index]));

const institutions = new Map();
for (let i = 1; i < lines.length; i++) {
  const cols = splitCSVLine(lines[i]);
  if (!cols.length) continue;
  const operating = cols[colIndex.CURROPER] === '1';
  const degreeGranting = cols[colIndex.SCH_DEG] === '1' || Number(cols[colIndex.PREDDEG]) >= 2;
  const instName = cols[colIndex.INSTNM];
  if (!operating || !degreeGranting || !instName) continue;
  const normalized = normalizeName(instName);
  if (!normalized) continue;
  const ugdsRaw = cols[colIndex.UGDS];
  const ugds = Number(ugdsRaw);
  const priorityBoost = priorityMap.get(normalized.toLowerCase()) ?? 0;
  const existing = institutions.get(normalized);
  const ugdsValue = Number.isFinite(ugds) ? ugds : 0;
  if (!existing || ugdsValue > existing.ugds) {
    institutions.set(normalized, { ugds: ugdsValue, priority: priorityBoost });
  }
}

const prioritized = Array.from(institutions.entries()).map(([name, data]) => {
  const score = data.ugds + data.priority * 1_000_000;
  return { name, score };
});

prioritized.sort((a, b) => {
  if (b.score !== a.score) return b.score - a.score;
  return a.name.localeCompare(b.name, 'en', { sensitivity: 'base' });
});

const MAX_UNIVERSITIES = 1000;
const sliced = prioritized.slice(0, MAX_UNIVERSITIES).map((item) => item.name);

const fileHeader = `// Generated by scripts/generate-universities.js\n// Source: U.S. Department of Education College Scorecard\n// Top ${MAX_UNIVERSITIES} high-visibility institutions\nexport const UNIVERSITY_SUGGESTIONS = `;
const fileContent = `${fileHeader}${JSON.stringify(sliced, null, 2)} as const;\n`;

fs.writeFileSync(outputPath, fileContent);
console.log(`Wrote ${sliced.length} universities (from ${institutions.size} operating institutions) to ${path.relative(process.cwd(), outputPath)}`);
