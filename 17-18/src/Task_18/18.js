import { Jimp } from 'jimp'
import fs from 'node:fs'
import {
	vertexRendering,
	calculatingTheCos,
	calculatingTheNormal,
	rotate,
} from './3DMath.js'

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
		const textures = []
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].startsWith('v ')) {
				const parts = lines[i].split(' ')
				xArray.push(parseFloat(parts[1]))
				yArray.push(parseFloat(parts[2]))
				zArray.push(parseFloat(parts[3]))
			} else if (lines[i].startsWith('vt')) {
				const coordinates = lines[i].split(' ')
				textures.push({
					x: parseFloat(coordinates[1]),
					y: parseFloat(coordinates[2]),
				})
			}
		}

		const polygons = []
		const l = [0, 0, 1]
		for (let j = 0; j < lines.length; j++) {
			if (lines[j].startsWith('f ')) {
				const polygon = lines[j].split(' ')
				const firstPoint = parseFloat(polygon[1].split('/')[0]) - 1
				const secondPoint = parseFloat(polygon[2].split('/')[0]) - 1
				const thirdPoint = parseFloat(polygon[3].split('/')[0]) - 1
				///point в данном случае это номер вершины, а элемент polygons это тройка вершин образующая треугольник.
				const firstTexture = parseFloat(polygon[1].split('/')[1]) - 1
				const secondTexture = parseFloat(polygon[2].split('/')[1]) - 1
				const thirdTexture = parseFloat(polygon[3].split('/')[1]) - 1
				polygons.push({
					vertices: [firstPoint, secondPoint, thirdPoint],
					textures: [firstTexture, secondTexture, thirdTexture],
				})
			}
		}

		try {
			const rabbitTextures = await Jimp.read(
				'C:/Users/Slava/Desktop/Проекты/Графика/17-18/src/Task_18/bunny-atlas.jpg'
			)
			const image = new Jimp({
				width: rabbitTextures.width,
				height: rabbitTextures.height,
				color: 0xffffffff,
			})

			const zBuffer = []
			let allX = 0,
				allY = 0,
				allZ = 0
			for (let i = 0; i < rabbitTextures.width; i++) {
				zBuffer[i] = new Array(rabbitTextures.height).fill(Infinity)
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
					3.7,
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
					screenX: Math.round(
						(Ax * xTransformed) / zTransformed + rabbitTextures.width / 2
					),
					screenY: Math.round(
						(Ay * yTransformed) / zTransformed + rabbitTextures.width / 2
					),
				}
			}

			for (let j = 0; j < polygons.length; j++) {
				const [id1, id2, id3] = polygons[j].vertices
				vertexRendering(
					zBuffer,
					image,
					rabbitTextures,
					rabbitTextures.width,
					rabbitTextures.height,
					transformedVertices[id1].screenX,
					transformedVertices[id1].screenY,
					transformedVertices[id1].z3D,
					textures[polygons[j].textures[0]].x,
					1 - textures[polygons[j].textures[0]].y,
					transformedVertices[id2].screenX,
					transformedVertices[id2].screenY,
					transformedVertices[id2].z3D,
					textures[polygons[j].textures[1]].x,
					1 - textures[polygons[j].textures[1]].y,
					transformedVertices[id3].screenX,
					transformedVertices[id3].screenY,
					transformedVertices[id3].z3D,
					textures[polygons[j].textures[2]].x,
					1 - textures[polygons[j].textures[2]].y
				)
			}

			await image.write('rabbit_textures.png')
		} catch (error) {
			console.error('Ошибка при работе с изображением:', error)
		}
	}
)
