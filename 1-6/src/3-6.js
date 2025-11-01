import { Jimp } from 'jimp'
import fs from 'node:fs'
const color = 0x000000ff
fs.readFile(
	'C:/Users/Slava/Desktop/Проекты/model_1.obj',
	'utf8',
	async (err, data) => {
		if (err) {
			console.error('Ошибка:' + ' ' + err)
			return
		}
		const lines = data.split('\n')
		const xArray = []
		const yArray = []
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].startsWith('v ')) {
				const parts = lines[i].split(' ')
				xArray.push(parseFloat(parts[1]))
				yArray.push(parseFloat(parts[2]))
			}
		}
		const polygons = []
		let count = 0
		for (let j = 0; j < lines.length; j++) {
			if (lines[j].startsWith('f ')) {
				count++
				const polygon = lines[j].split(' ')
				const firstPoint = parseFloat(polygon[1].split('/')[0]) - 1
				const secondPoint = parseFloat(polygon[2].split('/')[0]) - 1
				const thirdPoint = parseFloat(polygon[3].split('/')[0]) - 1
				polygons.push([firstPoint, secondPoint, thirdPoint])
			}
		}
		try {
			const image = new Jimp({ width: 1000, height: 1000, color: 0xffffffff })
			for (let m = 0; m < xArray.length; m++) {
				//рисуем вершины
				const pixelX = Math.round(-4000 * xArray[m] + 500)
				const pixelY = Math.round(-4000 * yArray[m] + 650)
				image.setPixelColor(color, pixelX, pixelY)
			}
			for (let c = 0; c < polygons.length; c++) {
				//рисуем ребра(полигоны)
				const [id1, id2, id3] = polygons[c]
				const x1 = Math.round(-4000 * xArray[id1] + 500)
				const y1 = Math.round(-4000 * yArray[id1] + 650)
				const x2 = Math.round(-4000 * xArray[id2] + 500)
				const y2 = Math.round(-4000 * yArray[id2] + 650)
				const x3 = Math.round(-4000 * xArray[id3] + 500)
				const y3 = Math.round(-4000 * yArray[id3] + 650)
				errorAccumulationLine(image, x1, y1, x2, y2, color)
				errorAccumulationLine(image, x2, y2, x3, y3, color)
				errorAccumulationLine(image, x3, y3, x1, y1, color)
			}

			await image.write('rabbit.png')
		} catch (error) {
			console.error('Ошибка при работе с изображением:', error)
		}
	}
)
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
