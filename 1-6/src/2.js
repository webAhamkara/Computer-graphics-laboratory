import { Jimp } from 'jimp'

async function mainOne() {
	const image = await Jimp.read('black.png')
	const x0 = 100
	const y0 = 100
	const x1 = 10
	const y1 = 10
	const color = 0xffffffff
	dottedLine(image, x0, y0, x1, y1, color)
	await image.write('first.png')
}

async function mainTwo() {
	const image = await Jimp.read('black.png')
	const width = image.bitmap.width
	const height = image.bitmap.height
	const centerX = width / 2
	const centerY = height / 2
	const radius = 95
	const color = 0xffffffff
	for (let i = 0; i < 13; i++) {
		const alpha = (2 * Math.PI * i) / 13
		const endX = centerX + radius * Math.cos(alpha)
		const endY = centerY + radius * Math.sin(alpha)
		dottedLine(image, centerX, centerY, endX, endY, color)
	}
	await image.write('second.png')
}

function dottedLine(image, x0, y0, x1, y1, color) {
	const count = Math.sqrt((x0 - x1) ** 2 + (y0 - y1) ** 2)
	const step = 1 / count
	for (let t = 0; t < 1; t += step) {
		const x = Math.round((1 - t) * x0 + t * x1)
		const y = Math.round((1 - t) * y0 + t * y1)
		image.setPixelColor(color, x, y)
	}
}

async function mainThree() {
	const image = await Jimp.read('black.png')
	const width = image.bitmap.width
	const height = image.bitmap.height
	const centerX = width / 2
	const centerY = height / 2
	const radius = 95
	const color = 0xffffffff
	for (let i = 0; i < 13; i++) {
		const alpha = (2 * Math.PI * i) / 13
		const endX = centerX + radius * Math.cos(alpha)
		const endY = centerY + radius * Math.sin(alpha)
		x_loop_line(image, centerX, centerY, endX, endY, color)
	}
	await image.write('third.png')
}

function x_loop_line(image, x0, y0, x1, y1, color) {
	let swap = false
	if (Math.abs(x0 - x1) < Math.abs(y0 - y1)) {
		;[x0, y0] = [y0, x0]
		;[x1, y1] = [y1, x1]
		swap = true
	}
	if (x0 > x1) {
		;[x0, x1] = [x1, x0]
		;[y0, y1] = [y1, y0]
	}

	if (Math.abs(x0 - x1) < 0.000001) {
		//для отрисовки вертикальных линий, где (x1-x0) равен нулю
		const startY = Math.min(y0, y1)
		const endY = Math.max(y0, y1)
		for (let y = startY; y <= endY; y++) {
			image.setPixelColor(color, x0, y)
		}
		return
	}

	for (let x = x0; x < x1; x++) {
		const t = (x - x0) / (x1 - x0)
		const y = Math.round((1.0 - t) * y0 + t * y1)
		if (swap) {
			image.setPixelColor(color, y, x) //должны зафиксировать координаты именно в таком порядке, так как до этого мы как бы переворачивали систему координат
		} else {
			image.setPixelColor(color, x, y)
		}
	}
}

async function mainFour() {
	const image = await Jimp.read('black.png')
	const width = image.bitmap.width
	const height = image.bitmap.height
	const centerX = width / 2
	const centerY = height / 2
	const radius = 95
	const color = 0xffffffff
	for (let i = 0; i < 13; i++) {
		const alpha = (2 * Math.PI * i) / 13
		const endX = centerX + radius * Math.cos(alpha)
		const endY = centerY + radius * Math.sin(alpha)
		errorAccumulationLine(image, centerX, centerY, endX, endY, color)
	}
	await image.write('Брезенхема.png')
}

function errorAccumulationLine(image, x0, y0, x1, y1, color) {
	let swap = false

	if (Math.abs(x0 - x1) < Math.abs(y0 - y1)) {
		;[x0, y0] = [y0, x0]
		;[x1, y1] = [y1, x1]
		swap = true
	}

	if (x0 > x1) {
		;[x0, x1] = [x1, x0]
		;[y0, y1] = [y1, y0]
	}

	if (Math.abs(x0 - x1) < 0.000001) {
		const startY = Math.min(y0, y1)
		const endY = Math.max(y0, y1)
		for (let y = startY; y <= endY; y++) {
			if (swap) {
				image.setPixelColor(color, y, x0)
			} else {
				image.setPixelColor(color, x0, y)
			}
		}
		return
	}

	let y = y0
	const dy = (2.0 * (x1 - x0) * Math.abs(y1 - y0)) / (x1 - x0)
	let error = 0.0
	const yStep = y1 > y0 ? 1 : -1

	for (let x = x0; x <= x1; x++) {
		if (swap) {
			image.setPixelColor(color, y, x)
		} else {
			image.setPixelColor(color, x, y)
		}

		error += dy
		if (error > 2.0 * (x1 - x0) * 0.5) {
			error -= 2.0 * (x1 - x0) * 1.0
			y += yStep //восполняем отставание y(или x, в зависимости от swap) прибавлением yStep, а из error вычитаем единицу, чтобы компенсировать этот дополнительный буст у "y"
		}
	}
}

mainOne().catch(console.error)
mainTwo().catch(console.error)
mainThree().catch(console.error)
mainFour().catch(console.error)
