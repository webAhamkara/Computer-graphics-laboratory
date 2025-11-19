import { Jimp } from 'jimp'
import fs from 'node:fs/promises'
import {
	vertexRendering,
	calculatingTheCos,
	calculatingTheNormal,
	rotate,
} from './3DMath.js'
export async function renderModel(parameters, image, zBuffer) {
	try {
		const data = await fs.readFile(parameters.modelPath, 'utf8')
		const lines = data.split('\n')
		const xArray = []
		const yArray = []
		const zArray = []
		const textures = []
		for (let i = 0; i < lines.length; i++) {
			if (lines[i].trim() === '') continue
			if (lines[i].startsWith('v ')) {
				const parts = lines[i].trim().split(/\s+/)
				xArray.push(parseFloat(parts[1]))
				yArray.push(parseFloat(parts[2]))
				zArray.push(parseFloat(parts[3]))
			} else if (lines[i].startsWith('vt')) {
				const coordinates = lines[i].trim().split(/\s+/)
				if (coordinates.length >= 3) {
					const x = parseFloat(coordinates[1])
					const y = parseFloat(coordinates[2])
					const z = coordinates.length >= 4 ? parseFloat(coordinates[3]) : 0

					if (!isNaN(x) && !isNaN(y)) {
						textures.push({ x, y, z })
					}
				}
			}
		}
		const vertexCount = new Array(xArray.length).fill(0)
		const vertexNormalsX = new Array(xArray.length).fill(0)
		const vertexNormalsY = new Array(yArray.length).fill(0)
		const vertexNormalsZ = new Array(zArray.length).fill(0)

		let polygons = []

		for (let j = 0; j < lines.length; j++) {
			if (lines[j].startsWith('f ')) {
				const verticesArray = []
				const textureArray = []
				const polygon = lines[j].split(' ')
				for (let i = 1; i < polygon.length; i++) {
					const point = parseFloat(polygon[i].split('/')[0]) - 1
					const texture = parseFloat(polygon[i].split('/')[1]) - 1
					verticesArray.push(point)
					textureArray.push(texture)
				}

				polygons.push({
					vertices: verticesArray,
					textures: textureArray,
				})
			}
		}

		const triangulatedPolygons = []
		for (let i = 0; i < polygons.length; i++) {
			if (polygons[i].vertices.length > 3) {
				const numberOfVertices = polygons[i].vertices.length
				const fixedVertex = polygons[i].vertices[0] //для триангуляции фиксируем вершину
				const fixedTexture = polygons[i].textures[0]

				for (let j = 0; j < numberOfVertices - 2; j++) {
					triangulatedPolygons.push({
						vertices: [
							fixedVertex,
							polygons[i].vertices[j + 1],
							polygons[i].vertices[j + 2],
						],
						textures: [
							fixedTexture,
							polygons[i].textures[j + 1],
							polygons[i].textures[j + 2],
						],
					})
				}
			} else if (polygons[i].vertices.length === 3) {
				triangulatedPolygons.push({
					vertices: polygons[i].vertices,
					textures: polygons[i].textures,
				})
				continue
			}
		} // таким образом каждый vertices и textures в polygons представляет собой массив из трех вершин.
		polygons = triangulatedPolygons

		for (let i = 0; i < polygons.length; i++) {
			vertexCount[polygons[i].vertices[0]] += 1 //polygons[i].vertices[0] это номер вершины которая есть в полигоне
			vertexCount[polygons[i].vertices[1]] += 1
			vertexCount[polygons[i].vertices[2]] += 1
		}

		try {
			let imageTextures
			let textureState = false
			if (parameters.texturePath && parameters.texturePath !== '') {
				try {
					imageTextures = await Jimp.read(parameters.texturePath)
					textureState = true
				} catch (textureError) {
					console.warn(`Не удалось загрузить текстуру: ${textureError.message}`)
					imageTextures = new Jimp({ width: 1, height: 1, color: 0xffffffff })
					textureState = false
				}
			} else {
				console.log(`Путь к текстуре не указан.`)
				imageTextures = new Jimp({ width: 1, height: 1, color: 0xffffffff })
				textureState = false
			}
			const arrayCos = new Array(polygons.length).fill(0)
			let allX = 0,
				allY = 0,
				allZ = 0

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
			const zShift = -centerZ

			const transformedVertices = []

			for (let j = 0; j < xArray.length; j++) {
				const newCoordinates = rotate(
					xArray[j],
					yArray[j],
					zArray[j],
					parameters.rotate.type,
					parameters.rotate.angle,
					parameters.rotate.units
				)
				xArray[j] = newCoordinates.x
				yArray[j] = newCoordinates.y
				zArray[j] = newCoordinates.z
				let xTransformed = xArray[j] + xShift + parameters.moving[0]
				let yTransformed = yArray[j] + yShift + parameters.moving[1]
				let zTransformed = zArray[j] + zShift + parameters.moving[2]

				transformedVertices[j] = {
					x3D: xTransformed,
					y3D: yTransformed,
					z3D: zTransformed,
					screenX: Math.round(
						(parameters.scaleX * xTransformed) / zTransformed + image.width / 2
					),
					screenY: Math.round(
						(parameters.scaleY * yTransformed) / zTransformed + image.height / 2
					),
				}
			}

			for (let c = 0; c < polygons.length; c++) {
				const [id1, id2, id3] = polygons[c].vertices
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
				const normalLength = Math.sqrt(
					normal.normalX ** 2 + normal.normalY ** 2 + normal.normalZ ** 2
				)
				if (normalLength === 0 || isNaN(normalLength)) {
					continue
				}
				vertexNormalsX[id1] += normal.normalX //заполняем по номеру вершины соответствующие нормали
				vertexNormalsY[id1] += normal.normalY
				vertexNormalsZ[id1] += normal.normalZ

				vertexNormalsX[id2] += normal.normalX
				vertexNormalsY[id2] += normal.normalY
				vertexNormalsZ[id2] += normal.normalZ

				vertexNormalsX[id3] += normal.normalX
				vertexNormalsY[id3] += normal.normalY
				vertexNormalsZ[id3] += normal.normalZ
				const cos = calculatingTheCos(
					normal.normalX,
					normal.normalY,
					normal.normalZ,
					parameters.lightDirection
				)
				arrayCos[c] = cos
			}

			for (let k = 0; k < xArray.length; k++) {
				vertexNormalsX[k] /= vertexCount[k] //Делим общее кол-во нормалей по X к конкретной вершине на количество полигонов, в которой k-ая точка участвует в роли вершины.
				vertexNormalsY[k] /= vertexCount[k]
				vertexNormalsZ[k] /= vertexCount[k]
			}
			const lightingArray = []

			for (let i = 0; i < polygons.length; i++) {
				const [id1, id2, id3] = polygons[i].vertices
				const I_0 =
					(vertexNormalsX[id1] * parameters.lightDirection[0] +
						vertexNormalsY[id1] * parameters.lightDirection[1] +
						vertexNormalsZ[id1] * parameters.lightDirection[2]) /
					(Math.sqrt(
						vertexNormalsX[id1] ** 2 +
							vertexNormalsY[id1] ** 2 +
							vertexNormalsZ[id1] ** 2
					) *
						Math.sqrt(
							parameters.lightDirection[0] ** 2 +
								parameters.lightDirection[1] ** 2 +
								parameters.lightDirection[2] ** 2
						))
				const I_1 =
					(vertexNormalsX[id2] * parameters.lightDirection[0] +
						vertexNormalsY[id2] * parameters.lightDirection[1] +
						vertexNormalsZ[id2] * parameters.lightDirection[2]) /
					(Math.sqrt(
						vertexNormalsX[id2] ** 2 +
							vertexNormalsY[id2] ** 2 +
							vertexNormalsZ[id2] ** 2
					) *
						Math.sqrt(
							parameters.lightDirection[0] ** 2 +
								parameters.lightDirection[1] ** 2 +
								parameters.lightDirection[2] ** 2
						))
				const I_2 =
					(vertexNormalsX[id3] * parameters.lightDirection[0] +
						vertexNormalsY[id3] * parameters.lightDirection[1] +
						vertexNormalsZ[id3] * parameters.lightDirection[2]) /
					(Math.sqrt(
						vertexNormalsX[id3] ** 2 +
							vertexNormalsY[id3] ** 2 +
							vertexNormalsZ[id3] ** 2
					) *
						Math.sqrt(
							parameters.lightDirection[0] ** 2 +
								parameters.lightDirection[1] ** 2 +
								parameters.lightDirection[2] ** 2
						))
				lightingArray.push([I_0, I_1, I_2])
			}
			for (let j = 0; j < polygons.length; j++) {
				const [id1, id2, id3] = polygons[j].vertices
				if (arrayCos[j] < 0) {
					const [I0, I1, I2] = lightingArray[j]
					vertexRendering(
						zBuffer,
						image,
						imageTextures,
						image.width,
						image.height,
						transformedVertices[id1].screenX,
						transformedVertices[id1].screenY,
						transformedVertices[id1].z3D,
						I0,
						textureState ? textures[polygons[j].textures[0]].x : 0,
						textureState ? 1 - textures[polygons[j].textures[0]].y : 0,
						transformedVertices[id2].screenX,
						transformedVertices[id2].screenY,
						transformedVertices[id2].z3D,
						I1,
						textureState ? textures[polygons[j].textures[1]].x : 0,
						textureState ? 1 - textures[polygons[j].textures[1]].y : 0,
						transformedVertices[id3].screenX,
						transformedVertices[id3].screenY,
						transformedVertices[id3].z3D,
						I2,
						textureState ? textures[polygons[j].textures[2]].x : 0,
						textureState ? 1 - textures[polygons[j].textures[2]].y : 0,
						textureState
					)
				}
			}
		} catch (error) {
			console.error('Ошибка при работе с изображением:', error)
		}
	} catch (err) {
		console.error('Ошибка' + ' ' + err)
		return
	}
}
