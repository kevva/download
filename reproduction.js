const download = require('./');

download('https://nodejs.org/dist/v4.4.5/node-v4.4.5-linux-x86.tar.xz')
	.then(res => console.log(`done ${res.length}`))
	.catch(e => console.log(e));

