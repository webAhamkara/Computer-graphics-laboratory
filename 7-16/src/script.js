import { Jimp } from 'jimp'
import fs from 'node:fs'
function barycentricCoordinates(x, y, x0, y0, x1, y1, x2, y2) {
	const lambda0 =
		((x - x2) * (y1 - y2) - (x1 - x2) * (y - y2)) /
		((x0 - x2) * (y1 - y2) - (x1 - x2) * (y0 - y2))
	const lambda1 =
		((x0 - x2) * (y - y2) - (x - x2) * (y0 - y2)) /
		((x0 - x2) * (y1 - y2) - (x1 - x2) * (y0 - y2))
	const lambda2 = 1.0 - lambda0 - lambda1
	return { lambda0, lambda1, lambda2 }
}

function vertexRendering(
	zBuffer,
	image,
	x0,
	y0,
	z0,
	x1,
	y1,
	z1,
	x2,
	y2,
	z2,
	color = 0x000000ff
) {
	if (Math.abs((x0 - x2) * (y1 - y2) - (x1 - x2) * (y0 - y2)) < 0.0000000001) {
		return
	}
	const xmin = Math.max(0, Math.floor(Math.min(x0, x1, x2)) - 4)
	const xmax = Math.min(1000, Math.ceil(Math.max(x0, x1, x2)) + 4)
	const ymin = Math.max(0, Math.floor(Math.min(y0, y1, y2)) - 4)
	const ymax = Math.min(1000, Math.ceil(Math.max(y0, y1, y2)) + 4)
	for (let countX = xmin; countX <= xmax; countX++) {
		for (let countY = ymin; countY <= ymax; countY++) {
			const result = barycentricCoordinates(
				countX + 0.5,
				countY + 0.5,
				x0,
				y0,
				x1,
				y1,
				x2,
				y2
			)
			if (
				result != undefined &&
				result.lambda0 >= -0.005 &&
				result.lambda1 >= -0.005 &&
				result.lambda2 >= -0.005
			) {
				const z =
					result.lambda0 * z0 + result.lambda1 * z1 + result.lambda2 * z2
				if (z < zBuffer[countX][countY]) {
					image.setPixelColor(color, Math.round(countX), Math.round(countY))
					zBuffer[countX][countY] = z
				}
			}
		}
	}
}
function randomColor(cos) {
	let r, g, b

	if (cos < 0) {
		let t = cos + 1
		r = Math.floor(255 * t)
		g = Math.floor(255 * t)
		b = 255
	} else {
		let t = cos
		r = 255
		g = Math.floor(255 * (1 - t))
		b = Math.floor(255 * (1 - t))
	}

	r = Math.max(0, Math.min(255, r))
	g = Math.max(0, Math.min(255, g))
	b = Math.max(0, Math.min(255, b))

	const colorString = `0x${r.toString(16).padStart(2, '0')}${g
		.toString(16)
		.padStart(2, '0')}${b.toString(16).padStart(2, '0')}ff`
	return parseInt(colorString, 16)
}
function calculatingTheNormal(x0, y0, z0, x1, y1, z1, x2, y2, z2) {
	const normalX = (y1 - y2) * (z1 - z0) - (z1 - z2) * (y1 - y0)
	const normalY = (z1 - z2) * (x1 - x0) - (x1 - x2) * (z1 - z0)
	const normalZ = (x1 - x2) * (y1 - y0) - (y1 - y2) * (x1 - x0)
	return { normalX, normalY, normalZ }
}
function calculatingTheCos(x, y, z) {
	const l = [0, 0, 1]
	const cos =
		(x * l[0] + y * l[1] + z * l[2]) /
		(Math.sqrt(x ** 2 + y ** 2 + z ** 2) *
			Math.sqrt(l[0] ** 2 + l[1] ** 2 + l[2] ** 2))
	return cos
}
function rotate(x, y, z, alpha = 0, beta = 0, gamma = 0) {
	const Rx = [
		[1, 0, 0],
		[0, Math.cos(alpha), Math.sin(alpha)],
		[0, -Math.sin(alpha), Math.cos(alpha)],
	]
	const Ry = [
		[Math.cos(beta), 0, Math.sin(beta)],
		[0, 1, 0],
		[-Math.sin(beta), 0, Math.cos(beta)],
	]
	const Rz = [
		[Math.cos(gamma), Math.sin(gamma), 0],
		[-Math.sin(gamma), Math.cos(gamma), 0],
		[0, 0, 1],
	]
	const Rxy = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
	]
	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {
			let result = 0
			for (let k = 0; k < 3; k++) {
				const a = Rx[j][k] * Ry[k][i]
				result += a
			}
			Rxy[j][i] = result
		}
	}
	const Rxyz = [
		[0, 0, 0],
		[0, 0, 0],
		[0, 0, 0],
	]
	for (let i = 0; i < 3; i++) {
		for (let j = 0; j < 3; j++) {
			let result = 0
			for (let k = 0; k < 3; k++) {
				const a = Rxy[j][k] * Rz[k][i]
				result += a
			}
			Rxyz[j][i] = result
		}
	}
	const xNew = Rxyz[0][0] * x + Rxyz[0][1] * y + Rxyz[0][2] * z
	const yNew = Rxyz[1][0] * x + Rxyz[1][1] * y + Rxyz[1][2] * z
	const zNew = Rxyz[2][0] * x + Rxyz[2][1] * y + Rxyz[2][2] * z
	return { x: xNew, y: yNew, z: zNew }
}

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
		const zArray = []
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].startsWith('v ')) {
				const parts = lines[i].split(' ')
				xArray.push(parseFloat(parts[1]))
				yArray.push(parseFloat(parts[2]))
				zArray.push(parseFloat(parts[3]))
			}
		}
		const polygons = []

		for (let j = 0; j < lines.length; j++) {
			if (lines[j].startsWith('f ')) {
				const polygon = lines[j].split(' ')
				const firstPoint = parseFloat(polygon[1].split('/')[0]) - 1
				const secondPoint = parseFloat(polygon[2].split('/')[0]) - 1
				const thirdPoint = parseFloat(polygon[3].split('/')[0]) - 1
				///point в данном случае это номер вершины, а элемент polygons это тройка вершин образующая треугольник.
				polygons.push([firstPoint, secondPoint, thirdPoint])
			}
		}
		try {
			const image = new Jimp({ width: 1000, height: 1000, color: 0xffffffff })
			const polygonsColor = []
			const zBuffer = []
			let allX = 0,
				allY = 0,
				allZ = 0
			for (let i = 0; i < 1000; i++) {
				zBuffer[i] = new Array(1000).fill(Infinity)
			}
			for (let i = 0; i < xArray.length; i++) {
				allX += xArray[i]
				allY += yArray[i]
				allZ += zArray[i]
			}
			const centerX = allX / xArray.length
			const centerY = allY / yArray.length
			const centerZ = allZ / zArray.length

			const xShift = -centerX
			const yShift = -centerY
			const zShift = -centerZ + 1 // для положительности всех zTransformed
			const Ax = 4000
			const Ay = -4000

			const transformedVertices = []
			for (let j = 0; j < xArray.length; j++) {
				const newCoordinates = rotate(
					xArray[j],
					yArray[j],
					zArray[j],
					0,
					1.5,
					0
				)
				xArray[j] = newCoordinates.x
				yArray[j] = newCoordinates.y
				zArray[j] = newCoordinates.z
				let xTransformed = xArray[j] + xShift
				let yTransformed = yArray[j] + yShift
				let zTransformed = zArray[j] + zShift
				transformedVertices[j] = {
					x3D: xTransformed,
					y3D: yTransformed,
					z3D: zTransformed,
					screenX: (Ax * xTransformed) / zTransformed + 500,
					screenY: (Ay * yTransformed) / zTransformed + 500,
				}
			}

			for (let c = 0; c < polygons.length; c++) {
				//рисуем ребра(полигоны)
				const [id1, id2, id3] = polygons[c]
				const x1 = Math.round(transformedVertices[id1].screenX)
				const y1 = Math.round(transformedVertices[id1].screenY)
				const z1 = transformedVertices[id1].z3D

				const x2 = Math.round(transformedVertices[id2].screenX)
				const y2 = Math.round(transformedVertices[id2].screenY)
				const z2 = transformedVertices[id2].z3D

				const x3 = Math.round(transformedVertices[id3].screenX)
				const y3 = Math.round(transformedVertices[id3].screenY)
				const z3 = transformedVertices[id3].z3D
				const normal = calculatingTheNormal(
					xArray[id1],
					yArray[id1],
					zArray[id1],
					xArray[id2],
					yArray[id2],
					zArray[id2],
					xArray[id3],
					yArray[id3],
					zArray[id3]
				)
				const cos = calculatingTheCos(
					normal.normalX,
					normal.normalY,
					normal.normalZ
				)

				if (cos < 0) {
					const currentColor = randomColor(cos)
					polygonsColor[c] = currentColor
					vertexRendering(
						zBuffer,
						image,
						x1,
						y1,
						z1,
						x2,
						y2,
						z2,
						x3,
						y3,
						z3,
						currentColor
					)
					// errorAccumulationLine(image, x1, y1, x2, y2, currentColor)
					// errorAccumulationLine(image, x2, y2, x3, y3, currentColor)
					// errorAccumulationLine(image, x3, y3, x1, y1, currentColor)
				}
			}

			const vertexColors = new Array(xArray.length).fill(0x00000000)
			for (let c = 0; c < polygons.length; c++) {
				const [id1, id2, id3] = polygons[c]
				if (polygonsColor[c] !== undefined) {
					const polygonColor = polygonsColor[c]
					vertexColors[id1] = polygonColor
					vertexColors[id2] = polygonColor
					vertexColors[id3] = polygonColor
				}
			}

			// for (let m = 0; m < xArray.length; m++) {
			// 	const currentColor = vertexColors[m]
			// 	if (currentColor !== 0x00000000) {
			// 		const pixelX = Math.round(-4000 * xArray[m] + 500)
			// 		const pixelY = Math.round(-4000 * yArray[m] + 650)
			// 		image.setPixelColor(currentColor, pixelX, pixelY)
			// 	}
			// }

			await image.write('rabbit_facePerspective1.png')
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
