const { planImage, planImageOptional } = require('./backend/middlewares/upload');

console.log('planImage:', typeof planImage);
console.log('planImageOptional:', typeof planImageOptional);

if (typeof planImage === 'object' && planImage !== null) {
  console.log('planImage.single exists:', typeof planImage.single);
  console.log('planImage.single is function:', typeof planImage.single === 'function');
} else {
  console.log('planImage is not an object');
}

if (typeof planImageOptional === 'object' && planImageOptional !== null) {
  console.log('planImageOptional.single exists:', typeof planImageOptional.single);
  console.log('planImageOptional.single is function:', typeof planImageOptional.single === 'function');
} else {
  console.log('planImageOptional is not an object');
}

// Test if we can call single
try {
  const middleware = planImage.single('image');
  console.log('planImage.single("image") works:', typeof middleware === 'function');
} catch (error) {
  console.log('Error calling planImage.single:', error.message);
}

try {
  const middleware2 = planImageOptional.single('image');
  console.log('planImageOptional.single("image") works:', typeof middleware2 === 'function');
} catch (error) {
  console.log('Error calling planImageOptional.single:', error.message);
}
