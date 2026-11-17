// Name labels now avoid the header instead of covering the banner at specific camera angles.
process.argv.push('--all-models');
require('./name-labels.cjs');
