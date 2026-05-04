const fs = require('fs');

async function download() {
  const r = await fetch('https://raw.githubusercontent.com/lutangar/cities.json/master/cities.json');
  const data = await r.json();
  console.log('Total cities:', data.length);
  console.log('First city:', data[0]);
  fs.writeFileSync('./frontend/public/cities.json', JSON.stringify(data));
}

download().catch(console.error);
