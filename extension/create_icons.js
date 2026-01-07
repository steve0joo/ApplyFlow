const fs = require('fs');
const { createCanvas } = require('canvas');

const sizes = [16, 32, 48, 64, 128];

if (!fs.existsSync('assets')) {
  fs.mkdirSync('assets');
}

sizes.forEach(size => {
  const canvas = createCanvas(size, size);
  const ctx = canvas.getContext('2d');

  // Blue background (matching ApplyFlow brand)
  ctx.fillStyle = '#3B82F6';
  ctx.fillRect(0, 0, size, size);

  // White "A" letter
  ctx.fillStyle = '#FFFFFF';
  const fontSize = Math.floor(size * 0.7);
  ctx.font = 'bold ' + fontSize + 'px Arial';
  ctx.textAlign = 'center';
  ctx.textBaseline = 'middle';
  ctx.fillText('A', size/2, size/2 + size*0.05);

  const buffer = canvas.toBuffer('image/png');
  fs.writeFileSync('assets/icon' + size + '.png', buffer);
  console.log('Created icon' + size + '.png');
});

console.log('All icons created!');
