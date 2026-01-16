const fs = require('fs');
const artifact = JSON.parse(fs.readFileSync('./contracts/artifacts/contracts/SimpleKeno.sol/SimpleKeno.json', 'utf8'));
fs.writeFileSync('./abi/SimpleKeno.json', JSON.stringify(artifact.abi, null, 2));
console.log('ABI extracted successfully');
