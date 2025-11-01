import { Jimp } from 'jimp'
let W = 200
let H = 200
const firstImage = new Jimp({ width: W, height: H, color: 0x000000ff })
firstImage.write('black.png')
const secondImage = new Jimp({
	width: W,
	height: H,
	color: 0xffffffff,
})
secondImage.write('white.png')
const thirdImage = new Jimp({
	width: W,
	height: H,
	color: 0xff0000ff,
})
thirdImage.write('red.png')
const gradientImage = new Jimp({ width: W, height: H, color: 0x000000ff })
gradientImage.scan((x, y, idx) => {
	const value = (x + y) % 256
	gradientImage.bitmap.data[idx] = value
	gradientImage.bitmap.data[idx + 1] = value
	gradientImage.bitmap.data[idx + 2] = value
	gradientImage.bitmap.data[idx + 3] = 255
})
gradientImage.write('gradient.png')
